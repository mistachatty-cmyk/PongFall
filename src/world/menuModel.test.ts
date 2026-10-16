import test from 'node:test'
import assert from 'node:assert/strict'
import { PROPS, isPortrait, propPos, easeView, focusOrder, hubView, launchView, lockBadge, modeOptions, optionsFor, propView, sanitizeChoice, stepFocus, viewArrived, visibleProps } from './menuModel'

const P = (falls: number) => ({ falls, menuUnlocked: falls > 0 })

test('a first visit is small: only the jukebox and the gear exist', () => {
  assert.deepEqual(visibleProps(P(0)).map(d => d.id), ['jukebox', 'gear'])
  assert.equal(visibleProps(P(1)).length, PROPS.length)
  assert.equal(visibleProps(P(0), true).length, PROPS.length)
})
test('prop ids and slots are unique and stay inside the shaft', () => {
  assert.equal(new Set(PROPS.map(p => p.id)).size, PROPS.length)
  assert.equal(new Set(PROPS.map(p => `${p.x},${p.y}`)).size, PROPS.length)
  for (const p of PROPS) assert.ok(Math.abs(p.x) < 1000 && p.size >= 90 && p.size <= 190, p.id)
})
test('options come from progress with lock text; a locked option never survives sanitizing', () => {
  const m = modeOptions(P(0)); assert.deepEqual(m.map(o => o.v), ['solo-fall']); assert.equal(m[0]!.lock, '')
  const after2 = optionsFor('mode', P(2)); assert.ok(after2.some(o => o.v === 'classic' && o.lock === '')); assert.ok(optionsFor('mode', P(1)).some(o => o.v === 'classic' && o.lock !== ''))
  assert.ok(optionsFor('difficulty', P(1)).some(o => o.lock !== ''))
  const c = sanitizeChoice({ mode: 'sandbox', difficulty: 'relentless', arenas: 5, flux: true }, P(1))
  assert.equal(c.mode, 'solo-fall'); assert.equal(c.difficulty, 'chill'); assert.equal(c.arenas, 0); assert.equal(c.flux, true)
  assert.ok(!optionsFor('mode', P(1)).find(o => o.v === c.mode)!.lock)
  assert.equal(sanitizeChoice({}, P(0)).arenas, 3)
  assert.equal(sanitizeChoice({ flux: true }, P(0)).flux, false)
  assert.equal(lockBadge('Opens after 3 more falls'), 'after 3 falls')
})
test('the hub camera frames the whole shaft, a prop view fills about a third of the screen, the launch view pushes in', () => {
  const hub = hubView(1280, 800), prop = propView(PROPS[0]!, 1280, 800), go = launchView(1280, 800)
  assert.ok(hub.zoom < prop.zoom && prop.zoom < go.zoom * 4)
  for (const pr of PROPS) assert.ok(Math.abs(pr.x) * hub.zoom + pr.size * hub.zoom / 2 <= 1280 / 2 && Math.abs(pr.y) * hub.zoom + pr.size * hub.zoom / 2 <= 800 / 2, pr.id)   // every object is in view
  assert.ok(go.zoom * 640 > 1280 * .7)              // the arena fills the screen on launch
})
test('easing converges on the target and reports arrival', () => {
  let v = hubView(1200, 800); const to = propView(PROPS[1]!, 1200, 800)
  for (let i = 0; i < 240; i++) v = easeView(v, to, 1 / 60)
  assert.ok(viewArrived(v, to)); assert.ok(!viewArrived(hubView(1200, 800), to))
})
test('keyboard order walks signs, ball and visible props, and wraps', () => {
  const order = focusOrder(P(0)); assert.deepEqual(order, ['sign:mode', 'sign:difficulty', 'sign:arenas', 'ball', 'prop:jukebox', 'prop:gear'])
  assert.equal(stepFocus(order, null, 1), 'sign:mode'); assert.equal(stepFocus(order, null, -1), 'prop:gear')
  assert.equal(stepFocus(order, 'prop:gear', 1), 'sign:mode'); assert.equal(stepFocus(order, 'sign:mode', -1), 'prop:gear')
})

test('on a phone-shaped screen every object still fits, stacked above and below the arena', () => {
  assert.equal(isPortrait(390, 800), true); assert.equal(isPortrait(1280, 800), false)
  const hub = hubView(390, 800)
  const seen = new Set<string>()
  for (const pr of PROPS) { const q = propPos(pr, true); seen.add(`${q.x},${q.y}`); assert.ok(Math.abs(q.x - hub.panX) * hub.zoom + pr.size * hub.zoom / 2 <= 390 / 2 + 1 && Math.abs(q.y - hub.panY) * hub.zoom + pr.size * hub.zoom / 2 <= 800 / 2 + 1, pr.id) }
  assert.equal(seen.size, PROPS.length)
})
