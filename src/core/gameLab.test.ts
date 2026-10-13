import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeExperiments, defaultGameLabState, experimentsForMatch, GAME_LAB_KEY, loadGameLabState, PLANNED_EXPERIMENTS, sanitizeGameLabState, saveGameLabState } from './gameLab'

test('Game Lab experiments start at the unchanged baseline', () => {
  const state = defaultGameLabState()
  assert.deepEqual(activeExperiments(state), [])
  assert.equal(state.review['shaft-signals']!.scope, 'whole-game')
})

test('Game Lab state sanitizes unknown entries and keeps review notes local in its own key', () => {
  const state = sanitizeGameLabState({ enabled: { 'echo-rallies': true, surprise: true }, review: { 'echo-rallies': { notes: 'promote?', transfer: true, scope: 'selected-modes', modes: ['solo-fall', 'unknown'], policy: 'always-on', tested: true } } })
  assert.deepEqual(activeExperiments(state), ['echo-rallies'])
  assert.deepEqual(state.review['echo-rallies']!.modes, ['solo-fall'])
  const saved = new Map<string, string>()
  assert.equal(saveGameLabState(state, { setItem: (key, value) => saved.set(key, value) }), true)
  assert.equal(saved.has(GAME_LAB_KEY), true)
  assert.deepEqual(loadGameLabState({ getItem: key => saved.get(key) ?? null }), state)
})

test('replay-covered paddle wake is switchable and no longer listed as planned', () => {
  const state = defaultGameLabState()
  state.enabled['paddle-wake-physics'] = true
  assert.ok(activeExperiments(state).includes('paddle-wake-physics'))
  assert.deepEqual(PLANNED_EXPERIMENTS, [])
})

test('online matches allow tested visual experiments but always keep baseline physics', () => {
  const state = defaultGameLabState()
  state.enabled['shaft-signals'] = true
  state.review['shaft-signals']!.tested = true
  state.enabled['paddle-wake-physics'] = true
  state.review['paddle-wake-physics']!.tested = true
  assert.deepEqual(experimentsForMatch(state, true), ['shaft-signals'])
  assert.deepEqual(experimentsForMatch(state), ['shaft-signals', 'paddle-wake-physics'])
})
