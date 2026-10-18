# LokPacks, Customization Tokens and the Loksleeve

Added in 0.47.0. After a finished match the player earns a **LokPack**. It holds customization looks, **Customization Tokens (CT)** and sometimes a bonus pack. It is a small local system that PongFall owns completely, so nothing here needs a card system, a server or a connection to 616 Survivor or the LOK ecosystem. When those exist they can plug in (see "Bridge").

**LokTokens are not part of packs.** PongFall matches stay unranked and token-free (CLAUDE.md). Packs contain looks and CT only.

## Where the code is
| File | What |
|---|---|
| `src/core/packItems.ts` | Rarities and every pack-only item as data (PongPainter looks, themes, LilEye cosmetics, Loksleeve items). Add an item = add a row. |
| `src/core/lokPack.ts` | Pure rules and the local save (`pongfall.lokpacks.v1`): award, seeded roll, pity, duplicates, crafting, ledger. Tested in `lokPack.test.ts`. |
| `src/core/lokPackView.ts` | The page: open a pack (canvas reveal), Collection, Loksleeve tab. |
| `src/core/packSleeve.ts`, `packSleeveArt.ts` | The Loksleeve (pack wrap, card back, card frame), selection store `pongfall.sleeve.v1` and procedural art. |
| `src/core/lokPackArt.ts` | Small pictures of items for cards and the collection, reusing the real renderers. |
| `src/world/ambient.ts` | Animated theme backdrops (embers, aurora, snow, stars). |
| `src/core/createPongFall.ts` | Awards one pack per finished match (not replays) and opens the page from the end screen. |

## Rules
- **Which pack:** lost or drawn = Fall Pack (3 cards); won = Win Pack (4); won overtime = Cost Pack (5). Sandbox, Game Lab (`experimental`) and matches under 20 s earn none. At most 40 unopened packs are kept.
- **Rarities:** common, uncommon, rare, epic, legendary. Odds per pack kind are in `PACK_KINDS`. The last card of a pack is at least uncommon. Pity: an epic or better is guaranteed within 12 packs, a legendary within 50.
- **Cards:** an item, CT (5 / 12 / 30 / 75 / 180 by rarity) or, rarely, a bonus pack. A duplicate item turns into CT (3 / 8 / 20 / 50 / 120).
- **Crafting:** any item you are missing can be bought with CT (25 / 60 / 140 / 350 / 900), so a collection can always be completed.
- **Deterministic and idempotent:** a pack stores its own seed, so reloading never re-rolls it. An award is recorded per match id, so a match cannot pay twice.
- **Render-only.** Nothing here touches the simulation, `SIM_VERSION` or replays. Animated looks draw from the wall clock in the renderer; Reduce Motion freezes them.

## Where owned items show up
- **PongPainter:** pack looks appear in their slot with their rarity (`PAINTER_PACK_ITEMS` in `pongPainter.ts`) and count as owned when they are in the collection (`packOwns`).
- **Themes:** the four pack themes in `uiThemes.ts` (`pack: { rarity, animated }`) unlock through the collection and carry an `anim` backdrop.
- **LilEye:** `hat` and `aura` fields on the LilEye save hold item ids; sanitizing drops ones you do not own.

## The Loksleeve
Modelled on 616 Survivor's Neon Sleeve (`artifacts/survivor-616/src/game/data/cardCosmetics.ts` in the Loksurvivor repo): three kinds of container look, one equipped per kind: **pack wrap**, **card back**, **card frame**. In PongFall these are data rows in `SLEEVE_ITEMS`, found in packs. "Switch out the items inside" means equipping another id; the art is drawn from a `SleeveSpec` (two colours, a glow, a pattern name, a mark), so a new wrap, back or frame is one row plus, for a new pattern, a case in `packSleeveArt.ts`.

616's tiers map to rarities: standard = common, uncommon = uncommon, rare = rare, legendary = legendary, animated ("Live") = epic. The 616 wrap and back ids differ (`pack-holo-live`, `back-neon`, ...) so PongFall ids are prefixed `wrap-`, `back-`, `frame-`; a mapping table belongs here when the two are joined.

