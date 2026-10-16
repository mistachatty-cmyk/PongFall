-- PongFall LilEye lokpet cards for the shared LOK dex.
-- Price 0: personalities are earned in play (see payload.lokpet.unlock), not bought. Review before applying.
insert into public.lok_catalog (tenant_id, sku, app_scope, item_type, name, description, price, rarity, payload, requires_rank, active)
values
  ((select id from public.lok_tenants limit 1), 'pongfall.lokpet.lil-eye-curious', array['pongfall']::text[], 'cosmetic'::lok_item_type, 'LilEye · Curious', 'Watches everything. Asks too many questions.', 0, 'common', '{"schema":"lok.catalog-item","schemaVersion":1,"game":"pongfall","lokpet":{"species":"pongfall-lil-eye","personality":"curious","unlock":{"note":"Always with you"}}}'::jsonb, null, true),
  ((select id from public.lok_tenants limit 1), 'pongfall.lokpet.lil-eye-sleepy', array['pongfall']::text[], 'cosmetic'::lok_item_type, 'LilEye · Sleepy', 'Dozes through the fall. Wakes for the big moments.', 0, 'uncommon', '{"schema":"lok.catalog-item","schemaVersion":1,"game":"pongfall","lokpet":{"species":"pongfall-lil-eye","personality":"sleepy","unlock":{"falls":3,"note":"Finish 3 falls"}}}'::jsonb, null, true),
  ((select id from public.lok_tenants limit 1), 'pongfall.lokpet.lil-eye-cheeky', array['pongfall']::text[], 'cosmetic'::lok_item_type, 'LilEye · Cheeky', 'Loud opinions. Always on your side. Mostly.', 0, 'uncommon', '{"schema":"lok.catalog-item","schemaVersion":1,"game":"pongfall","lokpet":{"species":"pongfall-lil-eye","personality":"cheeky","unlock":{"wins":1,"note":"Win a match"}}}'::jsonb, null, true)
on conflict (tenant_id, sku) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  payload = excluded.payload;
