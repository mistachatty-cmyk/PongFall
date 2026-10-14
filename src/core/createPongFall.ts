import { createWorld, stepWorld, issue, CommandInput, windAt, powerState, powerActive, thrustCharge, World, WorldEvent, hasCpuOpponent, arenaDims } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import { getResult, GameResult } from '../sim/result'
import { recordReplay, runReplay, type Replay } from '../sim/replay'
import { saveSlot } from './saveSlots'
import { queueCloudSync } from './cloudSyncQueue'
import { MODES } from '../sim/data/modes'
import { DIFFICULTIES, DIFFICULTY_ORDER, DEFAULT_DIFFICULTY } from '../sim/data/difficulty'
import { renderWorld, newCamera, stepCamera, screenToWorld, TrailPoint, BallEchoPoint } from '../render/draw'
import { createFx, feedFx, wakeBackgroundEyes } from '../render/eyes'
import { createFogGL } from '../render/fogGL'
import { Settings, sanitizeSettings, defaultSettings, worldOverrides, SETTINGS_KEY } from './settings'
import { createSettingsPanel, SettingsPanel } from './settingsPanel'
import { createControlsPanel, ControlsPanel } from './controlsPanel'
import { createPauseMenu } from './pauseMenu'
import { createEndScreen } from './endScreen'
import { lensFilter, isLensUnlocked, unlockLens } from '../render/lens'
import { actionFor, normKey, ActionId } from './controls'
import { createAudio } from '../audio/engine'
import { createMusicPlayer } from '../audio/musicPlayer'
import { createMusicPanel } from './musicPanel'
import type { AudioEngine } from '../audio/engine'
import type { MusicPlayer } from '../audio/musicPlayer'
import { cueForEvent } from '../audio/cues'
import type { Host } from '../host/host'
import type { NetSession, NetStatus } from '../net/lockstep'
import { experimentsForMatch, loadGameLabState } from './gameLab'
import { loadProgress } from './progress'
import { loadPainterSelection, painterColors } from './pongPainter'

export interface PongFallOptions {
  mode?: string
  modifiers?: string[]
  difficulty?: string
  arenas?: number
  seed?: number
  target?: number
  timeLimit?: number
  duoOpponent?: 'cpu' | 'local'
  host?: Host
  /** Called by the pause menu and the end screen's "Main menu" button. */
  onMenu?: () => void
  /** Is the main menu open yet (it opens after the first match)? */
  menuAvailable?: () => boolean
  /** Modes the player has opened. */
  allowedModes?: () => string[]
  /** The settings panel's "Reset main menu" button. */
  onResetProgress?: () => void
  flux?: boolean
  /** An online match: both machines run the same sim and trade only input (see net/lockstep.ts). */
  net?: NetSession
  replay?: Replay
  /** Take over the live, unranked intro rally as a fresh Solo Fall match. */
  adoptWorld?: World
  /** Hide the built-in settings button (an embedding host may provide its own). */
  noSettings?: boolean
  /** Optional app-owned audio services, kept alive across menu and match transitions. */
  audio?: AudioEngine
  music?: MusicPlayer
  toggleMusic?: () => void
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
const saveSettings = (s: Settings) => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); localStorage.setItem('pongfall.settingsTouchedAt', String(Date.now())); queueCloudSync() } catch { /* ignore */ } }

