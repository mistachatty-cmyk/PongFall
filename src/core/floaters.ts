// Floaters: small objects that drift down the menu like everything else in the shaft, and can be grabbed, spun and tossed.
// Pure physics here (stepping, throwing), the DOM in floatersView.ts. Render-only: it never touches the sim.
export interface Body { x: number; y: number; vx: number; vy: number; ang: number; av: number; w: number; h: number }
export interface Bounds { w: number; h: number }
export interface Sample { x: number; y: number; t: number }

export const FALL_SPEED = 16        // px/s: the slow fall every floater settles into
export const MAX_SPEED = 1800       // px/s, so a wild flick cannot teleport it
export const MAX_SPIN = 9           // rad/s

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** One physics step. Drift down, shed speed gently, bounce off the sides, wrap from the bottom back to the top. */
export function stepBody(b: Body, dt: number, bounds: Bounds, still = false): Body {
  if (still) return { ...b, vx: 0, vy: 0, av: 0 }
  const drag = Math.exp(-0.9 * dt), spinDrag = Math.exp(-0.7 * dt)
  let vx = b.vx * drag
  let vy = FALL_SPEED + (b.vy - FALL_SPEED) * drag
  let av = b.av * spinDrag + Math.sin(b.ang) * -0.15 * dt                  // a faint pull back toward upright
  let x = b.x + vx * dt, y = b.y + vy * dt
  const halfW = b.w / 2, halfH = b.h / 2
  if (x < halfW) { x = halfW; vx = Math.abs(vx) * 0.6; av = -av * 0.5 }
  else if (x > bounds.w - halfW) { x = bounds.w - halfW; vx = -Math.abs(vx) * 0.6; av = -av * 0.5 }
  if (y < halfH) { y = halfH; vy = Math.abs(vy) * 0.5 }                     // a toss upward bounces off the top
  if (y > bounds.h + halfH) { y = -halfH; vy = FALL_SPEED }                 // fell out the bottom: it comes back in from the top
  return { x, y, vx: clamp(vx, -MAX_SPEED, MAX_SPEED), vy: clamp(vy, -MAX_SPEED, MAX_SPEED), ang: b.ang + av * dt, av: clamp(av, -MAX_SPIN, MAX_SPIN), w: b.w, h: b.h }
}

/** Velocity of a drag from its last few pointer samples (px/s). Samples older than 120 ms are ignored; no samples means a drop. */
export function releaseVelocity(samples: readonly Sample[]): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 }
  const last = samples[samples.length - 1]!
  const recent = samples.filter(s => last.t - s.t <= 120)
  const first = recent[0]!
  const dt = (last.t - first.t) / 1000
  if (recent.length < 2 || dt <= 0) return { vx: 0, vy: 0 }
  return { vx: clamp((last.x - first.x) / dt, -MAX_SPEED, MAX_SPEED), vy: clamp((last.y - first.y) / dt, -MAX_SPEED, MAX_SPEED) }
}

/** Spin picked up from a toss: a throw to the right while held above centre turns clockwise, and so on. */
export function tossSpin(vx: number, grabDy: number): number { return clamp((vx / 700) * (grabDy >= 0 ? -1 : 1) + vx / 1400, -MAX_SPIN, MAX_SPIN) }

export const isClick = (dragged: number, ms: number): boolean => dragged < 6 && ms < 400

/** Starting spots spread along the top so floaters do not stack: index i of n. */
export function spawnBody(i: number, n: number, bounds: Bounds, size = 64): Body {
  const slot = (i + 0.5) / n
  return { x: bounds.w * (0.06 + 0.88 * slot), y: -size + bounds.h * (0.12 + 0.5 * ((i * 0.37) % 1)), vx: 0, vy: FALL_SPEED, ang: ((i * 0.7) % 1 - 0.5) * 0.5, av: 0, w: size, h: size }
}
