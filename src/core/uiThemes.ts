// UI themes: one token set per theme, turned into one override stylesheet. Themes are cosmetic and some are earned.
export interface UiTheme {
  id: string; name: string; note: string
  tokens: { bg: string; panel: string; text: string; accent: string; accent2: string; border: string; font: string }
  unlock: { falls?: number; wins?: number; note: string }
}

export const UI_THEMES: readonly UiTheme[] = [
  { id: 'default', name: 'Shaft', note: 'The original blue shaft.', tokens: { bg: '', panel: '', text: '', accent: '', accent2: '', border: '', font: '' }, unlock: { note: 'Always' } },
  { id: 'terminal', name: 'Terminal', note: 'Green phosphor and monospace.', tokens: { bg: '#020a04', panel: '#06140a', text: '#b8ffc8', accent: '#4dff88', accent2: '#e8ff7a', border: '#1f6b3a', font: 'ui-monospace,Menlo,Consolas,monospace' }, unlock: { falls: 3, note: 'Finish 3 falls' } },
  { id: 'paper', name: 'Paper', note: 'Light and quiet, for daytime.', tokens: { bg: '#efe9db', panel: '#f8f4e8', text: '#2a2a35', accent: '#1b6ba8', accent2: '#b86a00', border: '#b9b09a', font: 'Georgia,"Times New Roman",serif' }, unlock: { note: 'Always' } },
  { id: 'neon', name: 'Neon', note: 'Magenta and cyan after dark.', tokens: { bg: '#08040f', panel: '#120820', text: '#f0e6ff', accent: '#ff4fd8', accent2: '#4ff0ff', border: '#6b2a8f', font: '' }, unlock: { wins: 1, note: 'Win a match' } },
  { id: 'gold', name: 'Lok Gold', note: 'Warm brass, for LOK supporters and collectors.', tokens: { bg: '#0d0904', panel: '#1a1208', text: '#ffeccb', accent: '#ffc857', accent2: '#ffe9a8', border: '#7a5a1c', font: '' }, unlock: { falls: 10, note: 'Finish 10 falls' } },
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
export function themeCss(t: UiTheme): string {
  const k = t.tokens
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
export function applyUiTheme(id: string, prog: { falls: number; wins: number }): UiTheme {
  const t = resolveTheme(id, prog)
  if (typeof document === 'undefined') return t
  if (!style) { style = document.createElement('style'); style.id = 'pf-ui-theme'; document.head.append(style) }
  style.textContent = themeCss(t)
  document.documentElement.dataset.uiTheme = t.id
  return t
}
