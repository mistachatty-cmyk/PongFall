import { createPongFall } from './core/createPongFall'
import { createStandaloneHost } from './host/standaloneHost'

const q = new URLSearchParams(location.search)
createPongFall(document.getElementById('app')!, {
  mode: q.get('mode') ?? undefined,
  difficulty: q.get('diff') ?? undefined,
  arenas: q.get('arenas') !== null ? Number(q.get('arenas')) : undefined,
  modifiers: q.get('mods')?.split(',').filter(Boolean),
  target: q.get('target') ? Number(q.get('target')) : undefined,
  timeLimit: q.get('time') ? Number(q.get('time')) : undefined,
  host: createStandaloneHost(),
})

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
