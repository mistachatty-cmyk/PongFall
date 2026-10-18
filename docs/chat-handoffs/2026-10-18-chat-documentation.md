# Chat handoff — repository documentation habit

Date: 2026-10-18

## Request and reason

The user asked that any chat working in this PongFall repository always create a Markdown record of what it was doing and why, with notes in an updates file. This keeps context and decisions available to later chats without relying on chat history alone.

## What I inspected

- `C:\PongFall\source` is the Git checkout; `C:\PongFall` itself is its parent folder.
- Existing project guidance is in `CLAUDE.md` and historical state is in `HANDOFF.md`.
- `src/changelog.ts` is a player-facing game release log, so it is not the right place for every chat's work notes.
- The checkout was on `claude/friendly-wright-vtwgcm` and already had unrelated uncommitted game changes when this chat started.

## Decision and changes

- Added root `AGENTS.md` so future coding chats see a standing, repo-wide instruction.
- Added `docs/UPDATE_NOTES.md` as a short dated index.
- Added this dated record under `docs/chat-handoffs/` as the first example. Future chats should update their record if they continue over multiple turns, and add one index entry for that chat.
- Kept the instruction focused on factual summaries, reasons, actual checks, unresolved work, and the next action. Private credentials and full chat transcripts should not be copied into repo files.
- No gameplay code or player-facing release notes were changed for this request.

## Checks and state

- Confirmed the checkout path, branch, existing guidance, and pre-existing uncommitted changes before writing these files.
- Documentation-only change; no typecheck or production build was run.
- Next chat should read `AGENTS.md` and `CLAUDE.md`, create its own dated record, and add a brief entry to `docs/UPDATE_NOTES.md` before finishing.
