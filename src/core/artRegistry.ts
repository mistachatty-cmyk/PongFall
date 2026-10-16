// Every picture a player can place on an arena side. Rights decision: own art + properly licensed art only.
// Each entry must name its source and licence; `cleared: false` entries stay hidden until the owner clears them.
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
  cleared: boolean
}

const own = (id: string, name: string, quip: string): ArtEntry => ({ id, kind: 'emblem', name, src: `art/${id}.svg`, source: 'GSix Designs (original)', license: 'Original work, free to use in PongFall', attribution: 'GSix Designs', quip, cleared: true })

export const ART: readonly ArtEntry[] = [
  own('eye-emblem', 'Eye emblem', 'It saw that.'),
  own('tear-drop', 'Tear', 'Slice me. I dare you.'),
  own('fall-arrows', 'Fall arrows', 'Down. Always down.'),
  own('glass-crack', 'Glass crack', 'That is only a hairline.'),
]

/** Entries the player may see: cleared ones only. */
export const visibleArt = (): ArtEntry[] => ART.filter(a => a.cleared)
export const artById = (id: string): ArtEntry | undefined => ART.find(a => a.id === id && a.cleared)
export const artUrl = (a: ArtEntry): string => `${import.meta.env?.BASE_URL ?? '/'}${a.src}`.replace(/\/{2,}/g, '/')
