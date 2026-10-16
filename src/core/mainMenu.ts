import { MODES } from '../sim/data/modes'
import { t } from './i18n'
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../sim/data/difficulty'
import { ARENA_OPTIONS, TARGET_OPTIONS, TIME_OPTIONS, SETTINGS_KEY, arenasLabel, targetLabel, timeLabel } from './settings'
import { Progress, MODE_ORDER, MULTIPLAYER_MODES, unlockedModes, visibleModes, visibleDifficulties, visibleArenas, unlockedDifficulties, unlockedArenas, lockHint, difficultyLockHint, arenaLockHint, multiplayerUnlocked, FALLS_FOR_MULTIPLAYER } from './progress'
import { GSIX_BRAND, lineAt } from './menuLines'
import { makeCode, parseCode } from './matchCode'
import { hostRoom, joinRoom, normalizeRoomCode, RoomHandle } from '../net/room'
import { onlineConfigured, openSupabaseChannel, createInviteRoom, createListedRoom, listOpenRooms, enterPublicQueue, roomForPlayer, cancelRegisteredRoom } from '../net/supabaseChannel'
import { ageLabel, describeRoom, isMissingFunction, type OpenRoom } from '../net/openRooms'
import { createNetSession } from '../net/lockstep'
import { activeRoomCode, forgetRoom, rememberRoom } from '../net/activeRoom'
import { accountConfigured, playerClient, accountSession, sendLokSignIn, signOutLok } from '../net/playerAuth'
import { localHistory, prepareGuestTransfer } from './cloudSync'
import { createStatsPage } from './statsPage'
import type { NetSession } from '../net/lockstep'
import type { Replay } from '../sim/replay'
import type { World } from '../sim/world'
import { deleteSaveSlot, listSaveSlots, loadSaveSlot } from './saveSlots'
import { CHANGELOG, CURRENT_VERSION } from '../changelog'
import { activeExperiments, EXPERIMENTS, PLANNED_EXPERIMENTS, GAME_LAB_KEY, GAME_LAB_VERSION, loadGameLabState, saveGameLabState, type ExperimentId, type GameLabState } from './gameLab'
import { loadPainterSelection, painterColors } from './pongPainter'
import { createVenueGallery } from './venueGallery'
import { createFallingVenue } from './fallingVenue'

export interface MenuChoice { mode: string; difficulty: string; arenas: number; flux: boolean; duoOpponent?: 'cpu' | 'local'; seed?: number; target?: number; timeLimit?: number; net?: NetSession; roomCode?: string; replay?: Replay; adoptWorld?: World }
export interface MenuOptions { preset?: Partial<MenuChoice>; progress: Progress; unlockAll?: boolean; autoOpenDevMode?: boolean; resumeRoom?: string | null; setUnlockAll?(enabled: boolean): void; music?: import('../audio/musicPlayer').MusicPlayer; audio?: import('../audio/engine').AudioEngine; openJukebox?(): void; /** Open straight into one view (used by the world menu's door). */ startView?: 'multiplayer' | 'settings'; /** Called instead of returning to the main view when Back is pressed in a startView. */ onExit?(): void; /** Mount inside this element instead of the page body (the world menu's framed screen). */ host?: HTMLElement }

const css = `
.pf-menu{position:fixed;inset:0;z-index:50;background:#06080d;color:#cfe3ff;font:15px system-ui,sans-serif;display:flex;align-items:safe center;justify-content:center;overflow-y:auto;transition:opacity .7s ease .15s}
.pf-menu > canvas{position:fixed;inset:0;width:100%;height:100%;cursor:pointer;transition:transform .9s cubic-bezier(.6,0,.9,.4)}
.pf-menu{display:block;overscroll-behavior:contain}
.pf-menu .pf-panel{position:relative;z-index:2;box-sizing:border-box;margin:78px auto 10px;padding:22px 20px 26px!important;display:flex;flex-direction:column;gap:14px;align-items:center;width:min(92vw,860px);text-align:center;transition:opacity .35s,transform .6s;background:linear-gradient(180deg,rgba(8,14,23,.74),rgba(8,14,23,.3));border:1px solid rgba(113,145,179,.18);border-radius:22px;backdrop-filter:blur(3px)}
.pf-menu h1{margin:0 0 4px;font:800 clamp(36px,9vw,72px) system-ui;letter-spacing:.12em;text-shadow:0 0 30px #000,0 0 12px #000}
.pf-menu .pf-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}
.pf-menu .pf-lab{width:100%;font-size:12px;letter-spacing:.2em;opacity:.7;text-shadow:0 0 6px #000}
.pf-menu button{font:600 14px system-ui;color:#cfe3ff;background:rgba(16,21,31,.78);border:2px solid #2a3446;border-radius:10px;padding:8px 14px;cursor:pointer}
.pf-menu button.on{border-color:#8affc1;color:#d8ffe9;box-shadow:0 0 14px #8affc144}
.pf-menu button.pf-play{font-size:22px;padding:12px 56px;margin-top:8px;border-color:#ffe08a;color:#fff2c4}
.pf-menu .pf-blurb{min-height:1.3em;opacity:.8;text-shadow:0 0 6px #000}
.pf-menu .pf-first-fall{width:min(100%,520px);padding:14px 18px;border:1px solid #9fcaf276;border-radius:14px;background:linear-gradient(115deg,#0c1e31dd,#111527cc);box-shadow:0 12px 35px #0007,0 0 24px #72b8ff20}.pf-menu .pf-first-fall strong{display:block;color:#ffe08a;font:800 11px ui-monospace,monospace;letter-spacing:.2em}.pf-menu .pf-first-fall p{margin:7px auto 0;max-width:48ch;color:#d8eaff;font:13px/1.5 system-ui}.pf-menu .pf-first-orbit{display:flex;justify-content:center;align-items:center;gap:13px;margin:11px 0 5px;color:#a7d5ff;font:700 11px ui-monospace,monospace}.pf-menu .pf-first-orbit i{display:block;width:24px;height:16px;border:2px solid #89c8ff;border-radius:4px;box-shadow:0 0 12px #73b9ff66}.pf-menu .pf-first-orbit i:nth-child(2){width:37px;height:25px;border-color:#ffe08a;box-shadow:0 0 16px #ffe08a66}.pf-menu .pf-dev-unlocked{margin-bottom:10px;padding:9px;border:1px solid #ffe08a77;border-radius:8px;background:#30240d;color:#ffe9a4;font:800 11px/1.4 ui-monospace,monospace;letter-spacing:.08em}
.pf-menu .pf-foot{position:relative;z-index:2;pointer-events:none;margin:0 auto max(14px,env(safe-area-inset-bottom));padding:10px 12px;width:fit-content;max-width:94vw;text-align:center;font-size:12px;line-height:1.8;letter-spacing:.1em;opacity:.78;text-shadow:0 0 6px #000}
.pf-menu .pf-foot a{color:inherit;margin:0 8px;pointer-events:auto}
.pf-menu button[disabled],.pf-menu button.lock{opacity:.45;cursor:default}
.pf-menu details{position:relative;z-index:2;text-align:left}.pf-menu>.pf-settings{position:fixed;left:14px;top:14px;z-index:10}.pf-menu details>summary{list-style:none;cursor:pointer;border:1px solid #2a3446;border-radius:8px;padding:8px 12px;background:#10151fcc}.pf-menu details>summary::-webkit-details-marker{display:none}.pf-menu .pf-menu-settings{box-sizing:border-box;margin-top:6px;padding:12px;width:min(360px,calc(100vw - 28px));max-height:calc(100dvh - 80px);overflow:auto;background:#0c1018f5;border:1px solid #2a3446;border-radius:9px;box-shadow:0 14px 36px #000b}
.pf-menu.settings-open:after{content:"";position:fixed;inset:0;z-index:5;background:rgba(2,5,10,.56);pointer-events:none}
.pf-menu .pf-menu-settings label{display:block;margin:7px 0}.pf-menu .pf-menu-settings select{max-width:100%;padding:5px;background:#101923;color:#dce9f8;border:1px solid #40556b;border-radius:6px}
.pf-menu .pf-menu-settings a{color:#73e8ef}.pf-menu .pf-settings-heading{margin:12px 0 5px;color:#82baff;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.pf-menu.classic-look .pf-panel{background:rgba(142,145,153,.78);border:0;border-radius:48%/32%;box-shadow:0 0 90px 60px rgba(142,145,153,.38);backdrop-filter:none;color:#eaf1ff}
.pf-menu.classic-look button{background:rgba(12,18,29,.88)}
.pf-menu.reduce-motion,.pf-menu.reduce-motion *{scroll-behavior:auto!important;transition:none!important;animation:none!important}
.pf-menu input[type=text]{background:#0b0e14;color:#cfe3ff;border:2px solid #2a3446;border-radius:8px;padding:7px 10px;font:600 14px ui-monospace,monospace;letter-spacing:.08em;text-align:center;width:230px}
.pf-menu .pf-note{font-size:12px;opacity:.75;max-width:420px;text-shadow:0 0 6px #000}
.pf-menu .pf-account,.pf-menu .pf-saves{width:min(100%,470px);padding:12px;border:1px solid #40556b;border-radius:10px;background:#071019d9;display:flex;flex-direction:column;align-items:center;gap:8px}
.pf-menu .pf-account input[type=email]{width:min(100%,270px);padding:8px 10px;background:#101923;border:1px solid #718da4;border-radius:6px;color:#fff;font:14px system-ui}
.pf-menu.go{opacity:0;pointer-events:none}.pf-menu.go > canvas{transform:scale(3.2)}.pf-menu.go .pf-panel{opacity:0;transform:scale(.9)}
@media(max-width:560px){.pf-menu .pf-panel{margin:74px auto 18px;padding:18px 12px 22px!important;width:calc(100% - 20px);gap:11px}.pf-menu h1{font-size:clamp(34px,10vw,56px)}.pf-menu .pf-row{gap:6px}.pf-menu button{padding:7px 10px}.pf-menu .pf-foot{line-height:1.6}.pf-menu>.pf-settings{left:8px;top:8px}}
@media(prefers-reduced-motion:reduce){.pf-menu,.pf-menu > canvas,.pf-menu .pf-panel{transition:none!important}.pf-menu::before{animation:none!important}}
.pf-menu button{background:linear-gradient(180deg,rgba(28,38,56,.82),rgba(12,17,27,.86));border:1px solid #3a4c68;box-shadow:inset 0 1px 0 #ffffff14,0 2px 8px #0006;transition:transform .12s,border-color .15s,box-shadow .15s}
.pf-menu button:hover:not(:disabled):not(.lock){transform:translateY(-1px);border-color:#7fb7ff;box-shadow:inset 0 1px 0 #ffffff22,0 6px 16px #0008,0 0 14px #5aa8ff33}
.pf-menu button:active:not(:disabled):not(.lock){transform:translateY(1px) scale(.985)}
.pf-menu button:focus-visible{outline:2px solid #65f4f2;outline-offset:2px}
.pf-menu button.on{border-color:#8affc1}
.pf-menu button.lock{opacity:.7;border-style:dashed;display:inline-flex;flex-direction:column;align-items:center;gap:1px;line-height:1.15}
.pf-menu button.lock small{font:600 10px ui-monospace,monospace;letter-spacing:.04em;color:#ffe08a}
.pf-menu::before{content:"";position:fixed;inset:-10%;z-index:1;pointer-events:none;background:radial-gradient(ellipse 40% 22% at 20% 30%,rgba(150,190,240,.10),transparent 70%),radial-gradient(ellipse 46% 26% at 78% 62%,rgba(150,190,240,.09),transparent 70%),radial-gradient(ellipse 50% 24% at 40% 88%,rgba(190,210,255,.08),transparent 70%);animation:pf-mist 48s ease-in-out infinite alternate}
@keyframes pf-mist{from{transform:translate3d(-3%,0,0)}to{transform:translate3d(4%,-2%,0)}}
`

