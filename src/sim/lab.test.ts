import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, issue, stepWorld, World } from './world'
import { recordReplay, runReplay } from './replay'
import { LAB_PRESETS, LAB_SLIDERS } from './data/lab'
import { DEFAULT_TUNING } from './tuning'

const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) { stepWorld(w); w.events.length = 0 } }
const fingerprint = (w: World) => JSON.stringify([w.tick, w.balls.map(b => [Math.round(b.x), Math.round(b.y)]), w.tears.length, w.sides.map(s => [s.score, s.glassHits])])

test('lab tools only work in the sandbox', () => {
  const ballsAfter = (mode: string, lab: boolean) => { const w = createWorld({ mode, arenas: 0 }, 7); run(w, 400); if (lab) { issue(w, { k: 'lab', op: 'ball' }); issue(w, { k: 'lab', op: 'fall', v: 3 }) } run(w, 5); return { n: w.balls.length, fall: w.tune.baseFall } }
  assert.deepEqual(ballsAfter('classic', true), ballsAfter('classic', false))
  const base = ballsAfter('sandbox', false), lab = ballsAfter('sandbox', true)
  assert.equal(lab.n, base.n + 1); assert.equal(lab.fall, DEFAULT_TUNING.baseFall * 3)
})

test('values are clamped and extra balls are capped and clearable', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 0 }, 3)
  issue(w, { k: 'lab', op: 'fall', v: 99 }); issue(w, { k: 'lab', op: 'ballSpeed', v: -5 }); issue(w, { k: 'lab', op: 'tearGravity', v: NaN })
  for (let i = 0; i < 20; i++) issue(w, { k: 'lab', op: 'ball' })
  run(w, 2)
  assert.equal(w.tune.baseFall, DEFAULT_TUNING.baseFall * 3); assert.equal(w.tune.serveSpeed, DEFAULT_TUNING.serveSpeed * .5); assert.equal(w.tune.tearGravity, DEFAULT_TUNING.tearGravity)
  assert.ok(w.balls.length <= 8)
  issue(w, { k: 'lab', op: 'clearBalls' }); run(w, 1); assert.ok(w.balls.length <= 1)
})

test('a sandbox run with lab commands replays exactly (deterministic)', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 3 }, 99)
  run(w, 200); issue(w, { k: 'lab', op: 'ball' }); issue(w, { k: 'lab', op: 'tear' }); run(w, 300)
  for (const op of LAB_PRESETS[1]!.ops) issue(w, { k: 'lab', ...op }); run(w, 400)
  const copy = runReplay(recordReplay(w))
  assert.equal(fingerprint(copy), fingerprint(w))
})

test('rewinding re-simulates up to an earlier tick without the later commands', () => {
  const w = createWorld({ mode: 'sandbox', arenas: 0 }, 5)
  run(w, 300); issue(w, { k: 'lab', op: 'ball' }); run(w, 300)
  const extra = w.balls.length
  const r = recordReplay(w); r.ticks = 200
  const back = runReplay(r)
  assert.equal(back.tick, 200); assert.ok(back.balls.length < extra || extra === 1)
})

test('every slider and preset names a real op and stays inside its range', () => {
  for (const s of LAB_SLIDERS) assert.ok(s.value >= s.min && s.value <= s.max)
  assert.ok(LAB_PRESETS.length >= 3 && LAB_PRESETS.every(p => p.ops.length > 0))
})
