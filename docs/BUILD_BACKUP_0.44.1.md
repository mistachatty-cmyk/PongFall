# Build backup: PongFall 0.44.1

A snapshot of what exists, how to get back to it, and what to know before big changes. Written before the bug sweep and any further redesign.

## Restore points
- **Git branch `backup/0.44.1`** (commit `f6d1178`, the l10n commit that followed the 0.44.1 merge `6a2ed35`). Never push to it. Restore with `git checkout -b restore origin/backup/0.44.1`. (A tag could not be pushed from the build environment; add one with `git tag backup-0.44.1 f6d1178 && git push origin backup-0.44.1` if wanted.)
- **Vercel**: project `pongfall` (`prj_W37PGbBMRFAERocLbuwXpwzprd5A`, team `team_3eLVreepZFk2aANRcmLkMUBC`) deploys `main` to production. Roll back from the Vercel dashboard (Deployments, the READY deployment for this commit, Promote). Earlier good production deployments: 0.44.0 `dpl_E6rmoG1aXsjtbBjJypwoNFYHgqFa`.
- **In the app**: Settings, Look, Menu style, "Original menu" (or `?menu=classic`) goes back to the page menu. The frozen Trijam build stays at `/jam/`.
- Releases are merges (PR #46 to #50), so any earlier release is a merge commit on `main`: 0.41.0 `32e198f`, 0.42.0 `e044fb9`, 0.43.0 `6c0be70`, 0.44.0 `2ef0353`.

## What is in the build
- **Game**: Pong in a falling arena with breakable glass, tears, eyes in the walls, the pinball arm, comeback rules, and 0/1/3/5 other arenas. `SIM_VERSION` 24 (any change to how a recorded run plays out must bump it).
- **Modes**: Classic, Timed, Solo Fall, Sandbox (lab), Versus (2P), Versus Timed, Duo Fall. Difficulties: Chill (default), Casual, Sharp, Relentless. Modifiers: thin glass, fast ball, gale, low gravity, heavy sway. Matches are unranked and never pay LokTokens.
- **Menus**: live-world menu (default today) and the Original menu, chosen by `menuStyle`; pause and end-of-match follow the same choice. Objects: Jukebox, Stat board, Gear, Easel (PongPainter), Wardrobe (Arena Sides), LilEye, Door (multiplayer), Cassettes (saved matches), Game Lab.
- **Look**: 11 UI themes (Shaft, Terminal, Paper, Neon, Lok Gold, Frostglass, Dusk, Blueprint, Verdigris, Ember, Graphite; some earned), accent colour, plaque finish, shader packs, lens, classic or detailed eyes.
- **Languages**: English plus es, fr, de, pt-BR, ja, ko, zh-CN, all text translated automatically (catalogue in `public/locales/auto/`).
- **Online**: lockstep multiplayer over Supabase Realtime, open-match browser (server SQL still to be applied by the owner), cosmetic `cos` message.
- **Hub** (Gsixhub repo): game page order game, animated ad, dev notes, game jam, updates.

## Architecture map
`src/sim/` pure deterministic simulation. `src/render/` Canvas2D drawing (reads the sim only). `src/world/` live-world menu, pause and results (`palette`, `look`, `art/`, `objectField`, `worldMenu`, `worldDialog`, `pauseWorld`, `endWorld`, `parity`). `src/core/` mount API (`createPongFall`), pages, settings, i18n and auto-translation. `src/net/` lockstep. `src/audio/` procedural sound. `scripts/` catalogue, crawl and export tools. `lib/auto-l10n/` vendored translation tool (never edited).

## Settings and storage
Settings live in `localStorage['pongfall.settings']` (defaults in `src/core/settings.ts`): difficulty chill, mode solo-fall, arenas 3, fog high, hints off, wind gauge on, metronome on, theme default, accent theme's own, plaque auto, menuStyle world, menuFloaters off, companion on. Other keys: `pongfall.progress`, `pongfall.history.v1`, `pongfall.lang`, `pongfall.saveSlots.v1`, `pongfall.arenaSides.v1`, `pongfall.painter.selection.v2`, `pongfall.lilEye.v1`, `pongfall.musicLibrary`, `pongfall.devMode`, `pongfall.lensUnlocked`, `pongfall.activeRoom.v1`, `pongfall.classicMenu` (legacy).

## Commands
`pnpm dev`, `pnpm typecheck`, `pnpm test` (257+ tests), `pnpm build`. Release recipe: branch from `origin/main`, bump `src/changelog.ts` and `package.json`, `pnpm exec tsx scripts/scan-strings.ts` and `scripts/export-public-updates.ts`, typecheck, test, build, PR, merge, check Vercel READY. The `auto-l10n` workflow then builds, crawls, translates and commits new strings.

## Known issues and owner actions
See `docs/ISSUES.md`. Owner-only: apply `supabase/migrations/20261016000100_pf_match_browser.sql`, the lokpet catalogue SQL and the tester-applications migration; the `lok_supporter_feed` function is missing (404 in the console, harmless); set the Vercel production branch; review machine translations (hand fixes go in `public/locales/auto/<lang>.json`, the lock file keeps them).
