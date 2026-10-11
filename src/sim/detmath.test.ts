import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { sin, cos, hypot } from './detmath'
const __dirname = new URL('.', import.meta.url).pathname

test('detmath is close to native', () => {
  for (let x = -50; x < 50; x += 0.37) {
    assert.ok(Math.abs(sin(x) - Math.sin(x)) < 1e-6, `sin ${x}`)
    assert.ok(Math.abs(cos(x) - Math.cos(x)) < 1e-6, `cos ${x}`)
  }
  assert.equal(hypot(3, 4), 5)
})

test('sim sources avoid engine-dependent Math functions', () => {
  const bad = /Math\.(sin|cos|tan|atan2|atan|asin|acos|exp|pow|hypot|log|cbrt)\(/
  for (const f of readdirSync(__dirname, { recursive: true }) as string[]) {
    if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue
    const src = readFileSync(`${__dirname}/${f}`, 'utf8')
    for (const line of src.split('\n')) {
      if (line.trim().startsWith('//')) continue
      assert.ok(!bad.test(line), `${f}: ${line.trim()}`)
    }
  }
})
