import { MODES } from '../sim/data/modes'
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../sim/data/difficulty'
import { ARENA_OPTIONS, TARGET_OPTIONS, TIME_OPTIONS, SETTINGS_KEY, arenasLabel, targetLabel, timeLabel } from './settings'
import { Progress, MODE_ORDER, unlockedModes, lockHint, multiplayerUnlocked, FALLS_FOR_MULTIPLAYER } from './progress'
import { makeCode, parseCode } from './matchCode'
import { hostRoom, joinRoom, normalizeRoomCode, RoomHandle } from '../net/room'
import { onlineConfigured, openSupabaseChannel } from '../net/supabaseChannel'
import type { NetSession } from '../net/lockstep'

export interface MenuChoice { mode: string; difficulty: string; arenas: number; flux: boolean; seed?: number; target?: number; timeLimit?: number; net?: NetSession }
export interface MenuOptions { preset?: Partial<MenuChoice>; progress: Progress; unlockAll?: boolean }

const css = `
.pf-menu{position:fixed;inset:0;z-index:50;background:#06080d;color:#cfe3ff;font:15px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;transition:opacity .7s ease .15s}
.pf-menu canvas{position:absolute;inset:0;width:100%;height:100%;transition:transform .9s cubic-bezier(.6,0,.9,.4)}
.pf-menu .pf-panel{position:relative;display:flex;flex-direction:column;gap:14px;align-items:center;padding:22px;max-width:92vw;text-align:center;transition:opacity .35s,transform .6s}
.pf-menu h1{margin:0 0 4px;font:800 clamp(36px,9vw,72px) system-ui;letter-spacing:.12em;text-shadow:0 0 30px #000,0 0 12px #000}
.pf-menu .pf-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}
.pf-menu .pf-lab{width:100%;font-size:12px;letter-spacing:.2em;opacity:.7;text-shadow:0 0 6px #000}
.pf-menu button{font:600 14px system-ui;color:#cfe3ff;background:rgba(16,21,31,.78);border:2px solid #2a3446;border-radius:10px;padding:8px 14px;cursor:pointer}
.pf-menu button.on{border-color:#8affc1;color:#d8ffe9;box-shadow:0 0 14px #8affc144}
.pf-menu button.pf-play{font-size:22px;padding:12px 56px;margin-top:8px;border-color:#ffe08a;color:#fff2c4}
.pf-menu .pf-blurb{min-height:1.3em;opacity:.8;text-shadow:0 0 6px #000}
.pf-menu .pf-foot{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:12px;letter-spacing:.15em;opacity:.65;text-shadow:0 0 6px #000}
.pf-menu .pf-foot a{color:inherit;margin:0 8px}
.pf-menu button[disabled],.pf-menu button.lock{opacity:.45;cursor:default}
.pf-menu input[type=text]{background:#0b0e14;color:#cfe3ff;border:2px solid #2a3446;border-radius:8px;padding:7px 10px;font:600 14px ui-monospace,monospace;letter-spacing:.08em;text-align:center;width:230px}
.pf-menu .pf-note{font-size:12px;opacity:.75;max-width:420px;text-shadow:0 0 6px #000}
.pf-menu.go{opacity:0;pointer-events:none}.pf-menu.go canvas{transform:scale(3.2)}.pf-menu.go .pf-panel{opacity:0;transform:scale(.9)}
`

function saved(): Partial<MenuChoice> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {} } catch { return {} }
}

