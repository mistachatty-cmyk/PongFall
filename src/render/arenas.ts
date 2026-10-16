// The other arenas on the carousel. Each is drawn at the player's arena scale and shrunk, so panes, cracks
// and shards look the same as yours.
import { World } from '../sim/world'
import { SAT_W, SAT_H, satPad, SAT_BALL, SAT_TARGET, Satellite } from '../sim/arenas'
import { drawPaneOf, drawBrokenFrame } from './glass'
import type { PainterColors } from '../core/pongPainter'
import type { PointLeader } from '../sim/leader'
import { arenaTitle } from './names'
import { drawSideBack, drawSideObjects } from './sideLayers'
import { npcLook } from '../core/arenaSides'

const K = SAT_W / 640            // drawing scale
const BW = 640, BH = 400         // the size we draw at before scaling

function drawOne(ctx: CanvasRenderingContext2D, w: World, s: Satellite, depth: number, paint?: PainterColors, leader?: PointLeader | null, showNames = true, dress = false) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.ang)
  const d = 0.84 + 0.16 * depth                  // arenas in the background are a little smaller and fainter
  ctx.scale(K * d, K * d)
  const over = s.resetTimer > 0
  ctx.globalAlpha = (over ? 0.6 : 0.96) * (0.62 + 0.38 * depth)
  ctx.fillStyle = 'rgba(20,28,42,0.94)'; ctx.fillRect(-BW / 2, -BH / 2, BW, BH)
  if (paint?.arena) { ctx.save(); ctx.strokeStyle = paint.arena; ctx.globalAlpha *= 0.7; ctx.lineWidth = 3; ctx.strokeRect(-BW / 2 + 2, -BH / 2 + 2, BW - 4, BH - 4); ctx.restore() }
  const looks = dress ? [npcLook(s.id * 2), npcLook(s.id * 2 + 1)] as const : null
  if (looks) for (const i of [0, 1] as const) drawSideBack(ctx, looks[i], i, BW, BH, w.realT, false)
  ctx.fillStyle = '#6b7a93'
  ctx.fillRect(-BW / 2, -BH / 2 - 16, BW, 16); ctx.fillRect(-BW / 2, BH / 2, BW, 16)
  ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.setLineDash([14, 14]); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, -BH / 2); ctx.lineTo(0, BH / 2); ctx.stroke(); ctx.setLineDash([])
  if (looks) for (const i of [0, 1] as const) drawSideObjects(ctx, looks[i], i, BW, BH, w.realT, false)
  for (const i of [0, 1] as const) {
    const sg = i === 0 ? -1 : 1
    const side = s.sides[i]
    const gx = sg * BW / 2
    if (!side.broken) drawPaneOf(ctx, w.seed + s.id * 977 + 13, { hitYs: side.hitYs.map(y => y / K), hitTick: side.hitTick }, w.tick, i, gx, BH, false, paint?.glass)
    else {
      drawBrokenFrame(ctx, null, i, gx, BH)
      ctx.strokeStyle = '#4aa8ff'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.moveTo(gx + sg * 14, -BH / 2); ctx.lineTo(gx + sg * 14, BH / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = (over ? 0.6 : 0.96) * (0.62 + 0.38 * depth)
    }
    ctx.fillStyle = paint?.paddle || '#e9f2ff'
    ctx.fillRect(sg * (BW / 2 - 14 / K) - 7, side.paddleY / K - satPad(w, s.id, i) / K / 2, 14, satPad(w, s.id, i) / K)
  }
  if (s.ball) { ctx.fillStyle = paint?.ball || '#fff'; ctx.beginPath(); ctx.arc(s.ball.x / K, s.ball.y / K, SAT_BALL / K, 0, 7); ctx.fill() }
  ctx.restore()
  // scoreboard stays upright above the arena
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = '700 26px system-ui'
  ctx.fillStyle = 'rgba(200,225,255,0.85)'
  const y = s.y - Math.hypot(SAT_W, SAT_H) * 0.5 - 18
  ctx.fillText(over ? 'NEW GLASS' : `${s.sides[0].score}  :  ${s.sides[1].score}`, s.x, y)
  ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(140,165,200,0.8)'
  const crowned = leader?.arena === 'satellite' && leader.id === s.id
  ctx.fillText(arenaTitle(s.id, { crowned: crowned ? leader.side : null, names: showNames, over, target: SAT_TARGET }), s.x, y + 16)
  if (over && s.lastWinner !== null) {
    ctx.font = '700 11px system-ui'; ctx.textAlign = 'center'
    for (const side of [0, 1] as const) {
      const winner = s.lastWinner === side
      ctx.fillStyle = winner ? '#ffe08a' : '#ffb2bc'
      ctx.fillText(winner ? '👑 SAVED!' : '💧 FALLEN!', s.x + (side === 0 ? -48 : 48), y - 2)
    }
  }
  ctx.restore()
}

/**
 * `depth[i]` is 0 (far back) to 1 (front) for satellite i. Back arenas are drawn before your arena and front ones after it, so the arena with the
 * most points (or the biggest box) floats in front of the rest. Render only.
 */
export function drawSatellites(ctx: CanvasRenderingContext2D, w: World, depth: number[], layer: 'back' | 'front', paint?: PainterColors, leader?: PointLeader | null, showNames = true, dress = false) {
  w.sats.forEach((s, i) => { const d = depth[i] ?? 0.5; if ((d >= 0.5) === (layer === 'front')) drawOne(ctx, w, s, d, paint, leader, showNames, dress) })
  if (layer === 'back') {
    // balls loose in the shaft from other arenas
    ctx.fillStyle = 'rgba(255,200,170,0.95)'
    for (const st of w.satStrays) { ctx.beginPath(); ctx.arc(st.x, st.y, 9, 0, 7); ctx.fill() }
  }
}
