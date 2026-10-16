// The LokPack page: open packs (a short reveal on a canvas), browse the collection, spend Customization Tokens, and dress your Loksleeve.
// Everything is local (core/lokPack.ts); the page is render-only and never touches the sim.
import { CT_CRAFT, PACK_KINDS, PITY_EPIC, PITY_LEGENDARY, craftItem, loadLokPack, openPack, saveLokPack, type PackStub, type Reward } from './lokPack'
import { PACK_ITEMS, RARITIES, RARITY_META, packItemById, type PackItem, type PackItemKind, type Rarity } from './packItems'
import { SLEEVE_SLOTS, equipSleeve, loadSleeve, saveSleeve, sleeveItemsOf, sleeveSpec } from './packSleeve'
import { drawCardBack, drawCardFace, drawPackWrap } from './packSleeveArt'
import { drawItemArt, drawTokenArt } from './lokPackArt'
import { queueCloudSync } from './cloudSyncQueue'

const KIND_LABEL: Record<PackItemKind, string> = { painter: 'PongPainter', theme: 'Theme', lileye: 'LilEye', sleeve: 'Loksleeve' }
const css = `
.lp-page{position:absolute;inset:0;z-index:30;overflow:auto;box-sizing:border-box;padding:clamp(14px,3vw,30px);background:radial-gradient(120% 90% at 50% 0,#17203a,#06080f);color:#e6eefc;font-family:system-ui}
.lp-page h1{margin:8px 0 2px;font-size:clamp(24px,5vw,36px);letter-spacing:.16em}.lp-page h2{margin:16px 0 8px;font:800 11px ui-monospace,monospace;letter-spacing:.14em;color:#ffd45e;text-transform:uppercase}
.lp-page button{font:700 12px ui-monospace,monospace;color:#e6eefc;background:#10192c;border:1px solid #4d6b8a;border-radius:6px;padding:9px 12px;cursor:pointer;min-height:38px}.lp-page button:hover:not(:disabled){border-color:#ffd45e}.lp-page button:disabled{opacity:.45;cursor:default}
.lp-page :focus-visible{outline:2px solid #ffd45e;outline-offset:2px}.lp-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.lp-wallet{margin-left:auto;font:800 13px ui-monospace,monospace;color:#ffd45e}
.lp-tabs{display:flex;gap:6px;margin:12px 0}.lp-tabs button[aria-selected=true]{border-color:#ffd45e;color:#ffd45e}
.lp-stage{position:relative;width:min(100%,640px);margin:0 auto}.lp-stage canvas{position:static!important;inset:auto!important;width:100%;height:auto;display:block;border-radius:12px;background:linear-gradient(#0b1224,#05070d);border:1px solid #2c3d5c;touch-action:manipulation}
.lp-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0}.lp-note{color:#9fb0c8;font-size:12px;line-height:1.5;text-align:center}
.lp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.lp-tile{position:relative;padding:8px;border:2px solid var(--rc,#4d6b8a);border-radius:10px;background:#0c1322;box-shadow:0 0 12px color-mix(in srgb,var(--rc) 30%,transparent);text-align:center}
.lp-tile canvas{position:static!important;width:100%;height:auto;aspect-ratio:1;display:block}.lp-tile.locked canvas{filter:grayscale(1) brightness(.45)}.lp-tile b{display:block;font-size:12px;margin:4px 0 2px}.lp-tile small{display:block;color:#9fb0c8;font-size:10px;min-height:26px}.lp-tile .rar{color:var(--rc);font:800 9px ui-monospace,monospace;letter-spacing:.12em}
.lp-chip{border-radius:999px!important}.lp-slot{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.lp-slot button[aria-pressed=true]{border-color:#ffd45e;color:#ffd45e}
@media(prefers-reduced-motion:reduce){.lp-tile{box-shadow:none}}
`

