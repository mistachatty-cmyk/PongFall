import { createWorld, issue, stepWorld, type WorldEvent } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import { newCamera, renderWorld, stepCamera } from '../render/draw'
import { createFx, feedFx } from '../render/eyes'

/** Decorative real-engine match. No audio, host, rewards, settings writes or input handlers. */
export function mountArcadeCard(el: HTMLElement, balanced: boolean): () => void {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none'
  el.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const fx = createFx(false)
  fx.fogMode = 'low'
  const cam = newCamera()
  cam.zoom = .5
  let world = createWorld({ mode: 'classic', difficulty: 'casual', arenas: 3 }, 616)
  let width = 1, height = 1, last = performance.now(), drawn = 0, acc = 0, raf = 0
  let announced = false
  const events: WorldEvent[] = []
  const resize = () => {
    const rect = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, balanced ? 1 : 1.5)
    width = Math.max(1, rect.width); height = Math.max(1, rect.height)
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(el); resize()
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) { last = now; return }
    if (now - drawn < 1000 / (balanced ? 30 : 60)) return
    const dt = Math.min(.1, (now - last) / 1000)
    last = drawn = now; acc += dt
    while (acc >= FIXED_DT) {
      const ball = world.balls[0]
      if (ball) issue(world, { k: 'move', side: 0, y: ball.y })
      stepWorld(world)
      events.push(...world.events); world.events.length = 0
      // The decorative match is never replayed; bound the input history for long hovers.
      world.log.length = 0
      acc -= FIXED_DT
    }
    feedFx(fx, world, events, dt, now); events.length = 0
    stepCamera(world, cam, width, height, dt)
    renderWorld(ctx, world, cam, width, height, { paused: false, result: null, best: null, user: null, trail: [], now, muted: true, perks: [], hints: false, gauge: false }, fx)
    if (!announced) { announced = true; window.parent.postMessage({ type: 'gsix-card-ready' }, '*') }
    if (world.status === 'over') { world = createWorld({ mode: 'classic', difficulty: 'casual', arenas: 3 }, world.seed + 1); fx.splats.length = 0 }
  }
  raf = requestAnimationFrame(frame)
  const destroy = () => { cancelAnimationFrame(raf); observer.disconnect(); canvas.remove() }
  window.addEventListener('pagehide', destroy, { once: true })
  return () => { window.removeEventListener('pagehide', destroy); destroy() }
}
