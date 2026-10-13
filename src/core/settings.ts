// Player settings: pure data + sanitising, so bad or old saved values can never break the game.
export const TARGET_OPTIONS = [0, 7, 14, 24, 28] as const          // 0 = the mode's own target
export const TIME_OPTIONS = [0, -1, 60, 120, 180] as const         // 0 = the mode's own limit, -1 = no limit
export const ARENA_OPTIONS = [0, 1, 3, 5] as const                // other arenas on the carousel (0 = solo)
import { LENS_IDS, clampHue } from '../render/lens'
import { DEFAULT_KEYS, sanitizeKeys, type KeyMap } from './controls'
export type FogMode = 'high' | 'low' | 'off'
export type FallingSound = 'classic' | 'dynamic'

export interface Settings {
  difficulty: string
  mode: string
  arenas: number            // one of ARENA_OPTIONS
  target: number            // one of TARGET_OPTIONS
  timeLimit: number         // one of TIME_OPTIONS
  reduceMotion: boolean
  fallSound: FallingSound
  fog: FogMode
  hints: boolean            // the control hints line
  gauge: boolean            // the wind gauge
  gameHud: boolean          // score, meters, hints and in-game labels (touch controls are separate)
  buttons: 'show' | 'hide'  // on-screen THRUST and POWER
  leftHanded: boolean       // swap the on-screen buttons
  lens: string              // colour lens id (unlocked by the first win)
  hue: number               // hue shift in degrees, 0-359
  flux: boolean             // NPC skill and paddle sizes drift (unranked)
  trackUsage: boolean       // persist action-use totals for the optional Usage stats section
  keys: KeyMap              // keyboard bindings
}

export const SETTINGS_KEY = 'pongfall.settings'

export function defaultSettings(reduceMotion = false): Settings {
  return { difficulty: 'chill', mode: 'solo-fall', arenas: 3, target: 0, timeLimit: 0, reduceMotion, fallSound: 'classic', fog: 'high', hints: true, gauge: true, gameHud: true, buttons: 'show', leftHanded: false, lens: 'none', hue: 0, flux: false, trackUsage: true, keys: { ...DEFAULT_KEYS } }
}

const pick = <T,>(v: unknown, allowed: readonly T[], d: T): T => (allowed as readonly unknown[]).includes(v) ? (v as T) : d

export function sanitizeSettings(raw: unknown, valid: { modes: string[]; difficulties: string[] }, reduceMotion = false): Settings {
  const d = defaultSettings(reduceMotion)
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    difficulty: pick(r.difficulty, valid.difficulties, d.difficulty),
    mode: pick(r.mode, valid.modes, d.mode),
    arenas: pick(r.arenas, ARENA_OPTIONS, d.arenas),
    target: pick(r.target, TARGET_OPTIONS, d.target),
    timeLimit: pick(r.timeLimit, TIME_OPTIONS, d.timeLimit),
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : d.reduceMotion,
    fallSound: pick(r.fallSound, ['classic', 'dynamic'] as const, d.fallSound),
    fog: pick(r.fog, ['high', 'low', 'off'] as const, d.fog),
    hints: typeof r.hints === 'boolean' ? r.hints : d.hints,
    gauge: typeof r.gauge === 'boolean' ? r.gauge : d.gauge,
    gameHud: typeof r.gameHud === 'boolean' ? r.gameHud : d.gameHud,
    buttons: pick(r.buttons, ['show', 'hide'] as const, d.buttons),
    leftHanded: typeof r.leftHanded === 'boolean' ? r.leftHanded : d.leftHanded,
    lens: pick(r.lens, LENS_IDS, d.lens),
    hue: clampHue(r.hue),
    flux: typeof r.flux === 'boolean' ? r.flux : d.flux,
    trackUsage: typeof r.trackUsage === 'boolean' ? r.trackUsage : d.trackUsage,
    keys: sanitizeKeys(r.keys),
  }
}

/** Settings to hand to createWorld (undefined = let the mode decide). */
export function worldOverrides(s: Settings): { target?: number; timeLimit?: number } {
  return { target: s.target || undefined, timeLimit: s.timeLimit === 0 ? undefined : s.timeLimit < 0 ? 0 : s.timeLimit }
}

export const arenasLabel = (n: number) => n === 0 ? 'Solo' : n === 1 ? '1 other' : `${n} others`
export const timeLabel = (t: number) => t === 0 ? 'Mode default' : t < 0 ? 'No limit' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
export const targetLabel = (t: number) => t === 0 ? 'Mode default' : String(t)
