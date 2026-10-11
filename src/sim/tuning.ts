// Every number a mode, modifier or difficulty may change lives here, so rules stay data.
// Bump SIM_VERSION on ANY change that alters how a recorded replay plays out.
export const SIM_VERSION = 2
export const FIXED_DT = 1 / 120

export interface Tuning {
  glassHits: number      // missed balls before a side's glass breaks
  growStep: number       // arena scale gained when the player scores
  shrinkStep: number     // arena scale lost when the opponent scores
  maxScale: number       // arena scale at which the fall halts
  baseFall: number       // field fall speed at scale 1 (units/s)
  fallEase: number       // how quickly the fall speed follows its target (1/s)
  scoreSurge: number     // extra fall speed kicked in by any score
  serveSpeed: number
  maxSpeed: number
  speedRamp: number      // ball speed gained per paddle hit (fraction)
  paddleSpeed: number
  tearsForPower: number
  tearRadius: number     // how close a slice must pass to collect a tear
  tearGravity: number    // tears fall slowly so they can be sliced
  windStrength: number   // peak wind acceleration on tears and shards (units/s^2)
  swayStiffness: number  // arena body spring
  swayDamping: number
  swayKick: number       // how hard impacts shove the arena body
  ballInertia: number    // how much the ball feels the arena's motion
  thrustSpeed: number    // paddle lunge speed (units/s)
  thrustCooldown: number // seconds
  thrustTransfer: number // share of paddle speed handed to the ball on contact
}

export const DEFAULT_TUNING: Tuning = {
  glassHits: 3,
  growStep: 0.15,
  shrinkStep: 0.1,
  maxScale: 3.4,
  baseFall: 140,
  fallEase: 1.4,
  scoreSurge: 140,
  serveSpeed: 360,
  maxSpeed: 900,
  speedRamp: 0.05,
  paddleSpeed: 520,
  tearsForPower: 4,
  tearRadius: 60,
  tearGravity: 150,
  windStrength: 90,
  swayStiffness: 38,
  swayDamping: 6,
  swayKick: 60,
  ballInertia: 0.12,
  thrustSpeed: 1900,
  thrustCooldown: 0.9,
  thrustTransfer: 0.45,
}
