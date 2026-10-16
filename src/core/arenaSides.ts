// Arena sides: the personal customization zones. Left (side 0) is player 1, right (side 1) is the NPC / online opponent.
// Each side has three painted layers plus an optional filter. All of it is render-only: it never enters the sim.
//   layer 1  back     hue tint, a pattern and pictures behind the glass
//   layer 2  objects  tree, lantern, sign, fireflies... drawn above the back and behind the play layer (not physical)
//   layer 3  play     paddle, ball, glass (unchanged, drawn by draw.ts)
//   layer 4  filter   an optional wash over the side's back + objects
import { artById } from './artRegistry'

export const SIDES_KEY = 'pongfall.arenaSides.v1'
export const SIDES_VERSION = 1

export const BACK_PATTERNS = ['none', 'grid', 'rays', 'stars', 'cracks'] as const
export type BackPattern = typeof BACK_PATTERNS[number]
export const SIDE_FILTERS = ['none', 'warm', 'cold', 'mono', 'neon'] as const
export type SideFilter = typeof SIDE_FILTERS[number]
export const CEILING_THEMES = ['plain', 'frost', 'flame', 'moss', 'neon', 'gold'] as const
export type CeilingTheme = typeof CEILING_THEMES[number]
export const OBJECT_KINDS = ['tree', 'lantern', 'sign', 'fireflies', 'bunting', 'moon'] as const
export type ObjectKind = typeof OBJECT_KINDS[number]
export type SidesScope = 'mine' | 'whole'

export const MAX_IMAGES = 3
export const MAX_OBJECTS = 6
export const MAX_SIGN_TEXT = 24

/** A picture from the art registry placed in the zone. x / y are 0..1 across the zone, scale is 0.2..1.6. */
export interface SideImage { id: string; x: number; y: number; scale: number; opacity: number }
export interface SideObject { kind: ObjectKind; x: number; y: number; scale: number; text?: string }
export interface SideLook {
  hue: number            // 0..359, the tint of the back glass
  tint: number           // 0..1 how strong the tint is (0 = untouched arena)
  pattern: BackPattern
  images: SideImage[]
  objects: SideObject[]
  filter: SideFilter
  ceiling: CeilingTheme
}
export interface ArenaSides { v: typeof SIDES_VERSION; scope: SidesScope; sides: [SideLook, SideLook] }

export const defaultLook = (): SideLook => ({ hue: 210, tint: 0, pattern: 'none', images: [], objects: [], filter: 'none', ceiling: 'plain' })
export const defaultSides = (): ArenaSides => ({ v: SIDES_VERSION, scope: 'mine', sides: [defaultLook(), defaultLook()] })

/** Preset looks for NPC / enemy sides (offline). The player cannot edit these. */
export const NPC_LOOKS: readonly SideLook[] = [
  { ...defaultLook(), hue: 0, tint: .18, pattern: 'rays', filter: 'warm', ceiling: 'flame', objects: [{ kind: 'lantern', x: .5, y: .12, scale: 1 }] },
  { ...defaultLook(), hue: 190, tint: .16, pattern: 'stars', filter: 'cold', ceiling: 'frost', objects: [{ kind: 'moon', x: .6, y: .2, scale: 1 }] },
  { ...defaultLook(), hue: 120, tint: .14, pattern: 'grid', filter: 'none', ceiling: 'moss', objects: [{ kind: 'fireflies', x: .5, y: .5, scale: 1 }] },
  { ...defaultLook(), hue: 285, tint: .2, pattern: 'cracks', filter: 'neon', ceiling: 'neon', objects: [] },
]
export const npcLook = (seed: number): SideLook => structuredCloneLook(NPC_LOOKS[Math.abs(Math.trunc(seed)) % NPC_LOOKS.length]!)

