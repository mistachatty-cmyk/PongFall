// UI themes: one token set per theme, turned into one override stylesheet, plus a `look` that colours the world's own objects (world/palette.ts).
// Themes are cosmetic and some are earned.
import { DEFAULT_LOOK, isHex, type WorldLook } from '../world/palette'
export interface UiTheme {
  id: string; name: string; note: string
  look: WorldLook
  tokens: { bg: string; panel: string; text: string; accent: string; accent2: string; border: string; font: string }
  unlock: { falls?: number; wins?: number; note: string }
}

export const UI_THEMES: readonly UiTheme[] = [
  { id: 'default', name: 'Shaft', note: 'The original blue shaft.', look: DEFAULT_LOOK, tokens: { bg: '', panel: '', text: '', accent: '', accent2: '', border: '', font: '' }, unlock: { note: 'Always' } },
  { id: 'terminal', name: 'Terminal', note: 'Green phosphor and monospace.', look: { metal: '#2f5a3d', accent: '#4dff88', accent2: '#e8ff7a', lamp: '#b8ffc8', paper: '#cfe8cf', plaque: 'steel' }, tokens: { bg: '#020a04', panel: '#06140a', text: '#b8ffc8', accent: '#4dff88', accent2: '#e8ff7a', border: '#1f6b3a', font: 'ui-monospace,Menlo,Consolas,monospace' }, unlock: { falls: 3, note: 'Finish 3 falls' } },
  { id: 'paper', name: 'Paper', note: 'Light and quiet, for daytime.', look: { metal: '#8a8068', accent: '#1b6ba8', accent2: '#b86a00', lamp: '#b86a00', paper: '#f4eedd', plaque: 'paper' }, tokens: { bg: '#efe9db', panel: '#f8f4e8', text: '#2a2a35', accent: '#1b6ba8', accent2: '#b86a00', border: '#b9b09a', font: 'Georgia,"Times New Roman",serif' }, unlock: { note: 'Always' } },
  { id: 'neon', name: 'Neon', note: 'Magenta and cyan after dark.', look: { metal: '#5a3a7a', accent: '#ff4fd8', accent2: '#4ff0ff', lamp: '#ffe14f', paper: '#efe3ff', plaque: 'glass' }, tokens: { bg: '#08040f', panel: '#120820', text: '#f0e6ff', accent: '#ff4fd8', accent2: '#4ff0ff', border: '#6b2a8f', font: '' }, unlock: { wins: 1, note: 'Win a match' } },
  { id: 'gold', name: 'Lok Gold', note: 'Warm brass, for LOK supporters and collectors.', look: { metal: '#8a6a2c', accent: '#ffc857', accent2: '#ffe9a8', lamp: '#ffd36b', paper: '#f3e4c0', plaque: 'brass' }, tokens: { bg: '#0d0904', panel: '#1a1208', text: '#ffeccb', accent: '#ffc857', accent2: '#ffe9a8', border: '#7a5a1c', font: '' }, unlock: { falls: 10, note: 'Finish 10 falls' } },
  { id: 'frost', name: 'Frostglass', note: 'Pale ice, clear glass and cold light.', look: { metal: '#7fa0b8', accent: '#7fd6ff', accent2: '#d9f4ff', lamp: '#ffffff', paper: '#eaf4fb', plaque: 'glass' }, tokens: { bg: '#07121a', panel: '#0e1f2b', text: '#e6f6ff', accent: '#7fd6ff', accent2: '#d9f4ff', border: '#3d6f8a', font: '' }, unlock: { falls: 3, note: 'Finish 3 falls' } },
  { id: 'dusk', name: 'Dusk', note: 'Violet steel under an amber sky.', look: { metal: '#6a4a78', accent: '#ff9a5a', accent2: '#ffd2a0', lamp: '#ffb36b', paper: '#f0dcc8', plaque: 'steel' }, tokens: { bg: '#120a16', panel: '#1f1226', text: '#ffe9d6', accent: '#ff9a5a', accent2: '#ffd2a0', border: '#7a4a6e', font: '' }, unlock: { falls: 5, note: 'Finish 5 falls' } },
  { id: 'blueprint', name: 'Blueprint', note: 'Drafting paper and white linework.', look: { metal: '#2c4f86', accent: '#9cc7ff', accent2: '#ffffff', lamp: '#ffd35a', paper: '#cfe0ff', plaque: 'paper' }, tokens: { bg: '#0a1a3a', panel: '#10285a', text: '#e8f1ff', accent: '#9cc7ff', accent2: '#ffffff', border: '#5a86c8', font: 'ui-monospace,Menlo,Consolas,monospace' }, unlock: { falls: 8, note: 'Finish 8 falls' } },
  { id: 'verdigris', name: 'Verdigris', note: 'Weathered copper gone green.', look: { metal: '#3f7a6e', accent: '#55e0b4', accent2: '#b6ffe6', lamp: '#e8ffd0', paper: '#dcefe6', plaque: 'brass' }, tokens: { bg: '#04120f', panel: '#0a2420', text: '#d8fff2', accent: '#55e0b4', accent2: '#b6ffe6', border: '#2a7a66', font: '' }, unlock: { wins: 3, note: 'Win 3 matches' } },
  { id: 'ember', name: 'Ember', note: 'Banked coals and hot iron.', look: { metal: '#7a3a2c', accent: '#ff6a3d', accent2: '#ffb347', lamp: '#ffd27a', paper: '#f0d5c0', plaque: 'steel' }, tokens: { bg: '#140806', panel: '#241008', text: '#ffe6d6', accent: '#ff6a3d', accent2: '#ffb347', border: '#8a3a22', font: '' }, unlock: { wins: 5, note: 'Win 5 matches' } },
  { id: 'graphite', name: 'Graphite', note: 'Quiet greys, one white light.', look: { metal: '#5a5f68', accent: '#e9eef7', accent2: '#9aa6b8', lamp: '#ffffff', paper: '#d9dde4', plaque: 'steel' }, tokens: { bg: '#0b0c0f', panel: '#16181d', text: '#eef1f6', accent: '#e9eef7', accent2: '#9aa6b8', border: '#4a505c', font: '' }, unlock: { falls: 15, note: 'Finish 15 falls' } },
]
export const UI_THEME_IDS = UI_THEMES.map(t => t.id)
export const themeById = (id: string): UiTheme => UI_THEMES.find(t => t.id === id) ?? UI_THEMES[0]!
export const themeUnlocked = (t: UiTheme, prog: { falls: number; wins: number }): boolean => (t.unlock.falls ?? 0) <= prog.falls && (t.unlock.wins ?? 0) <= prog.wins
/** A locked theme quietly falls back to the default so a stale saved choice never shows something unearned. */
export const resolveTheme = (id: string, prog: { falls: number; wins: number }): UiTheme => { const t = themeById(id); return themeUnlocked(t, prog) ? t : UI_THEMES[0]! }

