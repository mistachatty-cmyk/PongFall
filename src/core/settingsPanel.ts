import { Settings, TARGET_OPTIONS, TIME_OPTIONS, ARENA_OPTIONS, targetLabel, timeLabel, arenasLabel, defaultSettings } from './settings'
import { MODES } from '../sim/data/modes'
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../sim/data/difficulty'
import { LENSES } from '../render/lens'
import type { AudioEngine } from '../audio/engine'

export interface PanelDeps {
  host: HTMLElement
  audio: AudioEngine
  get(): Settings
  /** Apply a change. `restart` is true when the change needs a new game (mode, difficulty, length). */
  set(patch: Partial<Settings>, restart: boolean): void
  reset(): void
  lensUnlocked(): boolean
  /** Modes the player has opened (progression). Others show as locked. */
  allowedModes?(): string[]
  /** Re-lock the main menu and the modes (progression reset). */
  onResetProgress?(): void
  onOpen(): void
  onClose(): void
}
export interface SettingsPanel { sync(): void; isOpen(): boolean; open(): void; close(): void; destroy(): void }

const SECTION = 'margin:12px 0 4px;color:#7f8da3;font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase'
const ROW = 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin:6px 0'
const SEL = 'background:#101722;color:#cfe3ff;border:1px solid #2a3446;border-radius:6px;padding:4px 6px;font:13px system-ui;max-width:130px'

