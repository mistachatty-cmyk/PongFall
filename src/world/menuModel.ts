// The world menu's rules, as pure data and functions: which objects exist, where they sit, what is unlocked, how the camera frames them
// and how the keyboard moves between them. No canvas and no DOM here, so all of it is tested. See worldMenu.ts for the drawing.
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../sim/data/difficulty'
import { MODES } from '../sim/data/modes'
import { MODE_ORDER, arenaLockHint, difficultyLockHint, lockHint, multiplayerUnlocked, visibleArenas, visibleDifficulties, visibleModes, type Progress } from '../core/progress'
import { ARENA_OPTIONS, arenasLabel } from '../core/settings'

export type PropId = 'jukebox' | 'stats' | 'gear' | 'easel' | 'wardrobe' | 'eye' | 'door' | 'cassette' | 'flask'
export type PropGate = 'always' | 'firstFall' | 'multiplayer'
export interface PropDef { id: PropId; label: string; hint: string; /** world offset from the arena's centre */ x: number; y: number; /** drawn size in world units */ size: number; gate: PropGate; page: boolean }

/** Props sit on fixed tethers around your arena, so the layout is stable and learnable. Offsets are in shaft units (the arena is 640 x 400). */
export const PROPS: readonly PropDef[] = [
  { id: 'jukebox', label: 'Jukebox', hint: 'Music library and playlists', x: -700, y: -400, size: 120, gate: 'always', page: false },
  { id: 'gear', label: 'Gear', hint: 'Settings, dev mode and the lab', x: 700, y: 430, size: 104, gate: 'always', page: true },
  { id: 'stats', label: 'Stat board', hint: 'Your falls, streaks and records', x: 700, y: -400, size: 124, gate: 'firstFall', page: true },
  { id: 'easel', label: 'Easel', hint: 'PongPainter: colours for everything', x: -770, y: -110, size: 118, gate: 'firstFall', page: true },
  { id: 'wardrobe', label: 'Wardrobe', hint: 'Arena Sides: dress your side of the glass', x: -770, y: 190, size: 118, gate: 'firstFall', page: true },
  { id: 'eye', label: 'Lil Eye', hint: 'Your companion: name, mood, iris', x: 770, y: -110, size: 100, gate: 'firstFall', page: true },
  { id: 'door', label: 'Door', hint: 'Multiplayer: rooms, codes and open matches', x: 770, y: 190, size: 124, gate: 'multiplayer', page: true },
  { id: 'cassette', label: 'Cassettes', hint: 'Saved matches', x: -700, y: 430, size: 104, gate: 'firstFall', page: true },
  { id: 'flask', label: 'Game Lab', hint: 'Experimental features and dev controls', x: 0, y: 540, size: 100, gate: 'firstFall', page: true },
]
/** On a tall (phone) screen the objects stack in rows above and below the arena instead of around it. */
export const isPortrait = (cw: number, ch: number): boolean => cw / ch < 0.85
const PORTRAIT: Record<PropId, { x: number; y: number }> = {
  jukebox: { x: -240, y: -400 }, stats: { x: 0, y: -400 }, gear: { x: 240, y: -400 },
  easel: { x: -240, y: 400 }, wardrobe: { x: 0, y: 400 }, eye: { x: 240, y: 400 },
  door: { x: -240, y: 570 }, cassette: { x: 0, y: 570 }, flask: { x: 240, y: 570 },
}
export const propPos = (def: PropDef, portrait: boolean): { x: number; y: number } => portrait ? PORTRAIT[def.id] : { x: def.x, y: def.y }
export const propById = (id: string): PropDef | undefined => PROPS.find(p => p.id === id)

export function visibleProps(p: Progress, unlockAll = false): PropDef[] {
  return PROPS.filter(def => def.gate === 'always' || unlockAll || (def.gate === 'firstFall' && p.falls >= 1) || (def.gate === 'multiplayer' && multiplayerUnlocked(p, unlockAll)))
}

// ---- the three hanging signs and the ball ----
export type SignId = 'mode' | 'difficulty' | 'arenas'
export interface Option { v: string | number; label: string; lock: string }
export interface WorldChoice { mode: string; difficulty: string; arenas: number; flux: boolean }

