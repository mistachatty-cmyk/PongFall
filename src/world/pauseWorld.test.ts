import { test } from 'node:test'
import assert from 'node:assert/strict'
import { artForPause, pausePlacement, pauseZoom } from './pauseWorld'
import { PROP_ART } from './propArt'

const LABELS = ['Resume', 'Save match', 'Restart match', 'Arena Sides (live)', 'Settings', 'Keyboard controls (C)', 'Music', 'Rules and how it works', 'Dev notes', 'Leave match', 'Main menu', 'Reset settings to defaults']

test('every pause choice has an object with art', () => {
  for (const l of LABELS) assert.ok(PROP_ART[artForPause(l)], l)
  assert.equal(artForPause('Main menu'), 'exit'); assert.equal(artForPause('Leave match'), 'exit')
  assert.equal(artForPause('Settings'), 'gear'); assert.equal(artForPause('Something new'), 'book')
})

test('objects never overlap each other or the arena', () => {
  for (const portrait of [false, true]) for (let n = 1; n <= 11; n++) {
    const pts = Array.from({ length: n }, (_, i) => pausePlacement(i, n, 640, 400, portrait))
    pts.forEach((a, i) => {
      assert.ok(!(Math.abs(a.x) < 320 + 60 && Math.abs(a.y) < 200 + 60), `inside the arena n=${n} i=${i} portrait=${portrait}`)
      pts.slice(i + 1).forEach((b, j) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 120, `overlap n=${n} ${i}/${i + j + 1} portrait=${portrait}`))
    })
  }
})

test('the pulled-back camera fits every object on the screen', () => {
  for (const [cw, ch] of [[1280, 800], [1920, 1080], [390, 844], [820, 1180]] as const) for (const n of [4, 8, 11]) {
    const portrait = cw / ch < 0.85, z = pauseZoom(n, 640, 400, cw, ch)
    for (let i = 0; i < n; i++) {
      const p = pausePlacement(i, n, 640, 400, portrait)
      assert.ok(Math.abs(p.x) * z + 52 * z <= cw / 2 + 1 && Math.abs(p.y) * z + 52 * z <= ch / 2 + 1, `off screen ${cw}x${ch} n=${n} i=${i}`)
    }
  }
})
