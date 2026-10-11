import type { AudioEngine } from './engine'
import { CATALOGS, PlayTrack, parseCatalog, isFree, lockNote } from './playlist'
import { MUSIC } from './music'

export const DJ_ID = 'dj'
const KEY = 'pongfall.musicPlayer'

export interface MusicItem { id: string; title: string; artist?: string; album?: string; locked: boolean; note?: string; source?: string; sourceUrl?: string }
export interface MusicPlayer {
  /** Call from any user gesture: starts the current track unless the player was paused. */
  kick(): void
  toggle(): void
  select(id: string): void
  next(d?: 1 | -1): void
  items(): MusicItem[]
  state(): { current: string; title: string; playing: boolean; loading: boolean; error: string }
  onChange(cb: () => void): void
  destroy(): void
}

/** Plays the DJ'd default track or a streamed LOK playlist track, with one set of controls. Audio only; never feeds the sim. */
export function createMusicPlayer(audio: AudioEngine): MusicPlayer {
  let saved = { on: true, id: DJ_ID }
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); saved = { on: s.on !== false, id: typeof s.id === 'string' ? s.id : DJ_ID } } catch { /* ignore */ }
  let on = saved.on, current = saved.id
  let streamed: PlayTrack[] = []
  let loading = false, error = ''
  let el: HTMLAudioElement | null = null
  const subs: Array<() => void> = []
  const fire = () => subs.forEach(f => f())
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ on, id: current })) } catch { /* ignore */ } }
  const playable = () => [DJ_ID, ...streamed.filter(isFree).map(t => t.id)]
  const titleOf = (id: string) => id === DJ_ID ? MUSIC.title : streamed.find(t => t.id === id)?.title ?? MUSIC.title

  const vol = () => audio.isMuted() ? 0 : Math.min(1, audio.getVolume() * audio.getBus('mus') * 0.8)
  const timer = setInterval(() => { if (el) el.volume = vol() }, 250)

  function stopAll() {
    audio.stopMusic()
    if (el) { el.pause(); el.removeAttribute('src'); el.load() }
  }
  function start() {
    if (current === DJ_ID) { audio.startMusic(); return }
    const t = streamed.find(x => x.id === current)
    if (!t || !isFree(t)) { current = DJ_ID; audio.startMusic(); return }
    audio.stopMusic()
    if (!el) { el = new Audio(); el.preload = 'none'; el.addEventListener('ended', () => api.next(1)); el.addEventListener('error', () => { error = 'That track could not be played.'; fire() }) }
    if (el.getAttribute('src') !== t.url) { el.src = t.url; error = '' }
    el.volume = vol()
    void el.play().catch(() => { /* needs a gesture or the file is missing */ })
  }

  async function load() {
    loading = true; fire()
    const lists = await Promise.all(CATALOGS.map(u => fetch(u, { credentials: 'omit' }).then(r => r.ok ? r.json() : null).catch(() => null)))
    streamed = lists.flatMap(l => parseCatalog(l))
    loading = false
    if (current !== DJ_ID && !streamed.some(t => t.id === current)) current = DJ_ID
    fire()
  }
  void load()

  const api: MusicPlayer = {
    kick() { if (on) start() },
    toggle() { on = !on; save(); if (on) start(); else stopAll(); fire() },
    select(id) {
      const t = streamed.find(x => x.id === id)
      if (id !== DJ_ID && (!t || !isFree(t))) return
      stopAll(); current = id; on = true; save(); start(); fire()
    },
    next(d = 1) {
      const list = playable(), i = Math.max(0, list.indexOf(current))
      api.select(list[(i + d + list.length) % list.length]!)
    },
    items() {
      return [{ id: DJ_ID, title: MUSIC.title, artist: MUSIC.credit, locked: false } as MusicItem,
        ...streamed.map(t => ({ id: t.id, title: t.title, artist: t.artist, album: t.album, locked: !isFree(t), note: isFree(t) ? undefined : lockNote(t), source: t.source, sourceUrl: t.sourceUrl }))]
    },
    state: () => ({ current, title: titleOf(current), playing: on, loading, error }),
    onChange(cb) { subs.push(cb) },
    destroy() { clearInterval(timer); stopAll(); subs.length = 0 },
  }
  return api
}
