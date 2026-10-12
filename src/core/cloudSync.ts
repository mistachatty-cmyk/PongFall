import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameResult } from '../sim/result'
import { accountSession, guestSessionClient, onlineConfigured, playerClient } from '../net/playerAuth'
import { loadProgress, saveProgress } from './progress'
import { SETTINGS_KEY } from './settings'
import { listSaveSlots } from './saveSlots'
import { isLensUnlocked } from '../render/lens'
import { queueCloudSync, registerCloudSyncQueue } from './cloudSyncQueue'

const HISTORY_KEY = 'pongfall.history.v1'
const DELETED_KEY = 'pongfall.saveDeleted.v1'
const TRANSFER_KEY = 'pongfall.guestTransfer.v1'
export interface HistoryEntry { id: string; mode: string; won: boolean; score: number; opponent_score: number; played_at: string }
const read = <T>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
export const localHistory = (): HistoryEntry[] => read(HISTORY_KEY, [])

export function recordHistory(result: GameResult, side: 0 | 1 = 0): void {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(), mode: result.mode,
    won: result.points[side] > result.points[side === 0 ? 1 : 0],
    score: result.points[side], opponent_score: result.points[side === 0 ? 1 : 0],
    played_at: new Date().toISOString(),
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...localHistory()].slice(0, 500)))
  queueCloudSync()
}

let timer = 0
function scheduleCloudSync(): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => { void syncCloud().catch(() => { /* local data remains queued */ }) }, 900)
}

registerCloudSyncQueue(scheduleCloudSync)

async function pushLocal(client: SupabaseClient): Promise<void> {
  const uid = (await client.auth.getSession()).data.session?.user.id
  if (!uid) throw new Error('Player session expired.')
  const falls = loadProgress().falls
  const settings = read<Record<string, unknown>>(SETTINGS_KEY, {})
  const { error: profileError } = await client.from('pf_profiles').upsert({ user_id: uid, falls, settings, unlocks: { lens: isLensUnlocked() }, updated_at: new Date().toISOString() })
  if (profileError) throw profileError
  const slots = listSaveSlots().map(s => ({ id: s.id, user_id: uid, name: s.name, replay: s.replay, saved_at: new Date(s.savedAt).toISOString() }))
  if (slots.length) { const { error } = await client.from('pf_saves').upsert(slots); if (error) throw error }
  const history = localHistory().map(e => ({ ...e, user_id: uid }))
  if (history.length) { const { error } = await client.from('pf_history').upsert(history, { onConflict: 'id', ignoreDuplicates: true }); if (error) throw error }
  const deleted = read<string[]>(DELETED_KEY, [])
  if (deleted.length) { const { error } = await client.from('pf_saves').delete().in('id', deleted); if (error) throw error; localStorage.removeItem(DELETED_KEY) }
}

/** Pull first, merge by stable slot and match IDs, then push the merged state. */
export async function syncCloud(): Promise<void> {
  if (!onlineConfigured) return
  const account = await accountSession()
  if (!account || account.user.is_anonymous) return
  const client = await playerClient()
  const token = localStorage.getItem(TRANSFER_KEY)
  if (token) {
    const { error } = await client.rpc('pf_claim_guest', { p_token: token })
    if (error) throw error
    localStorage.removeItem(TRANSFER_KEY)
  }
  const [profile, saves, history] = await Promise.all([
    client.from('pf_profiles').select('falls,settings,unlocks,updated_at').eq('user_id', account.user.id).maybeSingle(),
    client.from('pf_saves').select('id,name,replay,saved_at').eq('user_id', account.user.id),
    client.from('pf_history').select('id,mode,won,score,opponent_score,played_at').eq('user_id', account.user.id).order('played_at', { ascending: false }).limit(500),
  ])
  if (profile.error || saves.error || history.error) throw profile.error ?? saves.error ?? history.error
  if (profile.data) {
    const local = loadProgress()
    if (profile.data.falls > local.falls) saveProgress({ falls: profile.data.falls, menuUnlocked: true })
    if (profile.data.unlocks?.lens) localStorage.setItem('pongfall.lensUnlocked', '1')
    const touched = Number(localStorage.getItem('pongfall.settingsTouchedAt') ?? 0)
    if (Date.parse(profile.data.updated_at) > touched && profile.data.settings && Object.keys(profile.data.settings).length) localStorage.setItem(SETTINGS_KEY, JSON.stringify(profile.data.settings))
  }
  const deleted = new Set(read<string[]>(DELETED_KEY, []))
  const slots = new Map(listSaveSlots().map(s => [s.id, s]))
  for (const s of saves.data ?? []) if (!deleted.has(s.id) && !slots.has(s.id)) slots.set(s.id, { id: s.id, name: s.name, replay: s.replay, savedAt: Date.parse(s.saved_at) })
  localStorage.setItem('pongfall.saveSlots.v1', JSON.stringify([...slots.values()]))
  const matches = new Map(localHistory().map(e => [e.id, e]))
  for (const h of history.data ?? []) if (!matches.has(h.id)) matches.set(h.id, h)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...matches.values()].sort((a, b) => b.played_at.localeCompare(a.played_at)).slice(0, 500)))
  await pushLocal(client)
}

/** One-time guest claim: upload guest data and store only a random transfer token locally. */
export async function prepareGuestTransfer(): Promise<void> {
  const client = await guestSessionClient()
  await pushLocal(client)
  const uid = (await client.auth.getSession()).data.session?.user.id
  if (!uid) throw new Error('Guest session expired.')
  const random = crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(random, b => b.toString(16).padStart(2, '0')).join('')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
  const { error } = await client.from('pf_transfer_tokens').upsert({ guest_id: uid, token_hash: hash, used_at: null, created_at: new Date().toISOString() })
  if (error) throw error
  localStorage.setItem(TRANSFER_KEY, token)
}
