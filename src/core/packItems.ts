// Everything a LokPack can hold, as plain data. Pack-only looks never cost LokTokens and never touch the sim: they are PongPainter looks, menu/world
// themes and LilEye cosmetics. A pack can also hold Customization Tokens (CT) and bonus packs (see lokPack.ts for the rolls).
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type Rarity = typeof RARITIES[number]
export const RARITY_META: Record<Rarity, { name: string; color: string; glow: string }> = {
  common: { name: 'Common', color: '#b9c6d8', glow: '#8aa0bd' },
  uncommon: { name: 'Uncommon', color: '#7be0a6', glow: '#3fbf7a' },
  rare: { name: 'Rare', color: '#6fb1ff', glow: '#3d86e0' },
  epic: { name: 'Epic', color: '#c79bff', glow: '#9a5cf0' },
  legendary: { name: 'Legendary', color: '#ffc857', glow: '#ff9a2e' },
}
export const rarityIndex = (r: Rarity): number => RARITIES.indexOf(r)

export type PackItemKind = 'painter' | 'theme' | 'lileye' | 'sleeve'
export type PainterPackCategory = 'arena' | 'ball' | 'paddle' | 'eye' | 'glass' | 'tear'
export type PainterPackSlot = 'arena.frame' | 'arena.girder' | 'ball.trailStyle' | 'ball.shape' | 'paddle.style' | 'eye.iris' | 'paddle.face' | 'glass.pane' | 'ball.core' | 'tear.droplet'
export type LilEyeSlot = 'aura' | 'hat'
/** The Loksleeve (after 616 Survivor's Neon Sleeve): three kinds of container look, one equipped per kind. Items inside are swapped by equipping another. */
export type SleeveSlot = 'packSkin' | 'cardBack' | 'cardFrame'
export interface SleeveSpec { slot: SleeveSlot; a: string; b: string; glow: string; pattern: string; mark?: string }
export interface PackItem {
  id: string
  kind: PackItemKind
  rarity: Rarity
  name: string
  note: string
  /** Moves on its own (the card shimmers and the look animates unless reduce motion or potato mode is on). */
  animated?: boolean
  painter?: { category: PainterPackCategory; slot: PainterPackSlot; value: string }
  lileye?: { slot: LilEyeSlot; value: string }
  sleeve?: SleeveSpec
}

const painter = (id: string, rarity: Rarity, name: string, note: string, category: PainterPackCategory, slot: PainterPackSlot, value: string, animated = false): PackItem =>
  ({ id, kind: 'painter', rarity, name, note, animated, painter: { category, slot, value } })
const frame = (id: string, rarity: Rarity, name: string, note: string, style: string, color: string, animated = true) => painter(id, rarity, name, note, 'arena', 'arena.frame', `${style}:${color}`, animated)

const sl = (id: string, rarity: Rarity, name: string, note: string, slot: SleeveSlot, a: string, b: string, glow: string, pattern: string, mark?: string, animated = false): PackItem =>
  ({ id, kind: 'sleeve', rarity, name, note, animated, sleeve: { slot, a, b, glow, pattern, ...(mark ? { mark } : {}) } })
