import test from 'node:test'
import assert from 'node:assert/strict'
import { PAINTER_CATEGORIES, PAINTER_SLOTS, PAINTER_EARNED, PONG_PAINTER_PRODUCTS, loadPainterSelection, savePainterSelection, painterColors, painterSku, randomOwnedPainterSelection, sanitizePainterSelection, TEAR_IRIS_COLORS } from './pongPainter'

test('PongPainter catalog has a unique LOK SKU for each supported paint category', () => {
  assert.deepEqual(new Set(PONG_PAINTER_PRODUCTS.map(item => item.category)), new Set(PAINTER_CATEGORIES.map(item => item.id)))
  const skus = PONG_PAINTER_PRODUCTS.map(painterSku)
  assert.equal(new Set(skus).size, skus.length)
  assert.ok(PONG_PAINTER_PRODUCTS.every(item => Number.isInteger(item.price) && item.price > 0))
})

test('paint selections accept only known category and item pairs', () => {
  const first = PONG_PAINTER_PRODUCTS[0]!
  assert.deepEqual(sanitizePainterSelection({ [first.category]: first.id, paddle: 'not-a-real-paint', random: 'input' }), { 'theme.filter': first.id })
})

test('selected cosmetics alter render colors without changing defaults', () => {
  const baseline = painterColors({})
  const ball = PONG_PAINTER_PRODUCTS.find(item => item.category === 'ball')!
  const custom = painterColors({ ball: ball.id })
  assert.equal(baseline.ball, '#ffffff')
  assert.equal(custom.ball, ball.value)
  assert.equal(custom.paddle, baseline.paddle)
  assert.equal(baseline.eye, '#68b6e7')
  assert.equal(baseline.arena, '#4aa8ff')
  assert.equal(baseline.glass, '#bfe6ff')
  assert.equal(baseline.tearGlow, '#7cc0ff')
})

test('random owned look only includes free or owned slot items', () => {
  const owned = new Set([painterSku(PONG_PAINTER_PRODUCTS.find(item => item.id === 'deep-teal')!)])
  const selected = randomOwnedPainterSelection(owned, () => 0.999)
  assert.equal(Object.keys(selected).length, PAINTER_SLOTS.length)
  assert.equal(selected['theme.filter'], 'deep-teal')
  for (const slot of PAINTER_SLOTS) assert.ok(selected[slot.id] === slot.starter.id || slot.id === 'theme.filter' && selected[slot.id] === 'deep-teal' || slot.id === 'eye.pupil' && selected[slot.id] === 'ring')
})

test('tear iris can enter the owned random look', () => {
  const selected = randomOwnedPainterSelection(new Set(['pongfall.tear-eye.iris-mint']), () => 0.999)
  assert.equal(selected['eye.iris'], 'iris-mint')
})

test('every customization category has multiple curated options', () => {
  for (const category of PAINTER_CATEGORIES) assert.ok(PONG_PAINTER_PRODUCTS.filter(item => item.category === category.id).length >= 2)
})

test('all 37 slots accept their free alternative and restore the default', () => {
  assert.equal(PAINTER_SLOTS.length, 37)
  const selected = Object.fromEntries(PAINTER_SLOTS.map(slot => [slot.id, slot.starter.id]))
  const clean = sanitizePainterSelection(selected)
  assert.equal(Object.keys(clean).length, 37)
  const colors = painterColors(clean)
  for (const slot of PAINTER_SLOTS) {
    assert.equal(colors.slots[slot.id], slot.starter.value)
    assert.equal(painterColors({ ...clean, [slot.id]: undefined }).slots[slot.id], slot.defaultValue)
  }
})

test('new arena shells unlock through play and remain cosmetic selections', () => {
  const shells = PAINTER_EARNED.filter(item => item.slot === 'arena.shell')
  assert.equal(shells.length, 5)
  assert.ok(shells.every(item => item.price === 0 && item.unlock && !item.pack))
  assert.equal(new Set(shells.map(item => item.value)).size, shells.length)
  const picked = sanitizePainterSelection({ 'arena.shell': shells[0]!.id })
  assert.equal(painterColors(picked).slots['arena.shell'], shells[0]!.value)
  assert.equal(painterColors({}).slots['arena.shell'], 'plain')
  assert.equal(TEAR_IRIS_COLORS.length, 15)
})

test('legacy paint migrates and v2 selection survives a storage round trip', () => {
  const store = new Map<string,string>([['pongfall.painter.selection.v1', JSON.stringify({ eyeType: 'diamond', glass: 'rose-fracture', ball: 'comet-core' })]])
  const io = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key,value) } }
  const migrated = loadPainterSelection(io)
  assert.deepEqual(migrated, { 'eye.pupil': 'diamond', 'glass.crack': 'rose-fracture', 'ball.core': 'comet-core' })
  assert.equal(savePainterSelection(migrated,io), true)
  assert.deepEqual(loadPainterSelection(io), migrated)
})
