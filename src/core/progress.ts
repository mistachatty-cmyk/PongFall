// Progression: every finished match is a "fall". Falls open the main menu, then modes one by one, then multiplayer. Pure + a tiny storage wrapper.
export const MODE_ORDER = ['solo-fall', 'classic', 'timed', 'sandbox', 'versus', 'versus-timed'] as const
export const MULTIPLAYER_MODES = ['versus', 'versus-timed']
export const FALLS_FOR_MULTIPLAYER = 4

export interface Progress { falls: number; menuUnlocked: boolean }
export const freshProgress = (): Progress => ({ falls: 0, menuUnlocked: false })

/** Solo Fall is always open; each fall opens the next of Classic, Timed, Sandbox; the 4th fall opens multiplayer. */
export function unlockedModes(p: Progress, all = false): string[] {
  if (all) return [...MODE_ORDER]
  const f = Math.max(0, Math.floor(p.falls))
  const solo = MODE_ORDER.slice(0, Math.min(4, f + 1)) as string[]
  return f >= FALLS_FOR_MULTIPLAYER ? [...solo, ...MULTIPLAYER_MODES] : solo
}
export const isModeUnlocked = (p: Progress, mode: string, all = false) => unlockedModes(p, all).includes(mode)
export const multiplayerUnlocked = (p: Progress, all = false) => all || p.falls >= FALLS_FOR_MULTIPLAYER

/** Short reason a mode is locked ('' when it is open). */
export function lockHint(p: Progress, mode: string, all = false): string {
  if (isModeUnlocked(p, mode, all)) return ''
  if (MULTIPLAYER_MODES.includes(mode)) { const n = FALLS_FOR_MULTIPLAYER - p.falls; return `Multiplayer opens after ${n} more fall${n === 1 ? '' : 's'}` }
  const need = (MODE_ORDER as readonly string[]).indexOf(mode)
  const n = need - p.falls
  return `Opens after ${n} more fall${n === 1 ? '' : 's'}`
}

export const recordFall = (p: Progress): Progress => ({ falls: p.falls + 1, menuUnlocked: true })

const KEY = 'pongfall.progress'
export function sanitizeProgress(raw: unknown): Progress {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const falls = typeof r.falls === 'number' && isFinite(r.falls) && r.falls >= 0 ? Math.min(999, Math.floor(r.falls)) : 0
  return { falls, menuUnlocked: r.menuUnlocked === true || falls > 0 }
}
export function loadProgress(): Progress { try { return sanitizeProgress(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { return freshProgress() } }
export function saveProgress(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }
