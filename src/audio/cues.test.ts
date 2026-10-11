import test from 'node:test'
import assert from 'node:assert/strict'
import { CUES, CueId, MAX_VOICES, cueForEvent, shouldPlay, ambienceFor } from './cues'
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

test('falling ambience gets louder and brighter the faster it falls', () => {
  const slow = ambienceFor(60, 0), fast = ambienceFor(320, 0)
  assert.ok(fast.gain > slow.gain && fast.cutoff > slow.cutoff && fast.droneHz > slow.droneHz)
  assert.ok(ambienceFor(100, 200).cutoff > ambienceFor(100, 0).cutoff)
})

test('the engine is a safe no-op without a browser', () => {
  const a = createAudio()
  a.unlock(); a.play('squish'); a.setAmbience(100, 0, true); a.setMuted(true); a.destroy()
  assert.ok(true)
})
