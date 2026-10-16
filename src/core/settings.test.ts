import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSettings, defaultSettings, worldOverrides, timeLabel, targetLabel } from './settings'

const valid = { modes: ['classic', 'timed', 'sandbox'], difficulties: ['chill', 'sharp'] }

test('garbage or missing settings fall back to safe defaults', () => {
  assert.deepEqual(sanitizeSettings(null, valid), defaultSettings())
  assert.deepEqual(sanitizeSettings('x', valid), defaultSettings())
  const s = sanitizeSettings({ difficulty: 'nope', mode: 5, arenas: 2, target: 999, timeLimit: 'x', fog: 'ultra', buttons: 1, hints: 'yes' }, valid)
  assert.deepEqual(s, defaultSettings())
})

test('valid values are kept', () => {
  const s = sanitizeSettings({ difficulty: 'sharp', mode: 'timed', arenas: 5, target: 28, timeLimit: 180, reduceMotion: true, fog: 'low', hints: false, gauge: false, gameHud: false, buttons: 'hide', leftHanded: true }, valid)
  assert.equal(s.difficulty, 'sharp'); assert.equal(s.mode, 'timed'); assert.equal(s.arenas, 5); assert.equal(s.target, 28); assert.equal(s.timeLimit, 180)
  assert.ok(s.reduceMotion && s.leftHanded && !s.hints && !s.gauge && !s.gameHud); assert.equal(s.fog, 'low'); assert.equal(s.buttons, 'hide')
})

test('wind vents remain off by default and sanitize as an explicit opt-in', () => {
  assert.equal(defaultSettings().windVents, false)
  assert.equal(sanitizeSettings({ windVents: true }, { modes: ['solo-fall'], difficulties: ['chill'] }).windVents, true)
  assert.equal(sanitizeSettings({ windVents: 'yes' }, { modes: ['solo-fall'], difficulties: ['chill'] }).windVents, false)
})

test('falling sound keeps the classic default and accepts the dynamic preset', () => {
  assert.equal(defaultSettings().fallSound, 'classic')
  assert.equal(sanitizeSettings({ fallSound: 'dynamic' }, valid).fallSound, 'dynamic')
  assert.equal(sanitizeSettings({ fallSound: 'siren' }, valid).fallSound, 'classic')
})

test('the OS reduced-motion preference is only the default', () => {
  assert.equal(defaultSettings(true).reduceMotion, true)
  assert.equal(sanitizeSettings({ reduceMotion: false }, valid, true).reduceMotion, false)
  assert.equal(sanitizeSettings({}, valid, true).reduceMotion, true)
})

test('game length overrides map to the sim: auto leaves the mode alone, -1 means no limit', () => {
  assert.deepEqual(worldOverrides(defaultSettings()), { target: undefined, timeLimit: undefined })
  assert.deepEqual(worldOverrides({ ...defaultSettings(), target: 7, timeLimit: -1 }), { target: 7, timeLimit: 0 })
  assert.deepEqual(worldOverrides({ ...defaultSettings(), timeLimit: 120 }), { target: undefined, timeLimit: 120 })
  assert.equal(timeLabel(120), '2:00'); assert.equal(timeLabel(-1), 'No limit'); assert.equal(targetLabel(0), 'Mode default')
})

test('accent colour and plaque finish are sanitized', () => {
  const v = { modes: ['solo-fall'], difficulties: ['chill'] }
  assert.equal(sanitizeSettings({ uiAccent: '#FF00AA' }, v).uiAccent, '#ff00aa')
  assert.equal(sanitizeSettings({ uiAccent: 'red; background:url(x)' }, v).uiAccent, '')
  assert.equal(sanitizeSettings({ uiPlaque: 'brass' }, v).uiPlaque, 'brass')
  assert.equal(sanitizeSettings({ uiPlaque: 'lava' }, v).uiPlaque, 'auto')
})
