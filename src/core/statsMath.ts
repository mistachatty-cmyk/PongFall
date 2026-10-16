// Pure maths for the records page: totals, streaks, per-mode splits and the recent-results strip.
import type { HistoryEntry } from './cloudSync'

export interface ModeLine { mode: string; falls: number; wins: number; winRate: number }
export interface StatsSummary {
  falls: number; wins: number; losses: number
  winRate: number               // 0..1, 0 when there are no falls
  currentStreak: number         // positive = wins in a row, negative = losses in a row
  bestStreak: number            // longest run of wins
  flawless: number              // wins with a shutout and intact glass
  avgFor: number; avgAgainst: number
  bestMargin: number
  byMode: ModeLine[]
  /** Newest last, at most `limit` entries, for the results strip. */
  recent: Array<{ won: boolean; margin: number; mode: string }>
}

/** `records` is newest first (the order the history is stored in). */
export function summarize(records: readonly HistoryEntry[], limit = 40): StatsSummary {
  const falls = records.length, wins = records.filter(r => r.won).length
  const chrono = [...records].reverse()
  let best = 0, run = 0
  for (const r of chrono) { run = r.won ? run + 1 : 0; best = Math.max(best, run) }
  let current = 0
  for (const r of records) { if (current === 0) current = r.won ? 1 : -1; else if ((current > 0) === r.won) current += current > 0 ? 1 : -1; else break }
  const modes = new Map<string, { falls: number; wins: number }>()
  for (const r of records) { const m = modes.get(r.mode) ?? { falls: 0, wins: 0 }; m.falls++; if (r.won) m.wins++; modes.set(r.mode, m) }
  const sum = (f: (r: HistoryEntry) => number) => falls ? records.reduce((n, r) => n + f(r), 0) / falls : 0
  return {
    falls, wins, losses: falls - wins, winRate: falls ? wins / falls : 0,
    currentStreak: current, bestStreak: best,
    flawless: records.filter(r => r.won && r.opponent_score === 0 && !r.details?.ownGlassBroken).length,
    avgFor: sum(r => r.score), avgAgainst: sum(r => r.opponent_score),
    bestMargin: records.reduce((m, r) => r.won ? Math.max(m, r.score - r.opponent_score) : m, 0),
    byMode: [...modes.entries()].map(([mode, m]) => ({ mode, falls: m.falls, wins: m.wins, winRate: m.wins / m.falls })).sort((a, b) => b.falls - a.falls || a.mode.localeCompare(b.mode)),
    recent: chrono.slice(-limit).map(r => ({ won: r.won, margin: r.score - r.opponent_score, mode: r.mode })),
  }
}

export const percent = (x: number): string => `${Math.round(x * 100)}%`
export const streakLabel = (n: number): string => n === 0 ? 'no falls yet' : n > 0 ? `${n} win${n === 1 ? '' : 's'} in a row` : `${-n} loss${n === -1 ? '' : 'es'} in a row`
