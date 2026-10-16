// The sprites for the world's objects: rich, palette-driven SVG (world/art/objects.ts) rasterised once per palette, plus their live overlays.
// The first flat icons live on as prototypes in propArt.prototype.ts.
import { ART, type ArtDef, type ArtId } from './art/objects'
import { paletteFor, type Palette } from './palette'

export type { ArtId }
const cache = new Map<string, HTMLImageElement | 'loading'>()
const load = (key: string, svg: string): HTMLImageElement | null => {
  const hit = cache.get(key)
  if (hit && hit !== 'loading') return hit
  if (hit || typeof Image === 'undefined') return null
  cache.set(key, 'loading')
  const img = new Image(); img.onload = () => cache.set(key, img); img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
  return null
}
/** The sprite once it has loaded (it starts loading on the first call); null until then. */
export const propImage = (id: ArtId, p: Palette = paletteFor()): HTMLImageElement | null => load(`${id}|${p.key}`, ART[id].svg(p))
const spinImage = (id: ArtId, i: number, p: Palette): HTMLImageElement | null => { const s = ART[id].spin?.[i]; return s ? load(`${id}#${i}|${p.key}`, s.svg(p)) : null }

/** Draws an object centred on the origin at `size` world units: the sprite, its spinning parts, then its live overlay. */
export function drawProp(c: CanvasRenderingContext2D, id: ArtId, size: number, t: number, p: Palette, hot: boolean, still = false) {
  const def: ArtDef = ART[id], img = propImage(id, p)
  if (!img) return
  c.drawImage(img, -size / 2, -size / 2, size, size)
  const k = size / 160
  def.spin?.forEach((s, i) => {
    const im = spinImage(id, i, p); if (!im) return
    c.save(); c.translate((s.cx - 80) * k, (s.cy - 80) * k); c.rotate(still ? 0 : t * s.rps * Math.PI * 2 + i); c.drawImage(im, -size / 2 + (80 - 80) * k, -size / 2, size, size); c.restore()
  })
  if (def.fx) { c.save(); c.translate(-size / 2, -size / 2); c.scale(k, k); def.fx(c, still ? 0 : t, p, hot); c.restore() }
}
/** Every sprite as SVG for a palette (tests and the contact sheet). */
export const PROP_ART = Object.fromEntries((Object.keys(ART) as ArtId[]).map(id => [id, ART[id].svg(paletteFor())])) as Record<ArtId, string>
export { ART }
