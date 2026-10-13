import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('LOK Universe manifest is valid and its public copy stays in sync', () => {
  const root = JSON.parse(readFileSync(new URL('../lok.universe.json', import.meta.url), 'utf8'))
  const served = JSON.parse(readFileSync(new URL('../public/lok.universe.json', import.meta.url), 'utf8'))
  assert.deepEqual(served, root)
  assert.equal(root.schema, 'lok.universe.platform')
  assert.equal(root.schemaVersion, 1)
  assert.equal(root.appKey, 'pongfall')
  assert.equal(root.namespace, 'g6.pongfall')
  assert.equal(root.sdkVersion, '1.2.0')
  assert.deepEqual(root.supporterBar.mount, ['shell', 'shop'])
  assert.deepEqual(root.walletStrip.mount, ['shop'])
})
