// Knockable menu objects: when a ball breaks out of your arena in the live-world menu it can hit the props around it. A prop is shoved and spun, then a damped
// spring floats it back to its spot. Pure and deterministic; the menu (worldMenu.ts) owns the bodies and calls these. Render/menu only: the menu world is not
// recorded, so changing a ball's velocity here never touches the simulation's rules or replays.
export interface PropBody { ox: number; oy: number; vx: number; vy: number; ang: number; spin: number }
export const newBody = (): PropBody => ({ ox: 0, oy: 0, vx: 0, vy: 0, ang: 0, spin: 0 })
export const PHYS = { spring: 10, damping: 4.2, spinSpring: 18, spinDamping: 4, maxOffset: 260, maxSpin: 6, restitution: 0.82, hitRadius: 0.42 } as const

/** One step of the spring that carries a knocked prop back to its spot. */
export function stepBody(b: PropBody, dt: number): void {
  b.vx += (-PHYS.spring * b.ox - PHYS.damping * b.vx) * dt; b.vy += (-PHYS.spring * b.oy - PHYS.damping * b.vy) * dt
  b.ox += b.vx * dt; b.oy += b.vy * dt
  const d = Math.hypot(b.ox, b.oy)
  if (d > PHYS.maxOffset) { b.ox *= PHYS.maxOffset / d; b.oy *= PHYS.maxOffset / d; const out = (b.vx * b.ox + b.vy * b.oy) / PHYS.maxOffset; if (out > 0) { b.vx -= out * b.ox / PHYS.maxOffset; b.vy -= out * b.oy / PHYS.maxOffset } }
  b.spin += (-PHYS.spinSpring * b.ang - PHYS.spinDamping * b.spin) * dt; b.ang += b.spin * dt
}
export const isAtRest = (b: PropBody): boolean => Math.abs(b.ox) + Math.abs(b.oy) + Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.ang) + Math.abs(b.spin) < 0.05

export interface Ball { x: number; y: number; vx: number; vy: number }
/**
 * Ball against one prop (a circle of `radius` at its home spot plus its offset). Pushes the ball out, bounces it about the contact normal and gives the prop
 * an impulse along the normal plus some spin. `massRatio` is prop mass over ball mass: a heavy prop barely moves and the ball bounces back; a light one flies.
 * Returns the impact speed (0 when there was no hit).
 */
export function collideBall(b: PropBody, home: { x: number; y: number }, radius: number, ball: Ball, ballR: number, massRatio = 6): number {
  const px = home.x + b.ox, py = home.y + b.oy, dx = ball.x - px, dy = ball.y - py, dist = Math.hypot(dx, dy), min = radius + ballR
  if (dist >= min || dist === 0) return 0
  const nx = dx / dist, ny = dy / dist
  const rvx = ball.vx - b.vx, rvy = ball.vy - b.vy, vn = rvx * nx + rvy * ny
  ball.x = px + nx * (min + 0.5); ball.y = py + ny * (min + 0.5)
  if (vn >= 0) return 0                                  // already separating
  const j = -(1 + PHYS.restitution) * vn / (1 + 1 / massRatio)   // impulse along the normal, shared by the two masses
  ball.vx += (j * nx); ball.vy += (j * ny)
  b.vx -= (j * nx) / massRatio; b.vy -= (j * ny) / massRatio
  const tang = rvx * -ny + rvy * nx                      // sliding past the edge spins the prop
  b.spin = Math.max(-PHYS.maxSpin, Math.min(PHYS.maxSpin, b.spin + tang * 0.004 / Math.max(0.3, massRatio / 6) - nx * 0.0006 * -vn))
  return -vn
}
