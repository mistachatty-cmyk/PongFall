// Canvas art for the Loksleeve: pack wraps, card backs and card frames, drawn from a SleeveSpec (colours + a pattern name), all procedural.
// Patterns marked "live" move unless reduce is set. Nothing here touches the sim.
import type { SleeveSpec } from './packItems'
import { mix, rgba, shade } from '../world/palette'

const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r) }
const text = (c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 800, align: CanvasTextAlign = 'center', maxW = 1e4) => { c.font = `${weight} ${size}px system-ui`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, x, y, maxW) }
const hsl = (h: number, s = 85, l = 62) => `hsl(${((h % 360) + 360) % 360},${s}%,${l}%)`

/** A LokPack. (x, y) is the top-left of a w x h wrap (about 5:7). `kicker` names the pack kind. */
export function drawPackWrap(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spec: SleeveSpec, kicker: string, t: number, reduce: boolean): void {
  const time = reduce ? 0.6 : t, live = spec.pattern.endsWith('live') || spec.pattern === 'gold' || spec.pattern === 'platinum'
  c.save(); c.translate(x, y)
  c.shadowColor = rgba(spec.glow, 0.55); c.shadowBlur = Math.max(6, w * 0.12)
  rr(c, 0, 0, w, h, w * 0.06); c.fillStyle = spec.b; c.fill(); c.shadowBlur = 0
  c.save(); rr(c, 0, 0, w, h, w * 0.06); c.clip()
  const base = c.createLinearGradient(0, 0, w, h); base.addColorStop(0, spec.a); base.addColorStop(1, spec.b); c.fillStyle = base; c.fillRect(0, 0, w, h)
  switch (spec.pattern) {
    case 'kraft': c.strokeStyle = 'rgba(70,45,20,.22)'; c.lineWidth = 1; for (let i = 0; i < 46; i++) { const yy = rnd(i) * h; c.beginPath(); c.moveTo(rnd(i + 9) * w * 0.4, yy); c.lineTo(w * (0.5 + rnd(i + 3) * 0.5), yy + (rnd(i + 5) - 0.5) * 6); c.stroke() } break
    case 'retro': case 'retro-live': {
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, w, h); c.strokeStyle = rgba(spec.a, 0.35); c.lineWidth = 1
      for (let gx = 0; gx <= w; gx += w / 8) { c.beginPath(); c.moveTo(gx, h * 0.45); c.lineTo(w / 2 + (gx - w / 2) * 2.2, h); c.stroke() }
      for (let k = 0; k < 7; k++) { const gy = h * 0.45 + (h * 0.55) * (((k + (live ? time * 0.6 : 0)) / 7) % 1) ** 1.8; c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy); c.stroke() }
      if (spec.pattern === 'retro-live') { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, ((time * 60) % (h + 20)) - 10, w, 10) }
      break }
    case 'foil': { c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(0, h * 0.2); c.lineTo(w * 0.45, 0); c.lineTo(w * 0.7, 0); c.lineTo(0, h * 0.55); c.fill(); break }
    case 'holo': case 'holo-live': {
      const off = spec.pattern === 'holo-live' ? time * 90 : 40
      if (typeof c.createConicGradient === 'function') { const g = c.createConicGradient(off * 0.02, w / 2, h / 2); for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, hsl(i * 36 + off, 80, 66)); c.globalAlpha = 0.85; c.fillStyle = g; c.fillRect(0, 0, w, h); c.globalAlpha = 1 }
      c.fillStyle = 'rgba(20,10,40,.28)'; c.fillRect(0, 0, w, h)
      for (let i = 0; i < 18; i++) { const tw = spec.pattern === 'holo-live' ? 0.5 + 0.5 * Math.sin(time * 3 + i) : 0.7; c.fillStyle = `rgba(255,255,255,${0.7 * tw})`; c.fillRect(rnd(i) * w, rnd(i + 7) * h, 1.6, 1.6) }
      break }
    case 'gold': case 'platinum': {
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; for (let i = 0; i < 40; i++) { c.beginPath(); c.moveTo(rnd(i) * w, rnd(i + 3) * h); c.lineTo(rnd(i + 5) * w, rnd(i + 8) * h); c.stroke() }
      const px = ((time * 0.35) % 1.6 - 0.3) * w, g = c.createLinearGradient(px - w * 0.2, 0, px + w * 0.2, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); break }
    default: break
  }
  // crimped seals top and bottom
  const teeth = Math.max(6, Math.round(w / 7)), tw = w / teeth, seal = h * 0.075
  c.fillStyle = rgba('#000000', 0.28); c.fillRect(0, 0, w, seal); c.fillRect(0, h - seal, w, seal)
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath()
  for (let i = 0; i <= teeth; i++) { c.moveTo(i * tw, 0); c.lineTo(i * tw + tw / 2, seal); c.moveTo(i * tw, h); c.lineTo(i * tw + tw / 2, h - seal) } c.stroke()
  // emblem and kicker
  const dark = spec.pattern === 'retro' || spec.pattern === 'retro-live' || spec.pattern === 'plain'
  text(c, spec.mark ?? 'LOK', w / 2, h * 0.42, w * 0.34, dark ? spec.glow : shade(spec.b, -0.05), 900)
  c.strokeStyle = rgba(spec.glow, 0.7); c.lineWidth = 2; rr(c, w * 0.12, h * 0.26, w * 0.76, h * 0.32, w * 0.06); c.stroke()
  text(c, kicker.toUpperCase(), w / 2, h * 0.7, Math.max(8, w * 0.1), dark ? '#e8f4ff' : mix(spec.b, '#000000', 0.2), 800)
  text(c, 'LOKPACK', w / 2, h * 0.8, Math.max(7, w * 0.075), rgba(dark ? '#ffffff' : '#000000', 0.55), 700)
  c.restore()
  c.strokeStyle = rgba('#ffffff', 0.45); c.lineWidth = 1.5; rr(c, 0.75, 0.75, w - 1.5, h - 1.5, w * 0.06); c.stroke()
  c.restore()
}

