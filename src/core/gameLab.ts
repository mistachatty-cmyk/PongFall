/** Device-local settings and playtest notes for optional Game Lab experiments. */
export const GAME_LAB_KEY = 'pongfall.gameLab.v1'
export const GAME_LAB_VERSION = '0.26.0'

export const EXPERIMENTS = [
  { id: 'shaft-districts', title: 'Shaft districts', kind: 'visual', introduced: '0.17.0', summary: 'Add restrained color and metal details to sections of the existing shaft.' },
  { id: 'eye-remembers', title: 'The eye remembers', kind: 'visual', introduced: '0.17.0', summary: 'Let the watching eyes carry a subtle mark from your local fall history.' },
  { id: 'old-glass-traces', title: 'Old glass traces', kind: 'visual', introduced: '0.17.0', summary: 'Show faint, decorative fracture etchings beneath the current pane.' },
  { id: 'echo-rallies', title: 'Echo rallies', kind: 'visual', introduced: '0.17.0', summary: 'Leave a soft, short-lived echo of the ball’s recent path.' },
  { id: 'shaft-signals', title: 'Shaft beacons', kind: 'visual', introduced: '0.17.0', summary: 'Reveal occasional lights and symbols in the deep shaft.' },
  { id: 'ball-comet', title: 'Comet ball', kind: 'visual', introduced: '0.22.2', summary: 'Give fast-moving balls a short, soft tail so their direction and speed read at a glance.' },
  { id: 'paddle-wake', title: 'Paddle wake', kind: 'visual', introduced: '0.22.2', summary: 'Add a faint motion wake behind paddles when they move quickly. Visual only; separate from Paddle Wake physics.' },
  { id: 'glass-impact-halo', title: 'Glass impact halo', kind: 'visual', introduced: '0.22.2', summary: 'Add a brief, quiet halo at the latest glass strike to make cracks easier to follow.' },
  { id: 'pressure-doors', title: 'Pressure doors', kind: 'visual', introduced: '0.26.0', summary: 'Show distant shaft shutters warning ahead of each structural gate. Cosmetic prototype; it does not change the arena hitbox.' },
  { id: 'shaft-postcards', title: 'Shaft postcards', kind: 'visual', introduced: '0.26.0', summary: 'Reveal rare seeded signs and silhouettes deep in the shaft.' },
  { id: 'ball-signatures', title: 'Ball signatures', kind: 'visual', introduced: '0.26.0', summary: 'Use distinct shape and color cues to show whether a swipe heated or cooled the ball.' },
  { id: 'paddle-wake-physics', title: 'Paddle wake', kind: 'physics', introduced: '0.19.0', summary: 'Moving paddles stir a subtle current near the ball. Offline only; replay verified.' },
  { id: 'wind-vents', title: 'Wind vents', kind: 'physics', introduced: '0.24.0', summary: 'Randomly placed wall vents pulse cross-arena gusts and shift to the opposite wall. Offline only; replay verified.' },
  { id: 'eye-weather', title: 'Eye weather', kind: 'physics', introduced: '0.26.0', summary: 'Every so often the shaft eyes wake together and release a small seeded tear shower. Offline only; replay verified.' },
  { id: 'thin-glass', title: 'Thin glass', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: panes break after fewer misses. Offline only.' },
  { id: 'fast-ball', title: 'Fast ball', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: quicker serve and higher top speed. Offline only.' },
  { id: 'heavy-fall', title: 'Heavy fall', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: the shaft falls faster. Offline only.' },
  { id: 'gale', title: 'Gale', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: stronger shaft wind. Offline only.' },
  { id: 'low-gravity', title: 'Low gravity', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: tears float longer. Offline only.' },
  { id: 'heavy-sway', title: 'Heavy sway', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: impacts rock the arena harder. Offline only.' },
  { id: 'rough-seas', title: 'Rough seas', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: stronger rocking and tilt gravity. Offline only.' },
  { id: 'slick-paddles', title: 'Slick paddles', kind: 'physics', introduced: '0.26.0', summary: 'A compact mutator: paddles move faster. Offline only.' },
  { id: 'redline-rally', title: 'Redline rally', kind: 'physics', introduced: '0.26.0', summary: 'A mutator for hotter rallies: faster serves and a quicker speed ramp. Offline only.' },
  { id: 'soft-catch', title: 'Soft catch', kind: 'physics', introduced: '0.26.0', summary: 'A mutator for placement play: reduce speed transfer and ball ramp. Offline only.' },
  { id: 'long-fall', title: 'Long fall', kind: 'physics', introduced: '0.26.0', summary: 'A mutator for longer rallies: slow the shaft descent. Offline only.' },
  { id: 'fracture-prone', title: 'Fracture prone', kind: 'physics', introduced: '0.26.0', summary: 'A mutator for high stakes: glass holds one fewer miss. Offline only.' },
  { id: 'pinball-storm', title: 'Pinball storm', kind: 'physics', introduced: '0.26.0', summary: 'A mutator for arm play: faster swings and harder powered hits. Offline only.' },
  { id: 'heavy-ball', title: 'Heavy ball', kind: 'physics', introduced: '0.26.0', summary: 'A mutator for controlled rallies: slower acceleration and softer paddle transfer. Offline only.' },
] as const

/** Future concepts remain visible until there is a safe implementation and test plan. */
export const PLANNED_EXPERIMENTS: ReadonlyArray<{ id: string; title: string; introduced: string; reason: string }> = []

export type ExperimentId = typeof EXPERIMENTS[number]['id']
export type ExperimentScope = 'whole-game' | 'selected-modes'
export type ExperimentPolicy = 'optional' | 'always-on'

export interface ExperimentReview {
  notes: string
  transfer: boolean
  scope: ExperimentScope
  modes: string[]
  policy: ExperimentPolicy
  tested: boolean
}

export interface GameLabState {
  schema: 1
  enabled: Record<ExperimentId, boolean>
  review: Record<ExperimentId, ExperimentReview>
}

const ids = EXPERIMENTS.map(e => e.id) as ExperimentId[]
const modes = ['solo-fall', 'duo-fall', 'classic', 'timed', 'sandbox', 'versus', 'versus-timed']
const defaultReview = (): ExperimentReview => ({ notes: '', transfer: false, scope: 'whole-game', modes: [], policy: 'optional', tested: false })

export function defaultGameLabState(): GameLabState {
  return { schema: 1, enabled: Object.fromEntries(ids.map(id => [id, false])) as GameLabState['enabled'], review: Object.fromEntries(ids.map(id => [id, defaultReview()])) as GameLabState['review'] }
}

export function sanitizeGameLabState(raw: unknown): GameLabState {
  const defaults = defaultGameLabState()
  if (!raw || typeof raw !== 'object') return defaults
  const input = raw as Record<string, unknown>
  const enabledIn = input.enabled && typeof input.enabled === 'object' ? input.enabled as Record<string, unknown> : {}
  const reviewIn = input.review && typeof input.review === 'object' ? input.review as Record<string, unknown> : {}
  for (const id of ids) {
    defaults.enabled[id] = enabledIn[id] === true
    const entry = reviewIn[id] && typeof reviewIn[id] === 'object' ? reviewIn[id] as Record<string, unknown> : {}
    defaults.review[id] = {
      notes: typeof entry.notes === 'string' ? entry.notes.slice(0, 4000) : '',
      transfer: entry.transfer === true,
      scope: entry.scope === 'selected-modes' ? 'selected-modes' : 'whole-game',
      modes: Array.isArray(entry.modes) ? [...new Set(entry.modes.filter((m): m is string => typeof m === 'string' && modes.includes(m)))].slice(0, modes.length) : [],
      policy: entry.policy === 'always-on' ? 'always-on' : 'optional',
      tested: entry.tested === true,
    }
  }
  return defaults
}

export function loadGameLabState(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): GameLabState {
  try { return sanitizeGameLabState(JSON.parse(storage?.getItem(GAME_LAB_KEY) ?? 'null')) }
  catch { return defaultGameLabState() }
}

export function saveGameLabState(state: GameLabState, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try { storage?.setItem(GAME_LAB_KEY, JSON.stringify(sanitizeGameLabState(state))); return !!storage }
  catch { return false }
}

export function activeExperiments(state: GameLabState): ExperimentId[] {
  return ids.filter(id => state.enabled[id])
}

/** Online sessions may opt into locally tested visual features, never changed physics. */
export function experimentsForMatch(state: GameLabState, online = false): ExperimentId[] {
  const active = activeExperiments(state)
  if (!online) return active
  return active.filter(id => EXPERIMENTS.find(experiment => experiment.id === id)?.kind !== 'physics' && state.review[id].tested)
}
