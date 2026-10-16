import test from 'node:test'
import assert from 'node:assert/strict'
import { PACK_ITEMS, SLEEVE_ITEMS, SLEEVE_DEFAULTS, RARITIES } from './packItems'
import { emptySleeve, equipSleeve, sanitizeSleeve, sleeveItemsOf, sleeveSpec, SLEEVE_SLOTS } from './packSleeve'
import { drawCardBack, drawCardFace, drawPackWrap } from './packSleeveArt'
import { drawItemArt, drawTokenArt } from './lokPackArt'
import { drawAmbient } from '../world/ambient'
import { paletteFor } from '../world/palette'
import { UI_THEMES, themeUnlocked } from './uiThemes'
import { cleanCosmetic, sanitizeLilEye } from './lilEye'
import { ALL_PAINTER_ITEMS, painterUnlocked, painterColors, productSlot } from './pongPainter'
import { parseFrame } from '../render/arenaFrame'

const stub = (): CanvasRenderingContext2D => { const fn: unknown = new Proxy(function () { /* noop */ }, { get: (_t, k) => k === Symbol.toPrimitive ? () => 0 : stub(), set: () => true, apply: () => stub() }); return fn as CanvasRenderingContext2D }

test('the Loksleeve has three kinds, each with a free starter and several finds', () => {
  assert.deepEqual(SLEEVE_SLOTS.map(s => s.slot), ['packSkin', 'cardBack', 'cardFrame'])
  for (const { slot } of SLEEVE_SLOTS) { assert.ok(sleeveItemsOf(slot).length >= 5, slot); assert.ok(SLEEVE_DEFAULTS[slot]) }
  assert.equal(sleeveSpec(emptySleeve(), 'cardBack'), SLEEVE_DEFAULTS.cardBack)
})
test('only owned sleeve items can be equipped, and swapping changes what is drawn', () => {
  const id = sleeveItemsOf('cardBack')[0]!.id
  assert.equal(sanitizeSleeve({ cardBack: id }, () => false).cardBack, '')
  assert.equal(sanitizeSleeve({ cardBack: id, packSkin: 'nope' }, () => true).cardBack, id)
  assert.equal(sanitizeSleeve({ packSkin: id }, () => true).packSkin, '')   // wrong slot
  const s = equipSleeve(emptySleeve(), 'cardBack', id)
  assert.equal(sleeveSpec(s, 'cardBack').pattern, SLEEVE_ITEMS.find(i => i.id === id)!.sleeve!.pattern)
})
test('every sleeve spec and every item draws at any time and reduced motion', () => {
  for (const reduce of [false, true]) for (const t of [0, 3.7]) {
    for (const it of PACK_ITEMS) drawItemArt(stub(), it, 50, 50, 100, t, reduce)
    for (const it of SLEEVE_ITEMS) { drawPackWrap(stub(), 0, 0, 100, 140, it.sleeve!, 'Win Pack', t, reduce); drawCardBack(stub(), 0, 0, 100, 140, it.sleeve!, t, reduce); drawCardFace(stub(), 0, 0, 100, 140, it.sleeve!, { name: 'X', type: 'Y', rarityName: 'Rare', rarityColor: '#6fb1ff', art: () => { /* none */ } }, t, reduce) }
    drawTokenArt(stub(), 10, 10, 80, '#ffc857', t, reduce)
  }
})
test('pack painter looks are well formed, wired into PongPainter and owned only through packs', () => {
  const packs = ALL_PAINTER_ITEMS.filter(i => i.pack)
  assert.ok(packs.length >= 15)
  for (const i of packs) { assert.equal(i.price, 0); assert.ok(RARITIES.includes(i.rarity)); assert.equal(painterUnlocked(i, { falls: 999, wins: 999 }), false, i.id) }
  const frame = packs.find(i => i.id === 'aurora-frame')!
  assert.equal(parseFrame(frame.value)?.style, 'aurora'); assert.equal(productSlot(frame), 'arena.frame')
  assert.equal(painterColors({ 'arena.frame': 'aurora-frame' }).slots['arena.frame'], frame.value)
})
test('pack themes need a pack, and LilEye cosmetics are kept only when owned', () => {
  const packThemes = UI_THEMES.filter(t => t.pack); assert.ok(packThemes.length >= 4)
  for (const t of packThemes) { assert.equal(themeUnlocked(t, { falls: 999, wins: 999 }), false, t.id); assert.ok(paletteFor(t.look).anim) }
  assert.equal(cleanCosmetic('eye-hat-crown', 'hat'), '')   // not owned in a fresh test profile
  assert.equal(cleanCosmetic('eye-hat-crown', 'aura'), '')
  assert.equal(sanitizeLilEye({ hat: 'eye-hat-crown', aura: 'nonsense' }).hat, '')
})
test('animated backdrops draw', () => { for (const k of ['embers', 'aurora', 'snow', 'stars'] as const) for (const reduce of [false, true]) drawAmbient(stub(), k, 800, 600, 3.3, paletteFor(), reduce); drawAmbient(stub(), undefined, 1, 1, 0, paletteFor(), false) })

import { BACKDROP_IDS, backdropId, drawBackdrop } from '../render/backdrops'
import { ownedPatterns, defaultSides, PACK_PATTERNS, BACK_PATTERNS } from './arenaSides'
import { drawSideBack } from '../render/sideLayers'
import { defaultLook } from './arenaSides'
import { CUES } from '../audio/cues'
test('every shaft backdrop draws, and each has a painter item (earned or pack)', () => {
  for (const id of BACKDROP_IDS) for (const reduce of [false, true]) for (const t of [0, 5.5]) drawBackdrop(stub(), id, -400, -300, 800, 600, t, 1234, reduce)
  assert.equal(backdropId('nope'), null); assert.equal(backdropId('stormfront'), 'stormfront')
  const have = new Set(ALL_PAINTER_ITEMS.filter(i => productSlot(i) === 'theme.backdrop').map(i => i.value))
  for (const id of BACKDROP_IDS) assert.ok(id === 'deep-well' || have.has(id), id)   // deep-well is the free starter
  assert.equal(painterColors({ 'theme.backdrop': 'storm' }).slots['theme.backdrop'], 'none')
})
test('pack-only side glass patterns are dropped from your own look unless owned, and all draw', () => {
  const sides = defaultSides(); sides.sides[0].pattern = 'aurora'; sides.sides[1].pattern = 'grid'
  const none = ownedPatterns(sides, () => false); assert.equal(none.sides[0].pattern, 'none'); assert.equal(none.sides[1].pattern, 'grid')
  assert.equal(ownedPatterns(sides, () => true).sides[0].pattern, 'aurora')
  for (const p of BACK_PATTERNS) for (const reduce of [false, true]) drawSideBack(stub(), { ...defaultLook(), pattern: p, tint: 0.3 }, 0, 640, 400, 2, reduce)
  for (const item of Object.values(PACK_PATTERNS)) assert.ok(PACK_ITEMS.some(i => i.id === item && i.kind === 'sidebg'), item)
})
test('pack opening has its own sounds', () => { for (const c of ['packShake', 'packBurst', 'packFlip', 'packRare'] as const) assert.ok(CUES[c].ms > 0 && CUES[c].gain > 0, c) })
