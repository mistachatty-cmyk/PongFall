import test from 'node:test'
import assert from 'node:assert/strict'
import { PAINTER_CATEGORIES, PONG_PAINTER_PRODUCTS, painterColors, painterSku, randomOwnedPainterSelection, sanitizePainterSelection } from './pongPainter'

test('PongPainter catalog has a unique LOK SKU for each supported paint category', () => {
  assert.deepEqual(new Set(PONG_PAINTER_PRODUCTS.map(item => item.category)), new Set(PAINTER_CATEGORIES.map(item => item.id)))
  const skus = PONG_PAINTER_PRODUCTS.map(painterSku)
  assert.equal(new Set(skus).size, skus.length)
  assert.ok(PONG_PAINTER_PRODUCTS.every(item => Number.isInteger(item.price) && item.price > 0))
})

test('paint selections accept only known category and item pairs', () => {
  const first = PONG_PAINTER_PRODUCTS[0]!
  assert.deepEqual(sanitizePainterSelection({ [first.category]: first.id, paddle: 'not-a-real-paint', random: 'input' }), { [first.category]: first.id })
})

test('selected cosmetics alter render colors without changing defaults', () => {
  const baseline = painterColors({})
  const ball = PONG_PAINTER_PRODUCTS.find(item => item.category === 'ball')!
  const custom = painterColors({ ball: ball.id })
  assert.equal(baseline.ball, '#ffffff')
  assert.equal(custom.ball, ball.value)
  assert.equal(custom.paddle, baseline.paddle)
  assert.equal(baseline.eye, '')
  assert.equal(baseline.arena, '')
  assert.equal(baseline.glass, '')
  assert.equal(baseline.tearGlow, '#7cc0ff')
})

test('random owned look selects only owned paints and keeps one item per slot', () => {
  const owned = new Set([
    painterSku(PONG_PAINTER_PRODUCTS.find(item => item.id === 'deep-teal')!),
    painterSku(PONG_PAINTER_PRODUCTS.find(item => item.id === 'violet-hour')!),
    painterSku(PONG_PAINTER_PRODUCTS.find(item => item.id === 'comet-core')!),
  ])
  const first = randomOwnedPainterSelection(owned, () => 0)
  const second = randomOwnedPainterSelection(owned, () => 0.999)
  assert.deepEqual(first, { theme: 'deep-teal', ball: 'comet-core' })
  assert.deepEqual(second, { theme: 'violet-hour', ball: 'comet-core' })
  assert.deepEqual(randomOwnedPainterSelection(new Set()), {})
})

test('random owned look includes tear-unlocked iris colors', () => {
  const selected = randomOwnedPainterSelection(new Set(['pongfall.tear-eye.iris-mint']), () => 0)
  assert.deepEqual(selected, { eye: 'iris-mint' })
})

test('every customization category has multiple curated options', () => {
  for (const category of PAINTER_CATEGORIES) assert.ok(PONG_PAINTER_PRODUCTS.filter(item => item.category === category.id).length >= 2)
})
