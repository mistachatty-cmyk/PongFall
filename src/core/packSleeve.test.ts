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
import { PAINTER_SLOTS } from './pongPainter'
const PAINTER_STARTERS = new Set(PAINTER_SLOTS.map(s => s.starter.value))

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

import { IMPACT_STYLES, BURST_STYLES, CORNER_STYLES, LIGHT_STYLES, drawPops, drawCorners, drawLights, queuePop, agePops, MAX_POPS, impactStyle } from '../render/effects'
import { sanitizeOutfits, ownedOutfit, toggleFav, cleanOutfitName, MAX_OUTFITS } from './outfits'
test('every hit, burst, corner and light style draws, pops are bounded and age out', () => {
  const pops: import('../render/effects').Pop[] = []
  for (let i = 0; i < 60; i++) queuePop(pops, { kind: i % 2 ? 'hit' : 'score', x: 0, y: 0, seed: i })
  assert.ok(pops.length <= MAX_POPS)
  for (const reduce of [false, true]) {
    for (const s of IMPACT_STYLES) for (const b of BURST_STYLES) { const live = pops.map(p => ({ ...p, age: 0.2 })); drawPops(stub(), live, s, b, '#ffbf70', reduce) }
    for (const s of CORNER_STYLES) for (const t of [0, 3]) drawCorners(stub(), s, 640, 400, t, reduce)
    for (const s of LIGHT_STYLES) for (const t of [0, 3]) drawLights(stub(), s, 640, 400, t, reduce)
  }
  assert.equal(agePops(pops, 5).length, 0); assert.equal(impactStyle('nope'), null)
})
test('every new slot value has an item, and each slot is reachable by playing or by a pack', () => {
  for (const [slot, list] of [['ball.impactStyle', IMPACT_STYLES], ['score.burst', BURST_STYLES], ['arena.corners', CORNER_STYLES], ['arena.lights', LIGHT_STYLES]] as const) {
    const have = new Set(ALL_PAINTER_ITEMS.filter(i => productSlot(i) === slot).map(i => i.value).concat(painterColors({}).slots[slot]))
    const starter = ALL_PAINTER_ITEMS.length ? undefined : undefined; void starter
    for (const v of list) assert.ok(have.has(v) || PAINTER_STARTERS.has(v), `${slot} ${v}`)
  }
})
test('LilEye has hats, glasses, scarves, wings and auras across rarities', () => {
  const li = PACK_ITEMS.filter(i => i.kind === 'lileye')
  for (const slot of ['hat', 'glasses', 'scarf', 'wings', 'aura']) assert.ok(li.some(i => i.lileye!.slot === slot), slot)
  assert.ok(PACK_ITEMS.length >= 90)
})
test('outfits sanitize, drop unowned pack items, and favourites toggle', () => {
  assert.deepEqual(sanitizeOutfits('x'), [])
  const o = sanitizeOutfits([{ name: '<b>Neo</b> a very long outfit name', painter: { 'arena.frame': 'aurora-frame', 'paddle.face': 'mint-face' }, sleeve: { cardBack: 'back-neon' }, lileye: { hat: 'eye-hat-crown' }, theme: 'starfall', sidePattern: 'aurora' }])[0]!
  assert.ok(o.name.length <= 16 && !/[<>]/.test(o.name))
  const w = ownedOutfit(o, () => false)
  assert.equal((w.painter as Record<string, string>)['arena.frame'], undefined); assert.equal((w.painter as Record<string, string>)['paddle.face'], 'mint-face')
  assert.equal(w.sleeve.cardBack, ''); assert.equal(w.lileye.hat, ''); assert.equal(w.theme, ''); assert.equal(w.sidePattern, 'none')
  assert.equal(ownedOutfit(o, () => true).sleeve.cardBack, 'back-neon')
  assert.equal(sanitizeOutfits(Array.from({ length: 9 }, (_, i) => ({ name: `n${i}` }))).length, MAX_OUTFITS)
  assert.deepEqual(toggleFav(['a'], 'b'), ['a', 'b']); assert.deepEqual(toggleFav(['a', 'b'], 'a'), ['b']); assert.equal(cleanOutfitName('  '), '')
})
