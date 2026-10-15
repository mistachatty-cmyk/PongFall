import test from 'node:test'
import assert from 'node:assert/strict'
import { metronome, metronomePeriod } from './metronome'

test('the metronome speeds up with the rally and stays in a readable range', () => {
  assert.ok(metronomePeriod(0) > metronomePeriod(400) && metronomePeriod(400) > metronomePeriod(900))
  assert.equal(metronomePeriod(0), 1.1); assert.equal(metronomePeriod(99999), 0.32)
})
test('the pendulum swings both ways and ticks at the centre', () => {
  const m = [0, 0.1, 0.25, 0.5, 0.75].map(t => metronome(t, 0))
  assert.ok(m.some(x => x.angle > 0.3) && m.some(x => x.angle < -0.3))
  assert.equal(metronome(0, 0).angle, 0); assert.ok(metronome(0, 0).tick)
})
