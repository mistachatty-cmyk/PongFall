import { MODIFIERS } from './modifiers'
import { EXPERIMENTS, type ExperimentId } from '../../core/gameLab'
import { PONG_PAINTER_PRODUCTS, TEAR_IRIS_COLORS } from '../../core/pongPainter'

/** Stable IDs make a run reproducible even as its presentation grows modular. */
export type RunContentKind = 'rule' | 'event' | 'visual' | 'asset' | 'effect'
export type RunContentSafety = 'simulation' | 'presentation'

export interface RunContentDefinition {
  id: string
  name: string
  kind: RunContentKind
  safety: RunContentSafety
  introduced: string
  description: string
  /** Existing simulation modifier, when this module changes deterministic rules. */
  modifierId?: string
  /** Existing Game Lab switch, when this module is an experimental feature. */
  experimentId?: ExperimentId
  /** Asset/effect modules occupy a slot so compatible packs can be swapped. */
  slot?: 'shaft' | 'arena' | 'glass' | 'paddle' | 'ball' | 'tear' | 'eye' | 'ambience'
  online: 'allowed' | 'tested-visual-only' | 'offline-only'
  defaultEnabled: boolean
}

/** Catalog is data-first: new run content is registered here, then composed once at match start. */
export const RUN_CONTENT: readonly RunContentDefinition[] = [
  ...Object.values(MODIFIERS).map((modifier): RunContentDefinition => ({
    id: `rule:${modifier.id}`,
    name: modifier.label,
    kind: modifier.id === 'wind-vents' ? 'event' : 'rule',
    safety: modifier.id === 'wind-vents' || modifier.id === 'paddle-wake-physics' ? 'simulation' : 'simulation',
    introduced: modifier.id === 'wind-vents' ? '0.24.0' : '0.1.1',
    description: modifier.blurb,
    modifierId: modifier.id,
    online: ['wind-vents', 'paddle-wake-physics'].includes(modifier.id) ? 'offline-only' : 'allowed',
    defaultEnabled: false,
  })),
  ...EXPERIMENTS.map((experiment): RunContentDefinition => ({
    id: `lab:${experiment.id}`,
    name: experiment.title,
    kind: experiment.kind === 'physics' ? (experiment.id === 'wind-vents' ? 'event' : 'rule') : 'visual',
    safety: experiment.kind === 'physics' ? 'simulation' : 'presentation',
    introduced: experiment.introduced,
    description: experiment.summary,
    experimentId: experiment.id,
    ...(experiment.kind === 'physics' ? { modifierId: experiment.id } : {}),
    online: experiment.kind === 'physics' ? 'offline-only' : 'tested-visual-only',
    defaultEnabled: false,
  })),
  ...(['shaft', 'arena', 'glass', 'paddle', 'ball', 'tear', 'eye', 'ambience'] as const).map(slot => ({
    id: `asset:${slot}:classic`, name: `Classic ${slot}`, kind: 'asset' as const,
    safety: 'presentation' as const, introduced: '0.1.0', description: `Original ${slot} presentation pack.`,
    slot, online: 'allowed' as const, defaultEnabled: true,
  })),
  ...PONG_PAINTER_PRODUCTS.map((product): RunContentDefinition => ({
    id: `asset:${product.category === 'theme' ? 'shaft' : product.category}:${product.id}`,
    name: product.name,
    kind: 'asset',
    safety: 'presentation',
    introduced: '0.23.0',
    description: product.description,
    slot: product.category === 'theme' ? 'shaft' : product.category,
    online: 'allowed',
    defaultEnabled: false,
  })),
  ...TEAR_IRIS_COLORS.map((iris): RunContentDefinition => ({
    id: `asset:eye:${iris.id}`,
    name: iris.name,
    kind: 'asset',
    safety: 'presentation',
    introduced: '0.24.0',
    description: iris.description,
    slot: 'eye',
    online: 'allowed',
    defaultEnabled: false,
  })),
] as const

export interface RunContentSelection {
  /** Rule/event IDs and presentation module IDs selected for this run. */
  modules?: string[]
  /** One selected pack per slot. Omitted slots use their default pack. */
  assets?: Partial<Record<NonNullable<RunContentDefinition['slot']>, string>>
  online?: boolean
}

export interface ComposedRunContent {
  modules: RunContentDefinition[]
  modifierIds: string[]
  experimentIds: ExperimentId[]
  assetPacks: NonNullable<RunContentDefinition['slot']>[]
  simulationChanged: boolean
  unranked: boolean
  rejected: Array<{ id: string; reason: string }>
}

/** Resolves a loadout once, rejects unsafe online modules, and removes duplicate/conflicting slot packs. */
export function composeRunContent(selection: RunContentSelection): ComposedRunContent {
  const byId = new Map(RUN_CONTENT.map(item => [item.id, item]))
  const chosen = new Map<string, RunContentDefinition>()
  const rejected: ComposedRunContent['rejected'] = []
  for (const id of [...new Set(selection.modules ?? [])]) {
    const item = byId.get(id)
    if (!item) { rejected.push({ id, reason: 'Unknown content ID' }); continue }
    if (selection.online && item.online === 'offline-only') { rejected.push({ id, reason: 'Simulation content is offline-only until verified for online play' }); continue }
    if (item.kind === 'asset' && item.slot && chosen.has(`slot:${item.slot}`)) { rejected.push({ id, reason: `The ${item.slot} slot already has a selected pack` }); continue }
    chosen.set(item.kind === 'asset' && item.slot ? `slot:${item.slot}` : item.id, item)
  }
  for (const [slot, id] of Object.entries(selection.assets ?? {})) {
    const item = byId.get(id)
    if (!item || item.kind !== 'asset' || item.slot !== slot) { rejected.push({ id, reason: `Invalid asset pack for ${slot}` }); continue }
    chosen.set(`slot:${slot}`, item)
  }
  for (const item of RUN_CONTENT.filter(entry => entry.kind === 'asset' && entry.defaultEnabled)) {
    if (!chosen.has(`slot:${item.slot}`)) chosen.set(`slot:${item.slot}`, item)
  }
  const modules = [...chosen.values()]
  const modifierIds = [...new Set(modules.flatMap(item => item.modifierId ? [item.modifierId] : []))]
  const experimentIds = [...new Set(modules.flatMap(item => item.experimentId ? [item.experimentId] : []))]
  const assetPacks = modules.filter(item => item.kind === 'asset').map(item => item.slot!).filter((slot, index, all) => all.indexOf(slot) === index)
  const simulationChanged = modules.some(item => item.safety === 'simulation')
  return { modules, modifierIds, experimentIds, assetPacks, simulationChanged, unranked: simulationChanged || experimentIds.length > 0, rejected }
}

/** Stable catalog lookup used by the Game Lab and save/replay inspectors. */
export function getRunContent(id: string): RunContentDefinition | undefined {
  return RUN_CONTENT.find(item => item.id === id)
}