/** The face-down side of a card. */
export function drawCardBack(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spec: SleeveSpec, t: number, reduce: boolean): void {
  const time = reduce ? 0.8 : t, pulse = 0.55 + 0.35 * Math.sin(time * 2.4)
  c.save(); c.translate(x, y); rr(c, 0, 0, w, h, w * 0.07); c.save(); c.clip()
  const base = c.createLinearGradient(0, 0, w, h); base.addColorStop(0, spec.b); base.addColorStop(1, mix(spec.b, spec.a, 0.18)); c.fillStyle = base; c.fillRect(0, 0, w, h)
  const cx = w / 2, cy = h / 2
  switch (spec.pattern) {
    case 'neon-grid': c.strokeStyle = rgba(spec.glow, 0.28); c.lineWidth = 1; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(w * i / 8, 0); c.lineTo(w * i / 8, h); c.moveTo(0, h * i / 8); c.lineTo(w, h * i / 8); c.stroke() } c.shadowColor = spec.a; c.shadowBlur = 8; c.strokeStyle = spec.a; c.lineWidth = 2.6; rr(c, w * 0.07, w * 0.07, w * 0.86, h - w * 0.14, w * 0.05); c.stroke(); break
    case 'walnut': c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(0, h * i / 26); for (let k = 1; k <= 6; k++) c.lineTo(w * k / 6, h * i / 26 + Math.sin(k + i) * 3); c.stroke() } break
    case 'iron': c.fillStyle = rgba(spec.glow, 0.85); for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(w * 0.06 + i * w * 0.11, h * 0.94); c.lineTo(w * 0.12 + i * w * 0.11, h * 0.94); c.lineTo(w * 0.17 + i * w * 0.11, h * 0.99); c.lineTo(w * 0.11 + i * w * 0.11, h * 0.99); c.fill() } c.fillStyle = 'rgba(255,255,255,.5)'; for (const [rx, ry] of [[0.07, 0.05], [0.93, 0.05], [0.07, 0.9], [0.93, 0.9]] as const) { c.beginPath(); c.arc(w * rx, h * ry, 2.2, 0, 7); c.fill() } break
    case 'ice': c.fillStyle = rgba('#ffffff', 0.12); for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(rnd(i) * w, 0); c.lineTo(rnd(i + 4) * w, h); c.lineTo(rnd(i + 8) * w, h); c.closePath(); c.fill() } break
    case 'foundry': c.strokeStyle = rgba(spec.a, 0.35 + 0.5 * pulse); c.lineWidth = 2; c.shadowColor = spec.a; c.shadowBlur = 8 * pulse; for (let i = 0; i < 6; i++) { c.beginPath(); let px = rnd(i) * w, py = 0; c.moveTo(px, py); while (py < h) { px += (rnd(py + i) - 0.5) * 22; py += 16; c.lineTo(px, py) } c.stroke() } break
    case 'geode': for (let k = 6; k >= 1; k--) { c.fillStyle = mix(spec.b, spec.a, k / 7); c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2, r = w * (0.07 + k * 0.07) * (0.9 + 0.1 * Math.sin(i * 3 + k)); c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.35) } c.closePath(); c.fill() } break
    case 'rack': c.fillStyle = rgba(spec.a, 0.12); for (let ry = 6; ry < h - 6; ry += 10) for (let rx = 6; rx < w - 6; rx += 8) c.fillRect(rx, ry, 4, 4); for (let i = 0; i < 6; i++) { const on = reduce ? i % 2 === 0 : Math.sin(time * 3 + i * 1.7) > 0; c.fillStyle = on ? spec.a : rgba(spec.a, 0.15); c.beginPath(); c.arc(w * 0.12 + i * w * 0.15, h * 0.08, 2.4, 0, 7); c.fill() } break
    default: c.strokeStyle = rgba(spec.glow, 0.5); c.lineWidth = 2; rr(c, w * 0.08, w * 0.08, w * 0.84, h - w * 0.16, w * 0.04); c.stroke()
  }
  c.restore()
  // hub
  c.shadowBlur = 0; c.shadowColor = 'transparent'
  const hub = c.createRadialGradient(cx - w * 0.04, cy - w * 0.05, 1, cx, cy, w * 0.2); hub.addColorStop(0, '#ffffff'); hub.addColorStop(0.35, spec.glow); hub.addColorStop(1, shade(spec.glow, -0.3)); c.fillStyle = hub; c.beginPath(); c.arc(cx, cy, w * 0.2, 0, 7); c.fill()
  text(c, spec.mark ?? 'PF', cx, cy + 1, w * 0.17, shade(spec.b, -0.05), 900)
  c.strokeStyle = rgba('#ffffff', 0.5); c.lineWidth = 1.4; rr(c, 0.7, 0.7, w - 1.4, h - 1.4, w * 0.07); c.stroke(); c.restore()
}

