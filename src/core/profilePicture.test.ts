import test from 'node:test'
import assert from 'node:assert/strict'
import { safeAvatarUrl } from './profilePicture'

test('only plain https pictures are accepted as profile pictures', () => {
  assert.equal(safeAvatarUrl('https://example.com/a.png'), 'https://example.com/a.png')
  assert.equal(safeAvatarUrl('http://example.com/a.png'), null)
  assert.equal(safeAvatarUrl('javascript:alert(1)'), null)
  assert.equal(safeAvatarUrl('data:image/png;base64,AAAA'), null)
  assert.equal(safeAvatarUrl(5), null)
  assert.equal(safeAvatarUrl('https://example.com/' + 'a'.repeat(3000)), null)
})
