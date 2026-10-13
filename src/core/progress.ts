// Progression: each finished match is a fall and opens a new piece of the game.
export const MODE_ORDER = ['solo-fall', 'classic', 'timed', 'sandbox', 'versus', 'versus-timed'] as const
export const MULTIPLAYER_MODES = ['versus', 'versus-timed']
export const FALLS_FOR_MULTIPLAYER = 1

const MODE_FALL: Record<string, number> = {
  'solo-fall': 0, versus: 1, classic: 2, timed: 4, sandbox: 7, 'versus-timed': 10,
}
const DIFFICULTY_FALL: Record<string, number> = { chill: 0, casual: 3, sharp: 6, relentless: 9 }
const ARENA_FALL: Record<number, number> = { 0: 0, 1: 5, 3: 8, 5: 11 }

export interface Progress { falls: number; menuUnlocked: boolean }
export const freshProgress = (): Progress => ({ falls: 0, menuUnlocked: false })
const fallsOf = (p: Progress) => Math.max(0, Math.floor(p.falls))

/** The first visit is deliberately small. After the first match, locked options become visible. */
export function visibleModes(p: Progress, all = false): string[] {
  if (all || fallsOf(p) > 0) return [...MODE_ORDER]
  return ['solo-fall']
}
export function visibleDifficulties(p: Progress, all = false): string[] {
  return all || fallsOf(p) > 0 ? Object.keys(DIFFICULTY_FALL) : ['chill']
}
export function visibleArenas(p: Progress, all = false): number[] {
  return all || fallsOf(p) > 0 ? [0, 1, 3, 5] : [0]
}
export function unlockedModes(p: Progress, all = false): string[] {
  if (all) return [...MODE_ORDER]
  const f = fallsOf(p)
  return MODE_ORDER.filter(id => (MODE_FALL[id] ?? Infinity) <= f)
}
export function unlockedDifficulties(p: Progress, all = false): string[] {
  if (all) return Object.keys(DIFFICULTY_FALL)
  return Object.keys(DIFFICULTY_FALL).filter(id => DIFFICULTY_FALL[id]! <= fallsOf(p))
}
export function unlockedArenas(p: Progress, all = false): number[] {
  if (all) return [0, 1, 3, 5]
  return [0, 1, 3, 5].filter(n => ARENA_FALL[n]! <= fallsOf(p))
}
export const isModeUnlocked = (p: Progress, mode: string, all = false) => unlockedModes(p, all).includes(mode)
export const multiplayerUnlocked = (p: Progress, all = false) => all || fallsOf(p) >= FALLS_FOR_MULTIPLAYER

export function lockHint(p: Progress, id: string, all = false): string {
  if (all) return ''
  const need = MODE_FALL[id]
  if (need === undefined || need <= fallsOf(p)) return ''
  const n = need - fallsOf(p)
  return `Opens after ${n} more fall${n === 1 ? '' : 's'}`
}
export function difficultyLockHint(p: Progress, id: string, all = false): string {
  if (all) return ''
  const need = DIFFICULTY_FALL[id]
  if (need === undefined || need <= fallsOf(p)) return ''
  const n = need - fallsOf(p)
  return `Opens after ${n} more fall${n === 1 ? '' : 's'}`
}
export function arenaLockHint(p: Progress, n: number, all = false): string {
  if (all) return ''
  const need = ARENA_FALL[n]
  if (need === undefined || need <= fallsOf(p)) return ''
  const left = need - fallsOf(p)
  return `Opens after ${left} more fall${left === 1 ? '' : 's'}`
}

export const recordFall = (p: Progress): Progress => ({ falls: p.falls + 1, menuUnlocked: true })
export function recordCompletedMatch(p: Progress, result: { experimental?: boolean } | null): Progress {
  return result && !result.experimental ? recordFall(p) : p
}

const KEY = 'pongfall.progress'
export function sanitizeProgress(raw: unknown): Progress {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const falls = typeof r.falls === 'number' && isFinite(r.falls) && r.falls >= 0 ? Math.min(999, Math.floor(r.falls)) : 0
  return { falls, menuUnlocked: r.menuUnlocked === true || falls > 0 }
}
export function loadProgress(): Progress { try { return sanitizeProgress(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { return freshProgress() } }
export function saveProgress(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }
