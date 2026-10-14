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
  'wind-vents': { id: 'wind-vents', label: 'Wind Vents', blurb: 'Wall vents pulse gusts across the arena from shifting sides.', tune: {} },
  'eye-weather': { id: 'eye-weather', label: 'Eye Weather', blurb: 'The shaft eyes wake in timed waves and shed a small shower of tears.', tune: {} },
  'redline-rally': { id: 'redline-rally', label: 'Redline Rally', blurb: 'Every rally starts quicker and ramps toward a higher ball speed.', tune: { serveSpeed: 420, maxSpeed: 1080, speedRamp: 0.065 } },
  'soft-catch': { id: 'soft-catch', label: 'Soft Catch', blurb: 'Paddles return the ball with less raw speed, making placement matter.', tune: { thrustTransfer: 0.32, powerCarry: 0.28, speedRamp: 0.035 } },
  'long-fall': { id: 'long-fall', label: 'Long Fall', blurb: 'The shaft accelerates more gently, giving rallies extra breathing room.', tune: { baseFall: 105, fallEase: 1.05 } },
  'fracture-prone': { id: 'fracture-prone', label: 'Fracture Prone', blurb: 'Glass holds one fewer miss, making every save more valuable.', tune: { glassHits: 2 } },
  'pinball-storm': { id: 'pinball-storm', label: 'Pinball Storm', blurb: 'Arms swing faster and powered hits carry more lift.', tune: { flipRate: 21, armLift: 205, powerBoost: 500 } },
  'heavy-ball': { id: 'heavy-ball', label: 'Heavy Ball', blurb: 'The ball accelerates more slowly and resists paddle movement.', tune: { speedRamp: 0.032, thrustTransfer: 0.34, powerCarry: 0.3 } },
}
