import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue } from './world'
import { MODES } from './data/modes'

test('versus modes have no NPC and are never ranked', () => {
  for (const id of ['versus', 'versus-timed']) assert.equal(MODES[id]!.ai, false), assert.equal(MODES[id]!.ranked, false)
})
test('in versus, side 1 only moves when told to', () => {
  const w = createWorld({ mode: 'versus' }, 5)
  for (let i = 0; i < 600; i++) stepWorld(w)
  assert.equal(w.sides[1].paddleY, 0)
  issue(w, { k: 'move', side: 1, y: 120 })
  for (let i = 0; i < 240; i++) stepWorld(w)
  assert.equal(w.sides[1].paddleY, 120)
})
