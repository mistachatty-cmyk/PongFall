import { walletStripState } from '../../lib/lok-universe/src/wallet'
import { sendLokSignIn } from '../net/playerAuth'
import { buyPainterProduct, loadLokShop, type LokShopSnapshot } from './lokShop'
import { isPainterDevSession, loadPainterSelection, painterColors, PAINTER_CATEGORIES, PAINTER_EYE_TYPES, PAINTER_SLOTS, productSlot, PONG_PAINTER_PRODUCTS, PONG_PAINTER_UNLOCK_FALLS, painterSku, randomOwnedPainterSelection, sanitizePainterSelection, savePainterSelection, TEAR_IRIS_COLORS, type PainterCategory, type PainterSlot, type PainterSelection } from './pongPainter'
import { buyTearIris, loadTearEyeWallet, saveTearEyeWallet, TEARS_PER_IRIS } from './tearEyeWallet'
import { queueCloudSync } from './cloudSyncQueue'
import { createFallingVenue, type VenueView } from './fallingVenue'

const css = `
.pp-eye-lid{position:absolute;z-index:2;inset:1px;border-radius:50%;background:linear-gradient(#4b5b74,#202d43);transform:scaleY(0);animation:pp-eye-blink 6.8s ease-in-out infinite;pointer-events:none}@keyframes pp-eye-blink{0%,89%,94%,100%{transform:scaleY(0)}91%,92%{transform:scaleY(1)}}@media(prefers-reduced-motion:reduce){.pp-root .pp-eye-lid{animation:pp-eye-blink 9s ease-in-out infinite!important}}
.pp-root .pp-venue-shell{height:clamp(300px,46vw,490px);overflow:hidden;border:1px solid #8cece6aa;border-radius:10px;background:#07111d;box-shadow:inset 0 0 28px #8cece633,0 18px 45px #0009}.pp-root .pp-venue-shell canvas{position:absolute;inset:0;width:100%;height:100%;transform:none;cursor:default}.pp-venue-shell:after{content:'';position:absolute;inset:0;border:10px solid #8cece60b;box-shadow:inset 0 0 24px #0009;pointer-events:none}.pp-live-label{position:absolute;left:12px;top:12px;z-index:2;padding:6px 9px;border:1px solid #8cece6a8;border-radius:5px;background:#06151cdb;color:#aaf9f1;font:800 10px ui-monospace,monospace;letter-spacing:.12em}.pp-focus-dock{position:absolute;left:12px;top:42px;z-index:2;display:flex;flex-wrap:wrap;gap:5px;max-width:calc(100% - 24px)}.pp-focus-dock button{border:1px solid #6da4b28c;border-radius:20px;background:#071625e8;color:#d5eff6;padding:5px 8px;font:800 9px ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}.pp-focus-dock button[aria-pressed=true]{background:#b8f3e9;color:#09202a;border-color:#fff}.pp-venue-readout{position:absolute;left:12px;bottom:12px;z-index:2;max-width:55%;padding:7px 9px;border-left:2px solid #b7f6ed;background:#06121bdb;color:#e8ffff;font:700 10px/1.35 ui-monospace,monospace;letter-spacing:.06em}.pp-root .pp-preview{padding:8px;border:1px solid #8cece688;background:#071421b8}.pp-root .pp-preview-copy{font-size:10px}.pp-root .pp-preview-copy strong{color:#b5fbf0}@media(max-width:600px){.pp-root .pp-venue-shell{height:330px}.pp-focus-dock{top:42px}.pp-focus-dock button{padding:4px 6px;font-size:8px}.pp-venue-controls{top:auto;bottom:8px;right:8px}.pp-venue-readout{bottom:50px;max-width:calc(100% - 24px)}}
.pp-venue-shell{position:relative;flex:1 1 100%;height:clamp(270px,43vw,440px)}.pp-venue-controls{position:absolute;right:12px;top:12px;z-index:2;display:flex;gap:6px;padding:5px;border:1px solid #83b6c966;border-radius:9px;background:#081422de}.pp-venue-controls button{padding:7px 10px;border:1px solid #5d748b;border-radius:6px;background:#122438;color:#e3f6ff;font:800 10px ui-monospace,monospace;cursor:pointer}.pp-venue-controls button[aria-pressed=true]{border-color:#8ef0e6;background:#1b4651;color:white}.pp-preview-copy{flex:1 1 100%!important;padding:9px 12px;border:1px solid #83b6c977;border-radius:7px;background:#071421e8}.pp-root .pp-preview{background:rgba(5,13,24,.12);box-shadow:inset 0 0 0 1px #8cece655}.pp-root .pp-card:hover,.pp-root .pp-card:focus-within{border-color:#8cece6;box-shadow:0 0 22px #53d9df2a}.pp-root .pp-card{transition:border-color .2s,box-shadow .2s}
.pp-back,.pp-tab,.pp-action,.pp-buy{border:1px solid #704c94;background:#100d1d;color:#e8d5ff;border-radius:4px;padding:9px 12px;cursor:pointer;font:700 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.pp-back:hover,.pp-tab:hover,.pp-action:hover,.pp-buy:hover:not(:disabled){border-color:#67edf0;background:#17182a}.pp-title{margin:14px 0 2px;color:#efdbff;font-size:clamp(27px,6vw,42px);font-weight:900;letter-spacing:.16em;text-shadow:0 0 18px #ab67ee66}.pp-sub{margin:0;color:#a8a6ba;font-size:12px}.pp-wallet,.pp-server{margin-top:12px;padding:12px 14px;border:1px solid #6f4b98;background:#100d1dba;box-shadow:0 0 24px #9b59db16}.pp-wallet{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center;color:#d7c8e8;font:700 11px ui-monospace,monospace}.pp-server{display:flex;gap:12px;align-items:center}.pp-eye{width:44px;height:32px;flex:none;border-radius:50%;background:#e5e0d3;border:3px solid #736192;position:relative;box-shadow:0 0 14px #bd79ff70}.pp-eye:before{content:'';position:absolute;inset:6px 12px;border-radius:50%;background:var(--iris,#68b6e7);border:1px solid #29495d}.pp-eye:after{content:'';position:absolute;width:6px;height:6px;left:18px;top:12px;border-radius:50%;background:#08101b}.pp-server p{margin:0}.pp-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;border-bottom:1px solid #543d70;padding-bottom:8px}.pp-tab[aria-selected=true]{border-color:#61e7ef;color:#88f3f0;box-shadow:0 0 12px #64edf044}.pp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,225px),1fr));gap:9px;margin-top:12px}.pp-card{padding:14px;background:linear-gradient(145deg,#151024,#0a0d14);border:1px solid #614780;min-height:142px;display:flex;flex-direction:column}.pp-card h3{margin:0;font-size:14px;letter-spacing:.06em}.pp-card p{flex:1;color:#a8a6ba;font-size:12px;line-height:1.45}.pp-kind{font:700 9px ui-monospace,monospace;color:#8ceced;letter-spacing:.14em;text-transform:uppercase}.pp-buy{width:100%;border-color:#56dfe9;color:#9dfaff}.pp-buy:disabled{opacity:.55;cursor:default}.pp-status{min-height:1.5em;margin-top:12px;color:#9eeaff;font-size:12px}.pp-login[hidden]{display:none}.pp-login{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pp-login input{flex:1;min-width:180px;background:#090b12;color:white;border:1px solid #6b587c;border-radius:4px;padding:9px}.pp-note{color:#918da0;font-size:11px;line-height:1.45}.pp-root button:focus-visible,.pp-root input:focus-visible{outline:2px solid #65f4f2;outline-offset:2px}@media(prefers-reduced-motion:reduce){.pp-root *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
.pp-supporters{margin-top:14px;padding:7px 9px;border:1px solid #30515d;background:#08151bbb;overflow:hidden;color:#78e4ed;font:700 9px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.pp-supporters[hidden]{display:none}.pp-supporters-label{display:block;margin-bottom:5px;color:#b7c5dc;font-size:8px}.pp-supporters-lane{overflow:hidden;white-space:nowrap}.pp-supporters-track{display:inline-flex;min-width:max-content;animation:pp-support-scroll 30s linear infinite}.pp-supporters-item{margin-right:30px;color:#7be9e4}.pp-supporters-item[data-tier=passport]{color:#75baff}.pp-supporters-item[data-tier=lifetime]{color:#ffd279}@keyframes pp-support-scroll{to{transform:translateX(-50%)}}.pp-topics{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.pp-topic{border:1px solid #5a4573;background:#100d1d;color:#a6eaf1;padding:7px 9px;font:700 9px ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}.pp-server-label{display:block;margin-bottom:4px;color:#78e4ed;font:700 9px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}
.pp-loadout{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.pp-loadout .pp-note{align-self:center;margin:0}.pp-sample{height:48px;display:grid;place-items:center;margin:2px 0 10px;border:1px solid #ffffff2b;background:radial-gradient(ellipse at center,#24344a,#0b101b 72%);overflow:hidden}.pp-sample-track{position:relative;width:70%;height:28px;border:1px solid #8091aa55;background:#111a28}.pp-sample-track:before{content:'';position:absolute;left:5px;top:7px;width:4px;height:14px;background:var(--sample-paddle,#e9f2ff);border-radius:2px;box-shadow:calc(100% - 14px) 0 0 var(--sample-paddle,#e9f2ff)}.pp-sample-track:after{content:'';position:absolute;left:50%;top:10px;width:7px;height:7px;border-radius:50%;background:var(--sample-ball,#fff);box-shadow:0 0 9px var(--sample-ball,#fff)}
.pp-eye[data-eye-type=slit]:after{width:3px;height:13px;left:20px;top:8px;border-radius:50%}.pp-eye[data-eye-type=diamond]:after{width:9px;height:9px;left:17px;top:10px;border-radius:1px;transform:rotate(45deg)}.pp-eye[data-eye-type=ring]:after{width:10px;height:10px;left:16px;top:8px;border:3px solid #08101b;background:var(--iris,#68b6e7);border-radius:50%}
.pp-preview{flex:1 1 100%;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 14px;border:1px solid #5b7894;background:linear-gradient(110deg,#102236,#111326);box-shadow:inset 0 0 28px #67edf012}.pp-preview-art{display:flex;align-items:center;gap:12px;min-width:190px}.pp-preview-art .pp-eye{width:68px;height:47px}.pp-preview-art .pp-eye:before{inset:8px 20px}.pp-preview-art .pp-eye:after{left:30px;top:19px}.pp-preview-art .pp-eye[data-eye-type=slit]:after{left:32px;top:15px}.pp-preview-art .pp-eye[data-eye-type=diamond]:after{left:28px;top:17px}.pp-preview-art .pp-eye[data-eye-type=ring]:after{left:27px;top:15px}.pp-preview-art .pp-sample-track{width:100px;flex:none}.pp-preview-copy{font:700 10px/1.6 ui-monospace,monospace;color:#c7dcf3;letter-spacing:.05em}.pp-preview-copy strong{display:block;color:#86e9ef;letter-spacing:.15em}
.pp-sections{display:grid;gap:22px;margin-top:14px}.pp-slot{padding:12px;border:1px solid #534469;background:#0b0d18}.pp-slot h2{margin:0 0 10px;color:#93e8f0;font:800 14px ui-monospace,monospace;letter-spacing:.13em;text-transform:uppercase}.pp-preview{min-height:270px}.pp-preview-art{flex:1 1 400px}.pp-stage{position:relative;width:min(100%,520px);height:230px;overflow:hidden;border:4px solid #4aa8ff;background-image:linear-gradient(#ffffff0c 1px,transparent 1px),linear-gradient(90deg,#ffffff0c 1px,transparent 1px);background-size:38px 38px}.pp-stage-ceiling,.pp-stage-floor{position:absolute;left:0;right:0;height:9px;border-top:5px solid}.pp-stage-ceiling{top:0}.pp-stage-floor{bottom:0}.pp-stage-glass{position:absolute;top:20px;bottom:20px;width:15px;border:3px solid;font:36px monospace}.pp-stage-glass.left{left:22px}.pp-stage-glass.right{right:22px}.pp-stage-paddle{position:absolute;top:38%;height:68px;width:12px;border:3px solid}.pp-stage-paddle.left{left:46px}.pp-stage-paddle.right{right:46px}.pp-stage-ball{position:absolute;left:49%;top:48%;width:19px;height:19px;border:2px solid white;border-radius:50%}.pp-stage-tear{position:absolute;left:72%;top:72%;width:15px;height:24px;border-radius:60% 60% 75% 75%;transform:rotate(45deg)}.pp-stage .pp-eye{position:absolute;left:calc(50% - 34px);top:24px}.pp-presets{width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:5px}.pp-presets-label{width:100%;color:#8ceced;font:700 10px ui-monospace,monospace;letter-spacing:.13em}.pp-preset-slot{display:flex;align-items:center;gap:5px;padding:5px;border:1px solid #5a4573;background:#0b101b}.pp-preset-slot span{min-width:43px;color:#cbd9ed;font:700 10px ui-monospace,monospace}.pp-preset-slot button{padding:5px 7px}
@media(max-width:600px){.pp-preview{padding:10px;min-height:220px}.pp-preview-art{min-width:0;flex-basis:100%}.pp-stage{height:190px}.pp-preview-copy{font-size:9px}.pp-tab{flex:1 1 28%}.pp-card{min-height:120px}.pp-preset-slot{flex:1 1 100%;justify-content:space-between}}
`

