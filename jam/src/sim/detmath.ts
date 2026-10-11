// Deterministic math for the sim. Native Math.sin/cos/hypot are implementation-defined in the
// last bit and differ between engines; lockstep and replay verification need identical results.
// Only + - * / sqrt floor abs min max are used here (all exactly specified by IEEE-754/ECMAScript).
const TWO_PI = 6.283185307179586
const INV_TWO_PI = 0.15915494309189535

/** Sine via range reduction to [-pi, pi] then an odd Taylor polynomial (fixed op order). */
export function sin(x: number): number {
  let r = x - Math.floor(x * INV_TWO_PI + 0.5) * TWO_PI
  // fold to [-pi/2, pi/2] for accuracy
  const HALF_PI = 1.5707963267948966
  if (r > HALF_PI) r = 3.141592653589793 - r
  else if (r < -HALF_PI) r = -3.141592653589793 - r
  const r2 = r * r
  return r * (1 + r2 * (-1 / 6 + r2 * (1 / 120 + r2 * (-1 / 5040 + r2 * (1 / 362880 + r2 * (-1 / 39916800 + r2 * (1 / 6227020800)))))))
}

export function cos(x: number): number {
  return sin(x + 1.5707963267948966)
}

export function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}
