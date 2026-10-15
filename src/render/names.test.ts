import test from 'node:test'
import assert from 'node:assert/strict'
import { botName, arenaTitle } from './names'

test('bot names are stable, distinct per side, and arena titles follow the names setting', () => {
  assert.equal(botName(0, 0), botName(0, 0)); assert.notEqual(botName(0, 0), botName(0, 1)); assert.notEqual(botName(1, 0), botName(2, 0))
  assert.match(botName(3, 1), /^[A-Z]+-\d\d$/)
  assert.equal(arenaTitle(0, { names: false, over: false, target: 5 }), 'ARENA B · first to 5')
  assert.match(arenaTitle(0, { names: true, over: false, target: 5 }), /^ARENA B · .+ vs .+$/)
  assert.equal(arenaTitle(1, { crowned: 1, names: false, over: false, target: 5 }), '👑 ARENA C')
  assert.match(arenaTitle(1, { crowned: 0, names: true, over: false, target: 5 }), /^👑 ARENA C · [A-Z]+-\d\d$/)
})
