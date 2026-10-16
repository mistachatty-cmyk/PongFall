import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LANGUAGES, l10n, t } from './i18n'

const en = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8')) as Record<string, string>

test('every English string is non-empty, and placeholders use {{name}}', () => {
  for (const [k, v] of Object.entries(en)) { if (k.startsWith('_')) continue; assert.ok(typeof v === 'string' && v.trim().length > 0, k); assert.ok(!/\{[^{]|[^}]\}/.test(v.replace(/\{\{[a-zA-Z_]+\}\}/g, '')), `${k} has a stray brace`) }
})
test('t() reads English, and an unknown key shows the key rather than nothing', () => {
  assert.equal(t('menu.play'), 'PLAY')
  assert.equal(l10n.t('no.such.key' as never), 'no.such.key')
})
test('an unknown language leaves English on; a shipped language loads and can be switched back', async () => {
  assert.equal(await l10n.setLocale('xx'), 'en')
  assert.equal(await l10n.setLocale('es'), 'es'); assert.notEqual(t('menu.play'), 'PLAY')
  assert.equal(await l10n.setLocale('en'), 'en'); assert.equal(t('menu.play'), 'PLAY')
})

test('the language list matches the config targets, with English first', () => {
  const cfg = JSON.parse(readFileSync(new URL('../../l10n.config.json', import.meta.url), 'utf8')) as { source: string; targets: string[] }
  assert.deepEqual(LANGUAGES.map(l => l.code), [cfg.source, ...cfg.targets])
})
test('player copy in en.json uses the house spelling for lock words', () => {
  for (const [k, v] of Object.entries(en)) assert.ok(!/unlock|locked|\bsignal\b/i.test(v), `${k}: ${v}`)
})