const SURFACES = '.pf-menu .pf-panel, [data-pf="panel"], [data-pf="pause-menu"] > div, .pf-end-panel, .as-card, .le-card, .as-item'
const BUTTONS = '.pf-menu button, [data-pf="panel"] button, [data-pf="pause-menu"] button, .pf-end-panel button, .as-btn, .le-page button, .as-root button'
const PAGES = '.as-root, .le-page'

/** The override stylesheet for a theme; empty for the default. Uses !important because most surfaces carry inline styles. */
export function themeCss(t: UiTheme, accent?: string): string {
  const k = { ...t.tokens }
  if (accent && isHex(accent)) {
    k.accent = accent
    if (!k.bg) return `.pf-menu h1,.as-root h1,.le-page h1,.as-root h2,.le-page h2{color:${accent} !important}\n.pf-menu button.on,.as-btn[aria-pressed=true],.as-btn[aria-selected=true],.le-page button[aria-pressed=true]{border-color:${accent} !important;color:${accent} !important;box-shadow:0 0 14px ${accent}55 !important}\n.pf-menu button:hover,.as-btn:hover,.le-page button:hover{border-color:${accent} !important}\n`
  }
  if (t.id === 'default' || !k.bg) return ''
  const font = k.font ? `font-family:${k.font} !important;` : ''
  return `
${PAGES}{background:${k.bg} !important;color:${k.text} !important;${font}}
.pf-menu{color:${k.text} !important;${font}}
${SURFACES}{background:${k.panel} !important;border-color:${k.border} !important;color:${k.text} !important;${font}}
${BUTTONS}{background:${k.panel} !important;color:${k.text} !important;border-color:${k.border} !important;${font}}
.pf-menu button.on,.as-btn[aria-pressed=true],.as-btn[aria-selected=true],.le-page button[aria-pressed=true]{border-color:${k.accent} !important;color:${k.accent} !important;box-shadow:0 0 14px ${k.accent}55 !important}
.pf-menu button.pf-play{border-color:${k.accent2} !important;color:${k.accent2} !important}
.pf-menu h1,.as-root h1,.le-page h1{color:${k.accent} !important}
.as-root h2,.le-page h2{color:${k.accent} !important}
.pf-menu button:hover,.as-btn:hover,.le-page button:hover{border-color:${k.accent} !important}
`
}

let style: HTMLStyleElement | null = null
export function applyUiTheme(id: string, prog: { falls: number; wins: number }, accent = ''): UiTheme {
  const t = resolveTheme(id, prog)
  if (typeof document === 'undefined') return t
  if (!style) { style = document.createElement('style'); style.id = 'pf-ui-theme'; document.head.append(style) }
  style.textContent = themeCss(t, accent)
  document.documentElement.dataset.uiTheme = t.id
  return t
}
