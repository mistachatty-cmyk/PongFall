# Automatic translation (every word on screen, all 8 languages)

Any text the game shows is translated without anyone registering it. Usernames, room codes, links and other things players type are never translated.

## How it works
1. **Runtime** (`src/core/autoL10n.ts`, pure helpers in `autoL10nCore.ts`): when the language is not English, a `MutationObserver` walks the page and swaps text nodes and `aria-label`, `title`, `placeholder`, `alt` for their translation, and a small wrapper around `fillText`, `strokeText` and `measureText` does the same for text drawn on canvases (menu plaques, HUD, banners). Only text that is **in the catalogue** changes, so a username that is not a catalogue sentence can never be translated. `translate="no"`, `.notranslate` and `data-l10n-skip` skip a whole element (the language picker uses it).
2. **Catalogue** (`public/locales/auto/en.json`): key = hash of the text on screen with numbers replaced by `{{n0}}`, `{{n1}}`, value = the English sent to the translator. The other seven languages sit beside it (`es fr de pt-BR ja ko zh-CN`) and are fetched on demand, so the app bundle does not grow. A failed or broken translation (lost number) falls back to English.
3. **Standalone pages** (`public/rules.html`, `about.html`) include `/l10n-page.js` (built from `src/l10nPage.ts`), the same runtime and catalogue.
4. **Harvest** (no hand editing):
   - `scripts/scan-strings.ts` reads the source for sentences and labels (and the changelog, rules and dev notes pages).
   - `scripts/crawl-strings.ts` opens the built game in Chromium with `?l10n=record`, visits every screen (menu, every sign and object, classic menu, pause world and its pages, end of a match, lab, versus, duo, rules, dev notes) and merges every string the runtime saw, canvas text included.
   - Both only ever add; `tsx scripts/scan-strings.ts --prune` rebuilds from the source if the catalogue should shrink.
5. **Translate**: `l10n.auto.config.json` + the vendored CLI. `.github/workflows/auto-l10n.yml` runs build -> scan -> crawl -> translate -> commit on every push that touches `src/**` or the static pages, and every 6 hours to finish rate-limited runs. The lock file (`public/locales/auto/.l10n-lock.json`) means a hand-fixed translation is kept.

## Writing text so it translates well
- Write whole sentences with only **numbers** varying (`Score to win: 14`). Numbers are handled for you.
- Text built from a name or another word (`"Hello " + name`, `` `${verb} the ball` ``) is not a catalogue sentence and stays English; use `t()` with `{{name}}` placeholders (`src/locales/en.json`) when the wording must be exact.
- Words that must never be translated go in `glossary` (`l10n.auto.config.json`). Player-chosen text needs nothing: it is not in the catalogue.
- The noun "fall" (a run of the game) is sent to translators as "descent" (`translationHint`), because machine translators read it as the season. Verbs and glossary names (Solo Fall, Duo Fall) are untouched.

## Checks
`pnpm test` runs `autoL10nCore.test.ts` (keys, numbers, names untouched, fallback) and `autoCatalog.test.ts` (well-formed catalogue, translations keep their numbers, no stray keys, coverage). `node lib/auto-l10n/bin/auto-translate.js check --config l10n.auto.config.json` reports missing strings per language.
