import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, npcDifficulty, padLen } from './world'
import { satPad } from './arenas'
import { recordReplay, verifyReplay } from './replay'
import { getResult } from './result'

test('Flux: the NPC drifts between tiers and its paddle size changes; off, nothing moves', () => {
  const on = createWorld({ flux: true, difficulty: 'casual' }, 8), off = createWorld({ difficulty: 'casual' }, 8)
  const speeds = new Set<number>(), sizes = new Set<number>()
  for (let i = 0; i < 120 * 60; i++) {
    on.t = i / 120; off.t = i / 120
    if (i % 600 === 0) { speeds.add(Math.round(npcDifficulty(on).speed * 100)); sizes.add(Math.round(padLen(on, 1))) }
    assert.equal(npcDifficulty(off), off.difficulty)
  }
  assert.ok(speeds.size > 3 && sizes.size > 3, `varied ${speeds.size} ${sizes.size}`)
  for (const sp of speeds) assert.ok(sp >= 50 && sp <= 115)
  assert.equal(padLen(off, 1), padLen(off, 1))
})

test('Flux resizes the other arenas paddles on both sides and is never ranked; replays still verify', () => {
  const w = createWorld({ flux: true, arenas: 3, target: 3 }, 9)
  const a = new Set<number>(), b = new Set<number>()
  for (let t = 0; t < 80; t += 2) { w.t = t; a.add(Math.round(satPad(w, 0, 0))); b.add(Math.round(satPad(w, 0, 1))) }
  assert.ok(a.size > 5 && b.size > 5)
  w.t = 0
  for (let i = 0; i < 120 * 300 && w.status === 'play'; i++) stepWorld(w)
  const r = getResult(w)
  assert.ok(r && r.ranked === false)
  assert.ok(verifyReplay(recordReplay(w), r!))
})