function structuredCloneLook(l: SideLook): SideLook { return { ...l, images: l.images.map(i => ({ ...i })), objects: l.objects.map(o => ({ ...o })) } }
const num = (v: unknown, lo: number, hi: number, fallback: number): number => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => typeof v === 'string' && (list as readonly string[]).includes(v) ? v as T : fallback

/** Strip anything that is not plain printable text and cap the length. */
export const cleanSignText = (v: unknown): string => typeof v === 'string' ? v.replace(/[^\p{L}\p{N} .,!?'’:\-]/gu, '').slice(0, MAX_SIGN_TEXT).trim() : ''

export function sanitizeLook(raw: unknown, knownImage: (id: string) => boolean = id => !!artById(id)): SideLook {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const images: SideImage[] = []
  if (Array.isArray(r.images)) for (const i of r.images) {
    if (images.length >= MAX_IMAGES) break
    const o = (i && typeof i === 'object' ? i : {}) as Record<string, unknown>
    if (typeof o.id !== 'string' || !knownImage(o.id)) continue
    images.push({ id: o.id, x: num(o.x, 0, 1, .5), y: num(o.y, 0, 1, .5), scale: num(o.scale, .2, 1.6, 1), opacity: num(o.opacity, .1, 1, .6) })
  }
  const objects: SideObject[] = []
  if (Array.isArray(r.objects)) for (const i of r.objects) {
    if (objects.length >= MAX_OBJECTS) break
    const o = (i && typeof i === 'object' ? i : {}) as Record<string, unknown>
    const kind = pick(o.kind, OBJECT_KINDS, 'tree')
    if (typeof o.kind !== 'string' || !(OBJECT_KINDS as readonly string[]).includes(o.kind)) continue
    const obj: SideObject = { kind, x: num(o.x, 0, 1, .5), y: num(o.y, 0, 1, .5), scale: num(o.scale, .3, 2, 1) }
    if (kind === 'sign') obj.text = cleanSignText(o.text)
    objects.push(obj)
  }
  return {
    hue: Math.round(num(r.hue, 0, 359, 210)), tint: num(r.tint, 0, 1, 0), pattern: pick(r.pattern, BACK_PATTERNS, 'none'),
    images, objects, filter: pick(r.filter, SIDE_FILTERS, 'none'), ceiling: pick(r.ceiling, CEILING_THEMES, 'plain'),
  }
}

export function sanitizeSides(raw: unknown, knownImage?: (id: string) => boolean): ArenaSides {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const s = Array.isArray(r.sides) ? r.sides : []
  return { v: SIDES_VERSION, scope: pick(r.scope, ['mine', 'whole'] as const, 'mine'), sides: [sanitizeLook(s[0], knownImage), sanitizeLook(s[1], knownImage)] }
}

export function loadSides(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): ArenaSides {
  try { return sanitizeSides(JSON.parse(storage?.getItem(SIDES_KEY) ?? 'null')) } catch { return defaultSides() }
}
export function saveSides(sides: ArenaSides, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try {
    storage?.setItem(SIDES_KEY, JSON.stringify(sanitizeSides(sides)))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pongfall-sides-changed'))
    return !!storage
  } catch { return false }
}

/**
 * The two looks a match draws. `mine` keeps the player's own look on their side only; the other side is the opponent's
 * (online: their synced look; offline: an NPC preset). `whole` mirrors the player's own look across the whole arena.
 */
export function matchLooks(own: ArenaSides, me: 0 | 1, opponent: SideLook | null, npcSeed: number): [SideLook, SideLook] {
  const mine = own.sides[me]
  if (own.scope === 'whole') return [mine, mine]
  const theirs = opponent ?? npcLook(npcSeed)
  return me === 0 ? [mine, theirs] : [theirs, mine]
}

// ---- hue and ceiling colour math (pure, so it is testable) ----

export function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`
}

export const CEILING_COLORS: Record<CeilingTheme, string> = {
  plain: '#78c8ff', frost: '#bfeaff', flame: '#ff8a4a', moss: '#7ad98a', neon: '#d070ff', gold: '#ffd76a',
}
const unhex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
export function mixHex(a: string, b: string, t: number): string {
  const x = unhex(a), y = unhex(b), k = Math.min(1, Math.max(0, t))
  return '#' + [0, 1, 2].map(i => Math.round(x[i]! + (y[i]! - x[i]!) * k).toString(16).padStart(2, '0')).join('')
}

/**
 * Colour stops across the ceiling, left to right, for the two themes. Each side holds its own colour, then the two blend
 * across a short span in the middle. Returns offsets 0..1 in order.
 */
export function ceilingStops(left: CeilingTheme, right: CeilingTheme, span = .16): Array<{ at: number; color: string }> {
  const l = CEILING_COLORS[left], r = CEILING_COLORS[right]
  if (left === right) return [{ at: 0, color: l }, { at: 1, color: r }]
  return [{ at: 0, color: l }, { at: .5 - span / 2, color: l }, { at: .5, color: mixHex(l, r, .5) }, { at: .5 + span / 2, color: r }, { at: 1, color: r }]
}

export const FILTER_TINTS: Record<SideFilter, string> = { none: 'rgba(0,0,0,0)', warm: 'rgba(255,150,70,.16)', cold: 'rgba(90,170,255,.16)', mono: 'rgba(180,180,190,.22)', neon: 'rgba(210,90,255,.16)' }

/** The net payload: a sanitized look only, re-sanitized by the receiver. */
export const lookToNet = (l: SideLook): SideLook => sanitizeLook(l)

// A cached read for the render loops (menu attract, shop venues): saving anywhere invalidates it, so changes show live.
let cache: ArenaSides | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('pongfall-sides-changed', () => { cache = null })
  window.addEventListener('storage', e => { if (e.key === SIDES_KEY) cache = null })
}
export function currentSides(): ArenaSides { return cache ??= loadSides() }

// ---- direct placement in the live arena (pure, so it is testable) ----

export type PlacedItem = { list: 'images' | 'objects'; index: number }
/** The side an arena-local x belongs to, and the 0..1 zone coordinates for a local point. */
export const zonePoint = (lx: number, ly: number, W: number, H: number): { side: 0 | 1; x: number; y: number } => {
  const side: 0 | 1 = lx < 0 ? 0 : 1, x0 = side === 0 ? -W / 2 : 0
  return { side, x: Math.min(1, Math.max(0, (lx - x0) / (W / 2))), y: Math.min(1, Math.max(0, (ly + H / 2) / H)) }
}
/** The nearest picture or object (objects win ties) within `radius` arena units of a local point, or null. */
export function pickItem(look: SideLook, side: 0 | 1, lx: number, ly: number, W: number, H: number, radius = 80): PlacedItem | null {
  const x0 = side === 0 ? -W / 2 : 0, zw = W / 2
  let best: PlacedItem | null = null, bestD = radius
  look.images.forEach((im, index) => { const d = Math.hypot(x0 + im.x * zw - lx, -H / 2 + im.y * H - ly) + 6; if (d < bestD) { bestD = d; best = { list: 'images', index } } })
  look.objects.forEach((o, index) => { const d = Math.hypot(x0 + o.x * zw - lx, -H / 2 + o.y * H - ly); if (d <= bestD) { bestD = d; best = { list: 'objects', index } } })
  return best
}
export function moveItem(look: SideLook, item: PlacedItem, x: number, y: number): SideLook {
  const cx = Math.min(1, Math.max(0, x)), cy = Math.min(1, Math.max(0, y))
  return item.list === 'images'
    ? { ...look, images: look.images.map((im, i) => i === item.index ? { ...im, x: cx, y: cy } : im) }
    : { ...look, objects: look.objects.map((o, i) => i === item.index ? { ...o, x: cx, y: cy } : o) }
}
