import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCatalogSql } from '../../scripts/export-pongpainter-catalog'

test('catalog export seeds only PongFall items and preserves registered prices on updates', () => {
  const sql = buildCatalogSql()
  assert.match(sql, /array\['pongfall'\]::text\[\]/)
  assert.match(sql, /on conflict \(tenant_id, sku\) do update set/)
  assert.doesNotMatch(sql, /price = excluded\.price/)
  assert.match(sql, /pongfall\.theme\.deep-teal/)
  assert.match(sql, /pongfall\.tear\.violet-tear/)
})
