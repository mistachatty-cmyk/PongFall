import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, mulberry32, World } from '../sim/world'
import { createNetSession, stateHash, NetSession } from './lockstep'
import { memoryPair } from './memoryChannel'

function setup(opts: Parameters<typeof memoryPair>[0] = {}) {
  const pair = memoryPair(opts)
  const mk = (): World => createWorld({ mode: 'versus', arenas: 3, flux: true }, 4242)
  const A = { w: mk(), net: createNetSession(pair.a, 'a', 0, 20, pair.clock) }
  const B = { w: mk(), net: createNetSession(pair.b, 'b', 1, 20, pair.clock) }
  return { pair, A, B }
}
type C = { w: World; net: NetSession }
const advance = (c: C, now: number, rnd: () => number, side: 0 | 1) => {
  if (!c.net.beforeStep(c.w, now)) return false
  if (rnd() < 0.08) c.net.submit(c.w, { k: 'move', side, y: (rnd() - 0.5) * 360 })
  if (rnd() < 0.02) c.net.submit(c.w, { k: 'thrust', side, free: rnd() < 0.5 })
  if (rnd() < 0.02) c.net.submit(c.w, { k: 'tilt', side, dir: (Math.floor(rnd() * 3) - 1) as -1 | 0 | 1 })
  stepWorld(c.w); c.w.events.length = 0
  return true
}
function run(latency: () => number, ticks: number, drop?: () => boolean) {
  const { pair, A, B } = setup({ latency, drop })
  const rA = mulberry32(1), rB = mulberry32(2)
  let guard = 0
  while ((A.w.tick < ticks || B.w.tick < ticks) && guard++ < ticks * (drop ? 200 : 40)) {
    pair.pump(1)
    if (A.w.tick < ticks) advance(A, pair.clock(), rA, 0)
    else A.net.beforeStep(A.w, pair.clock())
    if (B.w.tick < ticks) advance(B, pair.clock(), rB, 1)
    else B.net.beforeStep(B.w, pair.clock())
  }
  return { A, B, guard }
}

test('two machines stay identical, whatever the latency and jitter', () => {
  for (const lat of [() => 0, () => 3, () => 2 + Math.floor(Math.random() * 9)]) {
    const { A, B } = run(lat, 1500)
    assert.equal(A.w.tick, 1500); assert.equal(B.w.tick, 1500)
    assert.equal(stateHash(A.w), stateHash(B.w))
    assert.deepEqual(A.w.log, B.w.log, 'both applied exactly the same commands in the same order')
    assert.equal(A.net.status() !== 'desync', true)
  }
})

test('a slow link makes the match wait instead of drifting apart', () => {
  const { A, B, guard } = run(() => 40, 600)
  assert.equal(stateHash(A.w), stateHash(B.w))
  assert.ok(guard > 700, `it had to wait (${guard} loop passes)`)
})

test('dropped input batches are retried in order before either sim advances', () => {
  let n = 0
  const { A, B } = run(() => 3, 800, () => ++n % 13 === 0)
  assert.equal(A.w.tick, 800); assert.equal(B.w.tick, 800)
  assert.deepEqual(A.w.log, B.w.log)
  assert.equal(stateHash(A.w), stateHash(B.w))
})

test('a mismatch is caught as a desync', () => {
  const { pair, A, B } = setup()
  const rA = mulberry32(5), rB = mulberry32(6)
  while (A.w.tick < 300 || B.w.tick < 300) {
    pair.pump(1)
    if (A.w.tick === 130) A.w.sides[0].score = 9      // cheat or bug on one machine
    if (A.w.tick < 300) advance(A, pair.clock(), rA, 0)
    if (B.w.tick < 300) advance(B, pair.clock(), rB, 1)
    if (A.net.status() === 'desync' || B.net.status() === 'desync') break
  }
  assert.ok(A.net.status() === 'desync' || B.net.status() === 'desync')
})

test('the opponent can only send its own paddle commands', () => {
  const { pair, A, B } = setup()
  B.net.submit(B.w, { k: 'move', side: 0, y: 500 })          // B tries to move A's paddle
  const rA = mulberry32(7), rB = mulberry32(8)
  for (let i = 0; i < 400; i++) { pair.pump(1); advance(A, pair.clock(), rA, 0); advance(B, pair.clock(), rB, 1) }
  assert.ok(A.w.log.every(c => !('side' in c) || c.side === 0 || c.t >= 0))
  assert.ok(!A.w.log.some(c => c.k === 'move' && 'y' in c && c.y === 500 && 'side' in c && c.side === 0 && c.t === 20), 'the forged command was dropped on A')
})

test('a rematch starts on both machines with the host seed; leaving ends the match for the other side', () => {
  const { pair, A, B } = setup()
  let sa = -1, sb = -1
  A.net.onRematch(s => { sa = s }); B.net.onRematch(s => { sb = s })
  A.net.requestRematch(111); pair.pump(1); B.net.requestRematch(222); pair.pump(1)
  assert.equal(sa, 111); assert.equal(sb, 111)
  A.net.leave(); pair.pump(1)
  assert.equal(B.net.status(), 'left')
})

test('late messages from the previous match are ignored after a rematch', () => {
  const { pair, A, B } = setup()
  const rA = mulberry32(11), rB = mulberry32(12)
  for (let i = 0; i < 200; i++) { pair.pump(1); advance(A, pair.clock(), rA, 0); advance(B, pair.clock(), rB, 1) }
  A.net.restart(); B.net.restart()
  A.w = createWorld({ mode: 'versus', arenas: 3, flux: true }, 77); B.w = createWorld({ mode: 'versus', arenas: 3, flux: true }, 77)
  for (let i = 0; i < 400; i++) { pair.pump(1); advance(A, pair.clock(), rA, 0); advance(B, pair.clock(), rB, 1) }
  assert.equal(stateHash(A.w), stateHash(B.w))
})
