# PongFall: next waves

This plan keeps the Trijam snapshot frozen at `/jam/`. New work belongs to the current game only.

## Intro and menu baseline

- The intro is a live two-bot Solo Fall rally, with a centered title, the **WIN. BUT AT WHAT COST?** hook, and one roomy **Enter the Fall** action. The title can be dragged or nudged with arrow keys; it springs back with momentum. Center placement is the default, with upper and lower placement choices in Main menu Settings.
- Both exhibition paddles predict and meet the ball through the regular paddle collision. The glass has no demo shield: missed returns crack and break it through the normal rules. Attract play stays unranked and does not update player progress.
- Field Manual, Patch notes, Reduce Motion, intro camera, text placement, and Shift the Light live in Main menu Settings or footer. The original eye menu look is the first **Classic options** toggle. The upgraded eye follows the pointer and supports click, touch, and keyboard.
- Main menu content scrolls in one page, including on mobile, so settings and player panels do not stack over the footer. Camera default is **Cinematic**: hold the personal-arena view during a rally and ease out only when the ball escapes.
- Preserve the accessible reduced-motion option, keyboard and touch navigation, the local soundtrack library, and the no-progression rule for attract play.

## Physics review before tuning

The simulation already runs at a deterministic 120 Hz. The pinball arm uses a closest-point capsule check against its current line segment, uses arm angular velocity at contact, forces an upward component, and applies extra speed for a charged release or every third powered hit. Existing tests cover the upward swat, release unload, powered hit cadence, NPC swats, and replay repeatability.

The next physics pass should first add focused measurements and play cases, then change one factor at a time:

1. Add a swept collision between the ball's previous/current positions and the arm's previous/current pose. A fast swing can cross the ball between fixed ticks even when neither sampled pose overlaps it.
2. Make the powerful hit feel distinct through a clear timing window, stronger impulse from arm tip velocity, readable charge feedback, and a unique impact cue. Avoid only increasing the top speed; the contact angle and timing should matter.
3. Keep a simple blocking paddle hit as the reliable fallback. Test edge, center, charged-release, max-speed, and simultaneous paddle/arm contacts for both players and the NPC.
4. Preserve deterministic replay. Bump `SIM_VERSION` if any collision or impulse change alters match outcomes.

## Glass and destructibles

Intact panes are fixed to their arena edges; they currently shiver by a very small amount on impact. Broken glass becomes loose shards affected by fall, gravity, wind, and arena acceleration. Reproduce the reported sliding with a short capture and compare pane, clamp, and collision coordinates before changing the physics. If the intact pane reads as detached, keep its collision surface and frame fixed and put the impact response into a localized refraction/shader effect.

Add a few deterministic shaft fixtures as an optional, initially unranked modifier. Balls can crack and break them for a bonus point, a burst of score text, sparks/glass, and a short sound cue. Use the existing event-driven effects and seeded simulation so replays and online opponents agree. Start with one fixture type and a clear cooldown/reset rule; add more only after hits are easy to read.

## Players Fall Together

The current carousel can simulate other bot matches, and its arenas drift forward based on score or size. Online rooms already support two real players in one match; the shared carousel would be a separate, opt-in presence feature.

1. Show live presence only for players who opt in. When a player starts a run, publish a small, rate-limited match snapshot for a read-only satellite view. Interpolate that view locally; do not let another player's packets affect the local match simulation.
2. If no real match is available, keep the existing bot arena running. Joining or leaving a live satellite should not reset the player's match.
3. Offer focus rules: **Hot** (recent hits/scoring), **Biggest** (arena size), or **My arena**. Reuse the carousel's current front/back animation.
4. Add a shared-pause request for online rooms. A single Escape opens the menu while play and timers continue. Pause both simulations and timers only after both players agree within a short request window; otherwise leave the match live and show that the request was declined or timed out.
5. Keep identity minimal in the shaft view, provide an opt-out, and fall back cleanly when Realtime is unavailable. Before implementing this, verify current Supabase Realtime Presence/Broadcast guidance and review the existing private-channel authorization and room policies.

## Settings, themes, and notes

- Escape already opens the in-game menu. Offline matches pause there; online matches currently remain live. Keep that default unless both players agree to a shared pause.
- Add a **Glass / Shield meter** visibility setting. I read “Shield men” as a request for this HUD option.
- “Shift the Light” currently cycles three intro accents. Turn it into a small theme editor with previews, saved choices, and clear locked/unlocked states. Use the existing LOK account and token purchase/entitlement path for optional cosmetics; never grant tokens for match wins.
- Make patch notes a compact update feed with version, date, readable headings, and concise changes. Keep detailed rules in the Field Manual.

## Small, distinctive additions

- **Last Run Echo:** replay the player's best or previous deterministic run in a background satellite.
- **Weekly Shaft:** choose one existing modifier from a date-seeded rotation for a light challenge with a shareable seed.
- **Hot Shaft callouts:** show why a satellite is in front (“biggest arena” or “most action”) so the carousel feels like a live event.

Players Fall Together is the strongest differentiator. Build the basic live satellite and focus rules before adding several unrelated modes. Keep Weekly Shaft and Last Run Echo optional follow-ups.

## Verification gates

- Desktop and narrow mobile: intro hierarchy, full playfield visibility, safe-area/footer spacing, patch notes, and no stacked controls.
- Intro: two bots move, close camera holds during a normal rally, escaped ball eases the camera out, and the game returns to the close shot.
- Reduced motion on/off: physics continues in both states; decorative shake, fog, and title motion obey the setting.
- Physics: deterministic replay, swept arm contact, bonus targets, and unchanged Jam build.
- Online: two-player vote timeout/decline/agreement, timer synchronization, live satellite entry/exit, and offline fallback.
- LOK themes: guest/local preview, account sync, locked-state behavior, and token purchase via existing entitlement rules.
