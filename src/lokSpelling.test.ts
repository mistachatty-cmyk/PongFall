import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// House style: player-facing words with "lock" are spelled with "lok" (Unlok, Lokked, Lok). Identifiers and stored values keep their names.
// This guards the phrases that were converted; add a phrase here when you write new copy.
const walk = (d: string): string[] => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = walk('src').filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('changelog.ts'))
const OLD = [/UNLOCKED/, /Unlocks in/, /Unlock ·/, /to unlock\b/, /Locked\. Multiplayer/, /not unlocked yet/, /unlock everything/, /NO UNLOCK/, /UNLOCKS AFTER/, /FIRST FALL TO UNLOCK/, /iris unlock/, /re-locks/]

test('player-facing copy spells lock words with "lok"', () => {
  const bad: string[] = []
  for (const f of files) { const s = readFileSync(f, 'utf8'); for (const re of OLD) if (re.test(s)) bad.push(`${f}: ${re}`) }
  assert.deepEqual(bad, [])
})
