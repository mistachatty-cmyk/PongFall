// The deep shaft: layered depths that rush upward at different speeds so the arena reads as falling.
import { World, FIELD_HALF } from '../sim/world'
import { hash2, softBlob } from './fog'

const wrap = (v: number, period: number) => ((v % period) + period) % period

/** Far wall, girders and pipes. Drawn behind the walls/eyes/arena. All y positions come from the real scroll. */
export interface ShaftHooks { /** Called after the far wall and distant silhouettes, with their rectangle: a PongPainter backdrop paints here. */ backdrop?: (x: number, y: number, w: number, h: number) => void; afterFar?: () => void; afterGirders?: () => void; afterPipes?: () => void }

export function drawShaftBack(ctx: CanvasRenderingContext2D, w: World, vw: number, vh: number, sway = 0, hooks: ShaftHooks = {}) {
  const span = Math.min(vw / 2 + 80, FIELD_HALF + 400)
  const top = -vh / 2 - 60, bot = vh / 2 + 60
  // far wall gradient
  const g = ctx.createLinearGradient(0, top, 0, bot)
  g.addColorStop(0, '#0a0e17'); g.addColorStop(0.5, '#0e1420'); g.addColorStop(1, '#131c2c')
  ctx.fillStyle = g
  ctx.fillRect(-span, top, span * 2, bot - top)

  // layer -1: huge distant silhouettes (towers, silos) barely moving
  {
    const par = 0.07, period = 1400, off = w.scroll * par, base = Math.floor(off / period)
    ctx.save(); ctx.translate(-sway * 0.1, 0)
    for (let gy = Math.floor(top / period) - 1; gy <= Math.ceil(bot / period) + 1; gy++) {
      const n = hash2(gy + base, 2)
      const y = gy * period - (off - base * period)
      ctx.fillStyle = 'rgba(14,20,34,0.85)'
      for (let k = 0; k < 3; k++) { const x = (hash2(gy + base, k + 5) * 2 - 1) * span * 0.9; const ww = 120 + hash2(k, gy + base) * 220; ctx.fillRect(x - ww / 2, y - 200 * n, ww, 900) }
    }
    ctx.restore()
  }

  hooks.backdrop?.(-span, top, span * 2, bot - top)   // a PongPainter backdrop replaces the far wall and the distant silhouettes

  // layer 0: tiny lit windows and thin rings (slowest)
  ctx.save(); ctx.translate(-sway * 0.18, 0)
  {
    const par = 0.16, cell = 84, off = w.scroll * par
    const base = Math.floor(off / cell)
    for (let gy = Math.floor(top / cell) - 1; gy <= Math.ceil(bot / cell) + 1; gy++) {
      const row = gy + base
      const y = gy * cell - (off - base * cell)
      for (let gx = Math.floor(-span / cell); gx <= Math.ceil(span / cell); gx++) {
        const n = hash2(gx, row + 500)
        if (n > 0.1) continue
        ctx.fillStyle = n < 0.03 ? 'rgba(255,214,150,0.5)' : 'rgba(140,190,255,0.35)'
        ctx.fillRect(gx * cell, y, 9, 5)
      }
    }
    ctx.strokeStyle = 'rgba(70,95,140,0.22)'; ctx.lineWidth = 3
    const ring = 360, ro = wrap(w.scroll * 0.22, ring)
    for (let y = top - ring + (-ro % ring); y < bot + ring; y += ring) { ctx.beginPath(); ctx.moveTo(-span, y); ctx.lineTo(span, y); ctx.stroke() }
  }
  ctx.restore()
  hooks.afterFar?.()

  // layer 1: girders with cross-bracing and rivets
  ctx.save(); ctx.translate(-sway * 0.45, 0)
  {
    const par = 0.5, period = 560, off = w.scroll * par
    const base = Math.floor(off / period)
    for (let gy = Math.floor(top / period) - 1; gy <= Math.ceil(bot / period) + 1; gy++) {
      const y = gy * period - (off - base * period)
      ctx.fillStyle = '#18202f'; ctx.fillRect(-span, y, span * 2, 26)
      ctx.fillStyle = 'rgba(150,180,230,0.12)'; ctx.fillRect(-span, y, span * 2, 3)
      ctx.strokeStyle = 'rgba(24,32,47,0.9)'; ctx.lineWidth = 6
      for (let x = -span; x < span; x += 190) { ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x + 190, y + 150); ctx.moveTo(x + 190, y + 26); ctx.lineTo(x, y + 150); ctx.stroke() }
      ctx.fillStyle = 'rgba(120,150,200,0.25)'
      for (let x = -span + 40; x < span; x += 95) { ctx.beginPath(); ctx.arc(x, y + 13, 3, 0, 7); ctx.fill() }
    }
  }
  ctx.restore()
  hooks.afterGirders?.()

  // layer 2: vertical pipes and cables with brackets
  ctx.save(); ctx.translate(-sway * 0.8, 0)
  {
    const par = 0.82, off = w.scroll * par
    for (let i = 0; i < 9; i++) {
      const n = hash2(i, 31), x = (hash2(i, 77) * 2 - 1) * (span - 120)
      const pw = 14 + n * 22
      ctx.fillStyle = `rgba(${20 + n * 12},${28 + n * 14},${42 + n * 18},0.95)`
      ctx.fillRect(x - pw / 2, top, pw, bot - top)
      ctx.fillStyle = 'rgba(160,190,235,0.10)'; ctx.fillRect(x - pw / 2 + 2, top, 3, bot - top)
      const bp = 210
      const by = -wrap(off + i * 53, bp)
      ctx.fillStyle = 'rgba(52,66,92,0.95)'
      for (let y = top + by - bp; y < bot + bp; y += bp) ctx.fillRect(x - pw / 2 - 5, y, pw + 10, 9)
    }
  }
  ctx.restore()
  hooks.afterPipes?.()
}

