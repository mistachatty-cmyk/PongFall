import type { Tuning } from '../tuning'

export interface ModifierDef { id: string; label: string; blurb: string; tune: Partial<Tuning> }

// Shared by every mode (Kinetic Souls style): a modifier is just a tuning delta.
export const MODIFIERS: Record<string, ModifierDef> = {
  'thin-glass': { id: 'thin-glass', label: 'Thin Glass', blurb: 'Glass breaks after a single miss.', tune: { glassHits: 1 } },
  'fast-ball': { id: 'fast-ball', label: 'Fast Ball', blurb: 'Quicker serves, higher top speed.', tune: { serveSpeed: 480, maxSpeed: 1200 } },
  'heavy-fall': { id: 'heavy-fall', label: 'Heavy Fall', blurb: 'The field falls faster; growing matters more.', tune: { baseFall: 220 } },
  gale: { id: 'gale', label: 'Gale', blurb: 'A howling wind throws tears around.', tune: { windStrength: 260 } },
  'low-gravity': { id: 'low-gravity', label: 'Low Gravity', blurb: 'Tears hang in the air.', tune: { tearGravity: 30 } },
  'heavy-sway': { id: 'heavy-sway', label: 'Heavy Sway', blurb: 'The arena swings harder on every hit.', tune: { swayKick: 150, swayStiffness: 22 } },
  'rough-seas': { id: 'rough-seas', label: 'Rough Seas', blurb: 'The arena rocks hard and tilts the ball around.', tune: { rockTorque: 0.00022, tiltG: 2400, rockDamping: 1.4 } },
  'slick-paddles': { id: 'slick-paddles', label: 'Slick Paddles', blurb: 'Paddles move faster.', tune: { paddleSpeed: 700 } },
  'paddle-wake-physics': { id: 'paddle-wake-physics', label: 'Paddle Wake', blurb: 'Moving paddles stir a brief, subtle current around the ball.', tune: {} },
}
