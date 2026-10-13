import { glitchText } from './glitch'
import { World, fallSpeed, armLen, arenaDims, eyeY, eyesOpen, padLen, glassLimit, thrustCharge, powerState, powerLeft, powerActive, FIELD_HALF, EYE_R, hasCpuOpponent } from '../sim/world'
import type { GameResult } from '../sim/result'
import { drawShaftBack, drawWallMarkers, drawShaftFront, drawScreenFx } from './shaft'
import { drawGusts, drawWindGauge } from './wind'
import { drawPane, drawBrokenFrame, drawShard, drawCeiling } from './glass'
import { drawSatellites } from './arenas'
import { drawWalls, drawSocket, WALL_EYE_X } from './wall'
import { orbitDims, SAT_R } from '../sim/arenas'
import { PANE_W } from '../sim/glass'
import { drawFog } from './fog'
import type { FogPass } from './fogGL'
import { drawEye, drawBackgroundEyes, drawFace, drawMateHalo, faceEye, faceMate, drawSplats, Fx } from './eyes'
import { hash2 } from './fog'

export interface TrailPoint { x: number; y: number; at: number }
export interface BallEchoPoint { x: number; y: number; tick: number }
export interface GameVisualOptions {
  shaftDistricts?: boolean
  eyeRemembers?: boolean
  oldGlassTraces?: boolean
  echoRallies?: boolean
  shaftSignals?: boolean
  localFalls?: number
  echo?: BallEchoPoint[]
  experimental?: boolean
}
export interface HudExtra {
  paused: boolean; result: GameResult | null; best: number | null; user: string | null
  me?: 0 | 1; trail: TrailPoint[]; now: number; muted: boolean; perks: string[]; hints: boolean; gauge: boolean
  arenaOutcome?: 'saved' | 'fallen' | null
  arenaTether?: boolean
  satelliteWorld?: World
  visible?: boolean
}

export interface Camera { zoom: number; lock: 'auto' | 'arena' | 'field' }
export const newCamera = (): Camera => ({ zoom: 1, lock: 'auto' })

const BLUE = '#4aa8ff'

function targetZoom(w: World, cam: Camera, cw: number, ch: number) {
  const { W, H } = arenaDims(w)
  const arenaFit = cw / (W * 1.35)
  const fieldFit = cw / (FIELD_HALF * 2.4)
  // with other arenas around you, the automatic view pulls back to show the carousel
  const o = orbitDims(W, H)
  const wideFit = w.sats.length ? Math.min(cw / ((o.rx + SAT_R) * 2.1), ch / ((o.ry + SAT_R) * 2.05)) : Infinity
  const strayOut = w.balls.some(b => Math.abs(b.x) > W / 2 + 30)
  const want = cam.lock === 'arena' ? 'arena' : cam.lock === 'field' ? 'field' : strayOut ? 'field' : w.sats.length ? 'wide' : 'arena'
  if (want === 'wide') return Math.max(Math.min(wideFit, arenaFit), fieldFit * 0.9)
  return want === 'arena' ? Math.min(arenaFit, fieldFit * 3) : fieldFit
}

export function stepCamera(w: World, cam: Camera, cw: number, ch: number, dt: number) {
  const t = targetZoom(w, cam, cw, ch)
  cam.zoom += (t - cam.zoom) * Math.min(1, dt * 3)
}

export function screenToWorld(cam: Camera, cw: number, ch: number, sx: number, sy: number) {
  return { x: (sx - cw / 2) / cam.zoom, y: (sy - ch / 2) / cam.zoom }
}