function saved(): Partial<MenuChoice> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {} } catch { return {} }
}

/** Menu 0: the watching eye, mode / difficulty / arena picker, and multiplayer panel. */
export interface MainMenuHandle { destroy(): void }

export function showMainMenu(onPlay: (c: MenuChoice) => void, o: MenuOptions): MainMenuHandle {
  const preset = Object.fromEntries(Object.entries(o.preset ?? {}).filter(([, v]) => v !== undefined && !Number.isNaN(v))) as Partial<MenuChoice>
  const s = { ...saved(), ...preset } as Partial<MenuChoice>
  const firstFall = o.progress.falls === 0
  const open = unlockedModes(o.progress, o.unlockAll)
  const modeIds = Object.keys(MODES)
  const c: MenuChoice = {
    mode: s.mode && open.includes(s.mode) ? s.mode : 'solo-fall',
    difficulty: s.difficulty && unlockedDifficulties(o.progress, o.unlockAll).includes(s.difficulty) ? s.difficulty : 'chill',
    arenas: firstFall ? 3 : (ARENA_OPTIONS as readonly number[]).includes(s.arenas as number) && unlockedArenas(o.progress, o.unlockAll).includes(s.arenas as number) ? (s.arenas as number) : 0,
    flux: (o.progress.falls > 0 || !!o.unlockAll) && s.flux === true,
    duoOpponent: s.duoOpponent === 'local' ? 'local' : 'cpu',
    seed: s.seed,
  }
  const st = document.createElement('style'); st.dataset.pfMenuStyle = 'true'; st.textContent = css; document.head.appendChild(st)
  const root = document.createElement('div'); root.className = 'pf-menu'
  const statsPage = createStatsPage(root)
  const cv = document.createElement('canvas'); root.appendChild(cv)
  const panel = document.createElement('div'); panel.className = 'pf-panel'; root.appendChild(panel)
  let subVenue: ReturnType<typeof createFallingVenue> | null = null
  const leaveSubVenue = () => { subVenue?.destroy(); subVenue = null; cv.style.display = '' }
  const enterSubVenue = () => { if (subVenue) return; cv.style.display = 'none'; subVenue = createFallingVenue('multiplayer-deck', loadPainterSelection()); subVenue.fillScreen(); subVenue.setView('shaft'); root.insertBefore(subVenue.element, panel) }
  const blurb = document.createElement('div'); blurb.className = 'pf-blurb'
  let paints: Array<() => void> = []
  let closePainter: (() => void) | null = null
  let closeGallery: (() => void) | null = null
  let closeSides: (() => void) | null = null
  let connecting = false
  const repaint = () => { paints.forEach(p => p()); blurb.textContent = `${MODES[c.mode]!.blurb} ${MODES[c.mode]!.ai ? DIFFICULTIES[c.difficulty]!.blurb : ''}` }

  const group = <T extends string | number>(label: string, items: Array<{ v: T; text: string; lock?: string }>, get: () => T, set: (v: T) => void) => {
    const lab = document.createElement('div'); lab.className = 'pf-lab'; lab.textContent = label
    const row = document.createElement('div'); row.className = 'pf-row'
    const btns = items.map(it => {
      const b = document.createElement('button'); b.textContent = (it.lock ? '🔒 ' : '') + it.text
      if (it.lock) { b.classList.add('lock'); b.title = it.lock; b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', `${it.text}. ${it.lock}`); const hint = document.createElement('small'); hint.textContent = it.lock.replace(/^Opens after /, 'after ').replace(' more', ''); b.append(hint) }
      else b.onclick = () => { set(it.v); repaint() }
      row.appendChild(b); return [it.v, b] as const
    })
    paints.push(() => btns.forEach(([v, b]) => b.classList.toggle('on', v === get())))
    panel.append(lab, row)
  }

  function mainView() {
    leaveSubVenue()
    closePainter?.(); closePainter = null
    closeGallery?.(); closeGallery = null
    closeSides?.(); closeSides = null
    panel.innerHTML = '<h1>PONGFALL</h1>'; paints = []
    if (firstFall) {
      const welcome = document.createElement('section'); welcome.className = 'pf-first-fall'; welcome.setAttribute('aria-label', 'Your first fall')
      welcome.innerHTML = '<strong>YOUR FIRST FALL · THE SHAFT IS ALIVE</strong><div class="pf-first-orbit" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p>Your arena falls with three others. Their matches keep moving around you while you protect your glass and learn the rally.</p>'
      panel.append(welcome)
    }
    const availableModes = visibleModes(o.progress, o.unlockAll)
    group(t('menu.mode'), MODE_ORDER.filter(id => id !== 'duo-fall' && availableModes.includes(id) && id in MODES && MODES[id]!.ai).map(id => ({ v: id, text: MODES[id]!.label, lock: lockHint(o.progress, id, o.unlockAll) || undefined })), () => c.mode, v => { c.mode = v })
    group(t('menu.difficulty'), DIFFICULTY_ORDER.filter(d => visibleDifficulties(o.progress, o.unlockAll).includes(d)).map(d => ({ v: d, text: DIFFICULTIES[d]!.label, lock: difficultyLockHint(o.progress, d, o.unlockAll) || undefined })), () => c.difficulty, v => { c.difficulty = v })
    if (!firstFall || o.unlockAll) group(t('menu.otherArenas'), ARENA_OPTIONS.filter(n => visibleArenas(o.progress, o.unlockAll).includes(n)).map(n => ({ v: n, text: arenasLabel(n), lock: arenaLockHint(o.progress, n, o.unlockAll) || undefined })), () => c.arenas, v => { c.arenas = v })
    if (o.progress.falls > 0 || o.unlockAll) {
      const flux = document.createElement('div'); flux.className = 'pf-row'
      const fb = document.createElement('button'); fb.onclick = () => { c.flux = !c.flux; repaint() }
      paints.push(() => { fb.textContent = t(c.flux ? 'menu.fluxOn' : 'menu.fluxOff'); fb.classList.toggle('on', c.flux) })
      flux.append(fb); panel.append(flux)
    }
    const play = document.createElement('button'); play.className = 'pf-play'; play.textContent = firstFall ? t('menu.beginFirstFall') : t('menu.play'); play.onclick = go
    panel.append(blurb, play)
    const painterRow = document.createElement('div'); painterRow.className = 'pf-row'
    const painter = document.createElement('button')
    const painterReady = o.progress.falls >= 1 || !!o.unlockAll
    painter.textContent = painterReady ? t('menu.painter') : t('menu.painterLocked')
    painter.setAttribute('aria-label', painterReady ? t('menu.painterAria') : t('menu.painterLockedAria'))
    painter.disabled = !painterReady
    if (painterReady) painter.onclick = () => {
      painter.disabled = true
      void import('./pongPainterView').then(({ mountPongPainter }) => {
        if (gone) return
        closePainter?.(); closePainter = mountPongPainter(root, o.unlockAll ? Math.max(1, o.progress.falls) : o.progress.falls, () => { closePainter?.(); closePainter = null; painter.disabled = false })
      }).catch(() => { painter.disabled = false; painter.textContent = '🎨 PongPainter · retry' })
    }
    const venues = document.createElement('button'); venues.type = 'button'; venues.textContent = t('menu.venues'); venues.setAttribute('aria-label', t('menu.venuesAria'))
    venues.onclick = () => { closeGallery?.(); closeGallery = createVenueGallery(root, () => painter.click(), () => statsPage.show(venues), painterReady) }
    const sidesBtn = document.createElement('button'); sidesBtn.type = 'button'; sidesBtn.textContent = t('menu.sides'); sidesBtn.setAttribute('aria-label', t('menu.sidesAria'))
    sidesBtn.onclick = () => {
      sidesBtn.disabled = true
      void import('./arenaSidesView').then(({ mountArenaSides }) => {
        closeSides?.(); closeSides = mountArenaSides(root, () => { closeSides?.(); closeSides = null; sidesBtn.disabled = false }, { music: o.music })
      }).catch(() => { sidesBtn.disabled = false; sidesBtn.textContent = '◧ Arena Sides · retry' })
    }
    const eyeBtn = document.createElement('button'); eyeBtn.type = 'button'; eyeBtn.textContent = t('menu.lilEye'); eyeBtn.setAttribute('aria-label', t('menu.lilEyeAria'))
    eyeBtn.onclick = () => {
      eyeBtn.disabled = true
      void import('./lilEyeView').then(({ mountLilEyePage }) => {
        closeSides?.(); closeSides = mountLilEyePage(root, () => { closeSides?.(); closeSides = null; eyeBtn.disabled = false })
      }).catch(() => { eyeBtn.disabled = false; eyeBtn.textContent = '👁 LilEye · retry' })
    }
    painterRow.append(painter, venues, sidesBtn, eyeBtn); panel.append(painterRow)
    if (multiplayerUnlocked(o.progress, o.unlockAll)) {
      const mp = document.createElement('div'); mp.className = 'pf-row'
      const mpb = document.createElement('button'); mpb.textContent = t('menu.multiplayer'); mpb.onclick = multiplayerView
      mp.append(mpb); panel.append(mp)
    } else {
      const hint = document.createElement('div'); hint.className = 'pf-note'; hint.textContent = t('menu.moreAfterFirst'); panel.append(hint)
    }
    const saves = document.createElement('div'); saves.className = 'pf-saves'
    const saveTitle = document.createElement('div'); saveTitle.className = 'pf-lab'; saveTitle.textContent = t('menu.savedMatches'); saves.append(saveTitle)
    const saveMsg = document.createElement('div'); saveMsg.className = 'pf-note'; saves.append(saveMsg)
    for (const slot of listSaveSlots()) {
      const row = document.createElement('div'); row.className = 'pf-row'
      const load = document.createElement('button'); load.textContent = `Load ${slot.name}`
      load.onclick = () => { try { c.replay = loadSaveSlot(slot); go() } catch (e) { saveMsg.textContent = e instanceof Error ? e.message : 'Could not load this save.' } }
      const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${slot.name}`)
      remove.onclick = () => { deleteSaveSlot(slot.id); row.remove(); saveMsg.textContent = `Deleted ${slot.name}.` }
      row.append(load, remove); saves.append(row)
    }
    if (saves.children.length > 2) { const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='💾 Saved matches';details.append(summary,saves);panel.append(details) }
    const account = document.createElement('div'); account.className = 'pf-account'
    const accountTitle = document.createElement('div'); accountTitle.className = 'pf-lab'; accountTitle.textContent = t('menu.playerRecord'); account.append(accountTitle)
    const history = localHistory()
    const playerHistory = history.filter(h => h.details?.profile !== 'p2')
    const record = document.createElement('div'); record.className = 'pf-note'; record.textContent = `${playerHistory.filter(h => h.won).length} wins · ${playerHistory.filter(h => !h.won).length} losses · ${o.progress.falls} falls` ; account.append(record)
    const stats = document.createElement('button'); stats.textContent = t('menu.viewStats'); stats.onclick = () => statsPage.show(stats); account.append(stats)
    const status = document.createElement('div'); status.className = 'pf-note'; account.append(status)
    if (accountConfigured) {
      void accountSession().then(session => {
        if (!account.isConnected) return
        if (session && !session.user.is_anonymous) {
          status.textContent = onlineConfigured
            ? `LOK account: ${session.user.email ?? 'signed in'} · progress and saves sync across devices.`
            : `LOK account: ${session.user.email ?? 'signed in'} · PongFall cloud saves are not enabled on this site yet.`
          const signOut = document.createElement('button'); signOut.textContent = t('menu.signOut'); signOut.onclick = () => { void signOutLok().then(() => { status.textContent = 'Signed out. Guest play is still available.'; signOut.remove() }) }
          account.append(signOut)
        } else {
          status.textContent = 'Guest play is available on this device. Sign in with an existing LOK account to sync.'
          const input = document.createElement('input'); input.type = 'email'; input.placeholder = 'LOK account email'; input.setAttribute('aria-label', 'LOK account email')
          const signIn = document.createElement('button'); signIn.textContent = 'Email sign-in link'
          signIn.onclick = async () => {
            if (!input.reportValidity() || !input.value.trim()) return
            signIn.disabled = true; status.textContent = 'Preparing your guest progress…'
            try {
              let transferReady = false
              try { await prepareGuestTransfer(); transferReady = true } catch { /* Account sign-in still works before PongFall sync is enabled. */ }
              await sendLokSignIn(input.value)
              status.textContent = transferReady
                ? onlineConfigured
                  ? 'Check your email for the sign-in link. Your guest progress will transfer once.'
                  : 'Check your email for the sign-in link. Your guest progress is queued and will transfer when PongFall sync is enabled.'
                : 'Check your email for the sign-in link. Your LOK account will connect; guest progress will stay on this device until PongFall sync is enabled.'
            }
            catch (e) { status.textContent = e instanceof Error ? e.message : 'Could not start sign-in.'; signIn.disabled = false }
          }
          account.append(input, signIn)
        }
      })
    } else status.textContent = 'Local progress and saves are available on this device.'
    { const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='👤 Player record';details.append(summary,account);panel.append(details) }
    repaint()
  }

  function multiplayerView() {
    enterSubVenue()
    panel.innerHTML = '<h1 style="font-size:clamp(28px,6vw,44px)">MULTIPLAYER</h1>'; paints = []
    const back = document.createElement('button'); back.textContent = '← Back'; back.onclick = () => { if (o.startView && o.onExit) { destroy(); o.onExit() } else mainView() }
    if (!multiplayerUnlocked(o.progress, o.unlockAll)) {
      const n = Math.max(0, FALLS_FOR_MULTIPLAYER - o.progress.falls)
      const m = document.createElement('div'); m.className = 'pf-note'
      m.textContent = `Lokked. Multiplayer opens after ${n} more fall${n === 1 ? '' : 's'}: finish matches to open the modes, one per fall.`
      panel.append(m, back); return
    }
    if (!MULTIPLAYER_MODES.includes(c.mode)) c.mode = 'versus'
    if (!unlockedArenas(o.progress, o.unlockAll).includes(c.arenas)) c.arenas = unlockedArenas(o.progress, o.unlockAll)[0] ?? 0
    const mpModes = modeIds.filter(id => !MODES[id]!.ai || id === 'duo-fall')
    group('LOCAL 2-PLAYER', mpModes.map(id => ({ v: id, text: MODES[id]!.label, lock: lockHint(o.progress, id, o.unlockAll) || undefined })), () => c.mode, v => { c.mode = v; multiplayerView() })
    if (c.mode === 'duo-fall') group('TEAM 2', [
      { v: 'cpu' as const, text: '🤖 CPU' },
      { v: 'local' as const, text: '🎮 Local rival' },
    ], () => c.duoOpponent ?? 'cpu', v => { c.duoOpponent = v })
    group('OTHER ARENAS', ARENA_OPTIONS.filter(n => unlockedArenas(o.progress, o.unlockAll).includes(n)).map(n => ({ v: n, text: arenasLabel(n) })), () => c.arenas, v => { c.arenas = v })
    group('SCORE TO WIN', TARGET_OPTIONS.map(n => ({ v: n, text: targetLabel(n) })), () => c.target ?? 0, v => { c.target = v })
    group('TIME LIMIT', TIME_OPTIONS.map(n => ({ v: n, text: timeLabel(n) })), () => c.timeLimit ?? 0, v => { c.timeLimit = v })
    const info = document.createElement('div'); info.className = 'pf-note'
    const updateControlsInfo = () => { info.textContent = c.mode === 'duo-fall'
      ? c.duoOpponent === 'local'
        ? 'DUO FALL · Local rival: P1 W/S uses G/H to focus Arenas 1/2; P2 I/K uses B/V to focus Arenas 1/2. Releasing links your paddles and lets them align. A/D and J/L tilt; Space/U thrust; E/O pinball. J stays P2 tilt here; Trio will use it for Arena 3.'
        : 'DUO FALL · Co-op vs CPU: P1 W/S and P2 I/K steer the shared team. P1 G/H or P2 B/V focuses Arenas 1/2; release to link and align. A/D and J/L tilt; Space/U thrust; E/O pinball. J stays P2 tilt here; Trio will use it for Arena 3.'
      : 'P1: W/S move, A/D tilt, Space thrust or arm aim, E pinball, arrows flip. P2: I/K move, J/L tilt, U thrust or arm aim, O pinball, H/N flip, Y slice. Press C to change keys.' }
    paints.push(updateControlsInfo)
    updateControlsInfo()
    // match code: share a setup, or load one somebody sent you
    const codeLab = document.createElement('div'); codeLab.className = 'pf-lab'; codeLab.textContent = 'MATCH CODE'
    const row = document.createElement('div'); row.className = 'pf-row'
    const shown = document.createElement('input'); shown.type = 'text'; shown.readOnly = true; shown.setAttribute('aria-label', 'Your match code')
    const copy = document.createElement('button'); copy.textContent = 'Copy'
    const newSeed = document.createElement('button'); newSeed.textContent = 'New seed'
    row.append(shown, copy, newSeed)
    const row2 = document.createElement('div'); row2.className = 'pf-row'
    const entry = document.createElement('input'); entry.type = 'text'; entry.placeholder = 'PF1-XXXX-XXXX-XXXX-XX'; entry.setAttribute('aria-label', 'Enter a match code')
    const load = document.createElement('button'); load.textContent = 'Load code'
    row2.append(entry, load)
    const msg = document.createElement('div'); msg.className = 'pf-note'
    const diffs = DIFFICULTY_ORDER
    const refresh = () => { if (c.seed === undefined) c.seed = (Math.random() * 1e9) | 0; shown.value = makeCode({ mode: c.mode, difficulty: c.difficulty, arenas: c.arenas, target: c.target ?? 0, timeLimit: c.timeLimit ?? 0, flux: c.flux, seed: c.seed }, modeIds, diffs) }
    paints.push(refresh)
    copy.onclick = () => { void navigator.clipboard?.writeText(shown.value).then(() => { msg.textContent = 'Copied. Send it to your opponent: the same code sets the same match.' }, () => { shown.select(); msg.textContent = 'Press Ctrl+C to copy.' }) }
    newSeed.onclick = () => { c.seed = (Math.random() * 1e9) | 0; repaint() }
    load.onclick = () => {
      const cfg = parseCode(entry.value, modeIds, diffs)
      if (!cfg) { msg.textContent = 'That code is not valid. Check it and try again.'; return }
      if (!open.includes(cfg.mode)) { msg.textContent = `That code uses ${MODES[cfg.mode]!.label}, which is not unloked yet.`; return }
      c.mode = cfg.mode; c.difficulty = cfg.difficulty; c.arenas = cfg.arenas; c.flux = cfg.flux; c.seed = cfg.seed; c.target = cfg.target; c.timeLimit = cfg.timeLimit
      msg.textContent = 'Match loaded. Press START.'; repaint()
    }
    const start = document.createElement('button'); start.className = 'pf-play'; start.textContent = 'START'; start.onclick = go
    // online: make a room and share its short code, or join a friend's
    const onLab = document.createElement('div'); onLab.className = 'pf-lab'; onLab.textContent = 'PLAY ONLINE'
    const onRow = document.createElement('div'); onRow.className = 'pf-row'
    const create = document.createElement('button'); create.textContent = '🌐 Create room'
    const roomIn = document.createElement('input'); roomIn.type = 'text'; roomIn.placeholder = 'PF-XXXXXXXXXX'; roomIn.style.width = '180px'; roomIn.setAttribute('aria-label', 'Room code')
    const join = document.createElement('button'); join.textContent = 'Join room'
    const publicMatch = document.createElement('button'); publicMatch.textContent = 'Find public match'
    onRow.append(create, roomIn, join, publicMatch)
    const onMsg = document.createElement('div'); onMsg.className = 'pf-note'
    let room: RoomHandle | null = null
    if (!onlineConfigured) { create.disabled = true; join.disabled = true; publicMatch.disabled = true; roomIn.disabled = true; onMsg.textContent = 'Online play is not switched on for this site yet.' }
    let activeCode: string | null = null, activeRoomId: string | null = null
    const begin = (session: NetSession, cfg: { mode: string; difficulty: string; arenas: number; flux: boolean; target: number; timeLimit: number; seed: number }) => {
      busy(false)
      if (activeCode) { rememberRoom(activeCode); c.roomCode = activeCode }
      c.mode = cfg.mode; c.difficulty = cfg.difficulty; c.arenas = cfg.arenas; c.flux = cfg.flux; c.target = cfg.target; c.timeLimit = cfg.timeLimit; c.seed = cfg.seed; c.net = session
      go()
    }
    const busy = (on: boolean) => { connecting = on; back.disabled = on; create.disabled = on || !onlineConfigured; join.disabled = on || !onlineConfigured; publicMatch.disabled = on || !onlineConfigured; if (!browseOff) { listMine.disabled = on; refreshList.disabled = on } }
    const cancelWaiting = async () => {
      room?.cancel(); room = null
      const id = activeRoomId; activeRoomId = null; activeCode = null
      try { if (id) await cancelRegisteredRoom(id); onMsg.textContent = '' }
      catch (error) { onMsg.textContent = error instanceof Error ? error.message : 'Could not cancel this room.' }
      forgetRoom(); busy(false)
    }
    const waiting = (message: string) => {
      onMsg.replaceChildren()
      const label = document.createElement('span'); label.textContent = `${message} `
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.onclick = () => { cancel.disabled = true; void cancelWaiting() }
      onMsg.append(label, cancel)
    }
    const inviteWaiting = (code: string) => {
      onMsg.replaceChildren()
      const label = document.createElement('span'); label.textContent = `Room ${code}. Waiting for your friend… `
      const link = document.createElement('button'); link.textContent = 'Copy invite link'; link.onclick = () => { void navigator.clipboard.writeText(`${location.origin}/?room=${code}`).then(() => { onMsg.append(' Link copied.') }) }
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.onclick = () => { cancel.disabled = true; void cancelWaiting() }
      onMsg.append(label, link, cancel)
    }
    create.onclick = async () => {
      busy(true); onMsg.textContent = 'Opening a room…'
      if (!MODES[c.mode] || MODES[c.mode]!.ai) c.mode = 'versus'
      if (c.seed === undefined) c.seed = (Math.random() * 1e9) | 0
      const cfg = { mode: c.mode, difficulty: c.difficulty, arenas: c.arenas, flux: c.flux, target: c.target ?? 0, timeLimit: c.timeLimit ?? 0, seed: c.seed }
      try {
      const registered = await createInviteRoom(cfg)
      activeCode = registered.code
      activeRoomId = registered.id
      rememberRoom(registered.code)
      room = await hostRoom(openSupabaseChannel, cfg, {
        onWaiting: inviteWaiting,
        onReady: begin,
        onError: m => { onMsg.textContent = m; busy(false) },
      }, registered.code)
      } catch (e) { onMsg.textContent = e instanceof Error ? e.message : 'Could not create a room.'; busy(false) }
    }
    const connectCode = async (code: string) => {
      try {
        const entry = await roomForPlayer(code)
        activeCode = entry.room.code
        activeRoomId = entry.room.id
        if (entry.side === 0 && !entry.room.guest_id) {
          room = await hostRoom(openSupabaseChannel, entry.room.config, {
            onReady: begin,
            onWaiting: inviteWaiting,
            onError: m => { onMsg.textContent = m; busy(false) },
          }, entry.room.code)
        } else if (entry.returning && entry.room.guest_id) {
          const channel = await openSupabaseChannel(code)
          const session = createNetSession(channel, crypto.randomUUID(), entry.side)
          try { await channel.beginRecovery?.() }
          catch (error) { channel.close(); throw error }
          begin(session, entry.room.config)
        } else {
          room = await joinRoom(openSupabaseChannel, code, { onReady: begin, onError: m => { onMsg.textContent = m; busy(false) } })
          if (connecting) waiting(`Waiting for room ${code}…`)
        }
      } catch (error) { if (activeRoomCode() === code) forgetRoom(); onMsg.textContent = error instanceof Error ? error.message : 'Could not join the room.'; busy(false) }
    }
    join.onclick = () => {
      const code = normalizeRoomCode(roomIn.value)
      if (!code) { onMsg.textContent = 'Room codes look like PF-012345ABCD.'; return }
      busy(true); onMsg.textContent = `Joining ${code}…`
      void connectCode(code)
    }
    publicMatch.onclick = async () => {
      busy(true); onMsg.textContent = 'Finding a public match…'
      try {
        const mode = MODES[c.mode] && !MODES[c.mode]!.ai ? c.mode : 'versus'
        const registered = await enterPublicQueue(mode)
        activeCode = registered.code
        activeRoomId = registered.id
        rememberRoom(registered.code)
        const client = await playerClient()
        const user = (await client.auth.getSession()).data.session?.user
        if (!user) throw new Error('Player session expired.')
        const events = { onReady: begin, onError: (m: string) => { onMsg.textContent = m; busy(false) } }
        if (registered.host_id === user.id) {
          room = await hostRoom(openSupabaseChannel, registered.config, { ...events, onWaiting: () => { waiting('Waiting for another player…') } }, registered.code)
        } else { room = await joinRoom(openSupabaseChannel, registered.code, events); if (connecting) waiting('Waiting for another player…') }
      } catch (e) { onMsg.textContent = e instanceof Error ? e.message : 'Could not enter the queue.'; busy(false) }
    }
    // match browser: list your own custom match, or join one somebody else listed
    const browseLab = document.createElement('div'); browseLab.className = 'pf-lab'; browseLab.textContent = 'OPEN MATCHES'
    const browseRow = document.createElement('div'); browseRow.className = 'pf-row'
    const listMine = document.createElement('button'); listMine.textContent = '📣 List my match'; listMine.setAttribute('aria-label', 'List the match you set up above so anyone can join it')
    const refreshList = document.createElement('button'); refreshList.textContent = '↻ Refresh'
    browseRow.append(listMine, refreshList)
    const openList = document.createElement('ul'); openList.setAttribute('aria-live', 'polite'); openList.style.cssText = 'list-style:none;margin:6px 0 0;padding:0;width:min(100%,520px);display:grid;gap:6px'
    const browseNote = document.createElement('div'); browseNote.className = 'pf-note'
    let browseOff = !onlineConfigured
    const renderOpen = (rooms: OpenRoom[]) => {
      openList.replaceChildren()
      if (!rooms.length) { const li = document.createElement('li'); li.className = 'pf-note'; li.textContent = 'Nobody has listed a match right now. List yours, or use Find public match.'; openList.append(li); return }
      for (const r of rooms) {
        const li = document.createElement('li'); li.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:space-between;padding:7px 10px;border:1px solid #2a3446;border-radius:10px;background:rgba(16,21,31,.78)'
        const text = document.createElement('span'); text.style.cssText = 'text-align:left;font-size:13px'
        const strong = document.createElement('strong'); strong.textContent = r.host; text.append(strong, document.createTextNode(` · ${describeRoom(r, id => MODES[id]?.label ?? id)} · ${DIFFICULTIES[r.difficulty]?.label ?? r.difficulty} · ${ageLabel(r.ageSeconds)}`))
        const joinBtn = document.createElement('button'); joinBtn.textContent = 'Join'; joinBtn.setAttribute('aria-label', `Join ${r.host}'s match`)
        joinBtn.onclick = () => { busy(true); onMsg.textContent = `Joining ${r.code}…`; void connectCode(r.code) }
        li.append(text, joinBtn); openList.append(li)
      }
    }
    const loadOpen = async () => {
      if (browseOff) return
      try { renderOpen(await listOpenRooms()); browseNote.textContent = '' }
      catch (e) {
        const m = e instanceof Error ? e.message : ''
        if (isMissingFunction(m)) { browseOff = true; browseNote.textContent = 'The match browser switches on once the server update is applied. Room codes and Find public match work now.'; listMine.disabled = true; refreshList.disabled = true }
        else browseNote.textContent = 'Could not load open matches. Try again in a moment.'
      }
    }
    refreshList.onclick = () => { void loadOpen() }
    listMine.onclick = async () => {
      busy(true); onMsg.textContent = 'Listing your match…'
      if (!MODES[c.mode] || MODES[c.mode]!.ai) c.mode = 'versus'
      if (c.seed === undefined) c.seed = (Math.random() * 1e9) | 0
      const cfg = { mode: c.mode, difficulty: c.difficulty, arenas: c.arenas, flux: c.flux, target: c.target ?? 0, timeLimit: c.timeLimit ?? 0, seed: c.seed }
      try {
        const registered = await createListedRoom(cfg)
        activeCode = registered.code; activeRoomId = registered.id; rememberRoom(registered.code)
        room = await hostRoom(openSupabaseChannel, cfg, { onWaiting: () => waiting('Your match is listed. Waiting for a player…'), onReady: begin, onError: m => { onMsg.textContent = m; busy(false) } }, registered.code)
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Could not list the match.'
        onMsg.textContent = isMissingFunction(m) ? 'The match browser is not switched on yet. Use Create room to invite a friend.' : m; busy(false)
      }
    }
    if (browseOff) { listMine.disabled = true; refreshList.disabled = true; browseNote.textContent = 'Online play is not switched on for this site yet.' }
    else { void loadOpen(); const timer = window.setInterval(() => { if (!panel.isConnected || connecting) { if (!panel.isConnected) window.clearInterval(timer); return } void loadOpen() }, 7000) }
    panel.append(info, codeLab, row, row2, msg, start, onLab, onRow, onMsg, browseLab, browseRow, openList, browseNote, back)
    repaint()
  }

  const foot = document.createElement('div'); foot.className = 'pf-foot'
  foot.innerHTML = `<div class="pf-line" aria-live="off" style="display:block;margin-bottom:4px;font-style:italic;letter-spacing:.06em;opacity:.95;transition:opacity .6s"></div>${GSIX_BRAND}<a href="/rules.html">📖 Field Manual</a><a href="#patch-notes" data-patch-notes>📰 Patch notes</a><a href="/about.html" target="_blank" rel="noopener">🛠 Dev notes</a><a href="https://itch.io/jam/trijam-393" target="_blank" rel="noopener">🎮 Made for Trijam 393</a>`
  const updatesDialog = document.createElement('dialog'); updatesDialog.dataset.pf = 'menu-updates'; updatesDialog.style.cssText = 'box-sizing:border-box;width:min(90vw,620px);max-height:80dvh;overflow:auto;border:1px solid #50627b;border-radius:14px;background:#0b111b;color:#e5f1ff;padding:22px;box-shadow:0 20px 70px #000c'
  updatesDialog.innerHTML = `<header style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="color:#63b4ff;font:700 11px system-ui;letter-spacing:.2em">SHAFT TRANSMISSION · v${CURRENT_VERSION}</div><h2 style="margin:4px 0">Patch notes</h2><div style="color:#9cabc0;font:12px system-ui">Recent updates from the fall</div></div><button type="button" data-close aria-label="Close patch notes" style="font:22px system-ui;border:1px solid #50627b;border-radius:7px;background:#121b29;color:#e5f1ff;padding:4px 12px;cursor:pointer">×</button></header><div style="margin-top:12px">${[...CHANGELOG].reverse().slice(0,8).map(entry => `<article style="padding:10px 0;border-bottom:1px solid #25364b"><h3 style="margin:0 0 5px;font-size:15px">${entry.title} <span style="color:#9cabc0;font-size:12px">v${entry.version}</span></h3><ul style="margin:0;padding-left:20px;color:#bfccdd;font-size:13px;line-height:1.5">${entry.notes.map(note => `<li>${note}</li>`).join('')}</ul></article>`).join('')}</div>`
  updatesDialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => updatesDialog.close()
  updatesDialog.addEventListener('click', e => { if (e.target === updatesDialog) updatesDialog.close() })
  foot.querySelector<HTMLAnchorElement>('[data-patch-notes]')!.onclick = e => { e.preventDefault(); updatesDialog.showModal() }
  root.appendChild(updatesDialog)
  root.appendChild(foot)
  const lineEl = foot.querySelector<HTMLElement>('.pf-line')!
  const showLine = () => { lineEl.textContent = lineAt(Date.now()) }
  showLine()
  const lineTimer = window.setInterval(() => { lineEl.style.opacity = '0'; window.setTimeout(() => { showLine(); lineEl.style.opacity = '.95' }, 600) }, 9000)
  root.addEventListener('pf-menu-closed', () => window.clearInterval(lineTimer))
  const settings = document.createElement('details'); settings.className = 'pf-settings'; settings.innerHTML = '<summary>⚙ Settings</summary><div class="pf-menu-settings"><label><input type="checkbox" data-dev> Dev Mode · unlok everything</label><div class="pf-note">For testing. Progression remains available when this is off.</div><hr><div class="pf-settings-heading">Gameplay</div><label><input type="checkbox" data-hud> Show in-game HUD</label><label>Touch controls <select data-buttons><option value="show">Show</option><option value="hide">Hide</option></select></label><div class="pf-settings-heading">Sound</div><label>Falling sound <select data-fall-sound><option value="classic">Classic · whistling</option><option value="dynamic">Dynamic · rolling air</option></select></label><div class="pf-note">Classic keeps the original wind. Dynamic uses a low, gust-driven rush.</div><div class="pf-settings-heading">Intro simulation</div><label><input type="checkbox" data-demo> Live background rally</label><label><input type="checkbox" data-motion> Reduce motion</label><label>Intro camera <select data-camera><option value="cinematic">Cinematic · adaptive framing</option><option value="locked">Locked close · personal arena</option><option value="shaft">Shaft view · wide</option></select></label><label>Text placement <select data-placement><option value="center">Center · recommended</option><option value="upper">Upper</option><option value="lower">Lower</option></select></label><label>Shift the light <select data-color><option value="0">Shaft blue</option><option value="1">Watching green</option><option value="2">Falling gold</option></select></label><div class="pf-note">Centered is the default. Camera, motion, placement, and color choices apply the next time the intro opens.</div><div class="pf-settings-heading">Classic options</div><label><input type="checkbox" data-classic> Classic eye menu · original look</label><div class="pf-note">First classic option. Restore the original eye menu appearance before visual upgrades.</div><div class="pf-settings-heading">Field Manual</div><a href="/rules.html">📖 Open the Shaft Field Manual</a></div>'
  const devToggle = settings.querySelector<HTMLInputElement>('[data-dev]')!; devToggle.checked = !!o.unlockAll
  devToggle.onchange = () => { o.setUnlockAll?.(devToggle.checked); o.unlockAll = devToggle.checked; mainView() }
  const settingsBody = settings.querySelector<HTMLElement>('.pf-menu-settings')!
  if (o.autoOpenDevMode) {
    const notice = document.createElement('div'); notice.className = 'pf-dev-unlocked'; notice.setAttribute('role', 'status')
    notice.textContent = 'DEV MODE UNLOKED · Everything is open for this play session.'
    settingsBody.prepend(notice)
  }
  const lab = document.createElement('details')
  lab.style.cssText = 'margin-top:12px;border-top:1px solid #334155;padding-top:10px'
  lab.innerHTML = `<summary style="cursor:pointer;color:#77e9f1;font-weight:700">🧪 Game Lab · experimental controls</summary><p style="color:#9cabc0;font-size:12px;line-height:1.45">Each change applies to the next match. Compare Before (baseline) with After (feature on). Experimental matches are marked unranked; their results stay in history but do not open unlocks. Online rooms keep the baseline until you mark a visual experiment Tested this update.</p>`
  const labState: GameLabState = loadGameLabState()
  const status = document.createElement('div'); status.setAttribute('role', 'status'); status.style.cssText = 'min-height:1.3em;color:#9cabc0;font-size:11px'
  const persistLab = () => { status.textContent = saveGameLabState(labState) ? 'Saved on this device · applies next match' : 'Browser storage unavailable; export notes to keep them' }
  const modeLabels: Array<[string, string]> = [['solo-fall','Solo Fall'],['duo-fall','Duo Fall'],['classic','Classic'],['timed','Timed'],['sandbox','Sandbox'],['versus','Versus'],['versus-timed','Versus Timed']]
  for (const feature of EXPERIMENTS) {
    const card = document.createElement('section'); card.style.cssText = 'margin:10px 0;padding:9px;border:1px solid #2a3446;border-radius:8px;background:#080d14'
    const title = document.createElement('strong'); title.textContent = `${feature.title} · ${feature.kind} · Update ${feature.introduced}`; title.style.cssText = 'display:block;font-size:12px'
    const summary = document.createElement('p'); summary.textContent = feature.summary; summary.style.cssText = 'margin:4px 0 8px;color:#9cabc0;font-size:11px;line-height:1.4'
    const compare = document.createElement('button'); compare.type = 'button'; compare.style.cssText = 'padding:6px 10px;font-size:12px'
    const syncCompare = () => { const after = labState.enabled[feature.id]; compare.textContent = after ? 'After · feature on' : 'Before · baseline'; compare.setAttribute('aria-pressed', String(after)); compare.classList.toggle('on', after) }
    compare.onclick = () => { labState.enabled[feature.id] = !labState.enabled[feature.id]; syncCompare(); persistLab() }
    syncCompare()
    const notes = document.createElement('textarea'); notes.maxLength = 4000; notes.rows = 2; notes.placeholder = 'Playtest notes'; notes.setAttribute('aria-label', `${feature.title} playtest notes`); notes.value = labState.review[feature.id].notes
    notes.style.cssText = 'box-sizing:border-box;width:100%;margin-top:8px;padding:6px;background:#101923;color:#dce9f8;border:1px solid #40556b;border-radius:5px;font:12px system-ui'
    notes.oninput = () => { labState.review[feature.id].notes = notes.value; persistLab() }
    const transfer = document.createElement('label'); transfer.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:8px;font-size:11px'
    const transferBox = document.createElement('input'); transferBox.type = 'checkbox'; transferBox.checked = labState.review[feature.id].transfer
    transfer.append(transferBox, document.createTextNode('Recommend for the main game')); transferBox.onchange = () => { labState.review[feature.id].transfer = transferBox.checked; persistLab() }
    const choices = document.createElement('div'); choices.style.cssText = 'display:grid;gap:6px;margin-top:6px'
    const scope = document.createElement('select'); scope.setAttribute('aria-label', `${feature.title} recommendation scope`); scope.innerHTML = '<option value="whole-game">Scope: whole game</option><option value="selected-modes">Scope: selected modes</option>'; scope.value = labState.review[feature.id].scope; scope.style.cssText = 'padding:5px;background:#101923;color:#dce9f8;border:1px solid #40556b;border-radius:5px'
    const policy = document.createElement('select'); policy.setAttribute('aria-label', `${feature.title} recommendation policy`); policy.innerHTML = '<option value="optional">If added: keep toggleable</option><option value="always-on">If added: always on</option>'; policy.value = labState.review[feature.id].policy; policy.style.cssText = scope.style.cssText
    const modeBox = document.createElement('div'); modeBox.style.cssText = 'display:none;grid-template-columns:1fr 1fr;gap:2px 8px;color:#cfe3ff;font-size:11px'
    for (const [id,label] of modeLabels) {
      const row = document.createElement('label'); row.style.cssText = 'display:flex;align-items:center;gap:4px'
      const box = document.createElement('input'); box.type = 'checkbox'; box.checked = labState.review[feature.id].modes.includes(id)
      box.onchange = () => { const selected = new Set(labState.review[feature.id].modes); box.checked ? selected.add(id) : selected.delete(id); labState.review[feature.id].modes = [...selected]; persistLab() }
      row.append(box, document.createTextNode(label)); modeBox.append(row)
    }
    const syncScope = () => { const selected = scope.value === 'selected-modes'; modeBox.style.display = selected ? 'grid' : 'none'; labState.review[feature.id].scope = selected ? 'selected-modes' : 'whole-game' }
    scope.onchange = () => { syncScope(); persistLab() }; syncScope()
    policy.onchange = () => { labState.review[feature.id].policy = policy.value === 'always-on' ? 'always-on' : 'optional'; persistLab() }
    const tested = document.createElement('label'); tested.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:11px'
    const testedBox = document.createElement('input'); testedBox.type = 'checkbox'; testedBox.checked = labState.review[feature.id].tested
    tested.append(testedBox, document.createTextNode('Tested this update')); testedBox.onchange = () => { labState.review[feature.id].tested = testedBox.checked; persistLab() }
    choices.append(transfer, scope, modeBox, policy, tested)
    card.append(title, summary, compare, notes, choices); lab.append(card)
  }
  for (const feature of PLANNED_EXPERIMENTS) {
    const card = document.createElement('section'); card.style.cssText = 'margin-top:8px;padding:10px;border:1px dashed #66513a;border-radius:8px;background:#17130e'
    const title = document.createElement('strong'); title.textContent = `⏳ ${feature.title} · ${feature.introduced}`; title.style.cssText = 'display:block;color:#f2ca83;font:700 12px system-ui'
    const status = document.createElement('p'); status.textContent = feature.reason; status.style.cssText = 'margin:5px 0 0;color:#c2b7a5;font:11px/1.45 system-ui'
    card.append(title, status); lab.append(card)
  }
  const exportRow = document.createElement('div'); exportRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:8px 0'
  const exportBtn = document.createElement('button'); exportBtn.type = 'button'; exportBtn.textContent = 'Export playtest notes'; exportBtn.onclick = () => { const blob = new Blob([JSON.stringify({ version: GAME_LAB_VERSION, exportedAt: new Date().toISOString(), ...labState }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'pongfall-game-lab-notes.json'; a.click(); URL.revokeObjectURL(url) }
  exportBtn.style.cssText = 'font-size:11px;padding:5px 8px'
  const copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.textContent = 'Copy checklist'; copyBtn.style.cssText = exportBtn.style.cssText
  copyBtn.onclick = () => { void navigator.clipboard?.writeText(JSON.stringify({ version: GAME_LAB_VERSION, ...labState }, null, 2)).then(() => { status.textContent = 'Checklist copied' }).catch(() => { status.textContent = 'Copy unavailable; use Export playtest notes' }) }
  exportRow.append(exportBtn, copyBtn); lab.append(exportRow, status)
  lab.hidden = !devToggle.checked
  devToggle.addEventListener('change', () => { lab.hidden = !devToggle.checked })
  settingsBody.append(lab)
  const hudToggle = settings.querySelector<HTMLInputElement>('[data-hud]')!
  const buttonsSelect = settings.querySelector<HTMLSelectElement>('[data-buttons]')!
  const fallSoundSelect = settings.querySelector<HTMLSelectElement>('[data-fall-sound]')!
  const demoToggle = settings.querySelector<HTMLInputElement>('[data-demo]')!
  const motionToggle = settings.querySelector<HTMLInputElement>('[data-motion]')!
  const cameraSelect = settings.querySelector<HTMLSelectElement>('[data-camera]')!
  const colorSelect = settings.querySelector<HTMLSelectElement>('[data-color]')!
  const placementSelect = settings.querySelector<HTMLSelectElement>('[data-placement]')!
  const classicToggle = settings.querySelector<HTMLInputElement>('[data-classic]')!
  let storedSettings: Record<string, unknown> = {}
  try { storedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {} } catch { /* use defaults */ }
  hudToggle.checked = storedSettings.gameHud !== false
  buttonsSelect.value = storedSettings.buttons === 'hide' ? 'hide' : 'show'
  fallSoundSelect.value = storedSettings.fallSound === 'dynamic' ? 'dynamic' : 'classic'
  let introSettings: Record<string, unknown> = {}
  try { introSettings = JSON.parse(localStorage.getItem('pongfall.introSettings') ?? '{}') ?? {} } catch { /* use intro defaults */ }
  demoToggle.checked = introSettings.demo !== false
  motionToggle.checked = typeof introSettings.reduceMotion === 'boolean' ? introSettings.reduceMotion : matchMedia('(prefers-reduced-motion: reduce)').matches
  cameraSelect.value = ['cinematic','locked','shaft'].includes(String(introSettings.camera)) ? String(introSettings.camera) : 'cinematic'
  colorSelect.value = ['0','1','2'].includes(String(introSettings.colorway)) ? String(introSettings.colorway) : '0'
  placementSelect.value = ['center','upper','lower'].includes(String(introSettings.placement)) ? String(introSettings.placement) : 'center'
  classicToggle.checked = storedSettings.classicEyeMenu === true
  root.classList.toggle('classic-look', classicToggle.checked)
  root.classList.toggle('reduce-motion', motionToggle.checked)
  const saveIntroSettings = () => {
    introSettings = { ...introSettings, demo: demoToggle.checked, reduceMotion: motionToggle.checked, camera: cameraSelect.value, colorway: Number(colorSelect.value), placement: placementSelect.value }
    try { localStorage.setItem('pongfall.introSettings', JSON.stringify(introSettings)) } catch { /* keep runtime controls usable */ }
    root.classList.toggle('reduce-motion', motionToggle.checked)
  }
  const saveClassic = () => {
    root.classList.toggle('classic-look', classicToggle.checked)
    try {
      const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {}
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, classicEyeMenu: classicToggle.checked }))
      localStorage.setItem('pongfall.settingsTouchedAt', String(Date.now()))
    } catch { /* apply the visual preference for this visit */ }
  }
  const saveMenuSettings = () => {
    try {
      const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') ?? {}
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, gameHud: hudToggle.checked, buttons: buttonsSelect.value, fallSound: fallSoundSelect.value }))
      localStorage.setItem('pongfall.settingsTouchedAt', String(Date.now()))
    } catch { /* retain current play session defaults if storage is unavailable */ }
  }
  hudToggle.onchange = saveMenuSettings
  buttonsSelect.onchange = saveMenuSettings
  fallSoundSelect.onchange = saveMenuSettings
  demoToggle.onchange = saveIntroSettings
  motionToggle.onchange = () => { saveIntroSettings(); reducedMotion = motionToggle.checked; cancelAnimationFrame(raf); draw() }
  cameraSelect.onchange = saveIntroSettings
  colorSelect.onchange = saveIntroSettings
  placementSelect.onchange = saveIntroSettings
  classicToggle.onchange = () => { saveClassic(); cancelAnimationFrame(raf); draw() }
  settings.addEventListener('toggle', () => root.classList.toggle('settings-open', settings.open))
  root.appendChild(settings)
  let floaters: { destroy(): void } | null = null
  if ((saved() as { menuFloaters?: boolean }).menuFloaters === true && !o.startView && (o.progress.falls > 0 || o.unlockAll)) {
    void import('./floatersView').then(({ mountFloaters, FLOATER_SVG }) => {
      if (gone) return
      floaters = mountFloaters(root, [
        { id: 'jukebox', label: 'Jukebox: open the music library', svg: FLOATER_SVG.jukebox, open: () => o.openJukebox?.() },
        { id: 'stats', label: 'Stat board: open your player stats', svg: FLOATER_SVG.stats, open: () => statsPage.show(root) },
        { id: 'gear', label: 'Gear: open the menu settings', svg: FLOATER_SVG.gear, open: () => { settings.open = true; settings.querySelector('summary')?.scrollIntoView({ block: 'nearest' }) } },
      ], reducedMotion)
    }).catch(() => { /* the menu works without them */ })
  }
  ;(o.host ?? document.body).appendChild(root)

  // the eyeball: pupil follows the pointer, blinks now and then
  const ctx = cv.getContext('2d')!
  let mx = 0.5, my = 0.5, px = 0.5, py = 0.5, raf = 0, nextBlink = 2, started = performance.now(), gone = false, cleanupTimer = 0
  cv.setAttribute('role','button'); cv.setAttribute('tabindex','0'); cv.setAttribute('aria-label','Toggle the watching eye')
  let eyeWantedOpen = true, winceUntil = 0, eyeOpenNow = 1, lastEyeFrame = performance.now()
  let eyePaint = painterColors(loadPainterSelection())
  const refreshEyePaint = () => { eyePaint = painterColors(loadPainterSelection()); if (reducedMotion) draw() }
  window.addEventListener('pongfall-paint-changed', refreshEyePaint)
  const eyePokes: number[] = []
  const toggleEye = () => {
    const nowPoke = performance.now(); eyePokes.push(nowPoke); while (eyePokes.length && nowPoke - eyePokes[0]! > 4000) eyePokes.shift()
    if (eyePokes.length >= 7) { eyePokes.length = 0; const l = root.querySelector<HTMLElement>('.pf-line'); if (l) { l.textContent = 'The eye would like you to stop poking it. It will remember.'; l.style.opacity = '.95' } }   // easter egg, see docs/EASTER_EGGS.md
    eyeWantedOpen = !eyeWantedOpen; winceUntil = performance.now() + 280; cv.setAttribute('aria-pressed', String(!eyeWantedOpen)); if (reducedMotion) { cancelAnimationFrame(raf); draw() } }
  cv.onclick = toggleEye; cv.onkeydown = e => { if(e.key === ' ' || e.key === 'Enter'){e.preventDefault();e.stopPropagation();toggleEye()} }
  const onMove = (e: PointerEvent) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight }
  window.addEventListener('pointermove', onMove)
  let reducedMotion = motionToggle.checked
  const draw = () => {
    if (gone) return
    if (subVenue || closePainter || closeGallery || closeSides) { raf = requestAnimationFrame(draw); return }
    const dpr = devicePixelRatio || 1, w = innerWidth, h = innerHeight
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const t = (performance.now() - started) / 1000
    px += (mx - px) * 0.06; py += (my - py) * 0.06
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46
    ctx.fillStyle = '#06080d'; ctx.fillRect(0, 0, w, h)
    const blink = t > nextBlink ? Math.max(0, 1 - Math.sin((t - nextBlink) * Math.PI / 0.22)) : 1
    if (t > nextBlink + 0.22) nextBlink = t + 2 + (Math.sin(t * 12.9) + 1) * 2
    // the lid eases toward its target (a click closes or opens it smoothly instead of snapping), and a click makes the eye wince a little
    const nowMs = performance.now(), dtE = Math.min(0.1, Math.max(0.001, (nowMs - lastEyeFrame) / 1000)); lastEyeFrame = nowMs
    const wince = nowMs < winceUntil ? 0.55 : 1
    const target = (eyeWantedOpen ? blink : 0.018) * wince
    eyeOpenNow = reducedMotion ? target : eyeOpenNow + (target - eyeOpenNow) * (1 - Math.exp(-dtE * (target > eyeOpenNow ? 16 : 22)))
    const open = Math.max(0.012, eyeOpenNow)
    ctx.save()
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.5, R * open, 0, 0, Math.PI * 2); ctx.clip()
    const classic = classicToggle.checked
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5)
    g.addColorStop(0, classic ? '#d9dde6' : '#f4f8ff'); g.addColorStop(.76, classic ? '#adb4c2' : '#c7d8ed'); g.addColorStop(1, classic ? '#6f7686' : '#667992'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    const gazeX = reducedMotion ? .5 : px, gazeY = reducedMotion ? .5 : py
    const ix = cx + (gazeX - 0.5) * R * 1.1, iy = cy + (gazeY - 0.5) * R * 0.7 + (reducedMotion ? 0 : Math.sin(t * 0.7) * 4)
    const irisR = R * 0.62
    ctx.beginPath(); ctx.arc(ix, iy, irisR, 0, Math.PI * 2); ctx.fillStyle = eyePaint.eye || (classic ? '#14352c' : '#123c63'); ctx.fill()
    ctx.beginPath(); ctx.arc(ix, iy, irisR * .9, 0, Math.PI * 2); ctx.strokeStyle = eyePaint.eye || (classic ? '#4c7e67' : '#70caff'); ctx.lineWidth = Math.max(2, R * .035); ctx.stroke()
    const ig = ctx.createRadialGradient(ix - irisR * .24, iy - irisR * .3, R * .04, ix, iy, irisR * .84)
    ig.addColorStop(0, eyePaint.eye || (classic ? '#2f6f55' : '#a6e8ff')); ig.addColorStop(.33, eyePaint.eye || (classic ? '#205b48' : '#328fc7')); ig.addColorStop(.78, eyePaint.eye || (classic ? '#14352c' : '#15517d')); ig.addColorStop(1, classic ? '#0a1a16' : '#0a2039')
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, irisR * .83, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#02070d'; ctx.beginPath()
    if (eyePaint.eyeType === 'slit') ctx.ellipse(ix, iy, irisR * .13, irisR * .55, 0, 0, Math.PI * 2)
    else if (eyePaint.eyeType === 'diamond') { const p = irisR * .46; ctx.moveTo(ix, iy - p); ctx.lineTo(ix + p * .7, iy); ctx.lineTo(ix, iy + p); ctx.lineTo(ix - p * .7, iy); ctx.closePath() }
    else ctx.arc(ix, iy, irisR * .39, 0, Math.PI * 2)
    ctx.fill()
    if (eyePaint.eyeType === 'ring') { ctx.fillStyle = eyePaint.eye || '#70caff'; ctx.beginPath(); ctx.arc(ix, iy, irisR * .16, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.arc(ix - irisR * .25, iy - irisR * .28, irisR * .1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.46)'; ctx.beginPath(); ctx.arc(ix + irisR * .19, iy + irisR * .2, irisR * .045, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    ctx.strokeStyle = eyePaint.slots['eye.lid']; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.5, R * Math.max(.025,open), 0, 0, Math.PI * 2); ctx.stroke()
    if (open < .08) { ctx.strokeStyle = eyePaint.slots['eye.blink']; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - R * 1.4, cy); ctx.lineTo(cx + R * 1.4, cy); ctx.stroke() }
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, w, h)   // dim so the menu text reads
    raf = requestAnimationFrame(draw)
  }
  draw()

  const destroy = () => {
    if (gone) return
    gone = true; floaters?.destroy(); window.clearTimeout(cleanupTimer); cancelAnimationFrame(raf); closePainter?.(); closePainter = null; closeGallery?.(); closeGallery = null; closeSides?.(); closeSides = null; leaveSubVenue()
    window.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', onKey); window.removeEventListener('pongfall-paint-changed', refreshEyePaint)
    statsPage.destroy()
    root.dispatchEvent(new Event('pf-menu-closed')); root.remove(); st.remove()
  }
  const go = () => {
    if (root.classList.contains('go')) return
    root.classList.add('go')
    // Let the menu finish fading before mounting the next screen. This avoids
    // overlapping full-screen canvases and panels during page transitions.
    cleanupTimer = window.setTimeout(() => { destroy(); onPlay({ ...c }) }, 1100)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && o.startView && o.onExit) { e.preventDefault(); destroy(); o.onExit(); return }
    if (e.key !== 'Enter' || connecting) return
    if (e.target instanceof Element && e.target.closest('button,input,select,textarea,a,[role="button"]')) return
    go()
  }
  window.addEventListener('keydown', onKey)
  mainView()
  if (o.startView === 'multiplayer') multiplayerView()
  if (o.startView === 'settings') { settings.open = true; root.classList.add('settings-open') }
  if (o.autoOpenDevMode) { settings.open = true; root.classList.add('settings-open'); settings.querySelector('summary')?.focus() }
  const invite = new URLSearchParams(location.search).get('room') ?? o.resumeRoom
  if (invite) { multiplayerView(); const field = panel.querySelector<HTMLInputElement>('input[aria-label="Room code"]'); const button = Array.from(panel.querySelectorAll('button')).find(b => b.textContent === 'Join room'); if (field && button) { field.value = invite; button.click() } }
  return { destroy }
}