export const SLEEVE_DEFAULTS: Record<SleeveSlot, SleeveSpec> = {
  packSkin: { slot: 'packSkin', a: '#6f7d96', b: '#222a38', glow: '#8aa0bd', pattern: 'plain', mark: 'LOK' },
  cardBack: { slot: 'cardBack', a: '#1b2a44', b: '#0a111f', glow: '#6fb1ff', pattern: 'plain', mark: 'PF' },
  cardFrame: { slot: 'cardFrame', a: '#c9d6ea', b: '#5a6f8f', glow: '#8aa0bd', pattern: 'edge' },
}
export const SLEEVE_ITEMS: readonly PackItem[] = [
  // ---- pack wraps ----
  sl('wrap-kraft', 'common', 'Kraft Wrap', 'A hand-stamped paper sleeve.', 'packSkin', '#c8a77a', '#7a5c36', '#e8cf9f', 'kraft', 'LOK'),
  sl('wrap-retro', 'common', 'Retro Neon Wrap', 'The classic neon-green trading pack.', 'packSkin', '#6dff9a', '#0c3a1c', '#6dff9a', 'retro', 'PF'),
  sl('wrap-foil', 'uncommon', 'Foil Wrap', 'A crimped foil pouch.', 'packSkin', '#9fd0ff', '#2a4f86', '#9fd0ff', 'foil', 'LOK'),
  sl('wrap-holo', 'rare', 'Prism Holo Wrap', 'Iridescent rainbow foil.', 'packSkin', '#ffffff', '#3a2a66', '#c79bff', 'holo', '◆'),
  sl('wrap-gold', 'legendary', 'Gilt Foil Wrap', 'Crinkled gold with a moving highlight.', 'packSkin', '#ffd77a', '#6e4c14', '#ffc857', 'gold', '★', true),
  sl('wrap-platinum', 'legendary', 'Platinum Chrome Wrap', 'Cold mirror-chrome foil.', 'packSkin', '#eef3fb', '#5d6a80', '#cfe0ff', 'platinum', '✦', true),
  sl('wrap-holo-live', 'epic', 'Prism Holo Live', 'The rainbow foil, alive.', 'packSkin', '#ffffff', '#2a1a55', '#ff7ae0', 'holo-live', '◆', true),
  sl('wrap-retro-live', 'epic', 'Retro Neon Live', 'Scanlines roll down the neon pack.', 'packSkin', '#6dff9a', '#062414', '#6dff9a', 'retro-live', 'PF', true),
  // ---- card backs ----
  sl('back-neon', 'rare', 'Neon Arcade Back', 'Black enamel, a hot-pink tube border and a cyan grid.', 'cardBack', '#ff4fd8', '#08040f', '#4ff0ff', 'neon-grid', 'PF'),
  sl('back-walnut', 'uncommon', 'Walnut Back', 'Carved walnut and a brass hub.', 'cardBack', '#7a4a26', '#2a170a', '#d9a55a', 'walnut', 'PF'),
  sl('back-iron', 'uncommon', 'Rail Yard Back', 'Riveted steel and hazard tape.', 'cardBack', '#7d8794', '#22262d', '#ffcf3a', 'iron', 'PF'),
  sl('back-ice', 'rare', 'Floodwall Ice Back', 'Frozen glass around a cut ice core.', 'cardBack', '#bfeaff', '#2a5f86', '#9fe0ff', 'ice', 'PF'),
  sl('back-foundry', 'rare', 'Foundry Back', 'Cracked cast iron with molten seams.', 'cardBack', '#ff8a3d', '#1a0c08', '#ff6a3d', 'foundry', 'PF'),
  sl('back-geode', 'legendary', 'Geode Back', 'A split amethyst geode with a faceted core.', 'cardBack', '#c79bff', '#2a1250', '#e6c9ff', 'geode', 'PF', true),
  sl('back-rack', 'legendary', 'Server Rack Back', 'Mesh with blinking status lights.', 'cardBack', '#4dff88', '#06120a', '#4dff88', 'rack', 'PF', true),
  // ---- card frames ----
  sl('frame-cyber', 'common', 'Cyber Frame', 'An emerald edge with a soft glow.', 'cardFrame', '#4dff88', '#0b2a16', '#4dff88', 'edge'),
  sl('frame-amber', 'common', 'Amber Frame', 'A warm amber edge.', 'cardFrame', '#ffb347', '#3a2208', '#ffb347', 'edge'),
  sl('frame-void', 'uncommon', 'Void Frame', 'A deep purple edge.', 'cardFrame', '#9a5cf0', '#1a0a3a', '#c79bff', 'edge'),
  sl('frame-pixel', 'uncommon', 'Pixel Frame', 'A pink edge with a cyan ring.', 'cardFrame', '#ff6ad5', '#2a0a2a', '#4ff0ff', 'pixel'),
  sl('frame-gold', 'rare', 'Prismatic Gold Frame', 'A heavy gold edge.', 'cardFrame', '#ffd45e', '#5a3c08', '#ffe9a8', 'gilded'),
  sl('frame-printed', 'rare', 'Printed Stock Frame', 'Flat ink on card stock with a collector number.', 'cardFrame', '#efe6d0', '#3a3a44', '#b89a5a', 'printed'),
  sl('frame-spellbook', 'legendary', 'Spellbook Frame', 'Cost line, art window, type line and rules text.', 'cardFrame', '#e8c25a', '#241a3a', '#ffe9a8', 'tcg', undefined, true),
]

