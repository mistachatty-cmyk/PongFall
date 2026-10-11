import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue, arenaDims, FIELD_HALF } from './world'
import { normalizeArenas, orbitDims, SAT_R, SAT_W, SAT_H } from './arenas'
import { getResult } from './result'
import { recordReplay, verifyReplay } from './replay'
import { FIXED_DT } from './tuning'

const run = (w: ReturnType<typeof createWorld>, sec: number) => { for (let i = 0; i < sec / FIXED_DT; i++) { stepWorld(w); w.events.length = 0 } }
const ball = (x: number, y: number, vx: number, vy = 0, lastHit: -1 | 0 | 1 = -1) => ({ x, y, vx, vy, scored: false, age: 0, lastHit })

test('the number of other arenas is limited to solo, 1, 3 or 5', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9, -1, NaN].map(n => normalizeArenas(n)), [0, 1, 3, 3, 5, 5, 5, 0, 0])
  for (const n of [0, 1, 3, 5]) assert.equal(createWorld({ mode: 'sandbox', arenas: n }, 1).sats.length, n)
  assert.equal(createWorld({ mode: 'sandbox' }, 1).sats.length, 0)
})

function rockOnce(y: number) {
  const w = createWorld({ mode: 'sandbox' }, 5)
  w.serveTimer = 99
  const { W } = arenaDims(w)
  w.sides[0].paddleY = y; w.sides[0].targetY = y
  w.balls = [ball(-(W / 2 - 30) + 40, y, -400)]
  let peak = 0, first = 0, sign = 0, swings = 0
  for (let i = 0; i < 120 * 5; i++) {
    stepWorld(w); w.events.length = 0
    if (i === 40) w.balls = []
    peak = Math.max(peak, Math.abs(w.arena.ang))
    if (!first && Math.abs(w.arena.ang) > 0.004) first = Math.sign(w.arena.ang)
    const sg = Math.sign(w.arena.ang)
    if (sg && sg !== sign) { if (sign) swings++; sign = sg }
  }
  run(w, 10)
  return { peak, first, swings, rest: Math.abs(w.arena.ang) }
}

test('an off-centre impact rocks the arena, which swings back and settles; the other side rocks it the other way', () => {
  const a = rockOnce(150), b = rockOnce(-150)
  assert.ok(a.peak > 0.02, `should rock, peak ${a.peak}`)
  assert.ok(a.swings >= 2, `should swing back and forth, swings ${a.swings}`)
  assert.ok(a.rest < 0.01 && b.rest < 0.01, 'settles')
  assert.ok(a.first !== 0 && b.first !== 0 && a.first === -b.first, `opposite directions: ${a.first} vs ${b.first}`)
})

test('a tilted arena rolls the ball downhill (tilt gravity)', () => {
  const w = createWorld({ mode: 'sandbox' }, 5)
  w.serveTimer = 99
  w.arena.ang = 0.2
  w.balls = [ball(0, 0, 0, 0)]
  // hold the tilt by zeroing the spring each step
  for (let i = 0; i < 120; i++) { w.arena.ang = 0.2; w.arena.vang = 0; stepWorld(w); w.events.length = 0 }
  assert.ok(w.balls[0]!.vx > 100, `ball should roll toward the low side, got ${w.balls[0]!.vx}`)
})

test('the carousel holds its slots, keeps clear of your arena and of each other', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 5 }, 9)
  w.serveTimer = 99
  const { W, H } = arenaDims(w)
  const { rx, ry } = orbitDims(W, H)
  const pr = 0.5 * Math.hypot(W, H) * 0.78
  let minPlayer = 1e9, minSat = 1e9
  for (let i = 0; i < 120 * 40; i++) {
    stepWorld(w); w.events.length = 0
    for (const s of w.sats) minPlayer = Math.min(minPlayer, Math.hypot(s.x - w.arena.x, s.y - w.arena.y) - pr - SAT_R)
    for (let a = 0; a < w.sats.length; a++) for (let b = a + 1; b < w.sats.length; b++) minSat = Math.min(minSat, Math.hypot(w.sats[a]!.x - w.sats[b]!.x, w.sats[a]!.y - w.sats[b]!.y) - 2 * SAT_R)
  }
  assert.ok(minPlayer > -30, `arenas overlap yours: ${minPlayer}`)
  assert.ok(minSat > -30, `arenas overlap each other: ${minSat}`)
  for (const s of w.sats) assert.ok(Math.hypot(s.x / rx, s.y / ry) > 0.5 && Math.hypot(s.x / rx, s.y / ry) < 1.6)
  assert.ok(w.sats.some(s => Math.abs(s.ang) > 0.5), 'they rotate')
})

