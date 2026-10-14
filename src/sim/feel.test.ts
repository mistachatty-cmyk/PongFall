import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue, eyeY, windAt, windVentAt, thrust, thrustCharge, sliceTears, FIELD_HALF, arenaDims, padLen, glassLimit } from './world'
import { getResult } from './result'
import { recordReplay, verifyReplay } from './replay'
import { DIFFICULTIES, DIFFICULTY_ORDER } from './data/difficulty'
import { FIXED_DT } from './tuning'

const ball = (x: number, y: number, vx: number, vy = 0) => ({ x, y, vx, vy, scored: false, age: 0, lastHit: -1 as const })
const run = (w: ReturnType<typeof createWorld>, sec: number) => { for (let i = 0; i < sec / FIXED_DT; i++) { stepWorld(w); w.events.length = 0 } }

test('a plain wall hit drops no tear and opens no eyes; an eye hit does', () => {
  const w = createWorld({ mode: 'sandbox' }, 3)
  w.serveTimer = 99
  const e = w.eyes.find(x => x.wall === 1)!
  // aim between eyes: the farthest y from every eye on that wall
  let y = 0, best = -1
  for (let c = -600; c <= 600; c += 5) {
    const d = Math.min(...w.eyes.filter(x => x.wall === 1).map(x => Math.abs(eyeY(w, x) - c)))
    if (d > best) { best = d; y = c }
  }
  w.balls = [ball(FIELD_HALF - 40, y, 300)]
  run(w, 0.2)
  assert.equal(w.tears.length, 0)
  assert.ok(w.realT < w.eyesOpenUntil === false)
  w.balls = [ball(FIELD_HALF - 40, eyeY(w, e), 300)]
  run(w, 0.2)
  assert.equal(w.tears.length, 1)
})

test('slice collects tears along the segment and ignores far ones', () => {
  const w = createWorld({ mode: 'sandbox' }, 3)
  w.tears.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0 }, { x: 100, y: 5, vx: 0, vy: 0, age: 0 }, { x: 0, y: 400, vx: 0, vy: 0, age: 0 })
  assert.equal(sliceTears(w, -50, 0, 150, 0), 2)
  assert.equal(w.tears.length, 1)
  assert.equal(w.tearsHeld, 2)
})

test('thrust lunges the paddle, has a cooldown and hands speed to the ball', () => {
  const w = createWorld({ mode: 'sandbox' }, 3)
  w.serveTimer = 99
  assert.equal(thrust(w, 0), true)
  assert.equal(thrust(w, 0), false)
  assert.ok(thrustCharge(w, 0) > 0.9)
  const { W } = arenaDims(w)
  const x0 = -(W / 2 - 30)
  w.sides[0].paddleY = 0; w.sides[0].targetY = 0
  w.balls = [ball(x0 + 45, 0, -200)]
  const hits: number[] = []
  for (let i = 0; i < 200; i++) { stepWorld(w); for (const ev of w.events) if (ev.kind === 'paddle' && ev.side === 0) hits.push(ev.speed); w.events.length = 0 }
  assert.ok(hits.length >= 1)
  assert.ok(hits[0]! > 600, `thrust should add speed, got ${hits[0]}`)
  assert.ok(hits[0]! <= w.tune.maxSpeed)
  run(w, 1.2)
  assert.ok(thrustCharge(w, 0) === 0 && w.sides[0].px < 1)
})

test('wind is deterministic per seed and pushes tears', () => {
  const a = createWorld({ mode: 'sandbox', modifiers: ['gale'] }, 11), b = createWorld({ mode: 'sandbox', modifiers: ['gale'] }, 11)
  for (let i = 0; i < 300; i++) { stepWorld(a); stepWorld(b) }
  assert.equal(windAt(a), windAt(b))
  const w = createWorld({ mode: 'sandbox', modifiers: ['gale'] }, 11)
  w.serveTimer = 99
  w.tears.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0 })
  let moved = 0
  for (let i = 0; i < 360; i++) { stepWorld(w); moved = Math.max(moved, Math.abs(w.tears[0]?.vx ?? 0)) }
  assert.ok(moved > 20, `wind should move tears, got ${moved}`)
})

