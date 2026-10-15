import test from 'node:test'
import assert from 'node:assert/strict'
import { cheatTears, cheatReset, CHEAT_SEQUENCE } from './cheatMenu'

test('cheat tears add and remove within the wallet limits', () => {
  assert.equal(cheatTears({ tears: 5, owned: [] }, 100).tears, 105)
  assert.equal(cheatTears({ tears: 5, owned: [] }, -50).tears, 0)
  assert.equal(cheatTears({ tears: 999990, owned: [] }, 1000).tears, 999999)
  assert.deepEqual(cheatReset({ tears: 9, owned: ['iris-mint'] }), { tears: 0, owned: [] })
  assert.equal(CHEAT_SEQUENCE, 'helloworld')
})
