import type { Tuning } from '../tuning'

export interface ModifierDef { id: string; label: string; blurb: string; tune: Partial<Tuning> }

// Shared by every mode (Kinetic Souls style): a modifier is just a tuning delta.
export const MODIFIERS: Record<string, ModifierDef> = {
  'thin-glass': { id: 'thin-glass', label: 'Thin Glass', blurb: 'Glass breaks after a single miss.', tune: { glassHits: 1 } },
  'fast-ball': { id: 'fast-ball', label: 'Fast Ball', blurb: 'Quicker serves, higher top speed.', tune: { serveSpeed: 480, maxSpeed: 1200 } },
  'heavy-fall': { id: 'heavy-fall', label: 'Heavy Fall', blurb: 'The field falls faster; growing matters more.', tune: { baseFall: 220 } },
  'slick-paddles': { id: 'slick-paddles', label: 'Slick Paddles', blurb: 'Paddles move faster.', tune: { paddleSpeed: 700 } },
}
