import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { LokSessionAdapter } from './lokSession'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const onlineConfigured = Boolean(url && key && import.meta.env.VITE_PONGFALL_ROOMS_READY === 'true')
export const accountConfigured = Boolean(url && key)

// Guests keep a device-local anonymous session. The account client uses the
// shared LOK cookie, so signing in here is visible to the Hub and sibling games.
const guestClient: SupabaseClient | null = url && key ? createClient(url, key, {
  auth: { storageKey: 'pongfall.guest.auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 40 } },
}) : null
const accountClient: SupabaseClient | null = url && key ? createClient(url, key, {
  auth: { storage: new LokSessionAdapter(), flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 40 } },
}) : null

export async function guestSessionClient(): Promise<SupabaseClient> {
  if (!guestClient) throw new Error('Guest play is not configured.')
  if (!(await guestClient.auth.getSession()).data.session) {
    const { error } = await guestClient.auth.signInAnonymously()
    if (error) throw new Error(`Guest play is unavailable: ${error.message}`)
  }
  return guestClient
}

export async function playerClient(): Promise<SupabaseClient> {
  if (!guestClient || !accountClient) throw new Error('Online play is not configured.')
  const account = (await accountClient.auth.getSession()).data.session
  if (account && !account.user.is_anonymous) return accountClient
  return guestSessionClient()
}

export async function accountSession() {
  return accountClient ? (await accountClient.auth.getSession()).data.session : null
}

export async function authenticatedLokClient(): Promise<SupabaseClient | null> {
  const session = await accountSession()
  return session && !session.user.is_anonymous ? accountClient : null
}

/** Match the Hub callback: exchange the one-time PKCE code before reading the shared session. */
export async function completeLokSignInFromUrl(): Promise<void> {
  const code = new URLSearchParams(location.search).get('code')
  if (!code) return
  if (!accountClient) throw new Error('Account sign-in is not configured.')
  const { error } = await accountClient.auth.exchangeCodeForSession(code)
  if (error) throw new Error(error.message)
  const clean = new URL(location.href)
  clean.searchParams.delete('code')
  history.replaceState(history.state, '', clean)
}

export async function sendLokSignIn(email: string): Promise<void> {
  if (!accountClient) throw new Error('Account sign-in is not configured.')
  const callback = new URL('/', location.origin)
  callback.searchParams.set('auth', '1')
  const arcadePath = new URLSearchParams(location.search).get('arcade')
  if (arcadePath && /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(arcadePath)) callback.searchParams.set('arcade', arcadePath)
  const { error } = await accountClient.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
  })
  if (error) throw new Error(error.message)
}

export async function signOutLok(): Promise<void> {
  await accountClient?.auth.signOut()
}
