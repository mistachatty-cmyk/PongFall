// Small pictures for LokPack cards and the collection: one drawing per kind of item, reusing the real renderers (arena frames, ball shapes, trails,
// girders, paddles, theme backdrops, LilEye hats) so a card shows exactly what you will wear. Render-only.
import type { PackItem } from './packItems'
import { RARITY_META } from './packItems'
import { drawArenaFrame, parseFrame } from '../render/arenaFrame'
import { drawBallShape, drawGirderStyle, drawPaddleBody, drawTrail, girderStyle, paddleStyle, ballShape, trailStyle } from '../render/shapes'
import { drawBackdrop, backdropId } from '../render/backdrops'
import { drawSideBack } from '../render/sideLayers'
import { defaultLook } from './arenaSides'
import { drawCorners, drawLights, drawPopPreview } from '../render/effects'
import { drawAmbient } from '../world/ambient'
import { paletteFor } from '../world/palette'
import { themeById } from './uiThemes'
import { drawLilEyeAura, drawLilEyeGlasses, drawLilEyeHat, drawLilEyeScarf, drawLilEyeWings } from './lilEyeArt'
import { drawCardBack, drawCardFace, drawPackWrap } from './packSleeveArt'
import { SLEEVE_DEFAULTS } from './packItems'

const swatch = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
  const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, '#0a1020')
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill()
}

