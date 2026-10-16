import test from 'node:test'
import assert from 'node:assert/strict'
import { skinCss } from './pageSkin'
import { paletteFor } from '../world/palette'
import { UI_THEMES } from './uiThemes'

test('the page skin is a complete stylesheet for every theme and plaque finish, with no broken values', () => {
  for (const t of UI_THEMES) for (const plaque of ['steel', 'brass', 'glass', 'paper'] as const) {
    const css = skinCss(paletteFor({ ...t.look, plaque }))
    assert.ok(css.length > 1500 && css.includes('input[type=checkbox]') && css.includes(':active'), t.id)
    assert.ok(!/NaN|undefined/.test(css), `${t.id}/${plaque}`)
    assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length, `${t.id}/${plaque} braces`)
  }
})
test('the skin only adds depth: it never sets text or background colours (themes own those)', () => {
  const css = skinCss(paletteFor())
  assert.ok(!/[;{]\s*color\s*:/.test(css) && !/background-color\s*:/.test(css) && !/[;{]background\s*:\s*#/.test(css.replace(/input\[type=checkbox\][^}]*\}/g, '')))
})
