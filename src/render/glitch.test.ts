import test from 'node:test'
import assert from 'node:assert/strict'
import { glitchText } from './glitch'

test('glitch text keeps its length and punctuation, flips case and digits over time, and is stable within a frame', () => {
  const seen = new Set<string>()
  for (let t = 0; t < 4000; t += 110) { const g = glitchText('You Survived?', t); assert.equal(g.length, 13); assert.equal(g[12], '?'); seen.add(g) }
  assert.ok(seen.size > 20)
  assert.ok([...seen].some(g => /[0-9]/.test(g)) && [...seen].some(g => g !== g.toUpperCase() && g !== g.toLowerCase()))
  assert.equal(glitchText('You Survived?', 5000), glitchText('You Survived?', 5050))
  assert.equal(glitchText('You Survived?', 5000).toLowerCase().replace(/[0-9]/g, ''), glitchText('You Survived?', 5000).toLowerCase().replace(/[0-9]/g, ''))
})
