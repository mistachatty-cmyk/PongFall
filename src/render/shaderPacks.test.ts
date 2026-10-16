import test from 'node:test'
import assert from 'node:assert/strict'
import { SHADER_PACKS, packById, packStyle } from './shaderPacks'

test('the Off pack hides the overlay and unknown ids fall back to it', () => {
  assert.equal(packStyle(packById('none')).display, 'none')
  assert.equal(packById('???').id, 'none')
})
test('packs combine a grade with vignette, scanlines, tint and grain; reduced motion drops scanlines and grain', () => {
  const tube = packStyle(packById('tube'))
  assert.equal(tube.display, 'block'); assert.ok(tube.backdropFilter.includes('contrast')); assert.ok(tube.background.includes('repeating-linear-gradient')); assert.ok(tube.background.includes('radial-gradient'))
  const calm = packStyle(packById('tube'), true)
  assert.ok(!calm.background.includes('repeating-linear-gradient') && !calm.background.includes('svg') && calm.background.includes('radial-gradient'))
  assert.ok(packStyle(packById('dream')).background.includes('255,170,200'))
})
test('pack ids are unique and every pack but Off has some effect', () => {
  assert.equal(new Set(SHADER_PACKS.map(p => p.id)).size, SHADER_PACKS.length)
  for (const p of SHADER_PACKS.filter(x => x.id !== 'none')) assert.ok(p.grade || p.vignette || p.scan || p.grain || p.tint, p.id)
})
