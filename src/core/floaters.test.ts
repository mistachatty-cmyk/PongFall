import test from 'node:test'
import assert from 'node:assert/strict'
import { FALL_SPEED, MAX_SPEED, isClick, releaseVelocity, spawnBody, stepBody, tossSpin, type Body } from './floaters'

const B = { w: 800, h: 600 }
const body = (o: Partial<Body> = {}): Body => ({ x: 400, y: 300, vx: 0, vy: FALL_SPEED, ang: 0, av: 0, w: 64, h: 64, ...o })

test('a resting floater drifts down at the shaft fall speed', () => {
  let b = body(); for (let i = 0; i < 120; i++) b = stepBody(b, 1 / 60, B)
  assert.ok(Math.abs(b.y - (300 + FALL_SPEED * 2)) < 1)
})
test('a thrown floater slows down, bounces off the sides and stays inside', () => {
  let b = body({ x: 700, vx: 900 })
  for (let i = 0; i < 600; i++) { b = stepBody(b, 1 / 60, B); assert.ok(b.x >= 32 - 1e-6 && b.x <= 768 + 1e-6) }
  assert.ok(Math.abs(b.vx) < 30)
})
test('falling out of the bottom brings it back in from the top', () => {
  const b = stepBody(body({ y: 640, vy: 400 }), 1 / 60, B)
  assert.ok(b.y < 0); assert.equal(b.vy, FALL_SPEED)
})
test('a toss upward bounces off the top instead of leaving', () => {
  const b = stepBody(body({ y: 20, vy: -500 }), 1 / 60, B)
  assert.ok(b.y >= 32 && b.vy > 0)
})
test('speed and spin are capped; still mode freezes it (reduced motion)', () => {
  assert.ok(stepBody(body({ vx: 99999 }), 1 / 60, B).vx <= MAX_SPEED)
  const s = stepBody(body({ vx: 300, av: 5 }), 1 / 60, B, true); assert.deepEqual([s.vx, s.vy, s.av], [0, 0, 0])
})
test('release velocity comes from recent samples only, and a held pointer is a drop', () => {
  assert.deepEqual(releaseVelocity([]), { vx: 0, vy: 0 })
  assert.deepEqual(releaseVelocity([{ x: 0, y: 0, t: 0 }, { x: 5, y: 5, t: 500 }]), { vx: 0, vy: 0 })
  const v = releaseVelocity([{ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 300 }, { x: 50, y: -20, t: 350 }, { x: 100, y: -40, t: 400 }])
  assert.ok(v.vx > 500 && v.vy < 0)
})
test('clicks are short and still; throws and spin behave', () => {
  assert.equal(isClick(2, 100), true); assert.equal(isClick(20, 100), false); assert.equal(isClick(2, 900), false)
  assert.ok(tossSpin(700, -10) > tossSpin(700, 10)); assert.ok(Math.abs(tossSpin(1e9, 0)) <= 9)
})
test('spawned floaters spread along the top without stacking', () => {
  const xs = [0, 1, 2].map(i => spawnBody(i, 3, B).x)
  assert.ok(xs[0]! < xs[1]! && xs[1]! < xs[2]!)
})
