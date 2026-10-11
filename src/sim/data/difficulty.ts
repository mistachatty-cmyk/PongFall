// NPC difficulty tiers (and how gently the player is started). Pure data.
export interface DifficultyDef {
  id: string
  label: string
  blurb: string
  speed: number        // NPC paddle speed multiplier
  reaction: number     // NPC re-aims every N ticks (higher = slower to react)
  error: number        // NPC aim error in units
  predict: number      // 0 = chases the ball's y, 1 = aims at the predicted intercept
  mistake: number      // chance per second that the NPC freezes for a moment
  thrust: number       // chance per tick the NPC lunges when the ball is close
  serveMult: number    // serve speed multiplier
  rampMult: number     // speed gained per paddle hit multiplier
  playerPad: number    // player paddle length multiplier
  playerGlass: number  // extra glass hits the player's side survives
  assist: boolean      // whether the player's comeback Power Paddle exists on this tier
  hostile: boolean     // whether balls from other arenas can hit your glass
}

export const DIFFICULTIES: Record<string, DifficultyDef> = {
  chill: { id: 'chill', label: 'Chill', blurb: 'Slow, forgiving. Made for a first run.', speed: 0.5, reaction: 30, error: 80, predict: 0, mistake: 0.9, thrust: 0, serveMult: 0.7, rampMult: 0.4, playerPad: 1.4, playerGlass: 1, assist: true, hostile: false },
  casual: { id: 'casual', label: 'Casual', blurb: 'Gets a few good returns in.', speed: 0.7, reaction: 18, error: 45, predict: 0.35, mistake: 0.5, thrust: 0, serveMult: 0.85, rampMult: 0.7, playerPad: 1.2, playerGlass: 0, assist: true, hostile: false },
  sharp: { id: 'sharp', label: 'Sharp', blurb: 'Reads the bounce and lunges.', speed: 0.95, reaction: 8, error: 18, predict: 0.8, mistake: 0.15, thrust: 0.02, serveMult: 1, rampMult: 1, playerPad: 1, playerGlass: 0, assist: true, hostile: true },
  relentless: { id: 'relentless', label: 'Relentless', blurb: 'Rarely misses. Bring thrust.', speed: 1.15, reaction: 2, error: 4, predict: 1, mistake: 0.02, thrust: 0.06, serveMult: 1.1, rampMult: 1.15, playerPad: 0.9, playerGlass: 0, assist: false, hostile: true },
}
export const DEFAULT_DIFFICULTY = 'chill'
export const DIFFICULTY_ORDER = ['chill', 'casual', 'sharp', 'relentless']

/** Linear blend of two tiers (numbers blend, flags follow the nearer tier). Pure. */
export function blendDifficulty(a: DifficultyDef, b: DifficultyDef, t: number): DifficultyDef {
  const k = Math.max(0, Math.min(1, t))
  const m = (x: number, y: number) => x + (y - x) * k
  return {
    id: k < 0.5 ? a.id : b.id, label: k < 0.5 ? a.label : b.label, blurb: a.blurb,
    speed: m(a.speed, b.speed), reaction: Math.max(1, Math.round(m(a.reaction, b.reaction))), error: m(a.error, b.error), predict: m(a.predict, b.predict),
    mistake: m(a.mistake, b.mistake), thrust: m(a.thrust, b.thrust), serveMult: m(a.serveMult, b.serveMult), rampMult: m(a.rampMult, b.rampMult),
    playerPad: m(a.playerPad, b.playerPad), playerGlass: k < 0.5 ? a.playerGlass : b.playerGlass, assist: k < 0.5 ? a.assist : b.assist, hostile: k < 0.5 ? a.hostile : b.hostile,
  }
}
