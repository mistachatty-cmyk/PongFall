import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue, arenaDims, hasCpuOpponent } from './world'
import { MODES } from './data/modes'

test('versus modes have no NPC and are never ranked', () => {
  for (const id of ['versus', 'versus-timed']) assert.equal(MODES[id]!.ai, false), assert.equal(MODES[id]!.ranked, false)
})
test('Duo Fall is an unranked, enlarged co-op arena against a CPU team', () => {
  const w = createWorld({ mode: 'duo-fall' }, 5)
  assert.equal(w.mode.ai, true)
  assert.equal(w.mode.ranked, false)
  assert.deepEqual([arenaDims(w).W, arenaDims(w).H], [1024, 540])
  assert.equal(w.tune.maxScale, 2)
  for (let i = 0; i < 600; i++) stepWorld(w)
  assert.notEqual(w.sides[1].paddleY, 0)
})
test('Duo Fall local rival leaves Team 2 to its player and records the choice', () => {
  const w = createWorld({ mode: 'duo-fall', duoOpponent: 'local' }, 6)
  assert.equal(w.duoOpponent, 'local')
  assert.equal(w.initialOpts.duoOpponent, 'local')
  assert.equal(hasCpuOpponent(w), false)
  assert.equal(w.mode.ranked, false)
  for (let i = 0; i < 600; i++) stepWorld(w)
  assert.equal(w.sides[1].paddleY, 0, 'Team 2 should not receive autonomous movement')
})
test('Duo Fall paddles link by default, focus independently, then glide back into alignment', () => {
  const w = createWorld({ mode: 'duo-fall', duoOpponent: 'local' }, 7)
  issue(w, { k: 'move', side: 0, y: -100, paddle: 0 })
  issue(w, { k: 'move', side: 1, y: 110, paddle: 1 })
  stepWorld(w)
  assert.equal(w.sides[0].targetY, -100)
  assert.equal(w.sides[0].target2Y, 72, 'focused Arena 1 control leaves Arena 2 target alone')
  assert.equal(w.sides[1].target2Y, 110, 'the second player can focus their Arena 2')
  const separated = Math.abs(w.sides[0].paddleY - w.sides[0].paddle2Y)
  issue(w, { k: 'move', side: 0, y: -100 })
  stepWorld(w)
  assert.equal(w.sides[0].target2Y, -100, 'unfocused movement links both paddles')
  assert.ok(Math.abs(w.sides[0].paddleY - w.sides[0].paddle2Y) < separated + 1, 'the paddles should ease toward each other instead of teleporting')
  for (let i = 0; i < 90; i++) stepWorld(w)
  assert.ok(Math.abs(w.sides[0].paddleY - w.sides[0].paddle2Y) < 1)
})
test('in versus, side 1 only moves when told to', () => {
  const w = createWorld({ mode: 'versus' }, 5)
  for (let i = 0; i < 600; i++) stepWorld(w)
  assert.equal(w.sides[1].paddleY, 0)
  issue(w, { k: 'move', side: 1, y: 120 })
  for (let i = 0; i < 240; i++) stepWorld(w)
  assert.equal(w.sides[1].paddleY, 120)
})
