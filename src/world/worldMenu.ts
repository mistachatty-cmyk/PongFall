// The world menu: the menu IS the live shaft. One canvas, one running world (your own arena with a real rally, the other arenas, the walls with
// their eyes) and every control is an object in it: three signs hang from your arena's ceiling (mode, difficulty, other arenas), the ball resting on
// the floor is PLAY, and the rest of the game hangs around the arena as small tethered objects. Clicking an object flies the camera to it.
// Keyboard and screen readers get real buttons that mirror every object. Render-only: nothing here touches the sim except through the same
// attract world the intro already used.
import { drawAmbient } from './ambient'
import { createFx, feedFx } from '../render/eyes'
import { newCamera, renderWorld } from '../render/draw'
import { createWorld, arenaDims, type World } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import { stepIntroAttractWorld } from '../core/introAttract'
import { currentSides, matchLooks } from '../core/arenaSides'
import { loadPainterSelection, painterColors } from '../core/pongPainter'
import { SETTINGS_KEY, arenasLabel, defaultSettings } from '../core/settings'
import { loadSettings, saveSettings } from '../core/settingsStore'
import { listSaveSlots, loadSaveSlot, deleteSaveSlot } from '../core/saveSlots'
import { CURRENT_VERSION } from '../changelog'
import type { MainMenuHandle, MenuChoice, MenuOptions } from '../core/mainMenu'
import { createObjectField, type FieldItem } from './objectField'
import { lookPalette } from './look'
import { mix } from './palette'
import {
  SIGNS, SIGN_TITLE, easeView, hubView, isPortrait, propPos, launchView, lockBadge, optionsFor, propById, propView, sanitizeChoice, stepFocus, viewArrived,
  visibleProps, type Option, type PropDef, type SignId, type View, type WorldChoice,
} from './menuModel'

type Item = FieldItem

const newSeed = () => (Math.random() * 1e9) | 0
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function readSavedChoice(): Partial<WorldChoice> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {} } catch { return {} }
}
function writeSavedChoice(c: WorldChoice) {
  try { const cur = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {}; localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...cur, mode: c.mode, difficulty: c.difficulty, arenas: c.arenas, flux: c.flux })) } catch { /* the choice still applies to this visit */ }
}

const CSS = `
.wm{position:fixed;inset:0;z-index:50;background:#05080e;overflow:hidden;color:#dfeeff;font:14px system-ui,sans-serif;transition:opacity .6s ease}
.wm canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.wm.go{opacity:0;pointer-events:none}
.wm-sr{position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden}
.wm-sr button:focus{position:fixed;left:8px;top:8px;z-index:5;width:auto;height:auto;padding:6px 10px;background:#0b1522;color:#fff;border:2px solid #8cece6;border-radius:8px}
.wm-pages{position:absolute;inset:0;z-index:60;pointer-events:none;transform:translateZ(0)}.wm-pages>*{pointer-events:auto}
.wm-pages.open{inset:clamp(10px,5vh,44px) clamp(10px,5vw,64px);border-radius:16px;overflow:hidden;background:rgba(6,10,18,.4);box-shadow:0 0 0 2px rgba(140,236,230,.55),0 0 60px rgba(90,170,255,.25),0 30px 90px #000d;animation:wm-pop .38s cubic-bezier(.2,.9,.3,1)}
.wm-pages.open::before{content:attr(data-title);position:absolute;z-index:1;top:0;right:18px;padding:4px 12px;border-radius:0 0 8px 8px;background:#0b2230;color:#9fe6e1;font:800 10px ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;pointer-events:none}
@keyframes wm-pop{from{opacity:0;transform:translateZ(0) scale(.92)}to{opacity:1;transform:translateZ(0) scale(1)}}
.wm-saves{position:absolute;inset:0;overflow:auto;padding:22px clamp(14px,5vw,60px) 40px;background:radial-gradient(ellipse at 50% 0,#13182c,#070a11 75%);color:#dfeeff}
.wm-saves h1{margin:10px 0 4px;font-size:clamp(24px,5vw,36px);letter-spacing:.14em}.wm-saves p{color:#9fb0c8}
.wm-saves button{font:700 12px ui-monospace,monospace;color:#dff0ff;background:#0e1828;border:1px solid #4d6b8a;border-radius:6px;padding:8px 12px;cursor:pointer}
.wm-saves button:hover{border-color:#8cece6}.wm-saves button:focus-visible{outline:2px solid #65f4f2;outline-offset:2px}
.wm-saves li{display:flex;gap:8px;align-items:center;justify-content:space-between;list-style:none;padding:10px 12px;margin:8px 0;border:1px solid #33506b;border-radius:8px;background:#0a111dcc;max-width:560px}
.wm-saves ul{padding:0;margin:14px 0}
@media(prefers-reduced-motion:reduce){.wm{transition:none}}
`

