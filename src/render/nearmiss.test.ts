import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, padLen } from '../sim/world'
import { createFx, feedFx } from './eyes'

const crack = (y: number) => ({ kind: 'crack' as const, side: 0 as const, hits: 1, x: -300, y })

test('a ball that barely gets past the paddle startles the eyes; a clear miss does not', () => {
  const w = createWorld({}, 3)
  const len = padLen(w, 0)
  w.sides[0].paddleY = 0
  const near = createFx(); feedFx(near, w, [crack(len / 2 + 20)], 0.016)
  assert.ok(near.faceGlow > 0.5 && near.bgReact.every(r => r > 0.5))
  const far = createFx(); feedFx(far, w, [crack(900)], 0.016)
  assert.ok(far.faceGlow < 0.1 && far.bgReact.every(r => r <= 0.5))
})