/** Menu 0: a big watching eyeball behind the mode / difficulty / arenas picker and the multiplayer panel. Modes open as you fall. play() fades the menu out over the game that is already mounted. */
export function showMainMenu(onPlay: (c: MenuChoice) => void, o: MenuOptions): void {
  const preset = Object.fromEntries(Object.entries(o.preset ?? {}).filter(([, v]) => v !== undefined && !Number.isNaN(v))) as Partial<MenuChoice>
  const s = { ...saved(), ...preset } as Partial<MenuChoice>
  const open = unlockedModes(o.progress, o.unlockAll)
  const modeIds = Object.keys(MODES)
  const c: MenuChoice = {
    mode: s.mode && open.includes(s.mode) ? s.mode : 'solo-fall',
    difficulty: s.difficulty && s.difficulty in DIFFICULTIES ? s.difficulty : 'chill',
    arenas: (ARENA_OPTIONS as readonly number[]).includes(s.arenas as number) ? (s.arenas as number) : 3,
    flux: s.flux === true,
    seed: s.seed,
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)
  const root = document.createElement('div'); root.className = 'pf-menu'
  const cv = document.createElement('canvas'); root.appendChild(cv)
  const panel = document.createElement('div'); panel.className = 'pf-panel'; root.appendChild(panel)
  const blurb = document.createElement('div'); blurb.className = 'pf-blurb'
  let paints: Array<() => void> = []
  const repaint = () => { paints.forEach(p => p()); blurb.textContent = `${MODES[c.mode]!.blurb} ${MODES[c.mode]!.ai ? DIFFICULTIES[c.difficulty]!.blurb : ''}` }

  const group = <T extends string | number>(label: string, items: Array<{ v: T; text: string; lock?: string }>, get: () => T, set: (v: T) => void) => {
    const lab = document.createElement('div'); lab.className = 'pf-lab'; lab.textContent = label
    const row = document.createElement('div'); row.className = 'pf-row'
    const btns = items.map(it => {
      const b = document.createElement('button'); b.textContent = (it.lock ? '🔒 ' : '') + it.text
      if (it.lock) { b.classList.add('lock'); b.title = it.lock; b.setAttribute('aria-disabled', 'true') }
      else b.onclick = () => { set(it.v); repaint() }
      row.appendChild(b); return [it.v, b] as const
    })
    paints.push(() => btns.forEach(([v, b]) => b.classList.toggle('on', v === get())))
    panel.append(lab, row)
  }

  function mainView() {
    panel.innerHTML = '<h1>PONGFALL</h1>'; paints = []
    group('MODE', MODE_ORDER.filter(id => id in MODES && MODES[id]!.ai).map(id => ({ v: id, text: MODES[id]!.label, lock: lockHint(o.progress, id, o.unlockAll) || undefined })), () => c.mode, v => { c.mode = v })
    group('DIFFICULTY', DIFFICULTY_ORDER.map(d => ({ v: d, text: DIFFICULTIES[d]!.label })), () => c.difficulty, v => { c.difficulty = v })
    group('OTHER ARENAS', ARENA_OPTIONS.map(n => ({ v: n, text: arenasLabel(n) })), () => c.arenas, v => { c.arenas = v })
    const flux = document.createElement('div'); flux.className = 'pf-row'
    const fb = document.createElement('button'); fb.onclick = () => { c.flux = !c.flux; repaint() }
    paints.push(() => { fb.textContent = `NPC skill and sizes drift: ${c.flux ? 'ON (unranked)' : 'off'}`; fb.classList.toggle('on', c.flux) })
    flux.append(fb); panel.append(flux)
    const play = document.createElement('button'); play.className = 'pf-play'; play.textContent = 'PLAY'; play.onclick = go
    panel.append(blurb, play)
    const mp = document.createElement('div'); mp.className = 'pf-row'
    const mpb = document.createElement('button'); mpb.textContent = '👥 Multiplayer'; mpb.onclick = multiplayerView
    mp.append(mpb); panel.append(mp)
    repaint()
  }

  function multiplayerView() {
    panel.innerHTML = '<h1 style="font-size:clamp(28px,6vw,44px)">MULTIPLAYER</h1>'; paints = []
    const back = document.createElement('button'); back.textContent = '← Back'; back.onclick = mainView
    if (!multiplayerUnlocked(o.progress, o.unlockAll)) {
      const n = Math.max(0, FALLS_FOR_MULTIPLAYER - o.progress.falls)
      const m = document.createElement('div'); m.className = 'pf-note'
      m.textContent = `Locked. Multiplayer opens after ${n} more fall${n === 1 ? '' : 's'}: finish matches to open the modes, one per fall.`
      panel.append(m, back); return
    }
    const mpModes = modeIds.filter(id => !MODES[id]!.ai)
    group('LOCAL 2-PLAYER', mpModes.map(id => ({ v: id, text: MODES[id]!.label })), () => c.mode, v => { c.mode = v })
    group('OTHER ARENAS', ARENA_OPTIONS.map(n => ({ v: n, text: arenasLabel(n) })), () => c.arenas, v => { c.arenas = v })
    group('SCORE TO WIN', TARGET_OPTIONS.map(n => ({ v: n, text: targetLabel(n) })), () => c.target ?? 0, v => { c.target = v })
    group('TIME LIMIT', TIME_OPTIONS.map(n => ({ v: n, text: timeLabel(n) })), () => c.timeLimit ?? 0, v => { c.timeLimit = v })
    const info = document.createElement('div'); info.className = 'pf-note'
    info.textContent = 'P1: W/S move, A/D tilt, Space thrust (hold to aim the arm with the mouse). P2: I/K, J/L tilt, U thrust. Press C in a match to change keys.'
    // match code: share a setup, or load one somebody sent you
    const codeLab = document.createElement('div'); codeLab.className = 'pf-lab'; codeLab.textContent = 'MATCH CODE'
    const row = document.createElement('div'); row.className = 'pf-row'
    const shown = document.createElement('input'); shown.type = 'text'; shown.readOnly = true; shown.setAttribute('aria-label', 'Your match code')
    const copy = document.createElement('button'); copy.textContent = 'Copy'
    const newSeed = document.createElement('button'); newSeed.textContent = 'New seed'
    row.append(shown, copy, newSeed)
    const row2 = document.createElement('div'); row2.className = 'pf-row'
    const entry = document.createElement('input'); entry.type = 'text'; entry.placeholder = 'PF1-XXXX-XXXX-XXXX-XX'; entry.setAttribute('aria-label', 'Enter a match code')
    const load = document.createElement('button'); load.textContent = 'Load code'
    row2.append(entry, load)
    const msg = document.createElement('div'); msg.className = 'pf-note'
    const diffs = DIFFICULTY_ORDER
    const refresh = () => { if (c.seed === undefined) c.seed = (Math.random() * 1e9) | 0; shown.value = makeCode({ mode: c.mode, difficulty: c.difficulty, arenas: c.arenas, target: c.target ?? 0, timeLimit: c.timeLimit ?? 0, flux: c.flux, seed: c.seed }, modeIds, diffs) }
    paints.push(refresh)
    copy.onclick = () => { void navigator.clipboard?.writeText(shown.value).then(() => { msg.textContent = 'Copied. Send it to your opponent: the same code sets the same match.' }, () => { shown.select(); msg.textContent = 'Press Ctrl+C to copy.' }) }
    newSeed.onclick = () => { c.seed = (Math.random() * 1e9) | 0; repaint() }
    load.onclick = () => {
      const cfg = parseCode(entry.value, modeIds, diffs)
      if (!cfg) { msg.textContent = 'That code is not valid. Check it and try again.'; return }
      if (!open.includes(cfg.mode)) { msg.textContent = `That code uses ${MODES[cfg.mode]!.label}, which is not unlocked yet.`; return }
      c.mode = cfg.mode; c.difficulty = cfg.difficulty; c.arenas = cfg.arenas; c.flux = cfg.flux; c.seed = cfg.seed; c.target = cfg.target; c.timeLimit = cfg.timeLimit
      msg.textContent = 'Match loaded. Press START.'; repaint()
    }
    const start = document.createElement('button'); start.className = 'pf-play'; start.textContent = 'START'; start.onclick = go
    // online: make a room and share its short code, or join a friend's
    const onLab = document.createElement('div'); onLab.className = 'pf-lab'; onLab.textContent = 'PLAY ONLINE'
    const onRow = document.createElement('div'); onRow.className = 'pf-row'
    const create = document.createElement('button'); create.textContent = '🌐 Create room'
    const roomIn = document.createElement('input'); roomIn.type = 'text'; roomIn.placeholder = 'PF-XXXX'; roomIn.style.width = '110px'; roomIn.setAttribute('aria-label', 'Room code')
    const join = document.createElement('button'); join.textContent = 'Join room'
    onRow.append(create, roomIn, join)
    const onMsg = document.createElement('div'); onMsg.className = 'pf-note'
    let room: RoomHandle | null = null
    if (!onlineConfigured) { create.disabled = true; join.disabled = true; roomIn.disabled = true; onMsg.textContent = 'Online play is not switched on for this site yet.' }
    const begin = (session: NetSession, cfg: { mode: string; difficulty: string; arenas: number; flux: boolean; target: number; timeLimit: number; seed: number }) => {
      c.mode = cfg.mode; c.difficulty = cfg.difficulty; c.arenas = cfg.arenas; c.flux = cfg.flux; c.target = cfg.target; c.timeLimit = cfg.timeLimit; c.seed = cfg.seed; c.net = session
      go()
    }
    const busy = (on: boolean) => { create.disabled = on || !onlineConfigured; join.disabled = on || !onlineConfigured }
    create.onclick = () => {
      busy(true); onMsg.textContent = 'Opening a room…'
      if (!MODES[c.mode] || MODES[c.mode]!.ai) c.mode = 'versus'
      if (c.seed === undefined) c.seed = (Math.random() * 1e9) | 0
      const cfg = { mode: c.mode, difficulty: c.difficulty, arenas: c.arenas, flux: c.flux, target: c.target ?? 0, timeLimit: c.timeLimit ?? 0, seed: c.seed }
      void hostRoom(openSupabaseChannel, cfg, {
        onWaiting: code => { onMsg.innerHTML = `Room <b style="font-size:20px;letter-spacing:.1em">${code}</b>. Send this code to your friend. Waiting for them to join… `; const x = document.createElement('button'); x.textContent = 'Cancel'; x.onclick = () => { room?.cancel(); room = null; onMsg.textContent = ''; busy(false) }; onMsg.appendChild(x) },
        onReady: begin,
        onError: m => { onMsg.textContent = m; busy(false) },
      }).then(h => { room = h })
    }
    join.onclick = () => {
      const code = normalizeRoomCode(roomIn.value)
      if (!code) { onMsg.textContent = 'Room codes look like PF-AB2C.'; return }
      busy(true); onMsg.textContent = `Joining ${code}…`
      void joinRoom(openSupabaseChannel, code, { onReady: begin, onError: m => { onMsg.textContent = m; busy(false) } }).then(h => { room = h })
    }
    panel.append(info, codeLab, row, row2, msg, start, onLab, onRow, onMsg, back)
    repaint()
  }

  const foot = document.createElement('div'); foot.className = 'pf-foot'
  foot.innerHTML = 'A GSIX DESIGNS GAME · LOK ECOSYSTEM<a href="/rules.html">Rules</a><a href="/about.html" target="_blank" rel="noopener">Dev notes</a><a href="https://itch.io/jam/trijam-393" target="_blank" rel="noopener">Made for Trijam 393</a>'
  root.appendChild(foot)
  document.body.appendChild(root)

  // the eyeball: pupil follows the pointer, blinks now and then
  const ctx = cv.getContext('2d')!
  let mx = 0.5, my = 0.5, px = 0.5, py = 0.5, raf = 0, nextBlink = 2, started = performance.now(), gone = false
  const onMove = (e: PointerEvent) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight }
  window.addEventListener('pointermove', onMove)
  const draw = () => {
    if (gone) return
    const dpr = devicePixelRatio || 1, w = innerWidth, h = innerHeight
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const t = (performance.now() - started) / 1000
    px += (mx - px) * 0.06; py += (my - py) * 0.06
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46
    ctx.fillStyle = '#06080d'; ctx.fillRect(0, 0, w, h)
    const blink = t > nextBlink ? Math.max(0, 1 - Math.sin((t - nextBlink) * Math.PI / 0.22)) : 1
    if (t > nextBlink + 0.22) nextBlink = t + 2 + (Math.sin(t * 12.9) + 1) * 2
    const open = 0.18 + 0.82 * blink
    ctx.save()
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.5, R * open, 0, 0, Math.PI * 2); ctx.clip()
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5)
    g.addColorStop(0, '#d9dde6'); g.addColorStop(1, '#6f7686'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const ix = cx + (px - 0.5) * R * 1.1, iy = cy + (py - 0.5) * R * 0.7 + Math.sin(t * 0.7) * 4
    const ig = ctx.createRadialGradient(ix, iy, R * 0.1, ix, iy, R * 0.62)
    ig.addColorStop(0, '#2f6f55'); ig.addColorStop(0.7, '#14352c'); ig.addColorStop(1, '#0a1a16')
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, R * 0.62, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ix, iy, R * 0.26, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(ix - R * 0.16, iy - R * 0.18, R * 0.07, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, w, h)   // dim so the menu text reads
    raf = requestAnimationFrame(draw)
  }
  draw()

  const go = () => {
    if (root.classList.contains('go')) return
    onPlay({ ...c })
    root.classList.add('go')
    setTimeout(() => { gone = true; cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', onKey); root.remove(); st.remove() }, 1100)
  }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) go() }
  window.addEventListener('keydown', onKey)
  mainView()
}
