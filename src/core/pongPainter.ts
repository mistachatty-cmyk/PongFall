export type PainterCategory = 'theme' | 'eye' | 'eyeType' | 'paddle' | 'glass' | 'arena' | 'ball' | 'tear'
export type EyeType = 'round' | 'slit' | 'diamond' | 'ring'
export const PAINTER_EYE_TYPES: readonly { id: EyeType; name: string; description: string }[] = [
  { id: 'round', name: 'Watcher', description: 'The familiar round pupil.' },
  { id: 'slit', name: 'Night Hunter', description: 'A narrow, alert slit that follows the rally.' },
  { id: 'diamond', name: 'Prism Gaze', description: 'A sharp diamond pupil cut from shaft light.' },
  { id: 'ring', name: 'Eclipse', description: 'A hollow dark ring with a glowing center.' },
]
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

/** Tear-funded iris paints are local unlocks, separate from the LOK-token catalog. */
export const TEAR_IRIS_COLORS = [
  { id: 'iris-mint', name: 'Afterglow Mint', value: '#73f0c7', description: 'A cool green shimmer from the shaft fog.' },
  { id: 'iris-ember', name: 'Furnace Ember', value: '#ff9a67', description: 'Warm copper light, like a vent after a long fall.' },
  { id: 'iris-violet', name: 'Deep Violet', value: '#c28bff', description: 'A purple gaze from somewhere below.' },
  { id: 'iris-gold', name: 'Last Light', value: '#ffd46e', description: 'Bright gold, saved from the edge of the shaft.' },
  { id: 'iris-rose', name: 'Rose Static', value: '#ff83b7', description: 'A strange pink spark in the glass.' },
  { id: 'iris-arctic', name: 'Cold Signal', value: '#76dbff', description: 'Ice blue with a sharp signal glow.' },
  { id: 'iris-cobalt', name: 'Deep Cobalt', value: '#547bff', description: 'A saturated blue stare from the lower shaft.' },
  { id: 'iris-lime', name: 'Volt Lime', value: '#ceff70', description: 'Electric yellow-green energy around the pupil.' },
  { id: 'iris-pearl', name: 'Ghost Pearl', value: '#e4eaff', description: 'A pale spectral iris against the dark glass.' },
  { id: 'iris-crimson', name: 'Warning Red', value: '#ff626c', description: 'A hot red signal when the walls wake.' },
] as const

export const PAINTER_CATEGORIES: readonly { id: PainterCategory; label: string; note: string }[] = [
  { id: 'theme', label: 'Themes', note: 'Shaft palette and atmosphere' },
  { id: 'eye', label: 'Eyes', note: 'Iris rims and gaze accents' },
  { id: 'eyeType', label: 'Eye types', note: 'Pupil silhouettes for the menu and wall eyes' },
  { id: 'paddle', label: 'Paddles', note: 'Paddles and pinball arms' },
  { id: 'glass', label: 'Glass', note: 'Pane tint and fracture accents' },
  { id: 'arena', label: 'Arenas', note: 'Frames and structural accents' },
  { id: 'ball', label: 'Balls', note: 'Ball color and glow' },
  { id: 'tear', label: 'Tears', note: 'Collectible color and glow' },
]

export const PONG_PAINTER_UNLOCK_FALLS = 1
export const PONG_PAINTER_SELECTION_KEY = 'pongfall.painter.selection.v1'
export type PainterSelection = Partial<Record<PainterCategory, string>>
export interface PainterColors { themeFilter: string; eye: string; eyeType: EyeType; paddle: string; glass: string; arena: string; ball: string; tear: string; tearGlow: string }

export function sanitizePainterSelection(raw: unknown): PainterSelection {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const result: PainterSelection = {}
  for (const category of PAINTER_CATEGORIES) {
    const selected = value[category.id]
    if (typeof selected === 'string' && (PONG_PAINTER_PRODUCTS.some(item => item.category === category.id && item.id === selected) || category.id === 'eye' && TEAR_IRIS_COLORS.some(color => color.id === selected) || category.id === 'eyeType' && PAINTER_EYE_TYPES.some(type => type.id === selected))) result[category.id] = selected
  }
  return result
}

export function loadPainterSelection(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): PainterSelection {
  try { return sanitizePainterSelection(JSON.parse(storage?.getItem(PONG_PAINTER_SELECTION_KEY) ?? 'null')) } catch { return {} }
}

export function savePainterSelection(selection: PainterSelection, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try { storage?.setItem(PONG_PAINTER_SELECTION_KEY, JSON.stringify(sanitizePainterSelection(selection))); if (storage && typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-paint-changed')); return !!storage } catch { return false }
}

export function painterColors(selection: PainterSelection): PainterColors {
  const chosen = Object.fromEntries(PONG_PAINTER_PRODUCTS.filter(item => selection[item.category] === item.id).map(item => [item.category, item.value])) as Partial<Record<PainterCategory, string>>
  const iris = TEAR_IRIS_COLORS.find(color => color.id === selection.eye)
  return { themeFilter: chosen.theme ?? '', eye: iris?.value ?? chosen.eye ?? '', eyeType: PAINTER_EYE_TYPES.find(type => type.id === selection.eyeType)?.id ?? 'round', paddle: chosen.paddle ?? '#e9f2ff', glass: chosen.glass ?? '', arena: chosen.arena ?? '', ball: chosen.ball ?? '#ffffff', tear: chosen.tear ?? '#4aa8ff', tearGlow: chosen.tear ? chosen.tear : '#7cc0ff' }
}

/** Build a one-item-per-slot look using only cosmetics the account owns. */
export function randomOwnedPainterSelection(ownedSkus: ReadonlySet<string>, random: () => number = Math.random): PainterSelection {
  const result: PainterSelection = {}
  for (const category of PAINTER_CATEGORIES) {
    const owned = PONG_PAINTER_PRODUCTS.filter(item => item.category === category.id && ownedSkus.has(painterSku(item)))
    const choices = [...owned.map(item => item.id), ...(category.id === 'eye' ? TEAR_IRIS_COLORS.filter(color => ownedSkus.has(`pongfall.tear-eye.${color.id}`)).map(color => color.id) : []), ...(category.id === 'eyeType' ? PAINTER_EYE_TYPES.filter(type => type.id !== 'round').map(type => type.id) : [])]
    if (choices.length) result[category.id] = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]!
  }
  return result
}

export function painterSku(product: PainterProduct): string { return `pongfall.${product.category}.${product.id}` }

