const BTN = 'padding:10px 26px;border-radius:10px;border:2px solid #2a3446;background:rgba(16,21,31,.92);color:#cfe3ff;font:600 16px system-ui;cursor:pointer'

/** Post-match actions, plus the first win-or-risk-it decision. */
export function createEndScreen(host: HTMLElement, d: { onRetry(): void; onMenu(): void; onTakeWin?(): void; onOvertime?(): void; menuAvailable(): boolean }) {
  const decision = document.createElement('section')
  decision.setAttribute('data-pf', 'win-decision'); decision.setAttribute('role', 'dialog'); decision.setAttribute('aria-modal', 'true'); decision.setAttribute('aria-labelledby', 'pf-cost-title'); decision.setAttribute('aria-describedby', 'pf-cost-copy')
  decision.style.cssText = 'position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);display:none;z-index:13;width:min(92vw,620px);padding:24px 26px;border:1px solid #8da3bd;border-radius:16px;background:rgba(10,16,25,.96);box-shadow:0 22px 70px #000b;color:#e9f2ff;font-family:system-ui;text-align:center;animation:pf-cost-bob 2.8s ease-in-out infinite'
  decision.innerHTML = '<div style="color:#ffe08a;font:700 11px system-ui;letter-spacing:.22em;text-transform:uppercase">The shaft keeps falling</div><h2 id="pf-cost-title" style="margin:10px 0 4px;font:800 clamp(25px,5vw,38px) system-ui">You win... but at what cost?</h2><p id="pf-cost-copy" style="margin:0 auto 18px;max-width:48ch;color:#b8c8dc;font:14px/1.55 system-ui">Take your win and fall forever, or risk it all in one more wave. Power Mode: first to 6. If the other side gets there first, your win is gone.</p><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px"></div>'
  const actions = decision.querySelector('div:last-child')!
  const take = document.createElement('button'); take.type = 'button'; take.textContent = '🏆 Take the win · fall forever'; take.style.cssText = BTN + ';border-color:#8affc1;color:#d8ffe9'
  const overtime = document.createElement('button'); overtime.type = 'button'; overtime.textContent = '⚡ At What Cost? · Power Mode'; overtime.style.cssText = BTN + ';border-color:#ff8a8a;color:#ffe2e2'
  take.onclick = () => d.onTakeWin?.(); overtime.onclick = () => d.onOvertime?.()
  decision.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); d.onTakeWin?.(); return }
    if (e.key === 'Tab') {
      e.preventDefault()
      const backwards = e.shiftKey
      if (backwards) (document.activeElement === take ? overtime : take).focus()
      else (document.activeElement === overtime ? take : overtime).focus()
    }
  })
  actions.append(take, overtime)
  decision.addEventListener('pointerdown', e => e.stopPropagation())
  const style = document.createElement('style'); style.textContent = '@keyframes pf-cost-bob{0%,100%{margin-top:0}50%{margin-top:-9px}}@media(prefers-reduced-motion:reduce){[data-pf="win-decision"]{animation:none!important}}'
  document.head.appendChild(style); host.appendChild(decision)
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
    show() { decision.style.display = 'none'; menu.style.display = d.menuAvailable() ? '' : 'none'; row.style.display = 'flex'; retry.focus() },
    showDecision() { row.style.display = 'none'; decision.style.display = 'block'; take.focus() },
    hide() { row.style.display = 'none'; decision.style.display = 'none' },
    isOpen: () => row.style.display !== 'none' || decision.style.display !== 'none',
    destroy() { row.remove(); decision.remove(); style.remove() },
  }
}
