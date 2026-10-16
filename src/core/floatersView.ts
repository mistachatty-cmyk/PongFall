// The menu's floating objects: a jukebox, a stat board and a gear that fall slowly down the screen. Grab one to move it, flick it to toss
// and spin it, click it to open its page. Render-only DOM, driven by the pure physics in floaters.ts.
import { isClick, releaseVelocity, spawnBody, stepBody, tossSpin, type Body, type Sample } from './floaters'

export interface FloaterItem { id: string; label: string; svg: string; open(): void }
export interface FloatersHandle { destroy(): void }

const SVG = {
  jukebox: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 58V26a20 20 0 0 1 40 0v32z" fill="#1d1230" stroke="#c79bff" stroke-width="3"/><path d="M20 58V28a12 12 0 0 1 24 0v30z" fill="#0b0814" stroke="#ff7ad9" stroke-width="2"/><g fill="#8cece6"><rect class="fl-eq" style="animation-delay:0s" x="24" y="38" width="4" height="14" rx="1"/><rect class="fl-eq" style="animation-delay:.2s" x="30" y="38" width="4" height="14" rx="1"/><rect class="fl-eq" style="animation-delay:.4s" x="36" y="38" width="4" height="14" rx="1"/></g><text x="32" y="30" text-anchor="middle" font-size="14" fill="#ffe08a">♪</text></svg>',
  stats: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="5" fill="#0d1c2c" stroke="#4aa8ff" stroke-width="3"/><g fill="#8affc1"><rect x="14" y="34" width="8" height="14" rx="1"/><rect x="28" y="24" width="8" height="24" rx="1"/><rect x="42" y="16" width="8" height="32" rx="1"/></g><path d="M12 22l14-4 12 6 14-10" fill="none" stroke="#ffe08a" stroke-width="2.5" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="#1a2438" stroke="#9fb4d6" stroke-width="3" stroke-linejoin="round"><path d="M27 6h10l2 7 6 3 7-3 5 8-6 5v6l6 5-5 8-7-3-6 3-2 7H27l-2-7-6-3-7 3-5-8 6-5v-6l-6-5 5-8 7 3 6-3z"/><circle cx="32" cy="32" r="9" fill="#0a0f1a"/></g></svg>',
}
export const FLOATER_SVG = SVG

const css = `
.pf-floaters{position:fixed;inset:0;z-index:3;pointer-events:none;overflow:hidden}
.pf-floater{position:absolute;left:0;top:0;width:64px;height:64px;pointer-events:auto;cursor:grab;touch-action:none;user-select:none;filter:drop-shadow(0 6px 10px #000a);will-change:transform;background:none;border:0;padding:0}
.pf-floater:active{cursor:grabbing}.pf-floater:focus-visible{outline:2px solid #65f4f2;outline-offset:4px;border-radius:12px}
.pf-menu .pf-floaters .pf-floater{background:none;border:0;box-shadow:none;padding:0;border-radius:0}
.pf-floater svg{width:100%;height:100%;display:block;pointer-events:none}
.pf-floater .fl-eq{transform-box:fill-box;transform-origin:bottom;animation:fl-eq 1.1s ease-in-out infinite}
@keyframes fl-eq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
.pf-floaters.still .fl-eq{animation:none}
@media(max-width:560px){.pf-floater{width:52px;height:52px}}
`

export function mountFloaters(parent: HTMLElement, items: readonly FloaterItem[], reduce = false): FloatersHandle {
  const style = document.createElement('style'); style.textContent = css
  const layer = document.createElement('div'); layer.className = 'pf-floaters' + (reduce ? ' still' : ''); layer.setAttribute('role', 'group'); layer.setAttribute('aria-label', 'Floating menu objects')
  parent.append(style, layer)
  const bounds = () => ({ w: window.innerWidth, h: window.innerHeight })
  const size = () => window.innerWidth <= 560 ? 52 : 64
  const rows = items.map((item, i) => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'pf-floater'; el.setAttribute('aria-label', item.label); el.title = `${item.label} (drag to toss)`; el.innerHTML = item.svg
    layer.append(el)
    return { item, el, body: spawnBody(i, items.length, bounds(), size()) as Body, grab: null as null | { id: number; dx: number; dy: number; samples: Sample[]; moved: number; at: number; sx: number; sy: number } }
  })
  const place = (r: typeof rows[number]) => { r.el.style.transform = `translate(${r.body.x - r.body.w / 2}px,${r.body.y - r.body.h / 2}px) rotate(${r.body.ang}rad)` }
  for (const r of rows) {
    place(r)
    r.el.onpointerdown = e => {
      e.preventDefault(); r.el.setPointerCapture(e.pointerId)
      r.grab = { id: e.pointerId, dx: e.clientX - r.body.x, dy: e.clientY - r.body.y, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }], moved: 0, at: performance.now(), sx: e.clientX, sy: e.clientY }
      r.body = { ...r.body, vx: 0, vy: 0, av: 0 }
    }
    r.el.onpointermove = e => {
      const g = r.grab; if (!g || g.id !== e.pointerId) return
      g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.sx, e.clientY - g.sy))
      const b = bounds()
      r.body = { ...r.body, x: Math.min(b.w - r.body.w / 2, Math.max(r.body.w / 2, e.clientX - g.dx)), y: Math.min(b.h, Math.max(r.body.h / 2, e.clientY - g.dy)), vx: 0, vy: 0 }
      g.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (g.samples.length > 12) g.samples.shift()
      place(r)
    }
    const end = (e: PointerEvent) => {
      const g = r.grab; if (!g || g.id !== e.pointerId) return
      r.grab = null
      if (isClick(g.moved, performance.now() - g.at)) { r.item.open(); return }
      const v = releaseVelocity(g.samples)
      r.body = { ...r.body, vx: v.vx, vy: v.vy, av: tossSpin(v.vx, g.dy) }
    }
    r.el.onpointerup = end; r.el.onpointercancel = end
    r.el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.item.open() } }
  }
  let raf = 0, last = performance.now()
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    if (document.hidden) return
    const b = bounds()
    for (const r of rows) { if (!r.grab) { r.body = stepBody(r.body, dt, b, reduce); place(r) } }
  }
  raf = requestAnimationFrame(frame)
  return { destroy() { cancelAnimationFrame(raf); layer.remove(); style.remove() } }
}
