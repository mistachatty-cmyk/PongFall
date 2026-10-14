import type { Channel, MatchStart, NetMsg } from './lockstep'
import { onlineConfigured, playerClient } from './playerAuth'
export { onlineConfigured } from './playerAuth'

interface RoomRow {
  id: string; code: string; topic: string; kind: 'invite' | 'public'
  config: MatchStart; host_id: string; guest_id: string | null
  status: string
}

async function rpcRoom(name: string, args: Record<string, unknown>): Promise<RoomRow> {
  const client = await playerClient()
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(error.message)
  if (!data || typeof data.code !== 'string' || typeof data.topic !== 'string') throw new Error('Room server returned an invalid room.')
  return data as RoomRow
}

export const createInviteRoom = (config: MatchStart) => rpcRoom('pf_create_room', { p_config: config })
export const joinRegisteredRoom = (code: string) => rpcRoom('pf_join_room', { p_code: code })
export const enterPublicQueue = (mode: string) => rpcRoom('pf_public_queue', { p_mode: mode })

/** Private Broadcast channel; the database permits only the two room members. */
export async function openSupabaseChannel(code: string): Promise<Channel> {
  if (!onlineConfigured) throw new Error('Online play is not switched on for this site yet.')
  const client = await playerClient()
  const room = await joinRegisteredRoom(code)
  const session = (await client.auth.getSession()).data.session
  if (!session) throw new Error('Your player session expired. Try joining again.')
  client.realtime.setAuth(session.access_token)
  const ch = client.channel(room.topic, { config: { private: true, broadcast: { self: false, ack: false } } })
  const subs: Array<(m: NetMsg) => void> = []
  const roomSubs: Array<(s: 'live' | 'paused' | 'forfeit' | 'abandoned') => void> = []
  ch.on('broadcast', { event: 'm' }, ({ payload }) => {
    if (payload && typeof payload === 'object' && typeof (payload as { t?: unknown }).t === 'string') for (const f of subs) f(payload as NetMsg)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Could not reach the match server.')), 10000)
      ch.subscribe(status => {
        if (status === 'SUBSCRIBED') { window.clearTimeout(timer); resolve() }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          window.clearTimeout(timer)
          reject(new Error('The private room could not be opened.'))
        }
      })
    })
  } catch (error) {
    // A failed channel must not keep a Realtime socket registered in the client.
    await client.removeChannel(ch)
    throw error
  }
  const touch = () => {
    void Promise.resolve(client.rpc('pf_touch_room', { p_id: room.id })).then(({ data, error }) => {
      // A transient request failure is recovered by the next heartbeat. The
      // lockstep input watchdog independently freezes play while the peer is absent.
      if (error) return
      const status = (data as RoomRow | null)?.status
      if (status === 'live' || status === 'paused' || status === 'forfeit' || status === 'abandoned') roomSubs.forEach(f => f(status))
    }).catch(() => { /* retry on the next heartbeat */ })
  }
  touch()
  const heartbeat = window.setInterval(touch, 15000)
  return {
    send(m) { void ch.send({ type: 'broadcast', event: 'm', payload: m }) },
    onMessage(cb) { subs.push(cb) },
    onRoomState(cb) { roomSubs.push(cb) },
    close() { window.clearInterval(heartbeat); void client.removeChannel(ch) },
  }
}
