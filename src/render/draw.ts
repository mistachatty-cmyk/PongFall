import { World, arenaDims, eyeY, eyesOpen, FIELD_HALF, EYE_R, GLASS_MAX_HITS, MAX_SCALE, TEARS_FOR_POWER } from '../sim/world'

export interface Camera { zoom: number; lock: 'auto' | 'arena' | 'field' }
export const newCamera = (): Camera => ({ zoom: 1, lock: 'auto' })

const PANEL = '#161c28', PANEL2 = '#1d2535', BLUE = '#4aa8ff', METAL = '#8d99ab'

function targetZoom(w: World, cam: Camera, cw: number) {
  const { W } = arenaDims(w)
  const arenaFit = cw / (W * 1.35)
  const fieldFit = cw / (FIELD_HALF * 2.1)
  const strayOut = w.balls.some(b => Math.abs(b.x) > W / 2 + 30)
  const want = cam.lock === 'arena' ? 'arena' : cam.lock === 'field' ? 'field' : strayOut ? 'field' : 'arena'
  return want === 'arena' ? Math.min(arenaFit, fieldFit * 3) : fieldFit
}

export function stepCamera(w: World, cam: Camera, cw: number, dt: number) {
  const t = targetZoom(w, cam, cw)
  cam.zoom += (t - cam.zoom) * Math.min(1, dt * 3)
}

export function screenToWorld(cam: Camera, cw: number, ch: number, sx: number, sy: number) {
  return { x: (sx - cw / 2) / cam.zoom, y: (sy - ch / 2) / cam.zoom }
}

function eyeLook(w: World, ex: number, ey: number) {
  let tx = 0, ty = 0
  if (w.crackLook && w.realT < w.crackLook.until) { tx = w.crackLook.x; ty = w.crackLook.y }
  else if (w.balls.length) {
    let best = w.balls[0]!
    for (const b of w.balls) if (Math.hypot(b.x - ex, b.y - ey) < Math.hypot(best.x - ex, best.y - ey)) best = b
    tx = best.x; ty = best.y
  }
  const a = Math.atan2(ty - ey, tx - ex)
  return { a, d: Math.min(1, Math.hypot(tx - ex, ty - ey) / 500) }
}

function drawEye(ctx: CanvasRenderingContext2D, w: World, wall: -1 | 1, x: number, y: number, r: number, lid: number, flinch: number, dim: number) {
  const shock = w.realT < w.shockUntil
  const fx = x - wall * flinch * 14
  ctx.save()
  ctx.translate(fx, y)
  ctx.globalAlpha = dim
  ctx.fillStyle = '#e8e4da'
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.9, 0, 0, 7); ctx.fill()
  const look = eyeLook(w, fx, y)
  const pr = r * (shock ? 0.22 : 0.34)
  ctx.fillStyle = '#2b5f8f'
  const ix = Math.cos(look.a) * look.d * r * 0.5, iy = Math.sin(look.a) * look.d * r * 0.4
  ctx.beginPath(); ctx.arc(ix, iy, r * 0.5, 0, 7); ctx.fill()
  ctx.fillStyle = '#05080c'
  ctx.beginPath(); ctx.arc(ix, iy, pr, 0, 7); ctx.fill()
  // metal lids: slide in from top and bottom as the eye closes
  const cover = 1 - lid * (shock ? 1 : 0.85)
  const lidH = r * 0.95 * cover
  const g = ctx.createLinearGradient(0, -r, 0, r)
  g.addColorStop(0, '#c9d2de'); g.addColorStop(0.5, METAL); g.addColorStop(1, '#5a6475')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.9, 0, 0, 7); ctx.clip()
  ctx.fillRect(-r * 1.3, -r, r * 2.6, lidH)
  ctx.fillRect(-r * 1.3, r - lidH, r * 2.6, lidH)
  ctx.restore()
  ctx.save(); ctx.strokeStyle = '#3a4455'; ctx.lineWidth = 3; ctx.globalAlpha = dim
  ctx.beginPath(); ctx.ellipse(fx, y, r * 1.2, r * 0.9, 0, 0, 7); ctx.stroke(); ctx.restore()
}

