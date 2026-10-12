/** Browser storage adapter for the shared GSix Supabase Auth session. */
export interface LokSessionStorage {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

const isGsixDomain = (host: string) => host === 'gsix.online' || host.endsWith('.gsix.online')
const isLocalHost = (host: string) => host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost')
const MAX_COOKIE_VALUE = 3600

function fitSession(rawValue: string): string {
  if (encodeURIComponent(rawValue).length <= MAX_COOKIE_VALUE) return rawValue
  try {
    const value = JSON.parse(rawValue) as Record<string, unknown>
    if (!value || typeof value !== 'object' || !('access_token' in value)) return rawValue
    delete value.provider_token
    delete value.provider_refresh_token
    const user = value.user as Record<string, unknown> | undefined
    if (user && typeof user === 'object') {
      delete user.identities
      const meta = user.user_metadata as Record<string, unknown> | undefined
      if (meta && typeof meta === 'object') {
        const small: Record<string, unknown> = {}
        for (const name of ['full_name', 'name', 'avatar_url', 'picture', 'email']) if (typeof meta[name] === 'string') small[name] = meta[name]
        user.user_metadata = small
      }
    }
    return JSON.stringify(value)
  } catch { return rawValue }
}

/** Matches the LOK Hub's parent-domain cookie contract. */
export class LokSessionAdapter implements LokSessionStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof document === 'undefined') return null
    const prefix = `${encodeURIComponent(key)}=`
    for (const item of document.cookie.split(';')) {
      const cookie = item.trim()
      if (cookie.startsWith(prefix)) {
        try { return decodeURIComponent(cookie.slice(prefix.length)) } catch { return null }
      }
    }
    // A local copy on a production GSix origin could restore a session after
    // another LOK app signed out, so only previews and local development fall back.
    if (isGsixDomain(window.location.hostname)) return null
    try { return window.localStorage.getItem(key) } catch { return null }
  }

  async setItem(key: string, rawValue: string): Promise<void> {
    if (typeof document === 'undefined') return
    const value = fitSession(rawValue)
    const host = window.location.hostname
    const gsix = isGsixDomain(host)
    const parts = [
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      'Path=/', 'Max-Age=604800', 'SameSite=Lax',
    ]
    if (gsix) parts.push('Domain=.gsix.online')
    if (window.location.protocol === 'https:' && !isLocalHost(host)) parts.push('Secure')
    document.cookie = parts.join('; ')
    if (gsix) {
      if (await this.getItem(key) !== value) throw new Error('Your browser blocked the GSix sign-in cookie. Allow cookies for gsix.online and try again.')
      return
    }
    try { window.localStorage.setItem(key, value) } catch { /* Browser storage may be disabled. */ }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof document !== 'undefined') {
      const host = window.location.hostname
      const parts = [`${encodeURIComponent(key)}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax']
      if (isGsixDomain(host)) parts.push('Domain=.gsix.online')
      if (window.location.protocol === 'https:' && !isLocalHost(host)) parts.push('Secure')
      document.cookie = parts.join('; ')
    }
    try { window.localStorage.removeItem(key) } catch { /* Browser storage may be disabled. */ }
  }
}

/** Only allow the Hub to return to a same-site game path. */
export function arcadeReturnUrl(rawPath: string | null): string | null {
  if (!rawPath || !/^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(rawPath)) return null
  return `https://gsix.online${rawPath}?signedin=pongfall`
}