export function mountLokPacks(parent: HTMLElement, onClose: () => void, opts: { reduce?: boolean; openFirst?: boolean } = {}): () => void {
  const reduce = !!opts.reduce || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  let save = loadLokPack(), sleeve = loadSleeve(), tab: 'packs' | 'collection' | 'sleeve' = 'packs', kindFilter: PackItemKind | 'all' = 'all', selected: string | null = save.packs[0]?.id ?? null
  const root = document.createElement('section'); root.className = 'lp-page'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-labelledby', 'lp-title'); root.dataset.pf = 'lokpacks'
  const style = document.createElement('style'); style.textContent = css
  const live = document.createElement('div'); live.setAttribute('aria-live', 'polite'); live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'
  let raf = 0, tiles: { c: HTMLCanvasElement; item: PackItem }[] = [], stage: StageState | null = null
  const commit = (next = save) => { save = next; saveLokPack(save); queueCloudSync() }
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, txt = '', cls = ''): HTMLElementTagNameMap[K] => { const n = document.createElement(tag); if (txt) n.textContent = txt; if (cls) n.className = cls; return n }
  const btn = (txt: string, fn: () => void, label?: string) => { const b = el('button', txt); b.type = 'button'; b.onclick = fn; if (label) b.setAttribute('aria-label', label); return b }

  // ---- the reveal stage ----
  interface StageState { pack: PackStub; rewards: Reward[]; start: number; flipped: number[]; phase: 'idle' | 'shake' | 'burst' | 'cards' }
  const SW = 640, SH = 400
  const rewardCard = (r: Reward): { name: string; type: string; rarity: Rarity; lines: string[]; art: (c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) => void } => {
    if (r.type === 'ct') return { name: `${r.ct} CT`, type: 'Customization Tokens', rarity: r.rarity, lines: ['Spend them on any look', 'you are missing.'], art: (c, x, y, s, t) => drawTokenArt(c, x, y, s, '#ffc857', t, reduce) }
    if (r.type === 'pack') return { name: 'Bonus Pack', type: 'LokPack', rarity: r.rarity, lines: ['Another pack, ready', 'to open.'], art: (c, x, y, s, t) => drawPackWrap(c, x - s * 0.28, y - s * 0.4, s * 0.56, s * 0.8, sleeveSpec(sleeve, 'packSkin'), 'Bonus', t, reduce) }
    const it = packItemById(r.itemId)!
    return { name: it.name, type: KIND_LABEL[it.kind], rarity: it.rarity, lines: r.dup ? ['Already yours:', `+${r.ct} CT instead`] : [it.note.slice(0, 34), it.animated ? 'Animated' : ''], art: (c, x, y, s, t) => { if (r.dup) c.globalAlpha = 0.55; drawItemArt(c, it, x, y, s, t, reduce); c.globalAlpha = 1 } }
  }
  const layout = (n: number) => { const cw = Math.min(140, (SW - 40) / n - 8), ch = cw * 1.45, gap = 10, total = n * cw + (n - 1) * gap; return Array.from({ length: n }, (_, i) => ({ x: (SW - total) / 2 + i * (cw + gap), y: (SH - ch) / 2 + 10, w: cw, h: ch })) }
  function drawStage(c: CanvasRenderingContext2D, now: number) {
    c.clearRect(0, 0, SW, SH)
    const t = now / 1000
    if (!stage) {
      const pk = save.packs.find(p => p.id === selected)
      if (!pk) { c.fillStyle = '#9fb0c8'; c.font = '700 16px system-ui'; c.textAlign = 'center'; c.fillText('No packs to open yet. Finish a match to earn one.', SW / 2, SH / 2); return }
      const bob = reduce ? 0 : Math.sin(t * 1.6) * 5
      drawPackWrap(c, SW / 2 - 70, 60 + bob, 140, 196, sleeveSpec(sleeve, 'packSkin'), PACK_KINDS[pk.kind].name, t, reduce); return
    }
    const st = stage, age = reduce ? 9 : (now - st.start) / 1000, best = st.rewards.reduce((m, r) => Math.max(m, RARITIES.indexOf(r.rarity)), 0), bc = RARITY_META[RARITIES[best]!].color
    if (st.phase === 'idle' || st.phase === 'shake') {
      const shake = reduce ? 0 : Math.sin(age * 60) * Math.min(1, age) * 6
      c.save(); c.translate(SW / 2 + shake, 160); c.rotate(shake * 0.01); drawPackWrap(c, -70, -98, 140, 196, sleeveSpec(sleeve, 'packSkin'), PACK_KINDS[st.pack.kind].name, t, reduce); c.restore()
      if (age > 1.1) { st.phase = 'burst'; st.start = now }
    } else if (st.phase === 'burst') {
      const k = Math.min(1, age / 0.5), g = c.createRadialGradient(SW / 2, 170, 4, SW / 2, 170, 40 + k * 340); g.addColorStop(0, '#fff'); g.addColorStop(0.25, bc); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 1 - k * 0.6; c.fillStyle = g; c.fillRect(0, 0, SW, SH); c.globalAlpha = 1
      if (age > 0.5) { st.phase = 'cards'; st.start = now; renderActions() }
    }
    if (st.phase === 'cards') {
      const pos = layout(st.rewards.length), frame = sleeveSpec(sleeve, 'cardFrame'), back = sleeveSpec(sleeve, 'cardBack')
      pos.forEach((p, i) => {
        const dealt = reduce ? 1 : Math.min(1, Math.max(0, age * 3 - i * 0.35)), x = p.x, y = p.y + (1 - dealt) * -200
        const fl = st.flipped.includes(i) ? 1 : 0, rc = rewardCard(st.rewards[i]!), meta = RARITY_META[rc.rarity]
        const k = reduce ? fl : Math.min(1, Math.max(0, fl ? (age - (flipAt[i] ?? 0)) / 0.35 : 0)), sx = Math.abs(Math.cos(k * Math.PI)), showFace = k > 0.5
        c.save(); c.globalAlpha = dealt; c.translate(x + p.w / 2, y + p.h / 2); c.scale(Math.max(0.04, fl ? (reduce ? 1 : sx) : 1), 1)
        if (showFace || (reduce && fl)) drawCardFace(c, -p.w / 2, -p.h / 2, p.w, p.h, frame, { name: rc.name, type: rc.type, rarityName: meta.name, rarityColor: meta.color, art: (g, ax, ay, s) => rc.art(g, ax, ay, s, t), lines: rc.lines, cost: String(RARITIES.indexOf(rc.rarity) + 1), number: `No. ${String(i + 1).padStart(3, '0')}` }, t, reduce)
        else drawCardBack(c, -p.w / 2, -p.h / 2, p.w, p.h, back, t, reduce)
        c.restore()
      })
    }
  }
  const flipAt: number[] = []
  function flip(i: number) {
    if (!stage || stage.phase !== 'cards' || stage.flipped.includes(i)) return
    stage.flipped.push(i); flipAt[i] = reduce ? 0 : (performance.now() - stage.start) / 1000
    const r = stage.rewards[i]!, rc = rewardCard(r); live.textContent = `${RARITY_META[rc.rarity].name}: ${rc.name}`
    if (stage.flipped.length === stage.rewards.length) renderActions()
  }
  function startOpen() {
    const res = selected ? openPack(save, selected) : null
    if (!res) return
    commit(res.save); stage = { pack: res.pack, rewards: res.rewards, start: performance.now(), flipped: [], phase: 'shake' }; flipAt.length = 0
    selected = save.packs[0]?.id ?? null; renderActions(); renderTop()
  }

  // ---- page ----
  const top = el('div', '', 'lp-top'), tabsEl = el('div', '', 'lp-tabs'), body = el('div'), actions = el('div', '', 'lp-row'), note = el('p', '', 'lp-note')
  tabsEl.setAttribute('role', 'tablist')
  const stageWrap = el('div', '', 'lp-stage'), stageCanvas = el('canvas'); stageCanvas.width = SW * 2; stageCanvas.height = SH * 2; stageCanvas.setAttribute('role', 'img'); stageCanvas.setAttribute('aria-label', 'LokPack opening stage')
  stageWrap.append(stageCanvas)
  const sctx = stageCanvas.getContext('2d')
  stageCanvas.addEventListener('pointerdown', e => {
    if (!stage || stage.phase !== 'cards') return
    const r = stageCanvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * SW, y = (e.clientY - r.top) / r.height * SH
    layout(stage.rewards.length).forEach((p, i) => { if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) flip(i) })
  })
  function renderTop() {
    top.replaceChildren(btn('← Back', onClose), (() => { const h = el('h1', 'LOKPACKS'); h.id = 'lp-title'; return h })(), (() => { const w = el('div', `${save.ct} CT · ${save.packs.length} unopened · ${save.items.length}/${PACK_ITEMS.length} found`, 'lp-wallet'); w.setAttribute('aria-label', `${save.ct} Customization Tokens, ${save.packs.length} unopened packs, ${save.items.length} of ${PACK_ITEMS.length} looks found`); return w })())
    top.querySelector('button')?.setAttribute('data-pf', 'lp-back')
    tabsEl.replaceChildren(...(['packs', 'collection', 'sleeve'] as const).map(k => { const b = btn(k === 'packs' ? 'Packs' : k === 'collection' ? 'Collection' : 'Loksleeve', () => { tab = k; stage = null; render() }); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(tab === k)); return b }))
  }
  function renderActions() {
    actions.replaceChildren()
    if (tab !== 'packs') return
    if (stage) {
      const allDone = stage.flipped.length === stage.rewards.length
      if (stage.phase === 'cards' && !allDone) actions.append(btn('Reveal all', () => { stage!.rewards.forEach((_, i) => flip(i)) }))
      if (allDone) { const dups = stage.rewards.filter(r => r.type === 'item' && r.dup).length, ct = stage.rewards.reduce((a, r) => a + (r.type === 'ct' ? r.ct : r.type === 'item' ? r.ct : 0), 0); note.textContent = `${ct ? `+${ct} CT` : 'No tokens this time'}${dups ? ` · ${dups} duplicate${dups > 1 ? 's' : ''} turned into tokens` : ''}.`; actions.append(...(save.packs.length ? [btn(`Open next (${save.packs.length} left)`, () => { stage = null; selected = save.packs[0]!.id; startOpen() })] : []), btn('Done', () => { stage = null; render() })) }
      return
    }
    note.textContent = `Fall Pack 3 cards · Win Pack 4 · Cost Pack 5. A guaranteed Epic every ${PITY_EPIC} packs and a Legendary every ${PITY_LEGENDARY}. No LokTokens inside: packs are for looks and Customization Tokens.`
    for (const p of save.packs) { const b = btn(`${PACK_KINDS[p.kind].name}`, () => { selected = p.id; renderActions() }); b.setAttribute('aria-pressed', String(selected === p.id)); b.style.borderColor = selected === p.id ? '#ffd45e' : ''; actions.append(b) }
    if (save.packs.length) actions.append(btn('OPEN PACK', startOpen))
  }
  function renderCollection() {
    const chips = el('div', '', 'lp-row')
    for (const k of ['all', 'painter', 'sleeve', 'theme', 'lileye'] as const) { const b = btn(k === 'all' ? 'All' : KIND_LABEL[k], () => { kindFilter = k; render() }); b.className = 'lp-chip'; b.setAttribute('aria-pressed', String(kindFilter === k)); chips.append(b) }
    const grid = el('div', '', 'lp-grid'); tiles = []
    const list = PACK_ITEMS.filter(i => kindFilter === 'all' || i.kind === kindFilter).sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity))
    for (const it of list) {
      const own = save.items.includes(it.id), tile = el('div', '', `lp-tile${own ? '' : ' locked'}`); tile.style.setProperty('--rc', RARITY_META[it.rarity].color)
      const cv = el('canvas'); cv.width = 240; cv.height = 240; cv.setAttribute('aria-hidden', 'true'); tiles.push({ c: cv, item: it })
      const act = own ? el('small', 'In your collection') : btn(`Craft · ${CT_CRAFT[it.rarity]} CT`, () => { const r = craftItem(save, it.id); if (r.ok) { commit(r.save); renderTop(); render() } else note.textContent = r.why })
      act.setAttribute('aria-label', own ? `${it.name}: in your collection` : `Craft ${it.name} for ${CT_CRAFT[it.rarity]} Customization Tokens`); if (act instanceof HTMLButtonElement) act.disabled = save.ct < CT_CRAFT[it.rarity]
      tile.append(cv, el('span', `${RARITY_META[it.rarity].name}${it.animated ? ' · animated' : ''}`, 'rar'), el('b', it.name), el('small', `${KIND_LABEL[it.kind]} · ${it.note}`), act); grid.append(tile)
    }
    body.append(chips, grid)
  }
  function renderSleeve() {
    const prev = el('canvas'); prev.width = 960; prev.height = 360; prev.style.cssText = 'position:static!important;width:min(100%,640px);height:auto;display:block;margin:0 auto;border-radius:12px;background:linear-gradient(#0b1224,#05070d);border:1px solid #2c3d5c'; prev.setAttribute('role', 'img'); prev.setAttribute('aria-label', 'Preview of your Loksleeve: pack wrap, card back and card frame')
    sleevePreview = prev; body.append(prev)
    body.append(el('p', 'Your Loksleeve holds a pack wrap, a card back and a card frame. Swap what is inside any time: pick another one you have found.', 'lp-note'))
    for (const s of SLEEVE_SLOTS) {
      body.append(el('h2', s.label)); const row = el('div', '', 'lp-slot')
      const mk = (id: string, label: string, tip: string) => { const b = btn(label, () => { sleeve = equipSleeve(sleeve, s.slot, id); saveSleeve(sleeve); queueCloudSync(); render() }); b.setAttribute('aria-pressed', String(sleeve[s.slot] === id)); b.title = tip; return b }
      row.append(mk('', 'Starter', 'The plain starter'))
      for (const it of sleeveItemsOf(s.slot)) { const own = save.items.includes(it.id), b = mk(it.id, own ? it.name : `🔒 ${it.name}`, `${RARITY_META[it.rarity].name} · ${own ? it.note : 'Find it in a LokPack'}`); b.disabled = !own; b.style.borderColor = RARITY_META[it.rarity].color; row.append(b) }
      body.append(row)
    }
  }
  let sleevePreview: HTMLCanvasElement | null = null
  function render() {
    renderTop(); body.replaceChildren(); tiles = []; sleevePreview = null; live.textContent = ''
    if (tab === 'packs') body.append(stageWrap, actions, note); else if (tab === 'collection') renderCollection(); else renderSleeve()
    renderActions()
  }
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (tab === 'packs' && sctx) { sctx.setTransform(2, 0, 0, 2, 0, 0); drawStage(sctx, now) }
    const t = now / 1000
    for (const { c, item } of tiles) { const g = c.getContext('2d'); if (!g || (reduce && c.dataset.done)) continue; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 240, 240); drawItemArt(g, item, 120, 120, 200, t, reduce); c.dataset.done = '1' }
    if (sleevePreview) { const g = sleevePreview.getContext('2d')!; g.setTransform(1.5, 0, 0, 1.5, 0, 0); g.clearRect(0, 0, 640, 240); drawPackWrap(g, 60, 20, 120, 168, sleeveSpec(sleeve, 'packSkin'), 'Win Pack', t, reduce); drawCardBack(g, 270, 20, 120, 168, sleeveSpec(sleeve, 'cardBack'), t, reduce); drawCardFace(g, 460, 20, 120, 168, sleeveSpec(sleeve, 'cardFrame'), { name: 'Sample', type: 'Preview', rarityName: 'Rare', rarityColor: RARITY_META.rare.color, art: (c2, x, y, s) => drawTokenArt(c2, x, y, s, '#ffc857', t, reduce), lines: ['Your frame', 'on a card.'], cost: '3', number: 'No. 007' }, t, reduce) }
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
  window.addEventListener('keydown', onKey)
  root.append(style, top, tabsEl, body, live); parent.append(root)
  render(); raf = requestAnimationFrame(frame)
  if (opts.openFirst && selected) startOpen()
  return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); root.remove() }
}
