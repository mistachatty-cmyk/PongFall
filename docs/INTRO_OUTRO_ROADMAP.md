# PongFall intro and outro roadmap

## Current flow

The winning score in a CPU match now pauses on a clear choice: bank the win or start one first-to-six Power Mode overtime. The first player point explains when this choice unlocks. Every completed match receives a result panel with score, context, Play Again, and Main Menu when available. Overtime reports only its final result.

## Intro direction

**A falling arena you can touch.** Begin with the existing live simulation, three distant arenas in the shaft, and a title lockup that feels suspended in glass. The camera follows a ball through one short rally. The wall eyes notice the player, then the arena comes into focus. The opening should teach one action at a time: move the paddle, return the ball, then collect tears and use power later in the run. The Enter the Fall control stays visible and immediately usable.

### Sequence

1. **Arrival (0–3 seconds):** title, LOK mark, falling shaft, three distant arenas, readable primary button. No forced wait.
2. **Invitation (3–8 seconds):** one simulated rally and a brief prompt to move the paddle. Player input advances instantly.
3. **First contact:** the camera settles on the active arena; one concise hint names the controls currently relevant to the device.
4. **First point:** celebrate the score, show the target, and explain that a winning point opens the overtime choice.

### Interaction and accessibility

- Any click, tap, Enter, or gamepad confirm on Enter the Fall begins the run without waiting for animation.
- Text remains readable while moved and returns to its home position before play begins.
- Reduced motion uses static composition, a short opacity transition, and no automatic camera movement.
- Narrow screens keep the title, button, and first action prompt above the fold.
- Sound begins only after user input and can remain muted.

## Outro expansion

The shared panel should grow into a small outcome-specific scene. Score wins hold the arena on a glass cord until the player chooses. Time wins, losses, draws, grounded survival, overtime success, and overtime loss each get a distinct one-line summary. The next pass should add a compact run recap (points, tears, glass breaks), a replay action when a recording exists, and a clear route back to the same mode or mode select. Online rematches need a waiting/cancel state. Sandbox needs an explicit Leave Run confirmation rather than a fabricated victory. Keep these actions keyboard and touch accessible and honor reduced motion.

## Implementation order

1. **Done:** Responsive decision and result panels with keyboard focus, Escape behavior, and no required animation.
2. **Done:** Short live intro sequence with timed and input-driven prompts; Enter the Fall remains an immediate skip.
3. **Done:** Recap with points, tears, and glass breaks; Save Replay uses the existing local replay slot flow.
4. **Done:** Existing result-specific arena fall and tether visuals pair with outcome-specific text. Online rematches show a waiting and cancel state. Sandbox asks before leaving its endless run.
