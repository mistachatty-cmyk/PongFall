import { createPongFall, PongFallHandle } from './core/createPongFall'
import { showMainMenu, MenuChoice } from './core/mainMenu'
import { loadProgress, saveProgress, recordFall, freshProgress, unlockedModes } from './core/progress'
import { createStandaloneHost } from './host/standaloneHost'

const q = new URLSearchParams(location.search)
const unlockAll = q.get('unlock') === 'all'
const app = document.getElementById('app')!
const host = createStandaloneHost()
let progress = loadProgress()
let handle: PongFallHandle | null = null

const fromUrl = (): Partial<MenuChoice> => ({
  mode: q.get('mode') ?? undefined,
  difficulty: q.get('diff') ?? undefined,
  arenas: q.get('arenas') !== null ? Number(q.get('arenas')) : undefined,
})
const menuAvailable = () => progress.menuUnlocked || unlockAll

function mount(o: Partial<MenuChoice> = {}) {
  handle = createPongFall(app, {
    mode: o.mode ?? fromUrl().mode,
    difficulty: o.difficulty ?? fromUrl().difficulty,
    arenas: o.arenas ?? fromUrl().arenas,
    flux: o.flux,
    seed: o.seed,
    net: o.net,
    modifiers: q.get('mods')?.split(',').filter(Boolean),
    target: o.target ? o.target : q.get('target') ? Number(q.get('target')) : undefined,
    timeLimit: o.timeLimit ? o.timeLimit : q.get('time') ? Number(q.get('time')) : undefined,
    host,
    onMenu: openMenu,
    menuAvailable,
    allowedModes: () => unlockedModes(progress, unlockAll),
    onResetProgress: () => { progress = freshProgress(); saveProgress(progress); syncHint() },
  })
  // every finished match is a fall: the first one opens the main menu, and each fall opens another mode
  handle.on('result', () => { progress = recordFall(progress); saveProgress(progress); syncHint() })
}

function openMenu() {
  handle?.destroy(); handle = null
  showMainMenu(c => mount(c), { preset: fromUrl(), progress, unlockAll })
}

// Before the first match there is no menu, only a faint line at the top edge that you do not know the meaning of yet.
const hint = document.createElement('div')
hint.setAttribute('aria-hidden', 'true')
hint.style.cssText = 'position:fixed;top:0;left:50%;width:120px;height:2px;margin-left:-60px;background:#cfe3ff;opacity:.2;z-index:40;pointer-events:none;animation:pf-hint 4s ease-in-out infinite'
const hs = document.createElement('style'); hs.textContent = '@keyframes pf-hint{0%,100%{opacity:.1}50%{opacity:.32}}@media (prefers-reduced-motion:reduce){[style*="pf-hint"]{animation:none!important}}'
document.head.appendChild(hs)
function syncHint() { if (menuAvailable()) hint.remove(); else if (!hint.isConnected) document.body.appendChild(hint) }

// The game opens on the main menu once it has been unlocked (?menu=0 skips it). The very first visit goes straight into a Solo Fall match.
if (q.get('menu') === '0') mount()
else if (menuAvailable()) openMenu()
else mount({ mode: fromUrl().mode ?? 'solo-fall' })
syncHint()

// Bottom-right chip: switch to the frozen Game Jam (Trijam 393) build, which has only what was made in the three hours.
const jam = document.createElement('a')
jam.href = '/jam/'; jam.textContent = 'GAME JAM BUILD'; jam.title = 'Play the Trijam 393 version: only what was made in the three-hour jam'
jam.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:60;padding:4px 10px;border-radius:12px;border:1px solid #2a3446;background:rgba(16,21,31,.85);color:#9fb3cf;font:600 11px system-ui;text-decoration:none;letter-spacing:.06em'
document.body.appendChild(jam)
