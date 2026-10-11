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
  classic: { id: 'classic', label: 'Classic', blurb: 'First to 24 while the arena falls.', target: 24, timeLimit: 0, ranked: true, unlimited: false, ai: true, tune: {} },
  timed: { id: 'timed', label: 'Timed', blurb: 'Best score in two minutes.', target: 0, timeLimit: 120, ranked: true, unlimited: false, ai: true, tune: {} },
  'solo-fall': { id: 'solo-fall', label: 'Solo Fall', blurb: 'Grow the arena to stop the fall; they want you to fall.', target: 24, timeLimit: 0, ranked: true, unlimited: false, ai: true, tune: { baseFall: 180, shrinkStep: 0.2 } },
  sandbox: { id: 'sandbox', label: 'Sandbox', blurb: 'Free play. Never ranked, never pays.', target: 0, timeLimit: 0, ranked: false, unlimited: true, ai: true, tune: {} },
  versus: { id: 'versus', label: 'Versus (2P)', blurb: 'Two players, one keyboard. P1: W/S, P2: I/K. Thrust: Space / L. Pinball: E / O. Not ranked.', target: 14, timeLimit: 0, ranked: false, unlimited: false, ai: false, tune: {} },
  'versus-timed': { id: 'versus-timed', label: 'Versus Timed', blurb: 'Two players, two minutes, most points wins. Not ranked.', target: 0, timeLimit: 120, ranked: false, unlimited: false, ai: false, tune: {} },
}

export const DEFAULT_MODE = 'classic'
