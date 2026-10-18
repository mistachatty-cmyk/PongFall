# Easter egg ideas

Ideas only; rows marked planned are not active game content.

| Idea | Trigger | Effect | Status |
| --- | --- | --- | --- |
| The old fall | Keep the original whistling falling sound available as the **Classic** profile; later, consider a hidden retro cue or brief sound variation for a secret shaft event. | Audio only; preserve the current Classic and Dynamic settings. | Future idea; trigger and sound design TBD |

- **Seven pokes:** click the menu eye seven times within four seconds and the footer line becomes "The eye would like you to stop poking it. It will remember." (`mainMenu.ts`, `toggleEye`). Lore: the eye keeps count of everyone who tested it.
- **HelloWorld:** type it on the main menu for the cheat menu (device-local tears and dev mode; never synced to a LOK account).
- **The eyes are watching (0.53.0):** type `WATCHME` on the title screen or the menu (not inside a text box). A notice says the eyes are watching, and from then on the background eyes on the title screen follow your cursor. Stored on this device only (`pongfall.egg.watching`), render-only; Settings > Eyes follow the cursor and Reduce Motion still switch it off. (`core/watchingEgg.ts`, `main.ts`, `introScreen.ts`.)
