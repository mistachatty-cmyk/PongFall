import type { GameResult } from '../sim/result'

const BTN = 'padding:12px 20px;border-radius:10px;border:2px solid #6d829d;background:#172230;color:#f0f6ff;font:700 15px system-ui;cursor:pointer;min-height:50px;touch-action:manipulation'

/** The words of the end-of-match panel, shared by the card (this file) and the world version (world/endWorld.ts). */
export function endWords(result: GameResult | null): { kicker: string; title: string; copy: string; recap: { label: string; value: string }[] } {
  const score = result ? `${result.points[0]}–${result.points[1]}. ` : ''
  return {
    kicker: result?.overtime ? 'OVERTIME COMPLETE' : 'RUN COMPLETE',
    title: result?.winner === -1 ? 'A DRAW IN THE FALL' : result?.won ? result.overtime ? 'YOU HELD THE ARENA' : result.endReason === 'grounded' ? 'YOU WON AND THE FALL STOPPED' : 'YOU WON... BUT AT WHAT COST?' : result?.overtime ? 'THE WIN SLIPPED AWAY' : 'THE FALL CONTINUES',
    copy: score + (result?.overtime ? result.won ? 'You risked the win and survived overtime.' : 'Overtime went to the other side. Start a fresh run when you are ready.' : result?.won ? (result.endReason === 'grounded' ? 'Your arena grew large enough to grind against the walls and stop the fall.' : 'You banked the win, but your arena never grew large enough to stop the fall. It keeps falling, out of sight.') : result?.winner === -1 ? 'Neither side took the match. Try another run or choose a new mode.' : 'Every fall teaches a new angle. Try again or choose a new mode.'),
    recap: result ? [{ label: 'POINTS', value: `${result.points[0]}–${result.points[1]}` }, { label: 'TEARS', value: String(result.stats.tearsCollected[0]) }, { label: 'GLASS BREAKS', value: String(result.stats.glassBreaksCaused[0]) }] : [],
  }
}

