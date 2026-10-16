// Shader packs: whole-screen colour grading and film effects, applied as one overlay above every page. Render-only.
// Each pack is data; `packStyle` turns it into the overlay's CSS so it can be tested without a browser.
export interface ShaderPack {
  id: string; name: string; note: string
  /** CSS backdrop-filter that regrades everything underneath. */
  grade: string
  vignette: number    // 0..1 darkening at the edges
  scan: number        // 0..1 scanline strength
  grain: number       // 0..1 film grain strength
  tint?: string       // a soft wash over the whole screen
}

export const SHADER_PACKS: readonly ShaderPack[] = [
  { id: 'none', name: 'Off', note: 'The game as drawn.', grade: '', vignette: 0, scan: 0, grain: 0 },
  { id: 'tube', name: 'Tube', note: 'An old monitor: scanlines and a soft edge.', grade: 'contrast(1.06) saturate(1.1)', vignette: .45, scan: .22, grain: .05 },
  { id: 'noir', name: 'Noir', note: 'Black and white, hard light, film grain.', grade: 'grayscale(1) contrast(1.25) brightness(.95)', vignette: .5, scan: 0, grain: .16 },
  { id: 'neon', name: 'Neon', note: 'Saturated, glowing, a little electric.', grade: 'saturate(1.55) contrast(1.12) brightness(1.04)', vignette: .25, scan: .08, grain: 0, tint: 'rgba(120,60,255,.07)' },
  { id: 'dream', name: 'Dream', note: 'Soft light and a warm haze.', grade: 'blur(.5px) saturate(1.2) brightness(1.08)', vignette: .3, scan: 0, grain: .04, tint: 'rgba(255,170,200,.1)' },
  { id: 'ember', name: 'Ember', note: 'Warm and dim, like the fall at dusk.', grade: 'sepia(.35) saturate(1.3) contrast(1.08) brightness(.95)', vignette: .4, scan: 0, grain: .06, tint: 'rgba(255,110,40,.08)' },
]
export const SHADER_IDS = SHADER_PACKS.map(p => p.id)
export const packById = (id: string): ShaderPack => SHADER_PACKS.find(p => p.id === id) ?? SHADER_PACKS[0]!

/** Film grain as an SVG noise tile; `k` (0..1) scales how visible it is. */
const grainTile = (k: number) => `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${(k * 2).toFixed(3)} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

/** The overlay's inline style for a pack. `reduce` drops the busy parts (scanlines, grain) and keeps the grade. */
export function packStyle(pack: ShaderPack, reduce = false): { display: string; backdropFilter: string; background: string } {
  if (pack.id === 'none') return { display: 'none', backdropFilter: '', background: '' }
  const layers: string[] = []
  if (pack.vignette > 0) layers.push(`radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(0,0,0,${pack.vignette.toFixed(2)}) 100%)`)
  if (pack.scan > 0 && !reduce) layers.push(`repeating-linear-gradient(0deg,rgba(0,0,0,${pack.scan.toFixed(2)}) 0 1px,rgba(0,0,0,0) 1px 3px)`)
  if (pack.tint) layers.push(`linear-gradient(${pack.tint},${pack.tint})`)
  if (pack.grain > 0 && !reduce) layers.push(grainTile(pack.grain))
  return { display: 'block', backdropFilter: pack.grade, background: layers.join(',') }
}

let overlay: HTMLDivElement | null = null
/** Apply a pack to the page. Safe to call again with a new id; one overlay element serves every screen. */
export function applyShaderPack(id: string, reduce = false): void {
  if (typeof document === 'undefined') return
  if (!overlay) {
    overlay = document.createElement('div'); overlay.setAttribute('aria-hidden', 'true'); overlay.dataset.pf = 'shader-pack'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:54;pointer-events:none;display:none'
    document.body.append(overlay)
  }
  const st = packStyle(packById(id), reduce)
  overlay.style.display = st.display
  overlay.style.setProperty('backdrop-filter', st.backdropFilter); overlay.style.setProperty('-webkit-backdrop-filter', st.backdropFilter)
  overlay.style.background = st.background
  if (overlay.style.background && st.background.includes('url(')) overlay.style.backgroundBlendMode = 'normal'
}
