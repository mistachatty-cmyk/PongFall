import test from 'node:test'
import assert from 'node:assert/strict'
import { WATCH_KEY, WATCH_SEQUENCE, feedSecret, unlockWatching, watchingUnlocked } from './watchingEgg'

test('typing the word completes the egg, other letters do not', () => {
  let b = '', hit = false
  for (const k of 'xxwatchme') ({ buffer: b, hit } = feedSecret(b, k))
  assert.equal(hit, true); assert.equal(b, '')
  assert.equal(feedSecret('watchm', 'x').hit, false); assert.equal(WATCH_SEQUENCE, 'watchme')
})
test('the unlock is remembered', () => {
  const m = new Map<string, string>(); const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  assert.equal(watchingUnlocked(s), false); assert.equal(unlockWatching(s), true); assert.equal(watchingUnlocked(s), true); assert.equal(m.get(WATCH_KEY), '1')
})
