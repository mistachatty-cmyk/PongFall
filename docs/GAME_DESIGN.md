# PongFall: game design

How the game works as of v0.13.0. The rules live in data (`src/sim/tuning.ts`, `src/sim/data/*`); this document explains them.
The simulation (`src/sim/`) is pure and deterministic: every run can be replayed from `{seed, mode, modifiers, difficulty, commands}`.

## The idea
Pong in an arena that never stops falling down a deep shaft. Each side is sealed behind a pane of glass. Misses crack it; the third (fourth for you on Chill) shatters it, and from then on anything through the hologram goal line is a point for the other side. Scoring grows the arena, which slows the fall. Eyes in the shaft walls watch.

## Core rules
- **Glass:** each pane survives `glassHits` misses (3). Chill gives the player +1. Panes cannot be repaired. Each hit adds a branching crack network that is part of the pane; on the final hit it breaks along those cracks.
- **Scoring:** a ball through a broken goal line scores for the other side. A ball can leave through broken glass into the shaft and come back.
- **Ball swipes:** a deliberate vertical swipe across the ball nudges its speed by 3%. Up adds heat; down applies a slight breeze. The modifier is capped at +12% / -9%, eases back to normal, and has a quarter-second cooldown.
- **Growth and falling:** you scoring grows the arena (`growStep`) and slows the fall; the NPC scoring shrinks it (`shrinkStep`). Any score gives the fall a brief surge. At max size the arena wedges against both walls and the game ends ("grounded").
- **Ending:** target score (default 14), time limit, or grounded. Sandbox never ends and has a lab panel (`core/sandboxLab.ts`, data in `sim/data/lab.ts`): every tool is a `lab` command (sandbox only, deterministic, recorded in the replay), so rewinding is a re-simulation of the recording.  Not a SIM_VERSION bump: no existing recording contains a `lab` command, so every old replay plays out the same.

## Controls
| Action | Mouse / keyboard | Touch |
|---|---|---|
| Move paddle | mouse, W/S, arrows | drag |
| Thrust (lunge) | Space or THRUST button | double-tap or THRUST button |
| Power Paddle | E or POWER button | two-finger tap or POWER button |
| Slice tears | drag across them | swipe across them |
| Heat ball | swipe up across the ball | swipe up across the ball |
| Breeze ball | swipe down across the ball | swipe down across the ball |
| Zoom (auto / field / arena) | Z | |
| Pause / mute / restart | P or Esc / M / R | |

## Thrust
A short lunge toward the opponent with real momentum. The paddle's speed is handed to the ball on contact. Cooldown 0.9 s (shown under the score). Works in every mode.

## Eyes and tears
- Wall eyes (metal lids) are the only part of the walls that react: a ball hitting plain wall just thuds; hitting an **eye** opens all eyes for 10 s, squashes that eye, and **drops a tear** that is blown by the wind.
- Tears are big and slow. **Slice** them (drag or swipe through) to collect; the meter holds 4.

## Pinball arm (internally "power")
- **Unlock:** your own glass breaking frees the paddle (`powerUnlocked`, event `unlock`). Tears no longer unlock it. Sandbox is always armed. The NPC gets the arm when its glass breaks or at the 6-lead lock.
- **Arm:** a separate bar hinged at the paddle centre, `armLength * drawScale` long (it grows with your arena), reaching horizontally into the arena (`Side.fa` angle, `fav` angular velocity, `fdir` held direction; +1 swings the tip up). The paddle keeps blocking on its own. `armHit` in `world.ts`: segment-vs-ball, the arm's surface velocity drives the ball, `flipRestitution`, adds `armLift`, and the ball is **always knocked upward** (vy at least 0.6 of the new speed).
- **Power hit:** every third arm hit is boosted (`powerBoost`, cap `maxSpeed * 1.25`). It is permanent: no timer, never turns off while you swat. Hits within 12 ticks of each other count once.
- **Power hit unloaded:** releasing a held swat (`fdir` 0 while the arm is returning) adds `unloadForward` along the court (event `unload`).
- Space thrust at different heights jolts the arena off-centre, so it also tilts it either way (torque from `jolt`).
- Lore: "power hit unloaded" = the arm released from a loaded swat, fires forward as well as up.

## Comeback rules (deterministic, derived from the score)
- NPC leads by **4+**: the player's pinball paddle wakes ("Second wind") until the player leads by **2**.
- NPC leads by **6+**: the NPC gets the pinball paddle **for the rest of the game**, and the player's assist never returns, even after a comeback.
- **Perk "TheGreatsAreNeverForgotten":** earned by winning a game after the NPC reached the 6-lead lock. A badge only: no gameplay advantage.
- Relentless has no player assist. (You still flip it yourself; second wind only arms it.) Sandbox has no comeback rules.

## Difficulty (`src/sim/data/difficulty.ts`)
Chill (default), Casual, Sharp, Relentless. They change the NPC (speed, reaction delay, aim error, prediction, mistakes, lunges) and how gently the player starts (serve speed, ball ramp, player paddle length, extra glass hit). Difficulty is stored with every run; leaderboards must be per difficulty.

## Modes and modifiers (`src/sim/data/modes.ts`, `modifiers.ts`)
Modes: Classic (first to 14), Timed (2 min), Solo Fall (harder shrink, faster fall), Sandbox (never ranked, never pays).
Modifiers: Thin Glass, Fast Ball, Heavy Fall, Slick Paddles, Gale, Low Gravity, Heavy Sway, Rough Seas.

