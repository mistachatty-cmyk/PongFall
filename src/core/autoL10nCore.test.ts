import test from 'node:test'
import assert from 'node:assert/strict'
import { cyrb53, isTranslatable, normalize, restore, translateText } from './autoL10nCore'

test('keys are stable and ignore whitespace and numbers', () => {
  assert.equal(cyrb53('abc'), cyrb53('abc'))
  assert.equal(normalize('  Score to win: 14 ')!.key, normalize('Score  to win:\n 21')!.key)
  assert.equal(normalize('Score to win: 14')!.source, 'Score to win: {{n0}}')
  assert.deepEqual(normalize('3 tears in 12.5 seconds')!.nums, ['3', '12.5'])
})

test('numbers come back in place, and a broken translation is refused', () => {
  assert.equal(restore('Puntos para ganar: {{n0}}', ['14']), 'Puntos para ganar: 14')
  assert.equal(restore('Puntos para ganar', ['14']), null)
  assert.equal(restore('Puntos {{n0}} {{n3}}', ['14']), null)
  assert.equal(restore('{{ n1 }} y {{n0}}', ['1', '2']), '2 y 1')
})

test('names, codes, numbers, links and identifiers are never translated', () => {
  for (const s of ['', '12', '0:42', '$5', 'PF-AB12', 'https://gsix.online', 'v0.41.0', 'main.ts', 'some_id', 'camelCaseThing', '👁', 'x']) assert.equal(isTranslatable(s), false, s)
  for (const s of ['Play', 'Solo Fall', 'GLASS 3', 'Click the ball to fall']) assert.equal(isTranslatable(s), true, s)
})

test('translateText uses the catalogue, keeps whitespace, and falls back to English', () => {
  const n = normalize('GLASS 3')!
  const dict = { [n.key]: 'VIDRIO {{n0}}' }
  assert.equal(translateText('GLASS 3', dict), 'VIDRIO 3')
  assert.equal(translateText('GLASS 7', dict), 'VIDRIO 7')
  assert.equal(translateText('  GLASS 4\n', dict), '  VIDRIO 4\n')
  assert.equal(translateText('Alice_99', dict), 'Alice_99')
  assert.equal(translateText('Unknown sentence here', dict), 'Unknown sentence here')
  assert.equal(translateText('   ', dict), '   ')
})

import { translationHint } from './autoL10nCore'
test('the noun "fall" is sent to translators as "descent"; verbs and names are left alone', () => {
  assert.equal(translationHint('Begin your first fall'), 'Begin your first descent')
  assert.equal(translationHint('Finish {{n0}} falls'), 'Finish {{n0}} descents')
  assert.equal(translationHint('The faster the fall, the louder the wind.'), 'The faster the descent, the louder the wind.')
  assert.equal(translationHint('FALLS'), 'DESCENTS')
  assert.equal(translationHint('Falls: {{n0}}'), 'Descents: {{n0}}')
  assert.equal(translationHint('Solo Fall'), 'Solo Fall')
  assert.equal(translationHint('The ball falls past your paddle'), 'The ball falls past your paddle')
  assert.equal(translationHint('Your arena keeps falling'), 'Your arena keeps falling')
})

test('shouted English stays shouted after translation, and short ambiguous words get a hint', () => {
  const n = normalize('MODE')!, dict = { [n.key]: 'Spielmodus' }
  assert.equal(translateText('MODE', dict), 'SPIELMODUS')
  const m = normalize('Mode')!; assert.equal(translateText('Mode', { [m.key]: 'Spielmodus' }), 'Spielmodus')
  assert.equal(translationHint('MODE'), 'Game mode'); assert.equal(translationHint('Mode'), 'Game mode'); assert.equal(translationHint('Mode select'), 'Mode select')
})
