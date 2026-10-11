// Keyboard bindings: pure data + sanitising, so a bad saved map can never leave a player without controls.
export const ACTIONS = ['p1Up', 'p1Down', 'p1TiltL', 'p1TiltR', 'p1Thrust', 'p1Power', 'p2Up', 'p2Down', 'p2TiltL', 'p2TiltR', 'p2Thrust', 'p2Power'] as const
export type ActionId = typeof ACTIONS[number]
export type KeyMap = Record<ActionId, string>

export const DEFAULT_KEYS: KeyMap = {
  p1Up: 'w', p1Down: 's', p1TiltL: 'a', p1TiltR: 'd', p1Thrust: ' ', p1Power: 'e',
  p2Up: 'i', p2Down: 'k', p2TiltL: 'j', p2TiltR: 'l', p2Thrust: 'u', p2Power: 'o',
}
export const ACTION_LABELS: Record<ActionId, string> = {
  p1Up: 'Move up', p1Down: 'Move down', p1TiltL: 'Tilt counter-clockwise', p1TiltR: 'Tilt clockwise', p1Thrust: 'Thrust / hold to aim the arm', p1Power: 'Pinball paddle',
  p2Up: 'Move up', p2Down: 'Move down', p2TiltL: 'Tilt counter-clockwise', p2TiltR: 'Tilt clockwise', p2Thrust: 'Thrust / hold to aim the arm', p2Power: 'Pinball paddle',
}
/** Keys with a fixed job (menu/camera/pause/mute/restart/controls, and the arrow keys' flip and move jobs). */
export const RESERVED = ['c', 'z', 'r', 'm', 'p', 'escape', 'tab', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']

export const normKey = (k: string) => k.length === 1 ? k.toLowerCase() : k.toLowerCase()
export const isBindable = (k: string) => k.length > 0 && !RESERVED.includes(normKey(k)) && !['shift', 'control', 'alt', 'meta', 'capslock', 'dead', 'unidentified'].includes(normKey(k))
export const keyLabel = (k: string) => k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k

export function sanitizeKeys(raw: unknown): KeyMap {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...DEFAULT_KEYS }
  const used = new Set<string>()
  for (const a of ACTIONS) {
    const v = typeof r[a] === 'string' ? normKey(r[a] as string) : ''
    if (v && isBindable(v) && !used.has(v)) { out[a] = v; used.add(v) }
  }
  // any action that fell back to its default must not collide with a key another action kept
  for (const a of ACTIONS) {
    if (typeof r[a] === 'string' && out[a] === normKey(r[a] as string)) continue
    if ([...used].includes(out[a])) {
      const free = Object.values(DEFAULT_KEYS).find(k => !Object.values(out).includes(k) && !used.has(k))
      if (free) out[a] = free
    }
    used.add(out[a])
  }
  return out
}

/** Bind `key` to `action`. If another action already uses that key the two swap. Returns null for a key that cannot be bound. */
export function rebind(keys: KeyMap, action: ActionId, key: string): KeyMap | null {
  const k = normKey(key)
  if (!isBindable(k)) return null
  const next = { ...keys }
  const other = ACTIONS.find(a => a !== action && next[a] === k)
  if (other) next[other] = next[action]
  next[action] = k
  return next
}

export const actionFor = (keys: KeyMap, key: string): ActionId | undefined => ACTIONS.find(a => keys[a] === normKey(key))
