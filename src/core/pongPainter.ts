export type PainterCategory = 'theme' | 'eye' | 'paddle' | 'glass' | 'arena' | 'ball' | 'tear'
export interface PainterProduct {
  id: string
  category: PainterCategory
  name: string
  description: string
  price: number
  rarity: 'uncommon' | 'rare'
  value: string
}

/** Extend this catalog with new paint recipes; simulation state never reads these values. */
export const PONG_PAINTER_PRODUCTS: readonly PainterProduct[] = [
  { id: 'deep-teal', category: 'theme', name: 'Deep Current', description: 'Shift the shaft toward deep teal and sea glass.', price: 900, rarity: 'rare', value: 'hue-rotate(138deg) saturate(1.25)' },
  { id: 'violet-hour', category: 'theme', name: 'Violet Hour', description: 'Turn the shaft into a dusk-lit violet fall.', price: 900, rarity: 'rare', value: 'hue-rotate(205deg) saturate(1.2)' },
  { id: 'moonwatch', category: 'eye', name: 'Moonwatch Iris', description: 'Give the watching eyes a cool lunar rim.', price: 350, rarity: 'uncommon', value: '#a6d9ff' },
  { id: 'ember-eye', category: 'eye', name: 'Ember Iris', description: 'Set the wall eyes aglow with a warm copper rim.', price: 500, rarity: 'rare', value: '#ff9b70' },
  { id: 'gold-pin', category: 'paddle', name: 'Gilded Pin', description: 'Warm gold paddles and pinball arms.', price: 350, rarity: 'uncommon', value: '#ffd279' },
  { id: 'signal-cyan', category: 'paddle', name: 'Signal Cyan', description: 'Give both paddles a bright electric-blue edge.', price: 500, rarity: 'rare', value: '#72f2f0' },
  { id: 'aurora-pane', category: 'glass', name: 'Aurora Pane', description: 'Tint intact glass edges with pale green light.', price: 500, rarity: 'rare', value: '#9cf5db' },
  { id: 'rose-fracture', category: 'glass', name: 'Rose Fracture', description: 'Let cracks catch a vivid rose-colored glint.', price: 500, rarity: 'rare', value: '#ff8ab4' },
  { id: 'foundry-frame', category: 'arena', name: 'Foundry Frame', description: 'Trace the personal arena in molten amber.', price: 500, rarity: 'rare', value: '#ffbd72' },
  { id: 'deep-space-frame', category: 'arena', name: 'Deep Space Frame', description: 'Outline each personal arena in starfield blue.', price: 500, rarity: 'rare', value: '#8a9bff' },
  { id: 'sun-core', category: 'ball', name: 'Sun Core', description: 'Give the ball a soft warm center.', price: 350, rarity: 'uncommon', value: '#fff0b3' },
  { id: 'comet-core', category: 'ball', name: 'Comet Core', description: 'Color the ball with a cool, bright comet glow.', price: 500, rarity: 'rare', value: '#8ff9ff' },
  { id: 'violet-tear', category: 'tear', name: 'Violet Tear', description: 'Recolor the falling tears with violet light.', price: 350, rarity: 'uncommon', value: '#d9a4ff' },
  { id: 'rose-tear', category: 'tear', name: 'Rose Tear', description: 'Give collected tears a warm rose and coral glow.', price: 500, rarity: 'rare', value: '#ff91bd' },
]

export const PAINTER_CATEGORIES: readonly { id: PainterCategory; label: string; note: string }[] = [
  { id: 'theme', label: 'Themes', note: 'Shaft palette and atmosphere' },
  { id: 'eye', label: 'Eyes', note: 'Iris rims and gaze accents' },
  { id: 'paddle', label: 'Paddles', note: 'Paddles and pinball arms' },
  { id: 'glass', label: 'Glass', note: 'Pane tint and fracture accents' },
  { id: 'arena', label: 'Arenas', note: 'Frames and structural accents' },
  { id: 'ball', label: 'Balls', note: 'Ball color and glow' },
  { id: 'tear', label: 'Tears', note: 'Collectible color and glow' },
]

export const PONG_PAINTER_UNLOCK_FALLS = 1
export const PONG_PAINTER_SELECTION_KEY = 'pongfall.painter.selection.v1'
export type PainterSelection = Partial<Record<PainterCategory, string>>
export interface PainterColors { themeFilter: string; eye: string; paddle: string; glass: string; arena: string; ball: string; tear: string; tearGlow: string }

export function sanitizePainterSelection(raw: unknown): PainterSelection {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const result: PainterSelection = {}
  for (const category of PAINTER_CATEGORIES) {
    const selected = value[category.id]
    if (typeof selected === 'string' && PONG_PAINTER_PRODUCTS.some(item => item.category === category.id && item.id === selected)) result[category.id] = selected
  }
  return result
}

export function loadPainterSelection(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): PainterSelection {
  try { return sanitizePainterSelection(JSON.parse(storage?.getItem(PONG_PAINTER_SELECTION_KEY) ?? 'null')) } catch { return {} }
}

export function savePainterSelection(selection: PainterSelection, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try { storage?.setItem(PONG_PAINTER_SELECTION_KEY, JSON.stringify(sanitizePainterSelection(selection))); return !!storage } catch { return false }
}

export function painterColors(selection: PainterSelection): PainterColors {
  const chosen = Object.fromEntries(PONG_PAINTER_PRODUCTS.filter(item => selection[item.category] === item.id).map(item => [item.category, item.value])) as Partial<Record<PainterCategory, string>>
  return { themeFilter: chosen.theme ?? '', eye: chosen.eye ?? '', paddle: chosen.paddle ?? '#e9f2ff', glass: chosen.glass ?? '', arena: chosen.arena ?? '', ball: chosen.ball ?? '#ffffff', tear: chosen.tear ?? '#4aa8ff', tearGlow: chosen.tear ? chosen.tear : '#7cc0ff' }
}

/** Build a one-item-per-slot look using only cosmetics the account owns. */
export function randomOwnedPainterSelection(ownedSkus: ReadonlySet<string>, random: () => number = Math.random): PainterSelection {
  const result: PainterSelection = {}
  for (const category of PAINTER_CATEGORIES) {
    const owned = PONG_PAINTER_PRODUCTS.filter(item => item.category === category.id && ownedSkus.has(painterSku(item)))
    if (owned.length) result[category.id] = owned[Math.min(owned.length - 1, Math.floor(random() * owned.length))]!.id
  }
  return result
}

export function painterSku(product: PainterProduct): string { return `pongfall.${product.category}.${product.id}` }

