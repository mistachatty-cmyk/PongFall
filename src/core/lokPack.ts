// LokPacks: after a finished match the player earns a pack. Opening it deals cards: customization items (PongPainter looks, menu/world themes, LilEye
// cosmetics), Customization Tokens (CT) and sometimes a bonus pack. This file is the pure rules and the local save; the pack-opening page is lokPackView.ts.
// PongFall keeps its own small local collection so it never needs the card systems of 616 Survivor or the LOK ecosystem. When those exist they can
// listen to the ledger (see `pongfall-lokpack` and docs/LOKPACKS.md) without PongFall changing. LokTokens are NOT part of packs: matches stay token-free.
import { PACK_ITEMS, RARITIES, packItemById, packItemsOfRarity, rarityIndex, type PackItem, type Rarity } from './packItems'
import type { GameResult } from '../sim/result'

export const LOKPACK_KEY = 'pongfall.lokpacks.v1'
export const LOKPACK_EVENT = 'pongfall-lokpack'
export type PackKind = 'fall' | 'win' | 'cost' | 'bonus'
export const PACK_KINDS: Record<PackKind, { name: string; cards: number; odds: Record<Rarity, number>; blurb: string }> = {
  fall: { name: 'Fall Pack', cards: 3, odds: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }, blurb: 'Every finished fall earns one.' },
  win: { name: 'Win Pack', cards: 4, odds: { common: 45, uncommon: 28, rare: 15, epic: 9, legendary: 3 }, blurb: 'Banked a win: one more card and better odds.' },
  cost: { name: 'Cost Pack', cards: 5, odds: { common: 35, uncommon: 28, rare: 20, epic: 12, legendary: 5 }, blurb: 'Won overtime. At what cost? The best odds.' },
  bonus: { name: 'Bonus Pack', cards: 3, odds: { common: 50, uncommon: 28, rare: 13, epic: 7, legendary: 2 }, blurb: 'Found inside another pack.' },
}
/** Customization Tokens: dealt as cards, refunded for duplicates, and spent to craft any look you are missing. */
export const CT_CARD: Record<Rarity, number> = { common: 5, uncommon: 12, rare: 30, epic: 75, legendary: 180 }
export const CT_DUPLICATE: Record<Rarity, number> = { common: 3, uncommon: 8, rare: 20, epic: 50, legendary: 120 }
export const CT_CRAFT: Record<Rarity, number> = { common: 25, uncommon: 60, rare: 140, epic: 350, legendary: 900 }
export const PITY_EPIC = 12, PITY_LEGENDARY = 50, MAX_UNOPENED = 40, MIN_MATCH_MS = 20000

