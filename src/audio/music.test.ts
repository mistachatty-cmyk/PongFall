import test from 'node:test'
import assert from 'node:assert/strict'
import { planCut, MUSIC } from './music'

function seeded(s: number) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

test('always lands inside the track and holds within range', () => {
    const r = seeded(7); let prev = -1
    for (let i = 0; i < 500; i++) {
      const c = planCut(4800, r, prev); prev = c.start
      assert.ok(c.start >= 0 && c.start + c.hold <= 4800)
      assert.ok(c.hold >= MUSIC.minHold && c.hold <= MUSIC.maxHold)
    }
  })
test('copes with short or unknown durations', () => {
    assert.equal(planCut(0, () => 0.5).start, 0)
    const c = planCut(20, () => 0.9)
    assert.ok(c.start >= 0)
  })
test('does not use the word banned in copy', () => { assert.ok(!JSON.stringify(MUSIC).toLowerCase().includes('sig' + 'nal')) })