test('wind vents push inward from a seeded wall and move on the same timer in replay copies', () => {
  const a = createWorld({ mode: 'classic', modifiers: ['wind-vents'] }, 930), b = createWorld({ mode: 'classic', modifiers: ['wind-vents'] }, 930)
  const baseline = createWorld({ mode: 'classic' }, 930)
  const [W] = [arenaDims(a).W]
  const x = a.ventSide * (W / 2 - 40)
  a.t = 1; b.t = 1
  assert.equal(Math.sign(windVentAt(a, x, a.ventY)), -a.ventSide)
  assert.equal(windVentAt(b, x, b.ventY), windVentAt(a, x, a.ventY))
  assert.equal(windVentAt(baseline, x, 0), 0)
  for (let i = 0; i < 1400; i++) { stepWorld(a); stepWorld(b) }
  assert.equal(a.ventSide, b.ventSide)
  assert.equal(a.ventY, b.ventY)
  assert.equal(a.ventTimer, b.ventTimer)
})

test('Eye Weather drops deterministic tear showers and stays absent from the baseline', () => {
  const a = createWorld({ mode: 'sandbox', modifiers: ['eye-weather'] }, 722), b = createWorld({ mode: 'sandbox', modifiers: ['eye-weather'] }, 722)
  const baseline = createWorld({ mode: 'sandbox' }, 722)
  let spawned = 0, baselineWaves = 0
  for (let i = 0; i < 3000; i++) {
    stepWorld(a); stepWorld(b); stepWorld(baseline)
    spawned += a.events.filter(event => event.kind === 'weather').reduce((sum, event) => sum + (event.kind === 'weather' ? event.tears : 0), 0)
    baselineWaves += baseline.events.filter(event => event.kind === 'weather').length
    a.events.length = 0; b.events.length = 0; baseline.events.length = 0
  }
  assert.ok(spawned >= 3)
  assert.deepEqual(a.tears, b.tears)
  assert.equal(baselineWaves, 0)
})

test('impacts shove the arena body and it settles back', () => {
  const w = createWorld({ mode: 'sandbox' }, 5)
  w.serveTimer = 99
  w.sides[1].broken = true
  const { W } = arenaDims(w)
  w.balls = [ball(W / 2 - 60, 0, 500)]
  let peak = 0
  for (let i = 0; i < 120 * 3; i++) { stepWorld(w); peak = Math.max(peak, Math.abs(w.arena.x) + Math.abs(w.arena.y)); w.events.length = 0 }
  assert.ok(peak > 0.5)
  run(w, 8)
  assert.ok(Math.abs(w.arena.x) < 3)
})

test('chill gives the player a longer paddle and tougher glass than relentless', () => {
  const c = createWorld({ difficulty: 'chill' }, 1), r = createWorld({ difficulty: 'relentless' }, 1)
  assert.ok(padLen(c, 0) > padLen(r, 0))
  assert.ok(glassLimit(c, 0) > glassLimit(r, 0))
  assert.equal(glassLimit(c, 1), glassLimit(r, 1))
})

// A steady scripted player follows the ball; harder NPCs should win more rallies.
function margin(diff: string, seeds: number[]) {
  let total = 0
  for (const seed of seeds) {
    const w = createWorld({ mode: 'sandbox', difficulty: diff }, seed)
    for (let i = 0; i < 120 * 100; i++) {
      if (i % 6 === 0) { const b = w.balls.find(x => !x.scored); issue(w, { k: 'move', side: 0, y: b ? b.y : 0 }) }
      stepWorld(w); w.events.length = 0
    }
    total += w.sides[0].score - w.sides[1].score
  }
  return total
}
test('difficulty tiers are ordered: the player does best on chill, worst on relentless', () => {
  const seeds = [1, 2, 3, 4]
  const m = Object.fromEntries(DIFFICULTY_ORDER.map(d => [d, margin(d, seeds)]))
  assert.ok(m.chill! > m.relentless!, JSON.stringify(m))
  assert.ok(m.chill! >= m.sharp!, JSON.stringify(m))
})

test('replays with thrust, slice and difficulty verify, and tampering fails', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'sharp', modifiers: ['gale'], target: 2 }, 21)
  while (w.status === 'play' && w.tick < 120 * 400) {
    if (w.tick % 5 === 0) { const b = w.balls.find(x => !x.scored); issue(w, { k: 'move', side: 0, y: b ? b.y + 160 * Math.sin(w.tick / 37) : 0 }) }
    if (w.tick % 140 === 0) issue(w, { k: 'thrust', side: 0 })
    if (w.tick % 90 === 0) issue(w, { k: 'slice', x1: -300, y1: -300, x2: 300, y2: 300 })
    stepWorld(w); w.events.length = 0
  }
  const res = getResult(w)!
  assert.ok(res && res.difficulty === 'sharp')
  const rep = recordReplay(w)
  assert.ok(verifyReplay(rep, res))
  assert.equal(verifyReplay({ ...rep, diff: 'chill' }, res), false)
  assert.ok(DIFFICULTIES[rep.diff])
})
