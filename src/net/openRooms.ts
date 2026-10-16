// The match browser's data: what the server lists as open matches, cleaned before it reaches the screen. Pure and tested.
export interface OpenRoom {
  code: string; mode: string; difficulty: string; arenas: number; target: number; timeLimit: number; flux: boolean; host: string; ageSeconds: number
}

const MODES = ['versus', 'versus-timed']
const DIFFS = ['chill', 'casual', 'sharp', 'relentless']
const num = (v: unknown, d = 0): number => typeof v === 'number' && Number.isFinite(v) ? v : d

/** Keep only well-formed rows; never trust the server's strings enough to show them raw. */
export function parseOpenRooms(raw: unknown): OpenRoom[] {
  if (!Array.isArray(raw)) return []
  const out: OpenRoom[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const code = typeof o.code === 'string' && /^PF-[A-F0-9]{10}$/.test(o.code) ? o.code : null
    const mode = typeof o.mode === 'string' && MODES.includes(o.mode) ? o.mode : null
    const difficulty = typeof o.difficulty === 'string' && DIFFS.includes(o.difficulty) ? o.difficulty : null
    if (!code || !mode || !difficulty) continue
    const host = typeof o.host_name === 'string' ? o.host_name.replace(/[^\p{L}\p{N} _.'’-]/gu, '').trim().slice(0, 24) : ''
    out.push({ code, mode, difficulty, arenas: [0, 1, 3, 5].includes(num(o.arenas)) ? num(o.arenas) : 0, target: num(o.target), timeLimit: num(o.time_limit), flux: o.flux === true, host: host || 'A player', ageSeconds: Math.max(0, Math.floor(num(o.age_seconds))) })
  }
  return out.slice(0, 30)
}

export const ageLabel = (s: number): string => s < 10 ? 'just now' : s < 60 ? `${Math.floor(s / 10) * 10}s ago` : `${Math.floor(s / 60)} min ago`

/** One line a player can read at a glance. */
export function describeRoom(r: OpenRoom, modeLabel: (id: string) => string): string {
  const goal = r.mode === 'versus-timed' ? (r.timeLimit > 0 ? `${Math.floor(r.timeLimit / 60)}:${String(r.timeLimit % 60).padStart(2, '0')}` : 'no limit') : `first to ${r.target || 14}`
  const arenas = r.arenas === 0 ? 'solo shaft' : `${r.arenas} other arena${r.arenas === 1 ? '' : 's'}`
  return `${modeLabel(r.mode)} · ${goal} · ${arenas}${r.flux ? ' · flux' : ''}`
}

/** True when an RPC error means the server update has not been applied yet (so the UI can say so instead of failing). */
export const isMissingFunction = (message: string): boolean => /could not find the function|PGRST202|does not exist/i.test(message)
