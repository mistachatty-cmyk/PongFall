import test from 'node:test'
import assert from 'node:assert/strict'
import { LENSES, lensFilter, clampHue } from './lens'

test('there are 8 lenses plus clear, with unique ids', () => {
  assert.equal(LENSES.length, 9)
  assert.equal(new Set(LENSES.map(l => l.id)).size, 9)
  assert.equal(LENSES.filter(l => l.css).length, 8)
})
test('filter combines lens and hue shift', () => {
  assert.equal(lensFilter('none', 0), '')
  assert.equal(lensFilter('none', 90), 'hue-rotate(90deg)')
  assert.equal(lensFilter('noir', 45), 'grayscale(1) contrast(1.25) hue-rotate(45deg)')
  assert.equal(lensFilter('bogus', 0), '')
})
test('hue is wrapped and sanitised', () => {
  assert.equal(clampHue(370), 10); assert.equal(clampHue(-30), 330); assert.equal(clampHue('x'), 0); assert.equal(clampHue(NaN), 0)
})
