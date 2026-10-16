import test from 'node:test'
import assert from 'node:assert/strict'
import { ART, gearPath, type ArtId } from './objects'
import { paletteFor } from '../palette'
import { UI_THEMES } from '../../core/uiThemes'

const ids = Object.keys(ART) as ArtId[]
const stub = (): CanvasRenderingContext2D => { const fn: unknown = new Proxy(function () { /* noop */ }, { get: (_t, k) => k === Symbol.toPrimitive ? () => 0 : stub(), set: () => true, apply: () => stub() }); return fn as CanvasRenderingContext2D }

test('there is art for every object the menus can show', () => {
  for (const id of ['jukebox', 'stats', 'gear', 'easel', 'wardrobe', 'eye', 'door', 'cassette', 'flask', 'book', 'exit', 'keys', 'save', 'restart']) assert.ok(ids.includes(id as ArtId), id)
})
test('every object draws in every theme: well-formed SVG, no NaN or undefined, spin sprites too', () => {
  for (const t of UI_THEMES) for (const id of ids) {
    const p = paletteFor(t.look)
    for (const svg of [ART[id].svg(p), ...(ART[id].spin ?? []).map(s => s.svg(p))]) {
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${t.id}/${id}`)
      assert.ok(!/NaN|undefined|\[object/.test(svg), `${t.id}/${id}`)
    }
  }
})
test('live overlays run at any time without throwing, hot or not', () => {
  const p = paletteFor(UI_THEMES[0]!.look)
  for (const id of ids) for (const t of [0, 0.7, 3.3, 99.9]) for (const hot of [false, true]) ART[id].fx?.(stub(), t, p, hot)
})
test('a gear outline has the requested number of teeth', () => {
  const d = gearPath(80, 80, 40, 32, 14)
  assert.equal((d.match(/L/g) ?? []).length, 14 * 4 - 1)
})
