import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { normalize, restore } from './autoL10nCore'

const dir = new URL('../../public/locales/auto/', import.meta.url)
const read = (code: string) => JSON.parse(readFileSync(new URL(`${code}.json`, dir), 'utf8')) as Record<string, string>
const real = (o: Record<string, string>) => Object.entries(o).filter(([k]) => !k.startsWith('_'))
const cfg = JSON.parse(readFileSync(new URL('../../l10n.auto.config.json', import.meta.url), 'utf8')) as { targets: string[] }
const nums = (s: string) => Array.from(s.matchAll(/\{\{n(\d+)\}\}/g), m => m[1]!).sort().join(',')

test('the English catalogue is well formed: hashed keys, only {{nN}} placeholders, no empty text', () => {
  const en = read('en')
  assert.ok(real(en).length > 500, 'the catalogue is built by scripts/scan-strings.ts and scripts/crawl-strings.ts')
  for (const [k, v] of real(en)) {
    assert.match(k, /^s[0-9a-z]+$/, k)
    assert.ok(v.trim().length > 1, k)
    assert.ok(!/\{[^{]|[^}]\}/.test(v.replace(/\{\{n\d+\}\}/g, '')), `${k} has a stray brace: ${v}`)
  }
})

test('nothing that must stay as it is (names, codes, links) is in the catalogue', () => {
  for (const [, v] of real(read('en'))) assert.ok(normalize(v.replace(/\{\{n\d+\}\}/g, '1')) !== null, v)
})

test('every translation keeps its numbers, and no language has keys the source does not', () => {
  const en = read('en')
  for (const code of cfg.targets) {
    if (!existsSync(new URL(`${code}.json`, dir))) continue
    const tr = read(code)
    for (const [k, v] of real(tr)) {
      assert.ok(k in en, `${code}: unknown key ${k}`)
      assert.equal(nums(v), nums(en[k]!), `${code} ${k}: numbers changed in "${v}"`)
      assert.notEqual(restore(v, Array.from(nums(en[k]!) ? nums(en[k]!).split(',') : [], i => `<${i}>`)), null, `${code} ${k}`)
    }
  }
})

test('translations cover the catalogue (the workflow fills gaps; a few new strings may wait for its next run)', () => {
  const en = real(read('en')).length
  for (const code of cfg.targets) {
    if (!existsSync(new URL(`${code}.json`, dir))) continue
    const have = real(read(code)).length
    if (have < 100) continue                                // not started yet: the workflow writes it, English shows meanwhile
    assert.ok(have / en >= 0.9, `${code}: ${have} of ${en} strings translated`)
  }
})
