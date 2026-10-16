// The palette the world's objects are drawn in right now: the chosen theme (or the default if it is still locked), your own accent colour and plaque
// finish on top. Cached; rebuilt when the look changes (the `pongfall-look` event the settings panel already sends).
import { loadSettings } from '../core/settingsStore'
import { resolveTheme } from '../core/uiThemes'
import { paletteFor, type Palette } from './palette'

let cached: Palette | null = null
let progress: () => { falls: number; wins: number } = () => ({ falls: 0, wins: 0 })
/** main.ts hands over the earned progress (kept out of this module so it stays free of the network code). */
export const setLookProgress = (fn: () => { falls: number; wins: number }) => { progress = fn; cached = null }
const stale = () => { cached = null }
if (typeof window !== 'undefined') window.addEventListener('pongfall-look', stale)

export function lookPalette(): Palette {
  if (cached) return cached
  const s = loadSettings(), theme = resolveTheme(s.uiTheme, progress())
  cached = paletteFor({ ...theme.look, plaque: s.uiPlaque === 'auto' ? theme.look.plaque : s.uiPlaque }, s.uiAccent || undefined)
  return cached
}
export const refreshLook = stale