/** Mounts a PongFall instance into `el`. Owns its canvas, loop, audio and listeners; destroy() removes them all. */
export function createPongFall(el: HTMLElement, opts: PongFallOptions = {}): PongFallHandle {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
  el.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const host = opts.host ?? {}
  const net = opts.net ?? null
  const ME: 0 | 1 = net ? net.side : 0                      // the side this machine plays
  const out = (c: CommandInput) => { if (net) net.submit(world, c); else issue(world, c) }
  const cam = newCamera()
  cam.zoom = 0.5
  const S: Settings = loadSettings()
  const labState = loadGameLabState()
  const experiments = experimentsForMatch(labState, !!net)
  const ventsEnabled = !net && (S.windVents || experiments.includes('wind-vents') || opts.modifiers?.includes('wind-vents') === true)
  const experimentalPhysics = !net ? [...(experiments.includes('paddle-wake-physics') ? ['paddle-wake-physics'] : []), ...(ventsEnabled ? ['wind-vents'] : [])] : []
  const localFalls = loadProgress().falls
  const echo: BallEchoPoint[] = []
  // options given by the embedding page / URL win until the player changes that setting in the panel
  if (opts.adoptWorld) {
    S.mode = opts.adoptWorld.mode.id
    S.difficulty = opts.adoptWorld.difficulty.id
    S.arenas = opts.adoptWorld.arenaCount
  }
  if (opts.mode && opts.mode in MODES && !opts.adoptWorld) S.mode = opts.mode
  if (opts.difficulty && opts.difficulty in DIFFICULTIES) S.difficulty = opts.difficulty
  if (opts.arenas !== undefined) S.arenas = opts.arenas
  if (opts.flux !== undefined) S.flux = opts.flux
  const locked = { target: opts.target !== undefined, timeLimit: opts.timeLimit !== undefined }
  const fx = createFx(S.reduceMotion)
  fx.fogMode = S.fog
  fx.fog = S.fog === 'high' ? createFogGL() : null
  const ownsAudio = !opts.audio
  const ownsMusic = !opts.music
  const audio = opts.audio ?? createAudio()
  const music = opts.music ?? createMusicPlayer(audio)
  const paint = painterColors(loadPainterSelection())
  const applyLens = () => { canvas.style.filter = [isLensUnlocked() ? lensFilter(S.lens, S.hue) : '', paint.themeFilter].filter(Boolean).join(' ') }
  applyLens()
  const listeners: Record<PongFallEvent, Array<(r: GameResult | null) => void>> = { result: [], score: [] }
  const keys = new Set<string>()
  const paddleFocus: Array<0 | 1 | null> = [null, null]
  let focusButtons: Array<{ button: HTMLButtonElement; side: 0 | 1; paddle: 0 | 1 }> = []
  const moveCache = new Map<string, number>()
  let cw = 1, ch = 1
  let paused = false
  let reported = false
  let savedChoice = false
  let lastScore = 0
  let result: GameResult | null = null
  let pendingWinResult: GameResult | null = null
  let satelliteWorld: World | null = null
  let pointerDown = false
  let lastPt: { x: number; y: number } | null = null
  let downWorld: { x: number; y: number } | null = null
  let lastTap = { at: 0, x: 0, y: 0 }
  const trail: TrailPoint[] = []
  let world: World = opts.replay ? runReplay(opts.replay) : opts.adoptWorld ?? mk(opts.seed)

  const selectedPaddle = (side: 0 | 1): 0 | 1 | undefined => {
    if (duoLocal()) {
      if (side === 0) return keys.has('g') ? 0 : keys.has('h') ? 1 : paddleFocus[0] ?? undefined
      return keys.has('b') ? 0 : keys.has('v') ? 1 : paddleFocus[1] ?? undefined
    }
    return keys.has('g') ? 0 : keys.has('h') ? 1 : keys.has('b') ? 0 : keys.has('v') ? 1 : paddleFocus[0] ?? undefined
  }
  const updateFocusButtons = () => focusButtons.forEach(({ button, side, paddle }) => {
    const active = selectedPaddle(side) === paddle
    button.setAttribute('aria-pressed', String(active))
    button.style.borderColor = active ? '#91e4ff' : '#52667e'
    button.style.color = active ? '#e5f8ff' : '#b6c8da'
    button.style.background = active ? 'rgba(37,73,95,.95)' : 'rgba(12,19,28,.82)'
  })
  const alignPaddles = (sideIndex: 0 | 1, anchor: 0 | 1) => {
    const side = world.sides[sideIndex]
    const y = anchor === 0 ? side.targetY : side.target2Y
    moveFor(sideIndex, y)
  }
  const setPaddleFocus = (side: 0 | 1, next: 0 | 1) => {
    const previous = selectedPaddle(side)
    paddleFocus[side] = paddleFocus[side] === next ? null : next
    const current = selectedPaddle(side)
    if (current === undefined && previous !== undefined) alignPaddles(side, previous)
    updateFocusButtons()
  }

  function mk(seed = newSeed()): World {
    const o = worldOverrides(S)
    return createWorld({ mode: S.mode, modifiers: net ? [] : [...new Set([...(opts.modifiers ?? []), ...experimentalPhysics])], difficulty: S.difficulty, arenas: S.arenas, flux: S.flux, target: locked.target || net ? opts.target : o.target, timeLimit: locked.timeLimit || net ? opts.timeLimit : o.timeLimit, duoOpponent: net ? 'cpu' : opts.duoOpponent }, seed)   // the pinball arm always starts locked (sandbox excepted) and grows out once earned in the match
  }
  const currentResult = () => {
    const r = getResult(world)
      if (r && (experiments.length || ventsEnabled)) { r.experimental = true; r.ranked = false }
    return r
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

  function moveFor(side: 0 | 1, y: number, paddle?: 0 | 1) {
    const key = `${side}:${paddle ?? 'all'}`
    if (y === moveCache.get(key)) return
    moveCache.set(key, y)
    out({ k: 'move', side, y, ...(paddle === undefined ? {} : { paddle }) })
  }
  function move(y: number, paddle?: 0 | 1) { moveFor(ME, y, paddle) }
  const toWorld = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return screenToWorld(cam, cw, ch, e.clientX - r.left, e.clientY - r.top)
  }
  const powerNow = () => { if (!paused && world.status === 'play') out({ k: 'power', side: ME }) }
  const touches = new Set<number>()
  // pinball flipper input: hold up / hold down (state is sent to the sim only when it changes)
  const flipHeld = { up: false, down: false }
  const duoLocal = () => world.mode.id === 'duo-fall' && world.duoOpponent === 'local'
  const secondSide = () => world.mode.id === 'duo-fall' && duoLocal() ? 1 : world.mode.id === 'duo-fall' ? ME : 1
  let flipSent: -1 | 0 | 1 = 0
  const syncFlip = () => {
    const duo = world.mode.id === 'duo-fall' && !duoLocal()
    const up = duo ? flipHeld.up || flip2Held.up : flipHeld.up
    const down = duo ? flipHeld.down || flip2Held.down : flipHeld.down
    const d: -1 | 0 | 1 = up && !down ? 1 : down && !up ? -1 : 0
    if (d === flipSent || paused || world.status !== 'play') return
    flipSent = d
    out({ k: 'flip', side: ME, dir: d })
  }
  const flipArmed = () => powerActive(world, ME)
  const flip2Held = { up: false, down: false }
  let flip2Sent: -1 | 0 | 1 = 0
  const syncFlip2 = () => {
    const duo = world.mode.id === 'duo-fall' && !duoLocal()
    const up = duo ? flipHeld.up || flip2Held.up : flip2Held.up
    const down = duo ? flipHeld.down || flip2Held.down : flip2Held.down
    const d: -1 | 0 | 1 = up && !down ? 1 : down && !up ? -1 : 0
    const sent = duo ? flipSent : flip2Sent
    if (d === sent || !side2()) return
    if (duo) flipSent = d; else flip2Sent = d
    out({ k: 'flip', side: duo ? ME : secondSide(), dir: d })
  }
  let downAt = 0, downX = 0, downY = 0
  const thrustNow = (free = false) => { if (!paused && world.status === 'play') out({ k: 'thrust', side: ME, free }) }

  function nearTear(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy
    const reach = world.tune.tearRadius + 20
    return world.tears.some(t => {
      const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((t.x - a.x) * dx + (t.y - a.y) * dy) / l2))
      return Math.hypot(t.x - (a.x + u * dx), t.y - (a.y + u * dy)) < reach
    })
  }
  function segmentDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy
    const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2))
    return Math.hypot(x - (x1 + u * dx), y - (y1 + u * dy))
  }
  const onDown = (e: PointerEvent) => {
    audio.unlock(); music.kick()
    touches.add(e.pointerId)
    if (e.pointerType === 'touch' && touches.size >= 2) { powerNow(); return }
    canvas.setPointerCapture(e.pointerId)
    const now = performance.now()
    if (now - lastTap.at < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 90) { thrustNow(); lastTap.at = 0 }
    else lastTap = { at: now, x: e.clientX, y: e.clientY }
    pointerDown = true
    downAt = performance.now(); downX = e.clientX; downY = e.clientY
    if (e.pointerType === 'mouse' && flipArmed()) { if (e.button === 2) flipHeld.down = true; else if (e.button === 0) flipHeld.up = true; syncFlip() }
    const p = toWorld(e)
    const { W, H } = arenaDims(world)
    if (Math.abs(p.x) > W / 2 || Math.abs(p.y) > H / 2) wakeBackgroundEyes(fx)
    lastPt = p; downWorld = p; aimAt = p
    trail.length = 0
    if (world.tears.some(t => Math.hypot(t.x - p.x, t.y - p.y) < world.tune.tearRadius)) out({ k: 'tear', side: ME, x: p.x, y: p.y })
    move(p.y, selectedPaddle(ME))
  }
  const onMove = (e: PointerEvent) => {
    const p = toWorld(e)
    if (flipHeld.up && e.pointerType === 'mouse' && Math.hypot(e.clientX - downX, e.clientY - downY) > 14) { flipHeld.up = false; syncFlip() }
    if (pointerDown && lastPt) {
      if (nearTear(lastPt, p)) out({ k: 'slice', side: ME, x1: lastPt.x, y1: lastPt.y, x2: p.x, y2: p.y })
      trail.push({ x: p.x, y: p.y, at: performance.now() })
      if (trail.length > 40) trail.shift()
      lastPt = p
    }
    aimAt = p
    if (aimHeld) sendAim(true)
    if (e.pointerType === 'mouse' || pointerDown) move(p.y, selectedPaddle(ME))
  }
  const onUp = (e?: PointerEvent) => {
    if (e) touches.delete(e.pointerId)
    if (e && e.pointerType === 'mouse') { flipHeld.up = false; flipHeld.down = false; syncFlip() }
    // a quick tap on a touch screen flips: top half flips up, bottom half flips down
    if (e && e.pointerType === 'touch' && flipArmed() && performance.now() - downAt < 250 && Math.hypot(e.clientX - downX, e.clientY - downY) < 14) {
      const r = canvas.getBoundingClientRect()
      const up = e.clientY - r.top < r.height / 2
      flipHeld.up = up; flipHeld.down = !up; syncFlip()
      setTimeout(() => { flipHeld.up = false; flipHeld.down = false; if (!dead) syncFlip() }, 160)
    }
    if (e?.type === 'pointerup' && pointerDown && downWorld && !paused && world.status === 'play') {
      const end = toWorld(e), dx = end.x - downWorld.x, dy = end.y - downWorld.y
      if (Math.abs(dy) >= 44 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        const active = world.balls.filter(b => !b.scored)
        const closest = active.map(b => ({ b, d: segmentDistance(b.x, b.y, downWorld!.x, downWorld!.y, end.x, end.y) })).sort((a, b) => a.d - b.d)[0]
        if (closest && closest.d <= 44) out({ k: 'swipe', side: ME, dir: dy < 0 ? -1 : 1, x: closest.b.x, y: closest.b.y })
      }
    }
    if (touches.size === 0) { pointerDown = false; lastPt = null; downWorld = null }
  }
  let controlsUI: ControlsPanel | null = null
  // tilt (A/D and the player 2 equivalents) and the hold-Space arm aim
  const tiltHeld = [{ l: false, r: false }, { l: false, r: false }]
  const tiltSent: Array<-1 | 0 | 1> = [0, 0]
  const syncTilt = (slot: 0 | 1) => {
    const shared = world.mode.id === 'duo-fall' && !duoLocal()
    const side: 0 | 1 = slot === 0 ? ME : secondSide()
    const h = shared ? { l: tiltHeld[0]!.l || tiltHeld[1]!.l, r: tiltHeld[0]!.r || tiltHeld[1]!.r } : tiltHeld[slot]!
    const d: -1 | 0 | 1 = h.r && !h.l ? 1 : h.l && !h.r ? -1 : 0
    if (d === tiltSent[side] || paused || world.status !== 'play') return
    tiltSent[side] = d
    out({ k: 'tilt', side, dir: d })
  }
  let aimHeld = false          // player 1: Space held, arm follows the mouse
  let aim2Held = false         // player 2: thrust key held, arm follows their up / down keys
  let aimAt = { x: 0, y: 0 }
  const aimSent = ['', '']
  const sendAimFor = (side: 0 | 1, on: boolean, x: number, y: number) => {
    const key = `${on}:${Math.round(x)}:${Math.round(y)}`
    if (key === aimSent[side] || paused || world.status !== 'play') return
    aimSent[side] = key
    out({ k: 'aim', side, on, x, y })
  }
  const sendAim = (on: boolean) => sendAimFor(ME, on, aimAt.x, aimAt.y)
  // player 2 has no cursor: while their thrust key is held the arm points up, down or straight out with their move keys
  const sendAim2 = (on: boolean) => {
    const dir = (keys.has('p2Down') ? 1 : 0) - (keys.has('p2Up') ? 1 : 0)
    const side = secondSide()
    sendAimFor(side, on, 0, world.sides[side].paddleY + dir * 400)
  }
  const side2 = () => (world.mode.id === 'duo-fall' || !world.mode.ai) && !net && !paused && world.status === 'play'
  const onKeyDown = (e: KeyboardEvent) => {
    const k = normKey(e.key)
    // End screens own keyboard focus; don't let the match restart hotkey discard a pending win.
    if (world.status !== 'play') return
    audio.unlock(); music.kick()
    if (k === 'c' && !e.repeat) { controlsUI?.toggle(); return }
    if (world.mode.id === 'duo-fall' && ['g', 'h', 'b', 'v'].includes(k)) {
      keys.add(k); updateFocusButtons(); return
    }
    if ((k === 'arrowup' || k === 'arrowdown') && flipArmed()) { e.preventDefault(); if (k === 'arrowup') flipHeld.up = true; else flipHeld.down = true; syncFlip(); return }
    const a: ActionId | undefined = actionFor(S.keys, k)
    if (a) {
      if (k === ' ') e.preventDefault()
      switch (a) {
        case 'p1Thrust':
          if (e.repeat) break
          thrustNow()                                  // pressing Space always lunges, arm or not
          if (!paused && world.status === 'play' && world.sides[ME].grow > 0.5) { aimHeld = true; sendAim(true) }
          break
        case 'p1Power': if (!e.repeat) powerNow(); break
        case 'p2Power': if (!e.repeat && side2()) out({ k: 'power', side: secondSide() }); break
        case 'p2Slice': if (!e.repeat && side2()) { const side = secondSide(); const y = world.sides[side].paddleY; out({ k: 'slice', side, x1: -1100, y1: y, x2: 1100, y2: y }) } break
        case 'p2FlipUp': flip2Held.up = true; syncFlip2(); break
        case 'p2FlipDown': flip2Held.down = true; syncFlip2(); break
        case 'p1TiltL': tiltHeld[0]!.l = true; syncTilt(0); break
        case 'p1TiltR': tiltHeld[0]!.r = true; syncTilt(0); break
        case 'p2TiltL': tiltHeld[1]!.l = true; syncTilt(1); break
        case 'p2TiltR': tiltHeld[1]!.r = true; syncTilt(1); break
        case 'p2Thrust':
          if (e.repeat || !side2()) break
          issue(world, { k: 'thrust', side: secondSide() })
          if (world.sides[secondSide()].grow > 0.5) { aim2Held = true; sendAim2(true) }
          break
        default: break
      }
      if (a === 'p1Up' || a === 'p1Down' || a === 'p2Up' || a === 'p2Down') keys.add(a)
      return
    }
    keys.add(k)
    if (k === 'z') cam.lock = cam.lock === 'auto' ? 'field' : cam.lock === 'field' ? 'arena' : 'auto'
    if (k === 'r') handle.reset()
    if (k === 'm') { audio.setMuted(!audio.isMuted()); panelUI?.sync() }
    if (k === 'p' || k === 'escape') {
      if (userPause) closePauseMenu()
      else if (!paused && world.status === 'play') openPauseMenu()
      else if (paused && !panelUI?.isOpen() && !controlsUI?.isOpen()) handle.resume()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    const k = normKey(e.key)
    if (world.mode.id === 'duo-fall' && ['g', 'h', 'b', 'v'].includes(k)) {
      const side: 0 | 1 = duoLocal() ? (k === 'g' || k === 'h' ? 0 : 1) : 0
      const released: 0 | 1 = k === 'g' || k === 'b' ? 0 : 1
      keys.delete(k)
      if (selectedPaddle(side) === undefined) alignPaddles(side, released)
      updateFocusButtons(); return
    }
    keys.delete(k)
    const a = actionFor(S.keys, k)
    if (a) {
      keys.delete(a)
      if (a === 'p1Thrust') {                       // letting go of Space always lunges too (ignoring the recharge), so a timed release gets the arm boost and the lunge
        if (aimHeld) { aimHeld = false; sendAim(false) }
        thrustNow(true)
      }
      if (a === 'p2Thrust') {
        if (aim2Held) { aim2Held = false; sendAim2(false) }
        if (side2()) issue(world, { k: 'thrust', side: secondSide(), free: true })
      }
      if (a === 'p1TiltL') { tiltHeld[0]!.l = false; syncTilt(0) }
      if (a === 'p1TiltR') { tiltHeld[0]!.r = false; syncTilt(0) }
      if (a === 'p2TiltL') { tiltHeld[1]!.l = false; syncTilt(1) }
      if (a === 'p2TiltR') { tiltHeld[1]!.r = false; syncTilt(1) }
      if (a === 'p2FlipUp') { flip2Held.up = false; syncFlip2() }
      if (a === 'p2FlipDown') { flip2Held.down = false; syncFlip2() }
    }
    if (k === 'arrowup') { flipHeld.up = false; syncFlip() }
    if (k === 'arrowdown') { flipHeld.down = false; syncFlip() }
  }
  const onVis = () => { if (document.hidden) handle.pause() }
  canvas.addEventListener('contextmenu', e => e.preventDefault())
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('visibilitychange', onVis)

  const resetSettings = () => { Object.assign(S, defaultSettings(osReduce())); fx.reduce = S.reduceMotion; fx.fogMode = S.fog; if (!fx.fog) fx.fog = createFogGL(); saveSettings(S); applyLens(); handle.reset(); paused = true; applyButtons() }
  // settings panel (also pauses the game while open)
  // pause menu and the end-of-match choices
  let userPause = false
  const pauseUI = createPauseMenu(el)
  let endUI!: ReturnType<typeof createEndScreen>
  endUI = createEndScreen(el, {
    onRetry: () => { if (net) { netNote('Waiting for your opponent to accept the rematch…'); net.requestRematch(newSeed()) } else handle.reset() },
    onMenu: () => opts.onMenu?.(),
    onTakeWin: () => {
      if (!pendingWinResult) return
      result = pendingWinResult; pendingWinResult = null; savedChoice = true; endUI.show()
      if (result.won && !result.experimental && hasCpuOpponent(world) && unlockLens()) { fx.banners.push({ text: 'LENS UNLOCKED', sub: 'Settings → Lens: 8 filters and a hue shift', at: performance.now(), ms: 5000, color: '#8affc1' }); panelUI?.sync() }
      host.onResult?.(result, recordReplay(world)); emit('result', result)
    },
    onOvertime: () => {
      if (!pendingWinResult) return
      pendingWinResult = null; satelliteWorld = null; result = null; reported = false; endUI.hide()
      fx.banners.push({ text: 'AT WHAT COST?', sub: 'POWER MODE · FIRST TO 6 · THE WIN IS ON THE LINE', at: performance.now(), ms: 4000, color: '#ff8a8a' })
      out({ k: 'overtime' })
    },
    menuAvailable: () => opts.menuAvailable?.() ?? false,
  })
  let endTimer = 0
  let saveDialog: HTMLElement | null = null
  function openSaveDialog() {
    if (saveDialog || net) return
    const cover = document.createElement('div'); cover.setAttribute('role', 'dialog'); cover.setAttribute('aria-modal', 'true'); cover.setAttribute('aria-label', 'Save match')
    cover.style.cssText = 'position:absolute;inset:0;z-index:25;display:grid;place-items:center;background:#03070cbb;color:#e6eef9;font:15px system-ui'
    const form = document.createElement('form'); form.style.cssText = 'width:min(90vw,360px);display:grid;gap:12px;padding:22px;border:1px solid #718da4;border-radius:12px;background:#101923;box-shadow:0 20px 60px #000b'
    const title = document.createElement('strong'); title.textContent = 'Name this save'
    const input = document.createElement('input'); input.type = 'text'; input.required = true; input.maxLength = 48; input.value = `${world.mode.label} · ${new Date().toLocaleString()}`; input.setAttribute('aria-label', 'Save name'); input.style.cssText = 'padding:10px;background:#071019;color:#fff;border:1px solid #718da4;border-radius:6px;font:15px system-ui'
    const msg = document.createElement('div'); msg.setAttribute('role', 'status'); msg.style.cssText = 'min-height:18px;color:#ffb7b7'
    const row = document.createElement('div'); row.style.cssText = 'display:flex;justify-content:flex-end;gap:8px'
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Save'; submit.style.color = '#8affc1'
    const close = () => { cover.remove(); saveDialog = null }
    cancel.onclick = close
    form.onsubmit = e => { e.preventDefault(); try { saveSlot(input.value, recordReplay(world)); close(); netNote('Match saved. Load it from the main menu.') } catch (err) { msg.textContent = err instanceof Error ? err.message : 'Could not save match.' } }
    cover.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    row.append(cancel, submit); form.append(title, input, msg, row); cover.append(form); el.append(cover); saveDialog = cover; input.focus(); input.select()
  }
  const pauseItems = () => [
    { label: 'Resume', run: () => closePauseMenu() },
    ...(!net ? [{ label: 'Save match', run: openSaveDialog }] : []),
    ...(net ? [] : [{ label: 'Restart match', run: () => { closePauseMenu(); handle.reset() } }]),
    { label: 'Settings', run: () => panelUI?.open() },
    { label: 'Keyboard controls (C)', run: () => controlsUI?.toggle() },
    { label: 'Music', run: () => { if (opts.toggleMusic) opts.toggleMusic(); else musicUI?.toggle() } },
    { label: 'Rules and how it works', run: () => { window.open('/rules.html', '_blank', 'noopener') } },
    { label: 'Dev notes', run: () => { window.open('/about.html', '_blank', 'noopener') } },
    ...(net ? [{ label: 'Leave match', run: () => { net.leave(); closePauseMenu(); opts.onMenu?.() }, danger: true }] : opts.menuAvailable?.() ? [{ label: 'Main menu', run: () => { closePauseMenu(); opts.onMenu?.() } }] : []),
    { label: 'Reset settings to defaults', run: () => { resetSettings(); userPause = true; paused = true }, danger: true, hint: 'Difficulty, mode, volume, keys and looks go back to their defaults' },
  ]
  // online: the menu opens over a match that keeps running (the other player cannot be paused)
  /** Match info, quick sound and look switches, and a key reminder, so the pause menu has what you need without opening Settings. */
  function pauseExtras() {
    const box = document.createElement('div')
    box.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid #243046;font:13px system-ui;color:#cfe3ff'
    const w = world
    const sc = `${w.sides[0].score} : ${w.sides[1].score}`
    const left = w.opts.timeLimit > 0 ? ` · ${Math.max(0, Math.ceil(w.opts.timeLimit - w.t))}s left` : ''
    const info = document.createElement('div'); info.style.cssText = 'color:#7f8da3;margin-bottom:8px;text-align:center'
    info.textContent = `${w.mode.label} · ${w.difficulty.label} · ${sc}${left}${w.flux ? ' · flux' : ''}`
    box.appendChild(info)
    const row = (label: string, ctrl: HTMLElement) => { const r = document.createElement('label'); r.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin:6px 0'; const t = document.createElement('span'); t.textContent = label; r.append(t, ctrl); box.appendChild(r) }
    const slider = (get: () => number, set: (v: number) => void) => { const i = document.createElement('input'); i.type = 'range'; i.min = '0'; i.max = '100'; i.value = String(Math.round(get() * 100)); i.style.width = '150px'; i.oninput = () => set(Number(i.value) / 100); return i }
    const check = (get: () => boolean, set: (v: boolean) => void) => { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = get(); i.onchange = () => set(i.checked); return i }
    row('Master volume', slider(() => audio.getVolume(), v => audio.setVolume(v)))
    row('Music volume', slider(() => audio.getBus('mus'), v => audio.setBus('mus', v)))
    row('Mute', check(() => audio.isMuted(), v => audio.setMuted(v)))
    row('Reduce motion', check(() => S.reduceMotion, v => { S.reduceMotion = v; fx.reduce = v; saveSettings(S) }))
    row('Control hints', check(() => S.hints, v => { S.hints = v; saveSettings(S) }))
    const keys = document.createElement('div'); keys.style.cssText = 'margin-top:8px;color:#7f8da3;font-size:12px;line-height:1.5;text-align:center'
    keys.textContent = 'W/S or mouse: move · A/D: tilt · Space: lunge (hold to aim the arm) · E: pinball · Z: zoom · M: mute · C: change keys'
    box.appendChild(keys)
    return box
  }
  function openPauseMenu() { userPause = true; if (!net) paused = true }
  function closePauseMenu() { userPause = false; pauseUI.hide(); handle.resume() }
  // online status line: waiting, connection lost, out of sync, opponent left
  const netBar = document.createElement('div')
  netBar.setAttribute('data-pf', 'net-status')
  netBar.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);display:none;z-index:15;padding:8px 16px;border-radius:10px;border:1px solid #ffe08a;background:rgba(12,16,24,.95);color:#ffe08a;font:600 14px system-ui;text-align:center'
  el.appendChild(netBar)
  let noteTimer = 0
  function netNote(text: string) { netBar.textContent = text; netBar.style.display = 'block'; window.clearTimeout(noteTimer); noteTimer = window.setTimeout(() => { if (net && net.status() === 'live') netBar.style.display = 'none' }, 4000) }
  function showNetStatus(st: NetStatus) {
    const text: Partial<Record<NetStatus, string>> = { waiting: 'Waiting for your opponent…', lost: 'Connection lost. Match paused for up to five minutes…', desync: 'The two games went out of sync. This match cannot continue.', left: 'Your opponent left the match.', forfeit: 'Public match ended by forfeit after five minutes.', abandoned: 'This invite room expired.' }
    const t = text[st]
    if (!t) { netBar.style.display = 'none'; return }
    netBar.textContent = t; netBar.style.display = 'block'
    if (st === 'desync' || st === 'left' || st === 'forfeit' || st === 'abandoned') { const b = document.createElement('button'); b.textContent = 'Back to the menu'; b.style.cssText = 'margin-left:12px;padding:4px 10px;border-radius:8px;border:1px solid #2a3446;background:#101722;color:#cfe3ff;cursor:pointer'; b.onclick = () => { net?.leave(); opts.onMenu?.() }; netBar.appendChild(b) }
  }
  if (net) { net.onStatus(showNetStatus); net.onRematch(seed => { netBar.style.display = 'none'; handle.reset(seed); net.restart() }) }
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
        applyLens()
        if (restart) { handle.reset(); if (panelUI?.isOpen()) { paused = true } }
        applyButtons()
      },
      lensUnlocked: isLensUnlocked,
      online: !!net,
      allowedModes: opts.allowedModes,
      onResetProgress: opts.onResetProgress,
      reset() { resetSettings() },
      onOpen() { if (!paused) { paused = true; pausedByPanel = true } },
      onClose() { if (pausedByPanel) { pausedByPanel = false; handle.resume() } },
    })
  }

  if (!opts.noSettings) {
    let pausedByControls = false
    controlsUI = createControlsPanel({
      host: el,
      get: () => S.keys,
      set(keys) { S.keys = keys; saveSettings(S) },
      onOpen() { if (!paused) { paused = true; pausedByControls = true } },
      onClose() { if (pausedByControls) { pausedByControls = false; handle.resume() } },
    })
  }

  const musicUI = opts.noSettings || opts.music ? null : createMusicPanel(el, music, audio)

  // on-screen THRUST and POWER buttons (mouse and touch)
  el.style.position ||= 'relative'
  const mkBtn = (label: string, css: string, fn: () => void) => {
    const b = document.createElement('button')
    b.textContent = label; b.setAttribute('data-pf', label)
    b.style.cssText = 'position:absolute;bottom:44px;width:92px;height:92px;border-radius:50%;border:2px solid #2a3446;background:rgba(16,21,31,.8);color:#cfe3ff;font:700 13px system-ui;cursor:pointer;z-index:5;touch-action:manipulation;' + css
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); audio.unlock(); music.kick(); fn() })
    el.appendChild(b)
    return b
  }
  const mkHold = (label: string, css: string, set: (on: boolean) => void) => {
    const b = document.createElement('button')
    b.textContent = label; b.setAttribute('data-pf', label)
    b.style.cssText = 'position:absolute;width:76px;height:76px;border-radius:50%;border:2px solid #8affc1;background:rgba(16,31,26,.85);color:#d8ffe9;font:700 13px system-ui;cursor:pointer;z-index:5;touch-action:none;display:none;' + css
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); audio.unlock(); b.setPointerCapture(e.pointerId); set(true) })
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(ev, () => set(false))
    el.appendChild(b)
    return b
  }
  const thrustBtn = mkBtn('THRUST', 'left:16px', thrustNow)
  const powerBtn = mkBtn('PINBALL', 'right:16px', powerNow)
  if (world.mode.id === 'duo-fall' && !net) {
    const makeFocusButton = (side: 0 | 1, index: 0 | 1, label: string, left: string) => {
      const button = document.createElement('button')
      button.type = 'button'; button.textContent = label; button.dataset.pf = 'paddle-focus'; button.setAttribute('aria-label', `Player ${side + 1}, focus Arena ${index + 1} paddle`); button.setAttribute('aria-pressed', 'false')
      button.style.cssText = `position:absolute;left:${left};bottom:52px;min-width:92px;height:34px;padding:0 9px;border:1px solid #52667e;border-radius:8px;background:rgba(12,19,28,.82);color:#b6c8da;font:700 11px ui-monospace,monospace;cursor:pointer;z-index:5;touch-action:manipulation;`
      button.addEventListener('click', e => { e.stopPropagation(); setPaddleFocus(side, index) })
      el.appendChild(button); focusButtons.push({ button, side, paddle: index })
    }
    if (duoLocal()) {
      makeFocusButton(0, 0, 'P1 G · A1', 'calc(50% - 204px)')
      makeFocusButton(0, 1, 'P1 H · A2', 'calc(50% - 102px)')
      makeFocusButton(1, 0, 'P2 B · A1', 'calc(50% + 4px)')
      makeFocusButton(1, 1, 'P2 V · A2', 'calc(50% + 106px)')
    } else {
      makeFocusButton(0, 0, 'G / B · A1', 'calc(50% - 102px)')
      makeFocusButton(0, 1, 'H / V · A2', 'calc(50% + 4px)')
    }
    updateFocusButtons()
  }
  const flipUpBtn = mkHold('FLIP ▲', 'bottom:150px', on => { flipHeld.up = on; syncFlip() })
  const flipDownBtn = mkHold('FLIP ▼', 'bottom:236px', on => { flipHeld.down = on; syncFlip() })
  function applyButtons() {
    const show = S.buttons === 'show' ? 'block' : 'none'
    thrustBtn.style.display = show; powerBtn.style.display = show
    for (const b of [flipUpBtn, flipDownBtn]) { b.style.right = S.leftHanded ? '' : '28px'; b.style.left = S.leftHanded ? '28px' : '' }
    thrustBtn.style.left = S.leftHanded ? '' : '16px'; thrustBtn.style.right = S.leftHanded ? '16px' : ''
    powerBtn.style.right = S.leftHanded ? '' : '16px'; powerBtn.style.left = S.leftHanded ? '16px' : ''
  }
  applyButtons()
  function syncButtons() {
    const ps = powerState(world, ME)
    powerBtn.style.opacity = ps === 'locked' ? '0.35' : '1'
    powerBtn.style.borderColor = ps === 'ready' ? '#ffe08a' : ps === 'active' ? '#8affc1' : '#2a3446'
    powerBtn.style.boxShadow = ps === 'ready' ? '0 0 18px #ffe08a88' : 'none'
    powerBtn.textContent = ps === 'locked' ? 'PINBALL 🔒' : ps === 'active' ? 'PINBALL ON' : ps === 'ready' ? `PINBALL (${ME === 0 ? 'E' : 'O'})` : `PINBALL ${ME === 0 ? world.tearsHeld : world.tearsHeld2}/${world.tune.tearsForPower}`
    const showFlip = ps === 'active' && S.buttons === 'show' ? 'block' : 'none'
    flipUpBtn.style.display = showFlip; flipDownBtn.style.display = showFlip
    thrustBtn.style.opacity = thrustCharge(world, ME) > 0 ? '0.45' : '1'
  }

  let last = performance.now(), acc = 0, raf = 0, dead = false
  let slowFrames = 0
  let wasUnlocked = world.powerUnlocked
  const frameEvents: WorldEvent[] = []
  function frame(now: number) {
    if (dead) return
    if (net && world.status === 'over') net.beforeStep(world, now)
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    // adaptive quality: if the shader fog makes frames slow, fall back to the cheap fog for good
    if (fx.fog && !paused && !document.hidden) { slowFrames = dt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 2); if (slowFrames > 90) { fx.fog.destroy(); fx.fog = null } }
    if (!paused) {
      acc += dt
      while (acc >= FIXED_DT) {
        if (net && world.status === 'play' && !net.beforeStep(world, performance.now())) { acc = Math.min(acc, FIXED_DT * 4); break }   // waiting for the opponent's input
        const armedNow = powerActive(world, ME)
        const k = (keys.has('p1Up') || (!armedNow && keys.has('arrowup')) ? -1 : 0) + (keys.has('p1Down') || (!armedNow && keys.has('arrowdown')) ? 1 : 0)
        if (k && world.mode.id !== 'duo-fall') move(world.sides[ME].paddleY + k * 80)
        if (world.mode.id === 'duo-fall' && !net) {
          const k1 = (keys.has('p1Up') ? -1 : 0) + (keys.has('p1Down') ? 1 : 0)
          const k2 = (keys.has('p2Up') ? -1 : 0) + (keys.has('p2Down') ? 1 : 0)
          if (duoLocal()) {
            const own1 = world.sides[ME], own2 = world.sides[1]
            const focus1 = selectedPaddle(0), focus2 = selectedPaddle(1)
            if (k1) move((focus1 === 1 ? own1.target2Y : own1.targetY) + k1 * 80, focus1)
            if (k2) moveFor(1, (focus2 === 1 ? own2.target2Y : own2.targetY) + k2 * 80, focus2)
          } else {
            const shared = Math.max(-1, Math.min(1, k1 + k2))
            const own = world.sides[ME]
            const focus = selectedPaddle(0)
            if (shared) move((focus === 1 ? own.target2Y : own.targetY) + shared * 80, focus)
            else if (k1 || k2) move(focus === 1 ? own.target2Y : own.targetY, focus)
          }
          if (aim2Held) sendAim2(true)
        } else if ((!world.mode.ai || duoLocal()) && !net) {
          const k2 = (keys.has('p2Up') ? -1 : 0) + (keys.has('p2Down') ? 1 : 0)
          if (aim2Held) sendAim2(true)
          if (k2) out({ k: 'move', side: 1, y: world.sides[1].paddleY + k2 * 80 })
        }
        stepWorld(world)
        if (experiments.includes('echo-rallies') && world.tick % 4 === 0) {
          for (const ball of world.balls) echo.push({ x: ball.x, y: ball.y, tick: world.tick })
          while (echo.length > 180) echo.shift()
        }
        if (pendingWinResult || savedChoice) {
          if (!satelliteWorld) satelliteWorld = createWorld({ mode: 'sandbox', difficulty: S.difficulty, arenas: world.arenaCount, flux: world.flux }, (world.seed ^ 0x51a7e) >>> 0)
          stepWorld(satelliteWorld); satelliteWorld.events.length = 0
        }
        for (const e of world.events) frameEvents.push(e)
        world.events.length = 0
        acc -= FIXED_DT
      }
      const sc = world.sides[0].score + world.sides[1].score
      if (sc !== lastScore) { lastScore = sc; emit('score', null) }
      if (world.status === 'over' && !reported) {
        reported = true
        const ended = currentResult()
        if (ended?.won && ended.endReason === 'score' && hasCpuOpponent(world) && !net && !world.overtime) {
          pendingWinResult = ended; result = ended
          window.clearTimeout(endTimer); endTimer = window.setTimeout(() => { if (!dead && world.status === 'over' && pendingWinResult) endUI.showDecision() }, 1000)
        } else {
          result = ended
          window.clearTimeout(endTimer); endTimer = window.setTimeout(() => { if (!dead && world.status === 'over') endUI.show() }, 1500)
          if (result?.won && !result.experimental && hasCpuOpponent(world) && unlockLens()) { fx.banners.push({ text: 'LENS UNLOCKED', sub: 'Settings → Lens: 8 filters and a hue shift', at: performance.now(), ms: 5000, color: '#8affc1' }); panelUI?.sync() }
          if (result) { host.onResult?.(result, recordReplay(world)); emit('result', result) }
        }
      }
      feedFx(fx, world, frameEvents, dt, performance.now())
      if (world.powerUnlocked && !wasUnlocked) { wasUnlocked = true; if (!experiments.length && !ventsEnabled) host.onPowerUnlocked?.() }
      for (const e of frameEvents) { const c = cueForEvent(e); if (c) audio.play(c.cue, c.level) }
      frameEvents.length = 0
    }
    syncButtons()
    if (userPause && world.status !== 'play') userPause = false
    const wantPause = userPause && !panelUI?.isOpen() && !controlsUI?.isOpen() && !musicUI?.isOpen()
    if (wantPause !== pauseUI.isOpen()) { if (wantPause) pauseUI.show(pauseItems(), net ? 'Menu' : 'Paused', net ? 'The match keeps running' : 'P or Esc to resume', pauseExtras()); else pauseUI.hide() }
    audio.setAmbience(world.fallV, windAt(world), !paused && world.status === 'play', S.fallSound)
    stepCamera(world, cam, cw, ch, dt)
    const nowMs = performance.now()
    while (trail.length && nowMs - trail[0]!.at > 400) trail.shift()
    const arenaOutcome = world.status === 'over' && result && !pendingWinResult ? (savedChoice || result.won ? 'saved' : 'fallen') : null
    renderWorld(ctx, world, cam, cw, ch, { me: ME, paused: paused && !pauseUI.isOpen(), result, best: host.getBest?.(world.mode.id, world.difficulty.id) ?? null, user: host.getIdentity?.()?.name ?? null, trail, now: nowMs, muted: audio.isMuted(), perks: result?.perks ?? [], hints: S.hints, gauge: S.gauge, visible: S.gameHud, arenaOutcome, arenaTether: !!pendingWinResult, satelliteWorld: satelliteWorld ?? undefined }, fx, {
      shaftDistricts: experiments.includes('shaft-districts'), eyeRemembers: experiments.includes('eye-remembers'), oldGlassTraces: experiments.includes('old-glass-traces'), echoRallies: experiments.includes('echo-rallies'), shaftSignals: experiments.includes('shaft-signals'), ballComet: experiments.includes('ball-comet'), paddleWake: experiments.includes('paddle-wake'), glassImpactHalo: experiments.includes('glass-impact-halo'), localFalls, echo, experimental: experiments.length > 0 || ventsEnabled, paint,
    })
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  const handle: PongFallHandle = {
    pause() { paused = true },
    resume() { paused = false; last = performance.now(); syncFlip(); syncTilt(0); if (!net) { syncTilt(1); syncFlip2() }; sendAim(aimHeld); if (!net) sendAim2(aim2Held) },
    reset(seed) { window.clearTimeout(endTimer); endUI.hide(); pendingWinResult = null; satelliteWorld = null; echo.length = 0; savedChoice = false; userPause = false; pauseUI.hide(); aimHeld = false; aim2Held = false; aimSent[0] = ''; aimSent[1] = ''; tiltHeld.forEach(t => { t.l = false; t.r = false }); tiltSent[0] = 0; tiltSent[1] = 0; flipHeld.up = false; flipHeld.down = false; flipSent = 0; flip2Held.up = false; flip2Held.down = false; flip2Sent = 0; for (const key of ['g', 'h', 'b', 'v']) keys.delete(key); paddleFocus[0] = null; paddleFocus[1] = null; moveCache.clear(); updateFocusButtons(); world = mk(seed); wasUnlocked = world.powerUnlocked; reported = false; result = null; lastScore = 0; acc = 0; paused = false; frameEvents.length = 0; fx.splats.length = 0 },
    configure(c) {
      if (c.mode && c.mode in MODES) S.mode = c.mode
      if (c.difficulty && c.difficulty in DIFFICULTIES) S.difficulty = c.difficulty
      saveSettings(S); panelUI?.sync(); handle.reset()
    },
    destroy() {
      dead = true
      cancelAnimationFrame(raf); ro.disconnect(); if (ownsAudio) audio.destroy(); else audio.setAmbience(0, 0, false); fx.fog?.destroy()
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp)
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVis)
      canvas.remove(); saveDialog?.remove(); window.clearTimeout(endTimer); window.clearTimeout(noteTimer); netBar.remove(); if (net && net.status() !== 'left') net.leave(); endUI.destroy(); pauseUI.destroy(); panelUI?.destroy(); controlsUI?.destroy(); musicUI?.destroy(); if (ownsMusic) music.destroy()
      el.querySelectorAll('button[data-pf]').forEach(b => b.remove())
    },
    on(ev, cb) { listeners[ev].push(cb) },
    getResult: () => result,
  }
  return handle
}
