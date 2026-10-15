import { localHistory, type HistoryEntry } from './cloudSync'
import { createFallingVenue } from './fallingVenue'
import { loadPainterSelection } from './pongPainter'

type Profile = 'p1' | 'p2' | 'account'
const LABELS: Record<Profile, string> = { p1: 'Local P1', p2: 'Local P2', account: 'LOK account' }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function entriesFor(profile: Profile): HistoryEntry[] {
  return localHistory().filter(e => {
    const owner = e.details?.profile ?? 'p1'
    return profile === 'account' ? owner === 'account' || owner === 'p1' : owner === profile
  })
}

export function createStatsPage(host: HTMLElement) {
  const root = document.createElement('section')
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'pf-stats-title')
  root.style.cssText = 'position:fixed;inset:0;z-index:80;display:none;overflow:auto;padding:24px 14px;background:#03060b;color:#e5f1ff;font:14px/1.5 system-ui;box-sizing:border-box'
  const card = document.createElement('div')
  card.style.cssText = 'position:relative;z-index:1;width:min(720px,100%);margin:4vh auto;padding:20px;border:1px solid #6a8baa;border-radius:14px;background:linear-gradient(145deg,#121d2be8,#090e16e8);box-shadow:0 18px 70px #000'
  root.append(card); host.append(root)
  let profile: Profile = 'p1'
  let returnFocus: HTMLElement | null = null
  let venue: ReturnType<typeof createFallingVenue> | null = null
  const render = () => {
    const records = entriesFor(profile)
    const wins = records.filter(e => e.won)
    const losses = records.filter(e => !e.won)
    const count = (f: (e: HistoryEntry) => boolean) => records.filter(f).length
    const detail = (e: HistoryEntry) => e.details
    const ownCracks = (e: HistoryEntry) => detail(e)?.ownCracks ?? 0
    const intact = (e: HistoryEntry) => !detail(e)?.ownGlassBroken
    const flawless = wins.filter(e => e.opponent_score === 0 && intact(e)).length
    const usageOpen = records.length >= 5
    const trackUsage = (() => { try { return JSON.parse(localStorage.getItem('pongfall.settings') ?? '{}')?.trackUsage !== false } catch { return true } })()
    const total = (key: 'tearsCollected' | 'opponentGlassBreaks' | 'powerBalls' | 'paddleSwipes' | 'heatSwipes' | 'breezeSwipes' | 'satelliteSaved' | 'satelliteFallen') => records.reduce((n, e) => n + (detail(e)?.[key] ?? 0), 0)
    const row = (label: string, value: number | string) => `<div style="display:flex;justify-content:space-between;gap:18px;padding:8px 2px;border-bottom:1px solid #27364a"><span style="color:#bac9db">${label}</span><strong>${value}</strong></div>`
    card.innerHTML = `<header style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="color:#4aa8ff;font-size:11px;letter-spacing:.2em">SHAFT RECORDS</div><h1 id="pf-stats-title" style="margin:4px 0;font-size:clamp(24px,5vw,34px)">Player Stats</h1></div><button data-close type="button" aria-label="Close stats" style="padding:8px 12px;border:1px solid #52657d;border-radius:7px;background:#111a27;color:#e5f1ff;font-size:20px">×</button></header>
      <nav aria-label="Choose player record" style="display:flex;flex-wrap:wrap;gap:8px;margin:18px 0">${(['p1','p2','account'] as Profile[]).map(p => `<button type="button" data-profile="${p}" aria-pressed="${profile === p}" style="padding:8px 12px;border:1px solid ${profile === p ? '#ffe08a' : '#3c4c61'};border-radius:8px;background:${profile === p ? '#253044' : '#101722'};color:#e5f1ff">${LABELS[p]}</button>`).join('')}</nav>
      <p style="color:#93a7bd;margin:0 0 12px">${esc(LABELS[profile])} · ${records.length} completed ${records.length === 1 ? 'fall' : 'falls'}</p>
      <div>${row('Wins · Saved!', wins.length)}${row('Losses · Fallen!', losses.length)}${row('Experimental falls · unranked', count(e => !!detail(e)?.experimental))}${row('Satellite arenas · Saved!', total('satelliteSaved'))}${row('Satellite arenas · Fallen!', total('satelliteFallen'))}${row('At What Cost? attempts', count(e => !!detail(e)?.overtime))}${row('Overtime wins', count(e => !!detail(e)?.overtime && e.won))}${row('Overtime losses', count(e => !!detail(e)?.overtime && !e.won))}${row('Flawless wins · opponent scored 0, own glass intact', flawless)}${row('Wins with glass intact', wins.filter(intact).length)}${[0,1,2,3].map(n => row(`Wins with exactly ${n} glass cracks`, wins.filter(e => ownCracks(e) === n).length)).join('')}${row('Opponent arenas broken', total('opponentGlassBreaks'))}${row('Tears collected', total('tearsCollected'))}</div>
      <section style="margin-top:18px;padding-top:14px;border-top:1px solid #3b4b60"><h2 style="margin:0 0 6px;font-size:17px">Usage</h2>${usageOpen ? trackUsage ? `<div>${row('Power Balls · powered arm hits', total('powerBalls'))}${row('Paddle swipes', total('paddleSwipes'))}${row('Upward heat swipes', total('heatSwipes'))}${row('Downward breeze swipes', total('breezeSwipes'))}</div>` : '<p style="color:#bdc8d7">Usage tracking is off in Settings. Saved totals are kept; new actions are not counted.</p>' : `<p style="color:#bdc8d7">Complete ${5 - records.length} more ${5 - records.length === 1 ? 'fall' : 'falls'} to open action-use stats.</p>`}</section>
      <p style="color:#8193a8;font-size:12px;margin:16px 0 0">Records are unranked. They grant no LokTokens.</p>`
    card.querySelector<HTMLButtonElement>('[data-close]')!.onclick = close
    card.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach(b => b.onclick = () => { profile = b.dataset.profile as Profile; render(); card.querySelector<HTMLButtonElement>(`[data-profile="${profile}"]`)?.focus() })
  }
  function close() { root.style.display = 'none'; venue?.destroy(); venue = null; returnFocus?.focus(); returnFocus = null }
  function onKey(e: KeyboardEvent) {
    if (root.style.display === 'none') return
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'Tab') {
      const items = Array.from(card.querySelectorAll<HTMLElement>('button:not([disabled])'))
      const first = items[0], last = items.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
  }
  root.addEventListener('keydown', onKey)
  return {
    show(from?: HTMLElement) { profile = 'p1'; returnFocus = from ?? document.activeElement as HTMLElement; venue = createFallingVenue('records', loadPainterSelection()); venue.fillScreen(); venue.setView('shaft'); root.prepend(venue.element); render(); root.style.display = 'block'; card.querySelector<HTMLButtonElement>('[data-close]')?.focus() },
    destroy() { venue?.destroy(); root.removeEventListener('keydown', onKey); root.remove() },
  }
}
