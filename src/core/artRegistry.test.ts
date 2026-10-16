import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ART, artById, visibleArt } from './artRegistry'

test('every art entry names its source and licence', () => {
  assert.ok(ART.length > 0)
  for (const a of ART) {
    assert.ok(a.source.trim().length > 2, `${a.id} needs a source`)
    assert.ok(a.license.trim().length > 2, `${a.id} needs a license`)
    assert.ok(a.attribution.trim().length > 0, `${a.id} needs attribution`)
  }
})

test('art ids are unique and every cleared file exists', () => {
  assert.equal(new Set(ART.map(a => a.id)).size, ART.length)
  for (const a of visibleArt()) assert.doesNotThrow(() => readFileSync(new URL(`../../public/${a.src}`, import.meta.url)), `${a.id} file`)
})

test('uncleared art is hidden', () => {
  assert.equal(artById('nope'), undefined)
  assert.ok(visibleArt().every(a => a.cleared))
})
