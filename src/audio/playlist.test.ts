import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCatalog, isFree, lockNote } from './playlist'

const cat = {
  schema: 'lok.playlist/v1', id: 'g6.616', title: 'Lokifed', artist: 'Cante-Digital', source: { app: 'survivor616', name: '616 Survivor', url: 'https://survivor.gsix.online' },
  tracks: [
    { id: 'a', title: 'Hidden', album: 'Take 1', url: 'https://x.test/a.m4a', gate: { app: 'survivor616', objectives: 0, unit: 'run objective' } },
    { id: 'b', title: 'Grace', url: 'https://x.test/b.m4a', gate: { app: 'survivor616', objectives: 2, unit: 'run objective' } },
    { id: 'a', title: 'dup', url: 'https://x.test/c.m4a' },
    { id: 'c', title: 'insecure', url: 'http://x.test/c.m4a' },
    { id: 'd', title: 'free', url: 'https://x.test/d.mp3' },
  ],
}

test('catalog parsing keeps valid https tracks, drops duplicates and junk, carries artist and source', () => {
  const t = parseCatalog(cat)
  assert.deepEqual(t.map(x => x.title), ['Hidden', 'Grace', 'free'])
  assert.equal(t[0]!.artist, 'Cante-Digital'); assert.equal(t[0]!.source, '616 Survivor'); assert.equal(t[0]!.sourceUrl, 'https://survivor.gsix.online'); assert.equal(t[0]!.album, 'Take 1')
  assert.deepEqual(parseCatalog(null), []); assert.deepEqual(parseCatalog({ schema: 'nope', tracks: [] }), [])
})
test('gated tracks stay locked here', () => {
  const [a, b, d] = parseCatalog(cat)
  assert.ok(isFree(a!) && isFree(d!) && !isFree(b!))
  assert.match(lockNote(b!), /616 Survivor.*2 run objectives/)
})