export interface CardFaceInfo { name: string; type: string; rarityName: string; rarityColor: string; /** draws the picture, centred in the art window */ art(c: CanvasRenderingContext2D, cx: number, cy: number, size: number): void; cost?: string; number?: string; lines?: string[] }
/** A collected card, laid out and bordered by the equipped frame. */
export function drawCardFace(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, spec: SleeveSpec, info: CardFaceInfo, t: number, reduce: boolean): void {
  const time = reduce ? 0.8 : t, pat = spec.pattern, pad = w * 0.06
  c.save(); c.translate(x, y)
  const paper = pat === 'printed' ? '#efe6d0' : '#0d1424'
  c.shadowColor = rgba(info.rarityColor, 0.6); c.shadowBlur = w * 0.1; rr(c, 0, 0, w, h, w * 0.07); c.fillStyle = paper; c.fill(); c.shadowBlur = 0
  c.save(); rr(c, 0, 0, w, h, w * 0.07); c.clip()
  // border by frame
  if (pat === 'gilded') { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fff2b0'); g.addColorStop(0.5, spec.a); g.addColorStop(1, '#8a5a08'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#0d1424'; rr(c, w * 0.045, w * 0.045, w * 0.91, h - w * 0.09, w * 0.05); c.fill() }
  else if (pat === 'tcg') { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, spec.b); g.addColorStop(1, mix(spec.b, '#000000', 0.5)); c.fillStyle = g; c.fillRect(0, 0, w, h) }
  else if (pat === 'printed') { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2a33'; rr(c, w * 0.03, w * 0.03, w * 0.94, h - w * 0.06, w * 0.04); c.fill(); c.fillStyle = '#efe6d0'; rr(c, w * 0.045, w * 0.045, w * 0.91, h - w * 0.09, w * 0.035); c.fill() }
  else { c.fillStyle = '#0d1424'; c.fillRect(0, 0, w, h) }
  // art window
  const ax = pad * 1.4, ay = pat === 'tcg' ? h * 0.13 : h * 0.1, aw = w - pad * 2.8, ah = h * 0.46
  c.save(); rr(c, ax, ay, aw, ah, w * 0.03); c.clip()
  const bg = c.createLinearGradient(0, ay, 0, ay + ah); bg.addColorStop(0, rgba(info.rarityColor, 0.35)); bg.addColorStop(1, rgba(info.rarityColor, 0.08)); c.fillStyle = pat === 'printed' ? '#d9ceb4' : '#101a2c'; c.fillRect(ax, ay, aw, ah); c.fillStyle = bg; c.fillRect(ax, ay, aw, ah)
  if (pat === 'printed') { c.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = ay; yy < ay + ah; yy += 5) for (let xx = ax + ((yy / 5) % 2) * 2.5; xx < ax + aw; xx += 5) { c.beginPath(); c.arc(xx, yy, 0.9, 0, 7); c.fill() } }
  info.art(c, ax + aw / 2, ay + ah / 2, Math.min(aw, ah) * 0.82)
  c.restore()
  c.strokeStyle = pat === 'printed' ? '#2a2a33' : rgba(spec.glow, 0.7); c.lineWidth = 1.4; rr(c, ax, ay, aw, ah, w * 0.03); c.stroke()
  const ink = pat === 'printed' ? '#2a2a33' : '#eaf3ff', sub = pat === 'printed' ? '#5a5a66' : rgba('#eaf3ff', 0.65)
  text(c, info.name, w / 2, ay + ah + h * 0.075, Math.max(9, w * 0.09), ink, 800, 'center', aw)
  text(c, info.type.toUpperCase(), w / 2, ay + ah + h * 0.14, Math.max(7, w * 0.058), info.rarityColor, 800, 'center', aw)
  if (pat === 'tcg') {
    if (info.cost) { c.fillStyle = spec.a; c.beginPath(); c.arc(w - pad * 2.6, h * 0.065, w * 0.065, 0, 7); c.fill(); text(c, info.cost, w - pad * 2.6, h * 0.066, w * 0.07, '#241a3a', 900) }
    c.fillStyle = rgba('#ffffff', 0.08); rr(c, ax, h * 0.76, aw, h * 0.17, w * 0.02); c.fill()
    ;(info.lines ?? []).slice(0, 3).forEach((ln, i) => text(c, ln, w / 2, h * 0.795 + i * h * 0.045, Math.max(7, w * 0.055), sub, 600, 'center', aw))
  } else if (pat === 'printed') {
    text(c, info.number ?? 'No. 001', w - pad * 2, h * 0.93, Math.max(7, w * 0.055), sub, 700, 'right'); text(c, info.rarityName, pad * 2, h * 0.93, Math.max(7, w * 0.055), sub, 700, 'left')
  } else {
    ;(info.lines ?? [info.rarityName]).slice(0, 2).forEach((ln, i) => text(c, ln, w / 2, h * 0.82 + i * h * 0.06, Math.max(7, w * 0.058), sub, 600, 'center', aw))
  }
  c.restore()
  // outer edge
  c.lineWidth = pat === 'edge' || pat === 'pixel' ? 3 : 2; c.strokeStyle = pat === 'printed' ? '#2a2a33' : spec.a
  if (pat === 'edge' || pat === 'pixel') { c.shadowColor = spec.glow; c.shadowBlur = 8 + (reduce ? 0 : 3 * Math.sin(time * 3)) }
  if (pat === 'pixel') c.setLineDash([4, 3])
  rr(c, 1.5, 1.5, w - 3, h - 3, w * 0.07); c.stroke(); c.setLineDash([])
  if (pat === 'pixel') { c.shadowBlur = 0; c.strokeStyle = spec.glow; c.lineWidth = 1.4; rr(c, 5.5, 5.5, w - 11, h - 11, w * 0.05); c.stroke() }
  if (pat === 'tcg' && !reduce) { const sx = ((time * 0.3) % 1.5 - 0.25) * w, g = c.createLinearGradient(sx - 30, 0, sx + 30, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); rr(c, 0, 0, w, h, w * 0.07); c.fillStyle = g; c.fill() }
  c.restore()
}
