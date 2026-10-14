import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { pointLeader } from './leader'

test('crown follows the unique points leader across arenas and clears on ties', () => {
  const w = { sides: [{ score: 0 }, { score: 0 }], sats: [{ id: 0, sides: [{ score: 0 }, { score: 0 }] }] }
  assert.equal(pointLeader(w as never), null)
  w.sides[0]!.score = 1
  assert.deepEqual(pointLeader(w as never), { arena: 'main', side: 0, score: 1 })
  w.sats[0]!.sides[1]!.score = 2
  assert.deepEqual(pointLeader(w as never), { arena: 'satellite', id: 0, side: 1, score: 2 })
  w.sides[1]!.score = 2
  assert.equal(pointLeader(w as never), null)
  w.sides[1]!.score = 3
  assert.deepEqual(pointLeader(w as never), { arena: 'main', side: 1, score: 3 })
})