## Bridge (for 616 Survivor and the LOK ecosystem, later)
Nothing to build now. The hooks that exist:
- `window` event `pongfall-lokpack` (detail `{ packs, items, ct }`) after every save.
- `LokPackSave.ledger`: the last 100 events `{ t: 'award' | 'open' | 'craft', at, pack?, kind?, item?, ct? }`, enough for a server to replay what happened.
- `grantForResult(result, matchId)` is the single entry point for awards; a future host could call it from `Host.onResult` instead.
- To feed 616 `dropPack` items or Card Universe cards later, add a new `PackItemKind` (for example `card`) whose `PackItem` carries the registry id, and give `rollPack` a pool for it. Item ids are stable strings and the save only keeps ids it knows, so unknown ids from the future are dropped, not crashed on.
- CT is a PongFall-local counter. If it ever becomes an ecosystem currency, that is an owner decision (this doc and CLAUDE.md change first).

## Ideas for later
Pack opening sounds (cues in `audio/cues.ts`), pack streak bonuses, trading duplicates with friends once social exists, seasonal pack-only items, more Loksleeve patterns ported from 616 (Collector Box, Fighter Print), a "Live" pack wrap that features LilEye.

## 0.48.0 additions
- **Backdrops:** PongPainter slot `theme.backdrop` (`render/backdrops.ts`, 12 scenes). Drawn in the shaft after the far wall (`ShaftHooks.backdrop`) and again as a faint `screen` pass over the girders so it shows through the structure. Earned: Dusk Fog, Blueprint, Night Rain. Pack: Ember Chasm, Neon Rain, Biolume, Crystal Cavern (rare), Aurora Curtains, Stormfront (epic), Starfall Void, Event Horizon (legendary).
- **Side glass:** pack-only `BACK_PATTERNS` (`PACK_PATTERNS` maps pattern -> `sidebg` item). Your own saved look drops a pack pattern you do not own (`ownedPatterns`); an opponent's look is not checked.
- **Sounds:** `packShake`, `packBurst`, `packFlip`, `packRare` cues. **Streak:** `streak` and `lastDay` on the save; from the third consecutive local day the first pack of the day pays +10 CT.
- **616 id mapping** (when the two are joined): `wrap-kraft` ~ `pack-kraft`, `wrap-retro` ~ `pack-retro`, `wrap-foil` ~ `pack-foil`, `wrap-holo(-live)` ~ `pack-holo(-live)`, `wrap-gold` ~ `pack-gold`, `wrap-platinum` ~ `pack-platinum`, `back-*` ~ `back-*`, `frame-spellbook` ~ `frame-tcg`, `frame-printed` ~ `frame-printed`.

## 0.50.0 additions
- **New PongPainter slots** (`render/effects.ts`): `ball.impactStyle` (hit effect), `score.burst`, `arena.corners`, `arena.lights`. Hit and score effects are queued from sim events in `feedFx` as render-only "pops" (`Fx.pops`, at most 24, aged each frame) and drawn after the arena shell; corners and lights are drawn with the frame. Earned and pack rows live in `pongPainter.ts` / `packItems.ts`.
- **LilEye** slots `glasses`, `scarf`, `wings` (plus `hat`, `aura`); drawing in `lilEyeArt.ts`.
- **Themes:** Sakura, Parchment (rare), Deep Sea, Neon Dusk (epic) with new `Ambient` kinds `petals`, `bubbles`, `scanlines`, `dust`.
- **Equip, favourites, outfits** (`core/outfits.ts`): `equipItem` wears any owned item through the existing stores, `captureOutfit` / `applyOutfit` save and restore a whole look (up to 6; unowned pack items are dropped on apply), favourites and "seen" lists are local keys `pongfall.packfavs.v1` and `pongfall.packseen.v1`.
- Earned looks now carry a rarity (common, or uncommon for deep unlocks).
