import test from 'node:test'
import assert from 'node:assert/strict'
import { composeRunContent, RUN_CONTENT } from './runContent'

test('the base loadout stays presentation only and keeps the original asset packs', () => {
  const run = composeRunContent({ modules: [] })
  assert.equal(run.simulationChanged, false)
  assert.equal(run.unranked, false)
  assert.deepEqual(run.assetPacks.sort(), ['ambience', 'arena', 'ball', 'eye', 'glass', 'paddle', 'shaft', 'tear'])
})

test('run modules compose independent visual effects and deterministic rules', () => {
  const run = composeRunContent({ modules: ['lab:echo-rallies', 'lab:wind-vents', 'rule:wind-vents'] })
  assert.deepEqual(run.experimentIds.sort(), ['echo-rallies', 'wind-vents'])
  assert.deepEqual(run.modifierIds, ['wind-vents'])
  assert.equal(run.simulationChanged, true)
  assert.equal(run.unranked, true)
})

test('online run composition rejects unverified simulation content', () => {
  const run = composeRunContent({ online: true, modules: ['lab:wind-vents', 'lab:echo-rallies'] })
  assert.deepEqual(run.experimentIds, ['echo-rallies'])
  assert.equal(run.simulationChanged, false)
  assert.deepEqual(run.rejected, [{ id: 'lab:wind-vents', reason: 'Simulation content is offline-only until verified for online play' }])
})

test('asset packs replace one slot and invalid IDs are reported without crashing', () => {
  const run = composeRunContent({ assets: { ball: 'asset:ball:classic' }, modules: ['missing:feature'] })
  assert.equal(run.assetPacks.filter(slot => slot === 'ball').length, 1)
  assert.equal(run.rejected[0]?.id, 'missing:feature')
  assert.equal(new Set(RUN_CONTENT.map(item => item.id)).size, RUN_CONTENT.length)
})

test('every Game Lab switch has a matching stable run-content entry', async () => {
  const { EXPERIMENTS } = await import('../../core/gameLab')
  for (const experiment of EXPERIMENTS) assert.ok(RUN_CONTENT.some(item => item.experimentId === experiment.id), `${experiment.id} missing from run catalog`)
})