export function modeOptions(p: Progress, all = false): Option[] {
  const open = visibleModes(p, all)
  return MODE_ORDER.filter(id => id !== 'duo-fall' && open.includes(id) && id in MODES && MODES[id]!.ai).map(id => ({ v: id, label: MODES[id]!.label, lock: lockHint(p, id, all) }))
}
export function difficultyOptions(p: Progress, all = false): Option[] {
  const open = visibleDifficulties(p, all)
  return DIFFICULTY_ORDER.filter(d => open.includes(d)).map(d => ({ v: d, label: DIFFICULTIES[d]!.label, lock: difficultyLockHint(p, d, all) }))
}
export function arenaOptions(p: Progress, all = false): Option[] {
  const open = visibleArenas(p, all)
  return (ARENA_OPTIONS as readonly number[]).filter(n => open.includes(n)).map(n => ({ v: n, label: arenasLabel(n), lock: arenaLockHint(p, n, all) }))
}
export function optionsFor(sign: SignId, p: Progress, all = false): Option[] { return sign === 'mode' ? modeOptions(p, all) : sign === 'difficulty' ? difficultyOptions(p, all) : arenaOptions(p, all) }
export const SIGN_TITLE: Record<SignId, string> = { mode: 'MODE', difficulty: 'DIFFICULTY', arenas: 'OTHER ARENAS' }
export const SIGNS: readonly SignId[] = ['mode', 'difficulty', 'arenas']

/** Short text for the lock badge on a plaque: "after 3 falls". */
export const lockBadge = (lock: string): string => lock.replace(/^Opens after /, 'after ').replace(' more', '')

/** Keep a saved choice only if it is still open to this player; otherwise the first open option. */
export function sanitizeChoice(c: Partial<WorldChoice>, p: Progress, all = false): WorldChoice {
  const pick = <T extends string | number>(want: T | undefined, opts: Option[], fallback: T): T => { const ok = opts.find(o => o.v === want && !o.lock); return (ok ? ok.v : opts.find(o => !o.lock)?.v ?? fallback) as T }
  return {
    mode: pick(c.mode, modeOptions(p, all), 'solo-fall'),
    difficulty: pick(c.difficulty, difficultyOptions(p, all), 'chill'),
    arenas: p.falls === 0 && !all ? 3 : pick(c.arenas, arenaOptions(p, all), 0),
    flux: (p.falls > 0 || all) && c.flux === true,
  }
}

// ---- camera framing ----
export interface View { panX: number; panY: number; zoom: number }
/** Wide enough to show every object on its tether, so the arena reads as one small part of a big place. */
export function hubView(cw: number, ch: number): View { return isPortrait(cw, ch) ? { panX: 0, panY: 90, zoom: Math.min(cw / 700, ch / 1440) } : { panX: 0, panY: 0, zoom: Math.min(cw / 1720, ch / 1180) } }
/** Close on one prop: it fills about a third of the screen height. */
export function propView(def: PropDef, cw: number, ch: number): View { const p = propPos(def, isPortrait(cw, ch)); return { panX: p.x, panY: p.y, zoom: Math.min(ch / (def.size * 3.4), cw / (def.size * 3.4)) } }
/** Push in on the arena for the launch. */
export function launchView(cw: number, ch: number, W = 640): View { return { panX: 0, panY: 0, zoom: cw / (W * 1.35) } }
/** Exponential easing toward a target view; `dt` in seconds. Returns the new view. */
export function easeView(cur: View, to: View, dt: number, rate = 4.2): View {
  const k = 1 - Math.exp(-rate * dt)
  return { panX: cur.panX + (to.panX - cur.panX) * k, panY: cur.panY + (to.panY - cur.panY) * k, zoom: cur.zoom * Math.pow(to.zoom / cur.zoom, k) }
}
export const viewArrived = (a: View, b: View, eps = 0.01): boolean => Math.abs(a.zoom / b.zoom - 1) < eps && Math.hypot(a.panX - b.panX, a.panY - b.panY) < 6

// ---- keyboard order ----
export type FocusId = `sign:${SignId}` | 'ball' | `prop:${PropId}` | `opt:${string}`
export function focusOrder(p: Progress, all = false): FocusId[] {
  return ['sign:mode', 'sign:difficulty', 'sign:arenas', 'ball', ...visibleProps(p, all).map(d => `prop:${d.id}` as FocusId)]
}
export function stepFocus(order: readonly FocusId[], cur: FocusId | null, dir: 1 | -1): FocusId {
  if (!order.length) return 'ball'
  const i = cur ? order.indexOf(cur) : -1
  if (i < 0) return order[dir === 1 ? 0 : order.length - 1]!
  return order[(i + dir + order.length) % order.length]!
}
