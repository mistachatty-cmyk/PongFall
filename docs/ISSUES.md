# Known issues (0.44.2)

Found by `scripts/sweep.mjs` (desktop, phone, reduced motion, both menu styles, 7 themes x 7 languages: no console errors, failed requests or overflow) and by looking at screenshots.

| Severity | Issue | Status |
|---|---|---|
| Medium | Machine translation of one-word UI labels was wrong (Chill became "Login" in Japanese, Mode became "Menu"). | Fixed in 0.44.2: difficulty and mode names are kept as names, MODE and DIFFICULTY carry a hint, shouted text stays shouted. |
| Medium | Some long sentences read badly in ja (the menu footer line). Machine translation. | Open: hand-fix in `public/locales/auto/ja.json` (the lock file keeps it). |
| High | The gear (Settings) page opened blank from the live-world menu's Gear object: the settings panel forced its host to `position: relative`, collapsing the framed screen to a line. | Fixed in 0.44.3 (also the keyboard-controls panel). |
| Info | Broken glass lands on an invisible floor. | Kept on purpose, see `docs/FEATURES_TO_IMPROVE.md`. |
| Low | The server function `lok_supporter_feed` is missing: a 404 shows in the console. The game works without it. | Owner: apply the SQL. The game now asks once per 10 minutes instead of on every visit to the shop. |
| Low | The fog shader reports "GPU stall due to ReadPixels" once in Chromium software rendering. | Open: check the readback is not per frame on real GPUs. |
| Low | End-of-match: the centre "You win / Draw" banner from the original outro sits over the Play-again ball. | Fixed in 0.44.4: the banner text is hidden while the world dialog is open. |
| Low | The Door page shows the Settings chip of the original menu on top of its own header. | Fixed in 0.44.4. |
| Unknown | PongPainter "broken" and Retry bug reports. | Not reproduced in any automated run; send the steps. |
| Info | Tags cannot be pushed from the build environment, so the restore point is the branch `backup/0.44.1`. | Done (see `BUILD_BACKUP_0.44.1.md`). |

| Fixed | Phone: stuck inside Settings (see-through panel, Close hidden under HUD chips, no route to the main menu). | Fixed in 0.56.0; `scripts/sweep.mjs` now checks it (0.58.0). |

| Fixed | iPhone: game filled only a thin strip after rotating (the fixed container kept its landscape height). | Fixed in 0.59.0: `main.ts` `fitApp()` refits on load, rotation, resize and visual viewport changes. |
| Fixed | Phone: first-fall card covered the HUD chips; desktop key hints shown on touch; menu chip over the wind gauge; LilEye over Thrust. | Fixed in 0.59.0. |

| Fixed | Phone: Music chip over the score line; long Settings page without a bottom exit. | Fixed in 0.60.0 (compact chip, folding sections, Done bar); sweep checks first-fall chips and rotation refit. |
