import { createWorld, stepWorld, Command, World, Options } from './world'
import { getResult, GameResult } from './result'
import { SIM_VERSION } from './tuning'

/** Everything needed to re-simulate a run exactly. */
export interface Replay {
  v: number
  mode: string
  modifiers: string[]
  diff: string
  pu: boolean
  seed: number
  opts: Pick<Options, 'target' | 'timeLimit'>
  ticks: number
  commands: Command[]
}

export function recordReplay(w: World): Replay {
  return { v: SIM_VERSION, mode: w.mode.id, modifiers: [...w.modifiers], diff: w.difficulty.id, pu: w.initialUnlocked, seed: w.seed, opts: { target: w.opts.target, timeLimit: w.opts.timeLimit }, ticks: w.tick, commands: w.log.map(c => ({ ...c })) }
}

export const MAX_REPLAY_TICKS = 120 * 60 * 30 // 30 minutes

/** Re-run a replay headlessly. Returns the final world; throws on a version we cannot reproduce. */
export function runReplay(r: Replay): World {
  if (r.v !== SIM_VERSION) throw new Error(`replay version ${r.v} != sim ${SIM_VERSION}`)
  if (r.ticks > MAX_REPLAY_TICKS) throw new Error('replay too long')
  const w = createWorld({ mode: r.mode, modifiers: r.modifiers, difficulty: r.diff, powerUnlocked: r.pu, ...r.opts }, r.seed)
  const cmds = [...r.commands].sort((a, b) => a.t - b.t)
  let i = 0
  while (w.tick < r.ticks && w.status === 'play') {
    while (i < cmds.length && cmds[i]!.t <= w.tick) {
      const c = cmds[i++]!
      w.queue.push(c); w.log.push(c)
    }
    stepWorld(w)
    w.events.length = 0
  }
  return w
}

/** FNV-1a over the result fields a leaderboard cares about; replay and live run must match. */
export function hashResult(r: GameResult): string {
  const s = JSON.stringify([r.mode, r.modifiers, r.difficulty, r.seed, r.version, r.score, r.points, r.durationMs, r.endReason])
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function verifyReplay(r: Replay, claimed: GameResult): boolean {
  try {
    const got = getResult(runReplay(r))
    return !!got && hashResult(got) === hashResult(claimed)
  } catch { return false }
}