export function createSettingsPanel(d: PanelDeps): SettingsPanel {
  const btn = document.createElement('button')
  btn.textContent = '⚙'; btn.setAttribute('aria-label', 'Settings'); btn.setAttribute('data-pf', 'settings')
  btn.style.cssText = 'position:absolute;right:12px;top:56px;width:36px;height:36px;border-radius:8px;border:1px solid #2a3446;background:rgba(16,21,31,.85);color:#cfe3ff;font-size:18px;cursor:pointer;z-index:6'
  const help = document.createElement('a')
  help.textContent = '?'; help.href = '/rules.html'; help.target = '_blank'; help.rel = 'noopener'
  help.setAttribute('aria-label', 'Rules and how the game works'); help.setAttribute('data-pf', 'rules')
  help.style.cssText = 'position:absolute;right:56px;top:56px;width:36px;height:36px;border-radius:8px;border:1px solid #2a3446;background:rgba(16,21,31,.85);color:#cfe3ff;font:700 18px/34px system-ui;text-align:center;text-decoration:none;z-index:6'
  const panel = document.createElement('div')
  panel.setAttribute('data-pf', 'panel')
  panel.style.cssText = 'position:absolute;right:12px;top:98px;width:270px;max-height:calc(100% - 130px);overflow:auto;padding:12px 14px;border-radius:10px;border:1px solid #2a3446;background:rgba(12,16,24,.96);color:#cfe3ff;font:13px system-ui;display:none;z-index:6'
  const opt = (v: string | number, label: string) => `<option value="${v}">${label}</option>`
  const sel = (k: string, items: string) => `<select data-k="${k}" style="${SEL}">${items}</select>`
  const chk = (k: string, label: string) => `<label style="${ROW}"><span>${label}</span><input data-k="${k}" type="checkbox"></label>`
  const rng = (k: string, label: string) => `<label style="${ROW}"><span>${label}</span><input data-k="${k}" type="range" min="0" max="100" style="width:120px"></label>`
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Settings</b><button data-k="close" style="background:none;border:0;color:#7f8da3;font-size:18px;cursor:pointer" aria-label="Close settings">✕</button></div>
    <div style="${SECTION}">Game <span style="text-transform:none;letter-spacing:0;font-weight:400">(restarts the game)</span></div>
    <label style="${ROW}"><span>Difficulty</span>${sel('difficulty', DIFFICULTY_ORDER.map(id => opt(id, DIFFICULTIES[id]!.label)).join(''))}</label>
    <div data-k="blurb" style="color:#7f8da3;margin:-2px 0 6px"></div>
    <label style="${ROW}"><span>Mode</span>${sel('mode', Object.values(MODES).map(m => opt(m.id, m.label)).join(''))}</label>
    <label style="${ROW}"><span>Other arenas</span>${sel('arenas', ARENA_OPTIONS.map(n => opt(n, arenasLabel(n))).join(''))}</label>
    <label style="${ROW}"><span>Score to win</span>${sel('target', TARGET_OPTIONS.map(t => opt(t, targetLabel(t))).join(''))}</label>
    <label style="${ROW}"><span>Time limit</span>${sel('timeLimit', TIME_OPTIONS.map(t => opt(t, timeLabel(t))).join(''))}</label>
    ${chk('flux', 'Fluctuating NPC skill and sizes (unranked)')}
    <div style="${SECTION}">Sound</div>
    ${rng('vol', 'Master')}${rng('sfx', 'Effects')}${rng('amb', 'Wind and ambience')}${rng('mus', 'Music')}${chk('mute', 'Mute')}
    <div style="${SECTION}">Graphics</div>
    <label style="${ROW}"><span>Fog</span>${sel('fog', opt('high', 'High (shader)') + opt('low', 'Low') + opt('off', 'Off'))}</label>
    ${chk('reduceMotion', 'Reduce motion')}
    <div style="${SECTION}">Lens <span data-k="lensnote" style="text-transform:none;letter-spacing:0;font-weight:400"></span></div>
    <label style="${ROW}"><span>Filter</span>${sel('lens', LENSES.map(l => opt(l.id, l.label)).join(''))}</label>
    <label style="${ROW}"><span>Hue shift</span><input data-k="hue" type="range" min="0" max="359" style="width:120px"></label>
    <div style="${SECTION}">Controls and HUD</div>
    ${chk('hints', 'Show control hints')}${chk('gauge', 'Show wind gauge')}
    <label style="${ROW}"><span>On-screen buttons</span>${sel('buttons', opt('show', 'Show') + opt('hide', 'Hide'))}</label>
    ${chk('leftHanded', 'Left-handed buttons')}
    <div style="display:flex;justify-content:space-between;margin-top:12px">
      <button data-k="reset" style="${SEL};cursor:pointer">Reset to defaults</button>
      <button data-k="resetmenu" style="${SEL};cursor:pointer" title="Closes the main menu again and re-locks the modes until you fall again">Reset main menu</button>
      <a href="/rules.html" target="_blank" rel="noopener" style="color:#4aa8ff;align-self:center">Rules and how it works</a>
    </div>`
  const q = <T extends HTMLElement>(k: string) => panel.querySelector(`[data-k="${k}"]`) as T
  let open = false
  const setOpen = (o: boolean) => { if (o === open) return; open = o; panel.style.display = o ? 'block' : 'none'; if (o) { d.audio.unlock(); sync(); d.onOpen() } else d.onClose() }
  function sync() {
    const s = d.get()
    q<HTMLSelectElement>('difficulty').value = s.difficulty
    const allowed = d.allowedModes?.() ?? Object.keys(MODES)
    q<HTMLSelectElement>('mode').innerHTML = Object.values(MODES).map(m => `<option value="${m.id}"${allowed.includes(m.id) ? '' : ' disabled'}>${allowed.includes(m.id) ? '' : '🔒 '}${m.label}</option>`).join('')
    q<HTMLSelectElement>('mode').value = s.mode
    q<HTMLSelectElement>('arenas').value = String(s.arenas)
    q<HTMLSelectElement>('target').value = String(s.target)
    q<HTMLSelectElement>('timeLimit').value = String(s.timeLimit)
    q<HTMLInputElement>('vol').value = String(Math.round(d.audio.getVolume() * 100))
    q<HTMLInputElement>('sfx').value = String(Math.round(d.audio.getBus('sfx') * 100))
    q<HTMLInputElement>('mus').value = String(Math.round(d.audio.getBus('mus') * 100))
    q<HTMLInputElement>('amb').value = String(Math.round(d.audio.getBus('amb') * 100))
    q<HTMLInputElement>('mute').checked = d.audio.isMuted()
    q<HTMLSelectElement>('fog').value = s.fog
    q<HTMLInputElement>('flux').checked = s.flux
    q<HTMLInputElement>('reduceMotion').checked = s.reduceMotion
    q<HTMLInputElement>('hints').checked = s.hints
    q<HTMLInputElement>('gauge').checked = s.gauge
    q<HTMLSelectElement>('buttons').value = s.buttons
    q<HTMLInputElement>('leftHanded').checked = s.leftHanded
    const lu = d.lensUnlocked()
    q<HTMLSelectElement>('lens').value = s.lens; q<HTMLInputElement>('hue').value = String(s.hue)
    q<HTMLSelectElement>('lens').disabled = !lu; q<HTMLInputElement>('hue').disabled = !lu
    q<HTMLElement>('lensnote').textContent = lu ? '' : '(win a match to unlock)'
    q<HTMLDivElement>('blurb').textContent = DIFFICULTIES[s.difficulty]?.blurb ?? ''
  }
  const num = (k: string) => Number((q<HTMLSelectElement>(k)).value)
  const onSel = (k: string, fn: () => void) => { q<HTMLSelectElement>(k).onchange = () => { fn(); (q<HTMLElement>(k)).blur(); sync() } }
  onSel('difficulty', () => d.set({ difficulty: q<HTMLSelectElement>('difficulty').value }, true))
  onSel('mode', () => d.set({ mode: q<HTMLSelectElement>('mode').value }, true))
  onSel('arenas', () => d.set({ arenas: num('arenas') }, true))
  onSel('target', () => d.set({ target: num('target') }, true))
  onSel('timeLimit', () => d.set({ timeLimit: num('timeLimit') }, true))
  onSel('fog', () => d.set({ fog: q<HTMLSelectElement>('fog').value as Settings['fog'] }, false))
  onSel('buttons', () => d.set({ buttons: q<HTMLSelectElement>('buttons').value as Settings['buttons'] }, false))
  onSel('lens', () => d.set({ lens: q<HTMLSelectElement>('lens').value }, false))
  q<HTMLInputElement>('hue').oninput = () => d.set({ hue: Number(q<HTMLInputElement>('hue').value) }, false)
  q<HTMLInputElement>('vol').oninput = () => d.audio.setVolume(Number(q<HTMLInputElement>('vol').value) / 100)
  q<HTMLInputElement>('sfx').oninput = () => d.audio.setBus('sfx', Number(q<HTMLInputElement>('sfx').value) / 100)
  q<HTMLInputElement>('mus').oninput = () => d.audio.setBus('mus', Number(q<HTMLInputElement>('mus').value) / 100)
  q<HTMLInputElement>('amb').oninput = () => d.audio.setBus('amb', Number(q<HTMLInputElement>('amb').value) / 100)
  q<HTMLInputElement>('mute').onchange = () => d.audio.setMuted(q<HTMLInputElement>('mute').checked)
  q<HTMLInputElement>('flux').onchange = () => d.set({ flux: q<HTMLInputElement>('flux').checked }, true)
  for (const k of ['reduceMotion', 'hints', 'gauge', 'leftHanded'] as const) q<HTMLInputElement>(k).onchange = () => d.set({ [k]: q<HTMLInputElement>(k).checked } as Partial<Settings>, false)
  q<HTMLButtonElement>('reset').onclick = () => { d.reset(); d.audio.setVolume(0.7); d.audio.setBus('sfx', 1); d.audio.setBus('amb', 0.8); d.audio.setBus('mus', 0.6); d.audio.setMuted(false); sync() }
  q<HTMLButtonElement>('resetmenu').onclick = () => { d.onResetProgress?.(); sync() }
  q<HTMLButtonElement>('close').onclick = () => setOpen(false)
  btn.onclick = () => setOpen(!open)
  for (const e of [panel, btn, help]) e.addEventListener('pointerdown', ev => ev.stopPropagation())
  panel.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Escape') setOpen(false) })
  d.host.style.position ||= 'relative'
  d.host.appendChild(help); d.host.appendChild(btn); d.host.appendChild(panel)
  sync()
  return { sync, isOpen: () => open, open: () => setOpen(true), close: () => setOpen(false), destroy() { btn.remove(); help.remove(); panel.remove() } }
}

export { defaultSettings }
