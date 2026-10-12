import type { Channel, NetMsg } from './lockstep'

/** Two connected in-memory channels with optional latency and loss: used by tests and local trials. `pump(n)` delivers what is due. */
export function memoryPair(opts: { latency?: () => number; drop?: () => boolean } = {}) {
  const subs: [Array<(m: NetMsg) => void>, Array<(m: NetMsg) => void>] = [[], []]
  const queue: Array<{ to: 0 | 1; at: number; m: NetMsg }> = []
  let now = 0
  const mk = (me: 0 | 1): Channel => ({
    send(m) { if (opts.drop?.()) return; queue.push({ to: me === 0 ? 1 : 0, at: now + (opts.latency?.() ?? 0), m: JSON.parse(JSON.stringify(m)) }) },
    onMessage(cb) { subs[me].push(cb) },
    close() { /* nothing to release */ },
  })
  return {
    a: mk(0), b: mk(1),
    /** Advance the fake clock by `dt` and deliver everything that is due, in send order. */
    pump(dt = 1) {
      now += dt
      for (let i = 0; i < queue.length;) {
        if ((queue[i] as { at: number }).at <= now) { const q = queue.splice(i, 1)[0] as { to: 0 | 1; at: number; m: NetMsg }; for (const f of subs[q.to]) f(q.m) } else i++
      }
    },
    clock: () => now,
  }
}
