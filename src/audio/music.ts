/** DJ planner for the default track. Pure data in, pure data out; audio only, never feeds the sim. */
export const MUSIC = {
  /** Served from public/; drop the MP3 here. Missing file = silent, the game plays on. */
  url: '/music/game-jam-playlist.mp3',
  title: 'Game Jam Playlist',
  credit: 'Trijam',
  creditUrl: 'https://www.youtube.com/@TrijamGJ',
  /** Seconds each cut plays before the next jump (random within the range). */
  minHold: 14,
  maxHold: 42,
  /** Crossfade length in seconds. */
  fade: 1.6,
  /** Keep jumps away from the very start/end of the track. */
  margin: 8,
} as const

export interface DjCut { start: number; hold: number }

/** Pick a random spot and how long to stay there. `r` is any () => [0,1) source (Math.random in play, seeded in tests). */
export function planCut(duration: number, r: () => number, prev = -1): DjCut {
  const hold = MUSIC.minHold + r() * (MUSIC.maxHold - MUSIC.minHold)
  if (!(duration > 0)) return { start: 0, hold }
  const room = Math.max(0, duration - MUSIC.margin * 2 - hold)
  let start = MUSIC.margin + r() * room
  if (prev >= 0 && Math.abs(start - prev) < MUSIC.maxHold && room > MUSIC.maxHold * 2) start = MUSIC.margin + ((start - MUSIC.margin + room / 2) % room)
  return { start: Math.min(start, Math.max(0, duration - hold - 1)), hold }
}
