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
  rarity: 'common' | 'uncommon' | 'rare'
  value: string
  slot?: PainterSlot
  /** Earned by playing instead of bought with LokTokens (price 0, never in the LOK catalogue). */
  unlock?: { falls?: number; wins?: number }
}
export type PainterGroup = Exclude<PainterCategory, 'eyeType'>
export type PainterSlot = 'theme.palette'|'theme.filter'|'eye.iris'|'eye.lid'|'eye.pupil'|'eye.blink'|'paddle.face'|'paddle.arm'|'paddle.power'|'glass.pane'|'glass.crack'|'glass.shatter'|'arena.frame'|'arena.ceiling'|'arena.clamp'|'arena.floor'|'ball.core'|'ball.trail'|'ball.impact'|'tear.droplet'|'tear.halo'|'tear.burst'|'paddle.style'|'ball.shape'|'tear.shape'|'ball.trailStyle'|'arena.girder'|'theme.hud'
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
  ['paddle.style','paddle','Body style','bevel','bar'],['ball.shape','ball','Shape','ring','orb'],['tear.shape','tear','Shape','star','drop'],['ball.trailStyle','ball','Trail style','sparks','line'],['arena.girder','arena','Girder style','truss','plain'],['theme.hud','theme','Score font','mono','sans'],
] as [PainterSlot,PainterGroup,string,string,string][]).map(([id,group,label,value,defaultValue]) => ({ id, group, label, defaultValue, starter: { id: `starter-${id}`, name: `${label} · Alt`, description: `A free ${label.toLowerCase()} finish for your fall.`, value } }))
export const productSlot = (product: PainterProduct): PainterSlot => product.slot ?? ({theme:'theme.filter',eye:'eye.iris',eyeType:'eye.pupil',paddle:'paddle.face',glass:product.id==='rose-fracture'?'glass.crack':'glass.pane',arena:'arena.frame',ball:'ball.core',tear:'tear.droplet'} as Record<PainterCategory,PainterSlot>)[product.category]

/** Extend this catalog with new paint recipes; simulation state never reads these values. */
export const PONG_PAINTER_PRODUCTS: readonly PainterProduct[] = [
  { id: 'deep-teal', category: 'theme', name: 'Deep Current', description: 'Shift the shaft toward deep teal and sea glass.', price: 900, rarity: 'rare', value: 'hue-rotate(138deg) saturate(1.25)' },
  { id: 'violet-hour', category: 'theme', name: 'Violet Hour', description: 'Turn the shaft into a dusk-lit violet fall.', price: 900, rarity: 'rare', value: 'hue-rotate(205deg) saturate(1.2)' },
  { id: 'moonwatch', category: 'eye', name: 'Moonwatch Iris', description: 'Give the watching eyes a cool lunar rim.', price: 350, rarity: 'uncommon', value: '#a6d9ff' },
  { id: 'ember-eye', category: 'eye', name: 'Ember Iris', description: 'Set the wall eyes aglow with a warm copper rim.', price: 500, rarity: 'rare', value: '#ff9b70' },
  { id: 'gold-pin', category: 'paddle', name: 'Gilded Pin', description: 'Warm gold paddles and pinball arms.', price: 350, rarity: 'uncommon', value: '#ffd279' },
  { id: 'signal-cyan', category: 'paddle', name: 'Pulse Cyan', description: 'Give both paddles a bright electric-blue edge.', price: 500, rarity: 'rare', value: '#72f2f0' },
  { id: 'aurora-pane', category: 'glass', name: 'Aurora Pane', description: 'Tint intact glass edges with pale green light.', price: 500, rarity: 'rare', value: '#9cf5db' },
  { id: 'rose-fracture', category: 'glass', name: 'Rose Fracture', description: 'Let cracks catch a vivid rose-colored glint.', price: 500, rarity: 'rare', value: '#ff8ab4' },
  { id: 'foundry-frame', category: 'arena', name: 'Foundry Frame', description: 'A riveted angle-iron frame with a molten amber glow.', price: 500, rarity: 'rare', value: 'foundry:#ffbd72' },
  { id: 'deep-space-frame', category: 'arena', name: 'Deep Space Frame', description: 'A starfield frame with orbiting lights.', price: 500, rarity: 'rare', value: 'deepspace:#8a9bff' },
  { id: 'sun-core', category: 'ball', name: 'Sun Core', description: 'Give the ball a soft warm center.', price: 350, rarity: 'uncommon', value: '#fff0b3' },
  { id: 'comet-core', category: 'ball', name: 'Comet Core', description: 'Color the ball with a cool, bright comet glow.', price: 500, rarity: 'rare', value: '#8ff9ff' },
  { id: 'violet-tear', category: 'tear', name: 'Violet Tear', description: 'Recolor the falling tears with violet light.', price: 350, rarity: 'uncommon', value: '#d9a4ff' },
  { id: 'rose-tear', category: 'tear', name: 'Rose Tear', description: 'Give collected tears a warm rose and coral glow.', price: 500, rarity: 'rare', value: '#ff91bd' },
]

