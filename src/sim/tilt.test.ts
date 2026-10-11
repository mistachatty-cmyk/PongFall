import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue, arenaDims } from './world'
import { atan } from './detmath'

const ball = (x: number, y: number, vx: number, vy = 0) => ({ x, y, vx, vy, scored: false, age: 0, lastHit: -1 as const })
const step = (w: ReturnType<typeof createWorld>, n: number) => { for (let i = 0; i < n; i++) { stepWorld(w); w.events.length = 0 } }

test('atan is accurate', () => {
  for (const x of [-30, -2, -1, -0.5, 0, 0.3, 1, 4, 100]) assert.ok(Math.abs(atan(x) - Math.atan(x)) < 2e-5, String(x))
})

test('A/D tilt: the paddle tilts up to its limit, bends the return, and levels out when released', () => {
  const run = (dir: -1 | 0 | 1) => {
    const w = createWorld({ mode: 'classic', arenas: 0 }, 4)
    w.serveTimer = 99
    const { W } = arenaDims(w)
    w.sides[0].paddleY = 0; w.sides[0].targetY = 0
    issue(w, { k: 'tilt', side: 0, dir })
    step(w, 120)
    const tilt = w.sides[0].ta
    w.balls = [ball(-(W / 2 - 30) + 40, 0, -400, 0)]
    step(w, 20)
    return { tilt, vy: w.balls[0]!.vy, vx: w.balls[0]!.vx }
  }
  const flat = run(0), cw = run(1), ccw = run(-1)
  assert.equal(flat.tilt, 0); assert.ok(Math.abs(flat.vy) < 1e-6)
  assert.ok(Math.abs(cw.tilt - 0.6) < 1e-6 && Math.abs(ccw.tilt + 0.6) < 1e-6)
  assert.ok(cw.vy > 100 && ccw.vy < -100, `clockwise sends it down (${cw.vy}), counter-clockwise up (${ccw.vy})`)
  const w = createWorld({ mode: 'classic', arenas: 0 }, 4)
  issue(w, { k: 'tilt', side: 0, dir: 1 }); step(w, 60); issue(w, { k: 'tilt', side: 0, dir: 0 }); step(w, 120)
  assert.equal(w.sides[0].ta, 0)
})

test('the pinball arm is locked at the start of a match and grows out only once it is earned', () => {
  const w = createWorld({ mode: 'classic', arenas: 0 }, 4)
  step(w, 200)
  assert.equal(w.sides[0].grow, 0)
  w.powerUnlocked = true                    // the qualification (own glass broken) has been met
  step(w, 30)
  assert.ok(w.sides[0].grow > 0.1 && w.sides[0].grow < 0.5, 'growing')
  step(w, 140)
  assert.ok(w.sides[0].grow > 0.99)
})

test('Space held aims the arm at the cursor; a timed release stacks extra power into the hit', () => {
  const make = () => {
    const w = createWorld({ mode: 'sandbox', arenas: 0 }, 5)
    w.serveTimer = 99
    step(w, 140)
    const { W } = arenaDims(w)
    const padX = -(W / 2 - 30)
    w.sides[0].paddleY = 0; w.sides[0].targetY = 0
    return { w, padX }
  }
  const { w, padX } = make()
  issue(w, { k: 'aim', side: 0, on: true, x: padX + 80, y: -80 })      // cursor up and inward
  step(w, 40)
  assert.ok(w.sides[0].fa > 0.5, `arm swung up toward the cursor (${w.sides[0].fa})`)
  assert.ok(w.sides[0].charge > 0.3, 'charging while held')

  const hit = (timed: boolean) => {
    const { w, padX } = make()
    issue(w, { k: 'aim', side: 0, on: true, x: padX + 80, y: -80 })
    step(w, 120)                                                        // fully charged
    w.balls = [ball(padX + 50, -30, 0, 0)]
    if (timed) issue(w, { k: 'aim', side: 0, on: false, x: 0, y: 0 })
    step(w, 14)
    return Math.hypot(w.balls[0]!.vx, w.balls[0]!.vy)
  }
  const timed = hit(true), plain = hit(false)
  assert.ok(timed > plain + 100, `timed ${timed} vs plain ${plain}`)
})

test('aiming does nothing while the arm is locked', () => {
  const w = createWorld({ mode: 'classic', arenas: 0 }, 5)
  issue(w, { k: 'aim', side: 0, on: true, x: 0, y: -100 })
  step(w, 30)
  assert.equal(w.sides[0].aimOn, false)
})