export function renderWorld(ctx: CanvasRenderingContext2D, w: World, cam: Camera, cw: number, ch: number) {
  const { W, H, pad } = arenaDims(w)
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, cw, ch)
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(cam.zoom, cam.zoom)
  const vh = ch / cam.zoom, vw = cw / cam.zoom

  // falling background panels, dark gray with blue accents
  const tile = 220
  const off = w.scroll % tile
  for (let gy = -Math.ceil(vh / 2 / tile) - 1; gy <= Math.ceil(vh / 2 / tile) + 1; gy++) {
    for (let gx = -Math.ceil(vw / 2 / tile) - 1; gx <= Math.ceil(vw / 2 / tile); gx++) {
      const x = gx * tile, y = gy * tile - off
      if (Math.abs(x) > FIELD_HALF) continue
      ctx.fillStyle = (gx + gy + Math.floor(w.scroll / tile)) % 3 === 0 ? PANEL2 : PANEL
      ctx.fillRect(x + 4, y + 4, tile - 8, tile - 8)
    }
  }
  // walls + eyes (background eye behind, foreground eye on the wall)
  for (const wall of [-1, 1] as const) {
    ctx.fillStyle = '#10151f'
    ctx.fillRect(wall === -1 ? -FIELD_HALF - 400 : FIELD_HALF - 30, -vh, 430, vh * 2)
    ctx.fillStyle = '#2a3446'
    ctx.fillRect(wall === -1 ? -FIELD_HALF - 4 : FIELD_HALF - 30, -vh, 34, vh * 2)
  }
  for (const e of w.eyes) {
    const y = eyeY(w, e)
    if (Math.abs(y) > vh / 2 + 150) continue
    drawEye(ctx, w, e.wall, e.wall * (FIELD_HALF - 140), y - 6, EYE_R * 0.7, e.lid, e.flinch, 0.45)
    drawEye(ctx, w, e.wall, e.wall * (FIELD_HALF - 14), y, EYE_R, e.lid, e.flinch, 1)
  }

  // tears
  ctx.fillStyle = BLUE
  for (const t of w.tears) {
    ctx.beginPath(); ctx.moveTo(t.x, t.y - 16); ctx.quadraticCurveTo(t.x + 12, t.y + 4, t.x, t.y + 12)
    ctx.quadraticCurveTo(t.x - 12, t.y + 4, t.x, t.y - 16); ctx.fill()
  }

  // arena
  ctx.fillStyle = 'rgba(20,28,42,0.92)'; ctx.fillRect(-W / 2, -H / 2, W, H)
  ctx.fillStyle = '#6b7a93'
  ctx.fillRect(-W / 2, -H / 2 - 16, W, 16); ctx.fillRect(-W / 2, H / 2, W, 16)
  ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.setLineDash([14, 14]); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, -H / 2); ctx.lineTo(0, H / 2); ctx.stroke(); ctx.setLineDash([])

  for (const i of [0, 1] as const) {
    const s = i === 0 ? -1 : 1, side = w.sides[i]
    const gx = s * W / 2
    if (!side.broken) {
      ctx.fillStyle = 'rgba(150,210,255,0.16)'; ctx.fillRect(gx - 5, -H / 2, 10, H)
      ctx.strokeStyle = 'rgba(190,230,255,0.7)'; ctx.lineWidth = 2
      for (let c = 0; c < side.glassHits; c++) {
        const cy = -H / 2 + (c + 1) * H / (GLASS_MAX_HITS + 1)
        ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx - s * 22, cy - 26 + c * 14); ctx.lineTo(gx + s * 14, cy + 30); ctx.stroke()
      }
    } else {
      ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(w.realT * 6)
      ctx.beginPath(); ctx.moveTo(gx + s * 14, -H / 2); ctx.lineTo(gx + s * 14, H / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
    }
    ctx.fillStyle = side.broken ? '#ff7a7a' : '#bfe6ff'
    ctx.font = '700 22px system-ui'; ctx.textAlign = 'center'
    ctx.fillText(side.broken ? 'OPEN' : `GLASS ${GLASS_MAX_HITS - side.glassHits}`, gx + s * 56, -H / 2 + 10)
    // paddle
    ctx.fillStyle = '#e9f2ff'; ctx.fillRect(s * (W / 2 - 30) - 7, side.paddleY - pad / 2, 14, pad)
  }

  ctx.fillStyle = 'rgba(200,230,255,0.85)'
  for (const sh of w.shards) {
    ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.globalAlpha = sh.life
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.restore()
  }
  ctx.fillStyle = '#fff'
  for (const b of w.balls) { ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, 7); ctx.fill() }
  ctx.restore()

  // HUD
  ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'
  ctx.font = '700 44px system-ui'
  ctx.fillText(`${w.sides[0].score}  :  ${w.sides[1].score}`, cw / 2, 56)
  ctx.font = '14px system-ui'; ctx.fillStyle = '#7f8da3'
  ctx.fillText(`First to ${w.opts.target}${w.opts.timeLimit ? ` · ${Math.max(0, Math.ceil(w.opts.timeLimit - w.t))}s` : ''}  ·  depth ${(w.scroll / 10) | 0} m  ·  arena ${(w.scale).toFixed(2)}/${MAX_SCALE}`, cw / 2, 78)
  ctx.textAlign = 'left'
  ctx.fillStyle = BLUE
  ctx.fillText(`tears ${w.tearsHeld}/${TEARS_FOR_POWER}${eyesOpen(w) ? '  · eyes open' : ''}`, 16, 26)
  ctx.fillStyle = '#7f8da3'
  ctx.fillText(`W/S or mouse: paddle · Z: zoom (${cam.lock}) · click tears · R: restart`, 16, ch - 16)

  if (w.status === 'over') {
    ctx.fillStyle = 'rgba(5,8,12,0.7)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'; ctx.font = '700 56px system-ui'
    const msg = w.winner === -1 ? 'Draw' : w.winner === 0 ? 'You win!' : 'You fell.'
    ctx.fillText(msg, cw / 2, ch / 2 - 10)
    ctx.font = '18px system-ui'; ctx.fillStyle = '#7f8da3'
    ctx.fillText(`${w.endReason === 'grounded' ? 'Arena wedged against both walls' : w.endReason === 'time' ? 'Time up' : 'Score reached'} · press R to play again`, cw / 2, ch / 2 + 26)
  }
}
