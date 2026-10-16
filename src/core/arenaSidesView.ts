// The Arena Sides editor: a full-screen page with a live two-sided preview. Everything here is cosmetic and render-only.
import { moveItem, pickItem, zonePoint, type PlacedItem, BACK_PATTERNS, CEILING_THEMES, MAX_IMAGES, MAX_OBJECTS, OBJECT_KINDS, SIDE_FILTERS, cleanSignText, defaultLook, defaultSides, hslToHex, loadSides, saveSides, type ArenaSides, type SideLook, type SidesScope } from './arenaSides'
import { artById, flagGroups, visibleArt } from './artRegistry'
import type { MusicPlayer } from '../audio/musicPlayer'
import { createFallingVenue, type VenueView } from './fallingVenue'
import { loadPainterSelection } from './pongPainter'
import { queueCloudSync } from './cloudSyncQueue'

const css = `
.as-root{position:absolute;inset:0;z-index:30;overflow:auto;box-sizing:border-box;padding:18px clamp(12px,4vw,40px) 40px;background:radial-gradient(ellipse at 50% 0,#14182c,#070a11 70%);color:#e4edff;font:13px/1.45 system-ui}
.as-root h1{margin:10px 0 2px;font-size:clamp(24px,5vw,38px);letter-spacing:.16em;color:#d9ecff}.as-root h2{margin:0 0 8px;font:800 11px ui-monospace,monospace;letter-spacing:.14em;color:#8ceced;text-transform:uppercase}
.as-sub{margin:0 0 14px;color:#a8b3c9}.as-btn{border:1px solid #4d6b8a;background:#0e1828;color:#dff0ff;border-radius:6px;padding:8px 12px;font:700 11px ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}
.as-btn:hover:not(:disabled){border-color:#8cece6;background:#13243a}.as-btn[aria-pressed=true],.as-btn[aria-selected=true]{border-color:#8cece6;color:#fff;background:#18404c}.as-btn:disabled{opacity:.45;cursor:default}
.as-root button:focus-visible,.as-root input:focus-visible,.as-root select:focus-visible{outline:2px solid #65f4f2;outline-offset:2px}
.as-stage{position:relative;width:100%;max-width:980px;height:clamp(280px,52vh,560px);overflow:hidden;border:2px solid #4aa8ff88;border-radius:10px;background:#070e19;box-shadow:0 0 40px #4aa8ff22}.as-live{position:absolute;left:10px;top:10px;z-index:2;padding:5px 9px;border:1px solid #8cece6a8;border-radius:5px;background:#06151cdb;color:#aaf9f1;font:800 10px ui-monospace,monospace;letter-spacing:.12em;pointer-events:none}.as-stage-tools{position:absolute;right:10px;bottom:10px;z-index:2;display:flex;gap:6px;flex-wrap:wrap}
.as-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-top:14px}.as-card{padding:12px;border:1px solid #33506b;border-radius:8px;background:#0a111dcc}
.as-row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}.as-row label{min-width:78px;color:#b6c6de;font:700 10px ui-monospace,monospace;letter-spacing:.08em}.as-row input[type=range]{flex:1;min-width:120px}
.as-row select,.as-row input[type=text]{background:#090b12;color:#fff;border:1px solid #4d6b8a;border-radius:5px;padding:6px}.as-chips{display:flex;flex-wrap:wrap;gap:6px}.as-item{padding:8px;margin:6px 0;border:1px solid #2c4660;border-radius:6px;background:#0c1626}
.as-art{width:46px;height:46px;padding:4px;display:grid;place-items:center}.as-art img{max-width:100%;max-height:100%}.as-note{color:#8c9bb3;font-size:11px}.as-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}
.as-quip{position:absolute;z-index:3;max-width:240px;padding:7px 10px;border:1px solid #8cece6;border-radius:8px;background:#06151cf2;color:#e9ffff;font:700 12px/1.35 system-ui;pointer-events:none;transform:translate(-50%,-130%);box-shadow:0 6px 18px #0009}.as-flags{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}.as-flags input,.as-flags select{background:#090b12;color:#fff;border:1px solid #4d6b8a;border-radius:5px;padding:6px;max-width:100%}
.as-root.as-live-mode{inset:0 0 0 auto;width:min(400px,100%);background:rgba(6,10,18,.88);backdrop-filter:blur(6px);border-left:1px solid #4aa8ff66;z-index:31;padding:14px 14px 30px}.as-live-mode h1{font-size:22px}.as-overlay .as-quip{position:absolute}
@media(prefers-reduced-motion:reduce){.as-root *{animation:none!important;transition:none!important}}
`

