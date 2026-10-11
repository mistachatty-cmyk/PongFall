import test from 'node:test'
import assert from 'node:assert/strict'
import { TRACKS, notesAt, sanitizeMusic, midiHz } from './music'

test('tracks are well formed and have something to play', () => {
  assert.ok(TRACKS.length >= 3)
  for (const t of TRACKS) {
    assert.equal(t.bass.length, 16, t.id); assert.equal(t.lead.length, 16, t.id)
    assert.ok(t.bpm > 40 && t.bpm < 200, t.id)
    assert.ok(t.bass.some(x => x !== null) && t.lead.some(x => x !== null), t.id)
  }
  assert.equal(new Set(TRACKS.map(t => t.id)).size, TRACKS.length)
})
test('notesAt wraps and maps degrees to pitch', () => {
  const t = TRACKS[0]!
  assert.equal(notesAt(t, 0).bass, midiHz(t.root))
  assert.deepEqual(notesAt(t, 16), notesAt(t, 0))
  assert.equal(notesAt(t, 1).bass, null)
})
test('sanitizeMusic clamps junk', () => {
  assert.deepEqual(sanitizeMusic(null), { on: true, track: 0, vol: 0.5 })
  assert.equal(sanitizeMusic({ track: 99, vol: 7, on: false }).track, 0)
  assert.equal(sanitizeMusic({ track: 2, vol: 0.2, on: false }).on, false)
})
