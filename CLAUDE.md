# CLAUDE.md

PongFall: Pong in a constantly falling arena with glass sides, eyes in the walls, and tears. Part of the LOK ecosystem
(sibling of 616 Survivor and Kinetic Souls). Full plan: this file's "Plan" section; LOK platform contract lives in
`Lok-EcoSystsem/LokToken EcoSystem/LOK_PLATFORMS.md`.

## Commands
`pnpm dev` · `pnpm typecheck` · `pnpm test` (globs `src/**/*.test.ts`, new tests are picked up automatically) · `pnpm build`.
Query params: `?mode=classic|timed|solo-fall|sandbox&diff=chill|casual|sharp|relentless&mods=thin-glass,fast-ball,gale,low-gravity,heavy-sway&arenas=0|1|3|5&target=14&time=120`.

## Rules
- **House spelling:** player-facing words with "lock" are written with "lok" (Unlok, Lokked, Lok). Identifiers and stored keys keep their names. `src/lokSpelling.test.ts` guards converted phrases; add new ones there.
- **Never use the word "signal"** anywhere (copy, ids, comments, docs). Use beacon, pulse, relay, static, frequency.
- Game rules are **data**: add a mode in `src/sim/data/modes.ts`, a modifier in `src/sim/data/modifiers.ts`, a tuning knob in `src/sim/tuning.ts`. Don't hardcode numbers in `world.ts`.
- **Determinism is load-bearing** (leaderboards re-simulate replays server-side). `src/sim/` is pure: fixed step (`FIXED_DT`), seeded `rng`, no `Math.random`, no wall-clock, no DOM. All player input goes through `issue(world, command)` so it is tick-stamped and logged. Render-only state (camera, eye look) must never feed back into the sim.
- **Any change that alters how a recorded run plays out must bump `SIM_VERSION`** in `src/sim/tuning.ts`. `replay.test.ts` guards determinism.
- PongFall matches are unranked and never pay LokTokens. Do not add rankings or payouts (`ModeDef.ranked`) unless the game design changes.
- **Every word on screen is translated automatically** (`src/core/autoL10n.ts`, catalogue in `public/locales/auto/`, see `docs/AUTO_TRANSLATION.md`): write plain sentences, only numbers may vary; no registration needed. The scan/crawl scripts find new text and the auto-translate workflow writes all 8 languages: never edit translated files by hand. Text built from names or other words stays English; use `t('key', { vars })` from `src/core/i18n.ts` (typed keys in `src/locales/en.json`) when the wording must be exact. Usernames and codes are never translated; mark an element `translate="no"` to be sure. `lib/auto-l10n/` is vendored from `Lok-EcoSystsem/auto-l10n` and never edited here.
- The vendored LOK SDK (`lib/lok-universe`, when added) is never edited here; change `Lok-EcoSystsem/universe-sdk` and sync.
- Every update bumps the version in `src/changelog.ts` (`0.1.0` -> `0.1.1`, middle number after 9; never reuse a version).

- **Difficulty is data** (`src/sim/data/difficulty.ts`): NPC tiers plus how gently the player starts (Chill is the default). Part of `GameResult`/`Replay`; leaderboards must be per difficulty.
- **Audio never feeds the sim.** `src/audio/` reads `world.events` (via `core/createPongFall.ts`) and plays procedural WebAudio recipes from `cues.ts` (pure data, tested). Add a sound = a row in `CUES` + an event mapping in `cueForEvent`.
- Render-only effects (`render/eyes.ts` `Fx`: background-eye reactions, splats, wind drift) live in the renderer and must stay out of the sim.

- **Shader fog is render-only** (`render/fogGL.ts`): it must fall back to the Canvas blob fog (`fog.ts`) when WebGL is missing or slow (done automatically in `core/createPongFall.ts`). Don't make gameplay depend on it.
- **The pinball paddle (tear upgrade) and comeback rules are sim rules** (arm physics in `world.ts` `armHit`) (`world.ts`: `powerActive`, `updateComeback`; knobs in `tuning.ts`). The perk is cosmetic only. Glass crack geometry comes from the pure `sim/glass.ts` (own hash, not the gameplay rng).
- Docs to keep current when rules change: `public/rules.html` (player-facing), `docs/GAME_DESIGN.md`, `docs/ATMOSPHERE.md`, `HANDOFF.md`. Designer sketches live in `docs/CONCEPT_SKETCHES.md` (reference only).

- **The carousel is sim code** (`sim/arenas.ts`, own seeded rng `world.srng`); `render/arenas.ts` only draws it. Arena count is part of the replay/result and of leaderboard keys.

## Layout
- `src/sim/` pure simulation, `commands`/`replay`/`result`, `data/` (modes, modifiers), `tuning.ts`.
- `src/core/createPongFall.ts` mount API (`createPongFall(el, {host, mode, ...})` -> pause/resume/reset/destroy/on).
- `src/host/` `Host` interface (identity, onResult, getBest) + standalone host (local high score).
- `src/render/` Canvas2D renderer, reads the sim only (`draw.ts`, `shaft.ts`, `wall.ts`, `fogGL.ts`, `fog.ts`, `eyes.ts`, `glass.ts`, `arenas.ts`, `wind.ts`).
- `src/audio/` procedural WebAudio (`cues.ts` data + `engine.ts`).
- `src/world/` the world menu: the main menu is the live shaft (`menuModel.ts` pure + tested, `palette.ts`/`look.ts` theme colours, `art/` the objects' art, `propArt.ts`, `objectField.ts`, `worldMenu.ts`, `worldDialog.ts` for pause and results); see `docs/WORLD_MENU.md`. New menu pages become objects there, not buttons on a page. Object art is palette-driven and physical (see `docs/ART_DIRECTION.md`): never hard-code colours, never flat outline icons.

## Plan (milestones)
1. Foundation: commands + replay, mount API, Host, mode/modifier registries, tuning (done); pause (done); i18n, touch layout, settings (open).
2. Gameplay: ball ownership, pinball power-up + swipe steal, triple score, NPC arenas, arena physics, shards.
3. Sandbox mode tools (spawn, sliders, presets, rewind).
4. LOK: shared GSix account session, player progress and save sync, `lok.universe.json`, public update feed, and linked ecosystem media. Match results stay unranked and token-free.
5. Embed: expand the Hub return flow with a postMessage protocol, Vercel deploy, and public lore export.

- **Arena sides are render-only** (`core/arenaSides.ts`, `render/sideLayers.ts`, `core/centerLine.ts`). Looks never enter the sim or the lockstep hash; online they travel as the `cos` message and are re-sanitized on receipt. Pictures must come from `core/artRegistry.ts` (source + licence required, own and licensed art only). The centre line style is developer data, not a setting.
