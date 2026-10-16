import type { Channel, MatchStart, NetMsg, RoomState } from './lockstep'
import { parseOpenRooms, type OpenRoom } from './openRooms'
import { onlineConfigured, playerClient } from './playerAuth'
import { createWorld } from '../sim/world'
import { recordReplay, type Replay } from '../sim/replay'
export { onlineConfigured } from './playerAuth'

export interface RoomRow extends RoomState {
  id: string; code: string; topic: string; kind: 'invite' | 'public'
  config: MatchStart; host_id: string; guest_id: string | null
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
export const createListedRoom = (config: MatchStart) => rpcRoom('pf_create_listed_room', { p_config: config })
/** Open, listed matches other players are waiting in. Rejects with the server's message (see isMissingFunction when the update is not applied yet). */
export async function listOpenRooms(mode?: string): Promise<OpenRoom[]> {
  const client = await playerClient()
  const { data, error } = await client.rpc('pf_list_open_rooms', { p_mode: mode ?? null })
  if (error) throw new Error(error.message)
  return parseOpenRooms(data)
}
export const enterPublicQueue = (mode: string) => rpcRoom('pf_public_queue', { p_mode: mode })
export async function cancelRegisteredRoom(id: string): Promise<void> {
  const client = await playerClient()
  const { error } = await client.rpc('pf_cancel_room', { p_id: id })
  if (error) throw new Error(error.message)
}

export async function roomForPlayer(code: string): Promise<{ room: RoomRow; side: 0 | 1; returning: boolean }> {
  const client = await playerClient()
  const user = (await client.auth.getSession()).data.session?.user
  if (!user) throw new Error('Your player session expired.')
  // A member can see the room before joining. New guests cannot, so the
  // pre-join row also distinguishes an existing match from a first join.
  const { data: previous } = await client.from('pf_rooms').select('id,guest_id').eq('code', code).maybeSingle()
  const room = await joinRegisteredRoom(code)
  const side: 0 | 1 = room.host_id === user.id ? 0 : 1
  return { room, side, returning: side === 0 ? !!room.guest_id : previous?.guest_id === user.id }
}

/** Private Broadcast channel; the database permits only the two room members. */
export async function openSupabaseChannel(code: string): Promise<Channel> {
  if (!onlineConfigured) throw new Error('Online play is not switched on for this site yet.')
  const client = await playerClient()
  const room = await joinRegisteredRoom(code)
  const session = (await client.auth.getSession()).data.session
  if (!session) throw new Error('Your player session expired. Try joining again.')
  const ownName = session.user.is_anonymous
    ? `Guest ${session.user.id.slice(0, 4).toUpperCase()}`
    : String(session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'LOK Player')
  const { data: namedRoom, error: nameError } = await client.rpc('pf_set_room_name', { p_id: room.id, p_name: ownName })
  if (nameError) throw new Error(`Could not set your room name: ${nameError.message}`)
  client.realtime.setAuth(session.access_token)
  const ch = client.channel(room.topic, { config: { private: true, broadcast: { self: false, ack: false } } })
  const subs: Array<(m: NetMsg) => void> = []
  const roomSubs: Array<(s: RoomState) => void> = []
  let latestRoom: RoomState = namedRoom as RoomRow
  const publishRoom = (data: RoomRow) => { latestRoom = data; roomSubs.forEach(f => f(data)) }
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
      if (data && typeof (data as RoomRow).status === 'string') publishRoom(data as RoomRow)
    }).catch(() => { /* retry on the next heartbeat */ })
  }
  touch()
  const heartbeat = window.setInterval(touch, 3000)
  return {
    send(m) { void ch.send({ type: 'broadcast', event: 'm', payload: m }) },
    onMessage(cb) { subs.push(cb) },
    onRoomState(cb) { roomSubs.push(cb); cb(latestRoom) },
    async saveCheckpoint(replay: Replay, hash: number) {
      const { error } = await client.rpc('pf_save_checkpoint', { p_id: room.id, p_replay: replay, p_hash: hash })
      if (error) throw new Error(error.message)
    },
    async loadCheckpoint() {
      const { data, error } = await client.rpc('pf_load_checkpoint', { p_id: room.id })
      if (error) throw new Error(error.message)
      if (data) return data as Replay
      const cfg = room.config
      return recordReplay(createWorld({ mode: cfg.mode, difficulty: cfg.difficulty, arenas: cfg.arenas, flux: cfg.flux, target: cfg.target, timeLimit: cfg.timeLimit }, cfg.seed))
    },
    async beginRecovery() {
      const { data, error } = await client.rpc('pf_begin_recovery', { p_id: room.id })
      if (error) throw new Error(error.message)
      publishRoom(data as RoomRow)
    },
    async ackRecovery(epoch: number) {
      const { data, error } = await client.rpc('pf_ack_recovery', { p_id: room.id, p_epoch: epoch })
      if (error) throw new Error(error.message)
      publishRoom(data as RoomRow)
    },
    close() { window.clearInterval(heartbeat); void client.removeChannel(ch) },
  }
}
