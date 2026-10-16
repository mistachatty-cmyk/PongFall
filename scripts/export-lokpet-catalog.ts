// Generates the LOK dex rows for Lil Eye (one lokpet card per personality) for the shared catalog.
// The browser never writes ownership: the owner applies this SQL after review, like the PongPainter catalog.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { PERSONALITIES, LOKPET_SPECIES, lokpetSku } from '../src/core/lilEye'

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const rows = PERSONALITIES.map(p => {
  const payload = JSON.stringify({ schema: 'lok.catalog-item', schemaVersion: 1, game: 'pongfall', lokpet: { species: LOKPET_SPECIES, personality: p.id, unlock: p.unlock } })
  return `  ((select id from public.lok_tenants limit 1), ${quote(lokpetSku(p))}, array['pongfall']::text[], 'cosmetic'::lok_item_type, ${quote('Lil Eye · ' + p.name)}, ${quote(p.blurb)}, 0, ${quote(p.id === 'curious' ? 'common' : 'uncommon')}, ${quote(payload)}::jsonb, null, true)`
})

export function buildLokpetSql() { return `-- PongFall Lil Eye lokpet cards for the shared LOK dex.
-- Price 0: personalities are earned in play (see payload.lokpet.unlock), not bought. Review before applying.
insert into public.lok_catalog (tenant_id, sku, app_scope, item_type, name, description, price, rarity, payload, requires_rank, active)
values
${rows.join(',\n')}
on conflict (tenant_id, sku) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  payload = excluded.payload;
` }
const output = process.argv[2] ?? 'supabase/registry/pongfall-lokpet-catalog.sql'
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, buildLokpetSql())
console.log('wrote', output)
