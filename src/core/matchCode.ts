// Match codes: a short shareable string that sets up the same match (mode, difficulty, arenas, length, flux, seed) on any device.
import { ARENA_OPTIONS, TARGET_OPTIONS, TIME_OPTIONS } from './settings'

export interface MatchConfig { mode: string; difficulty: string; arenas: number; target: number; timeLimit: number; flux: boolean; seed: number }

const PREFIX = 'PF1-'
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   // no 0/O/1/I so codes read aloud cleanly

const check = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 1024; return ALPHA[h >> 5]! + ALPHA[h & 31]! }
const b32 = (n: number, len: number) => { let s = ''; for (let i = 0; i < len; i++) { s = ALPHA[n % 32]! + s; n = Math.floor(n / 32) } return s }
const unb32 = (s: string) => { let n = 0; for (const c of s) { const v = ALPHA.indexOf(c); if (v < 0) return -1; n = n * 32 + v }; return n }

/** Layout: mode(1) diff(1) arenas(1) target(1) time(1) flux(1) seed(6) + 2 check chars, grouped in 4s (14 characters). */
export function makeCode(c: MatchConfig, modes: readonly string[], diffs: readonly string[]): string {
  const body = b32(Math.max(0, modes.indexOf(c.mode)), 1) + b32(Math.max(0, diffs.indexOf(c.difficulty)), 1) + b32(Math.max(0, (ARENA_OPTIONS as readonly number[]).indexOf(c.arenas)), 1) +
    b32(Math.max(0, (TARGET_OPTIONS as readonly number[]).indexOf(c.target)), 1) + b32(Math.max(0, (TIME_OPTIONS as readonly number[]).indexOf(c.timeLimit)), 1) + b32(c.flux ? 1 : 0, 1) + b32(Math.abs(Math.floor(c.seed)) % 1073741824, 6)
  const all = body + check(body)
  return PREFIX + all.match(/.{1,4}/g)!.join('-')
}

export function parseCode(raw: string, modes: readonly string[], diffs: readonly string[]): MatchConfig | null {
  const s = raw.toUpperCase().replace(/[\s-]/g, '').replace(/^PF1/, '')
  if (s.length !== 14) return null
  const body = s.slice(0, 12)
  if (check(body) !== s.slice(12)) return null
  const v = (i: number) => unb32(body[i]!)
  const mode = modes[v(0)], diff = diffs[v(1)], arenas = ARENA_OPTIONS[v(2)], target = TARGET_OPTIONS[v(3)], time = TIME_OPTIONS[v(4)], flux = v(5)
  const seed = unb32(body.slice(6))
  if (mode === undefined || diff === undefined || arenas === undefined || target === undefined || time === undefined || (flux !== 0 && flux !== 1) || seed < 0) return null
  return { mode, difficulty: diff, arenas, target, timeLimit: time, flux: flux === 1, seed }
}
