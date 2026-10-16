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

import { paletteFor } from '../world/palette'
test('every theme carries a world look that makes a full palette, and an accent override recolours the page', () => {
  for (const t of UI_THEMES) {
    const p = paletteFor(t.look)
    assert.equal(p.plaque.finish, t.look.plaque, t.id); assert.match(p.accent, /^#[0-9a-f]{6}$/i, t.id)
  }
  assert.ok(UI_THEMES.length >= 11)
  assert.ok(themeCss(themeById('default'), '#ff00aa').includes('#ff00aa'))
  assert.ok(themeCss(themeById('neon'), '#00ff88').includes('#00ff88'))
  assert.equal(themeCss(themeById('default'), 'nope'), '')
})