export function renderWorld(ctx: CanvasRenderingContext2D, w: World, cam: Camera, cw: number, ch: number, hud: HudExtra, fx: Fx, visuals: GameVisualOptions = {}) {
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
  // game over: the screen settles, the arenas keep falling out of view, the camera gives a damped bounce
  if (w.status === 'over') { if (!fx.endAt) fx.endAt = hud.now } else fx.endAt = 0
  const endS = fx.endAt ? Math.max(0, (hud.now - fx.endAt) / 1000) : 0
  const endFall = fx.reduce ? 0 : 140 * endS * endS
  const endBob = fx.reduce ? 0 : 16 * Math.sin(endS * 3.4) * Math.exp(-endS * 1.1)
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, cw, ch)
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(cam.zoom, cam.zoom)
  const vh = ch / cam.zoom, vw = cw / cam.zoom
  // the camera sways a little with the arena body, and buffets with the fall
  ctx.translate(-w.arena.x * 0.25 + fx.air.shx, -w.arena.y * 0.25 + fx.air.shy + endBob)
  ctx.rotate(-w.arena.ang * 0.25 - fx.air.roll * 0.5)

  drawShaftBack(ctx, w, vw, vh, w.arena.x + fx.air.x, { afterFar: () => {
    drawFace(ctx, w, fx)
    if (visuals.shaftDistricts) {
      const band = Math.floor(Math.max(0, w.scroll) / 1800), colors = ['90,180,255', '87,235,220', '255,194,105', '182,150,255']
      const color = colors[band % colors.length]!
      const grad = ctx.createLinearGradient(-vw / 2, 0, vw / 2, 0)
      grad.addColorStop(0, `rgba(${color},0.10)`); grad.addColorStop(0.22, `rgba(${color},0.025)`); grad.addColorStop(0.78, `rgba(${color},0.025)`); grad.addColorStop(1, `rgba(${color},0.10)`)
      ctx.fillStyle = grad; ctx.fillRect(-vw / 2, -vh / 2, vw, vh)
      ctx.fillStyle = `rgba(${color},0.48)`; ctx.font = '700 10px ui-monospace,monospace'; ctx.textAlign = 'left'
      ctx.fillText(`DISTRICT ${String(band + 1).padStart(2, '0')}`, -vw / 2 + 18, -vh / 2 + 24)
    }
    if (visuals.shaftSignals) {
      const cell = 620, scroll = w.scroll * 0.5, base = Math.floor(scroll / cell)
      for (let row = base - 1; row <= base + Math.ceil(vh / cell) + 1; row++) {
        if (hash2(row + (w.seed % 97), 616) > 0.12) continue
        const y = row * cell - scroll - w.scroll * 0.5 - vh / 2
        if (y < -vh / 2 || y > vh / 2) continue
        const side = hash2(row, 17) > 0.5 ? 1 : -1, x = side * Math.min(vw * 0.37, FIELD_HALF * 0.72)
        ctx.save(); ctx.globalAlpha = 0.32 + 0.16 * Math.sin(w.t * 1.5 + row); ctx.fillStyle = '#76e9f1'; ctx.shadowColor = '#54e4ff'; ctx.shadowBlur = fx.reduce ? 0 : 12
        ctx.font = '700 14px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText(hash2(row, 19) > 0.5 ? '⌁' : '◈', x, y); ctx.restore()
      }
    }
  }, afterPipes: () => fogPass('mid') })

  // walls: riveted plates with the eyes set into them
  drawWalls(ctx, w, vh)
  drawBackgroundEyes(ctx, w, fx, vh)
  for (const e of w.eyes) {
    const y = eyeY(w, e)
    if (Math.abs(y) > vh / 2 + 150) continue
    drawSocket(ctx, e.wall, e.wall * WALL_EYE_X, y, EYE_R)
    drawEye(ctx, w, e.wall, e.wall * WALL_EYE_X, y, EYE_R, e.lid, e.flinch, 1)
    if (visuals.eyeRemembers && (visuals.localFalls ?? 0) > 0) {
      ctx.save(); ctx.globalAlpha = 0.12 + 0.18 * Math.min(1, (visuals.localFalls ?? 0) / 8); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(e.wall * WALL_EYE_X, y, EYE_R + 8, Math.PI * 0.1, Math.PI * 0.42); ctx.stroke(); ctx.restore()
    }
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

  ctx.save(); ctx.translate(0, endFall)
  drawSatellites(ctx, hud.satelliteWorld ?? w, fx.satDepth, 'back')
  ctx.restore()

  // arena group sways and tilts with its body
  ctx.save()
  ctx.translate(w.arena.x + fx.air.x, w.arena.y + fx.air.y + endFall)
  ctx.rotate(w.arena.ang + fx.air.roll)
  ctx.fillStyle = 'rgba(20,28,42,0.92)'; ctx.fillRect(-W / 2, -H / 2, W, H)
  drawCeiling(ctx, w, W, H, -1); drawCeiling(ctx, w, W, H, 1)
  ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.setLineDash([14, 14]); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, -H / 2); ctx.lineTo(0, H / 2); ctx.stroke(); ctx.setLineDash([])
  if (w.mode.id === 'duo-fall') {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 14px ui-monospace,monospace'; ctx.fillStyle = 'rgba(137,197,255,.58)'
    ctx.fillText('JOINED SHAFTS', 0, -H / 2 + 28)
    ctx.font = '700 12px ui-monospace,monospace'; ctx.fillStyle = 'rgba(138,255,193,.72)'; ctx.fillText(w.duoOpponent === 'local' ? 'TEAM 1 · P1' : 'TEAM 1 · TWO PILOTS', -W * .25, -H / 2 + 28)
    ctx.fillStyle = 'rgba(255,165,165,.72)'; ctx.fillText(w.duoOpponent === 'local' ? 'TEAM 2 · P2' : 'TEAM 2 · CPU', W * .25, -H / 2 + 28)
    ctx.strokeStyle = 'rgba(137,197,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([9, 9])
    ctx.beginPath(); ctx.moveTo(0, -H / 2 + 40); ctx.lineTo(0, H / 2 - 12); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
  }
  if (hud.arenaTether) {
    ctx.save(); ctx.strokeStyle = 'rgba(130,225,255,.82)'; ctx.shadowColor = '#81e2ff'; ctx.shadowBlur = fx.reduce ? 3 : 14; ctx.lineWidth = 3; ctx.setLineDash([8, 7])
    ctx.beginPath(); ctx.moveTo(0, -H / 2 + 4); ctx.lineTo(0, -H / 2 - 104); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
  }

  for (const i of [0, 1] as const) {
    const s = i === 0 ? -1 : 1, side = w.sides[i]
    const gx = s * W / 2
    if (!side.broken) {
      drawPane(ctx, w, i, gx, H, !!visuals.oldGlassTraces)
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
    if (pw) { ctx.fillStyle = i === 0 ? 'rgba(138,255,193,0.28)' : 'rgba(255,138,138,0.28)'; ctx.fillRect(px - 16, side.paddleY - len / 2 - 8, 32, len + 16); ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(side.powerHits % w.tune.powerHits) + '/' + w.tune.powerHits, px, side.paddleY - len / 2 - 14) }
    ctx.fillStyle = side.pvx > 200 ? '#ffffff' : '#e9f2ff'
    ctx.save(); ctx.translate(px, side.paddleY); ctx.rotate(side.ta); ctx.fillRect(-7, -len / 2, 14, len); ctx.restore()   // the paddle tilts with A / D
    if (side.grow > 0.02) {
      // the pinball arm: a small, quiet flipper hinged at the paddle's centre
      const L = armLen(w) * side.grow, dx = -s
      ctx.save(); ctx.translate(px, side.paddleY); ctx.rotate(s * side.fa)
      ctx.globalAlpha = 0.55 + 0.3 * Math.min(1, Math.abs(side.fav) / 12)
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(dx * (L - 3), -2); ctx.quadraticCurveTo(dx * (L + 1), 0, dx * (L - 3), 2); ctx.lineTo(0, 4); ctx.closePath()
      ctx.fillStyle = side.charge > 0 ? `rgb(${140 + Math.round(side.charge * 115)},${156 + Math.round(side.charge * 70)},${182 - Math.round(side.charge * 80)})` : '#8c9cb6'; ctx.fill()
      ctx.strokeStyle = '#0b0e14'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = '#10151f'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill()
      ctx.fillStyle = '#aebbd1'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 7); ctx.fill()
      ctx.restore()
    }
    if (w.mode.id === 'duo-fall') {
      ctx.save(); ctx.globalAlpha = 0.92; ctx.translate(px, side.paddle2Y); ctx.rotate(side.ta)
      ctx.fillStyle = side.pvx > 200 ? '#ffffff' : '#b5d7f5'; ctx.fillRect(-7, -len / 2, 14, len); ctx.restore()
      ctx.fillStyle = 'rgba(210,232,255,.8)'; ctx.font = '700 10px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('2', px - s * 15, side.paddle2Y + 4)
      ctx.fillStyle = 'rgba(210,232,255,.62)'; ctx.fillText('1', px - s * 15, side.paddleY + 4)
    }
    if (side.px > 4) { const rest = s * (W / 2 - 30); ctx.fillStyle = 'rgba(180,220,255,0.22)'; ctx.fillRect(Math.min(rest, px) - 7, side.paddleY - len / 2, Math.abs(rest - px) + 14, len) }
  }
  ctx.fillStyle = 'rgba(200,230,255,0.85)'
  for (const sh of w.shards) {
    ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.globalAlpha = sh.life
    drawShard(ctx, sh.k, sh.size); ctx.restore()
  }
  if (visuals.echoRallies && visuals.echo?.length) {
    const points = visuals.echo.filter(p => w.tick - p.tick <= 600)
    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = '#78dcff'; ctx.beginPath()
    points.forEach((p, i) => { const age = w.tick - p.tick; ctx.globalAlpha = Math.max(0, 0.2 * (1 - age / 600)); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
    ctx.stroke()
    for (const p of points) { const age = w.tick - p.tick; ctx.globalAlpha = Math.max(0, 0.22 * (1 - age / 600)); ctx.fillStyle = '#a5eaff'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill() }
    ctx.restore()
  }
  for (const b of w.balls) {
    const heat = b.swipeMod ?? 0
    if (heat) {
      ctx.save()
      ctx.globalAlpha = 0.22 + Math.min(0.28, Math.abs(heat) * 1.8)
      ctx.fillStyle = heat > 0 ? '#ff8b45' : '#73cfff'
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = fx.reduce ? 5 : 16
      ctx.beginPath(); ctx.arc(b.x, b.y, 17 + Math.abs(heat) * 16, 0, 7); ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, 7); ctx.fill()
  }
  ctx.restore()
  ctx.save(); ctx.translate(0, endFall); drawSatellites(ctx, hud.satelliteWorld ?? w, fx.satDepth, 'front'); ctx.restore()   // the leading arena floats in front
  if (hud.arenaOutcome) {
    ctx.save(); ctx.translate(w.arena.x + fx.air.x, w.arena.y + fx.air.y + endFall); ctx.rotate(w.arena.ang + fx.air.roll)
    ctx.textAlign = 'center'; ctx.font = '700 30px system-ui'
    ctx.fillStyle = hud.arenaOutcome === 'saved' ? '#ffe08a' : '#ff9a9a'
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = fx.reduce ? 3 : 12
    ctx.fillText(hud.arenaOutcome === 'saved' ? '👑' : '💧', 0, -H / 2 - 42)
    ctx.shadowBlur = 0; ctx.font = '800 13px system-ui'; ctx.letterSpacing = '2px'
    ctx.fillText(hud.arenaOutcome === 'saved' ? 'SAVED!' : 'FALLEN!', 0, -H / 2 - 20)
    ctx.restore()
  }

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

  // Informational HUD can be hidden while the independent touch controls remain active.
  if (hud.visible !== false) {
  // HUD
  const compact = cw < 680
  ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'
  ctx.font = compact ? '700 34px system-ui' : '700 44px system-ui'
  ctx.fillText(`${w.sides[0].score}  :  ${w.sides[1].score}`, cw / 2, compact ? 48 : 56)
  ctx.font = compact ? '12px system-ui' : '14px system-ui'; ctx.fillStyle = '#b3c2d1'
  const descriptor = w.mode.id === 'duo-fall'
    ? `DUO FALL · ${w.duoOpponent === 'local' ? 'P1 vs P2' : 'Team 1 co-op vs CPU'} · joined arena · first to ${w.opts.target} · depth ${(w.scroll / 10) | 0} m`
    : compact
    ? `${w.mode.label} · ${w.opts.timeLimit ? `${Math.max(0, Math.ceil(w.opts.timeLimit - w.t))}s` : w.opts.target ? `first to ${w.opts.target}` : w.difficulty.label} · depth ${(w.scroll / 10) | 0} m`
    : `${w.mode.label} · ${w.difficulty.label}${w.opts.target ? ` · first to ${w.opts.target}` : ''}${w.opts.timeLimit ? ` · ${Math.max(0, Math.ceil(w.opts.timeLimit - w.t))}s` : ''}${w.arenaCount ? ` · ${w.arenaCount} other arenas` : ' · solo'}${w.modifiers.length ? ` · ${w.modifiers.join(', ')}` : ''}  ·  depth ${(w.scroll / 10) | 0} m`
  ctx.fillText(descriptor, cw / 2, compact ? 110 : 78, cw - 24)
  ctx.textAlign = 'left'
  ctx.fillStyle = BLUE
  const myTears = hud.me === 1 ? w.tearsHeld2 : w.tearsHeld
  ctx.fillText((!hasCpuOpponent(w) || w.mode.id === 'duo-fall' && w.duoOpponent === 'local') && hud.me !== 1 ? `P1 tears ${w.tearsHeld} · P2 tears ${w.tearsHeld2}` : `tears ${myTears}/${w.tune.tearsForPower}${eyesOpen(w) ? '  · eyes open' : ''}`, 16, 26, Math.max(100, cw / 3))
  // thrust meter
  const ch0 = 1 - thrustCharge(w, 0)
  const meterY = compact ? 122 : 90
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(cw / 2 - 70, meterY, 140, 6)
  ctx.fillStyle = ch0 >= 1 ? '#9cd0ff' : '#4a6a8f'; ctx.fillRect(cw / 2 - 70, meterY, 140 * ch0, 6)
  ctx.fillStyle = '#7f8da3'
  if (hud.hints) {
    if (compact) {
      ctx.font = '11px system-ui'
      const controls = w.mode.id === 'duo-fall'
        ? `${w.duoOpponent === 'local' ? 'P1 W/S · P2 I/K' : 'P1 W/S · P2 I/K share team'} · G/H focus paddles · release to link`
        : hasCpuOpponent(w) ? 'W/S or drag: move · Space: thrust · E: arm' : hud.me === 1 ? 'I/K move · J/L tilt · U thrust · O arm · H/N flip' : 'P1 W/S · P2 I/K · Space/U thrust · E/O arm'
      ctx.fillText(controls, 12, ch - 32, cw - 24)
      ctx.fillText('C: keys · P: pause · swipe tears to collect · ball up: heat / down: breeze', 12, ch - 16, cw - 24)
    } else if (w.mode.id === 'duo-fall') ctx.fillText(`${w.duoOpponent === 'local' ? 'P1 W/S · P2 I/K' : 'P1 W/S · P2 I/K share a team'} · A/D and J/L tilt · Space/U thrust · E/O pinball · Hold G/H to focus a paddle; release to link`, 16, ch - 16, cw - 32)
    else ctx.fillText('W/S or mouse: paddle · A/D: tilt · Space / double-tap: thrust · E: pinball arm (hold Space to aim it with the mouse, release as it hits for a power stack; ↑/↓ or click / right-click to flip) · C: keys · drag across tears to slice · Z: zoom · P: pause · M: mute · R: restart', 16, ch - 16, cw - 32)
  }
  // power paddle state
  {
    const ps = powerState(w, hud.me ?? 0)
    const label = ps === 'locked' ? `PINBALL: collect ${w.tune.tearsForPower} tears to unlock` : ps === 'charging' ? `PINBALL ${myTears}/${w.tune.tearsForPower} tears` : ps === 'ready' ? 'PINBALL READY: press E / tap PINBALL' : w.assistOn ? 'SECOND WIND: flip with ↑ / ↓' : `PINBALL ${powerLeft(w, hud.me ?? 0).toFixed(1)}s · flip ↑ / ↓`
    ctx.textAlign = 'center'; ctx.font = '700 13px system-ui'
    ctx.fillStyle = ps === 'active' ? (w.assistOn ? '#8affc1' : '#9cd0ff') : ps === 'ready' ? '#ffe08a' : '#7f8da3'
    ctx.fillText(label, cw / 2, compact ? 148 : 112, cw - 24)
    if (w.npcLocked) { ctx.fillStyle = '#ff8a8a'; ctx.fillText('THEIR PINBALL PADDLE IS ON', cw / 2, compact ? 164 : 128, cw - 24) }
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
  }

  if (visuals.experimental) { ctx.textAlign = 'left'; ctx.fillStyle = '#ffe08a'; ctx.font = '700 10px ui-monospace,monospace'; ctx.fillText('GAME LAB · UNRANKED', 14, 24) }

  if (hud.paused && w.status === 'play') {
    ctx.fillStyle = 'rgba(5,8,12,0.6)'; ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'; ctx.font = '700 44px system-ui'
    ctx.fillText('Paused', cw / 2, ch / 2); ctx.font = '16px system-ui'; ctx.fillStyle = '#7f8da3'
    ctx.fillText('P or Esc to resume', cw / 2, ch / 2 + 30)
  }
  if (w.status === 'over') {
    const ov = Math.min(1, endS / 0.9)
    const won = w.winner === (hud.me ?? 0)
    const survived = won && w.overtime && w.endReason === 'grounded'
    // a win at the target: "You win... but at what cost?" The arena keeps falling. Grown enough to stop it, you "Survived?"; if not, you are still falling.
    const costly = won && w.endReason === 'score'
    const stopped = fallSpeed(w) < w.tune.baseFall * 0.1
    ctx.fillStyle = `rgba(5,8,12,${(costly && !stopped ? 0.7 + 0.2 * Math.min(1, Math.max(0, endS - 1.5) / 3) : 0.7) * ov})`; ctx.fillRect(0, 0, cw, ch)
    ctx.globalAlpha = ov
    ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'; ctx.font = '700 56px system-ui'
    ctx.fillText(costly ? 'You win...' : survived ? 'You survived!' : w.winner === -1 ? 'Draw' : won ? 'You win!' : 'You fell.', cw / 2, ch / 2 - 40)
    if (costly) {
      ctx.font = '700 30px system-ui'; ctx.fillStyle = '#c9d6e4'
      ctx.fillText('but at what cost?', cw / 2, ch / 2 - 4)
      const late = Math.min(1, Math.max(0, endS - 1.8) / 1.2)
      ctx.globalAlpha = ov * late
      if (stopped) { ctx.font = '700 44px system-ui'; ctx.fillStyle = '#8affc1'; ctx.fillText(glitchText('You Survived?', hud.now), cw / 2, ch / 2 + 56) }
      else { ctx.font = '700 28px system-ui'; ctx.fillStyle = '#ff8a8a'; ctx.fillText('The fall never stopped.', cw / 2, ch / 2 + 52) }
      ctx.globalAlpha = ov
    }
    ctx.font = '22px system-ui'; ctx.fillStyle = '#e9f2ff'
    if (hud.result?.ranked) ctx.fillText(`Score ${hud.result.score}${hud.best !== null && hud.result.score >= hud.best ? '  ·  new best!' : ''}`, cw / 2, ch / 2 + (costly ? 100 : 8))
    if (hud.perks.length) { ctx.fillStyle = '#ffe08a'; ctx.font = '700 20px system-ui'; ctx.fillText('Perk earned: ' + hud.perks.join(', '), cw / 2, ch / 2 + 66 + (costly ? 70 : 0)) }
    ctx.font = '16px system-ui'; ctx.fillStyle = '#7f8da3'
    const endLine = w.overtime && !won ? 'Overtime lost · your win is gone' : survived ? 'Overtime survived · the arena holds' : w.endReason === 'grounded' ? 'Arena wedged against both walls' : w.endReason === 'time' ? 'Time up' : 'Score reached'
    ctx.fillText(endLine, cw / 2, ch / 2 + (costly ? 128 : 40))
    if (visuals.experimental) { ctx.fillStyle = '#ffe08a'; ctx.font = '700 13px ui-monospace,monospace'; ctx.fillText('GAME LAB · UNRANKED · NO UNLOCK PROGRESS', cw / 2, ch / 2 + (costly ? 154 : 66)) }
    ctx.globalAlpha = 1
  }
}
