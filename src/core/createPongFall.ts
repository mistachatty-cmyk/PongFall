import { createWorld, stepWorld, issue, windAt, powerState, thrustCharge, World, WorldEvent } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import { getResult, GameResult } from '../sim/result'
import { recordReplay } from '../sim/replay'
import { MODES } from '../sim/data/modes'
import { DIFFICULTIES, DIFFICULTY_ORDER, DEFAULT_DIFFICULTY } from '../sim/data/difficulty'
import { renderWorld, newCamera, stepCamera, screenToWorld, TrailPoint } from '../render/draw'
import { createFx, feedFx } from '../render/eyes'
import { createFogGL } from '../render/fogGL'
import { Settings, sanitizeSettings, defaultSettings, worldOverrides, SETTINGS_KEY } from './settings'
import { createSettingsPanel, SettingsPanel } from './settingsPanel'
import { createAudio } from '../audio/engine'
import { cueForEvent } from '../audio/cues'
import type { Host } from '../host/host'

export interface PongFallOptions {
  mode?: string
  modifiers?: string[]
  difficulty?: string
  arenas?: number
  seed?: number
  target?: number
  timeLimit?: number
  host?: Host
  /** Hide the built-in settings button (an embedding host may provide its own). */
  noSettings?: boolean
}
export type PongFallEvent = 'result' | 'score'
export interface PongFallHandle {
  pause(): void
  resume(): void
  reset(seed?: number): void
  configure(c: { mode?: string; difficulty?: string }): void
  destroy(): void
  on(ev: PongFallEvent, cb: (r: GameResult | null) => void): void
  getResult(): GameResult | null
}

const newSeed = () => (Math.random() * 1e9) | 0
const osReduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const valid = { modes: Object.keys(MODES), difficulties: Object.keys(DIFFICULTIES) }
function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
    if (raw) return sanitizeSettings(raw, valid, osReduce())
    // older versions kept these separately
    const legacy: Record<string, unknown> = {}
    const d = localStorage.getItem('pongfall.difficulty'); if (d) legacy.difficulty = d
    const r = localStorage.getItem('pongfall.reduceMotion'); if (r !== null) legacy.reduceMotion = r === '1'
    return sanitizeSettings(legacy, valid, osReduce())
  } catch { return defaultSettings(osReduce()) }
}
const saveSettings = (s: Settings) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ } }

