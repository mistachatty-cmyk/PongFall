# PongFall online release gate

Keep `VITE_PONGFALL_ROOMS_READY=false` until these checks pass in an isolated Supabase project. The URL and anon key are browser-safe; service role keys must never be shipped to Vite or Vercel browser variables.

1. Inspect the project's current Auth settings and all `realtime.messages` policies before enabling anonymous sign-ins. Existing permissive policies on the shared Realtime table can grant access beyond PongFall's room membership check. Review them with:

   ```sql
   select policyname, roles, cmd, qual, with_check
   from pg_policies
   where schemaname = 'realtime' and tablename = 'messages';
   ```

2. Apply `migrations/202610110001_pongfall_rooms_and_saves.sql` to the test project. Enable anonymous Auth there, then set the test URL, anon key, and room flag in a preview deployment.
3. With two browser profiles, check private invite creation/join, public queue joining under simultaneous requests, guest play, LOK email sign-in and one-time guest transfer, and named save sync and deletion. Verify that a third user cannot join the room topic or read another user's profile, history, or saves.
4. Test a dropped Broadcast packet, a simulated state mismatch, a short disconnect, the five-minute public forfeit, and a seven-day invite expiry. A full reload or new-device invite resume still needs state restoration in the client; keep the production room flag off until that behavior is implemented and tested.
5. After the preview passes, set the browser-safe values in Vercel for production, deploy, and check the menu, field manual, jam build, and two-player room on each PongFall domain.
