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
  slot?: PainterSlot
}
export type PainterGroup = Exclude<PainterCategory, 'eyeType'>
export type PainterSlot = 'theme.palette'|'theme.filter'|'eye.iris'|'eye.lid'|'eye.pupil'|'eye.blink'|'paddle.face'|'paddle.arm'|'paddle.power'|'glass.pane'|'glass.crack'|'glass.shatter'|'arena.frame'|'arena.ceiling'|'arena.clamp'|'arena.floor'|'ball.core'|'ball.trail'|'ball.impact'|'tear.droplet'|'tear.halo'|'tear.burst'
export interface PainterStarter { id: string; name: string; description: string; value: string }
export interface PainterSlotDefinition { id: PainterSlot; group: PainterGroup; label: string; starter: PainterStarter; defaultValue: string }
export const PAINTER_SLOTS: readonly PainterSlotDefinition[] = ([
  ['theme.palette','theme','Palette','#17324b','#0b0e14'],['theme.filter','theme','Filter','hue-rotate(32deg) saturate(1.1)',''],
  ['eye.iris','eye','Iris','#80e8df','#68b6e7'],['eye.lid','eye','Lid','#bd9bdb','#736192'],['eye.pupil','eye','Pupil','slit','round'],['eye.blink','eye','Blink','#ffd681','#e5e0d3'],
  ['paddle.face','paddle','Face','#8ee9f1','#e9f2ff'],['paddle.arm','paddle','Arm','#f3b674','#8c9cb6'],['paddle.power','paddle','Power accent','#d8a6ff','#a5ffca'],
  ['glass.pane','glass','Pane','#8dcfe3','#bfe6ff'],['glass.crack','glass','Crack','#ffcb8a','#ffffff'],['glass.shatter','glass','Shatter','#b8a5ff','#c8e6ff'],
  ['arena.frame','arena','Frame','#a8b9ff','#4aa8ff'],['arena.ceiling','arena','Ceiling','#ffcb87','#bfe6ff'],['arena.clamp','arena','Clamp','#84f1d0','#aebbd1'],['arena.floor','arena','Floor','#bd9aff','#4aa8ff'],
  ['ball.core','ball','Core','#ffe0a0','#ffffff'],['ball.trail','ball','Trail','#8de8ff','#acdfff'],['ball.impact','ball','Impact','#ff9e91','#ffbf70'],
  ['tear.droplet','tear','Droplet','#b69cff','#4aa8ff'],['tear.halo','tear','Halo','#e7a8f5','#7cc0ff'],['tear.burst','tear','Collection burst','#ffe19c','#8ac9ff'],
] as [PainterSlot,PainterGroup,string,string,string][]).map(([id,group,label,value,defaultValue]) => ({ id, group, label, defaultValue, starter: { id: `starter-${id}`, name: `${label} · Alt`, description: `A free ${label.toLowerCase()} finish for your fall.`, value } }))
export const productSlot = (product: PainterProduct): PainterSlot => product.slot ?? ({theme:'theme.filter',eye:'eye.iris',eyeType:'eye.pupil',paddle:'paddle.face',glass:product.id==='rose-fracture'?'glass.crack':'glass.pane',arena:'arena.frame',ball:'ball.core',tear:'tear.droplet'} as Record<PainterCategory,PainterSlot>)[product.category]

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
  { id: 'paddle', label: 'Paddles', note: 'Paddles and pinball arms' },
  { id: 'glass', label: 'Glass', note: 'Pane tint and fracture accents' },
  { id: 'arena', label: 'Arenas', note: 'Frames and structural accents' },
  { id: 'ball', label: 'Balls', note: 'Ball color and glow' },
  { id: 'tear', label: 'Tears', note: 'Collectible color and glow' },
]

export const PONG_PAINTER_UNLOCK_FALLS = 1
export const PONG_PAINTER_SELECTION_KEY = 'pongfall.painter.selection.v2'
const LEGACY_SELECTION_KEY = 'pongfall.painter.selection.v1'
export type PainterSelection = Partial<Record<PainterCategory | PainterSlot, string>>
export interface PainterColors { themeFilter: string; eye: string; eyeType: EyeType; paddle: string; glass: string; arena: string; ball: string; tear: string; tearGlow: string; slots: Record<PainterSlot,string> }