// ---- earned looks: free, unlocked by falls and wins, so every part of PongPainter works offline and for guests -----------------------------
type Row = [id: string, name: string, value: string, req: { falls?: number; wins?: number }]
const earn = (category: PainterCategory, slot: PainterSlot, rows: Row[], what: string): PainterProduct[] => rows.map(([id, name, value, unlock]) => ({ id, category, slot, name, description: `${name}: ${what}`, price: 0, rarity: 'common' as const, value, unlock }))
export const PAINTER_EARNED: readonly PainterProduct[] = [
  ...earn('theme', 'theme.filter', [['ember-hour', 'Ember Hour', 'hue-rotate(-24deg) saturate(1.3)', { falls: 2 }], ['moss-light', 'Moss Light', 'hue-rotate(85deg) saturate(1.1)', { falls: 4 }], ['noir-fall', 'Noir Fall', 'grayscale(.85) contrast(1.12)', { falls: 6 }], ['sepia-shaft', 'Sepia Shaft', 'sepia(.7) saturate(1.1)', { wins: 1 }], ['cold-steel', 'Cold Steel', 'hue-rotate(185deg) saturate(.7)', { falls: 9 }], ['candy-drop', 'Candy Drop', 'hue-rotate(290deg) saturate(1.5)', { wins: 3 }]], 'a colour grade for the whole shaft.'),
  ...earn('theme', 'theme.palette', [['night-shaft', 'Night Shaft', '#05080f', { falls: 3 }], ['rust-depths', 'Rust Depths', '#1a0f0a', { falls: 7 }], ['bottle-green', 'Bottle Green', '#08170f', { wins: 2 }], ['plum-dark', 'Plum Dark', '#150a1c', { wins: 4 }]], 'the backdrop behind the shaft.'),
  ...earn('eye', 'eye.iris', [['lime-iris', 'Lime Iris', '#b6f06a', { falls: 2 }], ['rose-iris', 'Rose Iris', '#ff8fb8', { falls: 3 }], ['gold-iris', 'Gold Iris', '#ffd45e', { wins: 2 }], ['ice-iris', 'Ice Iris', '#c9f1ff', { falls: 5 }], ['void-iris', 'Void Iris', '#6a5cff', { wins: 4 }]], 'the colour of the watching eyes.'),
  ...earn('eye', 'eye.lid', [['bronze-lid', 'Bronze Lid', '#c08a52', { falls: 4 }], ['slate-lid', 'Slate Lid', '#7d8aa6', { falls: 6 }], ['rose-lid', 'Rose Lid', '#d98aa8', { wins: 2 }]], 'the metal of the eyelids.'),
  ...earn('eye', 'eye.blink', [['mint-blink', 'Mint Blink', '#9fffd8', { falls: 3 }], ['rose-blink', 'Rose Blink', '#ff9ec0', { wins: 1 }]], 'the flash when the eyes blink.'),
  ...earn('paddle', 'paddle.face', [['mint-face', 'Mint Paddle', '#7dffc2', { falls: 2 }], ['coral-face', 'Coral Paddle', '#ff8a7a', { falls: 4 }], ['chrome-face', 'Chrome Paddle', '#dfe6f2', { falls: 6 }], ['royal-face', 'Royal Paddle', '#7a8cff', { wins: 2 }], ['lemon-face', 'Lemon Paddle', '#fff27a', { wins: 4 }]], 'the face of your paddle.'),
  ...earn('paddle', 'paddle.arm', [['copper-arm', 'Copper Arm', '#d9895a', { falls: 3 }], ['ice-arm', 'Ice Arm', '#a9dcff', { falls: 7 }], ['lime-arm', 'Lime Arm', '#b9ef6a', { wins: 2 }]], 'the pinball arm.'),
  ...earn('paddle', 'paddle.power', [['gold-power', 'Gold Power', '#ffd45e', { falls: 5 }], ['rose-power', 'Rose Power', '#ff8fb8', { wins: 3 }]], 'the glow of a power hit.'),
  ...earn('paddle', 'paddle.style', [['round-body', 'Pill', 'round', { falls: 2 }], ['neon-body', 'Neon Rod', 'neon', { falls: 4 }], ['segment-body', 'Segmented', 'segmented', { falls: 6 }], ['hazard-body', 'Hazard Bar', 'hazard', { falls: 9 }], ['pixel-body', 'Pixel Bar', 'pixel', { wins: 2 }], ['glass-body', 'Glass Pane', 'glass', { wins: 3 }], ['blade-body', 'Blade', 'blade', { wins: 5 }]], 'the shape of your paddle.'),
  ...earn('ball', 'ball.shape', [['star-ball', 'Star', 'star', { falls: 3 }], ['diamond-ball', 'Diamond', 'diamond', { falls: 5 }], ['square-ball', 'Cube', 'square', { falls: 7 }], ['eye-ball', 'Eyeball', 'eye', { wins: 2 }], ['planet-ball', 'Planet', 'planet', { wins: 4 }], ['pulse-ball', 'Pulse', 'pulse', { falls: 11 }]], 'the shape of the ball.'),
  ...earn('tear', 'tear.shape', [['heart-tear', 'Heart', 'heart', { falls: 3 }], ['crescent-tear', 'Crescent', 'crescent', { falls: 6 }], ['diamond-tear', 'Gem', 'diamond', { wins: 2 }], ['leaf-tear', 'Leaf', 'leaf', { falls: 9 }]], 'the shape of falling tears.'),
  ...earn('ball', 'ball.trailStyle', [['ribbon-trail', 'Ribbon', 'ribbon', { falls: 4 }], ['bubble-trail', 'Bubbles', 'bubbles', { falls: 6 }], ['pixel-trail', 'Pixels', 'pixels', { wins: 2 }], ['flame-trail', 'Flame', 'flame', { falls: 9 }], ['star-trail', 'Stardust', 'stars', { wins: 4 }]], 'how the ball leaves a trail.'),
  ...earn('arena', 'arena.girder', [['hazard-girder', 'Hazard Girders', 'hazard', { falls: 4 }], ['pipe-girder', 'Pipe Girders', 'pipe', { falls: 6 }], ['oak-girder', 'Oak Beams', 'oak', { falls: 8 }], ['glass-girder', 'Glass Beams', 'glass', { wins: 3 }]], 'the beams above and below your arena.'),
  ...earn('theme', 'theme.hud', [['serif-hud', 'Serif Score', 'serif', { falls: 2 }], ['display-hud', 'Poster Score', 'display', { falls: 5 }], ['rounded-hud', 'Soft Score', 'rounded', { wins: 1 }], ['slab-hud', 'Slab Score', 'slab', { falls: 8 }]], 'the lettering of the score.'),
  ...earn('glass', 'glass.pane', [['amber-pane', 'Amber Pane', '#ffcf8a', { falls: 3 }], ['violet-pane', 'Violet Pane', '#cbb0ff', { falls: 5 }], ['mint-pane', 'Mint Pane', '#aaf5d0', { wins: 1 }], ['smoke-pane', 'Smoke Pane', '#9aa7b8', { falls: 8 }]], 'the tint of intact glass.'),
  ...earn('glass', 'glass.crack', [['gold-crack', 'Gold Crack', '#ffd45e', { falls: 4 }], ['red-crack', 'Red Crack', '#ff7a7a', { wins: 2 }], ['blue-crack', 'Blue Crack', '#7ac8ff', { falls: 6 }]], 'the light in the cracks.'),
  ...earn('glass', 'glass.shatter', [['ember-shards', 'Ember Shards', '#ff9a5a', { falls: 5 }], ['mint-shards', 'Mint Shards', '#8fffd0', { falls: 8 }], ['rose-shards', 'Rose Shards', '#ff9ad5', { wins: 3 }]], 'the colour of flying shards.'),
  ...earn('arena', 'arena.frame', [
    ['neon-tube', 'Neon Tube', 'neon:#ff4fd8', { wins: 2 }], ['hoarfrost', 'Hoarfrost', 'ice:#9fe0ff', { falls: 11 }], ['green-board', 'Green Board', 'circuit:#4dff88', { wins: 4 }], ['chain-gang', 'Chain Gang', 'chain:#cfd6e0', { falls: 13 }], ['gilded-scroll', 'Gilded Scroll', 'gilded:#e8c25a', { wins: 6 }],
    ['oak-frame', 'Oak Frame', 'oak:#a8703a', { falls: 15 }], ['hazard-sill', 'Hazard Sill', 'hazard:#ffcf3a', { falls: 9 }], ['brass-bezel', 'Brass Bezel', 'brass:#c79a3a', { falls: 7 }], ['cold-forge', 'Cold Forge', 'foundry:#6fd0ff', { falls: 3 }], ['nebula', 'Nebula', 'deepspace:#c07aff', { falls: 5 }],
    ['teal-line', 'Teal Line', '#5ff0d8', { falls: 1 }], ['amber-line', 'Amber Line', '#ffb347', { falls: 2 }],
  ], 'a frame around your arena.'),
  ...earn('arena', 'arena.ceiling', [['amber-ceiling', 'Amber Girders', '#ffb347', { falls: 3 }], ['teal-ceiling', 'Teal Girders', '#5ff0d8', { falls: 5 }], ['rose-ceiling', 'Rose Girders', '#ff8fb8', { wins: 2 }], ['white-ceiling', 'Bone Girders', '#e8e4da', { falls: 8 }]], 'the girders above your arena.'),
  ...earn('arena', 'arena.floor', [['amber-floor', 'Amber Floor', '#ffb347', { falls: 3 }], ['teal-floor', 'Teal Floor', '#5ff0d8', { falls: 5 }], ['violet-floor', 'Violet Floor', '#b99cff', { wins: 2 }]], 'the girders below your arena.'),
  ...earn('arena', 'arena.clamp', [['brass-clamp', 'Brass Clamps', '#d9b25a', { falls: 4 }], ['red-clamp', 'Red Clamps', '#ff7a7a', { wins: 2 }], ['mint-clamp', 'Mint Clamps', '#84f1d0', { falls: 6 }]], 'the clamps that hold the girders.'),
  ...earn('ball', 'ball.core', [['ember-core', 'Ember Core', '#ff9a5a', { falls: 2 }], ['ice-core', 'Ice Core', '#bfefff', { falls: 4 }], ['lime-core', 'Lime Core', '#c8ff7a', { wins: 2 }], ['pink-core', 'Pink Core', '#ff9ad5', { wins: 3 }]], 'the heart of the ball.'),
  ...earn('ball', 'ball.trail', [['gold-trail', 'Gold Trail', '#ffd45e', { falls: 3 }], ['rose-trail', 'Rose Trail', '#ff8fb8', { falls: 5 }], ['mint-trail', 'Mint Trail', '#8fffd0', { wins: 2 }]], 'the streak behind the ball.'),
  ...earn('ball', 'ball.impact', [['white-impact', 'White Impact', '#ffffff', { falls: 3 }], ['mint-impact', 'Mint Impact', '#8fffd0', { falls: 6 }], ['violet-impact', 'Violet Impact', '#c79bff', { wins: 3 }]], 'the flash when the ball hits.'),
  ...earn('tear', 'tear.droplet', [['gold-tear', 'Gold Tear', '#ffd45e', { falls: 3 }], ['mint-tear', 'Mint Tear', '#8fffd0', { falls: 5 }], ['crimson-tear', 'Crimson Tear', '#ff6a8a', { wins: 3 }]], 'the colour of falling tears.'),
  ...earn('tear', 'tear.halo', [['gold-halo', 'Gold Halo', '#ffe08a', { falls: 4 }], ['mint-halo', 'Mint Halo', '#aaffe0', { falls: 6 }], ['rose-halo', 'Rose Halo', '#ffb0d0', { wins: 2 }]], 'the glow around tears.'),
  ...earn('tear', 'tear.burst', [['white-burst', 'White Burst', '#ffffff', { falls: 3 }], ['rose-burst', 'Rose Burst', '#ff9ec0', { falls: 6 }], ['mint-burst', 'Mint Burst', '#9fffd8', { wins: 3 }]], 'the burst when a tear is collected.'),
]
/** Everything the painter can equip: bought with LokTokens, or earned. */
export const ALL_PAINTER_ITEMS: readonly PainterProduct[] = [...PONG_PAINTER_PRODUCTS, ...PAINTER_EARNED]
export const painterUnlocked = (item: PainterProduct, p: { falls: number; wins: number }): boolean => !!item.unlock && (item.unlock.falls ?? 0) <= p.falls && (item.unlock.wins ?? 0) <= p.wins
export const unlockNote = (item: PainterProduct): string => item.unlock ? [item.unlock.falls ? `${item.unlock.falls} falls` : '', item.unlock.wins ? `${item.unlock.wins} ${item.unlock.wins === 1 ? 'win' : 'wins'}` : ''].filter(Boolean).join(' and ') : ''

