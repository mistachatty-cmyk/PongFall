// Draws the arena side looks (see core/arenaSides.ts). Render-only: reads a SideLook, never the sim's rng or state.
// Called inside the arena transform: x runs -W/2..W/2, y runs -H/2..H/2, the centre line is x = 0.
import { FILTER_TINTS, hslToHex, type SideLook, type SideObject } from '../core/arenaSides'
import { artById, artUrl } from '../core/artRegistry'
import { PROFILE_ART_ID, ownProfileImage } from '../core/profilePicture'

const images = new Map<string, HTMLImageElement | 'loading' | 'failed'>()
function imageFor(id: string): HTMLImageElement | null {
  const hit = images.get(id)
  if (hit instanceof HTMLImageElement) return hit
  if (hit) return null
  const art = artById(id)
  if (!art || typeof Image === 'undefined') { images.set(id, 'failed'); return null }
  images.set(id, 'loading')
  const img = new Image()
  img.onload = () => images.set(id, img)
  img.onerror = () => images.set(id, 'failed')
  img.src = artUrl(art)
  return null
}

interface Zone { x0: number; x1: number; y0: number; y1: number }
export const zoneFor = (side: 0 | 1, W: number, H: number): Zone => side === 0 ? { x0: -W / 2, x1: 0, y0: -H / 2, y1: H / 2 } : { x0: 0, x1: W / 2, y0: -H / 2, y1: H / 2 }

/** Layer 1: tint, pattern, pictures. */
export function drawSideBack(ctx: CanvasRenderingContext2D, look: SideLook, side: 0 | 1, W: number, H: number, t: number, reduce: boolean, mine = false) {
  const z = zoneFor(side, W, H), zw = z.x1 - z.x0
  ctx.save(); ctx.beginPath(); ctx.rect(z.x0, z.y0, zw, H); ctx.clip()
  if (look.tint > 0) {
    const g = ctx.createLinearGradient(z.x0, 0, z.x1, 0)
    const c = hslToHex(look.hue, .7, .5)
    const edge = side === 0 ? 0 : 1
    g.addColorStop(edge, c); g.addColorStop(1 - edge, hslToHex(look.hue, .6, .2))
    ctx.globalAlpha = look.tint * .5; ctx.fillStyle = g; ctx.fillRect(z.x0, z.y0, zw, H); ctx.globalAlpha = 1
  }
  const ink = hslToHex(look.hue, .6, .75)
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.5
  if (look.pattern === 'grid') {
    ctx.globalAlpha = .12; ctx.beginPath()
    for (let x = z.x0 + 40; x < z.x1; x += 40) { ctx.moveTo(x, z.y0); ctx.lineTo(x, z.y1) }
    for (let y = z.y0 + 40; y < z.y1; y += 40) { ctx.moveTo(z.x0, y); ctx.lineTo(z.x1, y) }
    ctx.stroke()
  } else if (look.pattern === 'rays') {
    const ox = side === 0 ? z.x0 : z.x1, oy = z.y0
    ctx.globalAlpha = .1
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (.25 + k * .06) + (reduce ? 0 : Math.sin(t * .3 + k) * .01), dx = Math.cos(a) * (side === 0 ? 1 : -1), dy = Math.sin(a)
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + dx * 1600, oy + dy * 1600); ctx.lineTo(ox + dx * 1600 - dy * 90, oy + dy * 1600 + dx * 90); ctx.closePath(); ctx.fill()
    }
  } else if (look.pattern === 'stars') {
    for (let k = 0; k < 36; k++) {
      const h1 = Math.sin(k * 127.1) * 43758.5, h2 = Math.sin(k * 311.7) * 12543.1
      const x = z.x0 + (h1 - Math.floor(h1)) * zw, y = z.y0 + (h2 - Math.floor(h2)) * H
      ctx.globalAlpha = .18 + (reduce ? .1 : .14 * (1 + Math.sin(t * 1.4 + k)))
      ctx.fillRect(x, y, 2, 2)
    }
  } else if (look.pattern === 'cracks') {
    ctx.globalAlpha = .16; ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      let x = z.x0 + (k + .5) * zw / 6, y = z.y0
      ctx.moveTo(x, y)
      for (let s = 0; s < 8; s++) { x += Math.sin(k * 5.3 + s * 2.1) * 30; y += H / 8; ctx.lineTo(x, y) }
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  for (const im of look.images) {
    const own = mine && im.id === PROFILE_ART_ID ? ownProfileImage() : null
    const img = own ?? imageFor(im.id)
    if (!img) continue
    const size = Math.min(zw, H) * .42 * im.scale, ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1
    const w = ratio >= 1 ? size : size * ratio, h = ratio >= 1 ? size / ratio : size
    ctx.globalAlpha = im.opacity
    if (own) { ctx.save(); ctx.beginPath(); ctx.arc(z.x0 + im.x * zw, z.y0 + im.y * H, Math.min(w, h) / 2, 0, 7); ctx.clip(); ctx.drawImage(img, z.x0 + im.x * zw - w / 2, z.y0 + im.y * H - h / 2, w, h); ctx.restore() }
    else ctx.drawImage(img, z.x0 + im.x * zw - w / 2, z.y0 + im.y * H - h / 2, w, h)
  }
  ctx.restore()
}

