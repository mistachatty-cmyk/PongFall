# Concept sketches

The designer's original paint sketches, kept as dev reference. The notes below transcribe each sketch and map it to what is built. The sketches are the source of intent; where this file and the code disagree, ask before "fixing" either.

## Sketch 2 (dated 3-5)

![Concept sketch 2](concepts/sketch-2-3-5.jpg)

Sketch 1 (the original idea, drawn in a sketchpad) will be added when the designer can scan or photograph it. Until then this is the earliest record of the design.

### Transcription

**Aesthetic questions (top left, still open in the sketch)**
- "Aesthetic: mixed media?" / "Dis: theme?" / "616-style?"
- "Fleshy?" and "Binding of Isaac direction?" (the organic, eye-and-tear flavour)
- "Holy? Simple? Without disrespect?" (keep religious imagery out of it or handle it carefully)

**Core idea**
- "Always falling": the whole thing is a boxed-in pong arena that is constantly falling down a shaft.
- "Rotating boxed-in pong arenas falling. Walls have eyes."
- Wall eye: a plate-mounted eye in each side wall. "Eye hit = BG eye react from shadow": hitting a wall eye makes the dim background eyes react.
- "Eyeball follows closest ball."
- "Eye closes when hit." "Make eye dynamic: react when barely miss."

**Glass and goals**
- "Glass breaks after 3 hits."
- "Can't break top / bottom": the top and bottom walls are solid girders; only the two side glass panes break.

**Eyes, tears, pinball**
- "Eye hit, BG eye spazz, drop tear."
- "Eyes drop tears. Player clicks, stack, till phase 2 'pinball'."
- "Enough tears: pinball mode active": the flippers / pinball paddle comes in once enough tears are collected.

**Other players' balls and the NPC**
- "Other player balls hit wall not eye: bounce. Can break your glass."
- "NPC start" (the NPC arena starts the match).
- "If ball free: normal physics can affect work" (a loose ball obeys normal physics outside its arena).

**Background (top right panel)**
- "Dark gray BG panel strip: make eyeballs work + PongFall work."
- "Everything on top. Rotating NPC and research. Io-free server? Supabase + Cloudflare?" (hosting and backend notes)
- "More grayscale. Blue-ish." with a palette swatch of blue-grays, labelled "BG concept".

**Mode and customization wishlist (blue, top right)**
- Modes: Solo Fall, Rain Fall, Pinball, Tower Fall
- Options: Speed, Arena-custom, Eye-custom, Fall gust-custom, Wall-custom, Ball-custom

### Mapping to the build (as of 0.7.0)

| Sketch idea | State |
| --- | --- |
| Falling rotating arenas, walls with eyes | Built: deep shaft, carousel of other arenas, plate-mounted wall eyes |
| Glass breaks after 3 hits; top and bottom unbreakable | Built (girder ceiling and floor; per-side glass counters) |
| Eye hit makes background eyes react and drop a tear; tears stack toward pinball | Built: background eye reactions, tears, pinball paddle unlocked by tears |
| Other arenas' balls bounce off walls, can break your glass | Built on Sharp and Relentless (`hostile`) |
| Eyeball follows nearest ball | Partly: eye look is render-only; check it tracks the closest ball |
| Eye reacts when a ball barely misses | Open |
| Solo Fall | Built (mode) |
| Rain Fall, Tower Fall | Open (new modes, data in `src/sim/data/modes.ts`) |
| Pinball as a mode | Open (it is currently an in-match upgrade) |
| Customization: speed, arena, eye, gust, wall, ball | Open (partly covered by modifiers and tuning knobs) |
| Blue-gray background concept | Open: palette swatch in the sketch is the reference |
| Binding-of-Isaac / fleshy / mixed-media direction | Open art direction question |
| Io-free server, Supabase + Cloudflare | Open: milestone 4, owner applies the SQL |

Remember the repo rules when acting on any of this: game rules are data, the sim stays deterministic, and anything that changes how a recorded run plays out bumps `SIM_VERSION`.
