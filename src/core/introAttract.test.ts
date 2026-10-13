import test from 'node:test'
import assert from 'node:assert/strict'
import { createIntroAttractWorld, stepIntroAttractWorld } from './introAttract'
import { recordReplay, runReplay } from '../sim/replay'

test('intro attract is a deterministic, personal-arena Solo Fall exhibition', () => {
  const a = createIntroAttractWorld(616), b = createIntroAttractWorld(616)
  assert.equal(a.mode.id, 'solo-fall')
  assert.equal(a.difficulty.id, 'chill')
  assert.equal(a.sats.length, 0)
  assert.equal(a.mode.ai, true)
  const maxPaddleMotion = [0, 0]
  const paddleHits = [0, 0]
  for (let i = 0; i < 2400; i++) {
    stepIntroAttractWorld(a); stepIntroAttractWorld(b)
    assert.deepEqual(a.balls, b.balls)
    assert.deepEqual(a.sides.map(s => [s.score, s.paddleY]), b.sides.map(s => [s.score, s.paddleY]))
    for (const event of a.events) if (event.kind === 'paddle') paddleHits[event.side] = paddleHits[event.side]! + 1
    a.sides.forEach((side, index) => { maxPaddleMotion[index] = Math.max(maxPaddleMotion[index]!, Math.abs(side.paddleY)) })
    a.events.length = 0; b.events.length = 0
  }
  assert.equal(a.status, 'play', 'the safe intro rally should keep running')
  assert.deepEqual(a.sides.map(s => [s.glassHits, s.cracksTaken, s.broken]), [[0, 0, false], [0, 0, false]])
  assert.deepEqual(a.sides.map(s => s.score), [0, 0])
  assert.ok(maxPaddleMotion[0]! > 20, 'the exhibition controller should move the left paddle')
  assert.ok(maxPaddleMotion[1]! > 20, 'the built-in NPC should move the right paddle')
  assert.ok(paddleHits[0]! >= 4 && paddleHits[1]! >= 4, 'both AI paddles must keep the ball in play through real paddle collisions')
  const replayed = runReplay(recordReplay(a))
  assert.deepEqual(replayed.balls, a.balls, 'the exhibition takeover remains replayable with its deterministic NPC tuning')
  assert.deepEqual(replayed.sides.map(s => [s.glassHits, s.score, s.paddleY]), a.sides.map(s => [s.glassHits, s.score, s.paddleY]))
})
