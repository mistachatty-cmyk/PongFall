// Lens: a render-only colour filter over the whole game, unlocked by the first win. Never feeds the sim.
export interface LensDef { id: string; label: string; css: string }

export const LENSES: LensDef[] = [
  { id: 'none', label: 'Clear', css: '' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.25)' },
  { id: 'sepia', label: 'Old Film', css: 'sepia(.9) contrast(1.05)' },
  { id: 'neon', label: 'Neon', css: 'saturate(2.2) contrast(1.2) brightness(1.1)' },
  { id: 'infrared', label: 'Infrared', css: 'sepia(.4) saturate(3) hue-rotate(-50deg) contrast(1.1)' },
  { id: 'frost', label: 'Frost', css: 'saturate(.7) brightness(1.1) hue-rotate(160deg)' },
  { id: 'night', label: 'Night Vision', css: 'grayscale(1) sepia(1) hue-rotate(50deg) saturate(3) brightness(1.15)' },
  { id: 'negative', label: 'Negative', css: 'invert(1) hue-rotate(180deg)' },
  { id: 'dream', label: 'Dream', css: 'blur(.6px) saturate(1.5) brightness(1.1) contrast(.9)' },
]
export const LENS_IDS = LENSES.map(l => l.id)

export const clampHue = (v: unknown) => typeof v === 'number' && isFinite(v) ? ((Math.round(v) % 360) + 360) % 360 : 0

/** The CSS `filter` value for a lens plus a hue shift in degrees ('' = no filter). */
export function lensFilter(id: string, hue: number): string {
  const parts = [LENSES.find(l => l.id === id)?.css ?? '']
  const h = clampHue(hue)
  if (h) parts.push(`hue-rotate(${h}deg)`)
  return parts.filter(Boolean).join(' ')
}

const KEY = 'pongfall.lensUnlocked'
export const isLensUnlocked = (): boolean => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
export const unlockLens = (): boolean => { if (isLensUnlocked()) return false; try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } return true }
