import { createFallingVenue, loadVenueBackdrop, saveVenueBackdrop, type VenueKind } from './fallingVenue'
import { loadPainterSelection } from './pongPainter'

const VENUES: { kind: VenueKind; name: string; note: string; state: string }[] = [
  { kind: 'paint-counter', name: 'PongPainter', note: 'Try paint on a live rally before changing your look.', state: 'OPEN' },
  { kind: 'lok-market', name: 'LOK Shop Arena', note: 'A larger falling market for future LOK shop shelves.', state: 'VENUE CONCEPT' },
  { kind: 'eye-atelier', name: 'Eye Atelier', note: 'A close arena for future eyes, lids, and gaze styles.', state: 'VENUE CONCEPT' },
  { kind: 'arena-yard', name: 'Arena Yard', note: 'Compare future frames while satellite arenas drift by.', state: 'VENUE CONCEPT' },
  { kind: 'records', name: 'Shaft Records', note: 'Your completed falls and overtime history.', state: 'OPEN' },
  { kind: 'replay-archive', name: 'Replay Archive', note: 'An observation deck for future playback controls.', state: 'VENUE CONCEPT' },
]

/** Browse live venue treatments without exposing unfinished catalogs or purchase actions. */
export function createVenueGallery(host: HTMLElement, onPainter: () => void, onStats: () => void, painterAvailable = true) {
  const returnFocus = document.activeElement as HTMLElement | null
  const root = document.createElement('section'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Shaft venues')
  root.style.cssText = 'position:fixed;inset:0;z-index:75;overflow:auto;box-sizing:border-box;padding:clamp(16px,3vw,34px);background:#040810;color:#eaf4ff;font:14px/1.5 system-ui'
  const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;z-index:1;max-width:1050px;margin:auto'
  const back = document.createElement('button'); back.type = 'button'; back.textContent = '← BACK TO THE FALL'; back.style.cssText = 'padding:10px 14px;border:1px solid #6a8bab;border-radius:8px;background:#101d2a;color:#eaf4ff;font:800 11px ui-monospace,monospace;cursor:pointer'
  const title = document.createElement('h1'); title.textContent = 'SHAFT VENUES'; title.style.cssText = 'margin:20px 0 5px;font:900 clamp(30px,6vw,56px) system-ui;letter-spacing:.1em;text-shadow:0 3px 15px #000'
  const lead = document.createElement('p'); lead.textContent = 'Shops and records live in falling arenas. Explore their spaces; only open venues contain usable features.'; lead.style.cssText = 'max-width:65ch;color:#d5e5f5;margin:0 0 20px;text-shadow:0 2px 10px #000'
  const layout = document.createElement('div'); layout.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,370px),1fr));gap:18px'
  const scene = document.createElement('div'); scene.setAttribute('aria-label', 'Live arena view'); scene.style.cssText = 'position:relative;height:clamp(290px,45vw,470px);min-width:0;overflow:hidden;border:1px solid #7cc5d488;border-radius:14px;box-shadow:inset 0 0 40px #0008;pointer-events:none'
  const info = document.createElement('section'); info.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-width:0;padding:18px;border:1px solid #6587a5;border-radius:14px;background:#081422e6;box-shadow:0 12px 40px #0009'
  const name = document.createElement('h2'); name.style.cssText = 'margin:0;font:800 24px system-ui'
  const note = document.createElement('p'); note.style.cssText = 'margin:0;color:#bdd0e3'
  const state = document.createElement('strong'); state.style.cssText = 'color:#ffe08a;font:800 10px ui-monospace,monospace;letter-spacing:.15em'
  const cameraControls = document.createElement('div'); cameraControls.setAttribute('role', 'group'); cameraControls.setAttribute('aria-label', 'Live arena zoom'); cameraControls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px'
  let view: 'personal' | 'shaft' = 'personal'
  const cameraButtons = (['personal', 'shaft'] as const).map(next => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = next === 'personal' ? 'PERSONAL ARENA' : 'FULL SHAFT'
    button.style.cssText = 'padding:8px 10px;border:1px solid #5c879a;border-radius:7px;background:#0c2632;color:#e4fbff;font:800 10px ui-monospace,monospace;cursor:pointer'
    button.onclick = () => { view = next; venue?.setView(next); cameraButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button))) }
    cameraControls.append(button); return button
  })
  let backdropOn = loadVenueBackdrop('shaft-venues')
  const backdropToggle = document.createElement('button'); backdropToggle.type = 'button'
  backdropToggle.style.cssText = 'padding:8px 10px;border:1px solid #a9d4ff;border-radius:7px;background:#18334b;color:#eaf6ff;font:800 10px ui-monospace,monospace;cursor:pointer'
  const syncBackdropToggle = () => { backdropToggle.textContent = backdropOn ? '◉ VENUE BACKDROP ON' : '◯ VENUE BACKDROP OFF'; backdropToggle.setAttribute('aria-pressed', String(backdropOn)); backdropToggle.setAttribute('aria-label', `${backdropOn ? 'Hide' : 'Show'} the Shaft Venues background match`); backdropToggle.title = 'The venue viewfinder keeps playing.'; backdropToggle.style.opacity = backdropOn ? '1' : '.78' }
  backdropToggle.onclick = () => { backdropOn = !backdropOn; venue?.setBackdropEnabled(backdropOn); saveVenueBackdrop('shaft-venues', backdropOn); syncBackdropToggle() }
  syncBackdropToggle(); cameraControls.append(backdropToggle)
  const cards = document.createElement('div'); cards.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px'
  const actions = document.createElement('div')
  info.append(name, state, note, cameraControls, actions, cards); layout.append(scene, info); wrap.append(back, title, lead, layout); root.append(wrap); host.append(root)
  let active: VenueKind = 'paint-counter'
  let venue: ReturnType<typeof createFallingVenue> | null = null
  const action = (label: string, run: () => void) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label
    button.style.cssText = 'padding:11px 15px;border:1px solid #8cece6;border-radius:8px;background:#14313c;color:#edffff;font:800 11px ui-monospace,monospace;cursor:pointer'
    button.onclick = run; actions.append(button)
  }
  const show = (kind: VenueKind) => {
    active = kind
    const current = VENUES.find(item => item.kind === active)!
    venue?.destroy(); venue = createFallingVenue(active, loadPainterSelection()); venue.fillScreen(); venue.attachViewport(scene); view = kind === 'arena-yard' || kind === 'lok-market' || kind === 'records' ? 'shaft' : 'personal'; venue.setView(view); root.prepend(venue.element); venue.setBackdropEnabled(backdropOn)
    cameraButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(view === (index === 0 ? 'personal' : 'shaft'))))
    name.textContent = current.name; note.textContent = current.note; state.textContent = kind === 'paint-counter' && !painterAvailable ? 'UNLOCKS AFTER FIRST FALL' : current.state
    actions.replaceChildren()
    if (kind === 'paint-counter' && painterAvailable) action('ENTER PONGPAINTER →', () => { destroy(); onPainter() })
    if (kind === 'records') action('VIEW YOUR STATS →', () => { destroy(); onStats() })
    cards.querySelectorAll('button').forEach(button => { const selected = button.getAttribute('data-kind') === active; button.setAttribute('aria-pressed', String(selected)); button.style.borderColor = selected ? '#8cece6' : '#49637d'; button.style.background = selected ? '#183a4b' : '#0d1a29' })
  }
  for (const item of VENUES) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.kind = item.kind
    button.innerHTML = `<strong style="display:block">${item.name}</strong><small style="color:#a9c4db">${item.kind === 'paint-counter' && !painterAvailable ? 'FIRST FALL TO UNLOCK' : item.state}</small>`
    button.style.cssText = 'min-height:65px;padding:9px;border:1px solid #49637d;border-radius:8px;background:#0d1a29;color:#e9f6ff;text-align:left;cursor:pointer'
    button.onclick = () => show(item.kind); cards.append(button)
  }
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); destroy(); return }
    if (event.key !== 'Tab') return
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
  }
  root.addEventListener('keydown', key)
  back.onclick = () => destroy()
  const destroy = () => { venue?.destroy(); root.remove(); if (returnFocus?.isConnected) returnFocus.focus() }
  show(active); back.focus()
  return destroy
}
