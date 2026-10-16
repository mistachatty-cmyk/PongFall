// The player's own LOK profile picture, read from their account session. Opt-in by use: it is only fetched when the player places
// the "Profile picture" image on a side. It is never sent to other players; an opponent sees the plain silhouette instead.

let img: HTMLImageElement | null = null
let started = false

export const PROFILE_ART_ID = 'profile-self'

/** Only plain https pictures are accepted. */
export const safeAvatarUrl = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.length > 2048) return null
  try { const u = new URL(v); return u.protocol === 'https:' ? u.href : null } catch { return null }
}

async function load() {
  try {
    const { accountSession } = await import('../net/playerAuth')
    const meta = (await accountSession())?.user.user_metadata as Record<string, unknown> | undefined
    const url = safeAvatarUrl(meta?.avatar_url) ?? safeAvatarUrl(meta?.picture)
    if (!url || typeof Image === 'undefined') return
    const i = new Image(); i.referrerPolicy = 'no-referrer'
    i.onload = () => { img = i }
    i.src = url
  } catch { /* signed out or offline: the silhouette stays */ }
}

/** The signed-in player's picture once loaded, else null (starts loading on the first call). */
export function ownProfileImage(): HTMLImageElement | null {
  if (!started) { started = true; void load() }
  return img
}
