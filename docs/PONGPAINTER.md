# PongPainter and the LOK Shop

The live shop arena and the presentation rules for future shops and notable pages are documented in [FALLING_SHOPS.md](FALLING_SHOPS.md). PongPainter's preview now runs the actual PongFall renderer and simulation, with personal arena and full shaft views. Hover/focus temporarily changes the rendered look; purchasing and equipping remain explicit actions.

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


## Full loadout page (22 slots)

PongPainter opens after the first completed fall. The page has seven sections and a full-look preview. Hover or keyboard-focus a card to try it without spending or equipping. Every slot has Original and one free Common alternative. Three local look slots save and reload complete loadouts; a saved look only equips items still owned when loaded.

| Section | Slots |
|---|---|
| Themes | Palette, Filter |
| Eyes | Iris, Lid, Pupil, Blink |
| Paddles | Face, Arm, Power accent |
| Glass | Pane, Crack, Shatter |
| Arenas | Frame, Ceiling, Clamp, Floor |
| Balls | Core, Trail, Impact |
| Tears | Droplet, Halo, Collection burst |

Selections are render-only. Ball outline and radius, paddle silhouette and hitbox, bright active cracks, and collectible tears remain readable. Reduced motion uses static color treatments. The v1 broad category selection is accepted and mapped into its primary v2 slot (theme→filter, eye→iris, eyeType→pupil, paddle→face, glass→pane, arena→frame, ball→core, tear→droplet). Paid SKUs remain unchanged. Previously owned tear irises remain device-local; the other equipped slots can sync with the account. LokToken prices and ownership come from the live account catalog, and unregistered products stay unavailable. The 70 concepts below are design backlog only and are not registered for purchase.

## Future expansion catalog

Rarity: C Common, U Uncommon, R Rare, E Epic, L Legendary. Ten new concepts per category; the first two in each row have production direction below.

| Category | Concepts and rarity |
|---|---|
| Themes | Glass Cathedral (L); Signal Storm (E); Midnight Relay (R); Copper Haze (U); Deep Static (R); Violet Eclipse (E); Frostline (U); Rusted Dawn (R); Prism Current (E); Ashfall (C) |
| Eyes | Lacuna Lid (L); Split Star (E); Catacomb Iris (R); Clockwork Blink (E); Needle Pupil (U); Double Halo (R); Moss Veil (U); Crosshair Gaze (R); Glass Tear Duct (E); Hollow Moon (L) |
| Paddles | Railcaster (E); Porcelain Fang (L); Carbon Vane (R); Neon Seam (U); Copper Grip (U); Twin Spark (R); White Noise (R); Ember Arm (E); Frost Tip (R); Slate Standard (C) |
| Glass | Memory Veins (R); Aurora Shatter (E); Honeycomb Pane (R); Smoked Edge (U); Prism Crack (E); Sea Salt Glass (U); Redline Fracture (R); Sooted Pane (C); Opal Splinters (L); Static Frost (E) |
| Arenas | Foundry Scaffold (E); Observatory Cage (L); Blue Rail (U); Bone White Clamp (R); Garden Grate (E); Deep-Sea Truss (R); Bronzewire Floor (U); Blackbox Frame (R); Neon Spine (E); Plain Steel (C) |
| Balls | Comet Lattice (E); Heart of Furnace (L); Frost Marble (R); Ink Pearl (U); Signal Node (R); Rose Quartz (R); Zero Star (E); Copper Orb (U); Glass Seed (R); Blue Pin (C) |
| Tears | Mercury Weep (R); Sunseed Drops (E); Ghost Dew (U); Copper Rain (R); Static Bead (R); Violet Nectar (E); Frost Droplet (U); Crimson Halo (R); Starfall Burst (L); Clear Current (C) |

### Priority production specifications

- **Glass Cathedral (L):** midnight-blue shaft walls, narrow ivory light shafts, pale-gold structural highlights. Keep arena and ball contrast fixed.
- **Signal Storm (E):** short cyan pulses on distant wall rails at a slow cadence; reduced motion keeps the rails lit and static.
- **Lacuna Lid (L):** layered charcoal shutters on wall and menu eyes, thin amber seam, full closure on blink.
- **Split Star (E):** five-point dark pupil in a cobalt iris, points rotating slightly with gaze without changing tracking range.
- **Railcaster (E):** brushed graphite paddle face, cyan edge and matching pinball arm. Flash only the edge on contact.
- **Porcelain Fang (L):** ivory face, hairline red seams, restrained crimson power accent. Preserve hitbox and silhouette.
- **Memory Veins (R):** faint blue-gray decorative traces behind earlier impact sites; current damage stays brighter.
- **Aurora Shatter (E):** green-violet intact rim and brief colored shard glint; static tint for reduced motion.
- **Foundry Scaffold (E):** amber rivets on frame, ceiling and clamps, clear of the playfield.
- **Observatory Cage (L):** dark indigo frame with sparse star-point trim outside ball travel.
- **Comet Lattice (E):** white core, short dotted cyan trail strictly behind the direction of travel; standard collision radius.
- **Heart of Furnace (L):** orange inner core and brief impact pulse; standard ball outline and radius.
- **Mercury Weep (R):** silver droplet, crisp highlight and quiet blue collection halo.
- **Sunseed Drops (E):** gold droplet and small radial collection burst; no burst under reduced motion.
