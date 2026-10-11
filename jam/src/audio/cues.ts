// Pure data: every sound is a recipe, so it can be tested without an AudioContext.
import type { WorldEvent } from '../sim/world'

export type CueId = 'paddle' | 'wall' | 'crack' | 'break' | 'score' | 'squish' | 'slice' | 'tear' | 'thrust' | 'serve' | 'power' | 'boost' | 'triple' | 'bump'

export interface CueDef {
  wave: 'sine' | 'square' | 'sawtooth' | 'triangle'
  f0: number          // start frequency (Hz)
  f1: number          // end frequency (Hz): the glide
  ms: number
  gain: number
  noise: number       // 0..1 share of filtered noise mixed in
  band: number        // bandpass centre for the noise layer (Hz)
  bandEnd?: number    // sweep the bandpass to this (Hz)
  wobbleHz?: number   // LFO on the pitch: the wet, squelchy part of a squish
  wobbleDepth?: number
  seq?: Array<[number, number]>   // extra square notes [Hz, start ms], for classic two-tone blips
  tinkles?: number                // glass tinkles layered on top (see tinklePlan)
  shatter?: boolean               // a bright noise burst + low thump for breaking glass
}

// PLACEHOLDER pong blips (paddle, wall, score, serve): classic square-wave beeps, meant to be swapped for real sounds later.
export const CUES: Record<CueId, CueDef> = {
  paddle: { wave: 'square', f0: 440, f1: 440, ms: 70, gain: 0.12, noise: 0, band: 1800 },
  wall: { wave: 'square', f0: 220, f1: 220, ms: 70, gain: 0.12, noise: 0, band: 400 },
  crack: { wave: 'square', f0: 2600, f1: 900, ms: 70, gain: 0.1, noise: 0.8, band: 6000, tinkles: 3 },
  break: { wave: 'sawtooth', f0: 160, f1: 45, ms: 520, gain: 0.22, noise: 0.5, band: 5200, bandEnd: 900, tinkles: 16, shatter: true },
  score: { wave: 'square', f0: 523, f1: 523, ms: 240, gain: 0.12, noise: 0, band: 2000, seq: [[784, 110]] },
  squish: { wave: 'sine', f0: 340, f1: 70, ms: 280, gain: 0.3, noise: 0.45, band: 900, bandEnd: 260, wobbleHz: 26, wobbleDepth: 70 },
  slice: { wave: 'sine', f0: 1500, f1: 400, ms: 120, gain: 0.12, noise: 0.6, band: 3200, bandEnd: 900 },
  tear: { wave: 'sine', f0: 1100, f1: 520, ms: 160, gain: 0.18, noise: 0, band: 2000 },
  thrust: { wave: 'sine', f0: 200, f1: 700, ms: 160, gain: 0.14, noise: 0.5, band: 700, bandEnd: 2600 },
  serve: { wave: 'square', f0: 330, f1: 330, ms: 90, gain: 0.09, noise: 0, band: 1200 },
  power: { wave: 'triangle', f0: 260, f1: 1040, ms: 380, gain: 0.2, noise: 0.15, band: 2400 },
  triple: { wave: 'square', f0: 523, f1: 523, ms: 520, gain: 0.13, noise: 0, band: 2000, seq: [[659, 100], [784, 200], [1047, 300]] },
  bump: { wave: 'sine', f0: 110, f1: 48, ms: 220, gain: 0.26, noise: 0.3, band: 300 },
  boost: { wave: 'sawtooth', f0: 520, f1: 90, ms: 260, gain: 0.24, noise: 0.35, band: 1400, bandEnd: 300 },
}

export interface Tinkle { at: number; f: number; dur: number; gain: number }
/** The staggered glass tinkles for a crack or break: deterministic for a given seed, bounded in time and pitch. */
export function tinklePlan(n: number, seed: number): Tinkle[] {
  let a = (seed ^ 0x9e3779b9) >>> 0
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const out: Tinkle[] = []
  const count = Math.max(0, Math.min(24, Math.round(n)))
  for (let i = 0; i < count; i++) out.push({ at: Math.pow(r(), 1.6) * 0.7, f: 2000 + r() * 7000, dur: 0.05 + r() * 0.13, gain: 0.03 + r() * 0.07 })
  return out.sort((x, y) => x.at - y.at)
}

export const MIN_RETRIGGER_MS: Partial<Record<CueId, number>> = { wall: 90, paddle: 40, squish: 120, slice: 60, crack: 80, tear: 40 }
export const MAX_VOICES = 12

/** Which cue (if any) a sim event should make, with a 0..1 intensity. */
export function cueForEvent(e: WorldEvent): { cue: CueId; level: number } | null {
  switch (e.kind) {
    case 'paddle': return e.boosted ? null : { cue: 'paddle', level: Math.min(1, e.speed / 900) }
    case 'wall': return { cue: 'wall', level: Math.min(1, e.speed / 800) }
    case 'crack': return { cue: 'crack', level: 0.6 + 0.2 * e.hits }
    case 'break': return { cue: 'break', level: 1 }
    case 'score': return { cue: 'score', level: e.side === 0 ? 1 : 0.6 }
    case 'squish': return { cue: 'squish', level: 1 }
    case 'thrust': return { cue: 'thrust', level: 1 }
    case 'serve': return { cue: 'serve', level: 1 }
    case 'power': return e.mode === 'end' ? null : { cue: 'power', level: 1 }
    case 'boost': return { cue: 'boost', level: 1 }
    case 'triple': return { cue: 'triple', level: 1 }
    case 'bump': return { cue: 'bump', level: e.level }
    case 'satHit': return { cue: 'crack', level: 0.35 }
    case 'satBreak': return { cue: 'break', level: 0.45 }
    case 'tear': return { cue: 'tear', level: 1 }
    case 'slice': return { cue: 'slice', level: Math.min(1, 0.6 + e.count * 0.2) }
    default: return null
  }
}

/** Throttle: drop a cue that retriggers too fast or when too many voices are playing. */
export function shouldPlay(cue: CueId, nowMs: number, lastMs: number, active: number): boolean {
  if (active >= MAX_VOICES) return false
  return nowMs - lastMs >= (MIN_RETRIGGER_MS[cue] ?? 0)
}

/** Whistling wind ambience parameters from the fall speed and wind. */
export function ambienceFor(fallV: number, wind: number) {
  const f = Math.max(0, Math.min(1, fallV / 360))
  const gust = Math.min(1, Math.abs(wind) / 260)
  return {
    gain: 0.015 + 0.075 * f + 0.03 * gust,          // the whistle's level
    whistleHz: 620 + 1500 * f + 400 * gust,        // pitch climbs as you fall faster and in gusts
    q: 10 + 14 * f,
    rumble: 0.02 + 0.05 * f,
    vibrato: 3 + 5 * f,
  }
}