export interface PackStub { id: string; kind: PackKind; seed: number; at: number }
export type LedgerEntry = { t: 'award' | 'open' | 'craft'; at: number; pack?: string; kind?: PackKind; item?: string; ct?: number }
export interface LokPackSave { v: 1; packs: PackStub[]; items: string[]; ct: number; pityEpic: number; pityLegendary: number; opened: number; awarded: string[]; ledger: LedgerEntry[]; /** Consecutive local days with a finished match, and the last such day (YYYY-MM-DD). */ streak: number; lastDay: string }
export const emptyLokPack = (): LokPackSave => ({ v: 1, packs: [], items: [], ct: 0, pityEpic: 0, pityLegendary: 0, opened: 0, awarded: [], ledger: [], streak: 0, lastDay: '' })
/** From the third day in a row, the first pack of each day also pays this many Customization Tokens. */
export const STREAK_DAYS = 3, STREAK_CT = 10
export const dayKey = (at: number): string => { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const dayBefore = (at: number): string => { const d = new Date(at); d.setDate(d.getDate() - 1); return dayKey(d.getTime()) }

export type Reward =
  | { type: 'item'; itemId: string; rarity: Rarity; /** Already owned: turned into CT instead. */ dup: boolean; ct: number }
  | { type: 'ct'; rarity: Rarity; ct: number }
  | { type: 'pack'; rarity: Rarity; kind: PackKind }

/** Small seeded generator (mulberry32). Rolls only come from the pack's own seed, so reopening a save never re-rolls a pack. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const hashSeed = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** Which pack a finished match earns, or null (sandbox, Game Lab runs and very short matches earn none). */
export function packKindFor(r: Pick<GameResult, 'mode' | 'experimental' | 'durationMs' | 'won' | 'overtime'>): PackKind | null {
  if (r.experimental || r.mode === 'sandbox' || r.durationMs < MIN_MATCH_MS) return null
  return r.won ? (r.overtime ? 'cost' : 'win') : 'fall'
}

const pickRarity = (odds: Record<Rarity, number>, rnd: () => number, min = 0): Rarity => {
  const pool = RARITIES.map((r, i) => ({ r, w: i >= min ? odds[r] : 0 })), total = pool.reduce((a, b) => a + b.w, 0)
  let x = rnd() * total
  for (const p of pool) { if ((x -= p.w) < 0) return p.r }
  return pool.filter(p => p.w > 0).pop()!.r
}

export interface RollOutcome { rewards: Reward[]; pityEpic: number; pityLegendary: number }
/** Deal one pack. Pure: same stub, owned set and pity always give the same cards. The last card is at least uncommon, and pity guarantees an epic or legendary. */
export function rollPack(stub: Pick<PackStub, 'kind' | 'seed'>, owned: ReadonlySet<string>, pityEpic: number, pityLegendary: number): RollOutcome {
  const meta = PACK_KINDS[stub.kind], rnd = seeded(stub.seed), taken = new Set(owned), rewards: Reward[] = []
  let bonus = false
  for (let i = 0; i < meta.cards; i++) {
    const last = i === meta.cards - 1
    const min = last ? (pityLegendary >= PITY_LEGENDARY - 1 && !rewards.some(r => r.rarity === 'legendary') ? 4 : pityEpic >= PITY_EPIC - 1 && !rewards.some(r => rarityIndex(r.rarity) >= 3) ? 3 : 1) : 0
    const rarity = pickRarity(meta.odds, rnd, min), kindRoll = rnd()
    if (kindRoll < 0.22) { rewards.push({ type: 'ct', rarity, ct: CT_CARD[rarity] }); continue }
    if (!bonus && stub.kind !== 'bonus' && kindRoll > 0.97) { bonus = true; rewards.push({ type: 'pack', rarity, kind: 'bonus' }); continue }
    let ri = rarityIndex(rarity), pool: PackItem[] = []
    for (; ri >= 0 && !pool.length; ri--) { const all = packItemsOfRarity(RARITIES[ri]!); const fresh = all.filter(x => !taken.has(x.id)); pool = fresh.length ? fresh : all }
    const item = pool[Math.floor(rnd() * pool.length) % pool.length]!
    const dup = taken.has(item.id)
    taken.add(item.id)
    rewards.push({ type: 'item', itemId: item.id, rarity: item.rarity, dup, ct: dup ? CT_DUPLICATE[item.rarity] : 0 })
  }
  const best = Math.max(...rewards.map(r => rarityIndex(r.rarity)))
  // pity only counts what the player actually got: a legendary resets both counters, an epic resets the epic one
  return { rewards, pityEpic: best >= 3 ? 0 : pityEpic + 1, pityLegendary: best >= 4 ? 0 : pityLegendary + 1 }
}

export const ownsItem = (s: LokPackSave, id: string): boolean => s.items.includes(id)
const ledger = (s: LokPackSave, e: LedgerEntry): LedgerEntry[] => [...s.ledger, e].slice(-100)

/** Add the pack for a finished match. Idempotent per `matchId`; ignores matches that earn nothing. */
export function awardPack(s: LokPackSave, matchId: string, result: Parameters<typeof packKindFor>[0], now = Date.now()): { save: LokPackSave; pack: PackStub | null } {
  const kind = packKindFor(result)
  if (!kind || s.awarded.includes(matchId) || s.packs.length >= MAX_UNOPENED) return { save: s, pack: null }
  const pack: PackStub = { id: `${matchId}`, kind, seed: hashSeed(`${matchId}|${s.opened}|${s.packs.length}`), at: now }
  const day = dayKey(now), newDay = s.lastDay !== day, streak = newDay ? (s.lastDay === dayBefore(now) ? s.streak + 1 : 1) : s.streak
  const bonus = newDay && streak >= STREAK_DAYS ? STREAK_CT : 0
  return { save: { ...s, packs: [...s.packs, pack], awarded: [...s.awarded, matchId].slice(-60), streak, lastDay: day, ct: s.ct + bonus, ledger: ledger(s, { t: 'award', at: now, pack: pack.id, kind, ...(bonus ? { ct: bonus } : {}) }) }, pack }
}

/** Open a pack: its cards go into the collection, tokens into the wallet, and a bonus pack (if dealt) into the pile. */
export function openPack(s: LokPackSave, packId: string, now = Date.now()): { save: LokPackSave; rewards: Reward[]; pack: PackStub } | null {
  const pack = s.packs.find(p => p.id === packId)
  if (!pack) return null
  const out = rollPack(pack, new Set(s.items), s.pityEpic, s.pityLegendary)
  const items = new Set(s.items); let ct = s.ct; const packs = s.packs.filter(p => p.id !== packId)
  for (const r of out.rewards) {
    if (r.type === 'item') { if (r.dup) ct += r.ct; else items.add(r.itemId) }
    else if (r.type === 'ct') ct += r.ct
    else if (packs.length < MAX_UNOPENED) packs.push({ id: `${pack.id}+b`, kind: 'bonus', seed: hashSeed(`${pack.id}|bonus`), at: now })
  }
  const next: LokPackSave = { ...s, packs, items: [...items], ct, pityEpic: out.pityEpic, pityLegendary: out.pityLegendary, opened: s.opened + 1, ledger: ledger(s, { t: 'open', at: now, pack: pack.id, kind: pack.kind, ct: ct - s.ct }) }
  return { save: next, rewards: out.rewards, pack }
}

/** Spend Customization Tokens on a look you do not have yet. */
export function craftItem(s: LokPackSave, itemId: string, now = Date.now()): { save: LokPackSave; ok: boolean; why: string } {
  const item = packItemById(itemId)
  if (!item) return { save: s, ok: false, why: 'Unknown look' }
  if (ownsItem(s, itemId)) return { save: s, ok: false, why: 'You already have this' }
  const cost = CT_CRAFT[item.rarity]
  if (s.ct < cost) return { save: s, ok: false, why: `Needs ${cost} CT` }
  return { save: { ...s, ct: s.ct - cost, items: [...s.items, itemId], ledger: ledger(s, { t: 'craft', at: now, item: itemId, ct: -cost }) }, ok: true, why: '' }
}

const num = (v: unknown, max = 1e9): number => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0
export function sanitizeLokPack(raw: unknown): LokPackSave {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : []
  const known = new Set(PACK_ITEMS.map(i => i.id))
  return {
    v: 1,
    packs: arr(r.packs).flatMap((p): PackStub[] => { const q = p as Partial<PackStub> | null; return q && typeof q.id === 'string' && q.id.length < 80 && typeof q.kind === 'string' && q.kind in PACK_KINDS ? [{ id: q.id, kind: q.kind as PackKind, seed: num(q.seed, 4294967295), at: num(q.at, 1e15) }] : [] }).slice(0, MAX_UNOPENED),
    items: [...new Set(arr(r.items).filter((x): x is string => typeof x === 'string' && known.has(x)))],
    ct: num(r.ct), pityEpic: num(r.pityEpic, 1000), pityLegendary: num(r.pityLegendary, 1000), opened: num(r.opened),
    awarded: arr(r.awarded).filter((x): x is string => typeof x === 'string' && x.length < 80).slice(-60),
    streak: num(r.streak, 100000), lastDay: typeof r.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastDay) ? r.lastDay : '',
    ledger: arr(r.ledger).flatMap((e): LedgerEntry[] => { const q = e as Partial<LedgerEntry> | null; return q && (q.t === 'award' || q.t === 'open' || q.t === 'craft') ? [{ t: q.t, at: num(q.at, 1e15), ...(typeof q.pack === 'string' ? { pack: q.pack.slice(0, 80) } : {}), ...(typeof q.kind === 'string' && q.kind in PACK_KINDS ? { kind: q.kind as PackKind } : {}), ...(typeof q.item === 'string' ? { item: q.item.slice(0, 60) } : {}), ...(typeof q.ct === 'number' && Number.isFinite(q.ct) ? { ct: Math.trunc(q.ct) } : {}) }] : [] }).slice(-100),
  }
}