const OBJECT_LABEL: Record<string, string> = { tree: 'Lit tree', lantern: 'Lantern', sign: 'Sign post', fireflies: 'Fireflies', bunting: 'Bunting', moon: 'Moon' }

export function mountArenaSides(parent: HTMLElement, onClose: () => void, opts: { music?: MusicPlayer; live?: { pointToArena(x: number, y: number): { x: number; y: number; W: number; H: number } | null; overlayHost: HTMLElement } } = {}): () => void {
  let data: ArenaSides = loadSides()
  let tab: 0 | 1 = 0
  const root = document.createElement('section'); root.className = 'as-root'; root.setAttribute('aria-labelledby', 'as-title')
  const style = document.createElement('style'); style.textContent = css
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n }
  const btn = (text: string, onclick: () => void, cls = 'as-btn') => { const b = el('button', cls, text); b.type = 'button'; b.onclick = onclick; return b }

  const back = btn('← Back', () => onClose())
  const title = el('h1', '', 'ARENA SIDES'); title.id = 'as-title'
  const sub = el('p', 'as-sub', 'Dress your side of the falling arena: a tinted back glass with pictures, objects in the room, a filter, and a ceiling that blends across the middle. All cosmetic — it never changes how a match plays.')
  // the preview is a real, running arena (the same sim and renderer as a match), so every change is live
  const live = opts.live
  // the preview is a real, running arena (the same sim and renderer as a match), so every change is live.
  // In live mode (opened from the pause menu) the real match behind the panel is the preview and the pointer is mapped through its transform.
  const stage = live ? el('div', 'as-overlay') : el('div', 'as-stage')
  let venue: ReturnType<typeof createFallingVenue> | null = null
  if (!live) {
    stage.setAttribute('role', 'img'); stage.setAttribute('aria-label', 'Live arena preview: a real rally falling through the shaft, wearing your look')
    const badge = el('div', 'as-live', '● LIVE ARENA · YOUR LOOK'); badge.setAttribute('aria-hidden', 'true')
    venue = createFallingVenue('paint-counter', loadPainterSelection())
    venue.fillScreen(); venue.setBackdropEnabled(false)
    venue.attachViewport(stage)
    const v = venue
    const tools = el('div', 'as-stage-tools')
    const viewBtns: Array<[VenueView, string]> = [['personal', 'My arena'], ['shaft', 'Whole shaft']]
    const viewEls = viewBtns.map(([id, label]) => { const b = btn(label, () => { v.setView(id); viewEls.forEach((x, i) => x.setAttribute('aria-pressed', String(viewBtns[i]![0] === id))) }); b.setAttribute('aria-pressed', String(id === 'personal')); return b })
    tools.append(...viewEls, btn('New rally', () => v.restartRally()))
    stage.append(badge, tools)
    v.setView('personal')
  } else {
    stage.style.cssText = 'position:absolute;inset:0;z-index:11'
    live.overlayHost.append(stage)
  }
  const pointToArena = (x: number, y: number) => live ? live.pointToArena(x, y) : venue!.pointToArena(x, y)
  // drag pictures and objects straight inside the live arena (the arena keeps swaying; the pointer is mapped through its transform)
  let drag: { item: PlacedItem; side: 0 | 1; pointer: number; sx: number; sy: number; moved: boolean } | null = null
  let quipTimer = 0
  const showQuip = (text: string, clientX: number, clientY: number) => {
    stage.querySelector('.as-quip')?.remove(); window.clearTimeout(quipTimer)
    const r = stage.getBoundingClientRect(), q = el('div', 'as-quip', text); q.setAttribute('role', 'status')
    q.style.left = Math.min(r.width - 120, Math.max(120, clientX - r.left)) + 'px'; q.style.top = Math.max(40, clientY - r.top) + 'px'
    stage.append(q); status.textContent = text; quipTimer = window.setTimeout(() => q.remove(), 3200)
  }
  const clickItem = (side: 0 | 1, item: PlacedItem, x: number, y: number) => {
    const look = data.sides[side]
    if (item.list === 'images') {
      const art = artById(look.images[item.index]!.id); if (!art) return
      showQuip(art.quip ?? art.name, x, y)
      const m = opts.music
      if (art.trackId && m) { if (m.state().current === art.trackId) m.toggle(); else m.select(art.trackId) }
    } else {
      const o = look.objects[item.index]!; showQuip(o.kind === 'sign' ? (o.text || 'FALLING') : OBJECT_LABEL[o.kind] ?? o.kind, x, y)
    }
  }
  stage.style.touchAction = 'none'
  stage.onpointerdown = e => {
    if ((e.target as HTMLElement).closest('button')) return
    const pt = pointToArena(e.clientX, e.clientY); if (!pt) return
    const zp = zonePoint(pt.x, pt.y, pt.W, pt.H), item = pickItem(data.sides[zp.side], zp.side, pt.x, pt.y, pt.W, pt.H)
    if (!item) return
    drag = { item, side: zp.side, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false }; stage.setPointerCapture(e.pointerId); stage.style.cursor = 'grabbing'
    if (tab !== zp.side) { tab = zp.side; build() }
  }
  stage.onpointermove = e => {
    if (!drag || e.pointerId !== drag.pointer) { if (!drag) stage.style.cursor = (() => { const pt = pointToArena(e.clientX, e.clientY); if (!pt) return ''; const z = zonePoint(pt.x, pt.y, pt.W, pt.H); return pickItem(data.sides[z.side], z.side, pt.x, pt.y, pt.W, pt.H) ? 'grab' : '' })(); return }
    const pt = pointToArena(e.clientX, e.clientY); if (!pt) return
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return
    drag.moved = true
    const zp = zonePoint(pt.x, pt.y, pt.W, pt.H)
    // stay on the side the item belongs to: clamp to that half instead of jumping across the centre
    const x = drag.side === zp.side ? zp.x : drag.side === 0 ? 1 : 0
    data.sides[drag.side] = moveItem(data.sides[drag.side], drag.item, x, zp.y)
    saveSides(data); preview()
  }
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointer) return
    const d = drag; drag = null; stage.style.cursor = ''
    if (d.moved) { queueCloudSync(); status.textContent = 'Placed.'; build() } else clickItem(d.side, d.item, e.clientX, e.clientY)
  }
  stage.onpointerup = endDrag; stage.onpointercancel = endDrag
  const hint = el('p', 'as-note', live ? 'Your real match is paused behind this panel. Drag a picture or object where you want it; click one to hear it talk. Close this panel to go back to the pause menu.' : 'Tip: drag a picture or object right inside the live arena to place it. Click one to hear what it has to say; album covers play and pause their song.')
  const controls = el('div')
  const status = el('p', 'as-note'); status.setAttribute('aria-live', 'polite')
  if (live) { root.classList.add('as-live-mode'); root.append(style, back, title, hint, controls, status) } else root.append(style, back, title, sub, stage, hint, controls, status, venue!.element)
  parent.append(root)

  const commit = (note = 'Saved.') => { saveSides(data); queueCloudSync(); status.textContent = note }
  const look = () => data.sides[tab]
  const setLook = (patch: Partial<SideLook>) => { data.sides[tab] = { ...look(), ...patch }; commit(); preview() }

  const slider = (label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void) => {
    const row = el('div', 'as-row'), lab = el('label', '', label), input = el('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value)
    const id = 'as-' + Math.random().toString(36).slice(2, 8); input.id = id; lab.htmlFor = id
    input.oninput = () => onInput(Number(input.value)); row.append(lab, input); return row
  }
  const select = <T extends string>(label: string, list: readonly T[], value: T, onChange: (v: T) => void) => {
    const row = el('div', 'as-row'), lab = el('label', '', label), sel = el('select'); const id = 'as-' + Math.random().toString(36).slice(2, 8); sel.id = id; lab.htmlFor = id
    for (const o of list) { const op = el('option', '', o); op.value = o; sel.append(op) }
    sel.value = value; sel.onchange = () => onChange(sel.value as T); row.append(lab, sel); return row
  }

  function build() {
    controls.replaceChildren()
    const scopeRow = el('div', 'as-tabs'); scopeRow.setAttribute('role', 'group'); scopeRow.setAttribute('aria-label', 'Which part of the arena your look covers')
    const scopes: Array<[SidesScope, string]> = [['mine', 'My side only'], ['whole', 'Whole arena']]
    for (const [id, label] of scopes) { const b = btn(label, () => { data.scope = id; commit(); build() }); b.setAttribute('aria-pressed', String(data.scope === id)); scopeRow.append(b) }
    const tabRow = el('div', 'as-tabs'); tabRow.setAttribute('role', 'tablist')
    const tabs: Array<[0 | 1, string]> = [[0, 'Left · player 1'], [1, 'Right · player 2 / guest']]
    for (const [id, label] of tabs) { const b = btn(label, () => { tab = id; build(); preview() }); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(tab === id)); tabRow.append(b) }
    const note = el('p', 'as-note', data.scope === 'whole' ? 'Whole arena: your left look is mirrored across both sides.' : 'My side only: the other side shows your opponent’s look online, or a preset in solo play.')
    controls.append(scopeRow, tabRow, note)

    const grid = el('div', 'as-grid'); controls.append(grid)
    const l = look()

    const back1 = el('div', 'as-card'); back1.append(el('h2', '', 'Layer 1 · back glass'))
    const swatch = el('div', 'as-row'); const sw = el('span'); sw.style.cssText = `width:26px;height:26px;border-radius:50%;border:2px solid #fff8;background:${hslToHex(l.hue, .7, .5)}`; sw.setAttribute('aria-hidden', 'true')
    swatch.append(sw, slider('Hue', 0, 359, 1, l.hue, v => { sw.style.background = hslToHex(v, .7, .5); setLook({ hue: v }) }))
    back1.append(swatch, slider('Tint', 0, 1, .05, l.tint, v => setLook({ tint: v })), select('Pattern', BACK_PATTERNS, l.pattern, v => setLook({ pattern: v })))
    back1.append(el('h2', '', 'Pictures'))
    const chips = el('div', 'as-chips')
    const addImage = (id: string) => { const n = look().images.length; if (n >= MAX_IMAGES) { status.textContent = `Up to ${MAX_IMAGES} pictures per side.`; return } setLook({ images: [...look().images, { id, x: [.5, .3, .7][n] ?? .5, y: .5, scale: 1, opacity: .6 }] }); build() }
    for (const a of visibleArt().filter(x => x.kind !== 'flag')) {
      const b = btn('', () => addImage(a.id), 'as-btn as-art')
      b.setAttribute('aria-label', `Add picture: ${a.name}`); const im = el('img'); im.src = import.meta.env.BASE_URL + a.src; im.alt = ''; b.append(im); chips.append(b)
    }
    back1.append(chips)
    // flags: a searchable list of every country in the registry
    const flagRow = el('div', 'as-flags'), flagLab = el('label', '', 'Flag'); flagLab.style.cssText = 'color:#b6c6de;font:700 10px ui-monospace,monospace;letter-spacing:.08em'
    const find = el('input'); find.type = 'search'; find.placeholder = 'Search countries'; find.id = 'as-flag-search'; flagLab.htmlFor = find.id
    const pickFlag = el('select'); pickFlag.setAttribute('aria-label', 'Choose a flag to add')
    const fillFlags = () => {
      pickFlag.replaceChildren(); const q = find.value.trim().toLowerCase(), first = el('option', '', q ? 'Choose a flag…' : 'Add a flag…'); first.value = ''; pickFlag.append(first)
      for (const g of flagGroups()) {
        const group = el('optgroup'); group.label = g
        for (const a of visibleArt().filter(x => x.kind === 'flag' && x.group === g && (!q || x.name.toLowerCase().includes(q)))) { const op = el('option', '', a.name); op.value = a.id; group.append(op) }
        if (group.children.length) pickFlag.append(group)
      }
    }
    find.oninput = fillFlags; fillFlags()
    pickFlag.onchange = () => { if (pickFlag.value) addImage(pickFlag.value) }
    flagRow.append(flagLab, find, pickFlag); back1.append(flagRow)
    l.images.forEach((im, idx) => {
      const item = el('div', 'as-item'); const art = visibleArt().find(a => a.id === im.id)
      item.append(el('strong', '', art?.name ?? im.id))
      const edit = (patch: Partial<typeof im>) => { const images = look().images.map((x, i) => i === idx ? { ...x, ...patch } : x); setLook({ images }) }
      item.append(slider('Across', 0, 1, .02, im.x, v => edit({ x: v })), slider('Down', 0, 1, .02, im.y, v => edit({ y: v })), slider('Size', .2, 1.6, .05, im.scale, v => edit({ scale: v })), slider('Opacity', .1, 1, .05, im.opacity, v => edit({ opacity: v })))
      item.append(btn('Remove', () => { setLook({ images: look().images.filter((_, i) => i !== idx) }); build() }))
      back1.append(item)
    })

    const objs = el('div', 'as-card'); objs.append(el('h2', '', 'Layer 2 · objects'))
    const palette = el('div', 'as-chips')
    for (const kind of OBJECT_KINDS) palette.append(btn('+ ' + OBJECT_LABEL[kind], () => { if (look().objects.length >= MAX_OBJECTS) { status.textContent = `Up to ${MAX_OBJECTS} objects per side.`; return } setLook({ objects: [...look().objects, { kind, x: .5, y: kind === 'bunting' || kind === 'lantern' || kind === 'moon' ? .15 : .75, scale: 1, ...(kind === 'sign' ? { text: 'FALLING' } : {}) }] }); build() }))
    objs.append(palette, el('p', 'as-note', 'Objects sit behind the paddle and ball. They are scenery, not walls.'))
    l.objects.forEach((o, idx) => {
      const item = el('div', 'as-item'); item.append(el('strong', '', OBJECT_LABEL[o.kind]))
      const edit = (patch: Partial<typeof o>) => setLook({ objects: look().objects.map((x, i) => i === idx ? { ...x, ...patch } : x) })
      if (o.kind === 'sign') {
        const row = el('div', 'as-row'), lab = el('label', '', 'Text'), input = el('input'); input.type = 'text'; input.maxLength = 24; input.value = o.text ?? ''; input.id = 'as-sign-' + idx; lab.htmlFor = input.id
        input.oninput = () => { const t = cleanSignText(input.value); edit({ text: t }) }; row.append(lab, input); item.append(row)
      }
      item.append(slider('Across', 0, 1, .02, o.x, v => edit({ x: v })), slider('Down', 0, 1, .02, o.y, v => edit({ y: v })), slider('Size', .3, 2, .05, o.scale, v => edit({ scale: v })))
      item.append(btn('Remove', () => { setLook({ objects: look().objects.filter((_, i) => i !== idx) }); build() }))
      objs.append(item)
    })

    const fx = el('div', 'as-card'); fx.append(el('h2', '', 'Layer 4 · filter and ceiling'))
    fx.append(select('Filter', SIDE_FILTERS, l.filter, v => setLook({ filter: v })), select('Ceiling', CEILING_THEMES, l.ceiling, v => setLook({ ceiling: v })))
    fx.append(el('p', 'as-note', 'The two ceilings blend across the middle of the arena.'))
    fx.append(btn('Reset this side', () => { data.sides[tab] = defaultLook(); commit('This side is back to plain.'); build(); preview() }), btn('Reset everything', () => { data = defaultSides(); commit('Everything is back to plain.'); build(); preview() }))

    grid.append(back1, objs, fx)
  }

  function preview() { if (!venue) return; venue.setSides(data.scope === 'whole' ? [data.sides[0], data.sides[0]] : data.sides) }
  build(); preview()
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }
  window.addEventListener('keydown', onKey, true)
  back.focus()
  return () => { window.removeEventListener('keydown', onKey, true); venue?.destroy(); if (live) stage.remove(); root.remove() }
}
