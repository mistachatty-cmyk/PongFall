# Roadmap status

Plan: sides and layers, flags and album art, eyes and companions, menus and settings, multiplayer and social. Each phase ships as its own release.

## Phase 0: bugs and polish (0.27.0)
- Done: lok spelling rule and guard test, no "signal" in player-facing names, hints off by default, rotating menu flavor lines, rally metronome, HelloWorld cheat menu, other-arena bot names (toggle), smooth menu eye plus seven-poke easter egg.
- Could not reproduce: PongPainter opened and all seven tabs and card lists loaded with no errors in a fresh browser (the live supporter ticker returns a 404 from `lok_supporter_feed`, which is handled and harmless). Retry worked for four rounds in a row after a timed match. If either breaks for you, note the mode and what you clicked.
- Still open: cloud effects, button and "digital lok" UI tokens, clearer unlok indicators (folded into Phase 4's settings and UI pass).

## Phase 1: arena sides and layers (0.28.0)
- Done: `core/arenaSides.ts` (looks, sanitize, storage, ceiling blend, NPC presets), `render/sideLayers.ts` (layer 1 back glass + pictures, layer 2 objects, layer 4 filter), `core/centerLine.ts` (developer-only seasonal centre line), `core/artRegistry.ts` (own art with source and licence), `core/arenaSidesView.ts` (editor on a real running arena, plus whole-shaft view), main menu entry, cloud sync of looks, online `cos` message (render-only, size capped, sanitized, never in the lockstep hash).
- Live everywhere: your match, the menu backdrop rally, the shop venues, and the other arenas in the shaft (NPC presets).
- Not built yet: physical layer-2 objects (needs a `SIM_VERSION` bump and an online review, so it stays an experiment), per-NPC custom looks.
- 0.28.1: drag-to-place inside the live arena (pointer mapped through the arena's swaying transform via `Fx.arenaMatrix`).
