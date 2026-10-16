# Art direction for PongFall's objects

The world menu, the pause menu and the end-of-match choices are made of objects, so how they look matters. The first set (0.40.0 to 0.42.0) was flat outlined icons with glowing strokes: generic, interchangeable, and the kind of picture that looks machine-made. They are kept as prototypes in `src/world/propArt.prototype.ts` for placeholders. The game now draws the objects below.

## Rules
- **Physical, not iconic.** Every object is a thing that could exist in the shaft: riveted steel, brass, glass, enamel plates, old wood, paper. No outline-only icons, no neon strokes on black.
- **One light.** Light comes from the top left. Each surface has a lit edge, a shadow edge, grain or wear, and a soft contact shadow.
- **Palette, not colours.** Art never hard-codes colours. It reads a `Palette` (`src/world/palette.ts`) made from the theme: a metal ramp, brass, glass, accent, second accent, lamp, paper and ink. Every theme (and the player's accent colour and plaque finish) gives every object a matching set.
- **Alive.** Lamps blink, reels turn, bars rise, the gear turns, bubbles climb, LilEye looks around and blinks. Overlays are drawn on the canvas each frame and are still under reduced motion.
- **Each object has its own silhouette and a story**: the door has a hazard sill and a porthole, the jukebox an arch of tube light, the cassette a real tape path. Small details are the point; avoid symmetrical generic badges.
- **Text on art is stamped** (enamel plates, handwriting on a label), never floating glow text.

## Where it lives
- `world/art/kit.ts`: plates, rivets, glass, lamps, enamel signs, hazard stripes, material gradients, grain filter.
- `world/art/objects.ts`: the 14 objects (`jukebox stats gear easel wardrobe eye door cassette flask book exit keys save restart`), each with a sprite, optional spinning parts and a live overlay.
- `world/propArt.ts`: rasterises once per palette and draws (`drawProp`).

## Audit of other art that still reads as generated, in order of priority
1. **Classic menu pages and floaters** (`core/floatersView.ts`, `core/venueGallery.ts`): emoji and flat icons. Move to the world objects (the classic menu is only a fallback).
2. **LilEye page, PongPainter and Arena Sides pages** (DOM pages): the shared lit skin (`core/pageSkin.ts`: bevelled panels, pressing buttons, lamp switches, brushed sliders) is applied since 0.45.0. PongPainter lives in a shadow-DOM component and still has its own look.
3. **Hub promo ad and itch page art**: re-shoot from the new world objects instead of the old icon style.
4. **Favicon**: replaced with a lit, shaded eye on a steel plate (done in 0.43.0).
5. **Arena Sides flags and pictures**: licensed flag set stays; add frames (pinned paper, enamel, banner) so they feel hung in the shaft, not pasted.

## LokPack looks (0.47.0)
Rarer looks are animated and lit like the rest of the world: Aurora, Plasma, Cinderline, Stormcage and Prism frames draw their own light inside the frame band; trails, shapes, girders and paddles move on the wall clock (render-only) and freeze under Reduce Motion. Rarity colours live in `core/packItems.ts` (`RARITY_META`); cards, tiles and PongPainter cards use the same border and glow.
