import { createPongFall, PongFallHandle } from './core/createPongFall'
import { showMainMenu, MenuChoice } from './core/mainMenu'
import { loadProgress, saveProgress, recordFall, freshProgress, unlockedModes } from './core/progress'
import { createStandaloneHost } from './host/standaloneHost'
import { recordHistory, syncCloud, queueCloudSync } from './core/cloudSync'

const q = new URLSearchParams(location.search)
const unlockAll = q.get('unlock') === 'all'
const app = document.getElementById('app')!
const host = createStandaloneHost()
let progress = loadProgress()
let handle: PongFallHandle | null = null
let jamNav: HTMLDivElement | null = null

const fromUrl = (): Partial<MenuChoice> => ({
  mode: q.get('mode') ?? undefined,
  difficulty: q.get('diff') ?? undefined,
  arenas: q.get('arenas') !== null ? Number(q.get('arenas')) : undefined,
})
const menuAvailable = () => true

function mount(o: Partial<MenuChoice> = {}) {
  if (jamNav) jamNav.style.display = 'none'
  handle = createPongFall(app, {
    mode: o.mode ?? fromUrl().mode,
    difficulty: o.difficulty ?? fromUrl().difficulty,
    arenas: o.arenas ?? fromUrl().arenas,
    flux: o.flux,
    seed: o.seed,
    net: o.net,
    replay: o.replay,
    modifiers: q.get('mods')?.split(',').filter(Boolean),
    target: o.target ? o.target : q.get('target') ? Number(q.get('target')) : undefined,
    timeLimit: o.timeLimit ? o.timeLimit : q.get('time') ? Number(q.get('time')) : undefined,
    host,
    onMenu: openMenu,
    menuAvailable,
    allowedModes: () => unlockedModes(progress, unlockAll),
    onResetProgress: () => { progress = freshProgress(); saveProgress(progress); queueCloudSync() },
  })
  // Every finished match is a fall; the fall count still opens the next mode.
  handle.on('result', r => { progress = recordFall(progress); saveProgress(progress); if (r) recordHistory(r, o.net?.side ?? 0); queueCloudSync() })
}

function openMenu() {
  handle?.destroy(); handle = null
  if (jamNav) jamNav.style.display = 'flex'
  showMainMenu(c => mount(c), { preset: fromUrl(), progress, unlockAll })
}

// Direct match links can skip the menu; every normal visit opens on the eye.
void syncCloud().catch(() => { /* local play remains available */ }).finally(() => {
  progress = loadProgress()
  if (q.get('menu') === '0') mount()
  else openMenu()
})

// Navigation chrome stays outside the frozen jam game and links to its own build.
jamNav = document.createElement('div')
jamNav.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font:600 11px system-ui'
const jam = document.createElement('a')
jam.href = '/jam/'; jam.textContent = '🎮 Trijam Game Jam Build'; jam.title = 'Play the frozen three-hour Trijam 393 build'
jam.style.cssText = 'padding:6px 10px;border-radius:12px;border:1px solid #ffe08a;background:rgba(16,21,31,.95);color:#ffe08a;text-decoration:none;letter-spacing:.03em'
const participate = document.createElement('a')
participate.href = 'https://trijam.itch.io/'; participate.target = '_blank'; participate.rel = 'noopener noreferrer'
participate.textContent = '↓ You can participate every Friday!'
participate.style.cssText = 'padding:3px 7px;border-radius:6px;background:rgba(16,21,31,.95);color:#cfe3ff;text-decoration:underline'
jamNav.append(jam, participate)
document.body.appendChild(jamNav)
