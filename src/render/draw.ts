import { World, arenaDims, eyeY, eyesOpen, padLen, glassLimit, thrustCharge, powerState, powerLeft, powerActive, FIELD_HALF, EYE_R } from '../sim/world'
import type { GameResult } from '../sim/result'
import { drawShaftBack, drawWallMarkers, drawShaftFront, drawScreenFx } from './shaft'
import { drawGusts, drawWindGauge } from './wind'
import { drawPane, drawBrokenFrame, drawShard } from './glass'
import { PANE_W } from '../sim/glass'
import { drawFog } from './fog'
import type { FogPass } from './fogGL'
import { drawEye, drawBackgroundEyes, drawFace, drawMateHalo, faceEye, faceMate, drawSplats, Fx } from './eyes'

export interface TrailPoint { x: number; y: number; at: number }
export interface HudExtra {
  paused: boolean; result: GameResult | null; best: number | null; user: string | null
  trail: TrailPoint[]; now: number; muted: boolean; perks: string[]; hints: boolean; gauge: boolean
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
  const base = ctx.getTransform()
  const camOff: [number, number] = [w.arena.x * 0.25 - fx.air.shx, w.arena.y * 0.25 - fx.air.shy]
  // fog is a shader: wind, the fall, arena motion and impacts all push it, and the eyes light it
  const fogPass = (kind: 'mid' | 'near') => {
    const cfg = kind === 'mid' ? { par: 0.6, density: 0.62, scale: 0.8, clear: 0.2, tint: [0.5, 0.64, 0.84] as [number, number, number] }
      : { par: 1.5, density: 0.32, scale: 1.5, clear: 0.88, tint: [0.62, 0.74, 0.92] as [number, number, number] }
    const density = cfg.density * Math.max(0.5, Math.min(1.5, 0.55 + w.fallV / 230))
    if (fx.fogMode === 'off') return
    if (!fx.fog || fx.fogMode === 'low') { drawFog(ctx, w, fx.windX, vw, vh, kind === 'near' ? 'front' : 'back'); return }
    const f = faceEye(w), m = faceMate(w)
    const glows = []
    if (fx.faceMix > 0.05) glows.push({ x: f.x, y: f.y, r: f.r * 2.2, k: (0.1 + 0.9 * fx.faceGlow) * fx.faceMix * (kind === 'near' ? 0.4 : 1) })
    if (fx.faceGlow > 0.05) glows.push({ x: m.x, y: m.y, r: 170, k: 0.7 * fx.faceGlow * fx.faceMix })
    const p: FogPass = { view: [cw, ch], zoom: cam.zoom, cam: camOff, time: w.t, scroll: w.scroll, wind: fx.windX, speed: Math.min(1, w.fallV / 320), par: cfg.par, density, scale: cfg.scale, arena: [w.arena.x + fx.air.x, w.arena.y + fx.air.y], arenaV: [w.arena.vx, w.arena.vy], arenaHalf: [W / 2, H / 2], clear: cfg.clear, tint: cfg.tint, stirs: fx.stirs, glows }
    const img = fx.fog.render(p)
    ctx.save(); ctx.setTransform(base); ctx.drawImage(img, 0, 0, cw, ch); ctx.restore()
  }
  const GLASS = (i: 0 | 1) => glassLimit(w, i)
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, cw, ch)
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(cam.zoom, cam.zoom)
  const vh = ch / cam.zoom, vw = cw / cam.zoom
  // the camera sways a little with the arena body, and buffets with the fall
  ctx.translate(-w.arena.x * 0.25 + fx.air.shx, -w.arena.y * 0.25 + fx.air.shy)
  ctx.rotate(-w.arena.ang * 0.25 - fx.air.roll * 0.5)

  drawShaftBack(ctx, w, vw, vh, w.arena.x + fx.air.x, { afterFar: () => drawFace(ctx, w, fx), afterPipes: () => fogPass('mid') })

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
  drawMateHalo(ctx, w, fx)
  drawWallMarkers(ctx, w, vh)

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
  ctx.translate(w.arena.x + fx.air.x, w.arena.y + fx.air.y)
  ctx.rotate(w.arena.ang + fx.air.roll)
  ctx.fillStyle = 'rgba(20,28,42,0.92)'; ctx.fillRect(-W / 2, -H / 2, W, H)
  ctx.fillStyle = '#6b7a93'
  ctx.fillRect(-W / 2, -H / 2 - 16, W, 16); ctx.fillRect(-W / 2, H / 2, W, 16)
  ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.setLineDash([14, 14]); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, -H / 2); ctx.lineTo(0, H / 2); ctx.stroke(); ctx.setLineDash([])

  for (const i of [0, 1] as const) {
    const s = i === 0 ? -1 : 1, side = w.sides[i]
    const gx = s * W / 2
    if (!side.broken) {
      drawPane(ctx, w, i, gx, H)
    } else {
      drawBrokenFrame(ctx, w, i, gx, H)
      ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(w.realT * 6)
      ctx.beginPath(); ctx.moveTo(gx + s * 14, -H / 2); ctx.lineTo(gx + s * 14, H / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
    }
    ctx.fillStyle = side.broken ? '#ff7a7a' : '#bfe6ff'
    ctx.font = '700 22px system-ui'; ctx.textAlign = 'center'
    ctx.fillText(side.broken ? 'OPEN' : `GLASS ${GLASS(i) - side.glassHits}`, gx + s * 70, -H / 2 + 10)
    const len = padLen(w, i)
    const px = s * (W / 2 - 30) - s * side.px
    const pw = powerActive(w, i)
    if (pw) { ctx.fillStyle = i === 0 ? 'rgba(138,255,193,0.28)' : 'rgba(255,138,138,0.28)'; ctx.fillRect(px - 16, side.paddleY - len / 2 - 8, 32, len + 16); ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(side.powerHits % w.tune.powerHits) + '/' + w.tune.powerHits, px + (i === 0 ? 30 : -30), side.paddleY + 4) }
    ctx.fillStyle = side.pvx > 200 ? '#ffffff' : '#e9f2ff'
    ctx.fillRect(px - 7, side.paddleY - len / 2, 14, len)
    if (side.px > 4) { const rest = s * (W / 2 - 30); ctx.fillStyle = 'rgba(180,220,255,0.22)'; ctx.fillRect(Math.min(rest, px) - 7, side.paddleY - len / 2, Math.abs(rest - px) + 14, len) }
  }
  ctx.fillStyle = 'rgba(200,230,255,0.85)'
  for (const sh of w.shards) {
    ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.globalAlpha = sh.life
    drawShard(ctx, sh.k, sh.size); ctx.restore()
  }
  ctx.fillStyle = '#fff'
  for (const b of w.balls) { ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, 7); ctx.fill() }
  ctx.restore()

  fogPass('near')
  drawGusts(ctx, w, fx.windX, vw, vh, fx.reduce)
  drawShaftFront(ctx, w, fx.windX, vw, vh, W / 2, fx.reduce)

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

  drawScreenFx(ctx, w, cw, ch)
  if (fx.boostFlash > 0) { ctx.fillStyle = `rgba(255,230,160,${0.18 * fx.boostFlash})`; ctx.fillRect(0, 0, cw, ch) }

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
  if (hud.hints) ctx.fillText('W/S or mouse: paddle · Space / double-tap: thrust · E: power paddle · drag across tears to slice · Z: zoom · P: pause · M: mute · R: restart', 16, ch - 16)
  // power paddle state
  {
    const ps = powerState(w)
    const label = ps === 'locked' ? `POWER: collect ${w.tune.tearsForPower} tears to unlock` : ps === 'charging' ? `POWER ${w.tearsHeld}/${w.tune.tearsForPower} tears` : ps === 'ready' ? 'POWER READY: press E / tap POWER' : w.assistOn ? 'SECOND WIND' : `POWER ${powerLeft(w).toFixed(1)}s`
    ctx.textAlign = 'center'; ctx.font = '700 13px system-ui'
    ctx.fillStyle = ps === 'active' ? (w.assistOn ? '#8affc1' : '#9cd0ff') : ps === 'ready' ? '#ffe08a' : '#7f8da3'
    ctx.fillText(label, cw / 2, 112)
    if (w.npcLocked) { ctx.fillStyle = '#ff8a8a'; ctx.fillText('THEIR PADDLE IS POWERED', cw / 2, 128) }
    ctx.textAlign = 'left'
  }
  if (hud.gauge) { drawWindGauge(ctx, w, 60, 50); ctx.fillStyle = '#7f8da3'; ctx.font = '11px system-ui'; ctx.fillText('wind', 50, 66) }
  // banners
  {
    let y = ch * 0.3
    for (const b of fx.banners) {
      const age = (hud.now - b.at) / b.ms
      const a = age < 0.1 ? age / 0.1 : age > 0.75 ? Math.max(0, (1 - age) / 0.25) : 1
      ctx.globalAlpha = a; ctx.textAlign = 'center'
      ctx.fillStyle = b.color; ctx.font = '800 34px system-ui'; ctx.fillText(b.text, cw / 2, y)
      if (b.sub) { ctx.fillStyle = '#cfe0f5'; ctx.font = '15px system-ui'; ctx.fillText(b.sub, cw / 2, y + 24) }
      ctx.globalAlpha = 1; y += 60
    }
    ctx.textAlign = 'left'
  }
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
    if (hud.perks.length) { ctx.fillStyle = '#ffe08a'; ctx.font = '700 20px system-ui'; ctx.fillText('Perk earned: ' + hud.perks.join(', '), cw / 2, ch / 2 + 66) }
    ctx.font = '18px system-ui'; ctx.fillStyle = '#7f8da3'
    ctx.fillText(`${w.endReason === 'grounded' ? 'Arena wedged against both walls' : w.endReason === 'time' ? 'Time up' : 'Score reached'} · press R to play again`, cw / 2, ch / 2 + 40)
  }
}
