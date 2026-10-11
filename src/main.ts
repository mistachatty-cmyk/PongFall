import { createPongFall } from './core/createPongFall'
import { showMainMenu } from './core/mainMenu'
import { createStandaloneHost } from './host/standaloneHost'

const q = new URLSearchParams(location.search)
const mount = (o: { mode?: string; difficulty?: string; arenas?: number } = {}) => createPongFall(document.getElementById('app')!, {
  mode: o.mode ?? q.get('mode') ?? undefined,
  difficulty: o.difficulty ?? q.get('diff') ?? undefined,
  arenas: o.arenas ?? (q.get('arenas') !== null ? Number(q.get('arenas')) : undefined),
  modifiers: q.get('mods')?.split(',').filter(Boolean),
  target: q.get('target') ? Number(q.get('target')) : undefined,
  timeLimit: q.get('time') ? Number(q.get('time')) : undefined,
  host: createStandaloneHost(),
})

// The game always opens on the main menu. A URL (?mode=, ?diff=, ?arenas=) only preselects its choices; ?menu=0 skips straight to a match.
if (q.get('menu') === '0') mount()
else showMainMenu(c => mount(c), {
  mode: q.get('mode') ?? undefined,
  difficulty: q.get('diff') ?? undefined,
  arenas: q.get('arenas') !== null ? Number(q.get('arenas')) : undefined,
})

// Bottom-right chip: switch to the frozen Game Jam (Trijam 393) build, which has only what was made in the three hours.
const jam = document.createElement('a')
jam.href = '/jam/'; jam.textContent = 'GAME JAM BUILD'; jam.title = 'Play the Trijam 393 version: only what was made in the three-hour jam'
jam.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:60;padding:4px 10px;border-radius:12px;border:1px solid #2a3446;background:rgba(16,21,31,.85);color:#9fb3cf;font:600 11px system-ui;text-decoration:none;letter-spacing:.06em'
document.body.appendChild(jam)
