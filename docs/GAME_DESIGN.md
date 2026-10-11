# PongFall: game design

How the game works as of v0.3.0. The rules live in data (`src/sim/tuning.ts`, `src/sim/data/*`); this document explains them.
The simulation (`src/sim/`) is pure and deterministic: every run can be replayed from `{seed, mode, modifiers, difficulty, commands}`.

## The idea
Pong in an arena that never stops falling down a deep shaft. Each side is sealed behind a pane of glass. Misses crack it; the third (fourth for you on Chill) shatters it, and from then on anything through the hologram goal line is a point for the other side. Scoring grows the arena, which slows the fall. Eyes in the shaft walls watch.

## Core rules
- **Glass:** each pane survives `glassHits` misses (3). Chill gives the player +1. Panes cannot be repaired. Each hit adds a branching crack network that is part of the pane; on the final hit it breaks along those cracks.
- **Scoring:** a ball through a broken goal line scores for the other side. A ball can leave through broken glass into the shaft and come back.
- **Growth and falling:** you scoring grows the arena (`growStep`) and slows the fall; the NPC scoring shrinks it (`shrinkStep`). Any score gives the fall a brief surge. At max size the arena wedges against both walls and the game ends ("grounded").
- **Ending:** target score (default 14), time limit, or grounded. Sandbox never ends.

## Controls
| Action | Mouse / keyboard | Touch |
|---|---|---|
| Move paddle | mouse, W/S, arrows | drag |
| Thrust (lunge) | Space or THRUST button | double-tap or THRUST button |
| Power Paddle | E or POWER button | two-finger tap or POWER button |
| Slice tears | drag across them | swipe across them |
| Zoom (auto / field / arena) | Z | |
| Pause / mute / restart | P or Esc / M / R | |

## Thrust
A short lunge toward the opponent with real momentum. The paddle's speed is handed to the ball on contact. Cooldown 0.9 s (shown under the score). Works in every mode.

## Eyes and tears
- Wall eyes (metal lids) are the only part of the walls that react: a ball hitting plain wall just thuds; hitting an **eye** opens all eyes for 10 s, squashes that eye, and **drops a tear** that is blown by the wind.
- Tears are big and slow. **Slice** them (drag or swipe through) to collect; the meter holds 4.

## Power Paddle
- **Unlock:** filling the tear meter for the first time unlocks it (stored in this browser; a LOK account later). Sandbox has it from the start.
- **Activate:** spend 4 tears with E / POWER / two-finger tap. It lasts 12 s.
- **Effect:** the paddle keeps its own velocity and every **third** hit is a boosted strike (extra ball speed, arena shove, flash). The counter shows on the paddle.

## Comeback rules (deterministic, derived from the score)
- NPC leads by **4+**: the player's Power Paddle wakes ("Second wind") until the player leads by **2**.
- NPC leads by **6+**: the NPC gets the Power Paddle **for the rest of the game**, and the player's assist never returns, even after a comeback.
- **Perk "TheGreatsAreNeverForgotten":** earned by winning a game after the NPC reached the 6-lead lock. A badge only: no gameplay advantage.
- Relentless has no player assist. Sandbox has no comeback rules.

## Difficulty (`src/sim/data/difficulty.ts`)
Chill (default), Casual, Sharp, Relentless. They change the NPC (speed, reaction delay, aim error, prediction, mistakes, lunges) and how gently the player starts (serve speed, ball ramp, player paddle length, extra glass hit). Difficulty is stored with every run; leaderboards must be per difficulty.

## Modes and modifiers (`src/sim/data/modes.ts`, `modifiers.ts`)
Modes: Classic (first to 14), Timed (2 min), Solo Fall (harder shrink, faster fall), Sandbox (never ranked, never pays).
Modifiers: Thin Glass, Fast Ball, Heavy Fall, Slick Paddles, Gale, Low Gravity, Heavy Sway.

## Physics
Deterministic custom physics, fixed 120 Hz step, seeded RNG. The arena is a body on a damped spring: impacts, thrust, glass breaks and scores shove it; tears, shards and (lightly) the ball feel its acceleration. A deterministic wind field pushes tears and shards. The fall speed eases toward its target.

## Score and rewards (planned wiring)
Leaderboard score = `points*100 - opponentPoints*40 + win bonus (+ speed bonus)`. Every point you score in a verified, ranked run is worth **10 LokTokens** (daily cap 200 points), paid by a server function that re-simulates the replay. See `HANDOFF.md` for the LOK plan; the SQL is not applied yet.

## Settings (`src/core/settings.ts`, `settingsPanel.ts`)
Saved in `localStorage` (`pongfall.settings`, sanitised on load). Game: difficulty, mode, score to win (mode default / 7 / 14 / 21 / 28), time limit (mode default / none / 1:00 / 2:00 / 3:00); these restart the game. Sound: master, effects, ambience, mute (kept by the audio engine). Graphics: fog (high shader / low / off), reduce motion. HUD and controls: hints, wind gauge, on-screen buttons, left-handed layout. URL/host options (`?mode=`, `?diff=`, `?target=`, `?time=`) win until the player changes that setting. The panel pauses the game while open.
**Ranking:** score target and time limit are part of every result (`GameResult.target`, `timeLimit`), so leaderboards must key on mode + difficulty + target + time limit.