/** Mounts a PongFall instance into `el`. Owns its canvas, loop, audio and listeners; destroy() removes them all. */
export function createPongFall(el: HTMLElement, opts: PongFallOptions = {}): PongFallHandle {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
  el.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const host = opts.host ?? {}
  const cam = newCamera()
  cam.zoom = 0.5
  const S: Settings = loadSettings()
  // options given by the embedding page / URL win until the player changes that setting in the panel
  if (opts.mode && opts.mode in MODES) S.mode = opts.mode
  if (opts.difficulty && opts.difficulty in DIFFICULTIES) S.difficulty = opts.difficulty
  if (opts.arenas !== undefined) S.arenas = opts.arenas
  const locked = { target: opts.target !== undefined, timeLimit: opts.timeLimit !== undefined }
  const fx = createFx(S.reduceMotion)
  fx.fogMode = S.fog
  fx.fog = S.fog === 'high' ? createFogGL() : null
  const audio = createAudio()
  const listeners: Record<PongFallEvent, Array<(r: GameResult | null) => void>> = { result: [], score: [] }
  const keys = new Set<string>()
  let cw = 1, ch = 1
  let paused = false
  let reported = false
  let lastScore = 0
  let lastMoveY = NaN
  let result: GameResult | null = null
  let pointerDown = false
  let lastPt: { x: number; y: number } | null = null
  let lastTap = { at: 0, x: 0, y: 0 }
  const trail: TrailPoint[] = []
  let world: World = mk(opts.seed)

  function mk(seed = newSeed()): World {
    const o = worldOverrides(S)
    return createWorld({ mode: S.mode, modifiers: opts.modifiers, difficulty: S.difficulty, arenas: S.arenas, target: locked.target ? opts.target : o.target, timeLimit: locked.timeLimit ? opts.timeLimit : o.timeLimit, powerUnlocked: host.isPowerUnlocked ? host.isPowerUnlocked() || MODES[S.mode]?.unlimited : undefined }, seed)
  }
  const emit = (ev: PongFallEvent, r: GameResult | null) => listeners[ev].forEach(cb => cb(r))

  function resize() {
    const dpr = window.devicePixelRatio || 1
    const r = el.getBoundingClientRect()
    cw = Math.max(1, r.width); ch = Math.max(1, r.height)
    canvas.width = cw * dpr; canvas.height = ch * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(el); resize()

  function move(y: number) {
    if (y === lastMoveY) return
    lastMoveY = y
    issue(world, { k: 'move', side: 0, y })
  }
  const toWorld = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return screenToWorld(cam, cw, ch, e.clientX - r.left, e.clientY - r.top)
  }
  const powerNow = () => { if (!paused && world.status === 'play') issue(world, { k: 'power', side: 0 }) }
  const touches = new Set<number>()
  const thrustNow = () => { if (!paused && world.status === 'play') issue(world, { k: 'thrust', side: 0 }) }

  function nearTear(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy
    const reach = world.tune.tearRadius + 20
    return world.tears.some(t => {
      const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((t.x - a.x) * dx + (t.y - a.y) * dy) / l2))
      return Math.hypot(t.x - (a.x + u * dx), t.y - (a.y + u * dy)) < reach
    })
  }
  const onDown = (e: PointerEvent) => {
    audio.unlock(); audio.startMusic()
    touches.add(e.pointerId)
    if (e.pointerType === 'touch' && touches.size >= 2) { powerNow(); return }
    canvas.setPointerCapture(e.pointerId)
    const now = performance.now()
    if (now - lastTap.at < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 90) { thrustNow(); lastTap.at = 0 }
    else lastTap = { at: now, x: e.clientX, y: e.clientY }
    pointerDown = true
    const p = toWorld(e)
    lastPt = p
    trail.length = 0
    if (world.tears.some(t => Math.hypot(t.x - p.x, t.y - p.y) < world.tune.tearRadius)) issue(world, { k: 'tear', x: p.x, y: p.y })
    move(p.y)
  }
  const onMove = (e: PointerEvent) => {
    const p = toWorld(e)
    if (pointerDown && lastPt) {
      if (nearTear(lastPt, p)) issue(world, { k: 'slice', x1: lastPt.x, y1: lastPt.y, x2: p.x, y2: p.y })
      trail.push({ x: p.x, y: p.y, at: performance.now() })
      if (trail.length > 40) trail.shift()
      lastPt = p
    }
    if (e.pointerType === 'mouse' || pointerDown) move(p.y)
  }
  const onUp = (e?: PointerEvent) => { if (e) touches.delete(e.pointerId); if (touches.size === 0) { pointerDown = false; lastPt = null } }
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    audio.unlock(); audio.startMusic()
    if (k === ' ' || k === 'spacebar') { e.preventDefault(); if (!e.repeat) thrustNow(); return }
    keys.add(k)
    if (k === 'e') powerNow()
    if (k === 'z') cam.lock = cam.lock === 'auto' ? 'field' : cam.lock === 'field' ? 'arena' : 'auto'
    if (k === 'r') handle.reset()
    if (k === 'm') { audio.setMuted(!audio.isMuted()); panelUI?.sync() }
    if (k === 'p' || k === 'escape') paused ? handle.resume() : handle.pause()
  }
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
  const onVis = () => { if (document.hidden) handle.pause() }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('visibilitychange', onVis)

  // settings panel (also pauses the game while open)
  let panelUI: SettingsPanel | null = null
  let pausedByPanel = false
  if (!opts.noSettings) {
    panelUI = createSettingsPanel({
      host: el, audio,
      get: () => S,
      set(patch, restart) {
        Object.assign(S, patch)
        if ('target' in patch) locked.target = false
        if ('timeLimit' in patch) locked.timeLimit = false
        if (patch.reduceMotion !== undefined) fx.reduce = S.reduceMotion
        if (patch.fog !== undefined) { fx.fogMode = S.fog; if (S.fog === 'high' && !fx.fog) fx.fog = createFogGL(); if (S.fog !== 'high') { fx.fog?.destroy(); fx.fog = null } }
        saveSettings(S)
        if (restart) { handle.reset(); if (panelUI?.isOpen()) { paused = true } }
        applyButtons()
      },
      reset() { Object.assign(S, defaultSettings(osReduce())); fx.reduce = S.reduceMotion; fx.fogMode = S.fog; if (!fx.fog) fx.fog = createFogGL(); saveSettings(S); handle.reset(); paused = true; applyButtons() },
      onOpen() { if (!paused) { paused = true; pausedByPanel = true } },
      onClose() { if (pausedByPanel) { pausedByPanel = false; handle.resume() } },
    })
  }

  // on-screen THRUST and POWER buttons (mouse and touch)
  el.style.position ||= 'relative'
  const mkBtn = (label: string, css: string, fn: () => void) => {
    const b = document.createElement('button')
    b.textContent = label; b.setAttribute('data-pf', label)
    b.style.cssText = 'position:absolute;bottom:44px;width:92px;height:92px;border-radius:50%;border:2px solid #2a3446;background:rgba(16,21,31,.8);color:#cfe3ff;font:700 13px system-ui;cursor:pointer;z-index:5;touch-action:manipulation;' + css
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); audio.unlock(); audio.startMusic(); fn() })
    el.appendChild(b)
    return b
  }
  const thrustBtn = mkBtn('THRUST', 'left:16px', thrustNow)
  const powerBtn = mkBtn('POWER', 'right:16px', powerNow)
  function applyButtons() {
    const show = S.buttons === 'show' ? 'block' : 'none'
    thrustBtn.style.display = show; powerBtn.style.display = show
    thrustBtn.style.left = S.leftHanded ? '' : '16px'; thrustBtn.style.right = S.leftHanded ? '16px' : ''
    powerBtn.style.right = S.leftHanded ? '' : '16px'; powerBtn.style.left = S.leftHanded ? '16px' : ''
  }
  applyButtons()
  function syncButtons() {
    const ps = powerState(world)
    powerBtn.style.opacity = ps === 'locked' ? '0.35' : '1'
    powerBtn.style.borderColor = ps === 'ready' ? '#ffe08a' : ps === 'active' ? '#8affc1' : '#2a3446'
    powerBtn.style.boxShadow = ps === 'ready' ? '0 0 18px #ffe08a88' : 'none'
    powerBtn.textContent = ps === 'locked' ? 'POWER 🔒' : ps === 'active' ? 'POWER ON' : ps === 'ready' ? 'POWER (E)' : `POWER ${world.tearsHeld}/${world.tune.tearsForPower}`
    thrustBtn.style.opacity = thrustCharge(world, 0) > 0 ? '0.45' : '1'
  }

  let last = performance.now(), acc = 0, raf = 0, dead = false
  let slowFrames = 0
  let wasUnlocked = world.powerUnlocked
  const frameEvents: WorldEvent[] = []
  function frame(now: number) {
    if (dead) return
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    // adaptive quality: if the shader fog makes frames slow, fall back to the cheap fog for good
    if (fx.fog && !paused && !document.hidden) { slowFrames = dt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 2); if (slowFrames > 90) { fx.fog.destroy(); fx.fog = null } }
    if (!paused) {
      acc += dt
      while (acc >= FIXED_DT) {
        const k = (keys.has('w') || keys.has('arrowup') ? -1 : 0) + (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
        if (k) move(world.sides[0].paddleY + k * 80)
        stepWorld(world)
        for (const e of world.events) frameEvents.push(e)
        world.events.length = 0
        acc -= FIXED_DT
      }
      const sc = world.sides[0].score + world.sides[1].score
      if (sc !== lastScore) { lastScore = sc; emit('score', null) }
      if (world.status === 'over' && !reported) {
        reported = true
        result = getResult(world)
        if (result) { host.onResult?.(result, recordReplay(world)); emit('result', result) }
      }
      feedFx(fx, world, frameEvents, dt, performance.now())
      if (world.powerUnlocked && !wasUnlocked) { wasUnlocked = true; host.onPowerUnlocked?.() }
      for (const e of frameEvents) { const c = cueForEvent(e); if (c) audio.play(c.cue, c.level) }
      frameEvents.length = 0
    }
    syncButtons()
    audio.setAmbience(world.fallV, windAt(world), !paused && world.status === 'play')
    stepCamera(world, cam, cw, ch, dt)
    const nowMs = performance.now()
    while (trail.length && nowMs - trail[0]!.at > 400) trail.shift()
    renderWorld(ctx, world, cam, cw, ch, { paused, result, best: host.getBest?.(world.mode.id, world.difficulty.id) ?? null, user: host.getIdentity?.()?.name ?? null, trail, now: nowMs, muted: audio.isMuted(), perks: result?.perks ?? [], hints: S.hints, gauge: S.gauge }, fx)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  const handle: PongFallHandle = {
    pause() { paused = true },
    resume() { paused = false; last = performance.now() },
    reset(seed) { world = mk(seed); wasUnlocked = world.powerUnlocked; reported = false; result = null; lastScore = 0; lastMoveY = NaN; acc = 0; paused = false; frameEvents.length = 0; fx.splats.length = 0 },
    configure(c) {
      if (c.mode && c.mode in MODES) S.mode = c.mode
      if (c.difficulty && c.difficulty in DIFFICULTIES) S.difficulty = c.difficulty
      saveSettings(S); panelUI?.sync(); handle.reset()
    },
    destroy() {
      dead = true
      cancelAnimationFrame(raf); ro.disconnect(); audio.destroy(); fx.fog?.destroy()
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVis)
      canvas.remove(); panelUI?.destroy()
      el.querySelectorAll('button[data-pf]').forEach(b => b.remove())
    },
    on(ev, cb) { listeners[ev].push(cb) },
    getResult: () => result,
  }
  return handle
}
