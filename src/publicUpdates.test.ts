import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildUpdates } from '../scripts/export-public-updates'

test('public/lok-updates.json is current (re-run scripts/export-public-updates.ts)', () => {
  const onDisk = JSON.parse(readFileSync(new URL('../public/lok-updates.json', import.meta.url), 'utf8'))
  assert.deepEqual(onDisk, buildUpdates())
})
