# PongFall: next loop ideas

These are design directions, not shipped features. Keep the current Classic rules stable; prototype physics and scoring in the Game Lab, then promote only the ideas that feel good in a real match.

## The experience to protect

PongFall is a duel inside a falling, breakable arena. Scoring grows the scorer’s arena and slows their fall; conceding shrinks the arena and pushes the player toward the shaft. The best extensions should make that pressure visible, give players readable choices, and preserve a clean rally underneath.

## Short prototypes

1. **Wind Vents** — Optional wall vents pulse a visible crosswind, then jump to the other side. The gust bends a live ball just enough to make paddle positioning matter. Keep the active vent visible and the force capped.
2. **Glass Memory** — Carry faint crack patterns from the last fall into the next match. The pattern is cosmetic until a dedicated mode tests repair or weak points.
3. **Tear Streaks** — Slice two or more tears in a short window to leave a tiny glow trail and a sound cue. No extra currency multiplier until the basic tear economy is balanced.
4. **Last Paddle Standing** — Short survival rounds where each miss removes one glass layer. A player can still score, but their own arena is getting harder to defend.
5. **Pressure Serve** — A score launches the next serve faster and closer to the side that is already losing. Use a clear cap and show the pressure meter so comebacks remain possible.
6. **Eye Forecast** — A nearby eye looks toward the next vent, ball, or dangerous glass crack. It teaches the hazard language without adding a tutorial popup.

## Modes with a stronger hook

7. **Airlock Wager** — After a score win, choose to take the result or risk it in one escalating rally. Taking the win cuts the tether; wagering keeps the arena attached. A loss is real, so the decision needs a pause and plain odds language.
8. **Two-Beat Relay** — Duo Fall partners alternate who can steer each paddle every few seconds. Shared timing matters more than raw reaction speed; a visible handoff countdown prevents confusion.
9. **Three-Arena Relay** — A future Trio Fall: three linked personal arenas and one shared ball. A player can hold a paddle line or pass control to a teammate. Prototype with bots before adding online team rooms.
10. **Shaft Salvage** — Broken glass and loose metal drift through the arena. Paddle a shard into a marked socket for a brief shield or a tear. Keep the pickup optional so the ball remains the main read.
11. **The Long Fall** — Endless cooperative score chase. Every clean rally delays the shaft floor; a miss adds speed and shrinks the shared arena. Daily seed makes friend comparisons fair without ranking purchases.
12. **Mirror Match** — The opponent’s arena mirrors yours, including your scale and cracks. A score changes both arenas, so players negotiate whether to grow safely or force a dangerous exchange.

## Social signature and moat

13. **Players Fall Together** — The shaft is a live-feeling backdrop: nearby public matches appear as small satellite arenas, each with its own ball, score, and outcome. Rotate the most active or endangered arenas into view. Never let background players alter a ranked 1v1.
14. **Saved / Fallen procession** — After a match, the winner’s arena catches on its tether while other arenas continue falling. The winner chooses whether to cut loose or risk the win. The chosen crown or falling mark travels with them into the shared shaft.
15. **The Eye Keeps Score** — The shaft’s eye learns a player’s recognizable habit (late swats, safe corners, repeated vent dodges) and reacts with a glance or blink. Keep the read local and non-judgmental; no hidden matchmaking penalty.
16. **Spectral Rematch** — A short, non-interactive replay ghost of the prior opponent falls in a distant lane. Invite a rematch when they are available, but never fake a live player.
17. **Community Weather** — A hub-wide wind direction or shaft signal changes on a shared schedule. It can dress the background or seed an unranked weekend mode; standard matchmaking stays fixed.

## A practical order

- Tune the core duel first: paddle return angles, arm power hit readability, glass feedback, and arena growth/shrink pacing.
- Prototype one environment rule at a time in Game Lab. Log whether it improves rallies, not just screenshots.
- Stabilize the solo post-win decision and local Duo Fall before building public team queues.
- Build the shared shaft from real, consented match state with clear privacy, disconnect, and anti-cheat rules. Background activity must never masquerade as a real opponent.
- Keep all bought customization visual. Matchmaking and competitive outcomes stay fair when every expensive look has zero gameplay effect.
