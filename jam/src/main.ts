import { createPongFall } from './core/createPongFall'
import { createStandaloneHost } from './host/standaloneHost'
import { SETTINGS_KEY, ARENA_OPTIONS, arenasLabel, defaultSettings, sanitizeSettings } from './core/settings'
import { MODES } from './sim/data/modes'
import { DIFFICULTIES, DIFFICULTY_ORDER } from './sim/data/difficulty'

const q = new URLSearchParams(location.search)
const app = document.getElementById('app')!
const host = createStandaloneHost()
const menuStyle = document.createElement('style')
menuStyle.textContent = `
.jam-menu{position:fixed;inset:0;display:grid;place-items:center;overflow:auto;padding:24px 16px 84px;box-sizing:border-box;background:#0b0e14;color:#e9f2ff;font:15px system-ui,sans-serif}
.jam-menu *{box-sizing:border-box}.jam-card{width:min(760px,100%);padding:clamp(22px,5vw,46px);border:1px solid #344258;background:#10151f;text-align:center;box-shadow:0 18px 60px #0008}
.jam-card h1{margin:0;font-size:clamp(38px,9vw,76px);line-height:1;letter-spacing:.1em}.jam-card>p{margin:10px 0 26px;color:#9eb2cc;letter-spacing:.12em;text-transform:uppercase;font-size:12px}
.jam-group{margin:18px 0}.jam-label{margin-bottom:9px;color:#8fa1ba;font-size:11px;letter-spacing:.2em;text-transform:uppercase}.jam-options{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.jam-menu button{min-height:42px;border:1px solid #35445c;border-radius:7px;padding:8px 14px;background:#171f2d;color:#dce9fa;font:600 14px system-ui;cursor:pointer}
.jam-menu button[aria-pressed=true]{border-color:#8affc1;color:#d8ffe9;box-shadow:0 0 12px #8affc133}.jam-menu button:focus-visible{outline:3px solid #ffe08a;outline-offset:2px}
.jam-play{margin-top:14px!important;min-width:180px;border-color:#ffe08a!important;color:#fff2c4!important;font-size:20px!important}.jam-caption{min-height:1.4em;color:#b9c9dc;font-size:13px}
.jam-links{position:fixed;bottom:52px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap;width:100%;padding:0 12px;font-size:12px}.jam-links a{color:#cfe3ff}
@media(max-width:520px){.jam-menu{align-items:start;padding-top:20px}.jam-card{margin:auto 0}.jam-links{position:relative;bottom:auto;margin:18px auto 0}}
`
document.head.appendChild(menuStyle)

const valid = { modes: Object.keys(MODES), difficulties: Object.keys(DIFFICULTIES) }
function loadChoice() {
  let raw: unknown = null
  try { raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') } catch { /* use defaults */ }
  return sanitizeSettings(raw, valid)
}
const choice = loadChoice()
choice.mode = q.get('mode') && q.get('mode')! in MODES ? q.get('mode')! : choice.mode
choice.difficulty = q.get('diff') && q.get('diff')! in DIFFICULTIES ? q.get('diff')! : choice.difficulty
choice.arenas = q.get('arenas') !== null && ARENA_OPTIONS.includes(Number(q.get('arenas')) as typeof ARENA_OPTIONS[number]) ? Number(q.get('arenas')) : choice.arenas

function start() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(choice)) } catch { /* session still starts */ }
  app.replaceChildren()
  menuStyle.remove()
  createPongFall(app, {
    mode: choice.mode,
    difficulty: choice.difficulty,
    arenas: choice.arenas,
    modifiers: q.get('mods')?.split(',').filter(Boolean),
    target: q.get('target') ? Number(q.get('target')) : undefined,
    timeLimit: q.get('time') ? Number(q.get('time')) : undefined,
    host,
  })
}

const root = document.createElement('main'); root.className = 'jam-menu'
const card = document.createElement('section'); card.className = 'jam-card'; card.setAttribute('aria-labelledby', 'jam-title')
const title = document.createElement('h1'); title.id = 'jam-title'; title.textContent = 'PONGFALL'
const subtitle = document.createElement('p'); subtitle.textContent = 'The Walls Have Eyes · Trijam 393'
card.append(title, subtitle)

function group<T extends string | number>(label: string, values: Array<{ value: T; text: string }>, selected: () => T, update: (value: T) => void) {
  const section = document.createElement('section'); section.className = 'jam-group'
  const heading = document.createElement('div'); heading.className = 'jam-label'; heading.textContent = label
  const options = document.createElement('div'); options.className = 'jam-options'; options.setAttribute('role', 'group'); options.setAttribute('aria-label', label)
  for (const item of values) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = item.text
    button.setAttribute('aria-pressed', String(selected() === item.value))
    button.onclick = () => { update(item.value); for (const b of options.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b === button)); refresh() }
    options.append(button)
  }
  section.append(heading, options); card.append(section)
}

group('MODE', Object.values(MODES).map(mode => ({ value: mode.id, text: mode.label })), () => choice.mode, value => { choice.mode = value })
group('DIFFICULTY', DIFFICULTY_ORDER.map(id => ({ value: id, text: DIFFICULTIES[id]!.label })), () => choice.difficulty, value => { choice.difficulty = value })
group('ARENAS', ARENA_OPTIONS.map(value => ({ value, text: arenasLabel(value) })), () => choice.arenas, value => { choice.arenas = value })

const caption = document.createElement('div'); caption.className = 'jam-caption'
const play = document.createElement('button'); play.type = 'button'; play.className = 'jam-play'; play.textContent = 'PLAY'; play.onclick = start
card.append(caption, play); root.append(card)
const links = document.createElement('nav'); links.className = 'jam-links'; links.setAttribute('aria-label', 'Game links')
links.innerHTML = '<a href="/jam/rules.html">Rules</a><a href="https://itch.io/jam/trijam-393" target="_blank" rel="noopener">Made for Trijam 393</a>'
root.append(links); app.replaceChildren(root)

function refresh() { caption.textContent = `${MODES[choice.mode]!.blurb} ${MODES[choice.mode]!.ai ? DIFFICULTIES[choice.difficulty]!.blurb : ''}` }
refresh()

// Navigation only: the jam game's physics, features and visuals remain frozen.
const chip = document.createElement('a')
chip.href = '/'; chip.textContent = '🎮 Trijam Game Jam Build · latest game ↑'
chip.style.cssText = 'padding:4px 10px;border-radius:12px;border:1px solid #ffe08a;background:rgba(16,21,31,.85);color:#ffe08a;text-decoration:none;letter-spacing:.06em'
const participate = document.createElement('a')
participate.href = 'https://trijam.itch.io/'
participate.target = '_blank'; participate.rel = 'noopener noreferrer'
participate.textContent = '↓ You can participate every Friday!'
participate.style.cssText = 'padding:3px 7px;border-radius:6px;background:rgba(16,21,31,.95);color:#cfe3ff;text-decoration:underline'
const nav = document.createElement('div')
nav.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font:600 11px system-ui'
nav.append(chip, participate)
document.body.appendChild(nav)
