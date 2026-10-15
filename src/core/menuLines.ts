// Flavor lines under the main menu. Pure data so they can be tested and extended; one is shown at a time and they rotate.
export const MENU_LINES: readonly string[] = [
  'The glass remembers every hit.',
  'Somewhere above you, a smaller arena is losing.',
  'Three cracks and the wall opens its eyes.',
  'Hold the glass. Keep falling.',
  'The shaft has no floor, only a longer fall.',
  'Tears are loose change for the watching.',
  'Every arena is somebody’s last good rally.',
  'The eyes do not blink for you. They blink for the ball.',
  'Win, or ask what it costs.',
  'Small paddles tell big lies.',
  'The wind is also playing.',
  'A near miss is still a miss. The wall noticed.',
  'Your arena is the only one that is yours.',
  'Down is just the direction everything agrees on.',
  'Thrust is a polite word for panic.',
  'The pinball arm only comes out when you have earned it.',
  'Other arenas are watching your rally for ideas.',
  'The glass was not built to hold. It was built to count.',
  'Fall together. Score apart.',
  'Gravity never lost a match.',
]
export const GSIX_BRAND = 'A GSIX DESIGNS GAME · LOK ECOSYSTEM'
/** The line for a given moment: one every `period` ms, stepping through a fixed shuffle so neighbours differ. */
export function lineAt(nowMs: number, period = 9000, lines: readonly string[] = MENU_LINES): string {
  const n = lines.length
  const i = Math.floor(nowMs / period)
  return lines[(i * 7 + (i % 3)) % n] ?? lines[0] ?? ''
}
