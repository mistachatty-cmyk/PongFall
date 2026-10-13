import { createPongFall, PongFallHandle } from './core/createPongFall'
import { showMainMenu, MenuChoice } from './core/mainMenu'
import { loadProgress, saveProgress, recordCompletedMatch, freshProgress, unlockedModes } from './core/progress'
import { MODES } from './sim/data/modes'
import { createStandaloneHost } from './host/standaloneHost'
import type { Identity } from './host/host'
import { recordHistory, syncCloud } from './core/cloudSync'
import { queueCloudSync } from './core/cloudSyncQueue'
import { arcadeReturnUrl } from './net/lokSession'
import { accountSession, completeLokSignInFromUrl } from './net/playerAuth'
import { createAudio } from './audio/engine'
import { createMusicPlayer } from './audio/musicPlayer'
import { createMusicPanel } from './core/musicPanel'
import { createIntroScreen } from './core/introScreen'

const q = new URLSearchParams(location.search)
const DEV_MODE_KEY = 'pongfall.devMode'
let unlockAll = q.get('unlock') === 'all'
try { unlockAll ||= localStorage.getItem(DEV_MODE_KEY) === 'true' } catch { /* local storage can be unavailable */ }
const app = document.getElementById('app')!
let lokIdentity: Identity | null = null
const host = { ...createStandaloneHost(), getIdentity: () => lokIdentity }
let progress = loadProgress()
let handle: PongFallHandle | null = null
let jamNav: HTMLDivElement | null = null
let intro: ReturnType<typeof createIntroScreen> | null = null
let menu: ReturnType<typeof showMainMenu> | null = null
const audio = createAudio()
const music = createMusicPlayer(audio)
const musicPanel = createMusicPanel(document.body, music, audio)
const unlockAudio = () => { audio.unlock(); music.kick() }
window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true })
window.addEventListener('keydown', unlockAudio, { once: true, capture: true })

const fromUrl = (): Partial<MenuChoice> => ({
  mode: q.get('mode') ?? undefined,
  difficulty: q.get('diff') ?? undefined,
  arenas: q.get('arenas') !== null ? Number(q.get('arenas')) : undefined,
})
const menuAvailable = () => true

function mount(o: Partial<MenuChoice> = {}) {
  intro?.destroy(); intro = null
  if (jamNav) jamNav.style.display = 'none'
  handle?.destroy(); handle = null
  app.replaceChildren()
  handle = createPongFall(app, {
    mode: o.adoptWorld ? undefined : o.mode ?? fromUrl().mode,
    difficulty: o.adoptWorld ? undefined : o.difficulty ?? fromUrl().difficulty,
    arenas: o.adoptWorld ? undefined : o.arenas ?? fromUrl().arenas,
    flux: o.flux,
    duoOpponent: o.duoOpponent,
    seed: o.seed,
    net: o.net,
    replay: o.replay,
    adoptWorld: o.adoptWorld,
    modifiers: q.get('mods')?.split(',').filter(Boolean),
    target: o.target ? o.target : q.get('target') ? Number(q.get('target')) : undefined,
    timeLimit: o.timeLimit ? o.timeLimit : q.get('time') ? Number(q.get('time')) : undefined,
    host,
    audio,
    music,
    toggleMusic: () => musicPanel.toggle(),
    onMenu: openMenu,
    menuAvailable,
    allowedModes: () => unlockedModes(progress, unlockAll),
    onResetProgress: () => { progress = freshProgress(); saveProgress(progress); queueCloudSync() },
  })
  // Every finished match is a fall; the fall count still opens the next mode.
  handle.on('result', r => {
    const nextProgress = recordCompletedMatch(progress, r)
    if (nextProgress !== progress) { progress = nextProgress; saveProgress(progress) }
    if (r) {
      if (o.net) recordHistory(r, o.net.side, 'account')
      else {
        recordHistory(r, 0, 'p1')
        if ((MODES[r.mode] && !MODES[r.mode]!.ai) || (r.mode === 'duo-fall' && o.duoOpponent === 'local')) recordHistory(r, 1, 'p2')
      }
    }
    queueCloudSync()
  })
}

function openMenu() {
  intro?.destroy(); intro = null
  handle?.destroy(); handle = null
  menu?.destroy(); menu = null
  app.replaceChildren()
  if (jamNav) jamNav.style.display = 'flex'
  menu = showMainMenu(c => { menu = null; mount(c) }, { preset: fromUrl(), progress, unlockAll, setUnlockAll: enabled => { unlockAll = enabled; try { localStorage.setItem(DEV_MODE_KEY, String(enabled)) } catch { /* ignore */ } } })
}

function openIntro() {
  menu?.destroy(); menu = null
  intro?.destroy()
  handle?.destroy(); handle = null
  app.replaceChildren()
  if (jamNav) jamNav.style.display = 'flex'
  intro = createIntroScreen(app, { onStart: takeover => takeover ? mount({ adoptWorld: takeover }) : openMenu() })
}

// Direct match links can skip the menu; every normal visit opens on the eye.
void completeLokSignInFromUrl().catch(() => { /* the local menu remains available */ })
  .then(() => syncCloud().catch(() => { /* local play remains available */ }))
  .finally(async () => {
  progress = loadProgress()
  const session = await accountSession().catch(() => null)
  if (session && !session.user.is_anonymous) {
    const meta = session.user.user_metadata ?? {}
    const name = [meta.full_name, meta.name, session.user.email?.split('@')[0]].find(value => typeof value === 'string' && value.trim())
    lokIdentity = { id: session.user.id, name: typeof name === 'string' ? name.trim().slice(0, 40) : 'LOK player' }
  }
  if (q.get('auth') === '1') {
    const returnTo = arcadeReturnUrl(q.get('arcade'))
    if (returnTo && session && !session.user.is_anonymous) { location.replace(returnTo); return }
  }
  if (q.get('menu') === '0') mount()
  else openIntro()
  })

// Navigation chrome stays outside the frozen jam game and links to its own build.
jamNav = document.createElement('div')
jamNav.style.cssText = 'position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font:600 10px system-ui;opacity:.72;transition:opacity .2s,transform .2s'
const jam = document.createElement('a')
jam.href = '/jam/'; jam.textContent = '🎮 Trijam Game Jam Build'; jam.title = 'Play the frozen three-hour Trijam 393 build'
jam.style.cssText = 'padding:5px 9px;border-radius:12px;border:1px solid #ffe08a77;background:rgba(10,15,23,.72);color:#ffe08a;text-decoration:none;letter-spacing:.03em'
const participate = document.createElement('a')
participate.href = 'https://trijam.itch.io/'; participate.target = '_blank'; participate.rel = 'noopener noreferrer'
participate.textContent = '↓ You can participate every Friday!'
participate.style.cssText = 'padding:3px 7px;border-radius:6px;background:rgba(10,15,23,.68);color:#cfe3ff;text-decoration:underline;font-size:10px'
jamNav.append(jam, participate)
document.body.appendChild(jamNav)
