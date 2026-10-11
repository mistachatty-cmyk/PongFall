import type { Tuning } from '../tuning'

export interface ModeDef {
  id: string
  label: string
  blurb: string
  target: number        // points to win; 0 = none
  timeLimit: number     // seconds; 0 = none
  ranked: boolean       // may appear on leaderboards / pay LokTokens
  unlimited: boolean    // never ends (sandbox)
  ai: boolean           // NPC controls side 1
  tune: Partial<Tuning>
}

export const MODES: Record<string, ModeDef> = {
  classic: { id: 'classic', label: 'Classic', blurb: 'First to 14 while the arena falls.', target: 14, timeLimit: 0, ranked: true, unlimited: false, ai: true, tune: {} },
  timed: { id: 'timed', label: 'Timed', blurb: 'Best score in two minutes.', target: 0, timeLimit: 120, ranked: true, unlimited: false, ai: true, tune: {} },
  'solo-fall': { id: 'solo-fall', label: 'Solo Fall', blurb: 'Grow the arena to stop the fall; they want you to fall.', target: 14, timeLimit: 0, ranked: true, unlimited: false, ai: true, tune: { baseFall: 180, shrinkStep: 0.2 } },
  sandbox: { id: 'sandbox', label: 'Sandbox', blurb: 'Free play. Never ranked, never pays.', target: 0, timeLimit: 0, ranked: false, unlimited: true, ai: true, tune: {} },
}

export const DEFAULT_MODE = 'classic'
