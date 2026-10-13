// Generates seed rows for the shared LOK catalog; prices remain server authoritative.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { PONG_PAINTER_PRODUCTS, painterSku } from '../src/core/pongPainter'

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const rows = PONG_PAINTER_PRODUCTS.map(product => {
  const payload = JSON.stringify({ schema: 'lok.catalog-item', schemaVersion: 1, game: 'pongfall', customization: { category: product.category, id: product.id, value: product.value } })
  const itemType = product.category === 'theme' ? 'theme' : 'cosmetic'
  return `  ((select id from public.lok_tenants limit 1), ${quote(painterSku(product))}, array['pongfall']::text[], ${quote(itemType)}::lok_item_type, ${quote(product.name)}, ${quote(product.description)}, ${product.price}, ${quote(product.rarity)}, ${quote(payload)}::jsonb, null, true)`
})

export function buildCatalogSql() { return `-- PongFall PongPainter items for the shared LOK catalog.
-- Review prices and apply through the LOK catalog owner after staging validation.
-- The browser never writes price or ownership; lok-spend enforces both server-side.
insert into public.lok_catalog (tenant_id, sku, app_scope, item_type, name, description, price, rarity, payload, requires_rank, active)
values
${rows.join(',\n')}
on conflict (tenant_id, sku) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  payload = excluded.payload;
` }
const output = process.argv[2] ?? 'supabase/registry/pongfall-pongpainter-catalog.sql'
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, buildCatalogSql())
console.log('wrote', output)
