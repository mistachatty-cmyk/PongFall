// Writes public/lok-updates.json (read live by gsix.online/games/pongfall). Run: pnpm exec tsx scripts/export-public-updates.ts public/lok-updates.json
import { writeFileSync } from 'node:fs'
import { CHANGELOG } from '../src/changelog'

export function buildUpdates() {
  return {
    schema: 'lok.public-updates',
    schemaVersion: 1,
    appKey: 'pongfall',
    label: 'PongFall',
    studio: 'Kinetic Souls',
    updates: [...CHANGELOG].reverse().map((e, i, all) => ({ number: all.length - i, version: e.version, kind: 'update', title: e.title, body: e.notes })),
  }
}

if (process.argv[1] && process.argv[1].endsWith('export-public-updates.ts')) {
  const out = process.argv[2] ?? 'public/lok-updates.json'
  writeFileSync(out, JSON.stringify(buildUpdates(), null, 2) + '\n')
  console.log('wrote', out)
}
