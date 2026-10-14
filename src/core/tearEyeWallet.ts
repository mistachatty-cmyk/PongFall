import { TEAR_IRIS_COLORS } from './pongPainter'

export const TEAR_EYE_WALLET_KEY = 'pongfall.tearEyeWallet.v1'
export const TEARS_PER_IRIS = 10
export interface TearEyeWallet { tears: number; owned: string[] }
export const emptyTearEyeWallet = (): TearEyeWallet => ({ tears: 0, owned: [] })

export function sanitizeTearEyeWallet(raw: unknown): TearEyeWallet {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const tears = typeof value.tears === 'number' && Number.isFinite(value.tears) ? Math.max(0, Math.min(999999, Math.floor(value.tears))) : 0
  const known = new Set<string>(TEAR_IRIS_COLORS.map(color => color.id))
  const owned = Array.isArray(value.owned) ? [...new Set(value.owned.filter((id): id is string => typeof id === 'string' && known.has(id)))].slice(0, TEAR_IRIS_COLORS.length) : []
  return { tears, owned }
}

export function loadTearEyeWallet(storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): TearEyeWallet {
  try { return sanitizeTearEyeWallet(JSON.parse(storage?.getItem(TEAR_EYE_WALLET_KEY) ?? 'null')) } catch { return emptyTearEyeWallet() }
}

export function saveTearEyeWallet(wallet: TearEyeWallet, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try { storage?.setItem(TEAR_EYE_WALLET_KEY, JSON.stringify(sanitizeTearEyeWallet(wallet))); return !!storage } catch { return false }
}

export function awardMatchTears(wallet: TearEyeWallet, collected: number, experimental = false): TearEyeWallet {
  const amount = Number.isFinite(collected) ? Math.max(0, Math.floor(collected)) : 0
  const clean = sanitizeTearEyeWallet(wallet)
  return { ...clean, tears: Math.min(999999, clean.tears + (experimental ? 0 : amount)) }
}

export function buyTearIris(wallet: TearEyeWallet, id: string): { wallet: TearEyeWallet; ok: boolean; reason?: 'unknown' | 'owned' | 'short' } {
  const clean = sanitizeTearEyeWallet(wallet)
  if (!TEAR_IRIS_COLORS.some(color => color.id === id)) return { wallet: clean, ok: false, reason: 'unknown' }
  if (clean.owned.includes(id)) return { wallet: clean, ok: false, reason: 'owned' }
  if (clean.tears < TEARS_PER_IRIS) return { wallet: clean, ok: false, reason: 'short' }
  return { wallet: { tears: clean.tears - TEARS_PER_IRIS, owned: [...clean.owned, id] }, ok: true }
}
