# PongFall chat context and design decisions

Updated 2026-10-15. This is a condensed record of the owner's direction across the PongFall chat. It is a design brief, not a claim that every idea below has shipped. Check `docs/CHAT_HANDOFF_2026-10-15.md` for the latest implementation status and `src/changelog.ts` for release history.

## Identity and boundaries

- PongFall is a falling, breakable-glass Pong game inside the GSix/LOK ecosystem. The eye, the shaft, the personal arena, and the choice after victory are its central images.
- `/jam/` is the frozen first-hours Trijam 393 snapshot. It starts at its own menu and must not inherit later UI, physics, backgrounds, systems, or progression. The current game and GSix Hub presentation may evolve independently.
- Classic is the baseline look and rules. Larger changes belong behind Game Lab or other explicit toggles until playtested. Each switch should show its introduction version and support a before/after comparison, local notes, and a decision about promotion to the main game.
- Matches are unranked and do not award LokTokens. Experiments remain in local history but do not advance unlocks. New physics experiments stay offline until deterministic multiplayer compatibility is demonstrated.
- Keep the game usable with keyboard, touch, narrow screens, readable text, and reduced motion. Turning off decorative motion must never stop the simulation.

## Opening experience and progression

- Normal entry is a cinematic live two-AI Solo Fall demonstration, then the eye menu when the player enters. The exhibition is a real simulation, with actual paddle saves and breakable glass; it never records a result or unlock. `?menu=0` is the direct-match shortcut.
- The first-time intro should show active gameplay, not a static loop. Later visits can showcase other real modes and arena states. Camera options include a close personal-arena shot, cinematic follow, and a wider shaft view. The personal arena should stay framed during a rally and the camera can ease out when the ball escapes.
- The title is centered, large, and lightly physical. The main action has breathing room; optional controls live at the corners or in a small bottom drawer. Patch notes, Field Manual, motion, theme, and settings belong in the menu rather than crowding the intro. Version notes use a compact, clickable blue treatment inspired by 616 Survivor.
- A new player begins with the simple Solo Fall/Chill choices. The first completed fall reveals multiplayer; later falls unlock further modes, difficulties, and arenas. Dev Mode can reveal all for testing. The eye can be clicked or tapped through closed, peeking, and blinking/open states; preserve a Classic appearance option.
- Optional Insta-Matches can enter the match playing behind the intro. HUD visibility is configurable without disabling inputs.

## Game loop and outcome

- The core loop is an arena falling through the main shaft while opponents try to score, break glass, and change its size. Wind, tears, pinball-arm power hits, paddle swipe heat/breeze, other arenas, and events should have clear visual and sound feedback.
- At a score victory, pause briefly and offer two distinct actions: **Win** or **At What Cost?** Win banks the victory and the arena keeps falling; the player carries a crown marker in the shared shaft. At What Cost begins a faster, riskier first-to-six overtime. Reaching six while grinding against the wall saves the arena; the opponent can overturn the original win.
- Other arenas have their own **Saved!** and **Fallen!** outcomes. The current points leader across visible competitors receives the crown beside the player or guest name; ties have no leader.
- Stats should cover wins, overtime choices, flawless wins (opponent scores zero and own glass intact), glass-damage tiers, breaks caused to another arena, tears, falls, power balls, and paddle swipes. Local P1/P2 records are separate; online records belong to their accounts. Usage stats unlock after five matches and can be disabled.

## Modes and the shared shaft

- Same-keyboard Versus and Versus Timed need both players' full paddle, thrust, tilt, arm, and tear controls. Online Versus needs private invites and a fixed-preset public queue; custom presets are for invites.
- Duo Fall joins two personal arenas into a team space. CPU co-op and local rival are supported. Each side's paddles move together by default; hold G/H for P1's individual paddles, B/V for P2, then release to let them smoothly realign. J is reserved as a possible third-arena selector for a future Trio mode.
- Keep the main shaft. **Players Fall Together** is a future opt-in layer: other real matches can appear as read-only satellite arenas among bots, with focus choices such as hottest or biggest. Their network packets must not alter the local deterministic simulation. A shared online pause requires both players to agree; opening Escape alone keeps play live.
- Build modular run content: rule modules, seeded shaft events, visual effects, and interchangeable shaft/arena/eye/glass/paddle/ball/tear assets. Mutators should be individually switchable and versioned. Proposed extras include destructible shaft fixtures, replay echoes, old glass traces, weather, eye memory, rare shaft encounters, and unusual arena modes. See `docs/RUN_CONTENT.md`, `docs/PONGFALL_MODE_IDEAS.md`, and `docs/PONGFALL_NEXT_WAVES.md` for the deeper plans.

## LOK, cosmetics, and the Hub

- Guest play uses a PongFall-specific anonymous session. LOK sign-in keeps account progress, settings, stats, and named saves across devices, with a one-time transfer of guest progress. Guests can rejoin a room only with their original device session; a signed-in player can rejoin through their LOK account.
- PongPainter provides modular eye, paddle, glass, arena, ball, tear, and theme looks. Tear-earned iris colors cost 10 tears; token-priced cosmetics use the trusted LOK Shop and existing entitlements. Cosmetics do not change physics or award tokens. Shift the Light is the evolving theme editor.
- The GSix Hub PongFall page should show the embedded game, themed Updates and Lore below it, LOK discovery links, an animated PongFall promotion, dev notes and tester interest, and the Friday Trijam invitation. The original jam game stays separate from this page presentation.
- The newest PongPainter and Shaft Venues pages use a live falling-match backdrop and a close-up cosmetic viewfinder. Their backdrop switches are independent; hiding the backdrop must leave the viewfinder running. Planned venue concepts are not automatically active stores.

## Workflow preferences

- The owner prefers work to be completed, pushed, merged, and deployed when requested, with a concise account of what was actually verified. Preserve existing workspace changes and the frozen Jam build.
- Update patch notes and the public update feed for each release. Bump `SIM_VERSION` whenever a simulation rule changes replay output. Keep documentation clear about shipped behavior versus planned concepts.
- Online functionality needs a real two-device playtest in addition to unit and API checks: invite, public queue, both sets of controls, reconnect/reload, dropped messages, state mismatch, five-minute public forfeit, seven-day invite expiry, account/guest return, and mobile HUD.
