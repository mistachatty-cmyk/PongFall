import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue, activatePower, powerActive, powerState, powerLeft, collectTear, arenaDims } from './world'
import { getResult, PERK_GREATS } from './result'
import { recordReplay, verifyReplay } from './replay'
import { crackNetwork, shardOrigins, PANE_W } from './glass'
import { FIXED_DT } from './tuning'

const ball = (x: number, y: number, vx: number, vy = 0) => ({ x, y, vx, vy, scored: false, age: 0, lastHit: -1 as const })
const run = (w: ReturnType<typeof createWorld>, sec: number) => { for (let i = 0; i < sec / FIXED_DT; i++) { stepWorld(w); w.events.length = 0 } }
const fillTears = (w: ReturnType<typeof createWorld>) => { for (let i = 0; i < 4; i++) { w.tears.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0 }); collectTear(w, 0, 0) } }

test('the pinball arm unlocks once your own glass is broken and the paddle is free', () => {
  const w = createWorld({ mode: 'classic' }, 4)
  assert.equal(powerState(w), 'locked')
  assert.equal(powerActive(w, 0), false)
  fillTears(w)
  assert.equal(w.powerUnlocked, false, 'tears alone no longer unlock it')
  const { W, H } = arenaDims(w)
  w.sides[0].glassHits = w.tune.glassHits + 5
  w.balls = [ball(-W / 2 + 5, 0, -300)]
  w.serveTimer = 99
  run(w, 0.3)
  assert.equal(w.sides[0].broken, true)
  assert.equal(w.powerUnlocked, true)
  assert.equal(powerActive(w, 0), true, 'and it stays on, with no timer')
  run(w, w.tune.powerSeconds + 1)
  assert.equal(powerActive(w, 0), true)
  void H
})

test('while powered, every third paddle hit is a boosted strike', () => {
  const w = createWorld({ mode: 'sandbox' }, 4)
  w.serveTimer = 99
  assert.ok(w.powerUnlocked)
  const { W } = arenaDims(w)
  const speeds: Array<{ s: number; b: boolean }> = []
  for (let k = 0; k < 6; k++) {
    w.sides[0].paddleY = 0; w.sides[0].targetY = 0
    w.balls = [ball(-(W / 2 - 30) + 40, 40, -300)]
    for (let i = 0; i < 120; i++) { stepWorld(w); for (const e of w.events) if (e.kind === 'paddle' && e.side === 0) speeds.push({ s: e.speed, b: e.boosted }); w.events.length = 0 }
  }
  assert.ok(speeds.length >= 6)
  speeds.slice(0, 6).forEach((h, i) => assert.equal(h.b, (i + 1) % 3 === 0, `hit ${i + 1}`))
  assert.ok(speeds[2]!.s > speeds[1]!.s + 200)
})

function setScore(w: ReturnType<typeof createWorld>, p: number, n: number) { w.sides[0].score = p; w.sides[1].score = n; stepWorld(w); w.events.length = 0 }

test('comeback: 4 down wakes the player Power Paddle until they lead by 2', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'sharp' }, 4)
  w.serveTimer = 99
  setScore(w, 0, 3); assert.equal(powerActive(w, 0), false)
  setScore(w, 0, 4); assert.equal(powerActive(w, 0), true)
  setScore(w, 3, 4); assert.equal(powerActive(w, 0), true, 'stays on while still close')
  setScore(w, 5, 4); assert.equal(powerActive(w, 0), true)
  setScore(w, 6, 4); assert.equal(powerActive(w, 0), false, 'up by 2 puts it back to sleep')
})

test('comeback: 6 down gives the NPC the paddle for good and the player never gets it back', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'sharp', target: 14 }, 4)
  w.serveTimer = 99
  setScore(w, 0, 4); assert.equal(powerActive(w, 0), true)
  setScore(w, 0, 6)
  assert.equal(w.npcLocked, true)
  assert.equal(powerActive(w, 1), true)
  assert.equal(powerActive(w, 0), false)
  setScore(w, 9, 6); setScore(w, 9, 13)
  assert.equal(powerActive(w, 1), true, 'the NPC keeps it even after a comeback')
  setScore(w, 3, 6); assert.equal(powerActive(w, 0), false, 'the player assist never returns')
})

test('relentless has no player assist but still locks at 6', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'relentless' }, 4)
  w.serveTimer = 99
  setScore(w, 0, 5); assert.equal(powerActive(w, 0), false)
  setScore(w, 0, 6); assert.equal(w.npcLocked, true)
})

test('the perk is earned only by winning after the NPC lock', () => {
  const lost = createWorld({ mode: 'classic', difficulty: 'sharp', target: 2 }, 4)
  lost.serveTimer = 99
  lost.npcLocked = true; lost.sides[0].score = 2; lost.status = 'over'; lost.winner = 0; lost.endReason = 'score'
  assert.deepEqual(getResult(lost)!.perks, [PERK_GREATS])
  const clean = createWorld({ mode: 'classic', target: 2 }, 4)
  clean.sides[0].score = 2; clean.status = 'over'; clean.winner = 0; clean.endReason = 'score'
  assert.deepEqual(getResult(clean)!.perks, [])
  const wrong = createWorld({ mode: 'classic', target: 2 }, 4)
  wrong.npcLocked = true; wrong.sides[1].score = 2; wrong.status = 'over'; wrong.winner = 1; wrong.endReason = 'score'
  assert.deepEqual(getResult(wrong)!.perks, [])
})

test('sandbox has no comeback rules', () => {
  const w = createWorld({ mode: 'sandbox' }, 4)
  w.serveTimer = 99
  setScore(w, 0, 9); assert.equal(w.npcLocked, false)
})

test('glass: crack networks are deterministic, bounded and connected', () => {
  const H = 400
  const a = crackNetwork(7, 0, 1, 40, H), b = crackNetwork(7, 0, 1, 40, H)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, crackNetwork(7, 1, 1, 40, H))
  assert.ok(a.length >= 10 && a.length < 80)
  const seen = new Set<string>(['0,40'])
  for (const c of a) {
    assert.ok(seen.has(`${c.pts[0]![0]},${c.pts[0]![1]}`), 'every crack starts at the impact or on an earlier crack')
    for (const [u, v] of c.pts) { assert.ok(Math.abs(u) <= PANE_W / 2 + 1e-9 && Math.abs(v) <= H / 2 + 1e-9); seen.add(`${u},${v}`) }
  }
  assert.ok(crackNetwork(7, 0, 2, 40, H).length > crackNetwork(7, 0, 0, 40, H).length - 5)
})

test('glass shards come from the cracks and the break is replayable', () => {
  const o = shardOrigins(3, 1, [10, -80, 120], 400, 36)
  assert.equal(o.length, 36)
  assert.deepEqual(o, shardOrigins(3, 1, [10, -80, 120], 400, 36))
  const w = createWorld({ mode: 'classic', difficulty: 'chill', target: 1 }, 21)
  while (w.status === 'play' && w.tick < 120 * 400) {
    if (w.tick % 5 === 0) { const b = w.balls.find(x => !x.scored); issue(w, { k: 'move', side: 0, y: b ? b.y + 90 * Math.sin(w.tick / 31) : 0 }) }
    if (w.tick % 700 === 3) issue(w, { k: 'power', side: 0 })
    stepWorld(w); w.events.length = 0
  }
  assert.ok(w.sides.some(s => s.hitYs.length > 0))
  const res = getResult(w)!
  assert.ok(res)
  assert.ok(verifyReplay(recordReplay(w), res))
})
