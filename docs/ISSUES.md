# Known issues (0.44.2)

Found by `scripts/sweep.mjs` (desktop, phone, reduced motion, both menu styles, 7 themes x 7 languages: no console errors, failed requests or overflow) and by looking at screenshots.

| Severity | Issue | Status |
|---|---|---|
| Medium | Machine translation of one-word UI labels was wrong (Chill became "Login" in Japanese, Mode became "Menu"). | Fixed in 0.44.2: difficulty and mode names are kept as names, MODE and DIFFICULTY carry a hint, shouted text stays shouted. |
| Medium | Some long sentences read badly in ja (the menu footer line). Machine translation. | Open: hand-fix in `public/locales/auto/ja.json` (the lock file keeps it). |
| Low | The server function `lok_supporter_feed` is missing: a 404 shows in the console. The game works without it. | Owner: apply the SQL, or remove the call. |
| Low | The fog shader reports "GPU stall due to ReadPixels" once in Chromium software rendering. | Open: check the readback is not per frame on real GPUs. |
| Low | End-of-match: the centre "You win / Draw" banner from the original outro sits over the Play-again ball. | Open: hide the banner when the world dialog is on, or move the ball. |
| Low | The Door page shows the Settings chip of the original menu on top of its own header. | Open. |
| Unknown | PongPainter "broken" and Retry bug reports. | Not reproduced in any automated run; send the steps. |
| Info | Tags cannot be pushed from the build environment, so the restore point is the branch `backup/0.44.1`. | Done (see `BUILD_BACKUP_0.44.1.md`). |
