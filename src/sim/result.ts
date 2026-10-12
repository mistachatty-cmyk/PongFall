import { SIM_VERSION } from './tuning'
import type { World } from './world'

export const PERK_GREATS = 'TheGreatsAreNeverForgotten'

export interface GameResult {
  mode: string
  modifiers: string[]
  difficulty: string
  arenas: number
  target: number
  timeLimit: number
  seed: number
  version: number
  ranked: boolean
  overtime: boolean
  winner: World['winner']
  won: boolean
  score: number          // leaderboard score, see scoreOf()
  points: [number, number]
  durationMs: number
  endReason: World['endReason']
  perks: string[]
  stats: {
    glassBroken: [boolean, boolean]
    glassCracks: [number, number]
    glassBreaksCaused: [number, number]
    tearsCollected: [number, number]
    powerBalls: [number, number]
    paddleSwipes: [number, number]
    heatSwipes: [number, number]
    breezeSwipes: [number, number]
    satelliteSaved: number
    satelliteFallen: number
    tearsHeld: number
    arenaScale: number
  }
}

/** Leaderboard score: points scored, minus opponent points, a win bonus, and a speed bonus for winning fast. */
export function scoreOf(points: [number, number], won: boolean, seconds: number): number {
  const base = points[0] * 100 - points[1] * 40
  const bonus = won ? 500 + Math.max(0, 300 - Math.round(seconds)) : 0
  return Math.max(0, base + bonus)
}

export function getResult(w: World): GameResult | null {
  if (w.status === 'play') return null
  const points: [number, number] = [w.sides[0].score, w.sides[1].score]
  const won = w.winner === 0
  return {
    mode: w.mode.id, modifiers: [...w.modifiers], difficulty: w.difficulty.id, arenas: w.arenaCount, target: w.opts.target, timeLimit: w.opts.timeLimit, seed: w.seed, version: SIM_VERSION,
    ranked: w.mode.ranked && !w.flux && !w.overtime, overtime: w.overtime, winner: w.winner, won, score: scoreOf(points, won, w.t), points,
    durationMs: Math.round(w.t * 1000), endReason: w.endReason,
    perks: won && w.npcLocked ? [PERK_GREATS] : [],
    stats: {
      glassBroken: [w.sides[0].brokenEver, w.sides[1].brokenEver],
      glassCracks: [w.sides[0].cracksTaken, w.sides[1].cracksTaken],
      glassBreaksCaused: [w.sides[0].glassBreaksCaused, w.sides[1].glassBreaksCaused],
      tearsCollected: [w.sides[0].tearsCollected, w.sides[1].tearsCollected],
      powerBalls: [w.sides[0].powerBalls, w.sides[1].powerBalls],
      paddleSwipes: [w.sides[0].paddleSwipes, w.sides[1].paddleSwipes],
      heatSwipes: [w.sides[0].heatSwipes, w.sides[1].heatSwipes],
      breezeSwipes: [w.sides[0].breezeSwipes, w.sides[1].breezeSwipes],
      satelliteSaved: w.satSaved, satelliteFallen: w.satFallen,
      tearsHeld: w.tearsHeld, arenaScale: Math.round(w.scale * 100) / 100,
    },
  }
}