/** Tear-funded iris paints are local unlocks, separate from the LOK-token catalog. */
export const TEAR_IRIS_COLORS = [
  { id: 'iris-mint', name: 'Afterglow Mint', value: '#73f0c7', description: 'A cool green shimmer from the shaft fog.' },
  { id: 'iris-ember', name: 'Furnace Ember', value: '#ff9a67', description: 'Warm copper light, like a vent after a long fall.' },
  { id: 'iris-violet', name: 'Deep Violet', value: '#c28bff', description: 'A purple gaze from somewhere below.' },
  { id: 'iris-gold', name: 'Last Light', value: '#ffd46e', description: 'Bright gold, saved from the edge of the shaft.' },
  { id: 'iris-rose', name: 'Rose Static', value: '#ff83b7', description: 'A strange pink spark in the glass.' },
  { id: 'iris-arctic', name: 'Cold Pulse', value: '#76dbff', description: 'Ice blue with a sharp pulse glow.' },
  { id: 'iris-cobalt', name: 'Deep Cobalt', value: '#547bff', description: 'A saturated blue stare from the lower shaft.' },
  { id: 'iris-lime', name: 'Volt Lime', value: '#ceff70', description: 'Electric yellow-green energy around the pupil.' },
  { id: 'iris-pearl', name: 'Ghost Pearl', value: '#e4eaff', description: 'A pale spectral iris against the dark glass.' },
  { id: 'iris-crimson', name: 'Warning Red', value: '#ff626c', description: 'A hot red pulse when the walls wake.' },
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
const SESSION_SELECTION_KEY = 'pongfall.painter.selection.session.v1'
export function isPainterDevSession(): boolean { try { return sessionStorage.getItem('pongfall.devMode.session') === 'true' } catch { return false } }
export type PainterSelection = Partial<Record<PainterCategory | PainterSlot, string>>
export interface PainterColors { themeFilter: string; eye: string; eyeType: EyeType; paddle: string; glass: string; arena: string; ball: string; tear: string; tearGlow: string; slots: Record<PainterSlot,string> }

export function sanitizePainterSelection(raw: unknown): PainterSelection {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const result: PainterSelection = {}
  for (const category of PAINTER_CATEGORIES) {
    const selected = value[category.id]
    if (typeof selected === 'string' && (ALL_PAINTER_ITEMS.some(item => item.category === category.id && item.id === selected) || category.id === 'eye' && TEAR_IRIS_COLORS.some(color => color.id === selected) || category.id === 'eyeType' && PAINTER_EYE_TYPES.some(type => type.id === selected))) result[category.id] = selected
  }
  if (typeof value.eyeType === 'string' && PAINTER_EYE_TYPES.some(type => type.id === value.eyeType)) result.eyeType = value.eyeType
  for (const slot of PAINTER_SLOTS) {
    const selected = value[slot.id]
    if (typeof selected === 'string' && (selected === slot.starter.id || ALL_PAINTER_ITEMS.some(item => productSlot(item) === slot.id && item.id === selected) || slot.id === 'eye.iris' && TEAR_IRIS_COLORS.some(color => color.id === selected) || slot.id === 'eye.pupil' && PAINTER_EYE_TYPES.some(type => type.id === selected))) result[slot.id] = selected
  }
  const legacy: Partial<Record<PainterCategory,PainterSlot>> = { theme:'theme.filter',eye:'eye.iris',eyeType:'eye.pupil',paddle:'paddle.face',glass:'glass.pane',arena:'arena.frame',ball:'ball.core',tear:'tear.droplet' }
  for (const [category,slot] of Object.entries(legacy) as [PainterCategory,PainterSlot][]) {
    const id = result[category]
    if (id && !result[slot]) result[ALL_PAINTER_ITEMS.find(item => item.category === category && item.id === id)?.slot ?? (category === 'glass' && id === 'rose-fracture' ? 'glass.crack' : slot)] = id
    delete result[category]
  }
  return result
}

export function loadPainterSelection(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage, includeSession = true): PainterSelection {
  try {
    const persistent = sanitizePainterSelection(JSON.parse(storage?.getItem(PONG_PAINTER_SELECTION_KEY) ?? storage?.getItem(LEGACY_SELECTION_KEY) ?? 'null'))
    if (!includeSession || !isPainterDevSession()) return persistent
    const temporary = sessionStorage.getItem(SESSION_SELECTION_KEY)
    return temporary ? sanitizePainterSelection(JSON.parse(temporary)) : persistent
  } catch { return {} }
}

export function savePainterSelection(selection: PainterSelection, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage, allowSession = true): boolean {
  try {
    if (allowSession && isPainterDevSession()) sessionStorage.setItem(SESSION_SELECTION_KEY, JSON.stringify(sanitizePainterSelection(selection)))
    else storage?.setItem(PONG_PAINTER_SELECTION_KEY, JSON.stringify(sanitizePainterSelection(selection)))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-paint-changed'))
    return allowSession && isPainterDevSession() || !!storage
  } catch { return false }
}

export function painterColors(selection: PainterSelection): PainterColors {
  const slots = {} as Record<PainterSlot,string>
  for (const slot of PAINTER_SLOTS) {
    const legacySlot: Partial<Record<PainterCategory,PainterSlot>> = { theme:'theme.filter',eye:'eye.iris',eyeType:'eye.pupil',paddle:'paddle.face',glass:'glass.pane',arena:'arena.frame',ball:'ball.core',tear:'tear.droplet' }
    const id = selection[slot.id] ?? (legacySlot[slot.group] === slot.id ? selection[slot.group] : undefined) ?? (slot.id === 'eye.pupil' ? selection.eyeType : undefined)
    slots[slot.id] = id === slot.starter.id ? slot.starter.value : ALL_PAINTER_ITEMS.find(item => productSlot(item) === slot.id && item.id === id)?.value ?? (slot.id === 'eye.iris' ? TEAR_IRIS_COLORS.find(color => color.id === id)?.value : undefined) ?? (slot.id === 'eye.pupil' && PAINTER_EYE_TYPES.some(type => type.id === id) ? id : undefined) ?? slot.defaultValue
  }
  return { themeFilter: slots['theme.filter'], eye: slots['eye.iris'], eyeType: slots['eye.pupil'] as EyeType, paddle: slots['paddle.face'], glass: slots['glass.pane'], arena: slots['arena.frame'], ball: slots['ball.core'], tear: slots['tear.droplet'], tearGlow: slots['tear.halo'], slots }
}

/** Build a one-item-per-slot look using only cosmetics the account owns. */
export function randomOwnedPainterSelection(ownedSkus: ReadonlySet<string>, random: () => number = Math.random): PainterSelection {
  const result: PainterSelection = {}
  for (const slot of PAINTER_SLOTS) {
    const owned = ALL_PAINTER_ITEMS.filter(item => productSlot(item) === slot.id && ownedSkus.has(painterSku(item)))
    const choices = [slot.starter.id, ...owned.map(item => item.id), ...(slot.id === 'eye.iris' ? TEAR_IRIS_COLORS.filter(color => ownedSkus.has(`pongfall.tear-eye.${color.id}`)).map(color => color.id) : []), ...(slot.id === 'eye.pupil' ? PAINTER_EYE_TYPES.filter(type => type.id !== 'round').map(type => type.id) : [])]
    result[slot.id] = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]!
  }
  return result
}

export function painterSku(product: PainterProduct): string { return `pongfall.${product.category}.${product.id}` }

