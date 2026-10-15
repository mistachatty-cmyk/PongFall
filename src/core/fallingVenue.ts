import { createWorld, type World } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import { createFx, feedFx } from '../render/eyes'
import { newCamera, renderWorld, stepCamera } from '../render/draw'
import { stepIntroAttractWorld } from './introAttract'
import { painterColors, type PainterSelection } from './pongPainter'
import { isLensUnlocked, lensFilter } from '../render/lens'
import { SETTINGS_KEY } from './settings'

export type VenueView = 'personal' | 'shaft'
export type VenueKind = 'paint-counter' | 'lok-market' | 'eye-atelier' | 'arena-yard' | 'records' | 'replay-archive'
const VENUES: Record<VenueKind, { sign: string; footer: string; accent: string }> = {
  'paint-counter': { sign: '◈ LOK PAINT COUNTER · LIVE ARENA', footer: 'TRY A LOOK · WATCH IT PLAY · THE FALL CONTINUES', accent: '#8fe5ec' },
  'lok-market': { sign: '◈ LOK SHOP · THE FALLING MARKET', footer: 'A LARGER ARENA FOR THE LOK ECOSYSTEM', accent: '#ffe08a' },
  'eye-atelier': { sign: '◉ EYE ATELIER · WATCH THE WALLS', footer: 'EVERY GAZE FOLLOWS THE RALLY', accent: '#c9a6ff' },
  'arena-yard': { sign: '◇ ARENA YARD · FRAME THE FALL', footer: 'COMPARE THE STRUCTURE IN THE SHAFT', accent: '#89bbff' },
  records: { sign: '◈ SHAFT RECORDS · LIVE FEED', footer: 'EVERY FALL LEAVES A RECORD', accent: '#8fe5ec' },
  'replay-archive': { sign: '◈ REPLAY ARCHIVE · OBSERVATION DECK', footer: 'WATCH THE RALLY FROM OUTSIDE THE GLASS', accent: '#a9d4ff' },
}

