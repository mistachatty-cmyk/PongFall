import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, arenaDims, eyesOpen, eyeY, fallSpeed, collectTear, MAX_SCALE, FIELD_HALF } from './world'

const ball = (x: number, y: number, vx: number, vy = 0) => ({ x, y, vx, vy, scored: false, age: 0, lastHit: -1 as const })
const run = (w: ReturnType<typeof createWorld>, sec: number) => { for (let i = 0; i < sec * 120; i++) stepWorld(w, 1 / 120) }

test('glass breaks after 3 missed balls on that side', () => {
  const w = createWorld()
  w.serveTimer = 99
  const { W } = arenaDims(w)
  w.sides[1].paddleY = 9999
  for (let k = 0; k < 3; k++) {
    w.sides[1].paddleY = 150; w.sides[1].targetY = 150
    w.balls = [ball(W / 2 - 20, -150, 300)]
    run(w, 0.3)
  }
  assert.equal(w.sides[1].glassHits, 3)
  assert.equal(w.sides[1].broken, true)
})

test('a ball through broken glass scores for the other side and grows the arena', () => {
  const w = createWorld()
  w.serveTimer = 99
  const { W } = arenaDims(w)
  w.sides[1].broken = true; w.sides[1].paddleY = 150; w.sides[1].targetY = 150
  w.balls = [ball(W / 2 - 80, -150, 400)]
  run(w, 0.6)
  assert.equal(w.sides[0].score, 1)
  assert.ok(w.scale > 1)
})

test('AI scoring shrinks arena but never below 1', () => {
  const w = createWorld()
  w.serveTimer = 99
  const { W } = arenaDims(w)
  w.sides[0].broken = true; w.sides[0].paddleY = 150; w.sides[0].targetY = 150
  w.balls = [ball(-W / 2 + 80, -150, -400)]
  run(w, 0.6)
  assert.equal(w.sides[1].score, 1)
  assert.equal(w.scale, 1)
})

test('hitting one eye opens every eye and drops a tear', () => {
  const w = createWorld()
  w.serveTimer = 99
  const e = w.eyes.find(x => x.wall === 1)!
  w.balls = [ball(FIELD_HALF - 40, eyeY(w, e), 300)]
  run(w, 0.2)
  assert.ok(eyesOpen(w))
  assert.equal(w.tears.length, 1)
  run(w, 1)
  assert.ok(w.eyes.every(x => x.lid > 0.5))
})

test('tears can be collected', () => {
  const w = createWorld()
  w.tears.push({ x: 10, y: 10, vy: 0, age: 0 })
  assert.ok(collectTear(w, 12, 12))
  assert.equal(w.tearsHeld, 1)
})

test('fall speed halts at max arena scale', () => {
  const w = createWorld()
  w.scale = MAX_SCALE
  assert.equal(fallSpeed(w), 0)
})

test('first to the target wins', () => {
  const w = createWorld({ target: 1 })
  w.serveTimer = 99
  const { W } = arenaDims(w)
  w.sides[1].broken = true; w.sides[1].paddleY = 150; w.sides[1].targetY = 150
  w.balls = [ball(W / 2 - 80, -150, 400)]
  run(w, 0.6)
  assert.equal(w.status, 'over')
  assert.equal(w.winner, 0)
})
