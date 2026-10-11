/** Flickering text: letters flip case and swap for look-alike digits, a few at a time, a few times a second. Render only. */
export function glitchText(text: string, nowMs: number): string {
  const bucket = Math.floor(nowMs / 110)
  const digits: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', l: '1', b: '8', g: '9' }
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    const h = Math.abs(Math.sin((i + 1) * 12.9898 + bucket * 78.233) * 43758.5453) % 1
    const lower = ch.toLowerCase()
    if (h < 0.28 && digits[lower]) out += digits[lower]
    else if (h < 0.62) out += ch === lower ? ch.toUpperCase() : lower
    else out += ch
  }
  return out
}

