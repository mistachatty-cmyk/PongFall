import type { Host } from './host'

const key = (mode: string, diff: string) => `pongfall.best.${mode}.${diff}`

/** Standalone page: local high score only (leaderboards and LOK join in the LOK milestone). */
export function createStandaloneHost(): Host {
  return {
    getIdentity: () => null,
    getBest(mode, diff) {
      try { const v = localStorage.getItem(key(mode, diff)); return v === null ? null : Number(v) } catch { return null }
    },
    onResult(result) {
      if (!result.ranked) return
      try {
        const prev = Number(localStorage.getItem(key(result.mode, result.difficulty)) ?? 0)
        if (result.score > prev) localStorage.setItem(key(result.mode, result.difficulty), String(result.score))
      } catch { /* storage unavailable: the game still works */ }
    },
  }
}