export function showWorldMenu(onPlay: (c: MenuChoice) => void, o: MenuOptions): MainMenuHandle {
  const reduce = reduced() || loadSettings().reduceMotion
  const all = !!o.unlockAll
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st)
  const root = document.createElement('div'); root.className = 'wm'; root.dataset.pf = 'world-menu'
  const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'PongFall menu: a live falling arena. Use the buttons below to choose a mode and play, or open the jukebox, settings and the rest.')
  const sr = document.createElement('div'); sr.className = 'wm-sr'; sr.setAttribute('role', 'group'); sr.setAttribute('aria-label', 'PongFall menu')
  const pages = document.createElement('div'); pages.className = 'wm-pages'
  root.append(canvas, sr, pages); document.body.appendChild(root)
  const ctx = canvas.getContext('2d')!
  // LilEye has its own object in this world, so the roaming companion rests while the menu is open
  window.dispatchEvent(new CustomEvent('pongfall-companion', { detail: false }))

  // ---- state ----
  const pre = { ...readSavedChoice(), ...Object.fromEntries(Object.entries(o.preset ?? {}).filter(([, v]) => v !== undefined && !Number.isNaN(v))) } as Partial<WorldChoice>
  let choice: WorldChoice = sanitizeChoice(pre, o.progress, all)
  let openSign: SignId | null = null
  let hover: string | null = null, focus: string | null = null
  let state: 'hub' | 'zoom' | 'page' | 'launch' = 'hub'
  let pageClose: (() => void) | null = null, zoomTo: PropDef | null = null
  let toast: { text: string; until: number } | null = null
  let uiAlpha = 1, dead = false, raf = 0, last = performance.now(), acc = 0
  let cw = 1, ch = 1, dpr = 1
  let view: View = hubView(1280, 800), target: View = view

  const fx = createFx(reduce); fx.fogMode = 'low'
  const cam = newCamera(); cam.lock = 'field'
  const hud = { me: 0 as const, paused: false, result: null, best: null, user: null, trail: [], now: 0, muted: true, perks: [], hints: false, gauge: false, visible: false }
  const mkWorld = (arenas: number, keepScroll?: number): World => {
    const w = createWorld({ mode: 'sandbox', difficulty: 'sharp', arenas, powerUnlocked: true }, newSeed())
    w.eyesOpenUntil = 1e9
    w.tune.swayKick *= 0.3; w.tune.rockTorque *= 0.3                  // a calmer arena: the signs on it must stay readable
    if (keepScroll !== undefined) w.scroll = keepScroll
    return w
  }
  let world = mkWorld(choice.arenas)
  const paint = painterColors(loadPainterSelection())

  // ---- layout: where every object is, this frame ----
  const layoutArena = (W: number, H: number): Item[] => {
    const out: Item[] = []
    const sy = -H / 2 + 92
    SIGNS.forEach((sign, i) => {
      const opts = optionsFor(sign, o.progress, all)
      const cur = opts.find(x => x.v === (choice as unknown as Record<string, unknown>)[sign === 'mode' ? 'mode' : sign === 'difficulty' ? 'difficulty' : 'arenas'])
      const x = (i - 1) * (W * 0.32)
      out.push({ id: `sign:${sign}`, frame: 'arena', kind: 'sign', x, y: sy, w: 184, h: 64, title: SIGN_TITLE[sign], value: cur?.label ?? (sign === 'arenas' ? arenasLabel(choice.arenas) : ''), label: `${SIGN_TITLE[sign]}: ${cur?.label ?? (sign === 'arenas' ? arenasLabel(choice.arenas) : '')}. Press to change.`, hint: opts.length > 1 ? 'Click to change' : 'More open after more falls' })
      if (openSign === sign) opts.forEach((opt, k) => out.push({ id: `opt:${sign}:${k}`, frame: 'arena', kind: 'option', x, y: sy + 68 + k * 50, w: 184, h: 42, value: opt.label, badge: opt.lock ? lockBadge(opt.lock) : '', locked: !!opt.lock, selected: opt.v === (cur?.v), label: `${opt.label}${opt.lock ? ', locked, ' + lockBadge(opt.lock) : ''}` }))
    })
    if (o.progress.falls > 0 || all) out.push({ id: 'toggle:flux', frame: 'arena', kind: 'toggle', x: -W / 2 + 100, y: H / 2 - 40, w: 176, h: 46, title: 'NPC DRIFT', value: choice.flux ? 'ON · unranked' : 'off', label: `NPC skill and sizes drift: ${choice.flux ? 'on' : 'off'}. Press to toggle.` })
    out.push({ id: 'ball', frame: 'arena', kind: 'ball', x: 0, y: H / 2 - 52, w: 76, h: 76, round: true, value: o.progress.falls === 0 ? 'BEGIN' : 'PLAY', caption: o.progress.falls === 0 ? 'FIRST FALL' : 'CLICK THE BALL TO FALL', label: o.progress.falls === 0 ? 'Begin your first fall' : 'Play', hint: 'Click the ball to fall' })
    return out
  }
  const layoutWorld = (t: number): Item[] => visibleProps(o.progress, all).map((def, i) => ({
    id: `prop:${def.id}`, frame: 'world' as const, kind: 'prop' as const, x: propPos(def, isPortrait(cw, ch)).x, y: propPos(def, isPortrait(cw, ch)).y + (reduce ? 0 : Math.sin(t * 0.8 + i * 1.7) * 7), w: def.size, h: def.size, art: def.id, title: def.label, hint: def.hint, label: `${def.label}. ${def.hint}`,
  }))

  const field = createObjectField({
    reduce, dpr: () => dpr, arena: () => world.arena, arenaSize: () => arenaDims(world), alpha: () => uiAlpha, palette: lookPalette,
    isHot: id => hover === id || focus === id, layoutArena, layoutWorld,
  })

  const screenPass = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawAmbient(ctx, lookPalette().anim, cw, ch, performance.now() / 1000, lookPalette(), reduce)
    // wordmark
    ctx.save(); ctx.textAlign = 'center'; ctx.globalAlpha = 0.95 * uiAlpha
    ctx.fillStyle = '#e9f2ff'; ctx.font = `900 ${Math.max(22, Math.min(44, cw * 0.035))}px system-ui`; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 14
    const ls = 'letterSpacing' in ctx ? ((ctx as unknown as { letterSpacing: string }).letterSpacing = '0.18em') : null; void ls
    ctx.fillText('PONGFALL', cw / 2, Math.max(40, ch * 0.065))
    ctx.font = `700 ${Math.max(11, Math.min(15, cw * 0.011))}px system-ui`; ctx.fillStyle = mix(lookPalette().accent, '#ffffff', 0.45); ctx.shadowBlur = 8
    ctx.fillText('WIN. BUT AT WHAT COST?', cw / 2, Math.max(40, ch * 0.065) + Math.max(18, ch * 0.028))
    ctx.restore()
    field.drawText(ctx, cw, ch, state === 'hub' ? (hover ?? focus) : null)
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (toast && performance.now() < toast.until) {
      ctx.font = '700 14px system-ui'; const wd = ctx.measureText(toast.text).width + 34
      ctx.fillStyle = 'rgba(30,22,6,.95)'; ctx.strokeStyle = lookPalette().plaque.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(cw / 2 - wd / 2, ch - 86, wd, 40, 10); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff1c4'; ctx.fillText(toast.text, cw / 2, ch - 66)
    }
    ctx.restore()
    // bottom line: version and the one-sentence help (wide screens only)
    if (cw >= 760) { ctx.save(); ctx.globalAlpha = 0.6 * uiAlpha; ctx.fillStyle = '#9fb4d0'; ctx.font = '600 11px ui-monospace,monospace'; ctx.textAlign = 'center'
    ctx.fillText(`v${CURRENT_VERSION} · SIGNS CHANGE THE MATCH · THE BALL STARTS IT · THE OBJECTS OPEN THE REST`, cw / 2, ch - 16); ctx.restore() }
  }

  // ---- input ----
    const hit = (e: { clientX: number; clientY: number }): Item | null => field.hit(e, canvas)
  const say = (text: string) => { toast = { text, until: performance.now() + 2600 } }
  const save = (c: WorldChoice) => { choice = c; writeSavedChoice(c) }

  const syncChoice = () => { const next = sanitizeChoice({ ...choice, ...readSavedChoice() } as Partial<WorldChoice>, o.progress, all); if (next.arenas !== choice.arenas) world = mkWorld(next.arenas, world.scroll); choice = next }
  const closePage = () => { pageClose?.(); syncChoice(); pageClose = null; pages.replaceChildren(); pages.classList.remove('open'); state = 'hub'; zoomTo = null; target = hubView(cw, ch); rebuildMirror() }
  const openPage = (def: PropDef) => {
    state = 'page'; pages.classList.add('open'); pages.dataset.title = def.label
    const onClose = () => closePage()
    if (def.id === 'stats') { void import('../core/statsPage').then(({ createStatsPage }) => { if (dead || state !== 'page') return; const sp = createStatsPage(pages); sp.show(root); pageClose = () => sp.destroy(); const obs = new MutationObserver(() => { if (pages.firstElementChild && (pages.firstElementChild as HTMLElement).style.display === 'none') { obs.disconnect(); onClose() } }); obs.observe(pages, { subtree: true, attributes: true, attributeFilter: ['style'] }) }); return }
    if (def.id === 'easel') { void import('../core/pongPainterView').then(({ mountPongPainter }) => { if (dead || state !== 'page') return; pageClose = mountPongPainter(pages, o.unlockAll ? Math.max(1, o.progress.falls) : o.progress.falls, onClose) }); return }
    if (def.id === 'wardrobe') { void import('../core/arenaSidesView').then(({ mountArenaSides }) => { if (dead || state !== 'page') return; pageClose = mountArenaSides(pages, onClose, { music: o.music }) }); return }
    if (def.id === 'pack') { void import('../core/lokPackView').then(({ mountLokPacks }) => { if (dead || state !== 'page') return; pageClose = mountLokPacks(pages, onClose, { reduce, play: c => o.audio?.play(c, 0.8) }) }); return }
    if (def.id === 'eye') { void import('../core/lilEyeView').then(({ mountLilEyePage }) => { if (dead || state !== 'page') return; pageClose = mountLilEyePage(pages, onClose) }); return }
    if (def.id === 'gear') {
      void import('../core/settingsPanel').then(({ createSettingsPanel }) => {
        if (dead || state !== 'page' || !o.audio) { if (!o.audio) { say('Settings are not available here'); onClose() } return }
        const S = loadSettings()
        const panel = createSettingsPanel({
          host: pages, audio: o.audio, get: () => S,
          set(patch) { Object.assign(S, patch); saveSettings(S); if (patch.uiTheme !== undefined || patch.uiAccent !== undefined || patch.uiPlaque !== undefined || patch.shaderPack !== undefined) window.dispatchEvent(new Event('pongfall-look')); if (patch.companion !== undefined) window.dispatchEvent(new CustomEvent('pongfall-companion', { detail: S.companion })); if (patch.classicEyes !== undefined) void import('../render/eyes').then(m => m.setDetailedEyes(!S.classicEyes)) },
          lensUnlocked: () => { try { return localStorage.getItem('pongfall.lensUnlocked') === '1' } catch { return false } },
          reset() { Object.assign(S, defaultSettings(reduce)); saveSettings(S); window.dispatchEvent(new Event('pongfall-look')); window.dispatchEvent(new CustomEvent('pongfall-companion', { detail: S.companion })); void import('../render/eyes').then(m => m.setDetailedEyes(!S.classicEyes)); syncChoice() },
          onOpen() { /* the world keeps drifting behind the page */ }, onClose,
        })
        pages.querySelectorAll<HTMLElement>('[data-pf="settings"],[data-pf="rules"]').forEach(b => { b.style.display = 'none' })
        panel.open(); pageClose = () => panel.destroy()
      })
      return
    }
    if (def.id === 'cassette') {
      const page = document.createElement('section'); page.className = 'wm-saves'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-label', 'Saved matches')
      const render = () => {
        page.replaceChildren()
        const back = document.createElement('button'); back.textContent = '← Back'; back.onclick = onClose
        const h = document.createElement('h1'); h.textContent = 'SAVED MATCHES'
        const p = document.createElement('p'); p.textContent = 'Replays you saved from the pause menu. Load one to watch it play out again.'
        const ul = document.createElement('ul'); const slots = listSaveSlots()
        if (!slots.length) { const li = document.createElement('p'); li.textContent = 'No saved matches yet. Pause a match and choose Save match.'; ul.append(li) }
        for (const slot of slots) {
          const li = document.createElement('li'); const name = document.createElement('span'); name.textContent = slot.name
          const act = document.createElement('span'); act.style.cssText = 'display:flex;gap:6px'
          const load = document.createElement('button'); load.textContent = 'Load'; load.onclick = () => { try { const c = loadSaveSlot(slot); closePage(); launch({ replay: c } as Partial<MenuChoice>) } catch { say('Could not load this save') } }
          const del = document.createElement('button'); del.textContent = 'Delete'; del.setAttribute('aria-label', `Delete ${slot.name}`); del.onclick = () => { deleteSaveSlot(slot.id); render() }
          act.append(load, del); li.append(name, act); ul.append(li)
        }
        page.append(back, h, p, ul); back.focus()
      }
      render(); pages.append(page); pageClose = () => page.remove()
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
      window.addEventListener('keydown', onKey); const prev = pageClose; pageClose = () => { window.removeEventListener('keydown', onKey); prev?.() }
      return
    }
    if (def.id === 'flask' || def.id === 'door') {
      // the multiplayer door and the Game Lab are the classic menu's own pages, shown inside the same framed screen as every other page
      void import('../core/mainMenu').then(({ showMainMenu }) => {
        if (dead || state !== 'page') return
        const inner = showMainMenu(c => { onPlay(c) }, { ...o, startView: def.id === 'door' ? 'multiplayer' : 'settings', onExit: onClose, host: pages })
        pageClose = () => inner.destroy()
      })
      return
    }
    onClose()
  }
  const activateProp = (def: PropDef) => {
    if (state !== 'hub') return
    openSign = null
    if (!def.page) { o.openJukebox?.(); return }          // the jukebox is the music library itself
    state = 'zoom'; zoomTo = def; target = propView(def, cw, ch)
    window.setTimeout(() => { if (!dead && state === 'zoom' && zoomTo === def) openPage(def) }, reduce ? 0 : 520)
  }
  const launch = (extra: Partial<MenuChoice> = {}) => {
    if (state === 'launch') return
    state = 'launch'; openSign = null; target = launchView(cw, ch, arenaDims(world).W)
    // the match is built underneath first and the menu fades away over it, so there is no black frame between the two
    const go = () => { if (dead) return; onPlay({ ...choice, duoOpponent: 'cpu', ...extra }); root.classList.add('go'); window.setTimeout(destroy, reduce ? 0 : 680) }
    window.setTimeout(go, reduce ? 0 : 780)
  }
  const activate = (id: string) => {
    if (state === 'launch') return
    if (id === 'ball') { launch(); return }
    if (id === 'toggle:flux') { save({ ...choice, flux: !choice.flux }); rebuildMirror(); return }
    if (id.startsWith('prop:')) { const def = propById(id.slice(5)); if (def) activateProp(def); return }
    if (state !== 'hub') return
    if (id.startsWith('sign:')) { const s = id.slice(5) as SignId; openSign = openSign === s ? null : s; rebuildMirror(); return }
    if (id.startsWith('opt:')) {
      const [, sign, k] = id.split(':'); const opt: Option | undefined = optionsFor(sign as SignId, o.progress, all)[Number(k)]
      if (!opt) return
      if (opt.lock) { say(`${opt.label} opens ${lockBadge(opt.lock)}`); return }
      const next = { ...choice, [sign as string]: opt.v } as WorldChoice
      const arenasChanged = next.arenas !== choice.arenas
      save(next); openSign = null
      if (arenasChanged) world = mkWorld(next.arenas, world.scroll)
      rebuildMirror()
    }
  }

  canvas.addEventListener('pointermove', e => { const it = state === 'hub' ? hit(e) : null; hover = it?.id ?? null; canvas.style.cursor = it ? 'pointer' : 'default' })
  canvas.addEventListener('pointerleave', () => { hover = null })
  canvas.addEventListener('pointerdown', e => {
    if (state !== 'hub') return
    const it = hit(e)
    if (it) { e.preventDefault(); focus = null; activate(it.id) } else if (openSign) { openSign = null; rebuildMirror() }
  })

  // ---- the real buttons behind the picture: keyboard and screen readers ----
  function rebuildMirror() {
    const hadFocus = sr.contains(document.activeElement) ? focus : null
    sr.replaceChildren()
    const mk = (id: string, label: string) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', label); b.dataset.id = id
      b.onfocus = () => { focus = id }; b.onblur = () => { if (focus === id) focus = null }
      b.onclick = () => activate(id); sr.append(b)
    }
    for (const sign of SIGNS) {
      const cur = field.items().find(i => i.id === `sign:${sign}`)
      mk(`sign:${sign}`, cur?.label ?? `${SIGN_TITLE[sign]}. Press to change.`)
      if (openSign === sign) optionsFor(sign, o.progress, all).forEach((opt, k) => mk(`opt:${sign}:${k}`, `${opt.label}${opt.lock ? `, locked, ${lockBadge(opt.lock)}` : ''}`))
    }
    if (o.progress.falls > 0 || all) mk('toggle:flux', `NPC skill and sizes drift: ${choice.flux ? 'on' : 'off'}. Press to toggle.`)
    mk('ball', o.progress.falls === 0 ? 'Begin your first fall' : 'Play')
    for (const def of visibleProps(o.progress, all)) mk(`prop:${def.id}`, `${def.label}. ${def.hint}`)
    if (hadFocus) sr.querySelector<HTMLButtonElement>(`button[data-id="${hadFocus}"]`)?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (state === 'page' || state === 'launch') return
    if (e.key === 'Escape' && openSign) { e.preventDefault(); openSign = null; rebuildMirror(); return }
    if (e.target instanceof Element && e.target.closest('input,textarea,select')) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const btns = Array.from(sr.querySelectorAll('button'))
      const idx = btns.indexOf(document.activeElement as HTMLButtonElement), dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
      btns[idx < 0 ? (dir === 1 ? 0 : btns.length - 1) : (idx + dir + btns.length) % btns.length]?.focus()
      return
    }
    if (e.key === 'Enter' && !(e.target instanceof Element && e.target.closest('button'))) { e.preventDefault(); launch() }
  }
  window.addEventListener('keydown', onKey)

  // ---- loop ----
  const resize = () => {
    const r = root.getBoundingClientRect(); cw = Math.max(1, r.width); ch = Math.max(1, r.height); dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr)
    if (state === 'hub') target = hubView(cw, ch)
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize(); view = hubView(cw, ch); target = view
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (dead || document.hidden) { last = now; return }
    const dt = Math.min(0.06, Math.max(0, (now - last) / 1000)); last = now
    acc = Math.min(acc + dt, FIXED_DT * 5)
    while (acc >= FIXED_DT) {
      world.events.length = 0
      if (world.status === 'over') { world = mkWorld(choice.arenas, world.scroll) }
      stepIntroAttractWorld(world, true); world.log.length = 0
      feedFx(fx, world, world.events.splice(0), FIXED_DT, now)
      acc -= FIXED_DT
    }
    view = reduce ? target : easeView(view, target, dt, state === 'launch' ? 3.2 : 4.2)
    // props are tethered to the arena, so while one is in focus the camera follows it as the arena sways
    if (zoomTo || state === 'page') { const def = zoomTo; if (def) { const pp = propPos(def, isPortrait(cw, ch)); target = { ...target, panX: pp.x + world.arena.x * 0.75, panY: pp.y + world.arena.y * 0.75 } } }
    uiAlpha = state === 'launch' ? Math.max(0, uiAlpha - dt * 2.4) : state === 'hub' ? Math.min(1, uiAlpha + dt * 3) : Math.max(0.0, uiAlpha - dt * 4)
    cam.zoom = view.zoom; cam.panX = view.panX; cam.panY = view.panY
    hud.now = now
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderWorld(ctx, world, cam, cw, ch, hud, fx, { paint, sides: matchLooks(currentSides(), 0, null, world.seed), layers: { arena: field.arenaLayer, world: field.worldLayer } })
    screenPass()
    if (state === 'zoom' && viewArrived(view, target)) { /* the page opens on its timer; arrival only settles the camera */ }
  }
  rebuildMirror()
  raf = requestAnimationFrame(frame)
  // links that carry a room code, and the dev-mode secret, open their page straight away (the classic menu did the same)
  const invite = new URLSearchParams(location.search).get('room') ?? o.resumeRoom
  const door = propById('door')!, flask = propById('flask')!
  if (invite) window.setTimeout(() => { if (!dead && state === 'hub') openPage(door) }, 300)
  else if (o.autoOpenDevMode) window.setTimeout(() => { if (!dead && state === 'hub') openPage(flask) }, 300)

  function destroy() {
    if (dead) return
    dead = true; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', onKey)
    pageClose?.(); pageClose = null; fx.fog?.destroy()
    window.dispatchEvent(new CustomEvent('pongfall-companion', { detail: loadSettings().companion }))
    root.remove(); st.remove()
  }
  return { destroy }
}
