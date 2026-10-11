import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_KEYS, ACTIONS, sanitizeKeys, rebind, actionFor, keyLabel, isBindable } from './controls'

test('defaults: A/D tilt player 1, J/L tilt player 2, no key used twice', () => {
  assert.equal(DEFAULT_KEYS.p1TiltL, 'a'); assert.equal(DEFAULT_KEYS.p1TiltR, 'd')
  assert.equal(new Set(Object.values(DEFAULT_KEYS)).size, ACTIONS.length)
})
test('garbage falls back to defaults; duplicates and reserved keys are dropped', () => {
  assert.deepEqual(sanitizeKeys(null), DEFAULT_KEYS)
  const k = sanitizeKeys({ p1Up: 'c', p1Down: 'x', p1TiltL: 'x', p2Up: 5 })
  assert.equal(k.p1Up, 'w'); assert.equal(k.p1Down, 'x'); assert.notEqual(k.p1TiltL, 'x')
  assert.equal(new Set(Object.values(k)).size, ACTIONS.length)
})
test('rebinding swaps with whoever had the key and refuses reserved keys', () => {
  const k = rebind(DEFAULT_KEYS, 'p1Up', 'd')!
  assert.equal(k.p1Up, 'd'); assert.equal(k.p1TiltR, 'w')
  assert.equal(rebind(DEFAULT_KEYS, 'p1Up', 'm'), null)
  assert.equal(rebind(DEFAULT_KEYS, 'p1Up', 'Shift'), null)
  assert.equal(actionFor(DEFAULT_KEYS, 'A'), 'p1TiltL')
  assert.equal(keyLabel(' '), 'Space'); assert.ok(isBindable(' '))
})
