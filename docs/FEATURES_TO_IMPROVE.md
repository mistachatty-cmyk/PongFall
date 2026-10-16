# Features to improve later

Things that began as bugs, were kept on purpose, and have a name and a place to grow.

## Glass shard floor ("the invisible bottom")
**What it does.** When a glass pane breaks, the pieces fall, fly and tumble, get shoved by balls and wind, bounce off the shaft walls, and then land on an invisible floor (and ceiling) at 520 units from the arena's origin (`SHARD_FLOOR` in `src/sim/world.ts`). They never fall out of view.

**Why it is kept.** It looks good and keeps the wreckage in the match. It is part of the simulation, so recorded runs depend on it: `src/sim/shards.test.ts` pins it, and changing it needs a `SIM_VERSION` bump.

**Ideas to improve later**
- Give the floor a visible form: girders or a ledge the shards land on, so the invisible floor stops looking like a glitch.
- Shards that glint, then fade, then settle; a pile that stays until the next serve.
- Let shards be kicked into other arenas, or cut tears.
- A tuning knob (`tuning.ts`) for "fall through" so a mode can let glass drop out of view; guarded by `SIM_VERSION`.
- Different floors per theme or district.
