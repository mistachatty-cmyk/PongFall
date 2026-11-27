// Reports active play time for PongFall to the GSix account so it shows in the hub's Global play time and under
// Connected Worlds. Signed in: counted on the account. Signed out: cookieless guest tally (app name and seconds only,
// Global Privacy Control / Do Not Track honoured). Idle when the hub frames the game (the hub counts that minute).
// Never touches src/sim: the simulation stays pure and deterministic.
import { startPlaytimeTracker } from './playtime'
import { accountSession } from '../net/playerAuth'

export const PLAYTIME_APP_KEY = 'pongfall'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
let started = false
export function startLokPlaytime(): void {
  // Public browser key of the shared Lok project (same one LokBook ships); an env var overrides it.
  const url = env.VITE_SUPABASE_URL || 'https://jfavkudihasswkhkouxq.supabase.co'
  const key = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ipcGPahvt2-j2YwBFBbvUQ_EJo2WJID'
  if (started) return
  started = true
  startPlaytimeTracker({
    appKey: PLAYTIME_APP_KEY,
    supabaseUrl: url,
    publishableKey: key,
    getAccessToken: async () => {
      try { const s = await accountSession(); return s && !s.user.is_anonymous ? s.access_token : null } catch { return null }
    },
    countGuests: true,
  })
}
