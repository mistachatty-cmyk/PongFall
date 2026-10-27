# 2026-10-27 — GSix arcade simulation

The owner requested actual game previews in the GSix arcade and static images in Potato mode, with the highest quality named Lok.

Changed `src/core/arcadeCard.ts` and `src/main.ts`: `?embed=card` mounts the existing world simulation and renderer, with a steering bot for the player paddle. This isolated presentation has no audio engine, settings panel, result host, rewards or persistent settings writes. `quality=balanced` caps rendering at 30 fps and DPR 1; Lok caps at 60 fps and DPR 1.5. The loop skips hidden/reduced-motion work and restarts ended matches. The host unloads frames on hover exit/offscreen to stop all work. A `gsix-card-ready` message is sent after the first rendered frame; the hub validates sender and origin.

Version 0.8.4 and public updates feed refreshed. No simulation rules changed; existing replays retain their version.

Checked: TypeScript and production build pass; 83 tests pass. A local Chromium run rendered one canvas, no buttons and no page errors. Its gameplay frame was captured for the hub's static poster. The hub lifecycle and mobile checks are tracked in the Gsixhub companion PR.

Status: ready for review. Next: merge/deploy this game endpoint before the hub PR; then validate the production iframe at `https://pongfall.gsix.online/?embed=card&quality=balanced`. No production deployment was made in this task.
