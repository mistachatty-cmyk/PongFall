# PongPainter and the LOK Shop

PongPainter unlocks after the first completed fall. It follows the Survivor 616 LokShop order: back navigation, live public supporter ticker, LOK wallet strip, LokServer host and topic controls, then browsable item tabs and catalog cards. The supporter feed uses the public `lok_supporter_feed` RPC, is cached for ten minutes, and is sanitized to public display name, tier, and founder status. Purchases belong to the LOK account. The equipped paint saves locally and syncs through the PongFall profile when account saves are enabled. Paint is applied to rendering only, so it cannot change physics, replay results or match balance. Match results continue to grant no LokTokens.

## Current customization modules

The catalog is defined in `src/core/pongPainter.ts`. Each product has a stable category, ID, description, rarity, paint value and suggested seed price. Categories are themes, eyes, paddles and pinball arms, glass, arenas, balls, and tears. Rendering consumes `PainterColors` in `src/render/draw.ts`; simulation code does not read the catalog. Add new visual slots by extending the category type, product catalog, selection validator, color resolver, and renderer. Add new products within an existing slot without changing simulation version.

The shop reads the shared `lok_profile`, `lok_catalog`, and `lok_inventory` data using the signed-in LOK account. It purchases through the `lok-spend` Edge Function; no browser-provided price or balance is trusted. The account inventory remains the ownership source. If an item has not been registered in the shared catalog, it stays visibly pending and cannot be bought.

## Registering the catalog

Run `pnpm export:pongpainter` to generate `supabase/registry/pongfall-pongpainter-catalog.sql`. Review the names and prices, then have the LOK catalog owner apply it to the shared catalog in staging and verify wallet, ownership, duplicate purchase and insufficient-balance behavior before production. The upsert intentionally preserves an existing price so a code deploy cannot silently reprice an item.

The project manifest (`lok.universe.json`) declares the shared `supporterBar`, `walletStrip`, and `storefront` placements. The ecosystem's `lok-shop-frame` web component owns the standard shop order and responsive frame; PongFall supplies its LokServer copy, product cards, account display, and trusted purchase callback. Its source lives at `LokToken EcoSystem/embed/lok-shop-frame.js` and is vendored here as `public/lok-shop-frame.js`. The shared frame performs no network or token operations.

## Expansion map

- **Themes:** add palette/filter recipes and preview them in the theme tab.
- **Eyes:** add iris, lid, pupil and blink style slots.
- **Paddles:** add face color, arm material and power-hit accent slots.
- **Glass:** add pane tint, crack highlight and shatter particle recipes.
- **Arenas:** add frame, ceiling, clamp and floor trim slots.
- **Balls:** add core, trail and impact glow slots.
- **Tears:** add droplet, halo and collection burst slots.

All additions should remain render-only by default. If a future customization changes collision, speed, visibility or scoring, it needs a separate experimental flag, replay versioning, and explicit online-room compatibility review before the shop can sell it.
