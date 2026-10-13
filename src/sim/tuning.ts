// Every number a mode, modifier or difficulty may change lives here, so rules stay data.
// Bump SIM_VERSION on ANY change that alters how a recorded replay plays out.
export const SIM_VERSION = 20
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
  powerSeconds: number   // how long a manually activated Power Paddle lasts
  powerHits: number      // every Nth paddle hit while powered is a boosted strike
  powerBoost: number     // extra ball speed on a boosted strike
  powerCarry: number     // share of the paddle's own y velocity handed to the ball while powered
  assistLead: number     // NPC lead that wakes the player's Power Paddle
  assistEnd: number      // player lead that puts it back to sleep
  lockLead: number       // NPC lead that gives the NPC the Power Paddle for good
  tiltG: number          // tilt gravity: how hard a rocking arena rolls the ball
  rockStiffness: number  // arena body's angular spring
  rockDamping: number
  rockTorque: number     // angular velocity per unit of torque from an impact
  flipAngle: number      // how far the pinball flipper swings (radians)
  flipRate: number       // flip speed while a flip is held (rad/s)
  flipReturn: number     // return speed when released (rad/s)
  flipRestitution: number
  shardGravity: number   // downward pull on loose glass shards (units/s^2)
  armLength: number      // arm reach at arena scale 1 (it scales with the personal arena)
  armLift: number        // speed the arm adds to whatever it swats
  unloadForward: number  // extra forward speed when a held swat is released and the arm snaps back ("power hit unloaded")
  tiltMax: number        // paddle tilt limit (radians)
  tiltRate: number       // tilt speed while A/D is held, and the return speed (rad/s)
  tiltDeflect: number    // how much a tilted paddle bends the return angle (per radian of tilt)
  armGrowRate: number    // how fast the pinball arm grows out or retracts (fraction of full reach per second)
  armAimMax: number      // widest angle the arm can be aimed with the mouse (radians)
  armChargeTime: number  // seconds of holding Space to fully charge the arm
  armChargeBoost: number // extra ball speed from a fully charged, well-timed release
  armReleaseWindow: number // seconds after releasing Space in which an arm hit counts as timed
  armStackMax: number    // how many timed hits in a row stack the boost
  eyeSleepSeconds: number // wall eyes stay fully shut for this long unless hit twice (then they peek)
  eyePeekSeconds: number  // how long a peek lasts
  outsideDrag: number    // how strongly a ball outside the arena feels the shaft's wind and fall
}

export const DEFAULT_TUNING: Tuning = {
  glassHits: 3,
  growStep: 0.1715,  // 14 player points take the arena from scale 1 to maxScale (wall to wall)
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
  powerSeconds: 12,
  powerHits: 3,
  powerBoost: 420,
  powerCarry: 0.4,
  assistLead: 4,
  assistEnd: 2,
  lockLead: 6,
  tiltG: 1400,
  rockStiffness: 40,
  rockDamping: 2.4,
  rockTorque: 0.0001,
  flipAngle: 0.62,
  flipRate: 18,
  flipReturn: 8,
  flipRestitution: 0.82,
  shardGravity: 260,
  armLength: 62,
  armLift: 160,
  unloadForward: 260,
  tiltMax: 0.6,
  tiltRate: 4,
  tiltDeflect: 0.9,
  armGrowRate: 0.9,
  armAimMax: 1.25,
  armChargeTime: 0.9,
  armChargeBoost: 380,
  armReleaseWindow: 0.3,
  armStackMax: 3,
  eyeSleepSeconds: 60,
  eyePeekSeconds: 8,
  outsideDrag: 0.35,
}
