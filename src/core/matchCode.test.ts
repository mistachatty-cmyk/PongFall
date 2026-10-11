import test from 'node:test'
import assert from 'node:assert/strict'
import { makeCode, parseCode, MatchConfig } from './matchCode'

const modes = ['solo-fall', 'classic', 'timed', 'sandbox', 'versus', 'versus-timed'], diffs = ['chill', 'casual', 'sharp', 'relentless']
const cfg: MatchConfig = { mode: 'versus', difficulty: 'sharp', arenas: 5, target: 24, timeLimit: 120, flux: true, seed: 123456789 }

test('a code round-trips and looks like PF1-XXXX-XXXX-XXXX-XX', () => {
  const code = makeCode(cfg, modes, diffs)
  assert.match(code, /^PF1-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$/)
  assert.deepEqual(parseCode(code, modes, diffs), cfg)
  assert.deepEqual(parseCode(code.toLowerCase().replace(/-/g, ' '), modes, diffs), cfg)
})
test('typos and junk are rejected', () => {
  const code = makeCode(cfg, modes, diffs)
  const bad = code.slice(0, 5) + (code[5] === 'A' ? 'B' : 'A') + code.slice(6)
  assert.equal(parseCode(bad, modes, diffs), null)
  assert.equal(parseCode('hello', modes, diffs), null)
  assert.equal(parseCode('', modes, diffs), null)
})
