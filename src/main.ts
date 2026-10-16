import { createPongFall, PongFallHandle } from './core/createPongFall'
import { showMainMenu, MenuChoice } from './core/mainMenu'
import { worldMenusOn } from './world/enabled'
import { showWorldMenu } from './world/worldMenu'
import { loadProgress, saveProgress, recordCompletedMatch, freshProgress, unlockedModes } from './core/progress'
import { MODES } from './sim/data/modes'
import { openCheatMenu, CHEAT_SEQUENCE } from './core/cheatMenu'
import { CURRENT_VERSION } from './changelog'
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
import { setDetailedEyes } from './render/eyes'
import { initLanguage } from './core/i18n'
import { initAutoL10n } from './core/autoL10n'
import { mountLilEye } from './core/lilEyeView'
import { applyUiTheme } from './core/uiThemes'
import { setLookProgress, lookPalette } from './world/look'
import { applyPageSkin } from './core/pageSkin'
import { applyShaderPack } from './render/shaderPacks'
import { earnedProgress } from './core/playerProgress'
import { SETTINGS_KEY } from './core/settings'
import { activeRoomCode, forgetRoom } from './net/activeRoom'

const q = new URLSearchParams(location.search)
const DEV_MODE_KEY = 'pongfall.devMode'
const SESSION_DEV_KEY = 'pongfall.devMode.session'
const SECRET_SEQUENCE = 'iloveyoumerci'
let unlockAll = q.get('unlock') === 'all'
try { unlockAll ||= localStorage.getItem(DEV_MODE_KEY) === 'true' } catch { /* local storage can be unavailable */ }
try { unlockAll ||= sessionStorage.getItem(SESSION_DEV_KEY) === 'true' } catch { /* keep in-memory unlock */ }
const app = document.getElementById('app')!
let lokIdentity: Identity | null = null
const host = { ...createStandaloneHost(), getIdentity: () => lokIdentity }
let progress = loadProgress()
let handle: PongFallHandle | null = null
let jamNav: HTMLDivElement | null = null
let intro: ReturnType<typeof createIntroScreen> | null = null
let menu: ReturnType<typeof showMainMenu> | null = null
const audio = createAudio()
try { setDetailedEyes(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')?.classicEyes !== true) } catch { /* the detailed eyes stay */ }
setLookProgress(earnedProgress)
const applyLook = () => {
  window.setTimeout(() => applyPageSkin(lookPalette()), 0)   // after the theme settings are saved and the palette cache is cleared
  let st: { uiTheme?: string; uiAccent?: string; shaderPack?: string; reduceMotion?: boolean } = {}
  try { st = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {} } catch { /* defaults */ }
  applyUiTheme(typeof st.uiTheme === 'string' ? st.uiTheme : 'default', earnedProgress(), typeof st.uiAccent === 'string' ? st.uiAccent : '')
  applyShaderPack(typeof st.shaderPack === 'string' ? st.shaderPack : 'none', st.reduceMotion === true || matchMedia('(prefers-reduced-motion: reduce)').matches)
}
applyLook()
window.addEventListener('pongfall-look', applyLook)
let companionOn = true
try { companionOn = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')?.companion !== false } catch { /* on by default */ }
const companion = mountLilEye(document.body, matchMedia('(prefers-reduced-motion: reduce)').matches)
companion.setVisible(companionOn)
window.addEventListener('pongfall-companion', e => companion.setVisible((e as CustomEvent<boolean>).detail))
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
    arenas: o.adoptWorld ? undefined : o.arenas ?? (progress.falls === 0 && !o.net && !o.replay ? 3 : fromUrl().arenas),
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
    onMenu: () => openMenu(true),
    menuAvailable,
    allowedModes: () => unlockedModes(progress, unlockAll),
    onResetProgress: () => { progress = freshProgress(); saveProgress(progress); queueCloudSync() },
  })
  // Every finished match is a fall; the fall count still opens the next mode.
  handle.on('result', r => {
    if (o.net) forgetRoom()
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

/** The menu as a live world (default since 0.40.0): ?menu=classic brings back the old page of buttons. */
const useWorldMenu = worldMenusOn

function openMenu(leavingMatch = false, autoOpenDevMode = false) {
  if (leavingMatch) {
    forgetRoom()
    const clean = new URL(location.href)
    if (clean.searchParams.has('room')) { clean.searchParams.delete('room'); history.replaceState(history.state, '', clean) }
  }
  intro?.destroy(); intro = null
  handle?.destroy(); handle = null
  menu?.destroy(); menu = null
  app.replaceChildren()
  if (jamNav) jamNav.style.display = 'flex'
  menu = (useWorldMenu() ? showWorldMenu : showMainMenu)(c => { menu = null; mount(c) }, { audio, preset: fromUrl(), progress, unlockAll, autoOpenDevMode, resumeRoom: activeRoomCode(), music, openJukebox: () => musicPanel.open(), setUnlockAll: enabled => { unlockAll = enabled; try { sessionStorage.removeItem(SESSION_DEV_KEY); localStorage.setItem(DEV_MODE_KEY, String(enabled)) } catch { /* keep runtime setting */ } } })
}

function openIntro() {
  menu?.destroy(); menu = null
  intro?.destroy()
  handle?.destroy(); handle = null
  app.replaceChildren()
  if (jamNav) jamNav.style.display = 'flex'
  intro = createIntroScreen(app, { onStart: takeover => takeover ? mount({ adoptWorld: takeover }) : openMenu() })
}

let secretBuffer = ''
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1 || !/[a-z]/i.test(event.key)) return
  if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return
  secretBuffer = (secretBuffer + event.key.toLowerCase()).slice(-Math.max(SECRET_SEQUENCE.length, CHEAT_SEQUENCE.length))
  if (secretBuffer.endsWith(CHEAT_SEQUENCE) && (menu || intro)) {
    secretBuffer = ''
    openCheatMenu(document.body, () => ({ falls: progress.falls, version: CURRENT_VERSION, devMode: unlockAll }), () => { unlockAll = !unlockAll; try { sessionStorage.setItem(SESSION_DEV_KEY, String(unlockAll)) } catch { /* this tab only */ } }, () => window.dispatchEvent(new Event('pongfall-paint-changed')))
    return
  }
  if (!secretBuffer.endsWith(SECRET_SEQUENCE)) return
  secretBuffer = ''
  unlockAll = true
  try { sessionStorage.setItem(SESSION_DEV_KEY, 'true') } catch { /* this tab still stays unlocked */ }
  if (intro || menu) { openMenu(false, true); return }
  const notice = document.createElement('div'); notice.setAttribute('role', 'status'); notice.textContent = 'DEV MODE UNLOKED · Everything is open for this play session. Open the menu to see your options.'
  notice.style.cssText = 'position:fixed;z-index:100;top:18px;left:50%;transform:translateX(-50%);box-sizing:border-box;max-width:calc(100vw - 28px);padding:13px 18px;border:1px solid #ffe08a;border-radius:10px;background:#101923f2;color:#ffe9a4;box-shadow:0 16px 44px #000a;font:800 12px/1.5 ui-monospace,monospace;text-align:center;pointer-events:none'
  document.body.append(notice); window.setTimeout(() => notice.remove(), 5000)
}, { capture: true })

// Direct match links can skip the menu; every normal visit opens on the eye.
void completeLokSignInFromUrl().catch(() => { /* the local menu remains available */ })
  .then(() => syncCloud().catch(() => { /* local play remains available */ }))
  .finally(async () => {
  const lang = await initLanguage().catch(() => 'en')
  // every other word on screen (labels, tooltips, canvas text) is translated from the catalogue; usernames and codes never are
  await initAutoL10n(lang, { record: q.get('l10n') === 'record' }).catch(() => null)
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
  if (q.get('room') || activeRoomCode()) openMenu()
  else if (q.get('menu') === '0') mount()
  else if (useWorldMenu()) openMenu()
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
