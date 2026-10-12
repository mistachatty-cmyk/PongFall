import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const onlineConfigured = Boolean(url && key && import.meta.env.VITE_PONGFALL_ROOMS_READY === 'true')

// Separate storage keys keep a PongFall guest from replacing a LOK account
// session, including one already used by another GSix game on this origin.
const make = (storageKey: string, detectSessionInUrl: boolean) => url && key ? createClient(url, key, {
  auth: { storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl },
  realtime: { params: { eventsPerSecond: 40 } },
}) : null
const guestClient = make('pongfall.guest.auth', false)
const accountClient = make('pongfall.lok.auth', true)

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

export async function sendLokSignIn(email: string): Promise<void> {
  if (!accountClient) throw new Error('Account sign-in is not configured.')
  const { error } = await accountClient.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/?auth=1` },
  })
  if (error) throw new Error(error.message)
}

export async function signOutLok(): Promise<void> {
  await accountClient?.auth.signOut()
}
