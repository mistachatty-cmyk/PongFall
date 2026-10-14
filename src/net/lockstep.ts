// Online play by lockstep: both machines run the same deterministic sim from the same seed and only trade player input.
// Each local input is stamped DELAY ticks in the future so the other side has it in time; a tick only runs once the other
// side has promised it has no more input for that tick. Pure logic over a Channel, so it is tested with an in-memory pair.
import { Command, CommandInput, SideIndex, World } from '../sim/world'
import { recordReplay, runReplay, type Replay } from '../sim/replay'

export interface RoomState {
  status: 'waiting' | 'live' | 'paused' | 'forfeit' | 'abandoned'
  recovery_epoch: number
  recovery_tick: number
  recovery_hash: number | null
  host_name?: string
  guest_name?: string
}

export interface Channel {
  send(msg: NetMsg): void
  onMessage(cb: (m: NetMsg) => void): void
  onRoomState?(cb: (s: RoomState) => void): void
  saveCheckpoint?(replay: Replay, hash: number): Promise<void>
  loadCheckpoint?(): Promise<Replay>
  beginRecovery?(): Promise<void>
  ackRecovery?(epoch: number): Promise<void>
  close(): void
}

export type NetMsg =
  | { t: 'hello'; id: string }
  | { t: 'start'; id: string; guest: string; cfg: MatchStart }
  | { t: 'full'; id: string; guest: string }
  | { t: 'b'; id: string; e: number; seq: number; r: number; cmds: Command[] }
  | { t: 'a'; id: string; e: number; seq: number }
  | { t: 'h'; id: string; e: number; tick: number; hash: number }       // state hash for desync detection
  | { t: 'rm'; id: string; seed: number }                    // rematch request (the host's seed wins)
  | { t: 'bye'; id: string }

export interface MatchStart { mode: string; difficulty: string; arenas: number; flux: boolean; target: number; timeLimit: number; seed: number }

export type NetStatus = 'live' | 'waiting' | 'lost' | 'desync' | 'left' | 'forfeit' | 'abandoned'

export const NET_DELAY = 20          // ticks (about 170 ms): input is applied this far in the future on both machines
export const NET_BATCH = 6           // ticks between batches (about 20 messages a second)
const HASH_EVERY = 120
const LOST_MS = 6000

/** A cheap fingerprint of the parts of the world that must match on both machines. */
export function stateHash(w: World): number {
  let h = 2166136261 ^ w.tick
  const mix = (x: number) => { h = Math.imul(h ^ (Math.round(x * 1000) | 0), 16777619) >>> 0 }
  for (const s of w.sides) { mix(s.score); mix(s.paddleY); mix(s.glassHits); mix(s.cracksTaken); mix(s.tearsCollected); mix(s.powerBalls); mix(s.paddleSwipes); mix(s.heatSwipes); mix(s.breezeSwipes); mix(s.swipeReadyTick); mix(s.ta); mix(s.fa) }
  mix(w.tearsHeld); mix(w.tearsHeld2); mix(w.manualUntil); mix(w.manualUntil2)
  mix(w.satSaved); mix(w.satFallen)
  for (const s of w.sats) mix(s.lastWinner ?? -1)
  for (const b of w.balls) { mix(b.x); mix(b.y); mix(b.vx); mix(b.vy); mix(b.swipeMod ?? 0) }
  mix(w.scale); mix(w.fallV)
  return h >>> 0
}

const ALLOWED = new Set(['move', 'thrust', 'power', 'flip', 'tilt', 'aim', 'tear', 'slice', 'swipe'])

export interface NetSession {
  readonly side: SideIndex
  /** Send a local command: it takes effect DELAY ticks from now on both machines. */
  submit(w: World, c: CommandInput): void
  /** Call before every sim step. Queues this tick's commands and returns false while we are waiting for the opponent. */
  beforeStep(w: World, nowMs: number): boolean
  status(): NetStatus
  /** Ask for a rematch; onRematch fires on both machines with the new seed once both asked. */
  requestRematch(seed: number): void
  onRematch(cb: (seed: number) => void): void
  onStatus(cb: (s: NetStatus) => void): void
  /** Called with the restored world before this room resumes ticking. */
  onRecovery(cb: (world: World) => void): void
  playerNames(): [string, string]
  /** Forget everything for a new match (after a rematch). */
  restart(): void
  leave(): void
}