export const PACK_ITEMS: readonly PackItem[] = [
  ...SLEEVE_ITEMS,
  // ---- personal arena: frames ----
  frame('stained-frame', 'rare', 'Stained Glass Frame', 'Leaded coloured panes that catch the light.', 'stained', '#ff7ab8', false),
  frame('vine-frame', 'rare', 'Overgrowth Frame', 'Iron slowly swallowed by creeping vines.', 'vines', '#6fdc7a'),
  frame('aurora-frame', 'epic', 'Aurora Frame', 'Curtains of green and violet light drift around the glass.', 'aurora', '#7affc8'),
  frame('plasma-frame', 'epic', 'Plasma Frame', 'A tube of living plasma with a crawling arc.', 'plasma', '#b07aff'),
  frame('ember-frame', 'epic', 'Cinderline Frame', 'A bed of coals with rising sparks.', 'embers', '#ff8a3d'),
  frame('storm-frame', 'legendary', 'Stormcage Frame', 'Lightning walks the frame and forks into the shaft.', 'storm', '#9fd2ff'),
  frame('prism-frame', 'legendary', 'Prism Frame', 'A slow rainbow turns through cut crystal.', 'prism', '#ffffff'),
  // ---- ball trails, shapes ----
  painter('comet-trail', 'rare', 'Comet Tail', 'A tapering tail of ice and dust.', 'ball', 'ball.trailStyle', 'comet', true),
  painter('rainbow-trail', 'epic', 'Rainbow Wake', 'Every hit leaves a ribbon of colour.', 'ball', 'ball.trailStyle', 'rainbow', true),
  painter('lightning-trail', 'legendary', 'Chain Lightning', 'The ball crackles and forks as it flies.', 'ball', 'ball.trailStyle', 'lightning', true),
  painter('nova-ball', 'epic', 'Nova', 'A spinning star of rays.', 'ball', 'ball.shape', 'nova', true),
  painter('orbit-ball', 'legendary', 'Orbit', 'A ball with three small moons.', 'ball', 'ball.shape', 'orbit', true),
  // ---- girders and paddles ----
  painter('neon-girder', 'rare', 'Neon Girders', 'Glowing tubes above and below your arena.', 'arena', 'arena.girder', 'neon', true),
  painter('crystal-girder', 'epic', 'Crystal Beams', 'Cut crystal beams with a travelling glint.', 'arena', 'arena.girder', 'crystal', true),
  painter('ember-paddle', 'rare', 'Hot Iron Paddle', 'A paddle straight from the forge.', 'paddle', 'paddle.style', 'ember', true),
  painter('aurora-paddle', 'epic', 'Aurora Paddle', 'A paddle of slow, shifting light.', 'paddle', 'paddle.style', 'aurora', true),
  // ---- plain colours so every tier has more than a few cards ----
  painter('sunset-iris', 'common', 'Sunset Iris', 'Warm orange eyes in the walls.', 'eye', 'eye.iris', '#ff9d5c'),
  painter('lilac-face', 'common', 'Lilac Paddle', 'A soft lilac paddle face.', 'paddle', 'paddle.face', '#c9a8ff'),
  painter('rose-pane', 'uncommon', 'Rose Pane', 'Glass with a rose-quartz tint.', 'glass', 'glass.pane', '#ffb3cf'),
  painter('cinder-core', 'uncommon', 'Cinder Core', 'A ball with a coal-red heart.', 'ball', 'ball.core', '#ff9a5a'),
  painter('aqua-tear', 'uncommon', 'Aqua Tear', 'Tears the colour of shallow water.', 'tear', 'tear.droplet', '#6fe6e0'),
  // ---- menu and world themes ----
  { id: 'cinder', kind: 'theme', rarity: 'rare', name: 'Cinder', note: 'Charred steel with drifting sparks.', animated: true },
  { id: 'aurora-hall', kind: 'theme', rarity: 'epic', name: 'Aurora Hall', note: 'Northern lights behind every plaque.', animated: true },
  { id: 'snowglobe', kind: 'theme', rarity: 'epic', name: 'Snowglobe', note: 'Cold glass and slowly falling snow.', animated: true },
  { id: 'starfall', kind: 'theme', rarity: 'legendary', name: 'Starfall', note: 'A night sky that never stops falling.', animated: true },
  // ---- LilEye cosmetics ----
  { id: 'eye-hat-party', kind: 'lileye', rarity: 'common', name: 'Party Hat', note: 'LilEye is celebrating something.', lileye: { slot: 'hat', value: 'party' } },
  { id: 'eye-hat-beanie', kind: 'lileye', rarity: 'uncommon', name: 'Beanie', note: 'Warm. A little too big.', lileye: { slot: 'hat', value: 'beanie' } },
  { id: 'eye-hat-monocle', kind: 'lileye', rarity: 'rare', name: 'Monocle', note: 'Distinguished. Judging you.', lileye: { slot: 'hat', value: 'monocle' } },
  { id: 'eye-hat-halo', kind: 'lileye', rarity: 'epic', name: 'Halo', note: 'A gently bobbing ring of light.', animated: true, lileye: { slot: 'hat', value: 'halo' } },
  { id: 'eye-hat-crown', kind: 'lileye', rarity: 'legendary', name: 'Crown', note: 'All hail the watcher.', animated: true, lileye: { slot: 'hat', value: 'crown' } },
  { id: 'eye-aura-ember', kind: 'lileye', rarity: 'rare', name: 'Ember Aura', note: 'Warm sparks rise around LilEye.', animated: true, lileye: { slot: 'aura', value: 'ember' } },
  { id: 'eye-aura-aurora', kind: 'lileye', rarity: 'epic', name: 'Aurora Aura', note: 'A slow ribbon of colour orbits LilEye.', animated: true, lileye: { slot: 'aura', value: 'aurora' } },
  { id: 'eye-aura-void', kind: 'lileye', rarity: 'legendary', name: 'Void Aura', note: 'The dark leans in to look back.', animated: true, lileye: { slot: 'aura', value: 'void' } },
]
export const packItemById = (id: string): PackItem | undefined => PACK_ITEMS.find(i => i.id === id)
export const packItemsOf = (kind: PackItemKind): PackItem[] => PACK_ITEMS.filter(i => i.kind === kind)
export const packItemsOfRarity = (r: Rarity): PackItem[] => PACK_ITEMS.filter(i => i.rarity === r)