/** Score-win decision and a consistent outro for every finished match. */
export function createEndScreen(host: HTMLElement, d: { onRetry(): void; onMenu(): void; onSaveReplay?(): void; onTakeWin?(): void; onOvertime?(): void; menuAvailable(): boolean; online?: boolean; reducedMotion?(): boolean }) {
  const style = document.createElement('style')
  style.textContent = `
    .pf-end-decision{background:rgba(2,7,15,.48)!important}
    .pf-end-decision .pf-end-panel{background:linear-gradient(160deg,#0a1525eb,#07111bdc)!important;backdrop-filter:blur(5px);border-color:#bed3e282!important}
    .pf-end-decision .pf-end-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;gap:14px!important}
    .pf-end-choice{--choice:#8affc1;position:relative;min-width:0!important;min-height:148px!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:18px 12px!important;overflow:hidden;border-color:var(--choice)!important;background:linear-gradient(165deg,#142437ed,#09121fed)!important;box-shadow:inset 0 0 18px color-mix(in srgb,var(--choice) 12%,transparent),0 0 24px color-mix(in srgb,var(--choice) 18%,transparent);transition:background .24s,border-color .24s,box-shadow .24s,filter .24s}
    .pf-end-choice[data-choice=cost]{--choice:#ff9a86}
    .pf-end-decision .pf-end-choice{animation:pf-choice-fall .68s cubic-bezier(.22,.9,.25,1.12) both}
    .pf-end-decision .pf-end-choice[data-choice=cost]{animation-delay:.24s}
    .pf-end-choice strong{display:block;color:#f7fbff;font:900 clamp(27px,4.4vw,42px)/1 system-ui;letter-spacing:.08em;text-shadow:0 0 16px var(--choice),0 0 34px color-mix(in srgb,var(--choice) 45%,transparent);transition:color .26s,text-shadow .26s,transform .26s}
    .pf-end-choice small{color:#c9d7e7;font:800 10px/1.35 ui-monospace,monospace;letter-spacing:.16em;transition:color .26s}
    .pf-end-choice:hover,.pf-end-choice:focus-visible{background:linear-gradient(165deg,#1c3446,#10202e)!important;box-shadow:inset 0 0 34px color-mix(in srgb,var(--choice) 24%,transparent),0 0 34px color-mix(in srgb,var(--choice) 55%,transparent);outline:2px solid var(--choice);outline-offset:3px}
    .pf-end-choice:hover strong,.pf-end-choice:focus-visible strong,.pf-end-choice.is-selected strong{color:var(--choice);text-shadow:0 0 12px var(--choice),0 0 35px var(--choice);transform:scale(1.035)}
    .pf-end-choice:hover small,.pf-end-choice:focus-visible small{color:#fff}
    .pf-end-choice:disabled{cursor:default}.pf-end-choice:disabled:not(.is-selected){opacity:.58}
    .pf-end-choice.is-selected{animation:pf-choice-confirm .18s ease-out both!important;box-shadow:inset 0 0 48px color-mix(in srgb,var(--choice) 35%,transparent),0 0 45px var(--choice)}
    @keyframes pf-choice-fall{0%{opacity:0;transform:translateY(calc(-1 * min(40vh, 260px))) rotate(-4deg) scale(.94)}70%{opacity:1;transform:translateY(11px) rotate(1deg) scale(1.025)}86%{transform:translateY(-4px) rotate(-.35deg)}100%{opacity:1;transform:translateY(0) rotate(0) scale(1)}}
    @keyframes pf-choice-confirm{0%{transform:scale(1)}55%{transform:scale(.95)}100%{transform:scale(1.02)}}
    @media(max-width:520px){.pf-end-decision .pf-end-actions{grid-template-columns:1fr}.pf-end-choice{min-height:105px!important}}
    @media(prefers-reduced-motion:reduce){.pf-end-choice,.pf-end-choice.is-selected{animation:none!important;transition:none!important}.pf-end-choice strong,.pf-end-choice small{transition:none!important}}
    .pf-end-reduced .pf-end-choice,.pf-end-reduced .pf-end-choice.is-selected{animation:none!important;transition:none!important}
    .pf-end-reduced .pf-end-choice strong,.pf-end-reduced .pf-end-choice small{transition:none!important}
  `
  const cover = document.createElement('div')
  cover.dataset.pf = 'end-cover'
  cover.style.cssText = 'position:absolute;inset:0;z-index:40;display:none;place-items:center;box-sizing:border-box;padding:16px;background:rgba(2,7,15,.72);pointer-events:auto'
  const panel = document.createElement('section'); panel.className = 'pf-end-panel'; panel.tabIndex = -1
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true')
  panel.style.cssText = 'box-sizing:border-box;width:min(100%,600px);max-height:100%;overflow:auto;padding:clamp(20px,4vw,34px);border:1px solid #8da3bd;border-radius:18px;background:#0b1421;box-shadow:0 24px 80px #000c;color:#eef5ff;font-family:system-ui;text-align:center'
  const kicker = document.createElement('div'); kicker.style.cssText = 'color:#ffe08a;font:700 11px system-ui;letter-spacing:.2em;text-transform:uppercase'
  const title = document.createElement('h2'); title.id = 'pf-outro-title'; title.style.cssText = 'margin:11px 0 8px;font:800 clamp(25px,5vw,38px) system-ui'
  const copy = document.createElement('p'); copy.id = 'pf-outro-copy'; copy.style.cssText = 'margin:0 auto 20px;max-width:49ch;color:#bdcde1;font:14px/1.55 system-ui'
  const recap = document.createElement('div'); recap.dataset.pf = 'run-recap'; recap.style.cssText = 'display:none;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 auto 20px;color:#d8e8fb;font:700 12px ui-monospace,monospace'
  panel.setAttribute('aria-labelledby', title.id); panel.setAttribute('aria-describedby', copy.id)
  const actions = document.createElement('div'); actions.className = 'pf-end-actions'; actions.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px'
  const button = (label: string, color: string, action: () => void) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = label
    el.style.cssText = BTN + `;border-color:${color};min-width:min(100%,220px)`
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); action() })
    return el
  }
  let choosing = false
  let choiceTimer = 0
  let escapeAction: (() => void) | null = null
  const take = button('WIN', '#8affc1', () => choose('win'))
  take.className = 'pf-end-choice'; take.dataset.choice = 'win'; take.setAttribute('aria-label', 'Win — bank the victory'); take.innerHTML = '<strong>WIN</strong><small>BANK THE VICTORY</small>'
  const overtime = button('AT WHAT COST?', '#ff9a86', () => choose('overtime'))
  overtime.className = 'pf-end-choice'; overtime.dataset.choice = 'cost'; overtime.setAttribute('aria-label', 'At What Cost? — start Power Mode overtime, first to six'); overtime.innerHTML = '<strong>AT WHAT COST?</strong><small>RISK IT · FIRST TO 6</small>'
  const retry = button('PLAY AGAIN', '#8affc1', () => d.onRetry())
  const menu = button('MAIN MENU', '#8da3bd', () => d.onMenu())
  const save = button('SAVE REPLAY', '#8da3bd', () => d.onSaveReplay?.())
  const cancel = button('CANCEL · MAIN MENU', '#8da3bd', () => d.onMenu())
  function choose(action: 'win' | 'overtime') {
    if (choosing || cover.style.display === 'none') return
    choosing = true; take.disabled = true; overtime.disabled = true; panel.setAttribute('aria-busy', 'true')
    const selected = action === 'win' ? take : overtime
    selected.classList.add('is-selected')
    const commit = () => { choiceTimer = 0; if (cover.style.display === 'none') return; if (action === 'win') d.onTakeWin?.(); else d.onOvertime?.() }
    if (d.reducedMotion?.() || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) commit()
    else choiceTimer = window.setTimeout(commit, 180)
  }
  const resetChoice = () => { window.clearTimeout(choiceTimer); choiceTimer = 0; choosing = false; take.disabled = false; overtime.disabled = false; take.classList.remove('is-selected'); overtime.classList.remove('is-selected'); panel.removeAttribute('aria-busy') }
  panel.append(kicker, title, copy, recap, actions); cover.append(panel); host.append(style, cover)
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
      resetChoice(); cover.classList.remove('pf-end-decision', 'pf-end-reduced')
      escapeAction = null
      const words = endWords(result)
      kicker.textContent = words.kicker; title.textContent = words.title; copy.textContent = words.copy
      recap.style.display = result ? 'flex' : 'none'
      if (result) {
        const stat = (label: string, value: number | string) => { const el = document.createElement('span'); el.textContent = `${label} ${value}`; el.style.cssText = 'padding:7px 9px;border:1px solid #425773;border-radius:7px;background:#142236'; return el }
        recap.replaceChildren(...words.recap.map(r => stat(r.label, r.value)))
      }
      retry.textContent = d.online ? 'REQUEST REMATCH' : 'PLAY AGAIN'
      actions.replaceChildren(retry, ...(d.onSaveReplay && !d.online ? [save] : []), menu); menu.style.display = d.menuAvailable() ? '' : 'none'; open(); retry.focus()
    },
    showDecision() {
      resetChoice(); cover.classList.remove('pf-end-decision')
      escapeAction = () => choose('win')
      kicker.textContent = 'YOU SCORED THE WINNING POINT'; title.textContent = 'THE CORD IS HOLDING'
      copy.textContent = 'Bank your victory now, or risk it in Power Mode overtime. First to 6 wins. If the other side scores 6 first, this win is gone.'
      recap.style.display = 'none'
      actions.replaceChildren(take, overtime)
      cover.classList.toggle('pf-end-reduced', !!d.reducedMotion?.())
      void actions.offsetWidth
      cover.classList.add('pf-end-decision'); open(); panel.focus()
    },
    showWaiting() {
      resetChoice(); cover.classList.remove('pf-end-decision', 'pf-end-reduced')
      escapeAction = () => d.onMenu()
      kicker.textContent = 'REMATCH REQUESTED'; title.textContent = 'Waiting for the other player'
      copy.textContent = 'The rematch begins when both players accept. You can return to the menu at any time.'
      recap.style.display = 'none'; actions.replaceChildren(cancel); open(); cancel.focus()
    },
    showSandboxExit() {
      resetChoice(); cover.classList.remove('pf-end-decision', 'pf-end-reduced')
      escapeAction = () => { cover.style.display = 'none' }
      kicker.textContent = 'SANDBOX'; title.textContent = 'Leave this run?'
      copy.textContent = 'Sandbox has no finish line. Leaving ends this free-play session and returns to the menu.'
      recap.style.display = 'none'
      const stay = button('KEEP PLAYING', '#8affc1', () => { cover.style.display = 'none' })
      actions.replaceChildren(stay, menu); open(); stay.focus()
    },
    hide() { cover.style.display = 'none'; resetChoice(); cover.classList.remove('pf-end-decision', 'pf-end-reduced'); escapeAction = null },
    isOpen: () => cover.style.display !== 'none',
    destroy() { resetChoice(); cover.remove(); style.remove() },
  }
}
