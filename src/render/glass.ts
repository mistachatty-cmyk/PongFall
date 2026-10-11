// Glass panes drawn as objects: a slab with a persistent crack network that grows with every hit.
import { World, SideIndex, glassLimit } from '../sim/world'
import { crackNetwork, PANE_W, Crack } from '../sim/glass'
import { hash2 } from './fog'

const cache = new Map<string, Crack[]>()
function network(seed: number, side: number, hit: number, y: number, H: number) {
  const key = `${seed}:${side}:${hit}:${Math.round(y)}:${Math.round(H)}`
  let c = cache.get(key)
  if (!c) { if (cache.size > 200) cache.clear(); c = crackNetwork(seed, side, hit, y, H); cache.set(key, c) }
  return c
}

function strokeCrack(ctx: CanvasRenderingContext2D, c: Crack, ox: number, partial: number) {
  const n = Math.max(1, Math.ceil((c.pts.length - 1) * partial))
  ctx.beginPath(); ctx.moveTo(ox + c.pts[0]![0], c.pts[0]![1])
  for (let i = 1; i <= n && i < c.pts.length; i++) {
    const p = c.pts[i]!, q = c.pts[i - 1]!
    if (i === n && partial < 1) { const f = (c.pts.length - 1) * partial - (n - 1); ctx.lineTo(ox + q[0] + (p[0] - q[0]) * f, q[1] + (p[1] - q[1]) * f) }
    else ctx.lineTo(ox + p[0], p[1])
  }
  ctx.stroke()
}

/** Draw one intact pane centred on x = edgeX (the pane is PANE_W wide). */
export function drawPane(ctx: CanvasRenderingContext2D, w: World, i: SideIndex, edgeX: number, H: number) {
  const side = w.sides[i]
  const s = i === 0 ? -1 : 1
  const x0 = edgeX - PANE_W / 2
  const age = (w.tick - side.hitTick) / 120
  const flash = age >= 0 && age < 0.3 ? 1 - age / 0.3 : 0
  const shiver = flash * Math.sin(age * 120) * 1.4
  ctx.save()
  ctx.translate(shiver, 0)
  // the slab: a cool gradient with a bright left rim
  const g = ctx.createLinearGradient(x0, 0, x0 + PANE_W, 0)
  g.addColorStop(0, `rgba(190,225,255,${0.2 + 0.2 * flash})`); g.addColorStop(0.5, `rgba(120,180,240,${0.1 + 0.15 * flash})`); g.addColorStop(1, `rgba(170,210,250,${0.18 + 0.15 * flash})`)
  ctx.fillStyle = g; ctx.fillRect(x0, -H / 2, PANE_W, H)
  // diagonal sheen
  const sh = ctx.createLinearGradient(x0, -H / 2, x0 + PANE_W, -H / 2 + PANE_W * 3)
  sh.addColorStop(0, 'rgba(255,255,255,0.0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.10)'); sh.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sh; ctx.fillRect(x0, -H / 2, PANE_W, H)
  ctx.strokeStyle = 'rgba(210,235,255,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, -H / 2, PANE_W, H)

  // cracks: a dark gap, a bright core, and a refraction fringe; the newest hit grows outward
  ctx.save()
  ctx.beginPath(); ctx.rect(x0, -H / 2, PANE_W, H); ctx.clip()
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  side.hitYs.forEach((y, hit) => {
    const grow = hit === side.hitYs.length - 1 ? Math.min(1, Math.max(0.05, age / 0.16)) : 1
    for (const c of network(w.seed, i, hit, y, H)) {
      ctx.strokeStyle = 'rgba(6,10,18,0.55)'; ctx.lineWidth = c.w + 2.2; strokeCrack(ctx, c, edgeX, grow)
      ctx.strokeStyle = 'rgba(90,150,235,0.45)'; ctx.lineWidth = c.w + 0.8; ctx.save(); ctx.translate(0.8 * -s, 0.8); strokeCrack(ctx, c, edgeX, grow); ctx.restore()
      ctx.strokeStyle = `rgba(235,246,255,${0.8 + 0.2 * flash})`; ctx.lineWidth = c.w * 0.7; strokeCrack(ctx, c, edgeX, grow)
    }
    // chips and a bright star at the impact
    ctx.fillStyle = 'rgba(240,250,255,0.9)'
    for (let k = 0; k < 7; k++) {
      const a = hash2(hit * 7 + k, Math.round(y)) * 6.28, d = 3 + hash2(k, hit + 3) * 9
      ctx.beginPath(); ctx.moveTo(edgeX + Math.cos(a) * d, y + Math.sin(a) * d)
      ctx.lineTo(edgeX + Math.cos(a + 0.5) * (d + 4), y + Math.sin(a + 0.5) * (d + 4)); ctx.lineTo(edgeX + Math.cos(a - 0.5) * (d + 4), y + Math.sin(a - 0.5) * (d + 4)); ctx.fill()
    }
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * flash})`
    ctx.beginPath(); ctx.arc(edgeX, y, 3 + 5 * flash, 0, 7); ctx.fill()
  })
  ctx.restore()
  ctx.restore()
}

/** The jagged frame left behind once a pane is gone. */
export function drawBrokenFrame(ctx: CanvasRenderingContext2D, w: World, i: SideIndex, edgeX: number, H: number) {
  const x0 = edgeX - PANE_W / 2
  ctx.fillStyle = 'rgba(190,225,255,0.5)'
  const n = 14
  for (const top of [true, false]) {
    for (let k = 0; k < n; k++) {
      const h = hash2(k + (top ? 0 : 50), i + 11)
      if (h < 0.35) continue
      const x = x0 + (k / n) * PANE_W, ww = PANE_W / n
      const len = 6 + h * 28
      ctx.beginPath()
      if (top) { ctx.moveTo(x, -H / 2); ctx.lineTo(x + ww, -H / 2); ctx.lineTo(x + ww * 0.5, -H / 2 + len) }
      else { ctx.moveTo(x, H / 2); ctx.lineTo(x + ww, H / 2); ctx.lineTo(x + ww * 0.5, H / 2 - len) }
      ctx.fill()
    }
  }
  ctx.fillStyle = 'rgba(190,225,255,0.18)'
  const jag = 30
  for (let y = -H / 2; y < H / 2; y += jag) {
    const h = hash2(Math.round(y / jag), i + 23)
    ctx.beginPath(); ctx.moveTo(x0 + (i === 0 ? 0 : PANE_W), y); ctx.lineTo(x0 + (i === 0 ? 0 : PANE_W) + (i === 0 ? 1 : -1) * (3 + h * 8), y + jag / 2); ctx.lineTo(x0 + (i === 0 ? 0 : PANE_W), y + jag); ctx.fill()
  }
}

/** Draw a shard as its own irregular polygon. */
export function drawShard(ctx: CanvasRenderingContext2D, k: number, size: number) {
  const n = 4 + (k % 2)
  ctx.beginPath()
  for (let v = 0; v < n; v++) {
    const a = (v / n) * 6.283 + hash2(k, v) * 0.7, r = size * (0.45 + hash2(v, k) * 0.7)
    if (v === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke()
}

export { glassLimit }
