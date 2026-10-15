# Falling shops and notable pages

## Core presentation

PongFall pages live in the shaft. A shop can be a personal arena suspended beside the match or a larger venue with other arenas visible falling past it. The `createFallingVenue` component in `src/core/fallingVenue.ts` runs a local exhibition world and draws it with the same simulation and renderer as a match. It never records a result, changes inventory, grants currency, or alters a player's live match.

PongPainter now uses this live venue as the **full-screen space behind the shop UI**. Hovering or focusing an item changes the rendered look immediately without equipping or buying it; leaving restores the equipped look. The personal arena view makes the paddle, ball, glass, eyes, and tears easy to inspect. Full Shaft shows the surrounding arenas and falling space. Reduced motion freezes a representative frame. The view shares the exact `painterColors` resolver and `renderWorld` path used during play, including the theme filter. The painter venue includes shop rails, a lit counter sign, and small paint shelves along the outer edge of the frame. Shop panels float over the live view with readable dark surfaces.

Stats uses the same full-screen falling venue behind its records panel. Multiplayer setup gets a live two-pilot deck behind its controls. The component already provides visual treatments for a larger LOK market, eye atelier, arena yard, and replay archive. These are reusable UI variants for future pages; they do not expose items or routes before those features exist. The main menu keeps its existing watching-eye presentation.

The main menu's **Shaft Venues** gallery lets players inspect those six venue treatments in motion. PongPainter and Shaft Records open their working pages from the gallery. Future venues are clearly marked as concepts and have no purchase action.

## Venue design language

| Page | Venue treatment | Player task |
|---|---|---|
| PongPainter | LOK paint counter bolted to a personal arena; cyan shop rails and sign; full shaft toggle | Try, equip, and purchase registered cosmetics |
| LOK Shop expansion | Larger shop arena with clearly separated shelves, public supporter band, wallet, and server host | Browse only registered, server-priced goods |
| Eye atelier | Close personal arena with wall eyes in view | Compare future eye types and gaze cosmetics |
| Arena yard | Wide shaft with multiple arena frames drifting by | Compare future frames, clamps, and floor treatments |
| Match records | Quiet records rail over a live shaft feed | Read stats and histories |
| Replay archive | Small observation arena with playback controls outside the field | Inspect saved runs when playback UI is implemented |

The last four shop/archive concepts are page designs, not live catalogs or purchase promises. Add their routes only when the underlying items or replay controls exist. The current live shop remains PongPainter.

## Rules for future shops

1. Place one live venue high on the page; let the player switch between detail and shaft context when scale matters.
2. Feed item hover/focus into a **temporary render-only look**. Equip and purchase remain separate explicit buttons.
3. Preserve the real ball outline, paddle edges, active glass damage, and collectible readability. Decorations stay outside the playfield.
4. Keep wallet, account ownership, and server catalog prices authoritative. The venue owns no commerce state.
5. Pause or freeze the exhibition when hidden, dispose of its animation loop on page close, and show a static equivalent for reduced motion.
6. Put page actions over solid surfaces with readable contrast; keep focus order and touch targets independent of the canvas.
