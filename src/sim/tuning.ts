// Every number a mode or modifier may change lives here, so rules stay data.
// Bump SIM_VERSION on ANY change that alters how a recorded replay plays out.
export const SIM_VERSION = 1
export const FIXED_DT = 1 / 120

export interface Tuning {
  glassHits: number      // missed balls before a side's glass breaks
  growStep: number       // arena scale gained when the player scores
  shrinkStep: number     // arena scale lost when the opponent scores
  maxScale: number       // arena scale at which the fall halts
  baseFall: number       // field fall speed at scale 1 (units/s)
  serveSpeed: number
  maxSpeed: number
  paddleSpeed: number
  tearsForPower: number
}

export const DEFAULT_TUNING: Tuning = {
  glassHits: 3,
  growStep: 0.15,
  shrinkStep: 0.1,
  maxScale: 3.4,
  baseFall: 140,
  serveSpeed: 360,
  maxSpeed: 900,
  paddleSpeed: 520,
  tearsForPower: 4,
}
