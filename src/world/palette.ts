// The colours of the world's objects, derived from a handful of theme colours so every theme gets a full, consistent material set
// (metal ramp, brass, glass, enamel, lamps). Pure and tested; the art (propArt.ts) and the plaques (objectField.ts) read it.

export type Plaque = 'steel' | 'brass' | 'glass' | 'paper'
export interface WorldLook {
  /** Mid tone of the metal; the ramp is derived from it. */
  metal: string
  accent: string; accent2: string; lamp: string; paper: string
  /** The finish of hanging plaques. */
  plaque: Plaque
}
export interface Palette {
  key: string
  /** Metal ramp from lit edge to shadow. */
  steel: readonly [string, string, string, string]
  brass: readonly [string, string, string]
  deep: string
  accent: string; accent2: string; lamp: string; danger: string; paper: string; ink: string; glass: string
  plaque: { top: string; bottom: string; edge: string; locked: string; lockedEdge: string; text: string; sub: string; hot: string; gold: string; danger: string; rim: string; finish: Plaque }
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgbToHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map(v => Math.round(clamp(v / 255) * 255).toString(16).padStart(2, '0')).join('')
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
/** Lighten (amt > 0) or darken (amt < 0) a colour by moving its lightness, keeping hue. */
export function shade(hex: string, amt: number): string { const [h, s, l] = rgbToHsl(...hexToRgb(hex)); return hslToHex(h, s, clamp(l + amt)) }
export function mix(a: string, b: string, t: number): string { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }
/** Rotate hue and scale saturation. */
export function tint(hex: string, hueDeg: number, satMul = 1): string { const [h, s, l] = rgbToHsl(...hexToRgb(hex)); return hslToHex(h + hueDeg, s * satMul, l) }
export const rgba = (hex: string, a: number): string => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})` }
export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

export const DEFAULT_LOOK: WorldLook = { metal: '#5f7596', accent: '#6fb1ff', accent2: '#8cece6', lamp: '#ffe08a', paper: '#e9dfc4', plaque: 'steel' }

/** The full palette for a look. `accent` overrides the look's accent (the player's own colour choice). */
export function paletteFor(look: WorldLook = DEFAULT_LOOK, accent?: string): Palette {
  const acc = accent && isHex(accent) ? accent : look.accent
  const m = look.metal, [mh, ms] = rgbToHsl(...hexToRgb(m))
  const steel = [hslToHex(mh, ms * 0.55, 0.78), hslToHex(mh, ms * 0.8, 0.58), m, hslToHex(mh, ms, 0.2)] as const
  const brass = ['#f3d58a', '#c79a3a', '#6e4c14'] as const
  const deep = hslToHex(mh, ms * 0.9, 0.09)
  const danger = '#ff8d9e'
  const ink = hslToHex(mh, ms * 0.6, 0.07)
  const f = look.plaque
  const tops: Record<Plaque, [string, string, string]> = {
    steel: [shade(m, -0.28), shade(m, -0.4), acc],
    brass: [mix('#5a4012', m, 0.15), '#2b1d07', brass[1]],
    glass: [rgba(mix(m, '#ffffff', 0.35), 0.28) as string, rgba(mix(m, '#000000', 0.5), 0.55) as string, mix(acc, '#ffffff', 0.35)],
    paper: [mix(look.paper, '#ffffff', 0.25), mix(look.paper, m, 0.25), mix(m, '#000000', 0.2)],
  }
  const [top, bottom, edge] = tops[f]
  const lightPlaque = f === 'paper'
  return {
    key: [m, acc, look.accent2, look.lamp, look.paper, f].join('|'),
    steel, brass, deep, accent: acc, accent2: look.accent2, lamp: look.lamp, danger, paper: look.paper, ink, glass: mix(acc, '#cfe9ff', 0.5),
    plaque: { top, bottom, edge, locked: shade(m, -0.33), lockedEdge: shade(m, -0.05), text: lightPlaque ? '#1c1a16' : '#eaf3ff', sub: lightPlaque ? '#4a4a55' : mix(acc, '#ffffff', 0.4), hot: look.accent2, gold: look.lamp, danger, rim: shade(m, 0.2), finish: f },
  }
}
