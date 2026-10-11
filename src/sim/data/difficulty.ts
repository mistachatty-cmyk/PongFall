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
}

export const DIFFICULTIES: Record<string, DifficultyDef> = {
  chill: { id: 'chill', label: 'Chill', blurb: 'Slow, forgiving. Made for a first run.', speed: 0.5, reaction: 30, error: 80, predict: 0, mistake: 0.9, thrust: 0, serveMult: 0.7, rampMult: 0.4, playerPad: 1.4, playerGlass: 1 },
  casual: { id: 'casual', label: 'Casual', blurb: 'Gets a few good returns in.', speed: 0.7, reaction: 18, error: 45, predict: 0.35, mistake: 0.5, thrust: 0, serveMult: 0.85, rampMult: 0.7, playerPad: 1.2, playerGlass: 0 },
  sharp: { id: 'sharp', label: 'Sharp', blurb: 'Reads the bounce and lunges.', speed: 0.95, reaction: 8, error: 18, predict: 0.8, mistake: 0.15, thrust: 0.02, serveMult: 1, rampMult: 1, playerPad: 1, playerGlass: 0 },
  relentless: { id: 'relentless', label: 'Relentless', blurb: 'Rarely misses. Bring thrust.', speed: 1.15, reaction: 2, error: 4, predict: 1, mistake: 0.02, thrust: 0.06, serveMult: 1.1, rampMult: 1.15, playerPad: 0.9, playerGlass: 0 },
}
export const DEFAULT_DIFFICULTY = 'chill'
export const DIFFICULTY_ORDER = ['chill', 'casual', 'sharp', 'relentless']
