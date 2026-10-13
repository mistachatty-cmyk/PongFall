/** Device-local settings and playtest notes for optional Game Lab experiments. */
export const GAME_LAB_KEY = 'pongfall.gameLab.v1'
export const GAME_LAB_VERSION = '0.20.0'

export const EXPERIMENTS = [
  { id: 'shaft-districts', title: 'Shaft districts', kind: 'visual', summary: 'Add restrained color and metal details to sections of the existing shaft.' },
  { id: 'eye-remembers', title: 'The eye remembers', kind: 'visual', summary: 'Let the watching eyes carry a subtle mark from your local fall history.' },
  { id: 'old-glass-traces', title: 'Old glass traces', kind: 'visual', summary: 'Show faint, decorative fracture etchings beneath the current pane.' },
  { id: 'echo-rallies', title: 'Echo rallies', kind: 'visual', summary: 'Leave a soft, short-lived echo of the ball’s recent path.' },
  { id: 'shaft-signals', title: 'Shaft signals', kind: 'visual', summary: 'Reveal occasional lights and symbols in the deep shaft.' },
  { id: 'paddle-wake-physics', title: 'Paddle wake', kind: 'physics', summary: 'Moving paddles stir a subtle current near the ball. Offline only; replay verified.' },
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
  return active.filter(id => id !== 'paddle-wake-physics' && state.review[id].tested)
}
