import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, issue } from './world'

// Pins the exact numeric trajectory of a fixed run. Any change to physics, rng or detmath shows up
// here; running the same test in other engines (Firefox/WebKit) proves cross-browser determinism.
const GOLDEN = '145.0347053004211,-146.8992409195935,-780.6958322693781,-147.93396905176846,0,0,4800'

function fingerprint(): string {
  const w = createWorld({ mode: 'classic', modifiers: ['gale', 'rough-seas'], arenas: 3, target: 99 }, 12345)
  for (let i = 0; i < 120 * 40; i++) {
    if (i % 7 === 0) issue(w, { k: 'move', side: 0, y: (w.balls[0]?.y ?? 0) + ((i * 13) % 50) - 25 })
    stepWorld(w)
    w.events.length = 0
  }
  const nums = [...w.balls.flatMap(b => [b.x, b.y, b.vx, b.vy]), w.sides[0].score, w.sides[1].score, w.tick]
  return nums.map(n => n.toString()).join(',')
}

test('golden trajectory is stable', () => {
  assert.equal(fingerprint(), GOLDEN)
})