export function mountPongPainter(parent: HTMLElement, falls: number, onClose: () => void): () => void {
  const root = document.createElement('lok-shop-frame'); root.className = 'pp-root'; root.setAttribute('aria-labelledby', 'pp-title')
  root.style.setProperty('--lok-shop-bg', 'radial-gradient(ellipse at 50% 0%,#17162c 0,#080b12 56%,#05070b 100%)')
  root.style.setProperty('--lok-shop-text', '#e4edff'); root.style.setProperty('--lok-shop-muted', '#a8a6ba')
  root.style.setProperty('--lok-shop-accent', '#67edf0'); root.style.setProperty('--lok-shop-border', '#704c94'); root.style.setProperty('--lok-shop-title', '#efdbff')
  const style = document.createElement('style'); style.textContent = css
  const back = document.createElement('button'); back.type = 'button'; back.className = 'pp-back'; back.slot = 'back'; back.textContent = '← Back to the fall'; back.onclick = onClose
  const supporters = document.createElement('section'); supporters.className = 'pp-supporters'; supporters.slot = 'supporters'; supporters.setAttribute('aria-label', 'LOK supporters'); supporters.hidden = true
  const title = document.createElement('h1'); title.id = 'pp-title'; title.className = 'pp-title'; title.slot = 'title'; title.textContent = 'PONGPAINTER'
  const sub = document.createElement('p'); sub.className = 'pp-sub'; sub.slot = 'subtitle'; sub.textContent = 'A paint counter inside the falling shaft. Try every finish in a real match view before equipping it.'
  const wallet = document.createElement('div'); wallet.className = 'pp-wallet'; wallet.slot = 'wallet'; wallet.setAttribute('aria-live', 'polite')
  const server = document.createElement('section'); server.className = 'pp-server'; server.slot = 'host'; server.setAttribute('aria-live', 'polite')
  const eye = document.createElement('span'); eye.className = 'pp-eye'; eye.setAttribute('aria-hidden', 'true')
  const eyeLid = document.createElement('span'); eyeLid.className = 'pp-eye-lid'; eye.append(eyeLid)
  const serverLabel = document.createElement('span'); serverLabel.className = 'pp-server-label'; serverLabel.textContent = 'LokServer · Paint counter'
  const say = document.createElement('p'); say.textContent = 'A new coat changes the light. The fall underneath stays the same.'
  const serverCopy = document.createElement('div'); serverCopy.append(serverLabel, say); server.append(eye, serverCopy)
  const topics = document.createElement('div'); topics.className = 'pp-topics'; topics.slot = 'topics'; topics.setAttribute('aria-label', 'Ask LokServer')
  const preview = document.createElement('div'); preview.className = 'pp-preview'; preview.setAttribute('aria-label', 'Live equipped look preview'); topics.append(preview)
  const venue = createFallingVenue('paint-counter', loadPainterSelection())
  venue.fillScreen(); venue.element.slot = 'scene'
  const venueShell = document.createElement('div'); venueShell.className = 'pp-venue-shell'
  venue.attachViewport(venueShell)
  const liveLabel = document.createElement('div'); liveLabel.className = 'pp-live-label'; liveLabel.textContent = '● LIVE RALLY · PAINT IN THE FALL'; liveLabel.setAttribute('aria-hidden', 'true')
  const focusDock = document.createElement('div'); focusDock.className = 'pp-focus-dock'; focusDock.setAttribute('role', 'group'); focusDock.setAttribute('aria-label', 'Choose the part of the live arena to customize')
  const readout = document.createElement('div'); readout.className = 'pp-venue-readout'; readout.textContent = 'Select a part of the arena, then try a finish below.'
  for (const category of PAINTER_CATEGORIES) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = category.label; button.dataset.category = category.id
    button.onclick = () => { active = category.id; render(); readout.textContent = `${category.label} · ${category.note}` }
    focusDock.append(button)
  }
  const venueControls = document.createElement('div'); venueControls.className = 'pp-venue-controls'; venueControls.setAttribute('role', 'group'); venueControls.setAttribute('aria-label', 'Live arena view')
  let venueView: VenueView = 'personal'
  for (const [label, view] of [['PERSONAL ARENA', 'personal'], ['FULL SHAFT', 'shaft']] as const) {
    const control = document.createElement('button'); control.type = 'button'; control.textContent = label; control.setAttribute('aria-pressed', String(venueView === view))
    control.onclick = () => { venueView = view; venue.setView(view); venueControls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === control))) }
    venueControls.append(control)
  }
  venueShell.append(liveLabel, focusDock, readout, venueControls)
  const previewCopy = document.createElement('div'); previewCopy.className = 'pp-preview-copy'
  preview.append(venueShell, previewCopy)
  for (const [label, message] of [['WHAT CHANGES?', 'Paint changes the look of your fall. Ball speed, scoring and collision stay exactly the same.'], ['WHERE IS MY PAINT?', 'Purchases belong to your LOK account. The look you equip syncs with your account when cloud sync is available.'], ['LOKTOKENS', 'PongFall matches do not grant LokTokens. Purchases use the shared LOK catalog and wallet.']] as const) {
    const topic = document.createElement('button'); topic.type = 'button'; topic.className = 'pp-topic'; topic.textContent = label; topic.onclick = () => { say.textContent = message }; topics.append(topic)
  }
  const tabs = document.createElement('div'); tabs.className = 'pp-tabs'; tabs.slot = 'tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Customization categories')
  const loadout = document.createElement('div'); loadout.className = 'pp-loadout'; loadout.slot = 'tabs'
  const randomize = document.createElement('button'); randomize.type = 'button'; randomize.className = 'pp-action'; randomize.textContent = '✦ Random owned look'
  randomize.setAttribute('aria-label', 'Randomize equipped cosmetics using owned items')
  randomize.onclick = () => { const owned = new Set(shop.owned); tearWallet.owned.forEach(id => owned.add(`pongfall.tear-eye.${id}`)); if (isPainterDevSession()) { PONG_PAINTER_PRODUCTS.forEach(item => owned.add(painterSku(item))); TEAR_IRIS_COLORS.forEach(color => owned.add(`pongfall.tear-eye.${color.id}`)) } const next = randomOwnedPainterSelection(owned); if (!Object.keys(next).length) { status.textContent = 'Your collection is ready for its first paint.'; return } selected = next; status.textContent = savePainterSelection(selected) ? 'A fresh owned look is ready for your next fall.' : 'Could not save the look on this device.'; queueCloudSync(); render() }
  const clearLook = document.createElement('button'); clearLook.type = 'button'; clearLook.className = 'pp-action'; clearLook.textContent = 'Reset all paint'; clearLook.onclick = () => { selected = {}; status.textContent = savePainterSelection(selected) ? 'Original colors restored for every slot.' : 'Could not save the look on this device.'; queueCloudSync(); render() }
  loadout.append(randomize, clearLook)
  const presetBar = document.createElement('div'); presetBar.className = 'pp-presets'; loadout.append(presetBar)
  const presetKey = (index: number) => `pongfall.painter.look.${index}.v1`
  const renderPresets = () => {
    presetBar.replaceChildren()
    const label = document.createElement('strong'); label.className = 'pp-presets-label'; label.textContent = 'SAVE YOUR LOOK · THIS DEVICE'; presetBar.append(label)
    for (let index = 1; index <= 3; index++) {
      const wrap = document.createElement('span'); wrap.className = 'pp-preset-slot'
      const name = document.createElement('span'); name.textContent = `LOOK ${index}`
      const save = document.createElement('button'); save.type = 'button'; save.className = 'pp-action'; save.textContent = 'Save'; save.onclick = () => { try { localStorage.setItem(presetKey(index),JSON.stringify(sanitizePainterSelection(selected))); status.textContent = `Look ${index} saved on this device.` } catch { status.textContent = 'Could not save this look.' } }
      const load = document.createElement('button'); load.type = 'button'; load.className = 'pp-action'; load.textContent = 'Load'; load.onclick = () => { try {
        const preset = sanitizePainterSelection(JSON.parse(localStorage.getItem(presetKey(index)) ?? 'null'))
        const owned = new Set(shop.owned); tearWallet.owned.forEach(id => owned.add(`pongfall.tear-eye.${id}`)); if (isPainterDevSession()) { PONG_PAINTER_PRODUCTS.forEach(item => owned.add(painterSku(item))); TEAR_IRIS_COLORS.forEach(color => owned.add(`pongfall.tear-eye.${color.id}`)) }
        const safe: PainterSelection = {}
        for (const slot of PAINTER_SLOTS) {
          const id = preset[slot.id]
          if (id && (id === slot.starter.id || slot.id === 'eye.pupil' && PAINTER_EYE_TYPES.some(type => type.id === id) || slot.id === 'eye.iris' && TEAR_IRIS_COLORS.some(color => color.id === id && owned.has(`pongfall.tear-eye.${id}`)) || PONG_PAINTER_PRODUCTS.some(item => productSlot(item) === slot.id && item.id === id && owned.has(painterSku(item))))) safe[slot.id] = id
        }
        selected = safe; savePainterSelection(selected); queueCloudSync(); status.textContent = `Look ${index} loaded. Unowned items were skipped.`; render()
      } catch { status.textContent = 'No saved look in this slot.' } }
      wrap.append(name,save,load); presetBar.append(wrap)
    }
  }
  renderPresets()
  const grid = document.createElement('div'); grid.className = 'pp-sections'; grid.slot = 'items'
  const status = document.createElement('div'); status.className = 'pp-status'; status.slot = 'status'; status.setAttribute('role', 'status')
  const note = document.createElement('p'); note.className = 'pp-note'; note.slot = 'footer'; note.textContent = 'Hover or focus any card to try its look above. Eye types are included; iris colors cost tears earned in matches. LokToken paints use the shared LOK store. Paint changes appearance only. Tear unlocks stay on this device; equipped looks sync when PongFall account saves are enabled.'
  if (isPainterDevSession()) note.textContent = 'Dev session: implemented paints are available to equip temporarily. No LokTokens or tears are spent, no account ownership changes, and this session look disappears when the tab session ends. Future concepts remain in the design roadmap.'
  const signIn = document.createElement('form'); signIn.className = 'pp-login'; signIn.slot = 'footer'; signIn.hidden = true
  const email = document.createElement('input'); email.type = 'email'; email.required = true; email.autocomplete = 'email'; email.placeholder = 'LOK account email'; email.setAttribute('aria-label', 'LOK account email')
  const signInButton = document.createElement('button'); signInButton.type = 'submit'; signInButton.className = 'pp-action'; signInButton.textContent = 'Email sign-in link'; signIn.append(email, signInButton)
  let selected = loadPainterSelection(), shop = { authAvailable: false, signedIn: false, balance: null, owned: new Set<string>(), catalog: new Map(), supporters: [], error: null } as LokShopSnapshot
  let tearWallet = loadTearEyeWallet()
  let active: PainterCategory = 'theme', busy = false, dead = false, signInRequested = false
  const paintPreview = (selection: PainterSelection, tryOn = '') => {
    const look = painterColors(selection)
    venue.setLook(selection)
    const previewHeading = document.createElement('strong'); previewHeading.textContent = tryOn ? `TRY ON · ${tryOn}` : 'YOUR CURRENT LOOK'
    previewCopy.replaceChildren(previewHeading, document.createTextNode(`${PAINTER_EYE_TYPES.find(type => type.id === look.eyeType)?.name ?? 'Watcher'} eye · ${Object.keys(selection).length} custom slots · tears ${look.tear} · rendered with match physics`))
    if (tryOn) readout.textContent = `TRY ON · ${tryOn} · hover or focus only`
    else readout.textContent = `${PAINTER_CATEGORIES.find(item => item.id === active)?.label ?? 'LOOK'} · equipped look playing live`
  }
  const tryCard = (card: HTMLElement, category: PainterCategory, id: string, name: string) => {
    const show = () => paintPreview({ ...selected, [category]: id }, name)
    const restore = () => paintPreview(selected)
    card.addEventListener('pointerenter', show); card.addEventListener('pointerleave', restore)
    card.addEventListener('focusin', show); card.addEventListener('focusout', restore)
  }
  const render = () => {
    const look = painterColors(selected)
    venue.setFocus(active === 'eyeType' ? 'eye' : active)
    paintPreview(selected)
    supporters.replaceChildren()
    if (shop.supporters.length) {
      supporters.hidden = false
      const label = document.createElement('span'); label.className = 'pp-supporters-label'; label.textContent = 'LOK SUPPORTERS · THANK YOU'
      const lane = document.createElement('div'); lane.className = 'pp-supporters-lane'; lane.setAttribute('aria-hidden', 'true')
      const track = document.createElement('div'); track.className = 'pp-supporters-track'; track.style.animationDuration = `${Math.max(30, shop.supporters.length * 5)}s`
      for (let copy = 0; copy < 2; copy++) for (const supporter of shop.supporters) {
        const item = document.createElement('span'); item.className = 'pp-supporters-item'; item.dataset.tier = supporter.tier; item.textContent = `${supporter.founder ? '★' : '◆'} ${supporter.display}${supporter.founder ? ' · FOUNDER' : ''}`; track.append(item)
      }
      lane.append(track); supporters.append(label, lane)
    } else supporters.hidden = true
    wallet.replaceChildren()
    const walletState = walletStripState({ signedIn: shop.signedIn, balance: shop.balance, authAvailable: shop.authAvailable })
    const balance = document.createElement('span'); balance.textContent = walletState.kind === 'signed-in' ? `LOKTOKENS · ${walletState.balance.toLocaleString()}` : walletState.kind === 'loading' ? 'LOKTOKENS · Loading balance…' : walletState.kind === 'sign-in' ? 'LOKTOKENS · Sign in to view balance' : 'LOKTOKENS · Account store unavailable here'
    const auth = document.createElement('span'); auth.textContent = shop.signedIn ? 'LOK ACCOUNT CONNECTED' : shop.authAvailable ? 'ACCOUNT REQUIRED' : 'OFFLINE'
    const tearBalance = document.createElement('span'); tearBalance.textContent = `TEARS · ${tearWallet.tears}`; tearBalance.style.color = '#89dfff'; tearBalance.title = 'Local cosmetic currency earned from normal matches'
    wallet.append(balance, auth, tearBalance)
    if (shop.authAvailable && !shop.signedIn) { const login = document.createElement('button'); login.type = 'button'; login.className = 'pp-action'; login.textContent = 'Sign in'; login.onclick = () => { signInRequested = true; render(); email.focus() }; wallet.append(login) }
    tabs.replaceChildren()
    focusDock.querySelectorAll<HTMLButtonElement>('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === active)))
    for (const category of PAINTER_CATEGORIES) {
      const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'pp-tab'; tab.role = 'tab'; tab.setAttribute('aria-selected', String(active === category.id)); tab.textContent = category.label
      tab.onclick = () => { active = category.id; render() }; tabs.append(tab)
    }
    grid.replaceChildren()
    for (const slot of PAINTER_SLOTS.filter(item => item.group === active)) {
      const section = document.createElement('section'); section.className = 'pp-slot'; section.setAttribute('aria-label', `${slot.label} options`)
      const heading = document.createElement('h2'); heading.textContent = slot.label; section.append(heading)
      const cards = document.createElement('div'); cards.className = 'pp-grid'; section.append(cards); grid.append(section)
      const addCard = (id: string | null, name: string, description: string, rarity: string, badge: string, owned: boolean, price: string, onAction: () => void, disabled = false) => {
        const card = document.createElement('article'); card.className = 'pp-card'; card.tabIndex = 0
        const kind = document.createElement('span'); kind.className = 'pp-kind'; kind.textContent = `${slot.label} · ${rarity} · ${badge}`
        const title = document.createElement('h3'); title.textContent = name
        const body = document.createElement('p'); body.textContent = description
        const action = document.createElement('button'); action.type = 'button'; action.className = owned ? 'pp-action' : 'pp-buy'; action.textContent = selected[slot.id] === id || !id && !selected[slot.id] ? 'Equipped' : owned ? badge === 'dev session' ? 'Equip · session' : 'Equip' : price; action.disabled = disabled || selected[slot.id] === id || !id && !selected[slot.id]; action.onclick = onAction
        card.append(kind,title,body,action); cards.append(card)
        const show = () => paintPreview({ ...selected, [slot.id]: id ?? undefined }, name)
        card.addEventListener('pointerenter',show); card.addEventListener('focusin',show)
        card.addEventListener('pointerleave',() => paintPreview(selected)); card.addEventListener('focusout',() => paintPreview(selected))
      }
      addCard(null,'Original',`The original ${slot.label.toLowerCase()} finish.`, 'Common','owned',true,'',() => equip(slot.id,null))
      addCard(slot.starter.id,slot.starter.name,slot.starter.description,'Common','owned',true,'',() => equip(slot.id,slot.starter.id))
      if (slot.id === 'eye.pupil') for (const type of PAINTER_EYE_TYPES.filter(item => item.id !== 'round')) addCard(type.id,type.name,type.description,'Common','owned',true,'',() => equip(slot.id,type.id))
      if (slot.id === 'eye.iris') for (const color of TEAR_IRIS_COLORS) {
        const devAccess = isPainterDevSession() && !tearWallet.owned.includes(color.id), owned = tearWallet.owned.includes(color.id) || devAccess
        addCard(color.id,color.name,color.description,'Uncommon',devAccess ? 'dev session' : owned ? 'owned' : `${TEARS_PER_IRIS} tears`,owned,`Unlock · ${TEARS_PER_IRIS} tears`,() => {
          if (owned) { equip(slot.id,color.id); return }
          const purchase = buyTearIris(tearWallet,color.id)
          if (!purchase.ok) { status.textContent = `Collect ${Math.max(0,TEARS_PER_IRIS-tearWallet.tears)} more tears.`; return }
          tearWallet = purchase.wallet
          if (!saveTearEyeWallet(tearWallet)) { tearWallet = loadTearEyeWallet(); status.textContent = 'Could not save this iris unlock.'; return }
          equip(slot.id,color.id)
        },!owned && tearWallet.tears < TEARS_PER_IRIS)
      }
      for (const product of PONG_PAINTER_PRODUCTS.filter(item => productSlot(item) === slot.id)) {
        const sku = painterSku(product), item = shop.catalog.get(sku), devAccess = isPainterDevSession() && !shop.owned.has(sku), owned = shop.owned.has(sku) || devAccess
        addCard(product.id,product.name,product.description,product.rarity,devAccess ? 'dev session' : owned ? 'owned' : item ? `${item.price.toLocaleString()} LokTokens` : 'unavailable',owned,shop.signedIn ? item ? `Buy · ${item.price.toLocaleString()} LokTokens` : 'Unavailable' : shop.authAvailable ? 'Sign in to buy' : 'Store unavailable',() => {
          if (owned) equip(slot.id,product.id)
          else if (shop.signedIn && item) void purchase(product)
          else { signInRequested = true; signIn.hidden = false; email.focus() }
        }, !owned && (busy || !shop.authAvailable || !item))
      }
    }
    signIn.hidden = !shop.authAvailable || shop.signedIn || !signInRequested
    status.textContent ||= falls < PONG_PAINTER_UNLOCK_FALLS ? 'PongPainter unlocks after your first completed fall. Preview is read-only until then.' : shop.error ?? ''
  }
  const equip = (category: PainterSlot, item: string | null) => {
    if (falls < PONG_PAINTER_UNLOCK_FALLS) { status.textContent = 'Complete one fall to unlock PongPainter.'; return }
    if (item) {
      const starter = PAINTER_SLOTS.find(slot => slot.id === category)?.starter.id === item
      const pupil = category === 'eye.pupil' && PAINTER_EYE_TYPES.some(type => type.id === item)
      const iris = category === 'eye.iris' && TEAR_IRIS_COLORS.some(color => color.id === item && (tearWallet.owned.includes(color.id) || isPainterDevSession()))
      const product = PONG_PAINTER_PRODUCTS.find(product => productSlot(product) === category && product.id === item && (shop.owned.has(painterSku(product)) || isPainterDevSession()))
      if (!starter && !pupil && !iris && !product) { status.textContent = 'This paint is not owned.'; return }
    }
    const next: PainterSelection = { ...selected }
    if (item) next[category] = item; else delete next[category]
    selected = next
    status.textContent = savePainterSelection(selected) ? 'Look saved. It applies to your next fall.' : 'Could not save the look on this device.'
    queueCloudSync()
    render()
  }
  const purchase = async (product: typeof PONG_PAINTER_PRODUCTS[number]) => {
    busy = true; status.textContent = 'Contacting LokServer…'; render()
    const result = await buyPainterProduct(product)
    if (dead) return
    busy = false
    if (!result.ok) status.textContent = result.error.toLowerCase().includes('insufficient') ? 'Not enough LokTokens for this paint.' : result.error.includes('unknown_item') ? 'This paint has not been added to the live LOK catalog yet.' : result.error === 'already_owned' ? 'Already owned; refresh your paint shelf.' : 'Purchase did not complete. No paint was granted; check your connection and try again.'
    else { status.textContent = `${product.name} added to your account collection.`; say.textContent = 'The paint is yours. Pick it from the shelf when you are ready.'; shop = await loadLokShop() }
    if (!dead) render()
  }
  signIn.onsubmit = async event => {
    event.preventDefault(); if (!email.reportValidity()) return
    signInButton.disabled = true; status.textContent = 'Sending a secure sign-in link…'
    try { await sendLokSignIn(email.value); status.textContent = 'Check your email, open the link, then return to PongPainter.' }
    catch (error) { status.textContent = error instanceof Error ? error.message : 'Could not send the sign-in link.' }
    signInButton.disabled = false
  }
  root.append(venue.element, back, supporters, wallet, title, sub, server, topics, loadout, tabs, grid, status, signIn, note); parent.append(style, root)
  const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
  window.addEventListener('keydown', closeOnEscape)
  let refreshTimer = 0
  if (falls >= PONG_PAINTER_UNLOCK_FALLS) {
    const refresh = () => void loadLokShop().then(snapshot => { if (!dead) { shop = snapshot; if (snapshot.error) status.textContent = snapshot.error; else if (!snapshot.authAvailable) status.textContent = 'Enable LOK account configuration to browse the shared catalog and spend tokens.'; render() } })
    refresh(); refreshTimer = window.setInterval(refresh, 10 * 60 * 1000)
  }
  else render()
  back.focus()
  return () => { dead = true; window.clearInterval(refreshTimer); window.removeEventListener('keydown', closeOnEscape); venue.destroy(); root.remove(); style.remove() }
}
