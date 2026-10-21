import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorld, stepWorld, SHARD_FLOOR } from './world'
import { SIM_VERSION } from './tuning'

const shard = (y: number, vy: number) => ({ x: 0, y, vx: 0, vy, rot: 0, vr: 0, life: 1, k: 1, size: 20 })

test('broken glass lands on an invisible floor and ceiling and bounces: kept on purpose (docs/FEATURES_TO_IMPROVE.md)', () => {
  assert.equal(SHARD_FLOOR, 520)
  assert.equal(SIM_VERSION, 25, 'simulation changes must bump SIM_VERSION and update the doc')
  const w = createWorld({ mode: 'solo-fall', arenas: 0 }, 7)
  w.shards.push(shard(2000, 900), shard(-2000, -900))
  for (let i = 0; i < 600; i++) { stepWorld(w); w.events.length = 0 }
  for (const s of w.shards) assert.ok(Math.abs(s.y) <= SHARD_FLOOR + 1e-6, `shard escaped to ${s.y}`)
})
