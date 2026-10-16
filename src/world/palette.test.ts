import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LOOK, hexToRgb, hslToHex, isHex, mix, paletteFor, rgbToHex, rgbToHsl, shade, tint } from './palette'

test('colour conversions round trip', () => {
  assert.deepEqual(hexToRgb('#ff8000'), [255, 128, 0]); assert.equal(rgbToHex(255, 128, 0), '#ff8000'); assert.deepEqual(hexToRgb('#fa0'), [255, 170, 0])
  for (const c of ['#6fb1ff', '#8cece6', '#ffe08a', '#123456']) assert.equal(hslToHex(...rgbToHsl(...hexToRgb(c))), c)
})
test('shade, mix and tint behave', () => {
  assert.ok(rgbToHsl(...hexToRgb(shade('#336699', 0.2)))[2] > rgbToHsl(...hexToRgb('#336699'))[2])
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080')
  assert.notEqual(tint('#ff0000', 120), '#ff0000'); assert.equal(isHex('#a1b2c3'), true); assert.equal(isHex('red'), false)
})
test('a palette has an ordered metal ramp and honours the accent override', () => {
  const p = paletteFor(DEFAULT_LOOK)
  const lum = (h: string) => rgbToHsl(...hexToRgb(h))[2]
  assert.ok(lum(p.steel[0]) > lum(p.steel[1]) && lum(p.steel[1]) > lum(p.steel[2]) && lum(p.steel[2]) > lum(p.steel[3]))
  assert.equal(paletteFor(DEFAULT_LOOK, '#ff00aa').accent, '#ff00aa'); assert.equal(paletteFor(DEFAULT_LOOK, 'nope').accent, DEFAULT_LOOK.accent)
  assert.notEqual(paletteFor(DEFAULT_LOOK).key, paletteFor(DEFAULT_LOOK, '#ff00aa').key)
  for (const plaque of ['steel', 'brass', 'glass', 'paper'] as const) assert.equal(paletteFor({ ...DEFAULT_LOOK, plaque }).plaque.finish, plaque)
})
