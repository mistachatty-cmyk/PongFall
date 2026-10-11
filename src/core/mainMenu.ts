import { MODES } from '../sim/data/modes'
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../sim/data/difficulty'
import { ARENA_OPTIONS, SETTINGS_KEY, arenasLabel } from './settings'

export interface MenuChoice { mode: string; difficulty: string; arenas: number }

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
.pf-menu button[disabled]{opacity:.45;cursor:default}
.pf-menu.go{opacity:0;pointer-events:none}.pf-menu.go canvas{transform:scale(3.2)}.pf-menu.go .pf-panel{opacity:0;transform:scale(.9)}
`

function saved(): Partial<MenuChoice> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {} } catch { return {} }
}

/** Menu 0: a big watching eyeball behind a simple mode / difficulty / arenas picker. play() fades the menu out over the game that is already mounted. */
export function showMainMenu(onPlay: (c: MenuChoice) => void, preset: Partial<MenuChoice> = {}): void {
  const s = { ...saved(), ...Object.fromEntries(Object.entries(preset).filter(([, v]) => v !== undefined && !Number.isNaN(v))) } as Partial<MenuChoice>
  const c: MenuChoice = {
    mode: s.mode && s.mode in MODES ? s.mode : 'classic',
    difficulty: s.difficulty && s.difficulty in DIFFICULTIES ? s.difficulty : 'chill',
    arenas: (ARENA_OPTIONS as readonly number[]).includes(s.arenas as number) ? (s.arenas as number) : 3,
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)
  const root = document.createElement('div'); root.className = 'pf-menu'
  const cv = document.createElement('canvas'); root.appendChild(cv)
  const panel = document.createElement('div'); panel.className = 'pf-panel'; root.appendChild(panel)
  panel.innerHTML = '<h1>PONGFALL</h1>'
  const blurb = document.createElement('div'); blurb.className = 'pf-blurb'

  const group = <T extends string | number>(label: string, items: Array<[T, string]>, get: () => T, set: (v: T) => void) => {
    const lab = document.createElement('div'); lab.className = 'pf-lab'; lab.textContent = label
    const row = document.createElement('div'); row.className = 'pf-row'
    const btns = items.map(([v, text]) => {
      const b = document.createElement('button'); b.textContent = text
      b.onclick = () => { set(v); paint() }
      row.appendChild(b); return [v, b] as const
    })
    const paint = () => btns.forEach(([v, b]) => b.classList.toggle('on', v === get()))
    paint(); panel.append(lab, row); return paint
  }
  const repaint = [
    group('MODE', Object.values(MODES).map(m => [m.id, m.label] as [string, string]), () => c.mode, v => { c.mode = v }),
    group('DIFFICULTY', DIFFICULTY_ORDER.map(d => [d, DIFFICULTIES[d]!.label] as [string, string]), () => c.difficulty, v => { c.difficulty = v }),
    group('OTHER ARENAS', ARENA_OPTIONS.map(n => [n, arenasLabel(n)] as [number, string]), () => c.arenas, v => { c.arenas = v }),
  ]
  const showBlurb = () => { blurb.textContent = `${MODES[c.mode]!.blurb} ${DIFFICULTIES[c.difficulty]!.blurb}` }
  panel.addEventListener('click', () => { repaint.forEach(p => p()); showBlurb() })
  showBlurb()
  const play = document.createElement('button'); play.className = 'pf-play'; play.textContent = 'PLAY'
  panel.append(blurb, play)
  // quick multiplayer access
  const mp = document.createElement('div'); mp.className = 'pf-row'
  const vs = document.createElement('button'); vs.textContent = '👥 Local 2-player'
  vs.onclick = () => { c.mode = 'versus'; repaint.forEach(p => p()); showBlurb() }
  const online = document.createElement('button'); online.textContent = '🌐 Online (LOK) · soon'; online.disabled = true
  online.title = 'Online matches need LOK services (sign-in, lobby, replay verification) - not live yet'
  mp.append(vs, online); panel.append(mp)

  const foot = document.createElement('div'); foot.className = 'pf-foot'
  foot.innerHTML = 'A GSIX DESIGNS GAME · LOK ECOSYSTEM<a href="/rules.html">Rules</a><a href="https://itch.io/jam/trijam-393" target="_blank" rel="noopener">Made for Trijam 393</a>'
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
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') go() }
  window.addEventListener('keydown', onKey)
  play.onclick = go
}
