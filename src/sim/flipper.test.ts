import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue, activatePower, powerActive, collectTear, arenaDims, padLen } from './world'
import { getResult } from './result'
import { recordReplay, verifyReplay } from './replay'
import { FIXED_DT } from './tuning'

const ball = (x: number, y: number, vx: number, vy = 0) => ({ x, y, vx, vy, scored: false, age: 0, lastHit: -1 as const })
const step = (w: ReturnType<typeof createWorld>, n: number, on?: (i: number) => void) => { for (let i = 0; i < n; i++) { on?.(i); stepWorld(w); w.events.length = 0 } }
function armed(seed = 3) {
  const w = createWorld({ mode: 'sandbox', arenas: 0 }, seed)
  w.serveTimer = 99
  for (let i = 0; i < 4; i++) { w.tears.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0 }); collectTear(w, 0, 0) }
  assert.ok(activatePower(w, 0))
  return w
}

test('flips do nothing unless the pinball paddle is armed', () => {
  const w = createWorld({ mode: 'classic' }, 3)
  w.serveTimer = 99
  issue(w, { k: 'flip', side: 0, dir: 1 })
  step(w, 60)
  assert.equal(w.sides[0].fa, 0)
})

test('flipping up and down swings the bar to opposite angles and it returns when released', () => {
  const w = armed()
  issue(w, { k: 'flip', side: 0, dir: 1 }); step(w, 30)
  assert.ok(w.sides[0].fa > w.tune.flipAngle * 0.95, `up angle ${w.sides[0].fa}`)
  issue(w, { k: 'flip', side: 0, dir: -1 }); step(w, 30)
  assert.ok(w.sides[0].fa < -w.tune.flipAngle * 0.95, `down angle ${w.sides[0].fa}`)
  issue(w, { k: 'flip', side: 0, dir: 0 }); step(w, 60)
  assert.ok(Math.abs(w.sides[0].fa) < 0.01)
})

function strikeSpeed(flip: boolean) {
  const w = armed()
  const { W } = arenaDims(w)
  const padX = -(W / 2 - 30)
  w.sides[0].paddleY = 0; w.sides[0].targetY = 0
  w.balls = [ball(padX + 38, -45, -330, 0)]       // arrives near the top end
  let speed = 0
  step(w, 90, i => { if (flip && i === 4) issue(w, { k: 'flip', side: 0, dir: 1 }) })
  for (const b of w.balls) speed = Math.max(speed, Math.hypot(b.vx, b.vy))
  return { speed, hits: w.sides[0].powerHits, b: w.balls[0]! }
}
test('a flip strike hits harder than a plain paddle hit, and the ball goes back into the arena', () => {
  // let the ball reach the bar while it is swinging: start the flip a few ticks before contact
  const plain = strikeSpeed(false), flipped = strikeSpeed(true)
  assert.ok(plain.hits >= 1 && flipped.hits >= 1, 'both register a hit')
  assert.ok(flipped.speed > plain.speed + 150, `flip ${flipped.speed} vs plain ${plain.speed}`)
  assert.ok(flipped.b.vx > 0)
})

test('every third flipper hit is a power hit', () => {
  const w = armed()
  const { W } = arenaDims(w)
  const padX = -(W / 2 - 30)
  const boosts: boolean[] = []
  for (let k = 0; k < 6; k++) {
    w.sides[0].paddleY = 0; w.sides[0].targetY = 0
    w.balls = [ball(padX + 36, -40, -300, 0)]
    issue(w, { k: 'flip', side: 0, dir: 0 })
    for (let i = 0; i < 100; i++) {
      if (i === 3) issue(w, { k: 'flip', side: 0, dir: 1 })
      stepWorld(w)
      for (const e of w.events) if (e.kind === 'paddle' && e.side === 0) boosts.push(e.boosted)
      w.events.length = 0
      if (i === 40) { w.balls = []; issue(w, { k: 'flip', side: 0, dir: 0 }) }
    }
  }
  assert.ok(boosts.length >= 6, `hits ${boosts.length}`)
  boosts.slice(0, 6).forEach((b, i) => assert.equal(b, (i + 1) % 3 === 0, `hit ${i + 1}`))
})

test('the NPC flips when it holds the pinball paddle and a ball comes in', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'sharp' }, 3)
  w.serveTimer = 99
  w.npcLocked = true
  assert.ok(powerActive(w, 1))
  const { W } = arenaDims(w)
  w.sides[1].paddleY = 0
  w.balls = [ball(W / 2 - 120, -30, 250, 0)]
  let flipped = false
  step(w, 40, () => { if (w.sides[1].fdir !== 0) flipped = true })
  assert.ok(flipped)
  w.balls = []
  step(w, 5)
  assert.equal(w.sides[1].fdir, 0)
})

test('runs with flips replay exactly (the pinball paddle wakes by itself when you fall 4 behind)', () => {
  const w = createWorld({ mode: 'classic', difficulty: 'chill', arenas: 1, target: 8 }, 17)
  let assisted = false
  while (w.status === 'play' && w.tick < 120 * 900) {
    issue(w, { k: 'move', side: 0, y: 300 })               // sit in the corner and let them score
    if (w.assistOn) assisted = true
    if (w.tick % 60 === 10) issue(w, { k: 'flip', side: 0, dir: (w.tick / 60) % 2 ? 1 : -1 })
    if (w.tick % 60 === 40) issue(w, { k: 'flip', side: 0, dir: 0 })
    stepWorld(w); w.events.length = 0
  }
  const res = getResult(w)!
  assert.ok(res && assisted, 'the second wind woke')
  assert.ok(w.log.some(c => c.k === 'flip'))
  assert.ok(verifyReplay(recordReplay(w), res))
  assert.ok(padLen(w, 0) > 0 && FIXED_DT > 0)
})