## Rocking arena
The player's arena is a rigid body (`world.arena`): impacts apply impulses at their contact point (`jolt`), giving both a shove and torque (`rockTorque`), so a hit above or below centre rocks it opposite ways. An angular spring (`rockStiffness`, `rockDamping`) swings it back; angle is clamped to 0.4 rad. **Tilt gravity** (`tiltG * sin(angle)`) rolls the ball downhill; the arena's acceleration also reaches the ball as inertia, and tears and shards. Modifier: Rough Seas.

## Other arenas (carousel) (`src/sim/arenas.ts`)
Setting `arenas`: 0 (solo), 1, 3 or 5 (default 3). Each is a satellite rigid body: a loose spring holds it near its orbit slot (an ellipse that grows with your arena so they stay clear), it spins at its own rate, and arena-vs-arena and arena-vs-yours collisions use circle impulses with spin from slip. Collisions with your arena push and rock you (`bump` event). Each runs its own NPC-vs-NPC match (288x180, glass 3 hits, first to 5, then fresh glass) from its own seeded rng, so everything replays exactly.
- **Triple score:** a ball you last touched that breaks another arena's pane gives the player +3 (three `applyScore` calls).
- **Hostile strays:** on Sharp and Relentless (`DifficultyDef.hostile`) a ball leaving another arena through open glass becomes a stray that can hit your glass. Never on Chill/Casual.
- The number of arenas is part of `GameResult`/`Replay`. Triple points are local match scoring only.

## Physics
Deterministic custom physics, fixed 120 Hz step, seeded RNG. The arena is a body on a damped spring: impacts, thrust, glass breaks and scores shove it; tears, shards and (lightly) the ball feel its acceleration. A deterministic wind field pushes tears and shards. The fall speed eases toward its target.

## Scores and LOK account
PongFall match results are unranked and award no LokTokens. The LOK account connection syncs PongFall history, unlocks, settings, and named saves. Do not add a leaderboard or token payout unless the game design is explicitly changed.

## Stats and post-win choice
The menu's **Player record → View Stats** page separates device-local P1 and P2 history and shows the signed-in account's history. It counts wins/losses, overtime outcomes, flawless wins (opponent scored zero and own glass stayed intact), own-glass crack categories, glass breaks caused, collected tears, and satellite match outcomes. A score win opens one **Win / At What Cost?** choice: the cord holds the personal arena; choosing Win keeps the result and marks it with a crown, while At What Cost? risks it in one first-to-six Power Mode overtime. During the decision and after choosing Win, a separate decorative simulation keeps the satellite matches moving without changing the saved match result or replay.

The Usage stats unlock after five completed matches per profile. Settings can disable collection of Power Balls, paddle swipes, upward heat swipes, and downward breeze swipes; old totals remain saved. Account history details use the `pf_history.details` JSON column added by `supabase/migrations/20261012225037_add_pongfall_match_details.sql`, protected by the existing user-owned row policies.

The intro is a live, unranked two-AI Solo Fall exhibition. Its paddles try to protect real glass; demo play never enters player history. On a fresh profile, entering always starts a new Solo Fall match first to 12 with three nearby arenas, even if the hidden **Match options** tab has enabled **Insta-Matches**. A player score at 12 wedges the arena at max scale and ends as grounded; a CPU score at 12 is a normal loss. This starter rule is included in replay options and requires simulation version 25. Once the starter result is complete, Main menu opens the original eye menu. Later visits can use Insta-Matches to adopt the active exhibition. The menu and in-game settings both offer a **Show in-game HUD** toggle; touch controls remain usable when the HUD is hidden. Intro camera choices are **Cinematic** (close until the ball leaves the arena), **Locked close**, and **Shaft view**.

## Settings (`src/core/settings.ts`, `settingsPanel.ts`)
Saved in `localStorage` (`pongfall.settings`, sanitised on load). Game: difficulty, mode, other arenas (solo/1/3/5), score to win, time limit; these restart the game. Sound: master, effects, ambience, mute, and falling-air profile (Classic or Dynamic). The selected profile is available in both Main menu and in-game settings and survives older settings data. Graphics: fog (high shader / low / off), reduce motion. HUD and controls: HUD visibility, hints, wind gauge, on-screen buttons, left-handed layout, usage tracking. URL/host options (`?mode=`, `?diff=`, `?target=`, `?time=`) win until the player changes that setting. The panel pauses the game while open; the main-menu settings can set HUD visibility and touch controls before starting.
Score target and time limit are part of every result (`GameResult.target`, `timeLimit`) so replays can reproduce the match configuration.

## Growth, outside physics, end
- Default target is 24. `growStep` is 0.1715, so 14 player points take the arena from scale 1 to `maxScale` (about wall to wall). The fall eases to zero as it presses the shaft; `grounded` ends the game as a player win.
- A ball outside the personal arena is a free body: wind and the fall carry it (`outsideDrag`). Breaking another arena's glass drops 3 tears (and Triple score).
- Glass shards: gravity `shardGravity`, shoved by balls, bounce off the shaft walls and stay within +-520 y.
- Render only: ceiling/floor girders clamped to the glass (`drawCeiling`), opening 1:1 background/wall eye pairs scattering as `gameProgress` rises, and an ending camera (arenas fall away, damped bounce).
