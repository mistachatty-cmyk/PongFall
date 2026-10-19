import test from 'node:test'
import assert from 'node:assert/strict'
import { PHYS, collideBall, isAtRest, newBody, stepBody } from './propPhysics'

test('a ball that hits a prop bounces back and shoves the prop the way it was going', () => {
  const b = newBody(), ball = { x: -55, y: 0, vx: 500, vy: 0 }
  const hit = collideBall(b, { x: 0, y: 0 }, 50, ball, 10)
  assert.ok(hit > 400); assert.ok(ball.vx < 0, 'the ball reflects'); assert.ok(b.vx > 0, 'the prop is shoved forward')
  assert.ok(Math.hypot(ball.x - 0, ball.y - 0) >= 60, 'the ball is pushed out of the prop')
})
test('no hit when the ball misses or is already moving away', () => {
  const ball = { x: 200, y: 0, vx: 100, vy: 0 }; assert.equal(collideBall(newBody(), { x: 0, y: 0 }, 50, ball, 10), 0)
  const away = { x: 55, y: 0, vx: 300, vy: 0 }; assert.equal(collideBall(newBody(), { x: 0, y: 0 }, 50, away, 10), 0); assert.equal(away.vx, 300)
})
test('a heavier prop moves less than a light one', () => {
  const a = newBody(), c = newBody()
  collideBall(a, { x: 0, y: 0 }, 50, { x: -55, y: 0, vx: 500, vy: 0 }, 10, 3); collideBall(c, { x: 0, y: 0 }, 50, { x: -55, y: 0, vx: 500, vy: 0 }, 10, 12)
  assert.ok(a.vx > c.vx)
})
test('a knocked prop floats back to its spot and settles', () => {
  const b = newBody(); b.ox = 180; b.oy = -90; b.vx = 400; b.ang = 1.2; b.spin = 3
  for (let i = 0; i < 60 * 8; i++) stepBody(b, 1 / 60)
  assert.ok(isAtRest(b), `still moving: ${JSON.stringify(b)}`)
})
test('the offset never leaves the clamp, however hard the hit', () => {
  const b = newBody(); b.vx = 1e5
  for (let i = 0; i < 120; i++) { stepBody(b, 1 / 60); assert.ok(Math.hypot(b.ox, b.oy) <= PHYS.maxOffset + 1e-6) }
})
