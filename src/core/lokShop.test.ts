import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeLokSupporters } from './lokSupporters'

test('LOK supporter ticker accepts only public fields and strips unsafe names', () => {
  assert.deepEqual(sanitizeLokSupporters([
    { display: ' <Ada>\n', tier: 'passport', founder: true, email: 'private@example.com' },
    { display: 'Invalid', tier: 'admin' },
    { display: '   ', tier: 'pass' },
  ]), [{ display: 'Ada', tier: 'passport', founder: true }])
})
