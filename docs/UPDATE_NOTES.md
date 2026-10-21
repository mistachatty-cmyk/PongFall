# PongFall update notes

## 2026-10-21 · v0.55.0 · First fall and menu choice

- Normal visits open the simulated intro. On a fresh profile, entering starts a new Solo Fall match first to 12 with three nearby arenas; the intro's AI match is not adopted as player progress.
- The starter rule grounds the player's arena at the twelfth point. It is stored in the replay options. Simulation version 25 keeps older recordings identifiable as incompatible rather than silently changing their results.
- The first completed match leads to the original eye menu through the result screen's Main Menu action. Classic is the default for new settings; both full menus remain available from the top switch.
- Classic's large background eye follows the pointer independently of LilEye. Reduce Motion uses immediate gaze movement without easing.
- The frozen Trijam build is untouched.

## Verification

Run `pnpm test` and `pnpm build` from the repository root. Check first-load intro, starter 12-point result, Classic/New switching, pointer gaze, direct `?menu=0`, and reduced motion in a browser.
