# PongFall controller adapter — LOK Input v1

Gameplay adapter: `createPongFall.ts`; action boundary: `controllerActions.ts`; UI/default map: `controllerPanel.ts`. Shared source is vendored from `Lok-EcoSystsem/lok-input` at `lib/lok-input/`; update it using the ecosystem sync script, not independent edits.

Press A / Cross on each pad, release to neutral, then play. Player slots stay fixed when another controller disconnects. Local versus modes support two players; solo modes accept player 1 and retain the AI opponent. More than one controller on a phone works only if its browser/OS exposes both. Physical Xbox/iPhone tests remain pending.

| Input | Action |
| --- | --- |
| Left stick / D-pad | Paddle movement |
| A / Cross | Thrust; hold to aim the earned arm |
| Right stick | Aim the earned arm while holding A |
| X / Square | Power |
| LB / RB | Tilt paddle |
| LT / RT | Flip earned arm |
| Y / Triangle | Camera |
| Menu | Pause/resume |
| View / Select | Gamepads setup |

The Gamepads panel saves per-app button bindings under `lok:input:v1:pongfall`. Standard physical indices and custom controllers can be checked in the hub diagnostic. The default join button stays south face/index 0 even if an action is rebound. Controller menu navigation uses the standard layout and B closes Gamepads setup. Keyboard/touch controls remain available. Audio still follows browser gesture policy.

The game polls in its existing RAF. Menu polling only runs on menu surfaces. Card/attract mode never mounts the gameplay adapter. Movement, tilt, flip, thrust, aim and power go through the existing `issue(world, command)` boundary. Simulation rules and `SIM_VERSION` do not change; replays still record the resulting commands. On blur the game pauses, clears held keyboard/controller state and waits for neutral before accepting input again.

Checks: `npm run build`; `node --import tsx --test 'src/**/*.test.ts'` (84 passing). The Node import form avoids the tsx CLI's Unix IPC requirement in restricted runtimes. Browser/physical-device verification is outstanding because this environment blocks Chromium's required socket and the separate browser cannot reach the local preview.

No online room service, phone QR pairing, account save migration or hardware certification ships in this adapter.
