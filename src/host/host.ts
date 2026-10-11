import type { GameResult } from '../sim/result'
import type { Replay } from '../sim/replay'

export interface Identity { id: string; name: string }

/** What an embedding page or game provides. Every method is optional. */
export interface Host {
  getIdentity?(): Identity | null
  /** Called once when a run ends, with everything needed to rank or reward it. */
  onResult?(result: GameResult, replay: Replay): void
  /** Best score to show in the HUD for this mode (ranked modes only). */
  getBest?(mode: string, difficulty: string): number | null
}
