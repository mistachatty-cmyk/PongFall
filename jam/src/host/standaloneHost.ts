import type { Host } from './host'

const key = (mode: string, diff: string) => `pongfall.jam.best.${mode}.${diff}`

/** Standalone page: local high score only (leaderboards and LOK join in the LOK milestone). */
const UNLOCK_KEY = 'pongfall.jam.unlocks'
function readUnlocks(): { power: boolean; perks: string[] } {
  try { const u = JSON.parse(localStorage.getItem(UNLOCK_KEY) ?? '{}'); return { power: !!u.power, perks: Array.isArray(u.perks) ? u.perks.filter((x: unknown) => typeof x === 'string') : [] } } catch { return { power: false, perks: [] } }
}
function writeUnlocks(u: { power: boolean; perks: string[] }) { try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(u)) } catch { /* ignore */ } }

export function createStandaloneHost(): Host {
  return {
    isPowerUnlocked: () => readUnlocks().power,
    onPowerUnlocked() { const u = readUnlocks(); u.power = true; writeUnlocks(u) },
    getPerks: () => readUnlocks().perks,
    getIdentity: () => null,
    getBest(mode, diff) {
      try { const v = localStorage.getItem(key(mode, diff)); return v === null ? null : Number(v) } catch { return null }
    },
    onResult(result) {
      if (result.perks.length) { const u = readUnlocks(); for (const p of result.perks) if (!u.perks.includes(p)) u.perks.push(p); writeUnlocks(u) }
      if (!result.ranked) return
      try {
        const prev = Number(localStorage.getItem(key(result.mode, result.difficulty)) ?? 0)
        if (result.score > prev) localStorage.setItem(key(result.mode, result.difficulty), String(result.score))
      } catch { /* storage unavailable: the game still works */ }
    },
  }
}
