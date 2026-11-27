// Reports active play time for PongFall to the GSix network so it shows in the hub's Global play time.
// Guest tally only (no sign-in in the standalone build): just the app name and seconds are sent, nothing is stored
// on the device, and browsers sending Global Privacy Control or Do Not Track are skipped. Idle when the hub frames
// the game (the hub counts that minute itself). Never touches src/sim (the simulation stays pure and deterministic).
import { startPlaytimeTracker } from './playtime'

export const PLAYTIME_APP_KEY = 'pongfall'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
let started = false
export function startLokPlaytime(): void {
  // Public browser key of the shared Lok project (same one LokBook ships); an env var overrides it.
  const url = env.VITE_SUPABASE_URL || 'https://jfavkudihasswkhkouxq.supabase.co', key = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ipcGPahvt2-j2YwBFBbvUQ_EJo2WJID'
  if (started || !url || !key) return
  started = true
  startPlaytimeTracker({ appKey: PLAYTIME_APP_KEY, supabaseUrl: url, publishableKey: key, getAccessToken: () => null, countGuests: true })
}
