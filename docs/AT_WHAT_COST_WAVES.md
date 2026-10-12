# “At What Cost?”: post-win overtime waves

## First wave: the wager

After a standard solo match win, the simulation pauses for a short beat, then offers two choices:

- **Take the win** records the earned result and lets the player fall onward.
- **At What Cost?** risks that result in one unranked Power Mode wave. The match resets to first-to-six, with faster ball and paddle movement and stronger arena growth and shrink on every score.

The arena grows as the player scores and contracts when the opponent scores. If the player reaches six, the arena grinds closed against the walls: they survive and keep the win. If the opponent reaches six first, the wager overturns the original result into a loss. The choice and the full wave are replayed deterministically. Simulation version 16 marks this rules change.

The result card bobs gently during the choice to echo the player’s fall. Reduced-motion settings disable the bob. A one-second pause gives the win a moment to land before the prompt appears.

## Wave roadmap

Keep each wave self-contained, deterministic, and easy to remove or tune. Record its rules and any simulation version change here before expanding it.

1. **The wager (implemented):** one first-to-six Power Mode wave after a solo win. Balance arena scale bounds, score surges, and serve speed against both sides’ comeback chances.
2. **Pressure waves:** offer a second wager after surviving, with a new arena hazard or a tighter time/score condition. Preserve the previous wave’s result in the run history.
3. **Temptation waves:** vary the reward and risk, such as banking a cosmetic/run bonus versus risking the whole chain. Keep all waves unranked and award no currency.
4. **Long fall:** let players stop after any survived wave or continue into an endless sequence with escalating physics and arena behavior.

## Tuning and playtest notes

- Track how often players take the win, accept the wager, survive, and lose the wager.
- Tune one factor at a time: speed, paddle response, arena growth/shrink, or score target.
- Test with both player leads and opponent leads, plus the minimum and maximum arena sizes.
- Keep a clear pause and decision window; never auto-select a wager.
- Re-run replay verification whenever wave rules change. Bump `SIM_VERSION` whenever a change affects the simulation’s replay results.
- Keep online matches outside this first wave until both players can agree on the wager and reconnect behavior.
