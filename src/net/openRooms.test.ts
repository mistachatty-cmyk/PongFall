import test from 'node:test'
import assert from 'node:assert/strict'
import { ageLabel, describeRoom, isMissingFunction, parseOpenRooms } from './openRooms'

const row = { code: 'PF-0123ABCDEF', mode: 'versus', difficulty: 'chill', arenas: 3, target: 14, time_limit: 0, flux: false, host_name: 'Mira', age_seconds: 42 }

test('well-formed rows pass, malformed ones are dropped', () => {
  const got = parseOpenRooms([row, { ...row, code: 'nope' }, { ...row, mode: 'duo-fall' }, { ...row, difficulty: 'impossible' }, null, 'x'])
  assert.equal(got.length, 1); assert.deepEqual(got[0], { code: 'PF-0123ABCDEF', mode: 'versus', difficulty: 'chill', arenas: 3, target: 14, timeLimit: 0, flux: false, host: 'Mira', ageSeconds: 42 })
  assert.deepEqual(parseOpenRooms('nope'), [])
})
test('host names are cleaned and capped; a missing name becomes "A player"', () => {
  assert.equal(parseOpenRooms([{ ...row, host_name: '<b>Evil</b>' + 'x'.repeat(40) }])[0]!.host.includes('<'), false)
  assert.ok(parseOpenRooms([{ ...row, host_name: 'y'.repeat(80) }])[0]!.host.length <= 24)
  assert.equal(parseOpenRooms([{ ...row, host_name: '' }])[0]!.host, 'A player')
})
test('one-line descriptions and ages read well', () => {
  const label = (id: string) => id === 'versus' ? 'Versus' : 'Versus Timed'
  assert.equal(describeRoom(parseOpenRooms([row])[0]!, label), 'Versus · first to 14 · 3 other arenas')
  assert.equal(describeRoom(parseOpenRooms([{ ...row, mode: 'versus-timed', time_limit: 120, arenas: 0, flux: true }])[0]!, label), 'Versus Timed · 2:00 · solo shaft · flux')
  assert.equal(ageLabel(3), 'just now'); assert.equal(ageLabel(45), '40s ago'); assert.equal(ageLabel(190), '3 min ago')
})
test('a missing server function is recognised', () => {
  assert.equal(isMissingFunction('Could not find the function public.pf_list_open_rooms(p_mode) in the schema cache'), true)
  assert.equal(isMissingFunction('Room is full'), false)
})
