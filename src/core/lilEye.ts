// LilEye: a small companion that lives at the edge of the screen, reacts to the fall, and is also a lokpet in the LOK dex.
// Pure data and rules here (personalities, lines, unlocks, saving); drawing and the page are in lilEyeView.ts. Render-only: it never touches the sim.
import { packItemById } from './packItems'
import { packOwns } from './lokPack'
export const LIL_EYE_KEY = 'pongfall.lilEye.v1'

export type Mood = 'neutral' | 'wide' | 'squint' | 'happy' | 'sad' | 'sleepy'
export type LilEyeEvent = 'near-miss' | 'hit' | 'break' | 'point' | 'conceded' | 'tear' | 'win' | 'fall' | 'poke' | 'idle' | 'unlock'

export interface Personality {
  id: string; name: string; blurb: string
  /** Seconds between blinks, and how eager its gaze follows the pointer (0..1). */
  blink: number; gaze: number
  unlock: { falls?: number; wins?: number; note: string }
  lines: Partial<Record<LilEyeEvent, string[]>>
}

export const PERSONALITIES: readonly Personality[] = [
  { id: 'curious', name: 'Curious', blurb: 'Watches everything. Asks too many questions.', blink: 3.4, gaze: 1, unlock: { note: 'Always with you' },
    lines: { 'near-miss': ['Did you see that?!', 'So close! What happened?'], hit: ['Ooh, a crack. Why?', 'Glass noise!'], break: ['It opened! Can we look inside?'], point: ['A point! How does it feel?'], conceded: ['Where did the ball go?'], tear: ['A tear! Can I keep it?'], win: ['You did it! What now?'], fall: ['We are falling. Fascinating.'], poke: ['Hi! Hi! Hello!', 'That tickles. Is that normal?'], idle: ['What is down there?', 'Do the walls blink back?'], unlock: ['New toy! What does it do?'] } },
  { id: 'sleepy', name: 'Sleepy', blurb: 'Dozes through the fall. Wakes for the big moments.', blink: 6.5, gaze: .35, unlock: { falls: 3, note: 'Finish 3 falls' },
    lines: { 'near-miss': ['…huh? Oh. Close.'], hit: ['Mm. Crunchy.'], break: ['Ow. Too loud.'], point: ['Nice. Yawn.'], conceded: ['Wake me when it is over.'], tear: ['A tear. Soft.'], win: ['Good. Nap time.'], fall: ['Still falling… still sleepy…'], poke: ['Five more minutes.', 'Zzz… hm?'], idle: ['zzz', '…'], unlock: ['Shiny. Later.'] } },
  { id: 'cheeky', name: 'Cheeky', blurb: 'Loud opinions. Always on your side. Mostly.', blink: 2.6, gaze: .8, unlock: { wins: 1, note: 'Win a match' },
    lines: { 'near-miss': ['Skill issue. Joking! Mostly.', 'Thread the needle, champ.'], hit: ['That glass had a family.'], break: ['Well. That is one way to fix a draft.'], point: ['Easy. You are a menace.', 'Put it on a poster.'], conceded: ['The CPU is cheating. I would never.'], tear: ['Collect them all, drama queen.'], win: ['I knew it. I had money on it.'], fall: ['Gravity: undefeated.'], poke: ['Hands off the merchandise!', 'Rude. Do it again.'], idle: ['Say something.', 'You are doing great. Ish.'], unlock: ['Ooh, a perk. Spoiled.'] } },
]

/** `hat` and `aura` are LokPack item ids (core/packItems.ts, kind 'lileye'); '' means none. */
export interface LilEyeSave { v: 1; name: string; personality: string; iris: string; owned: string[]; pokes: number; hat: string; aura: string }
export const defaultLilEye = (): LilEyeSave => ({ v: 1, name: 'LilEye', personality: 'curious', iris: '#68b6e7', owned: ['curious'], pokes: 0, hat: '', aura: '' })
/** A cosmetic id is kept only when it is a real LilEye item for that slot and it is in your collection. */
export const cleanCosmetic = (v: unknown, slot: 'hat' | 'aura'): string => { const it = typeof v === 'string' ? packItemById(v) : undefined; return it?.lileye?.slot === slot && packOwns(it.id) ? it.id : '' }
/** The drawing value ('crown', 'ember') for a saved cosmetic id. */
export const cosmeticValue = (id: string): string => packItemById(id)?.lileye?.value ?? ''

export const IRIS_CHOICES = ['#68b6e7', '#7be0a6', '#ffcf6a', '#ff8aa0', '#c79bff', '#ff9a5a'] as const

