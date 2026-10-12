// Rooms: a host picks the match, shares a short code, and a friend joins with it. Pure logic over a way to open a Channel for a code.
import { Channel, MatchStart, NetSession, createNetSession } from './lockstep'

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const makeRoomCode = (rnd: () => number = Math.random) => 'PF-' + Array.from({ length: 4 }, () => ALPHA[Math.floor(rnd() * ALPHA.length)]).join('')
export const normalizeRoomCode = (s: string) => {
  const t = s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^PF/, '')
  if (t.length === 10 && /^[A-F0-9]+$/.test(t)) return 'PF-' + t
  return t.length === 4 && [...t].every(c => ALPHA.includes(c)) ? 'PF-' + t : null
}
const newId = () => Math.random().toString(36).slice(2, 10)

export type OpenChannel = (code: string) => Promise<Channel>
export interface RoomEvents {
  onReady(session: NetSession, cfg: MatchStart): void
  onError(message: string): void
  /** The host is waiting: show the code. */
  onWaiting?(code: string): void
}
export interface RoomHandle { cancel(): void }

/** Host: open a room, wait for one friend, then send them the match and start. */
export async function hostRoom(open: OpenChannel, cfg: MatchStart, ev: RoomEvents, code = makeRoomCode()): Promise<RoomHandle> {
  let ch: Channel
  try { ch = await open(code) } catch (e) { ev.onError(e instanceof Error ? e.message : 'Could not open the room.'); return { cancel() { /* nothing open */ } } }
  const me = newId()
  let guest: string | null = null, started = false, done = false
  ch.onMessage(m => {
    if (done || m.t !== 'hello') return
    if (guest === null) guest = m.id
    if (m.id !== guest) { ch.send({ t: 'full', id: me, guest }); return }
    ch.send({ t: 'start', id: me, guest, cfg })        // sent again for every hello, in case the first was lost
    if (!started) { started = true; ev.onReady(createNetSession(ch, me, 0), cfg) }
  })
  ev.onWaiting?.(code)
  return { cancel() { if (!started) { done = true; ch.close() } } }
}

/** Guest: knock on a room until the host answers with the match. */
export async function joinRoom(open: OpenChannel, code: string, ev: RoomEvents, timeoutMs = 20000): Promise<RoomHandle> {
  let ch: Channel
  try { ch = await open(code) } catch (e) { ev.onError(e instanceof Error ? e.message : 'Could not reach the room.'); return { cancel() { /* nothing open */ } } }
  const me = newId()
  let started = false, done = false
  const knock = setInterval(() => { if (!started && !done) ch.send({ t: 'hello', id: me }) }, 800)
  const fail = (msg: string) => { if (started || done) return; done = true; clearInterval(knock); clearTimeout(timer); ch.close(); ev.onError(msg) }
  const timer = setTimeout(() => fail('No room answered to that code. Check it and try again.'), timeoutMs)
  ch.onMessage(m => {
    if (started || done) return
    if (m.t === 'full' && m.guest !== me) fail('That room already has two players.')
    if (m.t === 'start' && m.guest === me) {
      started = true; clearInterval(knock); clearTimeout(timer)
      ev.onReady(createNetSession(ch, me, 1), m.cfg)
    }
  })
  ch.send({ t: 'hello', id: me })
  return { cancel() { if (!started) { done = true; clearInterval(knock); clearTimeout(timer); ch.close() } } }
}
