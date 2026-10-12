export interface PauseItem { label: string; run: () => void; hint?: string; href?: string; danger?: boolean }

const BTN = 'display:block;width:100%;margin:6px 0;padding:10px 14px;border-radius:10px;border:2px solid #2a3446;background:rgba(16,21,31,.9);color:#cfe3ff;font:600 15px system-ui;cursor:pointer;text-align:center;text-decoration:none;box-sizing:border-box'

/** The real pause menu: resume, restart, settings, keys, music, back to the main menu, and a way back to defaults. Items are rebuilt on every open so they stay current. */
export function createPauseMenu(host: HTMLElement) {
  const root = document.createElement('div')
  root.setAttribute('data-pf', 'pause-menu')
  root.style.cssText = 'position:absolute;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:rgba(5,8,12,.72);font-family:system-ui'
  const card = document.createElement('div')
  card.style.cssText = 'width:min(320px,86vw);padding:20px 22px;border-radius:14px;border:1px solid #2a3446;background:rgba(12,16,24,.97);color:#cfe3ff'
  root.appendChild(card)
  root.addEventListener('pointerdown', e => e.stopPropagation())
  host.appendChild(root)
  let shown = false
  return {
    isOpen: () => shown,
    show(items: PauseItem[], title = 'Paused', sub = 'P or Esc to resume', extra?: HTMLElement) {
      card.innerHTML = `<div style="font:700 28px system-ui;text-align:center">${title}</div><div style="color:#7f8da3;text-align:center;margin:2px 0 12px;font-size:13px">${sub}</div>`
      for (const it of items) {
        const el = document.createElement(it.href ? 'a' : 'button') as HTMLElement
        el.textContent = it.label; el.style.cssText = BTN + (it.danger ? ';border-color:#7a3a3a;color:#ffb0a0' : '')
        if (it.hint) el.title = it.hint
        if (it.href) { const a = el as HTMLAnchorElement; a.href = it.href; a.target = '_blank'; a.rel = 'noopener' }
        el.addEventListener('click', ev => { if (!it.href) ev.preventDefault(); it.run() })
        card.appendChild(el)
      }
      if (extra) card.appendChild(extra)
      root.style.display = 'flex'; shown = true
    },
    hide() { root.style.display = 'none'; shown = false },
    destroy() { root.remove() },
  }
}
