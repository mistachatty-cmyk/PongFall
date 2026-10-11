import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue } from './world'
import { getResult, scoreOf } from './result'
import { recordReplay, runReplay, verifyReplay, hashResult } from './replay'
import { MODES } from './data/modes'
import { MODIFIERS } from './data/modifiers'
import { DEFAULT_TUNING } from './tuning'

function play(mode: string, seed: number, maxTicks = 120 * 400, mods: string[] = []) {
  const w = createWorld({ mode, modifiers: mods, target: 3 }, seed)
  while (w.status === 'play' && w.tick < maxTicks) {
    // scripted, slightly noisy "player": follows the nearest ball with a lag
    if (w.tick % 6 === 0) {
      const b = w.balls[0]
      issue(w, { k: 'move', side: 0, y: b ? b.y + Math.sin(w.tick / 40) * 30 : 0 })
    }
    if (w.tick % 500 === 0) issue(w, { k: 'tear', x: 0, y: 0 })
    stepWorld(w)
    w.events.length = 0
  }
  return w
}

test('replay reproduces the live run exactly', () => {
  for (const seed of [1, 7, 42]) {
    const live = play('classic', seed)
    const res = getResult(live)
    assert.ok(res, 'run finished')
    const replay = recordReplay(live)
    const again = getResult(runReplay(replay))!
    assert.equal(hashResult(again), hashResult(res))
    assert.ok(verifyReplay(replay, res))
  }
})

test('a tampered replay or claim fails verification', () => {
  const live = play('classic', 5)
  const res = getResult(live)!
  const replay = recordReplay(live)
  assert.equal(verifyReplay({ ...replay, seed: replay.seed + 1 }, res), false)
  assert.equal(verifyReplay(replay, { ...res, score: res.score + 1000 }), false)
  assert.throws(() => runReplay({ ...replay, v: 999 }))
})

test('modifiers change the sim but stay replayable', () => {
  const live = play('classic', 9, 120 * 400, ['thin-glass', 'fast-ball'])
  assert.equal(live.tune.glassHits, 1)
  const res = getResult(live)!
  assert.ok(verifyReplay(recordReplay(live), res))
})

test('sandbox never ends and is never ranked', () => {
  const w = createWorld({ mode: 'sandbox' }, 3)
  for (let i = 0; i < 120 * 60; i++) stepWorld(w)
  assert.equal(w.status, 'play')
  assert.equal(MODES.sandbox!.ranked, false)
  assert.equal(getResult(w), null)
})

test('mode and modifier registries are valid', () => {
  for (const m of Object.values(MODES)) {
    assert.ok(m.target >= 0 && m.timeLimit >= 0)
    assert.ok(m.unlimited || m.target > 0 || m.timeLimit > 0, `${m.id} must be able to end`)
    for (const k of Object.keys(m.tune)) assert.ok(k in DEFAULT_TUNING, `${m.id} tune key ${k}`)
  }
  for (const m of Object.values(MODIFIERS)) for (const k of Object.keys(m.tune)) assert.ok(k in DEFAULT_TUNING)
})

test('score formula rewards winning and speed', () => {
  assert.ok(scoreOf([14, 3], true, 90) > scoreOf([14, 3], true, 200))
  assert.ok(scoreOf([14, 3], true, 90) > scoreOf([5, 14], false, 90))
  assert.equal(scoreOf([0, 14], false, 10), 0)
})
