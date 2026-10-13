import { accountConfigured, accountSession, authenticatedLokClient, publicLokClient } from '../net/playerAuth'
import { PONG_PAINTER_PRODUCTS, painterSku, type PainterProduct } from './pongPainter'
import { sanitizeLokSupporters, type LokSupporter } from './lokSupporters'

export interface LokShopCatalogItem { sku: string; name: string; price: number; rarity: string | null }
export interface LokShopSnapshot {
  authAvailable: boolean
  signedIn: boolean
  balance: number | null
  owned: ReadonlySet<string>
  catalog: ReadonlyMap<string, LokShopCatalogItem>
  supporters: readonly LokSupporter[]
  error: string | null
}

const empty = (patch: Partial<LokShopSnapshot> = {}): LokShopSnapshot => ({ authAvailable: accountConfigured, signedIn: false, balance: null, owned: new Set(), catalog: new Map(), supporters: [], error: null, ...patch })
let supporterCache: { at: number; entries: LokSupporter[] } | null = null
async function loadSupporters(): Promise<LokSupporter[]> {
  if (supporterCache && Date.now() - supporterCache.at < 10 * 60 * 1000) return supporterCache.entries
  const client = publicLokClient()
  if (!client) return []
  const { data, error } = await client.rpc('lok_supporter_feed', { p_limit: 200 })
  if (error || !Array.isArray(data)) return supporterCache?.entries ?? []
  const entries = sanitizeLokSupporters(data)
  supporterCache = { at: Date.now(), entries }
  return entries
}

/** Read-only balance/catalog/inventory. The browser never supplies the price or a user id to spend. */
export async function loadLokShop(): Promise<LokShopSnapshot> {
  if (!accountConfigured) return empty()
  try {
    const supporters = await loadSupporters()
    const session = await accountSession()
    if (!session || session.user.is_anonymous) return empty({ signedIn: false, supporters })
    const client = await authenticatedLokClient()
    if (!client) return empty({ signedIn: false, supporters })
    const [profile, catalog, inventory] = await Promise.all([
      client.rpc('lok_profile', { p_account: session.user.id, p_app_key: 'pongfall' }),
      client.from('lok_catalog').select('sku,name,price,rarity,app_scope').contains('app_scope', ['pongfall']).range(0, 999),
      client.from('lok_inventory').select('lok_catalog(sku)'),
    ])
    if (profile.error || catalog.error || inventory.error) throw profile.error ?? catalog.error ?? inventory.error
    const profileData = profile.data as { ok?: boolean; balance?: number } | null
    const balance = profileData?.ok && Number.isFinite(profileData.balance) ? Math.max(0, Math.floor(profileData.balance!)) : null
    const entries = (catalog.data ?? []).map(row => ({ sku: String(row.sku), name: String(row.name), price: Number(row.price), rarity: row.rarity as string | null }))
      .filter(row => Number.isFinite(row.price) && PONG_PAINTER_PRODUCTS.some(product => painterSku(product) === row.sku))
    const owned = (inventory.data ?? []).flatMap(row => {
      const rel = (row as unknown as { lok_catalog: { sku: string } | { sku: string }[] | null }).lok_catalog
      return Array.isArray(rel) ? rel.map(item => item.sku) : rel ? [rel.sku] : []
    })
    return { authAvailable: true, signedIn: true, balance, owned: new Set(owned), catalog: new Map(entries.map(item => [item.sku, item])), supporters, error: null }
  } catch (error) {
    return empty({ signedIn: true, error: error instanceof Error ? error.message : 'LOK Shop could not connect.' })
  }
}

export type BuyResult = { ok: true; balance?: number } | { ok: false; error: string }

/** Purchase through the shared lok-spend Edge Function; only its server-side catalog price is authoritative. */
export async function buyPainterProduct(product: PainterProduct): Promise<BuyResult> {
  const session = await accountSession()
  if (!session || session.user.is_anonymous) return { ok: false, error: 'Sign in with a LOK account to buy paint.' }
  const client = await authenticatedLokClient()
  if (!client) return { ok: false, error: 'LOK Shop is not configured on this site.' }
  const { data, error } = await client.functions.invoke<{ ok?: boolean; error?: string; balance?: number }>('lok-spend', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { appKey: 'pongfall', sku: painterSku(product), idemKey: `buy:${painterSku(product)}` },
  })
  if (error) return { ok: false, error: error.message || 'Purchase could not be completed. No tokens were spent.' }
  if (!data?.ok && data?.error !== 'already_owned') return { ok: false, error: data?.error ?? 'Purchase could not be completed. No tokens were spent.' }
  return { ok: true, balance: data.balance }
}

