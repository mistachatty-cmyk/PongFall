const BTN = 'padding:10px 26px;border-radius:10px;border:2px solid #2a3446;background:rgba(16,21,31,.92);color:#cfe3ff;font:600 16px system-ui;cursor:pointer'

/** The two choices after a match: try again, or go back to the main menu (when it is open). */
export function createEndScreen(host: HTMLElement, d: { onRetry(): void; onMenu(): void; menuAvailable(): boolean }) {
  const row = document.createElement('div')
  row.setAttribute('data-pf', 'end-screen')
  row.style.cssText = 'position:absolute;left:0;right:0;bottom:14%;display:none;gap:14px;justify-content:center;z-index:12;font-family:system-ui'
  const retry = document.createElement('button'); retry.textContent = 'Retry'; retry.style.cssText = BTN + ';border-color:#8affc1;color:#d8ffe9'
  const menu = document.createElement('button'); menu.textContent = 'Main menu'; menu.style.cssText = BTN
  retry.onclick = () => d.onRetry(); menu.onclick = () => d.onMenu()
  row.append(retry, menu)
  row.addEventListener('pointerdown', e => e.stopPropagation())
  host.appendChild(row)
  return {
    show() { menu.style.display = d.menuAvailable() ? '' : 'none'; row.style.display = 'flex' },
    hide() { row.style.display = 'none' },
    isOpen: () => row.style.display !== 'none',
    destroy() { row.remove() },
  }
}