function drawObject(ctx: CanvasRenderingContext2D, o: SideObject, cx: number, cy: number, top: number, t: number, reduce: boolean, hue: number) {
  const s = 46 * o.scale, sway = reduce ? 0 : Math.sin(t * 1.3 + cx * .01)
  ctx.save(); ctx.translate(cx, cy)
  switch (o.kind) {
    case 'tree': {
      ctx.fillStyle = '#4a3320'; ctx.fillRect(-s * .07, s * .1, s * .14, s * .5)
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#1f7a45' : '#27935a'; ctx.beginPath(); ctx.moveTo(sway * 2, -s * (.7 - k * .22)); ctx.lineTo(-s * (.26 + k * .12), s * (.12 - k * .12 + .05)); ctx.lineTo(s * (.26 + k * .12), s * (.12 - k * .12 + .05)); ctx.closePath(); ctx.fill() }
      const bulbs = ['#ff5a5a', '#ffd76a', '#6ad0ff', '#fff']
      for (let k = 0; k < 7; k++) { const on = reduce || Math.sin(t * 3 + k * 1.7) > -.3; ctx.globalAlpha = on ? 1 : .35; ctx.fillStyle = bulbs[k % 4]!; ctx.beginPath(); ctx.arc(Math.sin(k * 2.3) * s * .3, -s * .5 + k * s * .1, 2.4, 0, 7); ctx.fill() }
      break
    }
    case 'lantern': {
      ctx.strokeStyle = 'rgba(220,230,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, top - cy); ctx.lineTo(0, -s * .3); ctx.stroke()
      ctx.rotate(sway * .06)
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 1.1); g.addColorStop(0, 'rgba(255,200,110,.5)'); g.addColorStop(1, 'rgba(255,200,110,0)')
      ctx.fillStyle = g; ctx.fillRect(-s * 1.1, -s * 1.1, s * 2.2, s * 2.2)
      ctx.fillStyle = '#ffb347'; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(-s * .17, -s * .3, s * .34, s * .55, 5); ctx.fill(); ctx.stroke()
      break
    }
    case 'sign': {
      ctx.fillStyle = '#5a4128'; ctx.fillRect(-2, 0, 4, s * .75)
      const text = o.text || 'FALLING'
      ctx.font = '700 12px ui-monospace,monospace'
      const w = Math.max(54, ctx.measureText(text).width + 18)
      ctx.rotate(sway * .02)
      ctx.fillStyle = '#c9a36b'; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-w / 2, -s * .18, w, 26, 4); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#2a1b0c'; ctx.textAlign = 'center'; ctx.fillText(text, 0, -s * .18 + 17)
      break
    }
    case 'fireflies': {
      for (let k = 0; k < 9; k++) {
        const a = t * (.3 + k * .05) + k * 2.1, x = reduce ? Math.cos(k * 2.1) * s : Math.cos(a) * s * (.7 + k * .08), y = reduce ? Math.sin(k * 1.3) * s * .6 : Math.sin(a * 1.3) * s * .6
        ctx.globalAlpha = reduce ? .7 : .35 + .55 * Math.max(0, Math.sin(t * 2.2 + k * 1.9))
        ctx.fillStyle = '#e8ff8a'; ctx.beginPath(); ctx.arc(x, y, 2.3, 0, 7); ctx.fill()
        ctx.globalAlpha *= .3; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill()
      }
      break
    }
    case 'bunting': {
      const n = 6, span = s * 2.4
      ctx.strokeStyle = 'rgba(230,240,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-span / 2, 0); ctx.quadraticCurveTo(0, s * .35, span / 2, 0); ctx.stroke()
      for (let k = 0; k < n; k++) {
        const f = (k + .5) / n, x = -span / 2 + span * f, y = s * .35 * 2 * f * (1 - f) * 1.0
        ctx.fillStyle = hslToHex((hue + k * 55) % 360, .75, .6); ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.lineTo(x + sway * 1.5, y + 16); ctx.closePath(); ctx.fill()
      }
      break
    }
    case 'moon': {
      ctx.fillStyle = '#f2f4ff'; ctx.beginPath(); ctx.arc(0, 0, s * .32, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(20,28,42,.95)'; ctx.beginPath(); ctx.arc(s * .13, -s * .06, s * .27, 0, 7); ctx.fill()
      break
    }
  }
  ctx.restore()
}

/** Layer 2 (objects) and the layer 4 filter wash. */
export function drawSideObjects(ctx: CanvasRenderingContext2D, look: SideLook, side: 0 | 1, W: number, H: number, t: number, reduce: boolean) {
  const z = zoneFor(side, W, H), zw = z.x1 - z.x0
  ctx.save(); ctx.beginPath(); ctx.rect(z.x0, z.y0, zw, H); ctx.clip()
  for (const o of look.objects) drawObject(ctx, o, z.x0 + o.x * zw, z.y0 + o.y * H, z.y0, t, reduce, look.hue)
  if (look.filter !== 'none') { ctx.fillStyle = FILTER_TINTS[look.filter]; ctx.fillRect(z.x0, z.y0, zw, H) }
  ctx.restore()
}
