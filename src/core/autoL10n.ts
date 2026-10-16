// Auto-translation runtime. Everything the player can read (page text, labels, tooltips, placeholders, and text drawn on canvases) is looked up in the
// catalogue for the chosen language and swapped in place, so new text anywhere in the game is translated without being registered. Nothing the player
// typed is ever translated: only text that is in the catalogue changes, and elements marked translate="no" are skipped.
// Record mode (?l10n=record, used by scripts/crawl-strings.mjs) also collects every string it sees into window.__pfL10nSeen.
import { normalize, translateText } from './autoL10nCore'

const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'aria-description', 'aria-roledescription'] as const
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'CANVAS'])
export type Dict = Record<string, string>
export interface AutoL10n { stop(): void; setDict(d: Dict): void; translate(text: string): string; readonly seen: Record<string, string> }

const skipped = (el: Element | null): boolean => {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase())) return true
    if (e.getAttribute('translate') === 'no' || e.classList.contains('notranslate') || e.hasAttribute('data-l10n-skip')) return true
    if (e.getAttribute('contenteditable') === 'true') return true
  }
  return false
}

export function startAutoL10n(o: { dict: Dict; record?: boolean; root?: Node; canvas?: boolean }): AutoL10n {
  let dict = o.dict
  const seen: Record<string, string> = {}
  const record = !!o.record
  const live = () => Object.keys(dict).length > 0
  const cache = new Map<string, string>()
  const tr = (raw: string): string => {
    if (record) { const n = normalize(raw); if (n) seen[n.key] = n.source }
    if (!live()) return raw
    const hit = cache.get(raw); if (hit !== undefined) return hit
    const out = translateText(raw, dict)
    if (cache.size > 6000) cache.clear()
    cache.set(raw, out); return out
  }
  if (record) (window as unknown as { __pfL10nSeen?: Record<string, string> }).__pfL10nSeen = seen

  const root = o.root ?? document.documentElement
  const textState = new WeakMap<Text, { orig: string; out: string }>()
  const attrState = new WeakMap<Element, Record<string, { orig: string; out: string }>>()

  const doText = (node: Text) => {
    const cur = node.nodeValue ?? ''
    const st = textState.get(node)
    if (st && st.out === cur) return                    // our own write coming back through the observer
    if (!node.parentElement || skipped(node.parentElement)) return
    const out = tr(cur)
    textState.set(node, { orig: cur, out })
    if (out !== cur) node.nodeValue = out
  }
  const doAttrs = (el: Element, only?: string | null) => {
    if (skipped(el)) return
    const names: readonly string[] = only ? [only] : ATTRS
    for (const a of names) {
      if (!ATTRS.includes(a as never)) continue
      const cur = el.getAttribute(a); if (cur === null) continue
      const st = (attrState.get(el) ?? {})[a]
      if (st && st.out === cur) continue
      const out = tr(cur)
      const m = attrState.get(el) ?? {}; m[a] = { orig: cur, out }; attrState.set(el, m)
      if (out !== cur) el.setAttribute(a, out)
    }
    if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && el.value) { const out = tr(el.value); if (out !== el.value) el.value = out }
  }
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) { doText(n as Text); return }
    if (n.nodeType !== Node.ELEMENT_NODE) return
    const el = n as Element
    if (skipped(el)) return
    doAttrs(el)
    for (let c = el.firstChild; c; c = c.nextSibling) walk(c)
  }

  const pending = new Set<Node>(), pendingAttr = new Map<Element, Set<string>>()
  let scheduled = 0
  const flush = () => {
    scheduled = 0
    const nodes = Array.from(pending); pending.clear()
    const attrs = Array.from(pendingAttr); pendingAttr.clear()
    for (const n of nodes) if (n.isConnected) walk(n)
    for (const [el, names] of attrs) if (el.isConnected) for (const a of names) doAttrs(el, a)
  }
  const schedule = () => { if (!scheduled) scheduled = window.setTimeout(flush, 0) }
  const mo = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(n => pending.add(n))
      else if (m.type === 'characterData') pending.add(m.target)
      else if (m.type === 'attributes' && m.attributeName) { const s = pendingAttr.get(m.target as Element) ?? new Set<string>(); s.add(m.attributeName); pendingAttr.set(m.target as Element, s) }
    }
    schedule()
  })
  walk(root)
  mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] })

  // text drawn on canvases (the HUD, arena names, banners, the menu's plaques)
  let restoreCanvas: (() => void) | null = null
  if (o.canvas !== false && typeof CanvasRenderingContext2D !== 'undefined') {
    const proto = CanvasRenderingContext2D.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
    const marked = '__pfL10n'
    if (!(proto as unknown as Record<string, unknown>)[marked]) {
      const orig = { fillText: proto.fillText!, strokeText: proto.strokeText!, measureText: proto.measureText! }
      proto.fillText = function (this: unknown, text: unknown, ...rest: unknown[]) { return orig.fillText.call(this, typeof text === 'string' ? tr(text) : text, ...rest) }
      proto.strokeText = function (this: unknown, text: unknown, ...rest: unknown[]) { return orig.strokeText.call(this, typeof text === 'string' ? tr(text) : text, ...rest) }
      proto.measureText = function (this: unknown, text: unknown) { return orig.measureText.call(this, typeof text === 'string' ? tr(text) : text) }
      ;(proto as unknown as Record<string, unknown>)[marked] = true
      restoreCanvas = () => { proto.fillText = orig.fillText; proto.strokeText = orig.strokeText; proto.measureText = orig.measureText; delete (proto as unknown as Record<string, unknown>)[marked] }
    }
  }
  return {
    seen,
    translate: tr,
    setDict(d) { dict = d; cache.clear(); walk(root) },
    stop() { mo.disconnect(); window.clearTimeout(scheduled); restoreCanvas?.() },
  }
}

/** Where the per-language catalogues are served from (public/locales/auto/<code>.json). */
export const catalogUrl = (code: string, base = '/'): string => `${base}locales/auto/${code}.json`

export async function loadCatalog(code: string, base = '/'): Promise<Dict> {
  const res = await fetch(catalogUrl(code, base), { cache: 'no-cache' })
  if (!res.ok) throw new Error(`no catalogue for ${code}`)
  const data = await res.json() as Dict
  for (const k of Object.keys(data)) if (k.startsWith('_')) delete data[k]
  return data
}

/** Start translating the page for `code` (no-op for English unless recording). Safe to call more than once. */
let active: AutoL10n | null = null
export async function initAutoL10n(code: string, o: { record?: boolean; base?: string } = {}): Promise<AutoL10n | null> {
  active?.stop(); active = null
  const record = !!o.record
  try { document.documentElement.lang = code } catch { /* no document */ }
  if (code === 'en' && !record) return null
  let dict: Dict = {}
  if (code !== 'en') { try { dict = await loadCatalog(code, o.base ?? '/') } catch { if (!record) return null } }
  active = startAutoL10n({ dict, record })
  return active
}

/** Translate a whole string now (for text that is laid out in code, such as wrapped paragraphs on a canvas). Unchanged in English. */
export const trText = (text: string): string => active ? active.translate(text) : text
