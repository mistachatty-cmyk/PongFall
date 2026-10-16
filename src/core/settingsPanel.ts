import { t, l10n, LANGUAGES, chooseLanguage } from './i18n'
import { earnedProgress } from './playerProgress'
import { UI_THEMES, themeById, themeUnlocked } from './uiThemes'
import { SHADER_PACKS, packById } from '../render/shaderPacks'
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
  online?: boolean
  /** Re-lock the main menu and the modes (progression reset). */
  onResetProgress?(): void
  onOpen(): void
  onClose(): void
  /** Open the keyboard editor from inside the settings page. */
  openControls?(): void
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
  // a full page, not a popout: two columns on wide screens, one on a phone
  panel.style.cssText = 'position:absolute;inset:0;z-index:12;overflow:auto;box-sizing:border-box;padding:22px clamp(14px,6vw,80px) 48px;background:radial-gradient(ellipse at 50% 0,#121a2c,#070a11 75%);color:#cfe3ff;font:14px system-ui;display:none;columns:2 340px;column-gap:56px'
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Settings')
  const opt = (v: string | number, label: string) => `<option value="${v}">${label}</option>`
  const sel = (k: string, items: string) => `<select data-k="${k}"${k === 'lang' ? ' translate="no"' : ''} style="${SEL}">${items}</select>`   // language names stay in their own language
  const chk = (k: string, label: string) => `<label style="${ROW}"><span>${label}</span><input data-k="${k}" type="checkbox"></label>`
  const rng = (k: string, label: string) => `<label style="${ROW}"><span>${label}</span><input data-k="${k}" type="range" min="0" max="100" style="width:120px"></label>`
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;column-span:all;margin-bottom:6px"><b style="font-size:clamp(22px,4vw,30px);letter-spacing:.12em;text-transform:uppercase">${t('settings.title')}</b><button data-k="close" style="background:none;border:0;color:#7f8da3;font-size:18px;cursor:pointer" aria-label="Close settings">✕</button></div>
    <div style="${SECTION}">Game <span style="text-transform:none;letter-spacing:0;font-weight:400">(restarts the game)</span></div>
    <label style="${ROW}"><span>Difficulty</span>${sel('difficulty', DIFFICULTY_ORDER.map(id => opt(id, DIFFICULTIES[id]!.label)).join(''))}</label>
    <div data-k="blurb" style="color:#7f8da3;margin:-2px 0 6px"></div>
    ${chk('windVents', 'Wind vents · unranked')}
    <div style="color:#7f8da3;margin:-2px 0 6px;line-height:1.35">Optional wall gusts shift sides every few seconds and bend the ball’s path. Applies after restarting. Offline matches only.</div>
    <label style="${ROW}"><span>Mode</span>${sel('mode', Object.values(MODES).map(m => opt(m.id, m.label)).join(''))}</label>
    <label style="${ROW}"><span>Other arenas</span>${sel('arenas', ARENA_OPTIONS.map(n => opt(n, arenasLabel(n))).join(''))}</label>
    <label style="${ROW}"><span>Score to win</span>${sel('target', TARGET_OPTIONS.map(t => opt(t, targetLabel(t))).join(''))}</label>
    <label style="${ROW}"><span>Time limit</span>${sel('timeLimit', TIME_OPTIONS.map(t => opt(t, timeLabel(t))).join(''))}</label>
    ${chk('flux', 'Fluctuating NPC skill and sizes (unranked)')}
    <div style="${SECTION}">Sound</div>
    <label style="${ROW}"><span>Falling sound</span>${sel('fallSound', opt('classic', 'Classic · whistling') + opt('dynamic', 'Dynamic · rolling air'))}</label>
    <div style="color:#7f8da3;margin:-2px 0 6px;line-height:1.35">Classic keeps PongFall’s original wind. Dynamic adds a broad rush that follows your speed and gusts.</div>
    ${rng('vol', 'Master')}${rng('sfx', 'Effects')}${rng('amb', 'Wind and ambience')}${rng('mus', 'Music')}${chk('mute', 'Mute')}
    <div style="${SECTION}">Graphics</div>
    <label style="${ROW}"><span>Fog</span>${sel('fog', opt('high', 'High (shader)') + opt('low', 'Low') + opt('off', 'Off'))}</label>
    ${chk('reduceMotion', 'Reduce motion')}
    <div style="${SECTION}">Lens <span data-k="lensnote" style="text-transform:none;letter-spacing:0;font-weight:400"></span></div>
    <label style="${ROW}"><span>Filter</span>${sel('lens', LENSES.map(l => opt(l.id, l.label)).join(''))}</label>
    <label style="${ROW}"><span>Hue shift</span><input data-k="hue" type="range" min="0" max="359" style="width:120px"></label>
    <div style="${SECTION}">${t('settings.keys')}</div>
    <label style="${ROW}"><span>Keyboard shortcuts</span><button data-k="keys" style="${SEL};cursor:pointer">Edit keys…</button></label>
    <div style="${SECTION}">${t('settings.language')}</div>
    <label style="${ROW}"><span>${t('settings.language')}</span>${sel('lang', LANGUAGES.map(l => opt(l.code, l.name)).join(''))}</label>
    <div style="color:#7f8da3;margin:-2px 0 6px;line-height:1.35" data-k="langnote">${t('settings.languageNote')}</div>
    <div style="${SECTION}">${t('settings.look')}</div>
    <label style="${ROW}"><span>Interface theme</span>${sel('uiTheme', '')}</label>
    <label style="${ROW}"><span>Shader pack</span>${sel('shaderPack', SHADER_PACKS.map(p => opt(p.id, p.name)).join(''))}</label>
    <div style="color:#7f8da3;margin:-2px 0 6px;line-height:1.35" data-k="looknote"></div>
    <div style="${SECTION}">Controls and HUD</div>
    ${chk('gameHud', 'Show in-game HUD')}${chk('hints', 'Show control hints')}${chk('gauge', 'Show wind gauge')}${chk('metronome', 'Show rally metronome')}${chk('classicEyes', 'Use the classic flat eyes')}${chk('companion', 'Show LilEye, the companion')}${chk('floaters', 'Floating menu objects (jukebox, stats, gear)')}${chk('arenaNames', 'Show names in other arenas')}${chk('trackUsage', 'Track action use in Stats')}
    <label style="${ROW}"><span>On-screen buttons</span>${sel('buttons', opt('show', 'Show') + opt('hide', 'Hide'))}</label>
    ${chk('leftHanded', 'Left-handed buttons')}
    <div style="display:flex;justify-content:space-between;margin-top:12px">
      <button data-k="reset" style="${SEL};cursor:pointer">Reset to defaults</button>
      <button data-k="resetmenu" style="${SEL};cursor:pointer" title="Closes the main menu again and re-loks the modes until you fall again">Reset main menu</button>
      <a href="/rules.html" target="_blank" rel="noopener" style="color:#4aa8ff;align-self:center">Rules and how it works</a>
    </div>`
  const q = <T extends HTMLElement>(k: string) => panel.querySelector(`[data-k="${k}"]`) as T
  let open = false
  const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false) } }
  window.addEventListener('keydown', onEsc, true)
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
    q<HTMLSelectElement>('fallSound').value = s.fallSound
    q<HTMLSelectElement>('fog').value = s.fog
    q<HTMLInputElement>('flux').checked = s.flux
    q<HTMLInputElement>('trackUsage').checked = s.trackUsage
    q<HTMLInputElement>('windVents').checked = s.windVents
    q<HTMLInputElement>('windVents').disabled = d.online === true
    q<HTMLInputElement>('reduceMotion').checked = s.reduceMotion
    q<HTMLInputElement>('hints').checked = s.hints
    q<HTMLInputElement>('gauge').checked = s.gauge
    q<HTMLInputElement>('metronome').checked = s.metronome
    q<HTMLInputElement>('classicEyes').checked = s.classicEyes
    q<HTMLInputElement>('companion').checked = s.companion
    q<HTMLInputElement>('floaters').checked = s.floaters
    q<HTMLInputElement>('arenaNames').checked = s.arenaNames
    q<HTMLInputElement>('gameHud').checked = s.gameHud
    q<HTMLSelectElement>('buttons').value = s.buttons
    q<HTMLInputElement>('leftHanded').checked = s.leftHanded
    const lu = d.lensUnlocked()
    const prog = earnedProgress(), themeSel = q<HTMLSelectElement>('uiTheme')
    themeSel.replaceChildren(...UI_THEMES.map(t => { const o = document.createElement('option'); const ok = themeUnlocked(t, prog); o.value = t.id; o.textContent = ok ? t.name : `🔒 ${t.name} · ${t.unlock.note}`; o.disabled = !ok; return o }))
    themeSel.value = s.uiTheme; q<HTMLSelectElement>('shaderPack').value = s.shaderPack
    q<HTMLElement>('looknote').textContent = `${themeById(s.uiTheme).note} ${packById(s.shaderPack).note}`
    q<HTMLSelectElement>('lens').value = s.lens; q<HTMLInputElement>('hue').value = String(s.hue)
    q<HTMLSelectElement>('lens').disabled = !lu; q<HTMLInputElement>('hue').disabled = !lu
    q<HTMLElement>('lensnote').textContent = lu ? '' : '(win a match to unlok)'
    q<HTMLDivElement>('blurb').textContent = DIFFICULTIES[s.difficulty]?.blurb ?? ''
  }
  const num = (k: string) => Number((q<HTMLSelectElement>(k)).value)
  const onSel = (k: string, fn: () => void) => { q<HTMLSelectElement>(k).onchange = () => { fn(); (q<HTMLElement>(k)).blur(); sync() } }
  onSel('difficulty', () => d.set({ difficulty: q<HTMLSelectElement>('difficulty').value }, true))
  onSel('mode', () => d.set({ mode: q<HTMLSelectElement>('mode').value }, true))
  onSel('arenas', () => d.set({ arenas: num('arenas') }, true))
  onSel('target', () => d.set({ target: num('target') }, true))
  onSel('timeLimit', () => d.set({ timeLimit: num('timeLimit') }, true))
  onSel('fallSound', () => d.set({ fallSound: q<HTMLSelectElement>('fallSound').value as Settings['fallSound'] }, false))
  q<HTMLInputElement>('windVents').onchange = () => { d.set({ windVents: q<HTMLInputElement>('windVents').checked }, true); sync() }
  onSel('fog', () => d.set({ fog: q<HTMLSelectElement>('fog').value as Settings['fog'] }, false))
  onSel('buttons', () => d.set({ buttons: q<HTMLSelectElement>('buttons').value as Settings['buttons'] }, false))
  q<HTMLButtonElement>('keys').onclick = () => d.openControls?.()
  q<HTMLSelectElement>('lang').value = l10n.locale
  q<HTMLSelectElement>('lang').onchange = () => {
    const code = q<HTMLSelectElement>('lang').value
    void l10n.setLocale(code).then(active => {
      if (active === code) chooseLanguage(code)
      else { q<HTMLSelectElement>('lang').value = l10n.locale; q<HTMLElement>('langnote').textContent = t('settings.languageUnavailable') }
    })
  }
  onSel('uiTheme', () => d.set({ uiTheme: q<HTMLSelectElement>('uiTheme').value }, false))
  onSel('shaderPack', () => d.set({ shaderPack: q<HTMLSelectElement>('shaderPack').value }, false))
  onSel('lens', () => d.set({ lens: q<HTMLSelectElement>('lens').value }, false))
  q<HTMLInputElement>('hue').oninput = () => d.set({ hue: Number(q<HTMLInputElement>('hue').value) }, false)
  q<HTMLInputElement>('vol').oninput = () => d.audio.setVolume(Number(q<HTMLInputElement>('vol').value) / 100)
  q<HTMLInputElement>('sfx').oninput = () => d.audio.setBus('sfx', Number(q<HTMLInputElement>('sfx').value) / 100)
  q<HTMLInputElement>('mus').oninput = () => d.audio.setBus('mus', Number(q<HTMLInputElement>('mus').value) / 100)
  q<HTMLInputElement>('amb').oninput = () => d.audio.setBus('amb', Number(q<HTMLInputElement>('amb').value) / 100)
  q<HTMLInputElement>('mute').onchange = () => d.audio.setMuted(q<HTMLInputElement>('mute').checked)
  q<HTMLInputElement>('flux').onchange = () => d.set({ flux: q<HTMLInputElement>('flux').checked }, true)
  for (const k of ['reduceMotion', 'hints', 'gauge', 'metronome', 'classicEyes', 'companion', 'floaters', 'arenaNames', 'gameHud', 'leftHanded', 'trackUsage'] as const) q<HTMLInputElement>(k).onchange = () => d.set({ [k]: q<HTMLInputElement>(k).checked } as Partial<Settings>, false)
  q<HTMLButtonElement>('reset').onclick = () => { d.reset(); d.audio.setVolume(0.7); d.audio.setBus('sfx', 1); d.audio.setBus('amb', 0.8); d.audio.setBus('mus', 0.6); d.audio.setMuted(false); sync() }
  q<HTMLButtonElement>('resetmenu').onclick = () => { d.onResetProgress?.(); sync() }
  q<HTMLButtonElement>('close').onclick = () => setOpen(false)
  btn.onclick = () => setOpen(!open)
  for (const e of [panel, btn, help]) e.addEventListener('pointerdown', ev => ev.stopPropagation())
  panel.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Escape') setOpen(false) })
  d.host.style.position ||= 'relative'
  d.host.appendChild(help); d.host.appendChild(btn); d.host.appendChild(panel)
  sync()
  return { sync, isOpen: () => open, open: () => setOpen(true), close: () => setOpen(false), destroy() { window.removeEventListener('keydown', onEsc, true); btn.remove(); help.remove(); panel.remove() } }
}

export { defaultSettings }
