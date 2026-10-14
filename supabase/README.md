# PongFall online operations

PongFall rooms were enabled on the LokServices Supabase project on 2026-10-14 for live manual playtesting. The browser-safe `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PONGFALL_ROOMS_READY=true` are set for the PongFall Vercel production environment. Never ship a service-role key to Vite or a browser variable.

The room schema and match-details migrations are recorded as applied under `20261011000100` and `20261012225037`. Before enabling anonymous sign-in, we reviewed the existing `realtime.messages` policies; the PongFall private-room membership policies are the only policies on that table. Supabase Security Advisor reported no errors after migration.

Live API smoke tests passed for guest sign-in, invite creation and joining, rejection of a third player, private Broadcast delivery to both members, rejection of a non-member, and concurrent public-queue pairing. Both production domains served the room-enabled build. These checks do not replace a full two-browser gameplay test.

## Manual playtest

1. In two separate browser profiles or devices, finish one Solo Fall each to unlock Multiplayer. Open the main menu and create an invite room on one; open its link on the other. Play through scoring and the result screen.
2. Start public matchmaking on both profiles at nearly the same time. Verify each sees the same match, controls only their own paddle, and can finish the match.
3. Check a LOK sign-in and one-time guest-progress transfer, named save sync and deletion, a short disconnect, dropped Broadcast packets, a simulated state mismatch, the five-minute public forfeit, and seven-day invite expiry.
4. Repeat the menu, field manual, Jam build, and gameplay HUD checks on desktop and mobile.

A full page reload or new-device invite resume still needs client-side state restoration. Do not promise it as a working feature until it is implemented and tested. The room heartbeat and lockstep watchdog handle temporary connection loss while the match tab stays open.
