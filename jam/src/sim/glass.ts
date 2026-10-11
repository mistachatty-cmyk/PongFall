// Glass panes as objects with crack networks. Pure and deterministic: the same (seed, side, hit)
// always gives the same cracks, so the renderer and the shard spawner agree without storing geometry.
import * as D from './detmath'
import { mulberry32 } from './world'

export const PANE_W = 56
export interface Crack { pts: Array<[number, number]>; w: number }   // pane-local: u across (-W/2..W/2), v along the pane

function rngFor(seed: number, side: number, hit: number, y: number) {
  const h = (Math.imul(seed | 0, 73856093) ^ Math.imul(side + 1, 19349663) ^ Math.imul(hit + 1, 83492791) ^ Math.imul(Math.round(y) | 0, 2654435761)) >>> 0
  return mulberry32(h)
}

function walk(r: () => number, from: [number, number], ang: number, len: number, segs: number, H: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [from]
  let [u, v] = from, a = ang
  const step = len / segs, hu = PANE_W / 2, hv = H / 2
  for (let i = 0; i < segs; i++) {
    a += (r() - 0.5) * 1.0
    let nu = u + D.cos(a) * step * 0.55   // the pane is narrow, so cracks run mostly along it
    let nv = v + D.sin(a) * step * 1.5
    if (Math.abs(nu) > hu) { nu = Math.sign(nu) * hu; a = Math.PI - a }
    nv = Math.max(-hv, Math.min(hv, nv))
    u = nu; v = nv
    pts.push([u, v])
  }
  return pts
}

/** The cracks one hit adds to a pane, radiating from the impact point. hit is the 0-based hit index. */
export function crackNetwork(seed: number, side: number, hit: number, y: number, H: number): Crack[] {
  const r = rngFor(seed, side, hit, y)
  const out: Crack[] = []
  const origin: [number, number] = [0, Math.max(-H / 2, Math.min(H / 2, y))]
  const nMain = 5 + hit
  for (let k = 0; k < nMain; k++) {
    const ang = (k / nMain) * Math.PI * 2 + (r() - 0.5) * 0.8
    const pts = walk(r, origin, ang, 70 + r() * 160, 4 + Math.floor(r() * 4), H)
    out.push({ pts, w: 1.5 })
    for (let j = 1; j < pts.length; j++) {
      if (r() < 0.38) {
        const sgn = r() < 0.5 ? -1 : 1
        out.push({ pts: walk(r, pts[j]!, ang + sgn * (0.6 + r() * 0.7), 20 + r() * 55, 2 + Math.floor(r() * 2), H), w: 0.9 })
      }
    }
  }
  for (let k = 0; k < 6 + hit * 2; k++) {
    out.push({ pts: walk(r, origin, r() * Math.PI * 2, 10 + r() * 24, 2, H), w: 0.6 })
  }
  return out
}

export interface ShardOrigin { u: number; v: number; k: number; size: number }

/** Where the pane's shards come from: the vertices of its crack network, so it breaks along the cracks. */
export function shardOrigins(seed: number, side: number, hitYs: number[], H: number, n: number): ShardOrigin[] {
  const verts: Array<[number, number]> = []
  hitYs.forEach((y, i) => { for (const c of crackNetwork(seed, side, i, y, H)) for (const p of c.pts) verts.push(p) })
  const r = rngFor(seed, side, 99, hitYs.length)
  const out: ShardOrigin[] = []
  for (let i = 0; i < n; i++) {
    const p = verts.length ? verts[Math.floor(r() * verts.length)]! : ([0, (r() - 0.5) * H] as [number, number])
    out.push({ u: p[0] + (r() - 0.5) * 10, v: p[1] + (r() - 0.5) * 10, k: Math.floor(r() * 1e6), size: 7 + r() * 11 })
  }
  return out
}