/** Depth markers and wall rails: tied to the real depth, so speed is readable. */
export function drawWallMarkers(ctx: CanvasRenderingContext2D, w: World, vh: number) {
  const top = -vh / 2 - 60, bot = vh / 2 + 60
  const tick = 100
  const base = Math.floor(w.scroll / tick)
  ctx.font = '600 15px ui-monospace, Menlo, monospace'
  for (const wall of [-1, 1] as const) {
    const x = wall * (FIELD_HALF - 120)
    ctx.strokeStyle = 'rgba(120,160,220,0.25)'; ctx.lineWidth = 2
    for (let i = base - 1; i < base + Math.ceil((bot - top) / tick) + 2; i++) {
      const y = i * tick - w.scroll
      if (y < top || y > bot) continue
      const major = i % 5 === 0
      ctx.beginPath(); ctx.moveTo(x - (major ? 30 : 14) * wall, y); ctx.lineTo(x + 6 * wall, y); ctx.stroke()
      if (major) {
        const label = String(Math.round((i * tick) / 10)).padStart(4, '0') + ' m'
        ctx.fillStyle = 'rgba(8,12,20,0.8)'; ctx.fillRect(x - 100 * (wall === 1 ? 1 : 0) - (wall === -1 ? 0 : 0) + (wall === 1 ? -4 : -96), y - 12, 100, 24)
        ctx.fillStyle = 'rgba(150,215,255,0.85)'
        ctx.textAlign = wall === 1 ? 'right' : 'left'
        ctx.fillText(label, x + (wall === 1 ? -14 : -86 + 90), y + 5)
      }
    }
  }
  ctx.textAlign = 'left'
}

