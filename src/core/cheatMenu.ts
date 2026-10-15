// The HelloWorld cheat menu (type it on the main menu). Local to this device: it never writes progress that syncs to a LOK account,
// and tears it adds are marked as cheat tears so they can be cleared again.
import { TearEyeWallet, loadTearEyeWallet, saveTearEyeWallet, sanitizeTearEyeWallet } from './tearEyeWallet'

export const CHEAT_SEQUENCE = 'helloworld'
export const CHEAT_STEPS = [10, 100, 1000] as const

/** Pure: add (or remove) tears, never below 0 or above the wallet cap. */
export function cheatTears(wallet: TearEyeWallet, delta: number): TearEyeWallet {
  const w = sanitizeTearEyeWallet(wallet)
  return sanitizeTearEyeWallet({ ...w, tears: Math.max(0, w.tears + Math.trunc(delta)) })
}
export const cheatReset = (wallet: TearEyeWallet): TearEyeWallet => sanitizeTearEyeWallet({ ...wallet, tears: 0, owned: [] })

export interface CheatCounters { falls: number; version: string; devMode: boolean }

/** Opens the dialog. `onChange` lets the menu refresh anything that shows the wallet. */
export function openCheatMenu(host: HTMLElement, counters: () => CheatCounters, toggleDev: () => void, onChange: () => void): () => void {
  const dlg = document.createElement('dialog')
  dlg.setAttribute('data-pf', 'cheat-menu')
  dlg.style.cssText = 'z-index:200;border:1px solid #ffe08a;border-radius:14px;background:#0b1421;color:#dfeaff;padding:18px 20px;width:min(92vw,380px);font:14px system-ui'
  const btn = 'padding:8px 12px;margin:3px;border-radius:8px;border:1px solid #425773;background:#142133;color:#dfeaff;cursor:pointer;font:700 13px system-ui'
  const render = () => {
    const w = loadTearEyeWallet(), c = counters()
    dlg.innerHTML = `<div style="font:800 18px system-ui;color:#ffe08a">HELLOWORLD</div>
      <div style="color:#8da3bd;margin:4px 0 12px;font-size:12px">Cheats for testing. Local to this device; nothing here syncs to your LOK account.</div>
      <div style="display:grid;gap:4px;margin-bottom:12px"><div>Tears: <b>${w.tears}</b> · Iris colors owned: <b>${w.owned.length}</b></div><div>Falls: <b>${c.falls}</b> · Version: <b>${c.version}</b></div><div>Dev mode (everything open): <b>${c.devMode ? 'on' : 'off'}</b></div></div>
      <div>${CHEAT_STEPS.map(n => `<button data-add="${n}" style="${btn}">+${n} tears</button>`).join('')}</div>
      <div><button data-dev style="${btn}">${c.devMode ? 'Turn dev mode off' : 'Turn dev mode on'}</button><button data-reset style="${btn};border-color:#7a3a3a">Clear tears and irises</button></div>
      <div style="margin-top:10px;text-align:right"><button data-close style="${btn}">Close</button></div>`
    dlg.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(b => { b.onclick = () => { saveTearEyeWallet(cheatTears(loadTearEyeWallet(), Number(b.dataset.add))); onChange(); render() } })
    ;(dlg.querySelector('[data-reset]') as HTMLElement).onclick = () => { saveTearEyeWallet(cheatReset(loadTearEyeWallet())); onChange(); render() }
    ;(dlg.querySelector('[data-dev]') as HTMLElement).onclick = () => { toggleDev(); render() }
    ;(dlg.querySelector('[data-close]') as HTMLElement).onclick = () => close()
  }
  const close = () => { try { dlg.close() } catch { /* already closed */ } dlg.remove() }
  dlg.addEventListener('close', () => dlg.remove())
  host.appendChild(dlg); render()
  try { dlg.showModal() } catch { dlg.setAttribute('open', '') }
  return close
}
