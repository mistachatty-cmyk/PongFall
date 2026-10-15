// A faint pendulum at the bottom centre of the personal arena that ticks with the pace of the rally, to help players keep time.
// Render only: it reads the world but never changes it.
export interface MetronomeState { period: number; phase: number; angle: number; tick: boolean }

/** Seconds per swing from the fastest ball (fast rallies tick fast), clamped so it stays readable. */
export const metronomePeriod = (fastestBall: number) => Math.min(1.1, Math.max(0.32, 1.1 - fastestBall / 1100))

/** Pendulum state at time `t` (seconds). `tick` is true for the short moment the pendulum passes the centre. */
export function metronome(t: number, fastestBall: number): MetronomeState {
  const period = metronomePeriod(fastestBall)
  const phase = (t / period) % 1
  const angle = Math.sin(phase * Math.PI * 2) * 0.55
  const centre = Math.abs(Math.sin(phase * Math.PI * 2)) < 0.12
  return { period, phase, angle, tick: centre }
}
