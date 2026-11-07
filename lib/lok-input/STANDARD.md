# LOK Input Standard v1

Dependency-free ESM. PC, mobile and console hosts share the same API; controller visibility depends on the browser/OS. Hardware certification is separate from API detection.

## Integration

```js
import {LokInput,loadMap,readGamepads} from '@lok/input';
const defaults={primary:{button:0},dash:{button:1},pause:{button:9}};
let map=defaults;
try{map=loadMap(localStorage,'my-app',defaults)}catch{}
const input=new LokInput({maxPlayers:1,map}); // Set the engine's actual local limit.
function frame(){
  const frames=input.poll(readGamepads().pads,document.hasFocus()&&!document.hidden);
  game.setControllerFrames(frames); // Replaces previous state, including [].
  requestAnimationFrame(frame);
}
// On blur/exit: input.reset(); game.setControllerFrames([]).
// Prefer the startInput helper below when not polling in the existing engine loop.
```

`startInput` from `@lok/input/browser` owns its RAF and listeners, immediately sends `[]` on blur/cleanup, and returns a cleanup function. Do not run it alongside another gameplay poller. Use game-native handlers for actions, camera and menus. The optional `keyboardAdapter` is only for verified legacy bindings; it cannot synthesize trusted browser actions or unlock audio/fullscreen. `startMenuNavigation(root)` scopes navigation to that surface, supports D-pad/stick repeat, face-button confirmation, and select/range adjustment. It refuses text fields and iframe focus. Return its cleanup on unmount.

## State contract

- Press south face button (standard index 0) to join; release all actions and both sticks to neutral before play. Joining never confirms a purchase, fires or starts a run.
- Up to four slots, numbered 0–3; browser indices may be sparse and are never player numbers. A disconnected slot becomes available, without renumbering the remaining players. Reconnect needs a new join.
- Frames contain `player`, `index`, `mapping`, `move`, `look`, `actions`, `pressed`, `released`. Actions are booleans. Edges fire once; held movement is continuous. Both sticks use radial deadzones and vectors of length at most one. Opposing D-pad directions cancel.
- Replace previous frames every poll. Absence of a player's frame means neutral/released. Never retain a previous nonzero vector when a player disconnects.
- `reset()` requires a neutral state before resuming and preserves joined slots. Use `leave(player)` to free one slot.
- Unknown controller mappings remain testable; show diagnostics and require per-app remapping. Never infer guaranteed compatibility from an ID string.

## Profiles

Use an app-specific map of action names to `{button: index}` or `{axis: index, direction: -1|1}`. `loadMap`/`saveMap` use versioned, app-scoped local keys. Invalid saved data falls back, storage errors are handled. Apps own action names, labels, defaults and any key-swapping/conflict rules. Preserve existing app preferences during adoption; Survivor616's controls already include a valid remapping UI and must be migrated deliberately.

## Focus, embedding and previews

One surface owns input. The hub polls menus before launch and stops at iframe focus; a game polls its own controllers. Do not send synthetic key events across origins. Child frames need HTTPS and `allow="gamepad"`; broader response Permissions-Policy restrictions can still block them. A future config message must validate exact origin and `event.source`, app ID and version; never pass auth/session credentials through the input protocol. Attract/card modes do not initialize this package.

Xbox Edge's hold-Menu switch is a browser setting the page cannot force. Never globally disable zoom/scroll on the hub. Restrict `touch-action:none` and scroll lockdown to the active playfield, restoring them on exit. `canvasSize` caps the drawing buffer independently of CSS size: Potato 960, balanced 1280, Lock 1920 on the longest edge; games may tune these budgets. This is not a 60 FPS or 4K certification.

## Optional phone transport

`@lok/input/remote` provides a tested input receiver and sender for an **already host-approved RTCDataChannel**. Remote pads can be passed alongside physical pads to the same slot allocator; physical and remote controllers share the game's player limit. Receivers validate shape, finite axes, sequence and rate, expire after 500ms without a heartbeat and release on channel close/error. Senders cap at 30Hz and respect backpressure. Only control state is allowed; no text, purchases, auth or arbitrary app commands.

This module does not create rooms, QR codes, authentication, approval, ICE/TURN or peer negotiation. Room UI remains disabled until that service is built and tested. The room service must authenticate the host and guests, provide an expiring invitation, pin the host/peer identities, require host approval, cap occupancy, revoke access and clean up on departure. Use private authorized pairing channels, not public Broadcast rooms. WebRTC network traversal may require TURN and associated cost; do not silently add paid services. Do not write per-frame control traffic to Postgres.

## Saves and LOK integration

Input profiles are device-local preferences, not account saves. Reuse the ecosystem's per-user/app/slot save contract with revisions, schema checks, backups and explicit conflict resolution. Never mix private progress or controller frames into shared wallet/stat blobs. Purchases, entitlements and ranked rewards remain server-authoritative. Controller-based menu activation follows the same confirmations as touch and keyboard.

## Verification

Run `node --test packages/lok-input/test/*.test.js` at the hub root. Browser verification script: `CONTROLLER_TEST_URL=http://127.0.0.1:3101 node scripts/verify-controllers.mjs`, with a server already running and Chromium available. Hardware matrix: Xbox Edge Menu handoff, PC wired/Bluetooth, iPhone/iPad with 2–4 paired controllers as exposed by the OS, Android, unsupported/in-app browser fallback, custom mappings, drift, disconnect/rejoin, focus, fullscreen, route changes and card previews.
