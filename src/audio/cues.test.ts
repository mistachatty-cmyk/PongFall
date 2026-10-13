import test from 'node:test'
import assert from 'node:assert/strict'
import { CUES, CueId, MAX_VOICES, cueForEvent, shouldPlay, ambienceFor, dynamicAmbienceFor, tinklePlan } from './cues'
import { createAudio } from './engine'

test('every cue has a sane recipe', () => {
  for (const [id, c] of Object.entries(CUES)) {
    assert.ok(c.ms > 20 && c.ms < 1500, id)
    assert.ok(c.gain > 0 && c.gain <= 0.5, id)
    assert.ok(c.noise >= 0 && c.noise <= 1, id)
    assert.ok(c.f0 > 20 && c.f1 > 20, id)
  }
  assert.ok(CUES.squish.wobbleHz && CUES.squish.f1 < CUES.squish.f0, 'squish glides down and wobbles')
})

test('sim events map to cues', () => {
  assert.equal(cueForEvent({ kind: 'squish', wall: 1, y: 0 })?.cue, 'squish')
  assert.equal(cueForEvent({ kind: 'wall', wall: 1, y: 0, speed: 400 })?.cue, 'wall')
  assert.equal(cueForEvent({ kind: 'thrust', side: 0 })?.cue, 'thrust')
  assert.equal(cueForEvent({ kind: 'slice', count: 2 })?.cue, 'slice')
  assert.equal(cueForEvent({ kind: 'eye', wall: 1 }), null)
  const ids = Object.keys(CUES) as CueId[]
  assert.ok(ids.every(id => typeof CUES[id].f0 === 'number'))
})

test('retrigger throttle and voice cap', () => {
  assert.equal(shouldPlay('wall', 1000, 960, 0), false)
  assert.equal(shouldPlay('wall', 1000, 800, 0), true)
  assert.equal(shouldPlay('score', 1000, 999, MAX_VOICES), false)
})

test('the whistle gets louder and higher the faster it falls, and rises in a gust', () => {
  const slow = ambienceFor(60, 0), fast = ambienceFor(320, 0)
  assert.ok(fast.gain > slow.gain && fast.whistleHz > slow.whistleHz && fast.q > slow.q)
  assert.ok(ambienceFor(100, 200).whistleHz > ambienceFor(100, 0).whistleHz)
  assert.ok(fast.whistleHz > 700 && fast.whistleHz < 2800)
})

test('dynamic fall ambience is a broad rush that responds to speed and gusts', () => {
  const still = dynamicAmbienceFor(40, 0), fast = dynamicAmbienceFor(320, 0), calm = dynamicAmbienceFor(100, 0), gusty = dynamicAmbienceFor(100, 240)
  assert.ok(fast.rush > still.rush && fast.rushHz > still.rushHz)
  assert.ok(gusty.rush > calm.rush && gusty.air > calm.air)
})

test('glass: the tinkle schedule is deterministic, bounded and spread over time', () => {
  const a = tinklePlan(16, 5), b = tinklePlan(16, 5)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, tinklePlan(16, 6))
  assert.equal(a.length, 16)
  for (const t of a) { assert.ok(t.at >= 0 && t.at <= 0.71 && t.f >= 2000 && t.f <= 9000 && t.dur > 0.04 && t.gain > 0 && t.gain < 0.11) }
  assert.ok(a[a.length - 1]!.at > 0.2)
  assert.equal(tinklePlan(500, 1).length, 24)
  assert.ok(CUES.break.shatter && (CUES.break.tinkles ?? 0) >= 12 && (CUES.crack.tinkles ?? 0) >= 1)
})

test('pong blips are flat square beeps and the score is a two-tone', () => {
  for (const id of ['paddle', 'wall', 'serve'] as const) assert.ok(CUES[id].wave === 'square' && CUES[id].f0 === CUES[id].f1, id)
  assert.equal(CUES.score.seq?.length, 1)
})

test('the engine is a safe no-op without a browser', () => {
  const a = createAudio()
  a.unlock(); a.play('squish'); a.setAmbience(100, 0, true); a.setMuted(true); a.destroy()
  assert.ok(true)
})
