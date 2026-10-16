import test from 'node:test'
import assert from 'node:assert/strict'
import { IRIS_CHOICES, PERSONALITIES, defaultLilEye, isUnlocked, lokpetSku, pose, reaction, sanitizeLilEye, cleanName, saveLilEye, loadLilEye } from './lilEye'

test('every personality has a line for every event Lil Eye can see, and unique ids', () => {
  assert.equal(new Set(PERSONALITIES.map(p => p.id)).size, PERSONALITIES.length)
  for (const p of PERSONALITIES) for (const ev of ['near-miss', 'hit', 'break', 'point', 'conceded', 'tear', 'win', 'fall', 'poke', 'idle', 'unlock'] as const) assert.ok((p.lines[ev]?.length ?? 0) > 0, `${p.id} needs a ${ev} line`)
})

test('personalities unlock by falls and wins and join the dex on their own', () => {
  const sleepy = PERSONALITIES.find(p => p.id === 'sleepy')!, cheeky = PERSONALITIES.find(p => p.id === 'cheeky')!
  assert.equal(isUnlocked(sleepy, { falls: 2, wins: 0 }), false); assert.equal(isUnlocked(sleepy, { falls: 3, wins: 0 }), true)
  assert.equal(isUnlocked(cheeky, { falls: 9, wins: 0 }), false); assert.equal(isUnlocked(cheeky, { falls: 1, wins: 1 }), true)
  assert.deepEqual(sanitizeLilEye({}, { falls: 0, wins: 0 }).owned, ['curious'])
  assert.deepEqual(sanitizeLilEye({}, { falls: 3, wins: 1 }).owned, ['curious', 'sleepy', 'cheeky'])
})

test('sanitize refuses locked personalities, junk names and unknown irises', () => {
  const s = sanitizeLilEye({ personality: 'cheeky', name: '<b>Bob</b> the very long named eye', iris: 'red', pokes: -4 }, { falls: 0, wins: 0 })
  assert.equal(s.personality, 'curious'); assert.ok(s.name.length <= 14 && !/[<>]/.test(s.name)); assert.equal(s.iris, defaultLilEye().iris); assert.equal(s.pokes, 0)
  assert.equal(cleanName(7), '')
  assert.equal(sanitizeLilEye({ iris: IRIS_CHOICES[2] }, { falls: 0, wins: 0 }).iris, IRIS_CHOICES[2])
})

test('reaction picks a line and a mood; sleepy dozes when idle', () => {
  assert.equal(reaction('curious', 'near-miss', () => 0).mood, 'wide')
  assert.equal(reaction('sleepy', 'idle', () => 0).mood, 'sleepy')
  assert.equal(reaction('nope', 'poke', () => .99).line.length > 0, true)
})

test('pose blinks briefly near the end of each blink period', () => {
  assert.equal(pose('neutral', 0, 3).lid, 0)
  assert.ok(pose('neutral', 3 * .98, 3).lid > .9)
  assert.ok(pose('sleepy', 0, 6).lid > pose('wide', 0, 6).lid)
})

test('storage round trip keeps the choice and the dex sku names are stable', () => {
  const mem = new Map<string, string>(); const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
  const s = { ...defaultLilEye(), name: 'Orb', iris: IRIS_CHOICES[1] }
  assert.ok(saveLilEye(s, st)); assert.equal(loadLilEye({ falls: 0, wins: 0 }, st).name, 'Orb'); assert.equal(loadLilEye({ falls: 0, wins: 0 }, st).iris, IRIS_CHOICES[1])
  assert.equal(lokpetSku(PERSONALITIES[0]!), 'pongfall.lokpet.lil-eye-curious')
})
