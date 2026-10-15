import type { GameResult } from '../sim/result'

const BTN = 'padding:12px 20px;border-radius:10px;border:2px solid #6d829d;background:#172230;color:#f0f6ff;font:700 15px system-ui;cursor:pointer;min-height:50px;touch-action:manipulation'

/** Score-win decision and a consistent outro for every finished match. */
export function createEndScreen(host: HTMLElement, d: { onRetry(): void; onMenu(): void; onSaveReplay?(): void; onTakeWin?(): void; onOvertime?(): void; menuAvailable(): boolean; online?: boolean }) {
  const cover = document.createElement('div')
  cover.dataset.pf = 'end-cover'
  cover.style.cssText = 'position:absolute;inset:0;z-index:40;display:none;place-items:center;box-sizing:border-box;padding:16px;background:rgba(2,7,15,.72);pointer-events:auto'
  const panel = document.createElement('section')
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true')
  panel.style.cssText = 'box-sizing:border-box;width:min(100%,600px);max-height:100%;overflow:auto;padding:clamp(20px,4vw,34px);border:1px solid #8da3bd;border-radius:18px;background:#0b1421;box-shadow:0 24px 80px #000c;color:#eef5ff;font-family:system-ui;text-align:center'
  const kicker = document.createElement('div'); kicker.style.cssText = 'color:#ffe08a;font:700 11px system-ui;letter-spacing:.2em;text-transform:uppercase'
  const title = document.createElement('h2'); title.id = 'pf-outro-title'; title.style.cssText = 'margin:11px 0 8px;font:800 clamp(25px,5vw,38px) system-ui'
  const copy = document.createElement('p'); copy.id = 'pf-outro-copy'; copy.style.cssText = 'margin:0 auto 20px;max-width:49ch;color:#bdcde1;font:14px/1.55 system-ui'
  const recap = document.createElement('div'); recap.dataset.pf = 'run-recap'; recap.style.cssText = 'display:none;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 auto 20px;color:#d8e8fb;font:700 12px ui-monospace,monospace'
  panel.setAttribute('aria-labelledby', title.id); panel.setAttribute('aria-describedby', copy.id)
  const actions = document.createElement('div'); actions.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px'
  const button = (label: string, color: string, action: () => void) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = label
    el.style.cssText = BTN + `;border-color:${color};min-width:min(100%,220px)`
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); action() })
    return el
  }
  let choosing = false
  let escapeAction: (() => void) | null = null
  const take = button('BANK THE WIN', '#8affc1', () => choose('win'))
  const overtime = button('START OVERTIME · FIRST TO 6', '#ff9a86', () => choose('overtime'))
  const retry = button('PLAY AGAIN', '#8affc1', () => d.onRetry())
  const menu = button('MAIN MENU', '#8da3bd', () => d.onMenu())
  const save = button('SAVE REPLAY', '#8da3bd', () => d.onSaveReplay?.())
  const cancel = button('CANCEL · MAIN MENU', '#8da3bd', () => d.onMenu())
  function choose(action: 'win' | 'overtime') {
    if (choosing || cover.style.display === 'none') return
    choosing = true; take.disabled = true; overtime.disabled = true
    if (action === 'win') d.onTakeWin?.(); else d.onOvertime?.()
  }
  panel.append(kicker, title, copy, recap, actions); cover.append(panel); host.appendChild(cover)
  cover.addEventListener('pointerdown', e => e.stopPropagation())
  cover.addEventListener('keydown', e => {
    if (e.key === 'Escape' && escapeAction) { e.preventDefault(); escapeAction(); return }
    if (e.key !== 'Tab') return
    const buttons = Array.from(actions.querySelectorAll('button')).filter(b => b.style.display !== 'none')
    if (!buttons.length) return
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.shiftKey && at <= 0) { e.preventDefault(); buttons[buttons.length - 1]?.focus() }
    if (!e.shiftKey && at === buttons.length - 1) { e.preventDefault(); buttons[0]?.focus() }
  })
  const open = () => { cover.style.display = 'grid' }
  return {
    show(result: GameResult | null = null) {
      escapeAction = null
      choosing = false; kicker.textContent = result?.overtime ? 'OVERTIME COMPLETE' : 'RUN COMPLETE'
      title.textContent = result?.winner === -1 ? 'A DRAW IN THE FALL' : result?.won ? result.overtime ? 'YOU HELD THE ARENA' : 'YOU WON THE FALL' : result?.overtime ? 'THE WIN SLIPPED AWAY' : 'THE FALL CONTINUES'
      const score = result ? `${result.points[0]}–${result.points[1]}. ` : ''
      copy.textContent = score + (result?.overtime ? result.won ? 'You risked the win and survived overtime.' : 'Overtime went to the other side. Start a fresh run when you are ready.' : result?.won ? 'The result is yours. Take another fall or return to the menu.' : result?.winner === -1 ? 'Neither side took the match. Try another run or choose a new mode.' : 'Every fall teaches a new angle. Try again or choose a new mode.')
      recap.style.display = result ? 'flex' : 'none'
      if (result) {
        const stat = (label: string, value: number | string) => { const el = document.createElement('span'); el.textContent = `${label} ${value}`; el.style.cssText = 'padding:7px 9px;border:1px solid #425773;border-radius:7px;background:#142236'; return el }
        recap.replaceChildren(stat('POINTS', `${result.points[0]}–${result.points[1]}`), stat('TEARS', result.stats.tearsCollected[0]), stat('GLASS BREAKS', result.stats.glassBreaksCaused[0]))
      }
      retry.textContent = d.online ? 'REQUEST REMATCH' : 'PLAY AGAIN'
      actions.replaceChildren(retry, ...(d.onSaveReplay && !d.online ? [save] : []), menu); menu.style.display = d.menuAvailable() ? '' : 'none'; open(); retry.focus()
    },
    showDecision() {
      escapeAction = () => choose('win')
      choosing = false; take.disabled = false; overtime.disabled = false
      kicker.textContent = 'YOU SCORED THE WINNING POINT'; title.textContent = 'Win, but at what cost?'
      copy.textContent = 'Bank your victory now, or risk it in Power Mode overtime. First to 6 wins. If the other side scores 6 first, this win is gone.'
      recap.style.display = 'none'
      actions.replaceChildren(take, overtime); open(); take.focus()
    },
    showWaiting() {
      escapeAction = () => d.onMenu()
      kicker.textContent = 'REMATCH REQUESTED'; title.textContent = 'Waiting for the other player'
      copy.textContent = 'The rematch begins when both players accept. You can return to the menu at any time.'
      recap.style.display = 'none'; actions.replaceChildren(cancel); open(); cancel.focus()
    },
    showSandboxExit() {
      escapeAction = () => { cover.style.display = 'none' }
      kicker.textContent = 'SANDBOX'; title.textContent = 'Leave this run?'
      copy.textContent = 'Sandbox has no finish line. Leaving ends this free-play session and returns to the menu.'
      recap.style.display = 'none'
      const stay = button('KEEP PLAYING', '#8affc1', () => { cover.style.display = 'none' })
      actions.replaceChildren(stay, menu); open(); stay.focus()
    },
    hide() { cover.style.display = 'none'; choosing = false; escapeAction = null; take.disabled = false; overtime.disabled = false },
    isOpen: () => cover.style.display !== 'none',
    destroy() { cover.remove() },
  }
}
