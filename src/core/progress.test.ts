import test from 'node:test'
import assert from 'node:assert/strict'
import { freshProgress, MODE_ORDER, unlockedModes, visibleModes, visibleDifficulties, visibleArenas, unlockedDifficulties, unlockedArenas, recordFall, lockHint, multiplayerUnlocked, sanitizeProgress, isModeUnlocked } from './progress'

test('menu starts minimal and one fall unlocks multiplayer, then one feature per fall', () => {
  let p = freshProgress()
  assert.deepEqual(unlockedModes(p), ['solo-fall'])
  assert.deepEqual(visibleModes(p), ['solo-fall'])
  assert.deepEqual(visibleDifficulties(p), ['chill'])
  assert.deepEqual(visibleArenas(p), [0])
  assert.deepEqual(unlockedDifficulties(p), ['chill'])
  assert.deepEqual(unlockedArenas(p), [0])
  assert.equal(p.menuUnlocked, false)
  p = recordFall(p); assert.deepEqual(visibleModes(p), [...MODE_ORDER]); assert.deepEqual(unlockedModes(p), ['solo-fall', 'versus']); assert.equal(multiplayerUnlocked(p), true)
  p = recordFall(p); assert.deepEqual(unlockedModes(p), ['solo-fall', 'classic', 'versus'])
  p = recordFall(p); assert.deepEqual(unlockedDifficulties(p), ['chill', 'casual'])
  p = recordFall(p); assert.ok(unlockedModes(p).includes('timed'))
  p = recordFall(p); assert.deepEqual(unlockedArenas(p), [0, 1])
  p = recordFall(p); assert.deepEqual(unlockedDifficulties(p), ['chill', 'casual', 'sharp'])
  p = recordFall(p); assert.ok(unlockedModes(p).includes('sandbox'))
  p = recordFall(p); assert.deepEqual(unlockedArenas(p), [0, 1, 3])
  p = recordFall(p); assert.deepEqual(unlockedDifficulties(p), ['chill', 'casual', 'sharp', 'relentless'])
  p = recordFall(p); assert.ok(unlockedModes(p).includes('versus-timed'))
  p = recordFall(p); assert.deepEqual(unlockedArenas(p), [0, 1, 3, 5])
})
test('lock hints count down and "unlock all" opens everything', () => {
  const p = freshProgress()
  assert.equal(lockHint(p, 'solo-fall'), '')
  assert.match(lockHint(p, 'classic'), /2 more falls/)
  assert.match(lockHint(p, 'timed'), /4 more falls/)
  assert.match(lockHint(p, 'versus'), /1 more fall/)
  assert.ok(isModeUnlocked(p, 'versus', true))
})
test('saved progress is sanitised', () => {
  assert.deepEqual(sanitizeProgress(null), { falls: 0, menuUnlocked: false })
  assert.deepEqual(sanitizeProgress({ falls: -3 }), { falls: 0, menuUnlocked: false })
  assert.deepEqual(sanitizeProgress({ falls: 2.7 }), { falls: 2, menuUnlocked: true })
})
