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

test('Duo Fall joined-arena rules replay deterministically', () => {
  const live = createWorld({ mode: 'duo-fall', difficulty: 'sharp', target: 3 }, 284)
  for (let i = 0; i < 2400; i++) {
    if (i % 6 === 0) issue(live, { k: 'move', side: 0, y: Math.sin(i / 70) * 180 })
    stepWorld(live)
    live.events.length = 0
  }
  const replayed = runReplay(recordReplay(live))
  assert.deepEqual(replayed.sides.map(side => [side.score, side.paddleY, side.glassHits]), live.sides.map(side => [side.score, side.paddleY, side.glassHits]))
  assert.deepEqual(replayed.balls.map(ball => [ball.x, ball.y, ball.vx, ball.vy]), live.balls.map(ball => [ball.x, ball.y, ball.vx, ball.vy]))
})

test('Duo Fall local rival choice and both teams replay deterministically', () => {
  const live = createWorld({ mode: 'duo-fall', duoOpponent: 'local', difficulty: 'sharp' }, 285)
  for (let i = 0; i < 2400; i++) {
    if (i % 6 === 0) {
      issue(live, { k: 'move', side: 0, y: Math.sin(i / 70) * 180, paddle: i % 12 === 0 ? 0 : 1 })
      issue(live, { k: 'move', side: 1, y: Math.cos(i / 80) * 180, paddle: i % 12 === 0 ? 1 : 0 })
    }
    stepWorld(live); live.events.length = 0
  }
  const replay = recordReplay(live)
  assert.equal(replay.opts.duoOpponent, 'local')
  const replayed = runReplay(replay)
  assert.equal(replayed.duoOpponent, 'local')
  assert.deepEqual(replayed.sides.map(side => [side.score, side.paddleY, side.glassHits]), live.sides.map(side => [side.score, side.paddleY, side.glassHits]))
  assert.deepEqual(replayed.sides.map(side => side.paddle2Y), live.sides.map(side => side.paddle2Y))
})

test('the post-win Power Mode choice is recorded and replays through the final result', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'chill', target: 1 }, 42)
  const maxTicks = 120 * 180
  while (w.status === 'play' && w.tick < maxTicks) {
    if (w.tick % 4 === 0) {
      const b = w.balls.filter(b => !b.scored && b.vx < 0).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0]
      issue(w, { k: 'move', side: 0, y: b?.y ?? 0 })
    }
    stepWorld(w); w.events.length = 0
  }
  assert.equal(w.status, 'over'); assert.equal(w.winner, 0, 'player earns the base win')
  const base = getResult(w)!
  assert.equal(verifyReplay(recordReplay(w), base), true, 'base win replays before adding the overtime choice')
  issue(w, { k: 'overtime' }); stepWorld(w); w.events.length = 0
  assert.equal(w.overtime, true)
  while ((w.status as string) === 'play' && w.tick < maxTicks * 2) {
    if (w.tick % 4 === 0) {
      const b = w.balls.filter(b => !b.scored && b.vx < 0).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0]
      issue(w, { k: 'move', side: 0, y: b?.y ?? 0 })
    }
    stepWorld(w); w.events.length = 0
  }
  assert.equal(w.status, 'over', 'Power Mode overtime reaches a result')
  const result = getResult(w)!
  const replay = recordReplay(w)
  assert.equal(result.overtime, true)
  const replayed = getResult(runReplay(replay))!
  assert.equal(verifyReplay(replay, result), true, JSON.stringify({ result, replayed, ticks: [replay.ticks, runReplay(replay).tick], overtimeCommands: replay.commands.filter(c => c.k === 'overtime') }))
  assert.equal(hashResult(replayed), hashResult(result))
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

test('paddle wake changes ball motion and reproduces exactly in replay', () => {
  const baseline = createWorld({ mode: 'classic', difficulty: 'sharp', target: 3 }, 91)
  const wake = createWorld({ mode: 'classic', difficulty: 'sharp', modifiers: ['paddle-wake-physics'], target: 3 }, 91)
  for (let i = 0; i < 120 * 35 && wake.status === 'play'; i++) {
    if (i % 5 === 0) {
      const ball = wake.balls.find(b => !b.scored)
      issue(wake, { k: 'move', side: 0, y: ball ? ball.y + Math.sin(i / 23) * 50 : 0 })
      issue(baseline, { k: 'move', side: 0, y: ball ? ball.y + Math.sin(i / 23) * 50 : 0 })
    }
    stepWorld(wake); stepWorld(baseline)
    wake.events.length = 0; baseline.events.length = 0
  }
  assert.notDeepEqual(wake.balls, baseline.balls, 'the optional paddle current should alter the ball trajectory')
  assert.deepEqual(runReplay(recordReplay(wake)).balls, wake.balls)
})

test('wind vents repeat their side shifts and ball forces exactly from the replay seed', () => {
  const w = createWorld({ mode: 'classic', modifiers: ['wind-vents'], target: 99 }, 1818)
  for (let i = 0; i < 1800; i++) stepWorld(w)
  const replay = recordReplay(w)
  const copy = runReplay(replay)
  assert.equal(copy.ventSide, w.ventSide)
  assert.equal(copy.ventY, w.ventY)
  assert.deepEqual(copy.balls, w.balls)
})

test('Eye Weather events and spawned tears reproduce exactly from a replay seed', () => {
  const w = createWorld({ mode: 'sandbox', modifiers: ['eye-weather'] }, 2390)
  for (let i = 0; i < 3200; i++) stepWorld(w)
  const copy = runReplay(recordReplay(w))
  assert.deepEqual(copy.tears, w.tears)
  assert.equal(copy.eyeWeatherTimer, w.eyeWeatherTimer)
  assert.equal(copy.eyesOpenUntil, w.eyesOpenUntil)
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
