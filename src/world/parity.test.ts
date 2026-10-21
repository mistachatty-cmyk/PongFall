import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FEATURES } from './parity'
import { PROPS } from './menuModel'
import { resolveMenuStyle } from './enabled'

const classic = readFileSync(new URL('../core/mainMenu.ts', import.meta.url), 'utf8') + readFileSync(new URL('../main.ts', import.meta.url), 'utf8')   // the page chrome (music chip) lives in main.ts

test('every object in the live-world menu has a counterpart in the original menu', () => {
  const mapped = new Set(FEATURES.map(f => f.world))
  for (const p of PROPS) assert.ok(mapped.has(`prop:${p.id}`), `${p.id} has no row in parity.ts`)
  assert.equal(new Set(FEATURES.map(f => f.id)).size, FEATURES.length)
})
test('the original menu still has the entry point each feature needs', () => {
  for (const f of FEATURES) assert.ok(classic.includes(f.classic), `original menu lost "${f.classic}" (${f.id})`)
})
test('the menu style resolves from the link, then the saved setting, then the old key; the eye menu is default', () => {
  assert.equal(resolveMenuStyle('classic', 'world', null), 'classic')
  assert.equal(resolveMenuStyle('world', 'classic', '1'), 'world')
  assert.equal(resolveMenuStyle(null, 'classic', null), 'classic')
  assert.equal(resolveMenuStyle(null, null, '1'), 'classic')
  assert.equal(resolveMenuStyle(null, null, '0'), 'world')
  assert.equal(resolveMenuStyle(null, null, null), 'classic')
  assert.equal(resolveMenuStyle('junk', 'junk', null), 'classic')
})
