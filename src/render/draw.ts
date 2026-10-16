import { glitchText } from './glitch'
import { endMotion } from './endMotion'
import { metronome } from './metronome'
import { drawArenaFrame, parseFrame } from './arenaFrame'
import { HUD_STACKS, ballShape, drawBallShape, drawPaddleBody, drawTearShape, drawTrail, girderStyle, hudFont, paddleStyle, tearShape, trailStyle } from './shapes'
import { World, fallSpeed, armLen, arenaDims, eyeY, eyesOpen, padLen, glassLimit, thrustCharge, powerState, powerLeft, powerActive, FIELD_HALF, EYE_R, hasCpuOpponent } from '../sim/world'
import type { GameResult } from '../sim/result'
import { drawShaftBack, drawWallMarkers, drawShaftFront, drawScreenFx } from './shaft'
import { drawGusts, drawWindGauge, drawWindVent } from './wind'
import { drawPane, drawBrokenFrame, drawShard, drawCeiling } from './glass'
import { drawSatellites } from './arenas'
import { drawWalls, drawSocket, WALL_EYE_X } from './wall'
import { orbitDims, SAT_R } from '../sim/arenas'
import { PANE_W } from '../sim/glass'
import { drawFog } from './fog'
import type { FogPass } from './fogGL'
import { backgroundBlink, drawEye, drawBackgroundEyes, drawFace, drawMateHalo, faceEye, faceMate, drawSplats, Fx } from './eyes'
import { hash2 } from './fog'
import type { PainterColors } from '../core/pongPainter'
import { pointLeader } from '../sim/leader'
import { drawSideBack, drawSideObjects } from './sideLayers'
import { ceilingStops, type SideLook } from '../core/arenaSides'
import type { CenterLineStyle } from '../core/centerLine'

export interface TrailPoint { x: number; y: number; at: number }
export interface BallEchoPoint { x: number; y: number; tick: number }
export interface GameVisualOptions {
  shaftDistricts?: boolean
  eyeRemembers?: boolean
  oldGlassTraces?: boolean
  echoRallies?: boolean
  shaftSignals?: boolean
  ballComet?: boolean
  paddleWake?: boolean
  glassImpactHalo?: boolean
  pressureDoors?: boolean
  shaftPostcards?: boolean
  ballSignatures?: boolean
  localFalls?: number
  echo?: BallEchoPoint[]
  experimental?: boolean
  paint?: PainterColors
  /** The two side looks (left, right): layers 1, 2 and 4 plus the ceiling blend. Render-only. */
  sides?: [SideLook, SideLook]
  /** Developer-controlled centre line style (core/centerLine.ts). */
  centerLine?: CenterLineStyle
  /** World-menu layers: `arena` draws inside the arena's own transform (on top of everything in it), `world` draws in shaft coordinates after the other arenas. */
  layers?: { arena?: (ctx: CanvasRenderingContext2D, info: { W: number; H: number; t: number }) => void; world?: (ctx: CanvasRenderingContext2D, info: { t: number; arenaX: number; arenaY: number }) => void }
}
export interface HudExtra {
  paused: boolean; result: GameResult | null; best: number | null; user: string | null
  me?: 0 | 1; trail: TrailPoint[]; now: number; muted: boolean; perks: string[]; hints: boolean; gauge: boolean; metronome?: boolean; arenaNames?: boolean
  arenaOutcome?: 'saved' | 'fallen' | 'falling' | null
  /** The post-win choice is open: the arena hangs on its cord instead of falling away. */
  holding?: boolean
  arenaTether?: boolean
  satelliteWorld?: World
  visible?: boolean
  playerNames?: [string, string]
}

