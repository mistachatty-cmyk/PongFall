// The other arenas on the carousel. Each is drawn at the player's arena scale and shrunk, so panes, cracks
// and shards look the same as yours.
import { World } from '../sim/world'
import { SAT_W, SAT_H, SAT_PAD, SAT_BALL, SAT_TARGET, Satellite } from '../sim/arenas'
import { drawPaneOf, drawBrokenFrame } from './glass'

const K = SAT_W / 640            // drawing scale
const BW = 640, BH = 400         // the size we draw at before scaling

function drawOne(ctx: CanvasRenderingContext2D, w: World, s: Satellite) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.ang)
  ctx.scale(K, K)
  const over = s.resetTimer > 0
  ctx.globalAlpha = over ? 0.6 : 0.96
  ctx.fillStyle = 'rgba(20,28,42,0.94)'; ctx.fillRect(-BW / 2, -BH / 2, BW, BH)
  ctx.fillStyle = '#6b7a93'
  ctx.fillRect(-BW / 2, -BH / 2 - 16, BW, 16); ctx.fillRect(-BW / 2, BH / 2, BW, 16)
  ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.setLineDash([14, 14]); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, -BH / 2); ctx.lineTo(0, BH / 2); ctx.stroke(); ctx.setLineDash([])
  for (const i of [0, 1] as const) {
    const sg = i === 0 ? -1 : 1
    const side = s.sides[i]
    const gx = sg * BW / 2
    if (!side.broken) drawPaneOf(ctx, w.seed + s.id * 977 + 13, { hitYs: side.hitYs.map(y => y / K), hitTick: side.hitTick }, w.tick, i, gx, BH)
    else {
      drawBrokenFrame(ctx, null, i, gx, BH)
      ctx.strokeStyle = '#4aa8ff'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.moveTo(gx + sg * 14, -BH / 2); ctx.lineTo(gx + sg * 14, BH / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = over ? 0.6 : 0.96
    }
    ctx.fillStyle = '#e9f2ff'
    ctx.fillRect(sg * (BW / 2 - 14 / K) - 7, side.paddleY / K - SAT_PAD / K / 2, 14, SAT_PAD / K)
  }
  if (s.ball) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.ball.x / K, s.ball.y / K, SAT_BALL / K, 0, 7); ctx.fill() }
  ctx.restore()
  // scoreboard stays upright above the arena
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = '700 26px system-ui'
  ctx.fillStyle = 'rgba(200,225,255,0.85)'
  const y = s.y - Math.hypot(SAT_W, SAT_H) * 0.5 - 18
  ctx.fillText(over ? 'NEW GLASS' : `${s.sides[0].score}  :  ${s.sides[1].score}`, s.x, y)
  ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(140,165,200,0.8)'
  ctx.fillText(`ARENA ${String.fromCharCode(66 + s.id)}${over ? '' : ` · first to ${SAT_TARGET}`}`, s.x, y + 16)
  ctx.restore()
}

export function drawSatellites(ctx: CanvasRenderingContext2D, w: World) {
  for (const s of w.sats) drawOne(ctx, w, s)
  // balls loose in the shaft from other arenas
  ctx.fillStyle = 'rgba(255,200,170,0.95)'
  for (const st of w.satStrays) { ctx.beginPath(); ctx.arc(st.x, st.y, 9, 0, 7); ctx.fill() }
}
