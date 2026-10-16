import test from 'node:test'
import assert from 'node:assert/strict'
import { BASE_LINE, centerLineStyle } from './centerLine'

test('plain days and modes use the base line', () => {
  assert.deepEqual(centerLineStyle(new Date(2026, 5, 15), 'classic'), BASE_LINE)
})
test('winter wraps the new year', () => {
  assert.equal(centerLineStyle(new Date(2026, 11, 25), 'classic').color, '#dff2ff')
  assert.equal(centerLineStyle(new Date(2027, 0, 3), 'classic').color, '#dff2ff')
  assert.equal(centerLineStyle(new Date(2027, 0, 10), 'classic').color, BASE_LINE.color)
})
test('live event wins over season, solo-fall hides the line', () => {
  assert.equal(centerLineStyle(new Date(2026, 11, 25), 'classic', 'live').color, '#ffe08a')
  assert.equal(centerLineStyle(new Date(2026, 5, 1), 'solo-fall').visible, false)
})