/** panX / panY: an optional world-space offset the view is centred on (menus fly the camera to objects with it). */
export interface Camera { zoom: number; lock: 'auto' | 'arena' | 'field'; panX?: number; panY?: number }
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
  const motion = endMotion({ over: w.status === 'over', stopped: w.endReason === 'grounded' || fallSpeed(w) < w.tune.baseFall * 0.1, holding: !!hud.holding, reduce: fx.reduce, now: hud.now, plungeAt: fx.plungeAt })
  fx.plungeAt = motion.plungeAt
  const endFall = motion.offset
  const endBob = fx.reduce ? 0 : 16 * Math.sin(endS * 3.4) * Math.exp(-endS * 1.1)
  ctx.fillStyle = visuals.paint?.slots['theme.palette'] ?? '#0b0e14'; ctx.fillRect(0, 0, cw, ch)
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(cam.zoom, cam.zoom)
  const vh = ch / cam.zoom, vw = cw / cam.zoom
  if (cam.panX || cam.panY) ctx.translate(-(cam.panX ?? 0), -(cam.panY ?? 0))
  // the camera sways a little with the arena body, and buffets with the fall
  ctx.translate(-w.arena.x * 0.25 + fx.air.shx, -w.arena.y * 0.25 + fx.air.shy + endBob)
  ctx.rotate(-w.arena.ang * 0.25 - fx.air.roll * 0.5)

  drawShaftBack(ctx, w, vw, vh, w.arena.x + fx.air.x, { afterFar: () => {
    drawFace(ctx, w, fx, visuals.paint?.eyeType, visuals.paint?.eye)
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
    if (visuals.pressureDoors) {
      const stride = 2800, first = Math.floor(w.scroll / stride) - 1, last = Math.ceil((w.scroll + vh) / stride) + 1
      for (let row = first; row <= last; row++) {
        const y = row * stride - w.scroll
        if (y < -vh / 2 - 80 || y > vh / 2 + 80) continue
        for (const side of [-1, 1] as const) {
          const x = side * Math.min(vw * 0.43, FIELD_HALF * 0.78)
          ctx.save(); ctx.translate(x, y)
          ctx.fillStyle = 'rgba(13,22,34,.78)'; ctx.strokeStyle = 'rgba(113,155,190,.56)'; ctx.lineWidth = 2
          ctx.fillRect(-38, -42, 76, 84); ctx.strokeRect(-38, -42, 76, 84)
          ctx.fillStyle = 'rgba(255,190,94,.55)'
          for (let stripe = -2; stripe <= 2; stripe++) ctx.fillRect(-28, stripe * 13 - 3, 56, 4)
          ctx.fillStyle = 'rgba(255,220,150,.86)'; ctx.font = '700 8px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('GATE', 0, 36)
          ctx.restore()
        }
      }
    }
    if (visuals.shaftPostcards) {
      const stride = 1900, first = Math.floor(w.scroll / stride) - 1, last = Math.ceil((w.scroll + vh) / stride) + 1
      const cards = ['KEEP FALLING', 'EYES OPEN', 'NO FLOOR FOUND', 'HELLO FROM BELOW']
      for (let row = first; row <= last; row++) {
        if (hash2(row + (w.seed % 197), 440) > 0.24) continue
        const y = row * stride - w.scroll
        if (y < -vh / 2 - 40 || y > vh / 2 + 40) continue
        const side = hash2(row, 441) > 0.5 ? 1 : -1, x = side * Math.min(vw * 0.34, FIELD_HALF * 0.62)
        ctx.save(); ctx.globalAlpha = 0.68; ctx.translate(x, y); ctx.rotate(side * -0.025)
        ctx.fillStyle = 'rgba(11,17,27,.88)'; ctx.strokeStyle = 'rgba(121,178,205,.54)'; ctx.lineWidth = 2
        ctx.fillRect(-78, -18, 156, 36); ctx.strokeRect(-78, -18, 156, 36)
        ctx.fillStyle = '#9cd8df'; ctx.font = '700 9px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText(cards[Math.floor(hash2(row, 442) * cards.length)]!, 0, 4)
        ctx.restore()
      }
    }
  }, afterPipes: () => fogPass('mid') })
  if (visuals.paint?.slots['theme.palette'] !== '#0b0e14' && visuals.paint?.slots['theme.palette']) {
    ctx.save(); ctx.strokeStyle = visuals.paint.slots['theme.palette']; ctx.globalAlpha = .55; ctx.lineWidth = 9
    for (const side of [-1, 1]) { const x = side * (FIELD_HALF - 56); ctx.beginPath(); ctx.moveTo(x, -vh / 2); ctx.lineTo(x, vh / 2); ctx.stroke() }
    ctx.restore()
  }

  // walls: riveted plates with the eyes set into them
  drawWindVent(ctx, w, fx.reduce)
  drawWalls(ctx, w, vh)
  drawBackgroundEyes(ctx, w, fx, vh, visuals.paint?.eyeType, visuals.paint?.eye)
  for (const e of w.eyes) {
    const y = eyeY(w, e)
    if (Math.abs(y) > vh / 2 + 150) continue
    drawSocket(ctx, e.wall, e.wall * WALL_EYE_X, y, EYE_R)
    drawEye(ctx, w, e.wall, e.wall * WALL_EYE_X, y, EYE_R, e.lid * backgroundBlink(w.t, e.slot * 1.31 + (e.wall + 1) * 0.79), e.flinch, 1, 'metal', 0, visuals.paint?.eye, visuals.paint?.eyeType, visuals.paint?.slots['eye.lid'], visuals.paint?.slots['eye.blink'])
    if (visuals.paint?.eye) { ctx.save(); ctx.globalAlpha = 0.58; ctx.strokeStyle = visuals.paint.eye; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.wall * WALL_EYE_X, y, EYE_R + 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
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
    ctx.fillStyle = visuals.paint?.tearGlow ?? '#7cc0ff'
    ctx.beginPath(); ctx.arc(t.x, t.y, 44 + 5 * Math.sin(t.age * 5), 0, 7); ctx.fill()
    ctx.globalAlpha = fade
    ctx.fillStyle = visuals.paint?.tear ?? BLUE
    drawTearShape(ctx, tearShape(visuals.paint?.slots['tear.shape']), t.x, t.y)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath(); ctx.ellipse(t.x - 8, t.y - 2, 4, 9, -0.4, 0, 7); ctx.fill()
    ctx.globalAlpha = 1
  }
  drawSplats(ctx, fx)
  if (!fx.reduce) { ctx.save(); ctx.strokeStyle = visuals.paint?.slots['tear.burst'] ?? '#8ac9ff'; ctx.lineWidth = 3; for (const burst of fx.tearBursts) { ctx.globalAlpha = burst.life * .7; ctx.beginPath(); ctx.arc(burst.x, burst.y, 14 + (1 - burst.life) * 32, 0, 7); ctx.stroke() } ctx.restore() }

  ctx.save(); ctx.translate(0, endFall)
  const leader = pointLeader(w)
  drawSatellites(ctx, hud.satelliteWorld ?? w, fx.satDepth, 'back', visuals.paint, leader, hud.arenaNames !== false, !!visuals.sides)
  ctx.restore()

  // arena group sways and tilts with its body
  ctx.save()
  ctx.translate(w.arena.x + fx.air.x, w.arena.y + fx.air.y + endFall)
  ctx.rotate(w.arena.ang + fx.air.roll)
  fx.arenaMatrix = ctx.getTransform()
  ctx.fillStyle = 'rgba(20,28,42,0.92)'; ctx.fillRect(-W / 2, -H / 2, W, H)
  const looks = visuals.sides
  if (looks) for (const i of [0, 1] as const) drawSideBack(ctx, looks[i], i, W, H, w.realT, fx.reduce, i === (hud.me ?? 0))
  let seam: string | CanvasGradient | undefined
  if (looks && (looks[0].ceiling !== 'plain' || looks[1].ceiling !== 'plain')) {
    const g = ctx.createLinearGradient(-W / 2, 0, W / 2, 0)
    for (const stop of ceilingStops(looks[0].ceiling, looks[1].ceiling)) g.addColorStop(stop.at, stop.color)
    seam = g
  }
  drawCeiling(ctx, w, W, H, -1, visuals.paint?.slots['arena.ceiling'] ?? seam, visuals.paint?.slots['arena.clamp'], girderStyle(visuals.paint?.slots['arena.girder'])); drawCeiling(ctx, w, W, H, 1, visuals.paint?.slots['arena.floor'] ?? seam, visuals.paint?.slots['arena.clamp'], girderStyle(visuals.paint?.slots['arena.girder']))
  const line = visuals.centerLine
  if (!line || line.visible) {
    ctx.save(); ctx.strokeStyle = line?.color ?? '#4aa8ff'; ctx.globalAlpha = line?.alpha ?? 0.25; ctx.setLineDash(line?.dash ?? [14, 14]); ctx.lineWidth = line?.width ?? 3
    ctx.beginPath(); ctx.moveTo(0, -H / 2); ctx.lineTo(0, H / 2); ctx.stroke(); ctx.restore()
  }
  if (looks) for (const i of [0, 1] as const) drawSideObjects(ctx, looks[i], i, W, H, w.realT, fx.reduce)
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

  if (hud.metronome && w.status === 'play') {
    // faint rally metronome on the centre line, bottom of the arena
    const fastest = w.balls.reduce((m, b) => Math.max(m, Math.hypot(b.vx, b.vy)), 0)
    const m = metronome(w.t, fastest)
    ctx.save(); ctx.translate(0, H / 2 - 12); ctx.globalAlpha = fx.reduce ? 0.2 : m.tick ? 0.42 : 0.24
    ctx.strokeStyle = '#bfe6ff'; ctx.fillStyle = '#bfe6ff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, -46); ctx.lineTo(14, 0); ctx.closePath(); ctx.stroke()
    const a = fx.reduce ? 0 : m.angle
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * 40, -Math.cos(a) * 40); ctx.stroke()
    ctx.beginPath(); ctx.arc(Math.sin(a) * 40, -Math.cos(a) * 40, 4, 0, 7); ctx.fill()
    ctx.restore()
  }

  for (const i of [0, 1] as const) {
    const s = i === 0 ? -1 : 1, side = w.sides[i]
    const gx = s * W / 2
    if (!side.broken) {
      drawPane(ctx, w, i, gx, H, !!visuals.oldGlassTraces, visuals.paint?.glass, visuals.paint?.slots['glass.crack'])
      if (visuals.glassImpactHalo && side.glassHits > 0) {
        const age = Math.max(0, (w.tick - side.hitTick) / 120)
        if (age < 0.55) {
          const strength = 1 - age / 0.55, y = side.hitYs[side.hitYs.length - 1] ?? 0
          ctx.save(); ctx.globalAlpha = (fx.reduce ? 0.22 : 0.42) * strength; ctx.strokeStyle = '#9eeaff'; ctx.lineWidth = fx.reduce ? 2 : 2.5
          ctx.beginPath(); ctx.arc(gx, y, fx.reduce ? 12 : 10 + 34 * strength, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
        }
      }
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
    if (visuals.paddleWake && !fx.reduce) {
      const drawWake = (y: number, velocity: number) => {
        if (Math.abs(velocity) < 45) return
        ctx.save(); ctx.globalAlpha = Math.min(0.2, Math.abs(velocity) / 1800); ctx.fillStyle = i === 0 ? '#83caff' : '#ffaaa0'
        for (let n = 1; n <= 3; n++) { ctx.globalAlpha *= 0.68; ctx.fillRect(px - 7, y - velocity * 0.012 * n - len / 2, 14, len) }
        ctx.restore()
      }
      drawWake(side.paddleY, side.vy)
      if (w.mode.id === 'duo-fall') drawWake(side.paddle2Y, side.vy2)
    }
    if (pw) { ctx.fillStyle = i === 0 ? 'rgba(138,255,193,0.28)' : 'rgba(255,138,138,0.28)'; ctx.fillRect(px - 16, side.paddleY - len / 2 - 8, 32, len + 16); ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(side.powerHits % w.tune.powerHits) + '/' + w.tune.powerHits, px, side.paddleY - len / 2 - 14) }
    ctx.fillStyle = side.pvx > 200 ? '#ffffff' : visuals.paint?.paddle ?? '#e9f2ff'
    ctx.save(); ctx.translate(px, side.paddleY); ctx.rotate(side.ta); drawPaddleBody(ctx, paddleStyle(visuals.paint?.slots['paddle.style']), len); ctx.restore()   // the paddle tilts with A / D
    if (side.grow > 0.02) {
      // the pinball arm: a small, quiet flipper hinged at the paddle's centre
      const L = armLen(w) * side.grow, dx = -s
      ctx.save(); ctx.translate(px, side.paddleY); ctx.rotate(s * side.fa)
      ctx.globalAlpha = 0.55 + 0.3 * Math.min(1, Math.abs(side.fav) / 12)
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(dx * (L - 3), -2); ctx.quadraticCurveTo(dx * (L + 1), 0, dx * (L - 3), 2); ctx.lineTo(0, 4); ctx.closePath()
      ctx.fillStyle = side.charge > 0 ? visuals.paint?.slots['paddle.power'] ?? '#a5ffca' : visuals.paint?.slots['paddle.arm'] ?? '#8c9cb6'; ctx.fill()
      ctx.strokeStyle = '#0b0e14'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = '#10151f'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill()
      ctx.fillStyle = '#aebbd1'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 7); ctx.fill()
      ctx.restore()
    }
    if (w.mode.id === 'duo-fall') {
      ctx.save(); ctx.globalAlpha = 0.92; ctx.translate(px, side.paddle2Y); ctx.rotate(side.ta)
      ctx.fillStyle = side.pvx > 200 ? '#ffffff' : visuals.paint?.paddle ?? '#b5d7f5'; drawPaddleBody(ctx, paddleStyle(visuals.paint?.slots['paddle.style']), len); ctx.restore()
      ctx.fillStyle = 'rgba(210,232,255,.8)'; ctx.font = '700 10px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('2', px - s * 15, side.paddle2Y + 4)
      ctx.fillStyle = 'rgba(210,232,255,.62)'; ctx.fillText('1', px - s * 15, side.paddleY + 4)
    }
    if (side.px > 4) { const rest = s * (W / 2 - 30); ctx.fillStyle = 'rgba(180,220,255,0.22)'; ctx.fillRect(Math.min(rest, px) - 7, side.paddleY - len / 2, Math.abs(rest - px) + 14, len) }
  }
  ctx.fillStyle = 'rgba(200,230,255,0.85)'
  for (const sh of w.shards) {
    ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.rot); ctx.globalAlpha = sh.life
    drawShard(ctx, sh.k, sh.size, visuals.paint?.slots['glass.shatter']); ctx.restore()
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
    const tStyle = trailStyle(visuals.paint?.slots['ball.trailStyle'])
    if ((visuals.ballComet || tStyle !== 'line' || !!visuals.paint && visuals.paint.slots['ball.trail'] !== '#acdfff') && !fx.reduce) {
      const speed = Math.hypot(b.vx, b.vy), length = Math.min(70, speed * 0.12)
      if (speed > 35) drawTrail(ctx, tStyle, b.x, b.y, b.vx / speed, b.vy / speed, length, visuals.paint?.slots['ball.trail'] ?? (b.swipeMod && b.swipeMod < 0 ? '#83dcff' : b.swipeMod && b.swipeMod > 0 ? '#ffc07a' : '#acdfff'), hud.now / 1000)
    }
    const heat = b.swipeMod ?? 0
    if (heat) {
      ctx.save()
      ctx.globalAlpha = 0.22 + Math.min(0.28, Math.abs(heat) * 1.8)
      ctx.fillStyle = visuals.paint?.slots['ball.impact'] ?? (heat > 0 ? '#ff8b45' : '#73cfff')
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = fx.reduce ? 5 : 16
      ctx.beginPath(); ctx.arc(b.x, b.y, 17 + Math.abs(heat) * 16, 0, 7); ctx.fill()
      ctx.restore()
      if (visuals.ballSignatures) {
        ctx.save(); ctx.strokeStyle = heat > 0 ? '#ffbf70' : '#83dcff'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2
        if (heat > 0) { ctx.beginPath(); ctx.moveTo(b.x, b.y - 19); ctx.lineTo(b.x - 5, b.y - 27); ctx.lineTo(b.x + 5, b.y - 27); ctx.closePath(); ctx.fill() }
        else { ctx.strokeRect(b.x - 17, b.y - 3, 4, 6); ctx.strokeRect(b.x + 13, b.y - 3, 4, 6) }
        ctx.restore()
      }
    }
    ctx.fillStyle = visuals.paint?.ball ?? '#fff'; drawBallShape(ctx, ballShape(visuals.paint?.slots['ball.shape']), b.x, b.y, 10, hud.now / 1000)
  }
  { const frame = parseFrame(visuals.paint?.arena); if (frame) drawArenaFrame(ctx, W + 56 + 4, H + 36 + 4, frame, hud.now / 1000, fx.reduce) }   // Arena Frames (PongPainter): a physical frame outside the glass and girders
  if (visuals.layers?.arena) { ctx.save(); visuals.layers.arena(ctx, { W, H, t: w.realT }); ctx.restore() }
  ctx.restore()
  ctx.save(); ctx.translate(0, endFall); drawSatellites(ctx, hud.satelliteWorld ?? w, fx.satDepth, 'front', visuals.paint, leader, hud.arenaNames !== false, !!visuals.sides); ctx.restore()
  if (hud.arenaOutcome) {
    ctx.save(); ctx.translate(w.arena.x + fx.air.x, w.arena.y + fx.air.y + endFall); ctx.rotate(w.arena.ang + fx.air.roll)
    ctx.textAlign = 'center'; ctx.font = '700 30px system-ui'
    ctx.fillStyle = hud.arenaOutcome === 'fallen' ? '#ff9a9a' : '#ffe08a'
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = fx.reduce ? 3 : 12
    ctx.fillText(hud.arenaOutcome === 'fallen' ? '💧' : '👑', 0, -H / 2 - 42)
    ctx.shadowBlur = 0; ctx.font = '800 13px system-ui'; ctx.letterSpacing = '2px'
    ctx.fillText(hud.arenaOutcome === 'saved' ? 'SAVED!' : hud.arenaOutcome === 'falling' ? 'WON · STILL FALLING' : 'FALLEN!', 0, -H / 2 - 20)
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
  const camT = ctx.getTransform()
  ctx.restore()

  drawScreenFx(ctx, w, cw, ch)
  if (fx.boostFlash > 0) { ctx.fillStyle = `rgba(255,230,160,${0.18 * fx.boostFlash})`; ctx.fillRect(0, 0, cw, ch) }

  // Informational HUD can be hidden while the independent touch controls remain active.
  if (hud.visible !== false) {
  // HUD
  const compact = cw < 680
  ctx.fillStyle = '#e9f2ff'; ctx.textAlign = 'center'
  const scoreFont = HUD_STACKS[hudFont(visuals.paint?.slots['theme.hud'])]
  ctx.font = compact ? `700 34px ${scoreFont}` : `700 44px ${scoreFont}`
  ctx.fillText(`${w.sides[0].score}  :  ${w.sides[1].score}`, cw / 2, compact ? 48 : 56)
  const names = hud.playerNames ?? [hud.user || 'Player 1', hasCpuOpponent(w) ? 'Shaft AI' : 'Player 2']
  ctx.font = compact ? '700 11px system-ui' : '700 13px system-ui'
  const labelY = compact ? 49 : 55
  ctx.fillStyle = leader?.arena === 'main' && leader.side === 0 ? '#ffe08a' : '#b3c2d1'
  ctx.textAlign = 'right'; ctx.fillText(`${leader?.arena === 'main' && leader.side === 0 ? '👑 ' : ''}${names[0]}`, cw / 2 - (compact ? 58 : 105), labelY, compact ? cw * 0.28 : cw * 0.32)
  ctx.fillStyle = leader?.arena === 'main' && leader.side === 1 ? '#ffe08a' : '#b3c2d1'
  ctx.textAlign = 'left'; ctx.fillText(`${leader?.arena === 'main' && leader.side === 1 ? '👑 ' : ''}${names[1]}`, cw / 2 + (compact ? 58 : 105), labelY, compact ? cw * 0.28 : cw * 0.32)
  ctx.textAlign = 'center'
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
        ? `${w.duoOpponent === 'local' ? 'P1 W/S G/H focus · P2 I/K B/V focus' : 'P1 W/S · P2 I/K share team · G/H or B/V focus'} · release to link`
        : hasCpuOpponent(w) ? 'W/S or drag: move · Space: thrust · E: arm' : hud.me === 1 ? 'I/K move · J/L tilt · U thrust · O arm · H/N flip' : 'P1 W/S · P2 I/K · Space/U thrust · E/O arm'
      ctx.fillText(controls, 12, ch - 32, cw - 24)
      ctx.fillText('C: keys · P: pause · swipe tears to collect · ball up: heat / down: breeze', 12, ch - 16, cw - 24)
    } else if (w.mode.id === 'duo-fall') ctx.fillText(`${w.duoOpponent === 'local' ? 'P1 W/S + G/H focus · P2 I/K + B/V focus' : 'P1 W/S · P2 I/K share a team · G/H or B/V focus'} · A/D and J/L tilt · Space/U thrust · E/O pinball · release focus to link paddles`, 16, ch - 16, cw - 32)
    else ctx.fillText('W/S or mouse: paddle · A/D: tilt · Space / double-tap: thrust · E: pinball arm (hold Space to aim it with the mouse, release as it hits for a power stack; ↑/↓ or click / right-click to flip) · C: keys · drag across tears to slice · Z: zoom · P: pause · M: mute · R: restart', 16, ch - 16, cw - 32)
  }
  // power paddle state
  {
    const ps = powerState(w, hud.me ?? 0)
    const label = ps === 'locked' ? `PINBALL: collect ${w.tune.tearsForPower} tears to unlok` : ps === 'charging' ? `PINBALL ${myTears}/${w.tune.tearsForPower} tears` : ps === 'ready' ? 'PINBALL READY: press E / tap PINBALL' : w.assistOn ? 'SECOND WIND: flip with ↑ / ↓' : `PINBALL ${powerLeft(w, hud.me ?? 0).toFixed(1)}s · flip ↑ / ↓`
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
    // with the world dialog open its own title and words replace this banner (the objects sit where it was)
    if (!visuals.layers?.world) {
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
    }
    if (hud.perks.length) { ctx.fillStyle = '#ffe08a'; ctx.font = '700 20px system-ui'; ctx.fillText('Perk earned: ' + hud.perks.join(', '), cw / 2, ch / 2 + 66 + (costly ? 70 : 0)) }
    if (!visuals.layers?.world) {
    ctx.font = '16px system-ui'; ctx.fillStyle = '#7f8da3'
    const endLine = w.overtime && !won ? 'Overtime lost · your win is gone' : survived ? 'Overtime survived · the arena holds' : w.endReason === 'grounded' ? 'Arena wedged against both walls' : w.endReason === 'time' ? 'Time up' : 'Score reached'
    ctx.fillText(endLine, cw / 2, ch / 2 + (costly ? 128 : 40))
    if (visuals.experimental) { ctx.fillStyle = '#ffe08a'; ctx.font = '700 13px ui-monospace,monospace'; ctx.fillText('GAME LAB · UNRANKED · NO UNLOK PROGRESS', cw / 2, ch / 2 + (costly ? 154 : 66)) }
    }
    ctx.globalAlpha = 1
  }
  // menu and dialog objects: the very last thing drawn in the shaft, above the fog and the end-of-match veil. They hang where the arena rests, so when a match ends and the arena plunges away they stay
  if (visuals.layers?.world) { ctx.save(); ctx.setTransform(camT); visuals.layers.world(ctx, { t: w.realT, arenaX: w.arena.x, arenaY: w.arena.y }); ctx.restore() }
}