export const cleanName = (v: unknown): string => typeof v === 'string' ? v.replace(/[^\p{L}\p{N} '’-]/gu, '').trim().slice(0, 14) : ''
export const personalityById = (id: string): Personality => PERSONALITIES.find(p => p.id === id) ?? PERSONALITIES[0]!

export interface DexProgress { falls: number; wins: number }
export const isUnlocked = (p: Personality, prog: DexProgress): boolean => (p.unlock.falls ?? 0) <= prog.falls && (p.unlock.wins ?? 0) <= prog.wins

export function sanitizeLilEye(raw: unknown, prog: DexProgress = { falls: 0, wins: 0 }): LilEyeSave {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = defaultLilEye()
  const owned = new Set(['curious', ...(Array.isArray(r.owned) ? r.owned.filter((x): x is string => typeof x === 'string' && PERSONALITIES.some(p => p.id === x)) : [])])
  for (const p of PERSONALITIES) if (isUnlocked(p, prog)) owned.add(p.id)   // earned personalities join the dex on their own
  const wanted = typeof r.personality === 'string' ? r.personality : d.personality
  return {
    v: 1, name: (n => n === 'Lil Eye' ? d.name : n)(cleanName(r.name) || d.name),   // the default used to be written with a space
    personality: owned.has(wanted) ? wanted : d.personality,
    iris: typeof r.iris === 'string' && (IRIS_CHOICES as readonly string[]).includes(r.iris) ? r.iris : d.iris,
    owned: PERSONALITIES.filter(p => owned.has(p.id)).map(p => p.id),
    pokes: typeof r.pokes === 'number' && Number.isFinite(r.pokes) ? Math.max(0, Math.min(1e6, Math.floor(r.pokes))) : 0,
    hat: cleanCosmetic(r.hat, 'hat'), aura: cleanCosmetic(r.aura, 'aura'),
  }
}
export function loadLilEye(prog?: DexProgress, storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): LilEyeSave {
  try { return sanitizeLilEye(JSON.parse(storage?.getItem(LIL_EYE_KEY) ?? 'null'), prog) } catch { return defaultLilEye() }
}
export function saveLilEye(s: LilEyeSave, storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage): boolean {
  try { storage?.setItem(LIL_EYE_KEY, JSON.stringify(sanitizeLilEye(s, { falls: 99, wins: 99 }))); return !!storage } catch { return false }
}

export const MOOD_FOR: Record<LilEyeEvent, Mood> = { 'near-miss': 'wide', hit: 'squint', break: 'wide', point: 'happy', conceded: 'sad', tear: 'happy', win: 'happy', fall: 'neutral', poke: 'happy', idle: 'neutral', unlock: 'wide' }

/** The line and mood for an event. `r` is any () => [0,1) source so tests are deterministic. */
export function reaction(personality: string, event: LilEyeEvent, r: () => number = Math.random): { line: string; mood: Mood } {
  const p = personalityById(personality), list = p.lines[event] ?? personalityById('curious').lines[event] ?? ['…']
  const mood: Mood = p.id === 'sleepy' && (event === 'idle' || event === 'fall') ? 'sleepy' : MOOD_FOR[event]
  return { line: list[Math.floor(r() * list.length) % list.length]!, mood }
}

/** Pose numbers for the sprite: how closed the lid is (0 open .. 1 shut), pupil size, and a vertical bob. Pure in time. */
export function pose(mood: Mood, t: number, blinkEvery: number): { lid: number; pupil: number; bob: number } {
  const phase = (t % blinkEvery) / blinkEvery
  const blink = phase > .96 ? Math.sin((phase - .96) / .04 * Math.PI) : 0
  const base = { neutral: [0, .5], wide: [0, .85], squint: [.55, .35], happy: [.25, .7], sad: [.35, .4], sleepy: [.7, .45] }[mood]
  return { lid: Math.min(1, base[0]! + blink * (1 - base[0]!)), pupil: base[1]!, bob: Math.sin(t * (mood === 'sleepy' ? .8 : 2)) * (mood === 'sleepy' ? 1 : 2.5) }
}

// ---- LOK dex: each personality is a lokpet card the owner applies to the shared catalog ----
export const lokpetSku = (p: Personality) => `pongfall.lokpet.lil-eye-${p.id}`
export const LOKPET_SPECIES = 'pongfall-lil-eye'

/** A tiny event bus so the game can tell the companion what happened without importing its UI. */
export const LIL_EYE_EVENT = 'pongfall-lil-eye'
export function emitLilEye(event: LilEyeEvent): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LIL_EYE_EVENT, { detail: event }))
}
