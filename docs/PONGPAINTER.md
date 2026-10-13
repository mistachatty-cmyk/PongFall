# PongPainter and the LOK Shop

PongPainter unlocks after the first completed fall. It is the PongFall presentation of the LOK Shop: a shared wallet strip, supporter bar, catalog and account inventory arranged in a game-themed shop screen. Purchases belong to the LOK account. The equipped paint is saved to the PongFall profile and applied to rendering only, so it cannot change physics, replay results or match balance. Match results continue to grant no LokTokens.

## Current customization modules

The catalog is defined in `src/core/pongPainter.ts`. Each product has a stable category, ID, description, rarity, paint value and suggested seed price. Categories are themes, eyes, paddles and pinball arms, glass, arenas, balls, and tears. Rendering consumes `PainterColors` in `src/render/draw.ts`; simulation code does not read the catalog. Add new visual slots by extending the category type, product catalog, selection validator, color resolver, and renderer. Add new products within an existing slot without changing simulation version.

The shop reads the shared `lok_profile`, `lok_catalog`, and `lok_inventory` data using the signed-in LOK account. It purchases through the `lok-spend` Edge Function; no browser-provided price or balance is trusted. The account inventory remains the ownership source. If an item has not been registered in the shared catalog, it stays visibly pending and cannot be bought.

## Registering the catalog

Run `pnpm export:pongpainter` to generate `supabase/registry/pongfall-pongpainter-catalog.sql`. Review the names and prices, then have the LOK catalog owner apply it to the shared catalog in staging and verify wallet, ownership, duplicate purchase and insufficient-balance behavior before production. The upsert intentionally preserves an existing price so a code deploy cannot silently reprice an item.

The project manifest (`lok.universe.json`) declares the shared `supporterBar` and `walletStrip` placements. PongFall implements the storefront layout locally using the same account and catalog contracts. To make the exact shop UI a guaranteed component in every LOK-enabled game, the shared LOK shell should expose reusable `LokShopScreen`, `LokWalletStrip`, and `LokSupporterBar` components and each game should mount that screen through its app manifest. This repository can consume that package once it is published; it does not vendor a second copy of the shared UI.

## Expansion map

- **Themes:** add palette/filter recipes and preview them in the theme tab.
- **Eyes:** add iris, lid, pupil and blink style slots.
- **Paddles:** add face color, arm material and power-hit accent slots.
- **Glass:** add pane tint, crack highlight and shatter particle recipes.
- **Arenas:** add frame, ceiling, clamp and floor trim slots.
- **Balls:** add core, trail and impact glow slots.
- **Tears:** add droplet, halo and collection burst slots.

All additions should remain render-only by default. If a future customization changes collision, speed, visibility or scoring, it needs a separate experimental flag, replay versioning, and explicit online-room compatibility review before the shop can sell it.
