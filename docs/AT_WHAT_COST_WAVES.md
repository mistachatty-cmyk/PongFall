# Match endings, shared shaft, and ball swipes

This is the current design for the post-win choice and the related stats. The “wave” name is historical: there is one overtime wager after a normal win, not a chain of escalating waves.

## The post-win choice

When a player earns a score victory, pause the match briefly. A translucent cord catches their personal arena and holds it in the shaft while the result card bobs gently. Keep the choice visible until the player selects one of these options:

- **Win** keeps the earned win, cuts the cord, and lets that arena fall into the shared background. Show a crown over it as the chosen-win marker. The crown is a future cosmetic; it grants no gameplay advantage.
- **At What Cost?** risks the earned win in one unranked Power Mode rematch, first to six. The player's arena drops out of sync, then catches back up as the overtime match begins. Faster ball and paddle movement and stronger arena growth/shrink make each point dangerous. If the player reaches six, their arena grinds against the wall and they survive with the win. If the opponent reaches six first, the player takes a loss.

Never auto-select. Keep the decision beat short and clear. Reduced-motion settings remove the bob and soften the transition without changing the simulation.

During the choice and overtime, other arenas keep playing at their own shaft positions. Their motion and visibility are visual context only: **Saved!** or **Fallen!** comes from that arena's own final match result, never its height or distance from the player. The local run and each satellite result are counted once. When the player's arena joins the shared background after choosing Win, show the crown marker so other players can read that choice.

## Ball swipe: heat and breeze

Allow a deliberate swipe across the moving ball, separate from paddle movement and the existing tear-slice gesture:

- An **upward swipe** heats the ball and nudges its speed up. Show a restrained warm-color trail or brief glow; stronger heat may shift the cue toward orange. It should read as energy, not obscure the ball or glass.
- A **downward swipe** gives the ball a breeze and nudges its speed down slightly. Show a cool-color wisp or short trail. The slowdown should create a small recovery window, not stall the rally.

Initial tuning target for playtests: change speed by about 3% per successful swipe, clamp the total swipe modifier to roughly +12% / -9%, and ease it back toward baseline over time. Treat these as balance targets, not locked values. Swipes must have a minimum drag distance, cooldown, and clear hit region so ordinary pointer/touch movement does not trigger them accidentally. Do not let repeated swipes compound without bounds.

Represent the modifier and its decay in deterministic simulation state. Emit explicit up-swipe and down-swipe events for effects and stats. Include the input in replay and reliable online input delivery; both peers must reach the same ball speed and event count. Bump `SIM_VERSION` if this changes replay results. Reduced motion disables or simplifies the trail while preserving the gameplay effect.

## Stats page

Keep records separate for local P1 and P2. Online records belong to the authenticated account. A guest can keep a device-local record and transfer it once on sign-in. Keep all matches unranked and award no LokTokens.

Track these match outcomes:

- Wins and losses, including losses caused by accepting At What Cost? and losing overtime.
- At What Cost? attempts, overtime wins, and overtime losses.
- **Flawless wins:** opponent scored zero and the player's own glass stayed intact.
- Wins with own glass intact, and wins with exactly one, two, or three cracks. These categories may overlap; a zero-crack win also counts as a win with intact glass.
- Times the player broke an opponent or satellite arena's glass.
- Tears collected over the run lifetime, even when the held-tear meter is capped or tears are spent.
- Completed falls/matches.
- **Saved!** and **Fallen!** outcomes, recorded for each arena from its own result.

Put action-use stats in a separate **Usage** section: powered arm hits (“Power Balls”), paddle swipes, upward heat swipes, and downward breeze swipes. Unlock Usage after five completed matches for that profile/account. Let players hide/disable this tracking in Settings. Keep the existing totals if the section is hidden; do not count usage while tracking is disabled. P1 and P2 have separate local usage records.

For stats to remain correct across reloads and reconnects, record authoritative match events once using a stable match/event identifier. Derive lifetime totals from completed results or deduplicate event ingestion; never increment persistent totals again when replaying or resuming a match. Preserve existing saves when a simulation version is incompatible and show a load error rather than deleting them.

## Verification checklist

- Test Win and At What Cost? from both player leads; confirm the cord, pause, crown, catch-up transition, win retention, and overtime loss behavior.
- Run several satellite matches at different shaft distances and verify Saved!/Fallen! follows each result, with no duplicate counts.
- Verify upward and downward swipes, modifier bounds and decay, visual cues, cooldown, pointer/touch behavior, keyboard accessibility, and reduced motion.
- Replay the same input stream twice and compare state, score, swipe events, and final result. In two-browser online play, include simultaneous inputs, dropped messages, reconnect, and desync checks.
- Check stats at the five-match Usage unlock boundary, disabled tracking, P1/P2 separation, guest transfer, account sync, and match resume.
