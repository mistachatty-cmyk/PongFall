// Shared LOK playlists (lok.playlist/v1). Pure parsing so it can be tested; fetching happens in musicPlayer.ts.
export interface PlayTrack {
  id: string
  title: string
  artist?: string
  url: string
  mime?: string
  /** Free tracks play anywhere. A gate means "earned in the source game" - PongFall cannot check it, so those stay locked here. */
  gate?: { app: string; objectives: number; unit?: string }
  source?: string
  /** Where to find the game that has this song. */
  sourceUrl?: string
  album?: string
}

/** 616 Survivor's soundtrack (Lokifed - Take 1). Hosted by 616; PongFall only links to it. */
export const CATALOGS = ['https://survivor.gsix.online/lok-soundtrack.json']

const str = (v: unknown, max = 200) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined
const httpsUrl = (v: unknown) => { const s = str(v, 2048); if (!s) return undefined; try { return new URL(s).protocol === 'https:' ? s : undefined } catch { return undefined } }

export function parseCatalog(raw: unknown): PlayTrack[] {
  if (!raw || typeof raw !== 'object') return []
  const r = raw as Record<string, unknown>
  if (r.schema !== 'lok.playlist/v1' || !Array.isArray(r.tracks)) return []
  const artist = str(r.artist)
  const src = r.source && typeof r.source === 'object' ? r.source as Record<string, unknown> : undefined
  const source = src ? str(src.name) : undefined, sourceUrl = src ? httpsUrl(src.url) : undefined
  const seen = new Set<string>(), out: PlayTrack[] = []
  for (const t of r.tracks.slice(0, 200)) {
    if (!t || typeof t !== 'object') continue
    const o = t as Record<string, unknown>
    const id = str(o.id, 80), title = str(o.title), url = httpsUrl(o.url)
    if (!id || !title || !url || seen.has(id)) continue
    seen.add(id)
    const track: PlayTrack = { id: `${str(r.id, 80) ?? 'catalog'}:${id}`, title, url, artist: str(o.artist) ?? artist, mime: str(o.mime, 60), source, sourceUrl, album: str(o.album) }
    const g = o.gate as Record<string, unknown> | undefined
    if (g && str(g.app, 60) && typeof g.objectives === 'number' && g.objectives >= 0) track.gate = { app: str(g.app, 60)!, objectives: Math.floor(g.objectives), unit: str(g.unit, 30) }
    out.push(track)
  }
  return out
}

/** A track is playable here when it has no gate or the gate asks for nothing. */
export const isFree = (t: PlayTrack) => !t.gate || t.gate.objectives === 0
/** LOK music progress and earned drops are account-scoped shared entitlements. */
export function isPlayable(t: PlayTrack, progress: Record<string, number> = {}, earned: ReadonlySet<string> = new Set()): boolean {
  return isFree(t) || earned.has(t.id) || (t.gate ? (progress[t.gate.app] ?? 0) >= t.gate.objectives : false)
}
export const lockNote = (t: PlayTrack) => t.gate ? `Unlocks in ${t.source ?? t.gate.app} (${t.gate.objectives} ${t.gate.unit ?? 'objective'}${t.gate.objectives === 1 ? '' : 's'})` : ''
