import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, issue, stepWorld } from './world'
import { recordReplay, runReplay } from './replay'

const ball = () => ({ x: 0, y: 0, vx: 400, vy: 0, scored: false, age: 1, lastHit: -1 as const, swipeMod: 0 })

test('upward heat and downward breeze change speed, emit events and track the player use', () => {
  const w = createWorld({}, 12)
  w.balls = [ball()]
  w.serveTimer = 100
  issue(w, { k: 'swipe', side: 0, dir: -1, x: 0, y: 0 })
  stepWorld(w)
  assert.ok(Math.hypot(w.balls[0]!.vx, w.balls[0]!.vy) > 410)
  assert.equal(w.sides[0].heatSwipes, 1)
  assert.equal(w.events.some(e => e.kind === 'ballSwipe' && e.dir === -1), true)

  w.balls = [ball()]
  w.sides[0].swipeReadyTick = w.tick
  issue(w, { k: 'swipe', side: 1, dir: 1, x: 0, y: 0 })
  stepWorld(w)
  assert.ok(Math.hypot(w.balls[0]!.vx, w.balls[0]!.vy) < 390)
  assert.equal(w.sides[1].breezeSwipes, 1)
})

test('swipes ignore misses, enforce cooldown, and keep heat within its cap', () => {
  const w = createWorld({}, 13)
  w.balls = [ball()]
  w.serveTimer = 100
  issue(w, { k: 'swipe', side: 0, dir: -1, x: 500, y: 500 })
  stepWorld(w)
  assert.equal(w.sides[0].paddleSwipes, 0)
  for (let i = 0; i < 16; i++) {
    w.balls[0]!.x = 0; w.balls[0]!.y = 0; w.balls[0]!.vx = 400; w.balls[0]!.vy = 0; w.balls[0]!.scored = false
    issue(w, { k: 'swipe', side: 0, dir: -1, x: 0, y: 0 })
    for (let tick = 0; tick < 30; tick++) stepWorld(w)
  }
  assert.ok(w.balls[0]!.swipeMod! <= 0.12)
  assert.equal(w.sides[0].heatSwipes, 16)
  const before = w.sides[0].paddleSwipes
  w.balls = [ball()]
  issue(w, { k: 'swipe', side: 0, dir: -1, x: 0, y: 0 })
  issue(w, { k: 'swipe', side: 0, dir: -1, x: 0, y: 0 })
  stepWorld(w)
  assert.equal(w.sides[0].paddleSwipes, before + 1)
})

test('heat swipes replay with the same modifier, counters, and trajectory', () => {
  const w = createWorld({}, 14)
  for (let n = 0; n < 240; n++) {
    if ((n === 125 || n === 155 || n === 185) && w.balls.some(b => !b.scored)) {
      const b = w.balls.find(b => !b.scored)!
      issue(w, { k: 'swipe', side: 0, dir: -1, x: b.x, y: b.y })
    }
    stepWorld(w); w.events.length = 0
  }
  const replayed = runReplay(recordReplay(w))
  assert.equal(replayed.balls[0]!.swipeMod, w.balls[0]!.swipeMod)
  assert.equal(replayed.sides[0].heatSwipes, w.sides[0].heatSwipes)
  assert.equal(replayed.balls[0]!.vx, w.balls[0]!.vx)
  assert.equal(replayed.balls[0]!.vy, w.balls[0]!.vy)
})