type Store = Pick<Storage, 'getItem' | 'setItem'>
const defaultStore = (): Store | undefined => { try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined } }
let memo: LokPackSave | null = null
export function loadLokPack(storage: Pick<Storage, 'getItem'> | undefined = defaultStore()): LokPackSave {
  if (storage === defaultStore() && memo) return memo
  let s: LokPackSave
  try { s = sanitizeLokPack(JSON.parse(storage?.getItem(LOKPACK_KEY) ?? 'null')) } catch { s = emptyLokPack() }
  if (storage === defaultStore()) memo = s
  return s
}
export function saveLokPack(s: LokPackSave, storage: Store | undefined = defaultStore()): boolean {
  const clean = sanitizeLokPack(s)
  if (storage === defaultStore()) memo = clean
  try { storage?.setItem(LOKPACK_KEY, JSON.stringify(clean)) } catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LOKPACK_EVENT, { detail: { packs: clean.packs.length, items: clean.items.length, ct: clean.ct } }))
  return !!storage
}
/** True when the look came out of a pack. Used by PongPainter, the themes and LilEye. */
export const packOwns = (id: string): boolean => loadLokPack().items.includes(id)

/** Called once for each finished match (createPongFall). Returns the pack, if one was earned. */
export function grantForResult(result: GameResult, matchId: string): PackStub | null {
  const { save, pack } = awardPack(loadLokPack(), matchId, result)
  if (pack) saveLokPack(save)
  return pack
}