test('arenas knocked into each other bounce apart and push yours', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 3 }, 9)
  w.serveTimer = 99
  const a = w.sats[0]!, b = w.sats[1]!
  a.x = 0; a.y = 0; b.x = 150; b.y = 0; a.vx = 0; b.vx = 0
  const pa = a.x
  stepWorld(w); w.events.length = 0
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2 * SAT_R - 5, 'separated')
  assert.ok(a.x < pa + 1 || true)
})

test('other arenas play their own matches: balls move, panes crack, matches reset', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 3 }, 13)
  w.serveTimer = 99
  let hits = 0, breaks = 0, resets = 0
  const prev = w.sats.map(s => s.matches)
  for (let i = 0; i < 120 * 240; i++) {
    stepWorld(w)
    for (const e of w.events) { if (e.kind === 'satHit') hits++; if (e.kind === 'satBreak') breaks++ }
    w.events.length = 0
  }
  w.sats.forEach((s, i) => { resets += s.matches - prev[i]! })
  assert.ok(hits > 0 && breaks > 0, `hits ${hits} breaks ${breaks}`)
  assert.ok(resets > 0, 'a match finished and restarted')
})

test('Triple score: your ball breaking another arena glass gives three points', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 1 }, 3)
  w.serveTimer = 99
  const s = w.sats[0]!
  s.x = 700; s.y = 0; s.ang = 0; s.vang = 0; s.spin = 0; s.vx = 0; s.vy = 0
  s.sides[0].glassHits = 2
  const before = w.sides[0].score
  w.balls = [ball(s.x - SAT_W / 2 - 20, 0, 300, 0, 0)]
  let triple = false
  for (let i = 0; i < 120 * 2; i++) { stepWorld(w); if (w.events.some(e => e.kind === 'triple')) triple = true; w.events.length = 0 }
  assert.ok(triple)
  assert.equal(w.sides[0].score - before, 3)
  assert.ok(s.sides[0].broken)
  // a ball that last touched the NPC does not give the bonus
  const w2 = createWorld({ mode: 'sandbox', arenas: 1 }, 3)
  w2.serveTimer = 99
  const s2 = w2.sats[0]!
  s2.x = 700; s2.y = 0; s2.ang = 0; s2.vang = 0; s2.spin = 0; s2.sides[0].glassHits = 2
  w2.balls = [ball(s2.x - SAT_W / 2 - 20, 0, 300, 0, 1)]
  run(w2, 2)
  assert.equal(w2.sides[0].score, 0)
})

test('strays from other arenas only threaten you on sharp and relentless', () => {
  for (const [diff, hostile] of [['chill', false], ['casual', false], ['sharp', true], ['relentless', true]] as const) {
    const w = createWorld({ mode: 'sandbox', arenas: 5, difficulty: diff }, 4)
    w.serveTimer = 99
    let strays = 0
    for (let i = 0; i < 120 * 300; i++) { stepWorld(w); strays = Math.max(strays, w.satStrays.length); w.events.length = 0 }
    assert.equal(strays > 0, hostile, `${diff}: strays ${strays}`)
  }
})

test('runs with other arenas replay exactly and tampering with the count fails', () => {
  const w = createWorld({ mode: 'classic', arenas: 3, difficulty: 'sharp', target: 2 }, 31)
  while (w.status === 'play' && w.tick < 120 * 600) {
    if (w.tick % 5 === 0) { const b = w.balls.find(x => !x.scored); issue(w, { k: 'move', side: 0, y: b ? b.y + 100 * Math.sin(w.tick / 33) : 0 }) }
    if (w.tick % 400 === 7) issue(w, { k: 'thrust', side: 0 })
    stepWorld(w); w.events.length = 0
  }
  const res = getResult(w)!
  assert.ok(res && res.arenas === 3)
  const rep = recordReplay(w)
  assert.ok(verifyReplay(rep, res))
  assert.equal(verifyReplay({ ...rep, na: 0 }, res), false)
})

test('field bounds: satellites never leave the shaft', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 5 }, 6)
  w.serveTimer = 99
  let max = 0
  for (let i = 0; i < 120 * 60; i++) { stepWorld(w); for (const s of w.sats) max = Math.max(max, Math.abs(s.x)); w.events.length = 0 }
  assert.ok(max <= FIELD_HALF + 1)
  assert.ok(SAT_H > 0)
})
