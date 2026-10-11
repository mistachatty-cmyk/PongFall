import test from 'node:test'
import assert from 'node:assert/strict'
import { freshProgress, unlockedModes, recordFall, lockHint, multiplayerUnlocked, sanitizeProgress, isModeUnlocked } from './progress'

test('modes open one per fall and multiplayer opens after four', () => {
  let p = freshProgress()
  assert.deepEqual(unlockedModes(p), ['solo-fall'])
  assert.equal(p.menuUnlocked, false)
  p = recordFall(p); assert.deepEqual(unlockedModes(p), ['solo-fall', 'classic']); assert.equal(p.menuUnlocked, true)
  p = recordFall(p); assert.deepEqual(unlockedModes(p), ['solo-fall', 'classic', 'timed'])
  p = recordFall(p); assert.deepEqual(unlockedModes(p), ['solo-fall', 'classic', 'timed', 'sandbox']); assert.equal(multiplayerUnlocked(p), false)
  p = recordFall(p); assert.ok(unlockedModes(p).includes('versus') && unlockedModes(p).includes('versus-timed')); assert.equal(multiplayerUnlocked(p), true)
})
test('lock hints count down and "unlock all" opens everything', () => {
  const p = freshProgress()
  assert.equal(lockHint(p, 'solo-fall'), '')
  assert.match(lockHint(p, 'classic'), /1 more fall\b/)
  assert.match(lockHint(p, 'timed'), /2 more falls/)
  assert.match(lockHint(p, 'versus'), /4 more falls/)
  assert.ok(isModeUnlocked(p, 'versus', true))
})
test('saved progress is sanitised', () => {
  assert.deepEqual(sanitizeProgress(null), { falls: 0, menuUnlocked: false })
  assert.deepEqual(sanitizeProgress({ falls: -3 }), { falls: 0, menuUnlocked: false })
  assert.deepEqual(sanitizeProgress({ falls: 2.7 }), { falls: 2, menuUnlocked: true })
})
