import { World, arenaDims, eyeY, eyesOpen, padLen, glassLimit, thrustCharge, FIELD_HALF, EYE_R } from '../sim/world'
import type { GameResult } from '../sim/result'
import { drawBackground, drawStreaks } from './background'
import { drawFog } from './fog'
import { drawEye, drawBackgroundEyes, drawSplats, Fx } from './eyes'

export interface TrailPoint { x: number; y: number; at: number }
export interface HudExtra {
  paused: boolean; result: GameResult | null; best: number | null; user: string | null
  trail: TrailPoint[]; now: number; muted: boolean
}

export interface Camera { zoom: number; lock: 'auto' | 'arena' | 'field' }
export const newCamera = (): Camera => ({ zoom: 1, lock: 'auto' })

const BLUE = '#4aa8ff'

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

export function renderWorld(ctx: CanvasRenderingContext2D, w: World, cam: Camera, cw: number, ch: number, hud: HudExtra, fx: Fx) {
  const { W, H } = arenaDims(w)
  const GLASS = (i: 0 | 1) => glassLimit(w, i)
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, cw, ch)
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(cam.zoom, cam.zoom)
  const vh = ch / cam.zoom, vw = cw / cam.zoom
  // the camera sways a little with the arena body
  ctx.translate(-w.arena.x * 0.25, -w.arena.y * 0.25)
  ctx.rotate(-w.arena.ang * 0.25)

  drawBackground(ctx, w, vw, vh)
  drawFog(ctx, w, fx.windX, vw, vh, 'back')

  // walls
  for (const wall of [-1, 1] as const) {
    ctx.fillStyle = '#10151f'
    ctx.fillRect(wall === -1 ? -FIELD_HALF - 400 : FIELD_HALF - 30, -vh, 430, vh * 2)
    ctx.fillStyle = '#2a3446'
    ctx.fillRect(wall === -1 ? -FIELD_HALF - 4 : FIELD_HALF - 30, -vh, 34, vh * 2)
  }
  drawBackgroundEyes(ctx, w, fx, vh)
  for (const e of w.eyes) {
    const y = eyeY(w, e)
    if (Math.abs(y) > vh / 2 + 150) continue
    drawEye(ctx, w, e.wall, e.wall * (FIELD_HALF - 14), y, EYE_R, e.lid, e.flinch, 1)
  }
  drawStreaks(ctx, w, vh)

  // tears: big, glowing, easy to see and slice
  for (const t of w.tears) {
    const fade = t.age > 9 ? 0.5 + 0.5 * Math.sin(t.age * 14) : 1
    ctx.globalAlpha = 0.35 * fade
    ctx.fillStyle = '#7cc0ff'
    ctx.beginPath(); ctx.arc(t.x, t.y, 44 + 5 * Math.sin(t.age * 5), 0, 7); ctx.fill()
    ctx.globalAlpha = fade
    ctx.fillStyle = BLUE
    ctx.beginPath(); ctx.moveTo(t.x, t.y - 34); ctx.quadraticCurveTo(t.x + 24, t.y + 6, t.x, t.y + 24)
    ctx.quadraticCurveTo(t.x - 24, t.y + 6, t.x, t.y - 34); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath(); ctx.ellipse(t.x - 8, t.y - 2, 4, 9, -0.4, 0, 7); ctx.fill()
    ctx.globalAlpha = 1
  }
  drawSplats(ctx, fx)

  // arena group sways and tilts with its body
  ctx.save()
  ctx.translate(w.arena.x, w.arena.y)
  ctx.rotate(w.arena.ang)
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
        const cy = -H / 2 + (c + 1) * H / (GLASS(i) + 1)
        ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx - s * 22, cy - 26 + c * 14); ctx.lineTo(gx + s * 14, cy + 30); ctx.stroke()
      }
    } else {
      ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(w.realT * 6)
      ctx.beginPath(); ctx.moveTo(gx + s * 14, -H / 2); ctx.lineTo(gx + s * 14, H / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
    }
    ctx.fillStyle = side.broken ? '#ff7a7a' : '#bfe6ff'
    ctx.font = '700 22px system-ui'; ctx.textAlign = 'center'
    ctx.fillText(side.broken ? 'OPEN' : `GLASS ${GLASS(i) - side.glassHits}`, gx + s * 56, -H / 2 + 10)
    const len = padLen(w, i)
    const px = s * (W / 2 - 30) - s * side.px
    ctx.fillStyle = side.pvx > 200 ? '#ffffff' : '#e9f2ff'
    ctx.fillRect(px - 7, side.paddleY - len / 2, 14, len)
    if (side.px > 4) { const rest = s * (W / 2 - 30); ctx.fillStyle = 'rgba(180,220,255,0.22)'; ctx.fillRect(Math.min(rest, px) - 7, side.paddleY - len / 2, Math.abs(rest - px) + 14, len) }
  }
  ctx.fillStyle = 'rgba(200,230,255,0.85)'
  for (const sh of w.shards) {
    ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.globalAlpha = sh.life
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.restore()
  }
  ctx.fillStyle = '#fff'
  for (const b of w.balls) { ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, 7); ctx.fill() }
  ctx.restore()

  drawFog(ctx, w, fx.windX, vw, vh, 'front')

  // slice trail (world space)
  if (hud.trail.length > 1) {
    ctx.lineCap = 'round'
    for (let i = 1; i < hud.trail.length; i++) {
      const a = hud.trail[i - 1]!, b = hud.trail[i]!
      const age = (hud.now - b.at) / 320
      if (age >= 1) continue
      ctx.strokeStyle = `rgba(200,235,255,${1 - age})`
      ctx.lineWidth = 10 * (1 - age) + 2
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }
  }
  ctx.restore()

  // HUD
  ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'
  ctx.font = '700 44px system-ui'
  ctx.fillText(`${w.sides[0].score}  :  ${w.sides[1].score}`, cw / 2, 56)
  ctx.font = '14px system-ui'; ctx.fillStyle = '#7f8da3'
  ctx.fillText(`${w.mode.label} · ${w.difficulty.label}${w.opts.target ? ` · first to ${w.opts.target}` : ''}${w.opts.timeLimit ? ` · ${Math.max(0, Math.ceil(w.opts.timeLimit - w.t))}s` : ''}${w.modifiers.length ? ` · ${w.modifiers.join(', ')}` : ''}  ·  depth ${(w.scroll / 10) | 0} m`, cw / 2, 78)
  ctx.textAlign = 'left'
  ctx.fillStyle = BLUE
  ctx.fillText(`tears ${w.tearsHeld}/${w.tune.tearsForPower}${eyesOpen(w) ? '  · eyes open' : ''}`, 16, 26)
  // thrust meter
  const ch0 = 1 - thrustCharge(w, 0)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(cw / 2 - 70, 90, 140, 6)
  ctx.fillStyle = ch0 >= 1 ? '#9cd0ff' : '#4a6a8f'; ctx.fillRect(cw / 2 - 70, 90, 140 * ch0, 6)
  ctx.fillStyle = '#7f8da3'
  ctx.fillText('W/S or mouse: paddle · Space / double-tap: thrust · drag across tears to slice · Z: zoom · P: pause · M: mute · R: restart', 16, ch - 16)
  ctx.textAlign = 'right'
  if (hud.best !== null) ctx.fillText(`best ${hud.best}${hud.user ? ' · ' + hud.user : ''}`, cw - 16, 26)
  if (hud.muted) ctx.fillText('muted', cw - 16, 44)
  ctx.textAlign = 'left'

  if (hud.paused && w.status === 'play') {
    ctx.fillStyle = 'rgba(5,8,12,0.6)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'; ctx.font = '700 44px system-ui'
    ctx.fillText('Paused', cw / 2, ch / 2); ctx.font = '16px system-ui'; ctx.fillStyle = '#7f8da3'
    ctx.fillText('P or Esc to resume', cw / 2, ch / 2 + 30)
  }
  if (w.status === 'over') {
    ctx.fillStyle = 'rgba(5,8,12,0.7)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'; ctx.font = '700 56px system-ui'
    ctx.fillText(w.winner === -1 ? 'Draw' : w.winner === 0 ? 'You win!' : 'You fell.', cw / 2, ch / 2 - 30)
    ctx.font = '22px system-ui'
    if (hud.result?.ranked) ctx.fillText(`Score ${hud.result.score}${hud.best !== null && hud.result.score >= hud.best ? '  ·  new best!' : ''}`, cw / 2, ch / 2 + 8)
    ctx.font = '18px system-ui'; ctx.fillStyle = '#7f8da3'
    ctx.fillText(`${w.endReason === 'grounded' ? 'Arena wedged against both walls' : w.endReason === 'time' ? 'Time up' : 'Score reached'} · press R to play again`, cw / 2, ch / 2 + 40)
  }
}
