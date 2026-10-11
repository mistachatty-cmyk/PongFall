// Pure data: every sound is a recipe, so it can be tested without an AudioContext.
import type { WorldEvent } from '../sim/world'

export type CueId = 'paddle' | 'wall' | 'crack' | 'break' | 'score' | 'squish' | 'slice' | 'tear' | 'thrust' | 'serve'

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
}

export const CUES: Record<CueId, CueDef> = {
  paddle: { wave: 'triangle', f0: 340, f1: 220, ms: 90, gain: 0.22, noise: 0.15, band: 1800 },
  wall: { wave: 'sine', f0: 120, f1: 55, ms: 200, gain: 0.3, noise: 0.35, band: 400 },
  crack: { wave: 'square', f0: 1400, f1: 500, ms: 130, gain: 0.14, noise: 0.7, band: 5200 },
  break: { wave: 'sawtooth', f0: 900, f1: 120, ms: 520, gain: 0.2, noise: 0.85, band: 4200, bandEnd: 700 },
  score: { wave: 'triangle', f0: 440, f1: 880, ms: 260, gain: 0.2, noise: 0, band: 2000 },
  squish: { wave: 'sine', f0: 340, f1: 70, ms: 280, gain: 0.3, noise: 0.45, band: 900, bandEnd: 260, wobbleHz: 26, wobbleDepth: 70 },
  slice: { wave: 'sine', f0: 1500, f1: 400, ms: 120, gain: 0.12, noise: 0.6, band: 3200, bandEnd: 900 },
  tear: { wave: 'sine', f0: 1100, f1: 520, ms: 160, gain: 0.18, noise: 0, band: 2000 },
  thrust: { wave: 'sine', f0: 200, f1: 700, ms: 160, gain: 0.14, noise: 0.5, band: 700, bandEnd: 2600 },
  serve: { wave: 'sine', f0: 260, f1: 330, ms: 120, gain: 0.1, noise: 0, band: 1200 },
}

export const MIN_RETRIGGER_MS: Partial<Record<CueId, number>> = { wall: 90, paddle: 40, squish: 120, slice: 60, crack: 80, tear: 40 }
export const MAX_VOICES = 12

/** Which cue (if any) a sim event should make, with a 0..1 intensity. */
export function cueForEvent(e: WorldEvent): { cue: CueId; level: number } | null {
  switch (e.kind) {
    case 'paddle': return { cue: 'paddle', level: Math.min(1, e.speed / 900) }
    case 'wall': return { cue: 'wall', level: Math.min(1, e.speed / 800) }
    case 'crack': return { cue: 'crack', level: 0.6 + 0.2 * e.hits }
    case 'break': return { cue: 'break', level: 1 }
    case 'score': return { cue: 'score', level: e.side === 0 ? 1 : 0.6 }
    case 'squish': return { cue: 'squish', level: 1 }
    case 'thrust': return { cue: 'thrust', level: 1 }
    case 'serve': return { cue: 'serve', level: 1 }
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

/** Falling-air ambience parameters from the fall speed and wind (0 = silent). */
export function ambienceFor(fallV: number, wind: number) {
  const f = Math.max(0, Math.min(1, fallV / 360))
  return {
    gain: 0.02 + 0.1 * f + Math.min(0.04, Math.abs(wind) / 4000),
    cutoff: 260 + 1500 * f + Math.min(500, Math.abs(wind) * 2),
    droneHz: 48 + 22 * f,
  }
}
