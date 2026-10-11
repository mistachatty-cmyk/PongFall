# PongFall

Pong in a constantly falling arena with glass sides (3 hits to break), watching eyes in the walls, and tears.
Desktop first, mobile friendly. Planned: LOK sign-in (Supabase), gsix.online game-jam page, Vercel deploy.

- `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm typecheck`
- Query params: `?target=14&time=120`
- Controls: mouse/touch or W/S to move, Z cycles zoom (auto/field/arena), click tears, R restarts.

## Layout
- `src/sim/` pure fixed-step simulation (no DOM), tested with `node:test`
- `src/render/` Canvas2D renderer (reads the sim only)
- `src/main.ts` input + loop

## Roadmap
1. (done) single arena vs AI, glass, falling, zoom, eyes + metal lids, tears, growth/shrink
2. pinball power-up (tear owner, 1s grace, swipe to steal), triple score on hitting other arenas
3. NPC arenas above/below, Saved!/Fallen, arena-vs-arena physics, glass shards affecting balls
4. LOK sign-in via Supabase, modes/options menu, mobile polish, gsix.online listing
