import test from 'node:test'
import assert from 'node:assert/strict'
import { CHANGELOG, CURRENT_VERSION } from './changelog'

test('versions are unique and ascending', () => {
  const v = CHANGELOG.map(e => e.version.split('.').map(Number) as [number, number, number])
  assert.equal(new Set(CHANGELOG.map(e => e.version)).size, CHANGELOG.length)
  for (let i = 1; i < v.length; i++) {
    const [a, b] = [v[i - 1]!, v[i]!]
    assert.ok(b[0] > a[0] || (b[0] === a[0] && (b[1] > a[1] || (b[1] === a[1] && b[2] > a[2]))))
  }
  assert.equal(CURRENT_VERSION, CHANGELOG.at(-1)!.version)
})
