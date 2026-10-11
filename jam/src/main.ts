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

// Frozen Trijam 393 build. The chip switches back to the latest game.
const chip = document.createElement('a')
chip.href = '/'; chip.textContent = 'GAME JAM BUILD · tap for latest'
chip.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:60;padding:4px 10px;border-radius:12px;border:1px solid #ffe08a;background:rgba(16,21,31,.85);color:#ffe08a;font:600 11px system-ui;text-decoration:none;letter-spacing:.06em'
document.body.appendChild(chip)
