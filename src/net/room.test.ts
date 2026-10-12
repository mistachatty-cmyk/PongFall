import test from 'node:test'
import assert from 'node:assert/strict'
import { hostRoom, joinRoom, makeRoomCode, normalizeRoomCode } from './room'
import { memoryPair } from './memoryChannel'
import type { MatchStart } from './lockstep'

const cfg: MatchStart = { mode: 'versus', difficulty: 'chill', arenas: 3, flux: false, target: 24, timeLimit: 0, seed: 99 }

test('room codes look like PF-XXXX and normalise typed input', () => {
  assert.match(makeRoomCode(), /^PF-[A-Z2-9]{4}$/)
  assert.equal(normalizeRoomCode(' pf-ab2c '), 'PF-AB2C'); assert.equal(normalizeRoomCode('ab2c'), 'PF-AB2C')
  assert.equal(normalizeRoomCode('PF-AB0C'), null); assert.equal(normalizeRoomCode('nope'), null)
})

test('a host and a guest meet through a code, get the same match, and start on opposite sides', async () => {
  const pair = memoryPair()
  const sessions: Record<string, { side: number; cfg: MatchStart }> = {}
  const pumpTimer = setInterval(() => pair.pump(1), 5)
  await hostRoom(async () => pair.a, cfg, { onReady: (s, c) => { sessions.host = { side: s.side, cfg: c } }, onError: e => { throw new Error(e) } }, 'PF-TEST')
  await joinRoom(async () => pair.b, 'PF-TEST', { onReady: (s, c) => { sessions.guest = { side: s.side, cfg: c } }, onError: e => { throw new Error(e) } })
  await new Promise(r => setTimeout(r, 200))
  clearInterval(pumpTimer)
  assert.equal(sessions.host!.side, 0); assert.equal(sessions.guest!.side, 1)
  assert.deepEqual(sessions.guest!.cfg, cfg)
})

test('joining a room nobody opened times out with a clear message', async () => {
  const pair = memoryPair()
  const t = setInterval(() => pair.pump(1), 5)
  const err = await new Promise<string>(res => { void joinRoom(async () => pair.b, 'PF-NONE', { onReady: () => res('started'), onError: res }, 150) })
  clearInterval(t)
  assert.match(err, /No room answered/)
})
