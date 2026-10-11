import { createWorld, stepWorld, issue, World } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import { getResult, GameResult } from '../sim/result'
import { recordReplay } from '../sim/replay'
import { renderWorld, newCamera, stepCamera, screenToWorld } from '../render/draw'
import type { Host } from '../host/host'

export interface PongFallOptions {
  mode?: string
  modifiers?: string[]
  seed?: number
  target?: number
  timeLimit?: number
  host?: Host
}
export type PongFallEvent = 'result' | 'score'
export interface PongFallHandle {
  pause(): void
  resume(): void
  reset(seed?: number): void
  destroy(): void
  on(ev: PongFallEvent, cb: (r: GameResult | null) => void): void
  getResult(): GameResult | null
}

const newSeed = () => (Math.random() * 1e9) | 0

/** Mounts a PongFall instance into `el`. Owns its canvas, loop and listeners; destroy() removes them all. */
export function createPongFall(el: HTMLElement, opts: PongFallOptions = {}): PongFallHandle {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
  el.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const host = opts.host ?? {}
  const cam = newCamera()
  cam.zoom = 0.5
  const listeners: Record<PongFallEvent, Array<(r: GameResult | null) => void>> = { result: [], score: [] }
  const keys = new Set<string>()
  let cw = 1, ch = 1
  let paused = false
  let reported = false
  let lastScore = 0
  let lastMoveY = NaN
  let result: GameResult | null = null
  let world: World = mk(opts.seed)

  function mk(seed = newSeed()): World {
    return createWorld({ mode: opts.mode, modifiers: opts.modifiers, target: opts.target, timeLimit: opts.timeLimit }, seed)
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
  function pointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect()
    const p = screenToWorld(cam, cw, ch, e.clientX - r.left, e.clientY - r.top)
    if (e.type === 'pointerdown' && world.tears.some(t => Math.hypot(t.x - p.x, t.y - p.y) < 40 / Math.max(0.3, cam.zoom * 2))) {
      issue(world, { k: 'tear', x: p.x, y: p.y }); return
    }
    move(p.y)
  }
  const onDown = (e: PointerEvent) => { canvas.setPointerCapture(e.pointerId); pointer(e) }
  const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.buttons) pointer(e) }
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    keys.add(k)
    if (k === 'z') cam.lock = cam.lock === 'auto' ? 'field' : cam.lock === 'field' ? 'arena' : 'auto'
    if (k === 'r') handle.reset()
    if (k === 'p' || k === 'escape') paused ? handle.resume() : handle.pause()
  }
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
  const onVis = () => { if (document.hidden) handle.pause() }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  document.addEventListener('visibilitychange', onVis)

  let last = performance.now(), acc = 0, raf = 0, dead = false
  function frame(now: number) {
    if (dead) return
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    if (!paused) {
      acc += dt
      while (acc >= FIXED_DT) {
        const k = (keys.has('w') || keys.has('arrowup') ? -1 : 0) + (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
        if (k) move(world.sides[0].paddleY + k * 80)
        stepWorld(world)
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
    }
    stepCamera(world, cam, cw, dt)
    renderWorld(ctx, world, cam, cw, ch, { paused, result, best: host.getBest?.(world.mode.id) ?? null, user: host.getIdentity?.()?.name ?? null })
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  const handle: PongFallHandle = {
    pause() { paused = true },
    resume() { paused = false; last = performance.now() },
    reset(seed) { world = mk(seed); reported = false; result = null; lastScore = 0; lastMoveY = NaN; acc = 0; paused = false },
    destroy() {
      dead = true
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVis)
      canvas.remove()
    },
    on(ev, cb) { listeners[ev].push(cb) },
    getResult: () => result,
  }
  return handle
}
