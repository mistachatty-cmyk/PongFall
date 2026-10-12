import type { AudioEngine } from './engine'
import { CATALOGS, PlayTrack, parseCatalog, isPlayable, lockNote } from './playlist'
import { MUSIC } from './music'
import { authenticatedLokClient } from '../net/playerAuth'
import { getLocalAudio, importLocalAudio, listLocalAudio, LocalAudioTrack, removeLocalAudio, setLocalAudioFavorite } from './localLibrary'

export const DJ_ID = 'dj'
const KEY = 'pongfall.musicPlayer'
const LIBRARY_KEY = 'pongfall.musicLibrary'
const LOCAL_PREFIX = 'file:'
const FAVORITES_ID = '@favorites'
const LOCAL_ID = '@local'
const LOK_ID = '@lok'

export interface MusicItem {
  id: string; title: string; artist?: string; album?: string; locked: boolean; note?: string
  source?: string; sourceUrl?: string; local?: boolean; favorite?: boolean; mime?: string; size?: number
}
export interface MusicPlaylist { id: string; name: string; trackIds: string[] }
export interface ImportReport { added: number; skipped: string[] }
export interface MusicPlayer {
  /** Call from a user gesture to resume the saved track. */
  kick(): void
  toggle(): void
  select(id: string): void
  next(d?: 1 | -1): void
  seek(seconds: number): void
  setShuffle(on: boolean): void
  setRepeat(mode: 'off' | 'all' | 'one'): void
  setCollection(id: string | null): void
  collection(): string | null
  collections(): Array<{ id: string | null; name: string }>
  playlists(): MusicPlaylist[]
  createPlaylist(name: string): MusicPlaylist
  deletePlaylist(id: string): void
  addToPlaylist(playlistId: string, trackId: string): void
  removeFromPlaylist(playlistId: string, trackId: string): void
  toggleFavorite(trackId: string): void
  importFiles(files: File[]): Promise<ImportReport>
  removeLocalTrack(trackId: string): Promise<void>
  items(): MusicItem[]
  state(): { current: string; title: string; playing: boolean; loading: boolean; error: string; time: number; duration: number; shuffle: boolean; repeat: 'off' | 'all' | 'one' }
  onChange(cb: () => void): () => void
  destroy(): void
}

interface SavedLibrary { playlists: MusicPlaylist[]; favorites: string[] }
function readLibrary(): SavedLibrary {
  try {
    const raw = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '{}') as Partial<SavedLibrary>
    return {
      playlists: Array.isArray(raw.playlists) ? raw.playlists.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.trackIds)) : [],
      favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((id): id is string => typeof id === 'string') : [],
    }
  } catch { return { playlists: [], favorites: [] } }
}

