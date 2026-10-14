# Run content: a modular game design

PongFall should feel like one game with many strange nights inside it. A run is assembled from a stable rules core and a small, explicit loadout of content modules. Each module has a stable ID, a category, a version, an online-safety label, and a clear place in the run. The catalog lives in `src/sim/data/runContent.ts`; `composeRunContent()` validates a loadout once before play.

## The run stack

| Layer | What it changes | Examples | Contract |
| --- | --- | --- | --- |
| Core rules | Scoring, glass, falling, controls | Classic / Solo Fall | Always available and deterministic |
| Rule modules | Physics or match constraints | Rough Seas, Thin Glass, Paddle Wake | Fixed-step simulation; saved in replay modifiers |
| Shaft events | Time-bounded hazards or opportunities | Wind vents; future pressure pulses, eye openings | Seeded schedule; announce, run, resolve; never silently change core rules |
| Asset packs | A replaceable look for one slot | Shaft, arena, glass, paddle, ball, tear, eye | Presentation only; one pack per slot |
| Effects | Short feedback layered over play | Glass sparks, heat shimmer, echo trail, score stinger | Presentation only; respect reduced motion and quality settings |

Content should compose across layers. A “Rain in the Shaft” event can use a shaft backdrop pack, a softer drop sound, and an optional puddle effect without needing another game mode. A “Redline Rally” rule can raise ball energy while a glass impact effect makes that change easy to read. Assets and effects must not secretly alter hitboxes, visibility, or physics.

## Event grammar

Future events should follow a compact life cycle:

1. **Signal:** show a recognizable warning and its duration before it can affect play.
2. **Active window:** apply only the event's declared rule changes, derived from the run seed and tick.
3. **Resolve:** stop cleanly, emit one result cue, and return to the core rules.

Keep at most one high-impact event and one low-impact atmosphere event active together. Avoid overlapping events that both push the ball or hide the paddle. Event selection should be deterministic, recorded by stable IDs and seed, and included in replay checks. Online events require host agreement and simulation-version compatibility. Until that exists, simulation events stay offline.

## Design guardrails

- Classic remains the untouched baseline. New modules are opt-in until their playtest disposition says otherwise.
- A visual switch must have a real “before” state, and a physics switch takes effect only on a fresh run.
- Any changed physics, scoring, or competitive information marks the result unranked and grants no progression.
- Keep the playfield legible: effects may decorate the ball, glass, or shaft, but must not obscure paddle edges, goals, cracks, or warnings.
- Every module declares its introduction version, category, safety, and compatible slot. Unknown IDs produce a load error and are preserved in save data for later recovery.
- Trijam is a frozen snapshot. It does not import the catalog or inherit current-game modules.

## Small, high-value content directions

- **Pressure doors:** a warning light flashes, then one wall briefly narrows the safe return angle; purely visual version first.
- **Eye weather:** eyes open in a wave and drop tears on a seeded rhythm, creating a readable optional collection route.
- **Glass memory:** old fracture lines appear as a cosmetic pattern, while current damage remains brighter and distinct.
- **Ball signatures:** a ball trail telegraphs heat, breeze, or a power hit through color and shape, including color-blind-safe symbols.
- **Shaft postcards:** small, rare silhouettes and radio fragments make depth feel authored without changing a rally.
- **Run mutators:** a one-line rule card like “every third hit carries a little lift,” enabled only in Lab or a future curated playlist.

These are proposals, not hidden behavior. Add each as a catalog item with a switch, version note, comparison, and test before making it part of a normal preset.