export function drawItemArt(c: CanvasRenderingContext2D, item: PackItem, cx: number, cy: number, size: number, t: number, reduce: boolean): void {
  c.save(); c.translate(cx, cy)
  const half = size / 2
  if (item.kind === 'theme') {
    const th = themeById(item.id), pal = paletteFor(th.look)
    c.save(); c.beginPath(); c.roundRect(-half, -half * 0.8, size, size * 0.8, 6); c.clip()
    c.fillStyle = th.tokens.bg || '#0b0e14'; c.fillRect(-half, -half, size, size)
    c.translate(-half, -half * 0.8); drawAmbient(c, pal.anim, size, size * 0.8, t, pal, reduce)
    c.fillStyle = pal.plaque.top; c.strokeStyle = pal.plaque.edge; c.lineWidth = 1.5; c.beginPath(); c.roundRect(size * 0.2, size * 0.28, size * 0.6, size * 0.22, 4); c.fill(); c.stroke()
    c.fillStyle = pal.plaque.text; c.fillRect(size * 0.3, size * 0.37, size * 0.4, 3)
    c.restore()
  } else if (item.kind === 'lileye') {
    const rx = size * 0.4, ry = size * 0.3, slot = item.lileye!.slot, v = item.lileye!.value
    if (slot === 'aura') drawLilEyeAura(c, v, rx, ry, t, reduce)
    if (slot === 'wings') drawLilEyeWings(c, v, rx, ry, t, reduce)
    c.fillStyle = '#e9e4d6'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill(); swatch(c, 0, 0, ry * 0.62, '#68b6e7'); c.fillStyle = '#04070c'; c.beginPath(); c.arc(0, 0, ry * 0.28, 0, 7); c.fill()
    if (slot === 'hat') drawLilEyeHat(c, v, rx, ry, t, reduce)
    if (slot === 'scarf') drawLilEyeScarf(c, v, rx, ry, t, reduce)
    if (slot === 'glasses') drawLilEyeGlasses(c, v, rx, ry)
  } else if (item.kind === 'sleeve' && item.sleeve) {
    const sp = item.sleeve
    if (sp.slot === 'packSkin') drawPackWrap(c, -size * 0.3, -size * 0.43, size * 0.6, size * 0.86, sp, 'Win Pack', t, reduce)
    else if (sp.slot === 'cardBack') drawCardBack(c, -size * 0.3, -size * 0.43, size * 0.6, size * 0.86, sp, t, reduce)
    else drawCardFace(c, -size * 0.3, -size * 0.43, size * 0.6, size * 0.86, sp, { name: 'Sample', type: 'Card', rarityName: 'Preview', rarityColor: '#9fb4d0', art: (g, x, y, s) => swatch(g, x, y, s * 0.3, sp.glow), lines: ['A preview of this frame.', 'Your cards will wear it.'], cost: '3', number: 'No. 042' }, t, reduce)
  } else if (item.kind === 'sidebg' && item.sidebg) {
    c.save(); c.beginPath(); c.roundRect(-half, -half * 0.8, size, size * 0.8, 6); c.clip(); c.translate(0, 0); c.scale(size / 400, size / 400)
    c.fillStyle = '#0b1424'; c.fillRect(-200, -160, 400, 320)
    drawSideBack(c, { ...defaultLook(), hue: item.sidebg.hue, tint: 0.3, pattern: item.sidebg.pattern as never }, 0, 400, 320, t, reduce)
    drawSideBack(c, { ...defaultLook(), hue: item.sidebg.hue, tint: 0.3, pattern: item.sidebg.pattern as never }, 1, 400, 320, t, reduce)
    c.restore()
  } else if (item.painter) {
    const { slot, value } = item.painter, tint = RARITY_META[item.rarity].color
    if (slot === 'theme.backdrop') { const id = backdropId(value); if (id) drawBackdrop(c, id, -half, -half * 0.8, size, size * 0.8, t, t * 60, reduce); return c.restore() }
    if (slot === 'ball.impactStyle' || slot === 'score.burst') { c.save(); c.fillStyle = '#0b1424'; c.fillRect(-half, -half * 0.8, size, size * 0.8); c.scale(size / 160, size / 160); drawPopPreview(c, slot === 'score.burst' ? 'score' : 'hit', value, '#ffbf70'); c.restore(); return c.restore() }
    if (slot === 'arena.corners') { c.save(); c.scale(size / 200, size / 200); c.fillStyle = '#0b1424'; c.fillRect(-100, -80, 200, 160); c.strokeStyle = '#4a5a78'; c.lineWidth = 3; c.strokeRect(-60, -40, 120, 80); drawCorners(c, value, 120, 80, t, reduce); c.restore(); return c.restore() }
    if (slot === 'arena.lights') { c.save(); c.scale(size / 200, size / 200); c.fillStyle = '#0b1424'; c.fillRect(-100, -80, 200, 160); drawLights(c, value, 180, 120, t, reduce); c.restore(); return c.restore() }
    if (slot === 'arena.frame') { const f = parseFrame(value); if (f) { const k = size / 270; c.scale(k, k); drawArenaFrame(c, 220, 130, f, t, reduce); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(-110, -65, 220, 130) } }
    else if (slot === 'ball.shape') { c.fillStyle = '#eaf3ff'; drawBallShape(c, ballShape(value), 0, 0, size * 0.16, t) }
    else if (slot === 'ball.trailStyle') { c.fillStyle = '#eaf3ff'; drawTrail(c, trailStyle(value), size * 0.28, 0, 1, 0, size * 0.55, '#8de8ff', t); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(size * 0.28, 0, size * 0.07, 0, 7); c.fill() }
    else if (slot === 'arena.girder') { c.fillStyle = '#6b7b95'; c.fillRect(-half, -size * 0.1, size, size * 0.2); drawGirderStyle(c, girderStyle(value), size - 28, -size * 0.1, size * 0.2) }
    else if (slot === 'paddle.style') { c.rotate(0.25); c.fillStyle = '#e9f2ff'; c.save(); c.scale(size / 130, size / 130); drawPaddleBody(c, paddleStyle(value), 100); c.restore() }
    else swatch(c, 0, 0, size * 0.28, value.startsWith('#') ? value : tint)
  }
  c.restore()
}

/** A Customization Token coin and a bonus-pack glyph for the non-item cards. */
export function drawTokenArt(c: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, t: number, reduce: boolean): void {
  c.save(); c.translate(cx, cy); const r = size * 0.3, spin = reduce ? 0 : Math.sin(t * 2.2)
  c.scale(Math.max(0.25, Math.abs(spin)) * 0.6 + 0.4, 1)
  const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff4c4'); g.addColorStop(0.5, color); g.addColorStop(1, '#6e4c14'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill()
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 0.78, 0, 7); c.stroke()
  c.fillStyle = '#4a3208'; c.font = `900 ${r * 0.9}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CT', 0, 1)
  c.restore()
}
export { SLEEVE_DEFAULTS }
