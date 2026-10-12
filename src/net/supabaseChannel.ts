import type { Channel, NetMsg } from './lockstep'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const onlineConfigured = Boolean(URL && KEY)

/**
 * A room over Supabase Realtime Broadcast (LokServices). Nothing is stored: it only relays messages between the two players.
 * The library is loaded on demand so the offline game does not pay for it.
 */
export async function openSupabaseChannel(code: string): Promise<Channel> {
  if (!URL || !KEY) throw new Error('Online play is not switched on for this site yet.')
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } })
  const ch = client.channel(`pongfall-room-${code}`, { config: { broadcast: { self: false, ack: false } } })
  const subs: Array<(m: NetMsg) => void> = []
  ch.on('broadcast', { event: 'm' }, ({ payload }) => { if (payload && typeof payload === 'object' && typeof (payload as { t?: unknown }).t === 'string') for (const f of subs) f(payload as NetMsg) })
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Could not reach the match server.')), 10000)
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') { clearTimeout(t); resolve() }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(t); reject(new Error('Could not reach the match server.')) }
    })
  })
  return {
    send(m) { void ch.send({ type: 'broadcast', event: 'm', payload: m }) },
    onMessage(cb) { subs.push(cb) },
    close() { void client.removeChannel(ch); client.realtime.disconnect() },
  }
}
