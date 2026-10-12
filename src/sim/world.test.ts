import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld as step, issue, arenaDims, eyesOpen, eyeY, fallSpeed, collectTear, FIELD_HALF } from './world'

const ball = (x: number, y: number, vx: number, vy = 0) => ({ x, y, vx, vy, scored: false, age: 0, lastHit: -1 as const })
const run = (w: ReturnType<typeof createWorld>, sec: number) => { for (let i = 0; i < sec * 120; i++) step(w) }

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

test('after the first minute, hitting one eye opens every eye and drops a tear', () => {
  const w = createWorld()
  w.serveTimer = 99
  w.t = w.tune.eyeSleepSeconds + 1
  const e = w.eyes.find(x => x.wall === 1)!
  w.balls = [ball(FIELD_HALF - 40, eyeY(w, e), 300)]
  run(w, 0.2)
  assert.ok(eyesOpen(w))
  assert.equal(w.tears.length, 1)
  run(w, 1)
  assert.ok(w.eyes.every(x => x.lid > 0.5))
})

test('eyes stay fully shut for the first minute: a second hit only peeks, a third opens them', () => {
  const w = createWorld()
  w.serveTimer = 99
  const e = w.eyes.find(x => x.wall === 1)!
  const hit = () => { w.balls = [ball(FIELD_HALF - 40, eyeY(w, e), 300)]; run(w, 0.25) }
  hit()
  assert.equal(w.tears.length, 1, 'the tear still drops')
  run(w, 1)
  assert.ok(w.eyes.every(x => x.lid < 0.01), 'one hit: still closed')
  hit(); run(w, 1)
  assert.ok(w.eyes.every(x => x.lid > 0.15 && x.lid < 0.4), `two hits: a peek (${w.eyes[0]!.lid})`)
  hit(); run(w, 1)
  assert.ok(w.eyes.every(x => x.lid > 0.9), 'three hits: fully open')
})

test('tears can be collected', () => {
  const w = createWorld()
  w.tears.push({ x: 10, y: 10, vx: 0, vy: 0, age: 0 })
  assert.ok(collectTear(w, 12, 12))
  assert.equal(w.tearsHeld, 1)
})

test('fall speed halts at max arena scale', () => {
  const w = createWorld()
  w.scale = w.tune.maxScale
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

test('a score win can risk the win in a first-to-six Power Mode wave', () => {
  const w = createWorld({ mode: 'classic', target: 14 }, 22)
  w.status = 'over'; w.endReason = 'score'; w.winner = 0; w.sides[0].score = 14
  issue(w, { k: 'overtime' }); step(w)
  assert.equal(w.status, 'play'); assert.equal(w.overtime, true)
  assert.deepEqual(w.sides.map(s => s.score), [0, 0])
  assert.equal(w.opts.target, 6); assert.equal(w.powerUnlocked, true)
  assert.equal(w.tune.serveSpeed, 520); assert.equal(w.tune.maxSpeed, 1380)
})

test('six player points wedge the overtime arena and survive', () => {
  const w = createWorld({ mode: 'classic', target: 14 }, 23)
  w.status = 'over'; w.endReason = 'score'; w.winner = 0
  issue(w, { k: 'overtime' }); step(w)
  w.sides[0].score = 5; w.sides[1].broken = true; w.serveTimer = 99
  const { W } = arenaDims(w); w.balls = [ball(W / 2 - 80, -150, 400)]
  run(w, 0.5)
  assert.equal(w.status, 'over'); assert.equal(w.winner, 0); assert.equal(w.endReason, 'grounded')
  assert.equal(w.sides[0].score, 6); assert.equal(w.scale, w.tune.maxScale)
})

test('six opponent points forfeit the original win', () => {
  const w = createWorld({ mode: 'classic', target: 14 }, 24)
  w.status = 'over'; w.endReason = 'score'; w.winner = 0
  issue(w, { k: 'overtime' }); step(w)
  w.sides[1].score = 5; w.sides[0].broken = true; w.serveTimer = 99
  const { W } = arenaDims(w); w.balls = [ball(-W / 2 + 80, -150, -400)]
  run(w, 0.5)
  assert.equal(w.status, 'over'); assert.equal(w.winner, 1); assert.equal(w.endReason, 'score')
})
