# PongFall social design: friends, recent players, chat

One plan for everything social, so the pieces share one identity model, one safety model and one set of server tables. Nothing here is built yet except the open-match browser (0.34.0, needs the SQL in `supabase/migrations/20261016000100_pf_match_browser.sql`). Matches stay unranked and never pay LokTokens; social features must not change that.

## Principles

1. **Opt-in and quiet.** No one is contacted, listed or shown to others unless they chose to be. Guests can play and be listed as "A player" but cannot friend or chat.
2. **One identity.** A LOK account (the GSix session used by the hub) is the only identity that can friend or chat. Guest sessions are anonymous Supabase users and stay out of social tables.
3. **The server never needs to read chat.** Messages are end-to-end encrypted; the owner and the database can store and route ciphertext but cannot read it. That is a promise we can only keep by design, so it needs a security review before it ships (see "Chat" below).
4. **Small blast radius.** Every action is rate limited, every list is capped, every string is cleaned on the way in and on the way out (same habit as the `cos` look message and `parseOpenRooms`).
5. **Report and block first.** Anything that lets one player reach another ships with block, mute and report in the same release.

## Identity and profile

- Display name: the GSix username, cleaned to letters, digits, space and `_ . ' ’ -`, at most 24 characters (same rule as `parseOpenRooms`).
- Profile picture: the LOK account picture. It is shown to friends and in the stats banner only if the player turns on "Show my picture to friends"; default off. Opponents in a match see the silhouette today (`core/profilePicture.ts`); that stays the default.
- A short public **tag** (4 letters/digits, unique per name) lets two players with the same name be told apart and lets someone add a friend by `Name#TAG`.
- Sync with gsix.online: the hub owns the account; PongFall reads name and picture through the existing shared session and never writes them.

## Recent players

What it is: the last 20 people you played an online match with, so you can add one as a friend, block them or report them without having traded codes.

- Table `pf_recent_players(user_id, other_id, other_name, last_played, matches)`, written by the server when a room goes `live` (not by the client, so it cannot be forged). RLS: a row is readable only by `user_id`. Retention: 30 days, trimmed by a scheduled job.
- Shown only for LOK accounts on both sides; guest opponents show as "Guest" with no actions.
- UI: a "Recent players" list on the Multiplayer page and on the end-of-match panel for online matches ("Add friend", "Block", "Report").

## Friends

- Table `pf_friendships(a, b, status, created_at)` with `a < b` stored once, status `pending | accepted | blocked_by_a | blocked_by_b`.
- Requests: from recent players or by `Name#TAG`. A request expires after 14 days. At most 5 pending outgoing requests and 100 friends per account.
- Friends see: online presence (green dot while the menu or a match is open; an "invisible" toggle hides it), the current mode if in a match, and the chosen picture.
- Join a friend: a friend who is waiting in a listed or invite room shows a **Join** button (the same `pf_join_room` path as the open-match browser; the code is never shown or typed).
- Presence stays cheap: each client writes only its own status (a row updated every 20 seconds while the menu or a match is open) and reads its friends' statuses through a `pf_friend_status()` function. Nobody subscribes to a stranger's channel.

## Chat

Two kinds, one engine: **direct messages between friends** and a short **in-match quip wheel** (preset lines only, no free text, safe for online matches).

Direct messages:

- End-to-end encrypted with per-conversation keys. Each device generates an X25519 key pair on first use; the public key is uploaded to `pf_device_keys`; the private key never leaves the device (stored in IndexedDB, non-extractable). Messages are encrypted with a shared secret from X25519 and sent as ciphertext through `pf_messages(id, conversation, sender, ciphertext, sent_at)`. The server sees who talked to whom and when, never what.
- Consequences to accept up front: lose the device and you lose the history; there is no "forgot password" for chat; moderators cannot read messages. Reports therefore work by **the reporter attaching the last 20 messages** to the report, re-encrypted to the moderation key, so a report is the only way a message is ever readable to us.
- Limits: 10 messages per minute per sender, 500 characters, no links rendered as links (plain text only), no images in v1.
- On-site and in-game: the same conversation list appears in the hub (gsix.online) and in PongFall; the hub owns the inbox page, PongFall embeds a compact panel.
- **Security review before it ships.** The first release is friends + recent players only. Chat waits for an outside review of the key handling and of the report flow.

Quip wheel (in match): eight preset lines (GG, Nice save, Oops, Rematch?, Good luck, Close one, Thanks, Ready). Sent as a tiny `cos`-style message beside the input stream, never part of the lockstep hash, rate limited to one per 3 seconds, can be muted per match.

## Moderation, safety and privacy

- Block: hides you from them everywhere (presence, recent players, friend requests, quip wheel), keeps no message history on the server beyond ciphertext already sent.
- Mute: hides their quips and messages on your side only.
- Report: reasons (harassment, hate, cheating, spam, other) with an optional note; stored in `pf_reports` with reporter, reported, room code and the attached encrypted excerpt. Reviewed by the owner or a delegate from an admin page in the hub.
- Rate limits live in the database functions, not the client, and escalate (temporary mute) on repeated reports.
- Children: the game is for everyone; chat and friend requests are off until an account confirms it is 13+ in the hub profile, and can be switched off entirely in Settings.
- Data: export and delete follow the hub's account export; deleting an account removes friendships, keys and messages.

## Retention (why a player comes back)

- A friend is waiting to play (Join button), a friend beat your record (stats banner), a seasonal event starts (the dev-only centre line and layer-2 object drops already follow the season), LilEye notices a friend came online.
- Nothing nags: no push, no email from PongFall; the hub's own notification settings decide.

## Build order

1. Open-match browser (done in 0.34.0, pending the SQL).
2. Recent players + block/report (server-written, read-only list).
3. Friends + presence + Join.
4. Quip wheel.
5. Security review, then direct messages (on-site first, then in-game).

## Server tables (sketch, not applied)

`pf_recent_players`, `pf_friendships`, `pf_device_keys`, `pf_messages`, `pf_blocks`, `pf_reports`. All have RLS where a row is visible only to the people in it. All writes go through `security definer` functions that check `auth.uid()`, caps and rate limits, following the pattern in `supabase/migrations/20261011000100_pongfall_rooms_and_saves.sql`.

## Open questions for the owner

- Do friends and chat need an age gate beyond the hub's account age field?
- Who moderates reports (you, a delegate, or an outside service)?
- Should friends be shared across the whole LOK ecosystem (one friend graph for 616 Survivor, Kinetic Souls and PongFall) rather than per game? Recommended: yes, hosted by the hub, with PongFall reading it.
