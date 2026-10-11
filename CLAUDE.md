# CLAUDE.md

PongFall: Pong in a constantly falling arena with glass sides, eyes in the walls, and tears. Part of the LOK ecosystem
(sibling of 616 Survivor and Kinetic Souls). Full plan: this file's "Plan" section; LOK platform contract lives in
`Lok-EcoSystsem/LokToken EcoSystem/LOK_PLATFORMS.md`.

## Commands
`pnpm dev` · `pnpm typecheck` · `pnpm test` (globs `src/**/*.test.ts`, new tests are picked up automatically) · `pnpm build`.
Query params: `?mode=classic|timed|solo-fall|sandbox&mods=thin-glass,fast-ball&target=14&time=120`.

## Rules
- **Never use the word "signal"** anywhere (copy, ids, comments, docs). Use beacon, pulse, relay, static, frequency.
- Game rules are **data**: add a mode in `src/sim/data/modes.ts`, a modifier in `src/sim/data/modifiers.ts`, a tuning knob in `src/sim/tuning.ts`. Don't hardcode numbers in `world.ts`.
- **Determinism is load-bearing** (leaderboards re-simulate replays server-side). `src/sim/` is pure: fixed step (`FIXED_DT`), seeded `rng`, no `Math.random`, no wall-clock, no DOM. All player input goes through `issue(world, command)` so it is tick-stamped and logged. Render-only state (camera, eye look) must never feed back into the sim.
- **Any change that alters how a recorded run plays out must bump `SIM_VERSION`** in `src/sim/tuning.ts`. `replay.test.ts` guards determinism.
- Sandbox is never ranked and never pays LokTokens (`ModeDef.ranked`).
- Player-facing text goes to `src/locales/en.json` via the i18n bridge once added (see 616's `CLAUDE.md`); never edit other language files by hand.
- The vendored LOK SDK (`lib/lok-universe`, when added) is never edited here; change `Lok-EcoSystsem/universe-sdk` and sync.
- Every update bumps the version in `src/changelog.ts` (`0.1.0` -> `0.1.1`, middle number after 9; never reuse a version).

## Layout
- `src/sim/` pure simulation, `commands`/`replay`/`result`, `data/` (modes, modifiers), `tuning.ts`.
- `src/core/createPongFall.ts` mount API (`createPongFall(el, {host, mode, ...})` -> pause/resume/reset/destroy/on).
- `src/host/` `Host` interface (identity, onResult, getBest) + standalone host (local high score).
- `src/render/` Canvas2D renderer, reads the sim only.

## Plan (milestones)
1. Foundation: commands + replay, mount API, Host, mode/modifier registries, tuning (done); pause (done); i18n, touch layout, settings (open).
2. Gameplay: ball ownership, pinball power-up + swipe steal, triple score, NPC arenas, arena physics, shards.
3. Sandbox mode tools (spawn, sliders, presets, rewind).
4. LOK: sign-in (616's `lok-client` pattern, `LokServices` Supabase), `pongfall_runs` tables, `pongfall-submit` replay verifier, `server_only` earn rules paid only by verified runs, leaderboards (SQL is written for the owner to apply; never touch the live project unasked).
5. Embed: postMessage protocol, gsix.online arcade return trip (`?arcade=/games/pongfall`), Vercel deploy, lore/updates exports.
