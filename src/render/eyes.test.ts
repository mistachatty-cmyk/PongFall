import test from 'node:test'
import assert from 'node:assert/strict'
import { backgroundBlink, createFx, wakeBackgroundEyes } from './eyes'

test('shaft eyes fully blink shut on staggered cycles and a background click wakes them', () => {
  assert.equal(backgroundBlink(0, 0), 1)
  assert.ok(backgroundBlink(6.64, 0) < 0.01)
  const fx = createFx()
  wakeBackgroundEyes(fx)
  assert.ok(fx.bgReact.every(value => value >= 0.9))
  assert.ok(fx.bgGlow.every(value => value >= 0.42))
})
