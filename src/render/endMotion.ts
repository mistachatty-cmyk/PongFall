// The arena's motion after a match ends. Render only; never read by the sim.
// A banked win whose arena never grew big enough to stop the fall really does fall: it hangs on the cord while the choice is
// open, then plunges out of sight. If the fall had stopped (the arena ground against the walls) it holds instead.
export interface EndMotionIn { over: boolean; stopped: boolean; holding: boolean; reduce: boolean; now: number; plungeAt: number }
export interface EndMotionOut { offset: number; plungeAt: number; plunging: boolean }

export const PLUNGE_ACCEL = 140   // px/s^2 (the same pull the old ending used)

export function endMotion(i: EndMotionIn): EndMotionOut {
  const plunging = i.over && !i.stopped && !i.holding
  if (!plunging) return { offset: 0, plungeAt: 0, plunging: false }
  const plungeAt = i.plungeAt || i.now
  const s = Math.max(0, (i.now - plungeAt) / 1000)
  return { offset: i.reduce ? 0 : PLUNGE_ACCEL * s * s, plungeAt, plunging: true }
}