export function createNetSession(ch: Channel, me: string, side: SideIndex, delay = NET_DELAY, nowMs = () => performance.now()): NetSession {
  const other: SideIndex = side === 0 ? 1 : 0
  let status: NetStatus = 'waiting'
  let local = new Map<number, Command[]>(), remote = new Map<number, Command[]>()
  let outbox: Command[] = []
  let nextSeq = 0, expectedSeq = 0, lastRetry = 0
  const unacked = new Map<number, Extract<NetMsg, { t: 'b' }>>()
  const pending = new Map<number, Extract<NetMsg, { t: 'b' }>>()
  let remoteComplete = delay - 1
  let lastBatchTick = -NET_BATCH
  let lastHeard = nowMs()
  let epoch = 0                                // bumps on every rematch so late messages from the last match are ignored
  let recoveryEpoch = 0, roomPaused = false, recoveryBusy = false, recoveryAttempts = 0
  let recoveryState: RoomState | null = null
  let playerNames: [string, string] = ['Guest 1', 'Guest 2']
  let recoveryHandler: ((world: World) => void) | null = null
  let lastCheckpointAt = -Infinity, checkpointBusy = false
  const hashes = new Map<number, number>(), peerHashes = new Map<number, number>()
  const statusSubs: Array<(s: NetStatus) => void> = [], rematchSubs: Array<(seed: number) => void> = []
  let myRematch: number | null = null, theirRematch: number | null = null

  const setStatus = (s: NetStatus) => { if (s !== status) { status = s; statusSubs.forEach(f => f(s)) } }
  const recover = async () => {
    if (recoveryBusy || !recoveryHandler || !recoveryState || !ch.loadCheckpoint || !ch.ackRecovery) return
    const state = recoveryState
    if (state.recovery_epoch <= recoveryEpoch) return
    recoveryBusy = true
    roomPaused = true
    setStatus('lost')
    try {
      const replay = await ch.loadCheckpoint()
      if (replay.ticks !== state.recovery_tick) throw new Error('Checkpoint tick changed')
      const restored = runReplay(replay)
      if (state.recovery_hash !== null && stateHash(restored) !== state.recovery_hash) throw new Error('Checkpoint hash mismatch')
      // A second recovery request may supersede this one while the replay loads.
      if (recoveryState?.recovery_epoch !== state.recovery_epoch) return
      recoveryHandler(restored)
      recoveryEpoch = state.recovery_epoch
      epoch = recoveryEpoch * 1000000
      local = new Map(); remote = new Map(); outbox = []
      nextSeq = expectedSeq = 0; unacked.clear(); pending.clear(); lastRetry = 0
      remoteComplete = restored.tick + delay - 1
      lastBatchTick = restored.tick - NET_BATCH
      hashes.clear(); peerHashes.clear(); myRematch = theirRematch = null
      lastHeard = nowMs(); lastCheckpointAt = -Infinity
      await ch.ackRecovery(recoveryEpoch)
    } catch {
      setStatus('desync')
    } finally {
      recoveryBusy = false
      if (recoveryState && recoveryState.recovery_epoch > recoveryEpoch) void recover()
    }
  }
  ch.onRoomState?.(s => {
    recoveryState = s
    playerNames = [s.host_name || 'Guest 1', s.guest_name || 'Guest 2']
    if (s.status === 'forfeit' || s.status === 'abandoned') { setStatus(s.status); return }
    roomPaused = s.status === 'paused'
    if (s.recovery_epoch > recoveryEpoch) { roomPaused = true; void recover(); return }
    if (roomPaused) setStatus('lost')
    else if (status === 'lost' && s.status === 'live') setStatus('waiting')
  })
  const put = (m: Map<number, Command[]>, c: Command) => { const a = m.get(c.t); if (a) a.push(c); else m.set(c.t, [c]) }
  const checkHash = (tick: number) => {
    const a = hashes.get(tick), b = peerHashes.get(tick)
    if (a !== undefined && b !== undefined) {
      if (a !== b) {
        if (ch.beginRecovery && recoveryAttempts++ < 1) {
          roomPaused = true; setStatus('lost')
          void ch.beginRecovery().catch(() => setStatus('desync'))
        } else setStatus('desync')
      }
      hashes.delete(tick); peerHashes.delete(tick)
    }
  }
  const maybeRematch = () => {
    if (myRematch !== null && theirRematch !== null) {
      const seed = side === 0 ? myRematch : theirRematch     // the host's seed wins
      myRematch = theirRematch = null
      rematchSubs.forEach(f => f(seed))
    }
  }

  ch.onMessage(m => {
    if (m.t !== 'b' && m.t !== 'a' && m.t !== 'h' && m.t !== 'rm' && m.t !== 'bye') return
    if (m.id === me) return
    lastHeard = nowMs()
    if (status === 'lost') setStatus('live')
    if ((m.t === 'b' || m.t === 'a' || m.t === 'h') && m.e !== epoch) return
    if (m.t === 'b') {
      if (Number.isSafeInteger(m.seq) && m.seq >= expectedSeq && m.seq < expectedSeq + 128) pending.set(m.seq, m)
      // Only contiguous batches can advance the safe tick. Later batches wait for a retry.
      while (pending.has(expectedSeq)) {
        const batch = pending.get(expectedSeq)!
        pending.delete(expectedSeq++)
        for (const c of batch.cmds) {
          if (!ALLOWED.has(c.k) || !('side' in c) || c.side !== other || c.t < batch.r || !Number.isFinite(c.t)) continue
          put(remote, c)
        }
        remoteComplete = Math.max(remoteComplete, batch.r + delay - 1)
      }
      ch.send({ t: 'a', id: me, e: epoch, seq: expectedSeq - 1 })
      if (status === 'waiting') setStatus('live')
    } else if (m.t === 'a') { for (const seq of unacked.keys()) if (seq <= m.seq) unacked.delete(seq) }
    else if (m.t === 'h') { peerHashes.set(m.tick, m.hash); checkHash(m.tick) }
    else if (m.t === 'rm') { theirRematch = m.seed; maybeRematch() }
    else if (m.t === 'bye') setStatus('left')
  })

  return {
    side,
    submit(w, c) {
      const cmd = { ...c, t: w.tick + delay } as Command
      put(local, cmd); outbox.push(cmd)
    },
    beforeStep(w, now) {
      if (status === 'left' || status === 'desync' || status === 'forfeit' || status === 'abandoned') return false
      if (roomPaused || recoveryBusy || (recoveryState && recoveryState.recovery_epoch > recoveryEpoch)) return false
      if (side === 0 && ch.saveCheckpoint && now - lastCheckpointAt >= 3000 && !checkpointBusy) {
        lastCheckpointAt = now; checkpointBusy = true
        void ch.saveCheckpoint(recordReplay(w), stateHash(w)).catch(() => { /* next checkpoint retries */ }).finally(() => { checkpointBusy = false })
      }
      // batch out: new input plus "I am at tick r" (which promises nothing earlier than r + delay is still to come)
      if (w.tick - lastBatchTick >= NET_BATCH) {
        const batch: Extract<NetMsg, { t: 'b' }> = { t: 'b', id: me, e: epoch, seq: nextSeq++, r: w.tick, cmds: outbox }
        ch.send(batch); unacked.set(batch.seq, batch); outbox = []; lastBatchTick = w.tick
      }
      if (now - lastRetry >= 350) { for (const batch of unacked.values()) ch.send(batch); lastRetry = now }
      if (w.tick > 0 && w.tick % HASH_EVERY === 0 && !hashes.has(w.tick)) { const h = stateHash(w); hashes.set(w.tick, h); ch.send({ t: 'h', id: me, e: epoch, tick: w.tick, hash: h }); checkHash(w.tick) }
      if (w.tick > remoteComplete) {
        if (now - lastHeard > LOST_MS) setStatus('lost')
        else if (status === 'live' && now - lastHeard > 400) setStatus('waiting')
        return false
      }
      if (status === 'waiting' || status === 'lost') setStatus('live')
      // apply this tick's commands, side 0 first so both machines use the same order
      const mine = local.get(w.tick) ?? [], theirs = remote.get(w.tick) ?? []
      const [a, b] = side === 0 ? [mine, theirs] : [theirs, mine]
      for (const c of [...a, ...b]) { w.queue.push(c); w.log.push(c) }
      local.delete(w.tick); remote.delete(w.tick)
      return true
    },
    status: () => status,
    requestRematch(seed) { myRematch = seed; ch.send({ t: 'rm', id: me, seed }); maybeRematch() },
    onRematch: cb => { rematchSubs.push(cb) },
    onStatus: cb => { statusSubs.push(cb) },
    onRecovery: cb => { recoveryHandler = cb; void recover() },
    playerNames: () => playerNames,
    restart() { epoch++; local = new Map(); remote = new Map(); outbox = []; nextSeq = expectedSeq = 0; unacked.clear(); pending.clear(); lastRetry = 0; remoteComplete = delay - 1; lastBatchTick = -NET_BATCH; hashes.clear(); peerHashes.clear(); myRematch = theirRematch = null; lastHeard = nowMs(); lastCheckpointAt = -Infinity; recoveryAttempts = 0; status = 'live' },
    leave() { try { ch.send({ t: 'bye', id: me }) } catch { /* closing */ } status = 'left'; ch.close() },
  }
}
