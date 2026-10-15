# PongFall chat handoff — 2026-10-15

This document merges the actionable context from the PongFall conversation with the current repository state. Read `CLAUDE.md` for engineering rules, then the topic docs linked below. Older milestones in `HANDOFF.md` are history; confirm any old deployment or branch claims before acting on them.

## Current checkout

- Repository: `mistachatty-cmyk/PongFall`, local checkout `work/pongfall-ad-update`, branch `main`.
- Latest implementation commit at handoff: `45592af` (`Animate win choice and add live shop backdrop controls`), pushed to `origin/main`.
- Package version: `0.26.2`; simulation version: `24` (`src/sim/tuning.ts`).
- Local development: `npm run dev` or `pnpm dev`; production build: `npm run build` (typecheck followed by Vite). The last build passed on `45592af`; Vite reported only its large-chunk advisory.
- Live game: <https://pongfall.gsix.online/>. The conversation also used <https://gsix.online/games/pongfall> as the full, ongoing game link. A push to `main` is not proof that either live site deployed; check deployment state before making that claim.

## Product direction from this chat

PongFall is a falling pong arena with glass, wall eyes, tears, a power arm, neighboring arenas, and a LOK identity. The user wants a distinctive playable experience rather than a generic brick-breaker. The LOK mark is a small yellow, angled tag above the left side of the PONGFALL title, matching the supplied visual reference. Intro text should be physically grabbable and return cleanly; the first fall should feel special, with three other arenas present. `IloveYouMerci` is the session developer unlock and opens dev mode. Those features were developed earlier in this conversation; inspect the current code before extending them.

The user wants menus and shops to feel situated in a **real, falling match**. PongPainter previews cosmetics in a live exhibition world using the normal game renderer. The preview can show a close personal arena or the wider shaft, and cosmetic hover/focus should preview without purchasing or equipping. Future shops should use the same approach, but concept venues are not active stores. Maintain legible ball, paddles, damage, and tears. Eyes should blink in all future eye treatments. See `docs/PONGPAINTER.md` and `docs/FALLING_SHOPS.md`.

The user also wants a clean itch.io edition and promotional media. The small jam build is a separate game edition; do not substitute a generic pong clone. The original GSix animated ad source and its GIFs live in `promo/pongfall-ad/`. The requested GIF ball must rebound visibly, and the ad should allow intense matches before transitioning smoothly to another. The itch page is <https://lokserver.itch.io/lokpongfall>; the full game link is <https://gsix.online/games/pongfall>; the more-games link is <https://gsix.online/arcade>. `docs/ITCH_PAGE.md` holds page copy. Do not assume an itch ZIP is current: no ZIP is tracked in this checkout, and the current game changes would require a fresh package if the user asks for one. itch's editor displayed literal HTML in an earlier attempt, so supply editor-compatible Markdown or use its image upload tools rather than raw HTML in rich text.

## Most recent implementation

The post-win decision appears only on an eligible winning score. `src/core/endScreen.ts` now presents two large buttons: **WIN** falls first with mint glow, followed by **AT WHAT COST?** with coral glow. The text rests white and fills with its accent on hover or keyboard focus. A short press response invokes the existing bank-win or first-to-six overtime action once. Escape banks the win. Small screens stack the choices; reduced motion skips fall and press delay. The match remains visible through the translucent overlay. `src/core/createPongFall.ts` supplies the game's reduced-motion preference. Design and flow: `docs/AT_WHAT_COST_WAVES.md` and `docs/INTRO_OUTRO_ROADMAP.md`.

`src/core/fallingVenue.ts` now supports `setBackdropEnabled(boolean)`. PongPainter and Shaft Venues each have a distinct quick button and independent on-device preference. Turning either backdrop off stops drawing its full-screen canvas while the same exhibition world continues in its close-up viewfinder. Re-enabling draws the background immediately. `src/core/pongPainterView.ts`, `src/core/venueGallery.ts`, and `docs/FALLING_SHOPS.md` cover this. `src/core/mainMenu.ts` also restores the Painter button when its page closes, allowing re-entry.

The latest production build and typecheck passed. A browser check confirmed both page toggles hid only the backdrop, their viewfinders stayed visible, and Painter's setting survived reopening. A temporary browser harness confirmed the win dialog layout and overtime-button callback. It was removed before commit. Full match-to-decision play, touch behavior, narrow screens, and reduced-motion appearance were not exhaustively exercised on a real device in that pass.

## Decisions and boundaries

- Keep the established bank-win and overtime game actions; the recent change is their presentation and click response. Overtime is first to six and risks the banked win.
- The two backdrop preferences are separate, default on, and apply only to pages that also have a close-up live viewfinder.
- Cosmetic previews are render-only. LOK account inventory and server catalog remain the authority for ownership and prices; planned catalog concepts are not purchasable until implemented and registered.
- Preserve the jam build in `jam/` as the original frozen entry. Package the current game or the jam edition only when the user specifies which itch release they need.
- Any simulation rule change requires `SIM_VERSION` and replay review. UI, cosmetics, and backdrop presentation must not alter match physics.

## Useful next steps when requested

1. Walk through a real winning match on desktop and touch: verify the decision appears once, both choices land in the correct flow, rapid input cannot double-select, and reopening resets animation and controls.
2. Check Painter and Shaft Venues on a narrow screen and with reduced motion, especially button placement and continued viewfinder activity after hiding the backdrop.
3. If publishing an itch update, build from the intended edition, package `dist` with `index.html` at the ZIP root and relative assets, and provide an exact absolute ZIP path. Uploading to itch and deploying GSix are separate actions; report each status accurately.

## Source map

- Core: `src/core/createPongFall.ts`, `src/core/endScreen.ts`, `src/core/introScreen.ts`, `src/core/fallingVenue.ts`.
- Customization: `src/core/pongPainter.ts`, `src/core/pongPainterView.ts`, `docs/PONGPAINTER.md`.
- Venues: `src/core/venueGallery.ts`, `docs/FALLING_SHOPS.md`.
- Animation and outro: `docs/AT_WHAT_COST_WAVES.md`, `docs/INTRO_OUTRO_ROADMAP.md`.
- Marketing: `promo/pongfall-ad/`, `docs/ITCH_PAGE.md`.
