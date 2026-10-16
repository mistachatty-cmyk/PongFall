import test from 'node:test'
import assert from 'node:assert/strict'
import { UI_THEMES, resolveTheme, themeById, themeCss, themeUnlocked } from './uiThemes'

test('theme ids are unique, the default produces no override, others do', () => {
  assert.equal(new Set(UI_THEMES.map(t => t.id)).size, UI_THEMES.length)
  assert.equal(themeCss(themeById('default')), '')
  for (const t of UI_THEMES.filter(x => x.id !== 'default')) { const css = themeCss(t); assert.ok(css.includes(t.tokens.accent) && css.includes('!important'), t.id) }
})
test('earned themes unlock by falls and wins; a locked saved choice falls back to the default', () => {
  const neon = themeById('neon'), gold = themeById('gold')
  assert.equal(themeUnlocked(neon, { falls: 5, wins: 0 }), false); assert.equal(themeUnlocked(neon, { falls: 0, wins: 1 }), true)
  assert.equal(resolveTheme('gold', { falls: 9, wins: 0 }).id, 'default'); assert.equal(resolveTheme('gold', { falls: 10, wins: 0 }).id, gold.id)
  assert.equal(resolveTheme('nope', { falls: 99, wins: 99 }).id, 'default')
})
