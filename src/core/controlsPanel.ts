import { ACTIONS, ACTION_LABELS, DEFAULT_KEYS, ActionId, KeyMap, keyLabel, rebind } from './controls'

export interface ControlsPanelDeps {
  host: HTMLElement
  get(): KeyMap
  set(keys: KeyMap): void
  onOpen(): void
  onClose(): void
}
export interface ControlsPanel { toggle(): void; isOpen(): boolean; close(): void; destroy(): void }

const SEL = 'background:#101722;color:#cfe3ff;border:1px solid #2a3446;border-radius:6px;padding:4px 10px;font:13px system-ui;cursor:pointer;min-width:74px'
const ROW = 'display:flex;justify-content:space-between;align-items:center;gap:10px;margin:6px 0'

/** The keyboard switcher: press C (or the keyboard button) to open, click a key, press the new one. */
export function createControlsPanel(d: ControlsPanelDeps): ControlsPanel {
  const btn = document.createElement('button')
  btn.textContent = '⌨'; btn.setAttribute('aria-label', 'Keyboard controls (C)'); btn.setAttribute('data-pf', 'controls'); btn.title = 'Keyboard controls (C)'
  btn.style.cssText = 'position:absolute;right:100px;top:56px;width:36px;height:36px;border-radius:8px;border:1px solid #2a3446;background:rgba(16,21,31,.85);color:#cfe3ff;font-size:18px;cursor:pointer;z-index:6'
  const panel = document.createElement('div')
  panel.setAttribute('data-pf', 'controls-panel')
  panel.style.cssText = 'position:absolute;right:12px;top:98px;width:300px;max-height:calc(100% - 130px);overflow:auto;padding:12px 14px;border-radius:10px;border:1px solid #2a3446;background:rgba(12,16,24,.96);color:#cfe3ff;font:13px system-ui;display:none;z-index:7'
  let open = false
  let listening: ActionId | null = null
  let note = ''
  const group = (title: string, ids: readonly ActionId[], keys: KeyMap) => `<div style="margin:12px 0 4px;color:#7f8da3;font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase">${title}</div>` +
    ids.map(a => `<div style="${ROW}"><span>${ACTION_LABELS[a]}</span><button data-a="${a}" style="${SEL}${listening === a ? ';border-color:#ffe08a;color:#ffe08a' : ''}">${listening === a ? 'press a key…' : keyLabel(keys[a])}</button></div>`).join('')
  function render() {
    const keys = d.get()
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Keyboard</b><button data-k="close" style="background:none;border:0;color:#7f8da3;font-size:18px;cursor:pointer" aria-label="Close">✕</button></div>
      <div style="color:#7f8da3;margin-top:4px">Click a key, then press its new key. Binding a key that is already used swaps the two. C, Z, R, M, P, Esc and the arrow keys are fixed.</div>
      ${group('Player 1', ACTIONS.filter(a => a.startsWith('p1')), keys)}
      ${group('Player 2 (versus modes)', ACTIONS.filter(a => a.startsWith('p2')), keys)}
      <div data-k="note" style="min-height:16px;margin:8px 0 0;color:#ffb0a0">${note}</div>
      <div style="margin-top:8px"><button data-k="reset" style="${SEL}">Reset keys</button></div>`
    panel.querySelectorAll<HTMLButtonElement>('button[data-a]').forEach(b => { b.onclick = () => { listening = b.dataset.a as ActionId; note = ''; render() } })
    ;(panel.querySelector('[data-k="close"]') as HTMLElement).onclick = () => setOpen(false)
    ;(panel.querySelector('[data-k="reset"]') as HTMLElement).onclick = () => { d.set({ ...DEFAULT_KEYS }); listening = null; note = ''; render() }
  }
  const onKey = (e: KeyboardEvent) => {
    if (!open) return
    e.stopPropagation()
    if (!listening) { if (e.key === 'Escape' || e.key.toLowerCase() === 'c') { e.preventDefault(); setOpen(false) } return }
    e.preventDefault()
    if (e.key === 'Escape') { listening = null; render(); return }
    const next = rebind(d.get(), listening, e.key)
    if (!next) note = `${keyLabel(e.key)} can't be used (it has a fixed job).`
    else { d.set(next); note = ''; listening = null }
    render()
  }
  window.addEventListener('keydown', onKey, true)   // capture: runs before the game's own key handler while the panel is open
  function setOpen(o: boolean) { if (o === open) return; open = o; listening = null; note = ''; panel.style.display = o ? 'block' : 'none'; if (o) { render(); d.onOpen() } else d.onClose() }
  btn.onclick = () => setOpen(!open)
  for (const e of [panel, btn]) e.addEventListener('pointerdown', ev => ev.stopPropagation())
  d.host.style.position ||= 'relative'
  d.host.appendChild(btn); d.host.appendChild(panel)
  return { toggle: () => setOpen(!open), isOpen: () => open, close: () => setOpen(false), destroy() { window.removeEventListener('keydown', onKey, true); btn.remove(); panel.remove() } }
}
