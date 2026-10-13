import { walletStripState } from '../../lib/lok-universe/src/wallet'
import { sendLokSignIn } from '../net/playerAuth'
import { buyPainterProduct, loadLokShop, type LokShopSnapshot } from './lokShop'
import { loadPainterSelection, PAINTER_CATEGORIES, PONG_PAINTER_PRODUCTS, PONG_PAINTER_UNLOCK_FALLS, painterSku, randomOwnedPainterSelection, savePainterSelection, type PainterCategory, type PainterSelection } from './pongPainter'
import { queueCloudSync } from './cloudSyncQueue'

const css = `
.pp-back,.pp-tab,.pp-action,.pp-buy{border:1px solid #704c94;background:#100d1d;color:#e8d5ff;border-radius:4px;padding:9px 12px;cursor:pointer;font:700 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}.pp-back:hover,.pp-tab:hover,.pp-action:hover,.pp-buy:hover:not(:disabled){border-color:#67edf0;background:#17182a}.pp-title{margin:14px 0 2px;color:#efdbff;font-size:clamp(27px,6vw,42px);font-weight:900;letter-spacing:.16em;text-shadow:0 0 18px #ab67ee66}.pp-sub{margin:0;color:#a8a6ba;font-size:12px}.pp-wallet,.pp-server{margin-top:12px;padding:12px 14px;border:1px solid #6f4b98;background:#100d1dba;box-shadow:0 0 24px #9b59db16}.pp-wallet{display:flex;justify-content:space-between;gap:10px;align-items:center;color:#d7c8e8;font:700 11px ui-monospace,monospace}.pp-server{display:flex;gap:12px;align-items:center}.pp-eye{width:44px;height:32px;flex:none;border-radius:50%;background:#e5e0d3;border:3px solid #736192;position:relative;box-shadow:0 0 14px #bd79ff70}.pp-eye:before{content:'';position:absolute;inset:6px 12px;border-radius:50%;background:#68b6e7;border:1px solid #29495d}.pp-eye:after{content:'';position:absolute;width:6px;height:6px;left:18px;top:12px;border-radius:50%;background:#08101b}.pp-server p{margin:0}.pp-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;border-bottom:1px solid #543d70;padding-bottom:8px}.pp-tab[aria-selected=true]{border-color:#61e7ef;color:#88f3f0;box-shadow:0 0 12px #64edf044}.pp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,225px),1fr));gap:9px;margin-top:12px}.pp-card{padding:14px;background:linear-gradient(145deg,#151024,#0a0d14);border:1px solid #614780;min-height:142px;display:flex;flex-direction:column}.pp-card h3{margin:0;font-size:14px;letter-spacing:.06em}.pp-card p{flex:1;color:#a8a6ba;font-size:12px;line-height:1.45}.pp-kind{font:700 9px ui-monospace,monospace;color:#8ceced;letter-spacing:.14em;text-transform:uppercase}.pp-buy{width:100%;border-color:#56dfe9;color:#9dfaff}.pp-buy:disabled{opacity:.55;cursor:default}.pp-status{min-height:1.5em;margin-top:12px;color:#9eeaff;font-size:12px}.pp-login{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pp-login input{flex:1;min-width:180px;background:#090b12;color:white;border:1px solid #6b587c;border-radius:4px;padding:9px}.pp-note{color:#918da0;font-size:11px;line-height:1.45}.pp-root button:focus-visible,.pp-root input:focus-visible{outline:2px solid #65f4f2;outline-offset:2px}@media(prefers-reduced-motion:reduce){.pp-root *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
.pp-supporters{margin-top:14px;padding:7px 9px;border:1px solid #30515d;background:#08151bbb;overflow:hidden;color:#78e4ed;font:700 9px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.pp-supporters[hidden]{display:none}.pp-supporters-label{display:block;margin-bottom:5px;color:#b7c5dc;font-size:8px}.pp-supporters-lane{overflow:hidden;white-space:nowrap}.pp-supporters-track{display:inline-flex;min-width:max-content;animation:pp-support-scroll 30s linear infinite}.pp-supporters-item{margin-right:30px;color:#7be9e4}.pp-supporters-item[data-tier=passport]{color:#75baff}.pp-supporters-item[data-tier=lifetime]{color:#ffd279}@keyframes pp-support-scroll{to{transform:translateX(-50%)}}.pp-topics{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.pp-topic{border:1px solid #5a4573;background:#100d1d;color:#a6eaf1;padding:7px 9px;font:700 9px ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}.pp-server-label{display:block;margin-bottom:4px;color:#78e4ed;font:700 9px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}
.pp-loadout{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.pp-loadout .pp-note{align-self:center;margin:0}.pp-sample{height:48px;display:grid;place-items:center;margin:2px 0 10px;border:1px solid #ffffff2b;background:radial-gradient(ellipse at center,#24344a,#0b101b 72%);overflow:hidden}.pp-sample-track{position:relative;width:70%;height:28px;border:1px solid #8091aa55;background:#111a28}.pp-sample-track:before{content:'';position:absolute;left:5px;top:7px;width:4px;height:14px;background:var(--sample-paddle,#e9f2ff);border-radius:2px;box-shadow:calc(100% - 14px) 0 0 var(--sample-paddle,#e9f2ff)}.pp-sample-track:after{content:'';position:absolute;left:50%;top:10px;width:7px;height:7px;border-radius:50%;background:var(--sample-ball,#fff);box-shadow:0 0 9px var(--sample-ball,#fff)}
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
  const sub = document.createElement('p'); sub.className = 'pp-sub'; sub.slot = 'subtitle'; sub.textContent = 'LokServer’s paint counter · account-wide purchases · synced look when account saves are enabled'
  const wallet = document.createElement('div'); wallet.className = 'pp-wallet'; wallet.slot = 'wallet'; wallet.setAttribute('aria-live', 'polite')
  const server = document.createElement('section'); server.className = 'pp-server'; server.slot = 'host'; server.setAttribute('aria-live', 'polite')
  const eye = document.createElement('span'); eye.className = 'pp-eye'; eye.setAttribute('aria-hidden', 'true')
  const serverLabel = document.createElement('span'); serverLabel.className = 'pp-server-label'; serverLabel.textContent = 'LokServer · Paint counter'
  const say = document.createElement('p'); say.textContent = 'A new coat changes the light. The fall underneath stays the same.'
  const serverCopy = document.createElement('div'); serverCopy.append(serverLabel, say); server.append(eye, serverCopy)
  const topics = document.createElement('div'); topics.className = 'pp-topics'; topics.slot = 'topics'; topics.setAttribute('aria-label', 'Ask LokServer')
  for (const [label, message] of [['WHAT CHANGES?', 'Paint changes the look of your fall. Ball speed, scoring and collision stay exactly the same.'], ['WHERE IS MY PAINT?', 'Purchases belong to your LOK account. The look you equip syncs with your account when cloud sync is available.'], ['LOKTOKENS', 'PongFall matches do not grant LokTokens. Purchases use the shared LOK catalog and wallet.']] as const) {
    const topic = document.createElement('button'); topic.type = 'button'; topic.className = 'pp-topic'; topic.textContent = label; topic.onclick = () => { say.textContent = message }; topics.append(topic)
  }
  const tabs = document.createElement('div'); tabs.className = 'pp-tabs'; tabs.slot = 'tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Customization categories')
  const loadout = document.createElement('div'); loadout.className = 'pp-loadout'; loadout.slot = 'tabs'
  const randomize = document.createElement('button'); randomize.type = 'button'; randomize.className = 'pp-action'; randomize.textContent = '✦ Random owned look'
  randomize.setAttribute('aria-label', 'Randomize equipped cosmetics using owned items')
  randomize.onclick = () => { const next = randomOwnedPainterSelection(shop.owned); if (!Object.keys(next).length) { status.textContent = 'Your collection is ready for its first paint.'; return } selected = next; status.textContent = savePainterSelection(selected) ? 'A fresh owned look is ready for your next fall.' : 'Could not save the look on this device.'; queueCloudSync(); render() }
  const clearLook = document.createElement('button'); clearLook.type = 'button'; clearLook.className = 'pp-action'; clearLook.textContent = 'Reset all paint'; clearLook.onclick = () => { selected = {}; status.textContent = savePainterSelection(selected) ? 'Original colors restored for every slot.' : 'Could not save the look on this device.'; queueCloudSync(); render() }
  loadout.append(randomize, clearLook)
  const grid = document.createElement('div'); grid.className = 'pp-grid'; grid.slot = 'items'
  const status = document.createElement('div'); status.className = 'pp-status'; status.slot = 'status'; status.setAttribute('role', 'status')
  const note = document.createElement('p'); note.className = 'pp-note'; note.slot = 'footer'; note.textContent = 'LokTokens are spent by the shared LOK store. Paint never changes match physics. Bought items follow your LOK account; your equipped look saves locally and syncs when PongFall account saves are enabled.'
  const signIn = document.createElement('form'); signIn.className = 'pp-login'; signIn.slot = 'footer'; signIn.hidden = true
  const email = document.createElement('input'); email.type = 'email'; email.required = true; email.autocomplete = 'email'; email.placeholder = 'LOK account email'; email.setAttribute('aria-label', 'LOK account email')
  const signInButton = document.createElement('button'); signInButton.type = 'submit'; signInButton.className = 'pp-action'; signInButton.textContent = 'Email sign-in link'; signIn.append(email, signInButton)
  let selected = loadPainterSelection(), shop = { authAvailable: false, signedIn: false, balance: null, owned: new Set<string>(), catalog: new Map(), supporters: [], error: null } as LokShopSnapshot
  let active: PainterCategory = 'theme', busy = false, dead = false, signInRequested = false
  const render = () => {
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
    wallet.append(balance, auth)
    if (shop.authAvailable && !shop.signedIn) { const login = document.createElement('button'); login.type = 'button'; login.className = 'pp-action'; login.textContent = 'Sign in'; login.onclick = () => { signInRequested = true; render(); email.focus() }; wallet.append(login) }
    tabs.replaceChildren()
    for (const category of PAINTER_CATEGORIES) {
      const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'pp-tab'; tab.role = 'tab'; tab.setAttribute('aria-selected', String(active === category.id)); tab.textContent = category.label
      tab.onclick = () => { active = category.id; render() }; tabs.append(tab)
    }
    grid.replaceChildren()
    const baseline = document.createElement('article'); baseline.className = 'pp-card'
    const baselineType = document.createElement('span'); baselineType.className = 'pp-kind'; baselineType.textContent = 'DEFAULT LOOK'
    const baselineName = document.createElement('h3'); baselineName.textContent = 'Original Shaft'
    const baselineText = document.createElement('p'); baselineText.textContent = 'Return this part to its original PongFall colors.'
    const baselineButton = document.createElement('button'); baselineButton.type = 'button'; baselineButton.className = 'pp-action'; baselineButton.textContent = !selected[active] ? 'Equipped' : 'Use original'
    baselineButton.disabled = !selected[active]
    baselineButton.onclick = () => equip(active, null)
    baseline.append(baselineType, baselineName, baselineText, baselineButton); grid.append(baseline)
    for (const product of PONG_PAINTER_PRODUCTS.filter(item => item.category === active)) {
      const sku = painterSku(product), item = shop.catalog.get(sku), owned = shop.owned.has(sku)
      const card = document.createElement('article'); card.className = 'pp-card'
      const kind = document.createElement('span'); kind.className = 'pp-kind'; kind.textContent = `${product.category} · ${product.rarity}`
      const name = document.createElement('h3'); name.textContent = product.name
      const description = document.createElement('p'); description.textContent = product.description
      const swatch = document.createElement('span'); swatch.className = 'pp-sample'; swatch.setAttribute('aria-label', `${product.category} appearance preview`)
      const sample = document.createElement('span'); sample.className = 'pp-sample-track'
      const color = product.category === 'theme' ? '#a88cff' : product.category === 'paddle' ? product.value : '#e9f2ff'
      const ballColor = product.category === 'ball' ? product.value : '#ffffff'
      const accent = product.category === 'theme' ? 'linear-gradient(90deg,#51d9d2,#555af7,#da77ff)' : product.value
      swatch.style.background = `radial-gradient(ellipse at center, ${product.category === 'theme' ? '#262047' : '#24344a'}, #0b101b 72%)`
      swatch.style.borderColor = product.category === 'glass' || product.category === 'arena' || product.category === 'eye' || product.category === 'tear' ? `${product.value}99` : '#ffffff2b'
      sample.style.setProperty('--sample-paddle', color); sample.style.setProperty('--sample-ball', ballColor)
      sample.style.borderColor = `${product.category === 'glass' || product.category === 'arena' ? product.value : product.category === 'eye' || product.category === 'tear' ? product.value : '#8091aa'}88`
      if (product.category === 'theme') sample.style.filter = product.value
      swatch.append(sample)
      const action = document.createElement('button'); action.type = 'button'; action.className = 'pp-buy'
      const price = item ? `${item.price.toLocaleString()} LokTokens` : 'Not in live catalog'
      if (owned) { action.className = 'pp-action'; action.textContent = selected[active] === product.id ? 'Equipped' : 'Equip'; action.onclick = () => equip(active, product.id) }
      else { action.textContent = shop.signedIn ? item ? `Buy · ${price}` : 'Catalog item pending' : shop.authAvailable ? `Sign in · ${price}` : 'LOK store unavailable'; action.disabled = busy || !shop.authAvailable || !item; action.onclick = () => { if (shop.signedIn) void purchase(product); else { signInRequested = true; signIn.hidden = false; email.focus() } } }
      card.append(kind, name, description, swatch, action); grid.append(card)
    }
    signIn.hidden = !shop.authAvailable || shop.signedIn || !signInRequested
    status.textContent ||= falls < PONG_PAINTER_UNLOCK_FALLS ? 'PongPainter unlocks after your first completed fall. Preview is read-only until then.' : shop.error ?? ''
  }
  const equip = (category: PainterCategory, item: string | null) => {
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
  root.append(back, supporters, wallet, title, sub, server, topics, loadout, tabs, grid, status, signIn, note); parent.append(style, root)
  const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
  window.addEventListener('keydown', closeOnEscape)
  let refreshTimer = 0
  if (falls >= PONG_PAINTER_UNLOCK_FALLS) {
    const refresh = () => void loadLokShop().then(snapshot => { if (!dead) { shop = snapshot; if (snapshot.error) status.textContent = snapshot.error; else if (!snapshot.authAvailable) status.textContent = 'Enable LOK account configuration to browse the shared catalog and spend tokens.'; render() } })
    refresh(); refreshTimer = window.setInterval(refresh, 10 * 60 * 1000)
  }
  else render()
  back.focus()
  return () => { dead = true; window.clearInterval(refreshTimer); window.removeEventListener('keydown', closeOnEscape); root.remove(); style.remove() }
}
