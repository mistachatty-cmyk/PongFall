import test from 'node:test'
import assert from 'node:assert/strict'
import { isThrustFlick, type TouchPoint } from './thrustGestures'

const line = (x0: number, y0: number, x1: number, y1: number, ms: number, n = 6): TouchPoint[] => Array.from({ length: n }, (_, i) => ({ x: x0 + (x1 - x0) * i / (n - 1), y: y0 + (y1 - y0) * i / (n - 1), t: ms * i / (n - 1) }))
test('a fast sideways flick toward the other side is a thrust', () => { assert.equal(isThrustFlick(line(40, 300, 160, 310, 90), 1), true); assert.equal(isThrustFlick(line(300, 300, 180, 296, 90), -1), true) })
test('the wrong direction, a slow drag, a short move or a vertical drag is not', () => {
  assert.equal(isThrustFlick(line(40, 300, 160, 300, 90), -1), false)
  assert.equal(isThrustFlick(line(40, 300, 160, 300, 600), 1), false)
  assert.equal(isThrustFlick(line(40, 300, 60, 300, 30), 1), false)
  assert.equal(isThrustFlick(line(100, 100, 130, 400, 90), 1), false)
  assert.equal(isThrustFlick([], 1), false)
})