/** A self-contained, render-only exhibition using the same world and renderer as a match. */
export function createFallingVenue(kind: VenueKind, initialLook: PainterSelection = {}) {
  const root = document.createElement('div')
  const venue = VENUES[kind]
  root.className = `pf-venue pf-venue-${kind}`
  root.setAttribute('aria-label', `${kind.replaceAll('-', ' ')}: live PongFall arena falling through the shaft`)
  root.style.cssText = `position:relative;width:100%;height:100%;min-height:180px;overflow:hidden;background:#070e19;border:1px solid ${venue.accent};border-radius:14px;box-shadow:inset 0 0 40px #000a,0 14px 40px #0008`
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'display:block;width:100%;height:100%'
  const filterFor = (selection: PainterSelection) => {
    let lens = ''
    try { if (isLensUnlocked()) { const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'); lens = lensFilter(settings.lens ?? 'none', settings.hue ?? 0) } } catch { /* keep the game colors without saved settings */ }
    return [lens, painterColors(selection).themeFilter].filter(Boolean).join(' ')
  }
  canvas.style.filter = filterFor(initialLook)
  const sign = document.createElement('div'); sign.setAttribute('aria-hidden', 'true')
  sign.textContent = venue.sign
  sign.style.cssText = `position:absolute;left:50%;top:10px;transform:translateX(-50%);max-width:90%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:6px 10px;border:1px solid ${venue.accent};border-radius:5px;background:#091525e8;color:${venue.accent};font:800 10px ui-monospace,monospace;letter-spacing:.11em;box-shadow:0 0 15px ${venue.accent}55;pointer-events:none`
  const rail = document.createElement('div'); rail.setAttribute('aria-hidden', 'true')
  rail.style.cssText = `position:absolute;inset:0;border-left:6px double ${venue.accent};border-right:6px double ${venue.accent};box-shadow:inset 18px 0 24px #0008,inset -18px 0 24px #0008;pointer-events:none`
  const floor = document.createElement('div'); floor.setAttribute('aria-hidden', 'true')
  floor.style.cssText = 'position:absolute;left:0;right:0;bottom:0;padding:6px 12px;background:linear-gradient(transparent,#050a13dc);color:#a6cadc;font:700 9px ui-monospace,monospace;letter-spacing:.15em;text-align:center;pointer-events:none'
  floor.textContent = venue.footer
  root.append(canvas, rail, sign, floor)
  if (kind === 'paint-counter' || kind === 'lok-market') {
    for (const side of ['left', 'right'] as const) {
      const shelf = document.createElement('div'); shelf.setAttribute('aria-hidden', 'true')
      shelf.style.cssText = `position:absolute;${side}:9px;top:19%;bottom:15%;width:24px;display:flex;flex-direction:column;justify-content:space-around;align-items:center;border:1px solid ${venue.accent}66;border-radius:5px;background:#0713218f;box-shadow:0 0 20px ${venue.accent}22;pointer-events:none`
      for (const tint of ['#8cece6', '#ffe08a', '#d3a6ff']) {
        const swatch = document.createElement('i'); swatch.style.cssText = `display:block;width:12px;height:20px;border:1px solid #ffffff99;border-radius:3px;background:${tint};box-shadow:0 0 10px ${tint}99`
        shelf.append(swatch)
      }
      root.append(shelf)
    }
  }
  const ctx = canvas.getContext('2d')
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  let fx = createFx(reduced); fx.fogMode = 'low'
  let look = initialLook
  let view: VenueView = 'personal'
  let world: World = createWorld({ mode: 'sandbox', difficulty: 'sharp', arenas: 3, powerUnlocked: true }, 616393)
  const camera = newCamera(); camera.lock = 'arena'
  let width = 1, height = 1, dpr = 1, raf = 0, last = performance.now(), acc = 0, dead = false
  const draw = (now: number) => {
    if (!ctx || dead) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderWorld(ctx, world, camera, width, height, { me: 0, paused: false, result: null, best: null, user: null, trail: [], now, muted: true, perks: [], hints: false, gauge: false, visible: false }, fx, { paint: painterColors(look) })
  }
  const resize = () => {
    const bounds = root.getBoundingClientRect()
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height)
    dpr = Math.min(devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    stepCamera(world, camera, width, height, 1)
    draw(performance.now())
  }
  const observer = new ResizeObserver(resize); observer.observe(root)
  if (reduced) {
    for (let i = 0; i < 90; i++) { world.events.length = 0; stepIntroAttractWorld(world, true); world.log.length = 0 }
  }
  const frame = (now: number) => {
    raf = 0
    if (dead || !root.isConnected) return
    if (!document.hidden && !reduced) {
      acc = Math.min(acc + Math.min(.06, Math.max(0, (now - last) / 1000)), FIXED_DT * 5)
      while (acc >= FIXED_DT) {
        world.events.length = 0
        stepIntroAttractWorld(world, true)
        world.log.length = 0 // the exhibition has no replay or progression to keep
        feedFx(fx, world, world.events.splice(0), FIXED_DT, now)
        stepCamera(world, camera, width, height, FIXED_DT)
        acc -= FIXED_DT
      }
      draw(now)
    }
    last = now
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return {
    element: root,
    fillScreen() { root.style.position = 'fixed'; root.style.inset = '0'; root.style.width = '100%'; root.style.height = '100%'; root.style.minHeight = '0'; root.style.border = '0'; root.style.borderRadius = '0'; root.style.pointerEvents = 'none' },
    setLook(next: PainterSelection) { look = next; canvas.style.filter = filterFor(look); if (reduced) draw(performance.now()) },
    setView(next: VenueView) { view = next; camera.lock = view === 'personal' ? 'arena' : 'auto'; stepCamera(world, camera, width, height, reduced ? 1 : FIXED_DT); if (reduced) draw(performance.now()) },
    destroy() { dead = true; cancelAnimationFrame(raf); observer.disconnect(); fx.fog?.destroy(); root.remove() },
  }
}
