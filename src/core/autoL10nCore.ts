// Auto-translation core (pure, tested): turns any piece of on-screen text into a stable key, and puts numbers back after translation.
// The catalogue (public/locales/auto/en.json) maps key -> English with {{n0}}, {{n1}}... where numbers were; every other language file has the same keys.
// New text anywhere in the game needs no registration: the crawl and scan scripts find it, the auto-translate workflow translates it.

/** Small fast string hash (cyrb53); deterministic in Node and browsers so the scripts and the runtime agree on keys. */
export function cyrb53(s: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export interface Normalized { key: string; source: string; nums: string[] }

const NUM = /\d+(?:[.,:]\d+)*/g
const LETTER = /\p{L}/u

/**
 * Text that must never be translated: no letters at all, links, short codes and identifiers (room codes, versions, file names).
 * Names a player typed are not recognised here (they look like words); they stay English because they are not in the catalogue.
 */
const NEVER = new Set(['English', 'Español', 'Français', 'Deutsch', 'Português (Brasil)', '日本語', '한국어', '简体中文'])   // language names stay in their own language
export function isTranslatable(text: string): boolean {
  const s = text.trim()
  if (NEVER.has(s) || /&[a-z]+;|&#x?[0-9a-f]+;/i.test(s) || /^[A-Z]{9,}$/.test(s)) return false
  if (s.length < 2 || s.length > 1200 || !LETTER.test(s)) return false
  if (/^(https?:\/\/|www\.|\/|#)/i.test(s) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s)) return false
  if (/^[A-Z0-9]{2,6}-[A-Z0-9]{2,12}$/.test(s)) return false              // PF-AB12 style codes
  if (/^v?\d+(\.\d+)+/.test(s) && !/\s/.test(s)) return false              // versions
  if (/^[\w$.-]+$/.test(s) && /[_.]/.test(s)) return false                 // identifiers, file names
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(s)) return false                  // camelCase
  return true
}

/** The catalogue form of a piece of text (without its surrounding whitespace), or null when it is not translatable. */
export function normalize(text: string): Normalized | null {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!isTranslatable(trimmed)) return null
  const nums: string[] = []
  const source = trimmed.replace(NUM, m => `{{n${nums.push(m) - 1}}}`)
  if (!LETTER.test(source.replace(/\{\{n\d+\}\}/g, ''))) return null
  return { key: `s${cyrb53(source).toString(36)}`, source, nums }
}

/** Put the original numbers back. Returns null when the translation lost or invented a placeholder (the caller then keeps English). */
export function restore(translated: string, nums: string[]): string | null {
  const used = new Set<number>()
  let bad = false
  const out = translated.replace(/\{\{\s*n(\d+)\s*\}\}/g, (_m, i: string) => { const k = Number(i); if (k >= nums.length) { bad = true; return '' } used.add(k); return nums[k]! })
  if (bad || used.size !== nums.length) return null
  return out
}

/** Translate one string against a catalogue, keeping its leading and trailing whitespace. Unknown or untranslatable text comes back unchanged. */
export function translateText(raw: string, dict: Readonly<Record<string, string>>): string {
  const lead = /^\s*/.exec(raw)![0], tail = /\s*$/.exec(raw)![0]
  if (lead.length === raw.length) return raw
  const n = normalize(raw)
  if (!n) return raw
  const hit = dict[n.key]
  if (!hit) return raw
  let out = restore(hit, n.nums)
  if (out === null) return raw
  // text that was shouted in English (MODE, DIFFICULTY) stays shouted in alphabets that have capitals
  const letters = n.source.replace(/\{\{n\d+\}\}/g, '').replace(/[^\p{L}]/gu, '')
  if (letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) out = out.toLocaleUpperCase()
  return lead + out + tail
}

const CASE = (m: string, lower: string) => m === m.toUpperCase() ? lower.toUpperCase() : m[0] === m[0]!.toUpperCase() ? lower[0]!.toUpperCase() + lower.slice(1) : lower
/**
 * Machine translators read the noun "fall" (a run of the game) as the season, so the catalogue stores "descent" in its place. The key still comes from
 * the text on screen, so nothing changes in English. Verbs ("the ball falls") and glossary names ("Solo Fall") are left alone.
 */
const EXACT: Record<string, string> = { MODE: 'Game mode', Mode: 'Game mode', DIFFICULTY: 'Difficulty level', Difficulty: 'Difficulty level', Gear: 'Settings gear', GEAR: 'Settings gear' }
export function translationHint(source: string): string {
  if (EXACT[source.trim()]) return EXACT[source.trim()]!
  const lead = /(?<![\w])(first|second|third|next|last|previous|your|the|a|an|each|every|this|that|new|per|total|completed|finished|one|another|their|its|single|any|no|more|\{\{n\d+\}\}|\d+) (falls?)\b/gi
  let out = source.replace(lead, (_m, w: string, f: string) => `${w} ${CASE(f, f.toLowerCase() === 'falls' ? 'descents' : 'descent')}`)
  out = out.replace(/\bfall (speed|count|rate|number|record|counter)\b/gi, (m, w: string) => `${CASE(m, 'descent')} ${w}`)
  if (/^falls?\b[:\s]*(\{\{n\d+\}\})?$/i.test(out.trim())) out = out.replace(/\b(falls?)\b/i, (_m, f: string) => CASE(f, f.toLowerCase() === 'falls' ? 'descents' : 'descent'))
  return out
}