/** Foreground: beams that rush past, debris streaks and light shafts. Drawn over everything but the HUD. */
export function drawShaftFront(ctx: CanvasRenderingContext2D, w: World, windX: number, vw: number, vh: number, arenaHalfW: number, reduce: boolean, debris = 'steel') {
  const top = -vh / 2 - 100, bot = vh / 2 + 100
  const speed = Math.min(1, w.fallV / 320)
  const span = Math.min(vw / 2 + 60, FIELD_HALF + 400)

  // light shafts sliding down the walls
  {
    const blob = softBlob('#bcd8ff')
    for (let i = 0; i < 3; i++) {
      const x = (hash2(i, 5) * 2 - 1) * span * 0.85 + Math.sin(w.t / 11 + i * 2) * 70
      ctx.globalAlpha = 0.045 + 0.03 * Math.sin(w.t / 5 + i)
      ctx.save(); ctx.translate(x, 0); ctx.rotate(0.12 + i * 0.05)
      ctx.drawImage(blob, -90, top, 180, bot - top)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  // near beams: big, dark, at about twice the arena's speed; kept off the arena so play stays readable
  {
    const par = 2.1, period = 1500, off = w.scroll * par
    const base = Math.floor(off / period)
    const smear = reduce ? 0 : 3
    for (let gy = Math.floor(top / period) - 1; gy <= Math.ceil(bot / period) + 1; gy++) {
      const n = hash2(gy + base, 91)
      const y0 = gy * period - (off - base * period) + (n - 0.5) * 300
      const h = 46 + n * 60
      for (let k = smear; k >= 0; k--) {
        const sy = y0 - k * w.fallV * 0.02
        ctx.globalAlpha = k === 0 ? 0.85 : 0.18 / k
        ctx.fillStyle = '#06080e'
        ctx.fillRect(-span, sy, span - arenaHalfW - 70, h)
        ctx.fillRect(arenaHalfW + 70, sy, span - arenaHalfW - 70, h)
        if (k === 0) { ctx.fillStyle = 'rgba(160,190,240,0.10)'; ctx.fillRect(-span, sy, span - arenaHalfW - 70, 3); ctx.fillRect(arenaHalfW + 70, sy, span - arenaHalfW - 70, 3) }
      }
    }
    ctx.globalAlpha = 1
  }

  // debris and dust streaking upward, pushed by the wind
  {
    const N = reduce ? 26 : 64
    for (let i = 0; i < N; i++) {
      const n = hash2(i, 3), m = hash2(i, 19), kind = hash2(i, 41)
      const par = 1.1 + n * 1.9
      const period = (bot - top) + 400
      const y = wrap(m * period - w.scroll * par, period) + top - 200
      const x = (hash2(i, 13) * 2 - 1) * span + windX * (0.05 + n * 0.12) % (span * 2)
      const xx = ((x + span) % (span * 2) + span * 2) % (span * 2) - span
      const len = reduce ? 4 : 6 + w.fallV * par * 0.05
      ctx.globalAlpha = 0.16 + 0.34 * n * (0.4 + speed)
      if (debris !== 'steel') {
        const edge = Math.abs(xx) < arenaHalfW + 48 ? Math.sign(xx || 1) * (arenaHalfW + 48 + n * 55) : xx
        ctx.save(); ctx.translate(edge, y); if (!reduce) ctx.rotate(w.t * (.25 + n) + i)
        if (debris === 'embers') { ctx.fillStyle = '#ff9d65'; ctx.shadowColor = '#ff794a'; ctx.shadowBlur = reduce ? 0 : 8; ctx.beginPath(); ctx.arc(0, 0, 1.5 + n * 2, 0, 7); ctx.fill() }
        else if (debris === 'paper') { ctx.strokeStyle = '#d6d2bd'; ctx.lineWidth = 1; ctx.strokeRect(-4, -3, 8 + n * 4, 6 + n * 2); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(3, 0); ctx.stroke() }
        else if (debris === 'crystal') { ctx.fillStyle = '#a4e8ff'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill() }
        else if (debris === 'leaves') { ctx.fillStyle = '#a2c791'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, -.6, 0, 7); ctx.fill(); ctx.strokeStyle = '#d7eab6'; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(4, -2); ctx.stroke() }
        else if (debris === 'gears') { ctx.strokeStyle = '#b5bdca'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 4 + n * 2, 0, 7); ctx.stroke(); for (let tooth = 0; tooth < 6; tooth++) { const a = tooth * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke() } }
        ctx.restore()
      } else if (kind < 0.55) {
        ctx.strokeStyle = 'rgba(190,215,255,0.9)'; ctx.lineWidth = 1 + n * 1.5
        ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx + windX * 0.0006, y + len); ctx.stroke()
      } else if (kind < 0.8) {
        ctx.fillStyle = 'rgba(210,225,255,0.8)'
        ctx.save(); ctx.translate(xx, y); ctx.rotate(w.t * (1 + n * 3) + i)
        ctx.fillRect(-3, -1.5, 6 + n * 5, 3); ctx.restore()
      } else {
        ctx.fillStyle = 'rgba(255,240,200,0.9)'
        ctx.beginPath(); ctx.arc(xx, y, 1.2 + n * 2, 0, 7); ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }
}

/** Screen-space: glow rising from the depths and a vignette that tightens with speed. */
export function drawScreenFx(ctx: CanvasRenderingContext2D, w: World, cw: number, ch: number) {
  const speed = Math.min(1, w.fallV / 320)
  const g = ctx.createLinearGradient(0, ch * 0.55, 0, ch)
  g.addColorStop(0, 'rgba(70,130,220,0)'); g.addColorStop(1, `rgba(90,150,235,${0.05 + 0.22 * speed})`)
  ctx.fillStyle = g; ctx.fillRect(0, ch * 0.55, cw, ch * 0.45)
  const v = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * (0.46 - 0.12 * speed), cw / 2, ch / 2, Math.max(cw, ch) * 0.78)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.35 + 0.3 * speed})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, cw, ch)
}