/** A persistent, device-local music library plus the shared, entitlement-gated LOK catalog. */
export function createMusicPlayer(audio: AudioEngine): MusicPlayer {
  let saved: { on: boolean; id: string; collection: string | null; shuffle: boolean; repeat: 'off' | 'all' | 'one' } = { on: false, id: DJ_ID, collection: null, shuffle: false, repeat: 'all' }
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    saved = { on: s.on !== false, id: typeof s.id === 'string' ? s.id : DJ_ID, collection: typeof s.collection === 'string' ? s.collection : null, shuffle: s.shuffle === true, repeat: ['off', 'all', 'one'].includes(s.repeat) ? s.repeat : 'all' }
  } catch { /* browser storage can be unavailable */ }
  let on = false, wantsPlayback = saved.on, current = saved.id, currentCollection = saved.collection, shuffle = saved.shuffle, repeat = saved.repeat
  let streamed: PlayTrack[] = [], localTracks: LocalAudioTrack[] = []
  let library = readLibrary()
  let lokProgress: Record<string, number> = {}, lokEarned = new Set<string>()
  let loading = false, error = ''
  let el: HTMLAudioElement | null = null, objectUrl = ''
  let time = 0, duration = 0
  const subs: Array<() => void> = []
  const fire = () => subs.slice().forEach(f => f())
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ on, id: current, collection: currentCollection, shuffle, repeat })) } catch { /* ignore */ } }
  const saveLibrary = () => { try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)) } catch { /* ignore */ } }
  const unlocked = (track: PlayTrack) => isPlayable(track, lokProgress, lokEarned)
  const streamedItems = () => streamed.map(t => ({ id: t.id, title: t.title, artist: t.artist, album: t.album, locked: !unlocked(t), note: unlocked(t) ? undefined : lockNote(t), source: t.source, sourceUrl: t.sourceUrl, favorite: library.favorites.includes(t.id) }))
  const localItems = () => localTracks.map(t => ({ id: `${LOCAL_PREFIX}${t.id}`, title: t.title, artist: 'On this device', locked: false, local: true, favorite: t.favorite || library.favorites.includes(`${LOCAL_PREFIX}${t.id}`), mime: t.mime, size: t.size }))
  const allItems = (): MusicItem[] => [{ id: DJ_ID, title: MUSIC.title, artist: MUSIC.credit, locked: false, favorite: library.favorites.includes(DJ_ID) }, ...streamedItems(), ...localItems()]
  const titleOf = (id: string) => allItems().find(t => t.id === id)?.title ?? MUSIC.title
  const selected = (id: string) => allItems().find(t => t.id === id)
  const volume = () => audio.isMuted() ? 0 : Math.min(1, audio.getVolume() * audio.getBus('mus') * 0.8)
  const timer = setInterval(() => { if (el) { el.volume = volume(); if (!el.paused) { time = el.currentTime || 0; duration = Number.isFinite(el.duration) ? el.duration : 0; fire() } } }, 500)

  function stopMedia() {
    if (!el) return
    el.pause(); el.removeAttribute('src'); el.load()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
  function stopAll() { audio.stopMusic(); stopMedia() }
  function isPlayableId(id: string) {
    if (id === DJ_ID) return true
    if (id.startsWith(LOCAL_PREFIX)) return localTracks.some(t => t.id === id.slice(LOCAL_PREFIX.length))
    const t = streamed.find(x => x.id === id)
    return !!t && unlocked(t)
  }
  function queueIds() {
    const ids = allItems().filter(t => !t.locked).map(t => t.id)
    if (currentCollection === FAVORITES_ID) return ids.filter(id => library.favorites.includes(id) || (id.startsWith(LOCAL_PREFIX) && localTracks.find(t => `${LOCAL_PREFIX}${t.id}` === id)?.favorite))
    if (currentCollection === LOCAL_ID) return ids.filter(id => id.startsWith(LOCAL_PREFIX))
    if (currentCollection === LOK_ID) return ids.filter(id => streamed.some(t => t.id === id) || id === DJ_ID)
    const playlist = library.playlists.find(p => p.id === currentCollection)
    return playlist ? playlist.trackIds.filter(id => isPlayableId(id)) : ids
  }
  async function start() {
    if (current === DJ_ID) { stopMedia(); audio.startMusic(); return }
    const item = selected(current)
    if (!item || item.locked) { current = DJ_ID; save(); audio.startMusic(); return }
    audio.stopMusic()
    if (!el) {
      el = new Audio(); el.preload = 'metadata'
      el.addEventListener('ended', () => {
        if (repeat === 'one') { el!.currentTime = 0; void el!.play(); return }
        if (repeat === 'off' && !shuffle) { on = false; save(); fire(); return }
        api.next(1)
      })
      el.addEventListener('error', () => { error = 'This file is unavailable or the browser cannot play its format.'; on = false; fire() })
      el.addEventListener('loadedmetadata', () => { duration = Number.isFinite(el?.duration) ? el!.duration : 0; fire() })
    }
    if (item.local) {
      const blob = await getLocalAudio(current.slice(LOCAL_PREFIX.length))
      if (!blob) { error = 'This local audio file could not be found. Remove it from the library and import it again.'; on = false; fire(); return }
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(blob); el.src = objectUrl
    } else {
      const t = streamed.find(x => x.id === current)
      if (!t || !unlocked(t)) { error = 'This LOK track is not available for this account.'; on = false; fire(); return }
      if (el.getAttribute('src') !== t.url) el.src = t.url
    }
    error = ''; el.volume = volume(); time = 0
    try { await el.play(); on = true } catch (e) { on = false; error = e instanceof Error && e.name === 'NotAllowedError' ? 'Press Play to allow audio in this browser.' : 'That track could not be played.' }
    save(); fire()
  }
  async function load() {
    loading = true; fire()
    const [lists, local] = await Promise.all([
      Promise.all(CATALOGS.map(u => fetch(u, { credentials: 'omit' }).then(r => r.ok ? r.json() : null).catch(() => null))),
      listLocalAudio().catch(() => [] as LocalAudioTrack[]),
    ])
    streamed = lists.flatMap(l => parseCatalog(l)); localTracks = local
    await loadLokMusicAccess()
    loading = false
    if (!isPlayableId(current)) current = DJ_ID
    fire()
  }
  async function loadLokMusicAccess() {
    try {
      const client = await authenticatedLokClient()
      if (!client) return
      const userId = (await client.auth.getSession()).data.session?.user.id
      if (!userId) return
      const [progress, earned] = await Promise.all([
        client.from('lok_music_progress').select('app_key,objectives').eq('user_id', userId),
        client.from('lok_music_unlocked').select('track_key').eq('user_id', userId).limit(1000),
      ])
      if (progress.error || earned.error) return
      lokProgress = Object.fromEntries((progress.data ?? []).map((row: { app_key: string; objectives: number }) => [row.app_key, row.objectives]))
      lokEarned = new Set((earned.data ?? []).map((row: { track_key: string }) => row.track_key))
    } catch { /* unavailable account data leaves gated tracks locked */ }
  }

  const api: MusicPlayer = {
    kick() { if (wantsPlayback && !on) { on = true; audio.unlock(); if (current === DJ_ID) audio.startMusic(); else void start(); save(); fire() } },
    toggle() { on = !on; wantsPlayback = on; if (on) { audio.unlock(); void start() } else stopAll(); save(); fire() },
    select(id) { if (!isPlayableId(id)) return; stopAll(); current = id; on = true; wantsPlayback = true; audio.unlock(); void start(); save(); fire() },
    next(direction = 1) {
      const ids = queueIds(), i = Math.max(0, ids.indexOf(current))
      if (!ids.length) return
      const next = shuffle && ids.length > 1 ? ids.filter(id => id !== current)[Math.floor(Math.random() * (ids.length - 1))]! : ids[(i + direction + ids.length) % ids.length]!
      api.select(next)
    },
    seek(seconds) { if (el && Number.isFinite(duration)) { el.currentTime = Math.max(0, Math.min(duration, seconds)); time = el.currentTime; fire() } },
    setShuffle(value) { shuffle = value; save(); fire() },
    setRepeat(value) { repeat = value; save(); fire() },
    setCollection(id) { currentCollection = id; save(); fire() },
    collection: () => currentCollection,
    collections: () => [{ id: null, name: 'All tracks' }, { id: LOK_ID, name: 'LOK soundtrack' }, { id: LOCAL_ID, name: 'On this device' }, { id: FAVORITES_ID, name: 'Favorites' }, ...library.playlists.map(p => ({ id: p.id, name: p.name }))],
    playlists: () => library.playlists.map(p => ({ ...p, trackIds: [...p.trackIds] })),
    createPlaylist(name) {
      const clean = name.trim().slice(0, 48)
      if (!clean) throw new Error('Enter a playlist name.')
      const p = { id: `playlist-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`, name: clean, trackIds: [] }
      library.playlists = [...library.playlists, p]; saveLibrary(); fire(); return p
    },
    deletePlaylist(id) { library.playlists = library.playlists.filter(p => p.id !== id); if (currentCollection === id) currentCollection = null; saveLibrary(); save(); fire() },
    addToPlaylist(playlistId, trackId) { library.playlists = library.playlists.map(p => p.id === playlistId && !p.trackIds.includes(trackId) ? { ...p, trackIds: [...p.trackIds, trackId] } : p); saveLibrary(); fire() },
    removeFromPlaylist(playlistId, trackId) { library.playlists = library.playlists.map(p => p.id === playlistId ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } : p); saveLibrary(); fire() },
    toggleFavorite(id) {
      const item = selected(id); if (!item) return
      if (item.local) {
        const localId = id.slice(LOCAL_PREFIX.length), track = localTracks.find(t => t.id === localId)
        if (track) { track.favorite = !track.favorite; void setLocalAudioFavorite(localId, track.favorite).catch(() => { error = 'Could not save this favorite.'; fire() }) }
      }
      library.favorites = library.favorites.includes(id) ? library.favorites.filter(x => x !== id) : [...library.favorites, id]
      saveLibrary(); fire()
    },
    async importFiles(files) {
      const result = await importLocalAudio(files)
      localTracks = await listLocalAudio()
      fire(); return { added: result.added.length, skipped: result.skipped }
    },
    async removeLocalTrack(id) {
      const localId = id.startsWith(LOCAL_PREFIX) ? id.slice(LOCAL_PREFIX.length) : id
      if (current === `${LOCAL_PREFIX}${localId}`) { stopAll(); current = DJ_ID; on = false; save() }
      await removeLocalAudio(localId)
      localTracks = localTracks.filter(t => t.id !== localId)
      const trackId = `${LOCAL_PREFIX}${localId}`
      library.favorites = library.favorites.filter(x => x !== trackId)
      library.playlists = library.playlists.map(p => ({ ...p, trackIds: p.trackIds.filter(x => x !== trackId) }))
      saveLibrary(); fire()
    },
    items: allItems,
    state: () => ({ current, title: titleOf(current), playing: on, loading, error, time: el?.currentTime ?? time, duration: Number.isFinite(el?.duration) ? el!.duration : duration, shuffle, repeat }),
    onChange(cb) { subs.push(cb); return () => { const index = subs.indexOf(cb); if (index >= 0) subs.splice(index, 1) } },
    destroy() { clearInterval(timer); stopAll(); if (el) { el.src = ''; el.load(); el = null } subs.length = 0 },
  }
  void load()
  return api
}
