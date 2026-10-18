# PongFall repository notes for every chat

Read `CLAUDE.md` for game and engineering rules before editing code. This file sets the documentation habit for work in this repository.

For **every chat that works in this repository**, create or update a Markdown record in `docs/chat-handoffs/` and add one dated entry to `docs/UPDATE_NOTES.md` before ending the chat. Do this for code, design, research, debugging, documentation, and read-only investigations. If no files changed, record that explicitly. Keep the notes current when the chat continues later; do not make a duplicate for every turn.

Each chat record must include:

1. Date, a short subject, and the request or goal in plain language.
2. What you inspected or worked on, including the relevant paths.
3. The reason for the chosen approach and any important decisions or tradeoffs.
4. What changed, with paths and commit IDs if applicable; say “none” when appropriate.
5. Checks performed and their results. Distinguish checks actually run from checks still needed.
6. Current state, unfinished work, risks or open questions, and the next useful action.

Use `YYYY-MM-DD-short-topic.md` for new files. If another chat on the same date uses the same topic, add a short distinguishing suffix. The updates note is a compact index entry linking to the full chat record; keep newest entries first. Write factual notes from observed code and tools. Label assumptions and unverified claims. Do not copy passwords, tokens, private account data, or long chat transcripts into the repository.

When an existing handoff or design doc becomes stale, add a pointer to the newer record or update the relevant claim. Do not erase useful history. Documentation for a chat is separate from the player-facing changelog in `src/changelog.ts`; only update that changelog when the game release itself changes.
