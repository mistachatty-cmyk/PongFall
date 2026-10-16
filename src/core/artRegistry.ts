// Every picture a player can place on an arena side. Rights decision: own art + properly licensed art only.
// Each entry must name its source and licence; `cleared: false` entries stay hidden until the owner clears them.
import { FLAGS, FLAG_LICENSE, FLAG_SOURCE } from './artFlags.generated'

export type ArtKind = 'flag' | 'album' | 'creator' | 'profile' | 'emblem'
export interface ArtEntry {
  id: string
  kind: ArtKind
  name: string
  /** Path under public/ (served from the site root) */
  src: string
  source: string
  license: string
  attribution: string
  /** Short line spoken when the picture is clicked in the arena */
  quip?: string
  /** Albums: the music player track this cover plays and pauses when clicked */
  trackId?: string
  /** Flags: the continent, for the picker */
  group?: string
  cleared: boolean
}

const own = (id: string, name: string, quip: string): ArtEntry => ({ id, kind: 'emblem', name, src: `art/${id}.svg`, source: 'GSix Designs (original)', license: 'Original work, free to use in PongFall', attribution: 'GSix Designs', quip, cleared: true })

const flag = ([code, name, continent]: readonly [string, string, string]): ArtEntry => ({
  id: `flag-${code}`, kind: 'flag', name, src: `art/flags/${code}.svg`, source: FLAG_SOURCE, license: FLAG_LICENSE, attribution: 'flag-icons by Panayiotis Lipiridis', quip: `${name}, flying in the fall.`, group: continent, cleared: true,
})

export const ART: readonly ArtEntry[] = [
  own('eye-emblem', 'Eye emblem', 'It saw that.'),
  own('tear-drop', 'Tear', 'Slice me. I dare you.'),
  own('fall-arrows', 'Fall arrows', 'Down. Always down.'),
  own('glass-crack', 'Glass crack', 'That is only a hairline.'),
  // own soundtrack art first. Covers for other artists and classic games are added only after the owner clears each one.
  { id: 'album-jam-playlist', kind: 'album', name: 'Game Jam Playlist', src: 'art/album-jam-playlist.svg', source: 'GSix Designs (original cover art)', license: 'Original work, free to use in PongFall', attribution: 'GSix Designs · music: Trijam', quip: 'Press play on the fall.', trackId: 'dj', cleared: true },
  // your own LOK profile picture: players see the silhouette, you see your real picture on your side (see profilePicture.ts)
  { id: 'profile-self', kind: 'profile', name: 'My profile picture', src: 'art/profile-silhouette.svg', source: 'GSix Designs (silhouette); picture from your LOK account', license: 'Original silhouette; your own picture stays yours and is never sent to other players', attribution: 'You', quip: 'That is me.', cleared: true },
  ...FLAGS.map(flag),
]

/** Entries the player may see: cleared ones only. */
export const visibleArt = (): ArtEntry[] => ART.filter(a => a.cleared)
export const artById = (id: string): ArtEntry | undefined => ART.find(a => a.id === id && a.cleared)
export const artUrl = (a: ArtEntry): string => `${import.meta.env?.BASE_URL ?? '/'}${a.src}`.replace(/\/{2,}/g, '/')
export const flagGroups = (): string[] => [...new Set(ART.filter(a => a.kind === 'flag').map(a => a.group!))].sort()
