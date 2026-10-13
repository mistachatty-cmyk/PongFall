import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('LOK Universe manifest is valid and its public copy stays in sync', () => {
  const root = JSON.parse(readFileSync(new URL('../lok.universe.json', import.meta.url), 'utf8'))
  const served = JSON.parse(readFileSync(new URL('../public/lok.universe.json', import.meta.url), 'utf8'))
  assert.deepEqual(served, root)
  assert.equal(root.schema, 'lok.universe.platform')
  assert.equal(root.schemaVersion, 1)
  assert.equal(root.appKey, 'pongfall')
  assert.equal(root.namespace, 'g6.pongfall')
  assert.equal(root.sdkVersion, '1.3.0')
  assert.deepEqual(root.supporterBar.mount, ['shell', 'shop'])
  assert.deepEqual(root.walletStrip.mount, ['shop'])
  assert.deepEqual(root.storefront, { component: 'lok-shop-frame', version: '1.0.0' })
  assert.equal(existsSync(new URL('../public/lok-shop-frame.js', import.meta.url)), true)
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /lok-shop-frame\.js/)
})