export function sanitizePainterSelection(raw: unknown): PainterSelection {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const result: PainterSelection = {}
  for (const category of PAINTER_CATEGORIES) {
    const selected = value[category.id]
    if (typeof selected === 'string' && (PONG_PAINTER_PRODUCTS.some(item => item.category === category.id && item.id === selected) || category.id === 'eye' && TEAR_IRIS_COLORS.some(color => color.id === selected) || category.id === 'eyeType' && PAINTER_EYE_TYPES.some(type => type.id === selected))) result[category.id] = selected
  }
  if (typeof value.eyeType === 'string' && PAINTER_EYE_TYPES.some(type => type.id === value.eyeType)) result.eyeType = value.eyeType
  for (const slot of PAINTER_SLOTS) {
    const selected = value[slot.id]
    if (typeof selected === 'string' && (selected === slot.starter.id || PONG_PAINTER_PRODUCTS.some(item => productSlot(item) === slot.id && item.id === selected) || slot.id === 'eye.iris' && TEAR_IRIS_COLORS.some(color => color.id === selected) || slot.id === 'eye.pupil' && PAINTER_EYE_TYPES.some(type => type.id === selected))) result[slot.id] = selected
  }
  const legacy: Partial<Record<PainterCategory,PainterSlot>> = { theme:'theme.filter',eye:'eye.iris',eyeType:'eye.pupil',paddle:'paddle.face',glass:'glass.pane',arena:'arena.frame',ball:'ball.core',tear:'tear.droplet' }
  for (const [category,slot] of Object.entries(legacy) as [PainterCategory,PainterSlot][]) {
    const id = result[category]
    if (id && !result[slot]) result[PONG_PAINTER_PRODUCTS.find(item => item.category === category && item.id === id)?.slot ?? (category === 'glass' && id === 'rose-fracture' ? 'glass.crack' : slot)] = id
    delete result[category]
  }
  return result
}

export function loadPainterSelection(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): PainterSelection {
  try { return sanitizePainterSelection(JSON.parse(storage?.getItem(PONG_PAINTER_SELECTION_KEY) ?? storage?.getItem(LEGACY_SELECTION_KEY) ?? 'null')) } catch { return {} }
}

export function savePainterSelection(selection: PainterSelection, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try { storage?.setItem(PONG_PAINTER_SELECTION_KEY, JSON.stringify(sanitizePainterSelection(selection))); if (storage && typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-paint-changed')); return !!storage } catch { return false }
}

export function painterColors(selection: PainterSelection): PainterColors {
  const slots = {} as Record<PainterSlot,string>
  for (const slot of PAINTER_SLOTS) {
    const legacySlot: Partial<Record<PainterCategory,PainterSlot>> = { theme:'theme.filter',eye:'eye.iris',eyeType:'eye.pupil',paddle:'paddle.face',glass:'glass.pane',arena:'arena.frame',ball:'ball.core',tear:'tear.droplet' }
    const id = selection[slot.id] ?? (legacySlot[slot.group] === slot.id ? selection[slot.group] : undefined) ?? (slot.id === 'eye.pupil' ? selection.eyeType : undefined)
    slots[slot.id] = id === slot.starter.id ? slot.starter.value : PONG_PAINTER_PRODUCTS.find(item => productSlot(item) === slot.id && item.id === id)?.value ?? (slot.id === 'eye.iris' ? TEAR_IRIS_COLORS.find(color => color.id === id)?.value : undefined) ?? (slot.id === 'eye.pupil' && PAINTER_EYE_TYPES.some(type => type.id === id) ? id : undefined) ?? slot.defaultValue
  }
  return { themeFilter: slots['theme.filter'], eye: slots['eye.iris'], eyeType: slots['eye.pupil'] as EyeType, paddle: slots['paddle.face'], glass: slots['glass.pane'], arena: slots['arena.frame'], ball: slots['ball.core'], tear: slots['tear.droplet'], tearGlow: slots['tear.halo'], slots }
}

/** Build a one-item-per-slot look using only cosmetics the account owns. */
export function randomOwnedPainterSelection(ownedSkus: ReadonlySet<string>, random: () => number = Math.random): PainterSelection {
  const result: PainterSelection = {}
  for (const slot of PAINTER_SLOTS) {
    const owned = PONG_PAINTER_PRODUCTS.filter(item => productSlot(item) === slot.id && ownedSkus.has(painterSku(item)))
    const choices = [slot.starter.id, ...owned.map(item => item.id), ...(slot.id === 'eye.iris' ? TEAR_IRIS_COLORS.filter(color => ownedSkus.has(`pongfall.tear-eye.${color.id}`)).map(color => color.id) : []), ...(slot.id === 'eye.pupil' ? PAINTER_EYE_TYPES.filter(type => type.id !== 'round').map(type => type.id) : [])]
    result[slot.id] = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]!
  }
  return result
}

export function painterSku(product: PainterProduct): string { return `pongfall.${product.category}.${product.id}` }

