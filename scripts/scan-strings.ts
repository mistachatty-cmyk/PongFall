// Finds player-facing text in the source and merges it into the auto-translation catalogue (public/locales/auto/en.json).
// It never removes anything; run `tsx scripts/scan-strings.ts --prune` after a clean crawl to drop strings nothing produces any more.
// The crawl (scripts/crawl-strings.ts) adds what the running game actually shows; this scan adds the rarely reached text (quips, errors, banners).
import fs from 'node:fs'
import path from 'node:path'
import { normalize, translationHint } from '../src/core/autoL10nCore'
import { CHANGELOG } from '../src/changelog'

export const CATALOG = 'public/locales/auto/en.json'
const SKIP_FILE = /(\.test\.ts|\.d\.ts)$|^src\/(locales|audio\/cues|changelog)/

/** Walks the source and yields every string literal (and the static pieces of template literals) with the code just before it. */
export function* literals(src: string): Generator<{ text: string; before: string; tpl: boolean }> {
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]!
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) return; i += 2; continue }
    if (c === '\'' || c === '"') {
      let j = i + 1, out = ''
      while (j < n && src[j] !== c) { if (src[j] === '\\') { const e = src[j + 1]; out += e === 'n' ? '\n' : e === 't' ? '\t' : e; j += 2 } else { if (src[j] === '\n') break; out += src[j]; j++ } }
      yield { text: out, before: src.slice(Math.max(0, i - 70), i), tpl: false }
      i = j + 1; continue
    }
    if (c === '`') {
      let j = i + 1, cur = ''
      const before = src.slice(Math.max(0, i - 70), i)
      const parts: string[] = []
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') { const e = src[j + 1]; cur += e === 'n' ? '\n' : e; j += 2; continue }
        if (src[j] === '$' && src[j + 1] === '{') { parts.push(cur); cur = ''; let d = 1; j += 2; while (j < n && d > 0) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++ } continue }
        cur += src[j]; j++
      }
      parts.push(cur)
      const joined = parts.length === 1
      for (const p of parts) yield { text: p, before, tpl: !joined || /[<>]/.test(p) }
      i = j + 1; continue
    }
    i++
  }
}

const LABEL_CTX = /(label|title|hint|text|sub|caption|aria-label|placeholder|desc|description|note|msg|message|heading|banner|quip|say|toast)['"]?\s*[:=(,]\s*$|fillText\(\s*$|textContent\s*\+?=\s*$|\.(title|placeholder|alt)\s*=\s*$|setAttribute\(\s*['"](aria-label|title|placeholder|alt)['"]\s*,\s*$|button\(\s*$/
const CSSY = /[a-z-]+\s*:\s*[^;\s][^;]*;|^[.#\[@:*>]|[{}]|=>|^\s*(\.|#)|\/\/|^[\w-]+\([^)]*\)$|\bpx\b|rgba?\(|#[0-9a-f]{3,8}\b/i
const JUNK = /\{\{n\d+\}\}\s*px|="|url\(|data:|[a-z-]+\(\{\{n\d|\b[a-z-]+\([^)]*\)\s+[a-z-]+\(|;\s*[a-z-]+:/i
const CODEY = /^[\w.$/-]+$/

const NAMED: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', larr: '←', hellip: '…', copy: '©', times: '×', bull: '•', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' }
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : NAMED[e.toLowerCase()] ?? m)

/** Text inside HTML-looking strings: the text between tags and the readable attributes. */
function htmlText(s: string): string[] {
  const out: string[] = []
  for (const m of s.matchAll(/>([^<>]+)</g)) out.push(m[1]!)
  for (const m of s.matchAll(/\b(aria-label|title|placeholder|alt)="([^"]+)"/g)) out.push(m[2]!)
  const lead = /^([^<>]+)</.exec(s); if (lead) out.push(lead[1]!)
  const tail = />([^<>]+)$/.exec(s); if (tail) out.push(tail[1]!)
  return out.map(decode)
}

export function candidates(file: string, src: string): string[] {
  const found: string[] = []
  for (const { text, before, tpl } of literals(src)) {
    const html = /<[a-z/][^>]*>|[>"]\s*[^<>]*\s*</i.test(text) && /[<>]/.test(text)
    if (html) { for (const t of htmlText(text)) found.push(t); continue }
    if (tpl) continue                                   // a piece of a template with ${} in it: not a whole sentence
    const t = text.trim()
    if (t.length < 2 || t.length > 600 || !/\p{L}/u.test(t)) continue
    if (CSSY.test(t) || CODEY.test(t) || JUNK.test(t)) continue
    const words = t.split(/\s+/)
    const sentence = words.length >= 2 && words.some(w => /\p{L}{3,}/u.test(w)) && !/[_]{1}\w/.test(t)
    const labelled = LABEL_CTX.test(before) && /^[A-Z0-9🔒👁🎨◇◧📊👥♫⚙?][\p{L}\p{N} ·.,:!?'’()+/&%-]*$/u.test(t)
    if (sentence || labelled) found.push(t)
  }
  return found
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out); else if (/\.ts$/.test(e.name) && !SKIP_FILE.test(p.replace(/\\/g, '/'))) out.push(p)
  }
  return out
}

export function scanAll(): Record<string, string> {
  const found: Record<string, string> = {}
  const add = (t: string) => { const n = normalize(t); if (n && !/\b[A-Z]{3,8}-\d{2,3}\b/.test(n.source)) found[n.key] = n.source }
  for (const f of walk('src')) for (const t of candidates(f, fs.readFileSync(f, 'utf8'))) add(t)
  for (const e of CHANGELOG) { add(e.title.replace(/^\p{Extended_Pictographic}️?\s*/u, '')); e.notes.forEach(add) }
  for (const f of ['public/rules.html', 'public/about.html']) if (fs.existsSync(f)) for (const t of htmlText(fs.readFileSync(f, 'utf8').replace(/<(script|style)[\s\S]*?<\/\1>/g, ''))) add(t)
  return found
}

export function readCatalog(): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(CATALOG, 'utf8')) } catch { return {} }
}
export function writeCatalog(c: Record<string, string>) {
  fs.mkdirSync(path.dirname(CATALOG), { recursive: true })
  const head = { _comment: 'Source catalogue for automatic translation. Written by scripts/scan-strings.ts and scripts/crawl-strings.ts; never edit by hand. Keys are hashes of the text, {{n0}} stands for a number.' }
  const body = Object.fromEntries(Object.entries(c).filter(([k, v]) => !k.startsWith('_') && normalize(v.replace(/\{\{n\d+\}\}/g, '1')) !== null).map(([k, v]) => [k, translationHint(v)] as const).sort(([a], [b]) => a < b ? -1 : 1))
  fs.writeFileSync(CATALOG, JSON.stringify({ ...head, ...body }, null, 2) + '\n')
}

if (process.argv[1] && /scan-strings/.test(process.argv[1])) {
  const cur = readCatalog(), found = scanAll()
  const prune = process.argv.includes('--prune')
  const next = prune ? found : { ...cur, ...found }
  const added = Object.keys(next).filter(k => !(k in cur) && !k.startsWith('_')).length
  writeCatalog(next)
  console.log(`scan: ${Object.keys(found).length} strings in the source, ${added} new, catalogue now ${Object.keys(next).filter(k => !k.startsWith('_')).length}`)
}
