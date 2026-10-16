// Opens the running game in a browser, visits every screen it can reach in record mode (?l10n=record) and merges every string the auto-translation
// runtime saw into the catalogue (public/locales/auto/en.json). Usage: tsx scripts/crawl-strings.ts [--url http://localhost:4173]
// The static scan (scan-strings.ts) covers rarely reached text; this covers what the game really shows, canvas text included.
import fs from 'node:fs'
import { chromium, type Page, type BrowserContext } from 'playwright-core'
import { readCatalog, writeCatalog } from './scan-strings'

const base = (process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:4173')!.replace(/\/$/, '')
const exe = process.env.CHROMIUM_PATH ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
const NAMES = /\b[A-Z]{3,8}-\d{2,3}\b/                      // generated NPC names are not text to translate

const found: Record<string, string> = {}
const collect = async (page: Page) => {
  const seen = await page.evaluate(() => (window as unknown as { __pfL10nSeen?: Record<string, string> }).__pfL10nSeen ?? {}).catch(() => ({}))
  for (const [k, v] of Object.entries(seen)) if (!NAMES.test(v)) found[k] = v
}
const pause = (page: Page, ms: number) => page.waitForTimeout(ms)
const clickAll = async (page: Page, selector: string, limit = 20) => {
  const n = Math.min(limit, await page.locator(selector).count().catch(() => 0))
  for (let i = 0; i < n; i++) { await page.locator(selector).nth(i).click({ timeout: 800, force: true }).catch(() => null); await pause(page, 150) }
}

async function scene(ctx: BrowserContext, name: string, url: string, steps: (page: Page) => Promise<void>) {
  const page = await ctx.newPage()
  page.on('dialog', d => void d.dismiss())
  try {
    await page.goto(`${base}${url}${url.includes('?') ? '&' : '?'}l10n=record`, { waitUntil: 'load' }); await pause(page, 2200)
    await collect(page); await steps(page); await collect(page)
    console.log(`crawl: ${name} -> ${Object.keys(found).length} strings so far`)
  } catch (e) { console.warn(`crawl: ${name} failed: ${(e as Error).message.split('\n')[0]}`) }
  await page.close()
}
const progress = (falls: number, dev = false) => `try{localStorage.setItem('pongfall.progress',JSON.stringify({falls:${falls}}));${dev ? "localStorage.setItem('pongfall.devMode','true');" : ''}}catch(e){}`

async function main() {
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const veteran = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await veteran.addInitScript(progress(12, true))
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); await phone.addInitScript(progress(12, true))

  await scene(fresh, 'menu, first visit', '/', async p => { await pause(p, 1500) })
  await scene(phone, 'menu, phone', '/', async p => { await pause(p, 1000) })
  await scene(veteran, 'menu, every sign and object', '/', async p => {
    for (const sign of ['mode', 'difficulty', 'arenas']) { await p.evaluate(id => (document.querySelector(`.wm-sr button[data-id="${id}"]`) as HTMLElement | null)?.click(), `sign:${sign}`); await pause(p, 400); await collect(p) }
    await p.keyboard.press('Escape')
    const ids = await p.locator('.wm-sr button[data-id^="prop:"]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.id!))
    for (const id of ids) {
      await p.evaluate(i => (document.querySelector(`.wm-sr button[data-id="${i}"]`) as HTMLElement | null)?.click(), id); await pause(p, 1800)
      await clickAll(p, '.wm-pages summary, .wm-pages [role=tab], .wm-pages [aria-expanded=false]', 12)
      await collect(p); await p.keyboard.press('Escape'); await pause(p, 700)
      if (await p.locator('[data-pf=main-menu]').count()) await p.locator('[data-pf=main-menu] button', { hasText: /back/i }).first().click({ timeout: 800 }).catch(() => null)
      await pause(p, 400)
    }
  })
  await scene(veteran, 'classic menu', '/?menu=classic', async p => {
    const n = Math.min(24, await p.locator('[data-pf=main-menu] button').count())
    for (let i = 0; i < n; i++) {
      await p.locator('[data-pf=main-menu] button').nth(i).click({ timeout: 800, force: true }).catch(() => null); await pause(p, 500); await collect(p)
      await p.keyboard.press('Escape'); await pause(p, 200)
    }
  })
  await scene(veteran, 'match and pause world', '/?mode=classic&diff=chill&menu=0', async p => {
    await pause(p, 2500); await p.keyboard.press('p'); await pause(p, 1500); await collect(p)
    for (const label of ['Settings', 'Keyboard controls', 'Music', 'Arena Sides', 'Save match']) {
      await p.evaluate(l => { const b = Array.from(document.querySelectorAll('[data-pf=pause-menu] button')).find(x => (x.textContent ?? '').startsWith(l)) as HTMLElement | undefined; b?.click() }, label)
      await pause(p, 1200); await clickAll(p, '[data-pf=settings] summary, [role=tab]', 10); await collect(p)
      await p.keyboard.press('Escape'); await pause(p, 700)
      if (!(await p.locator('[data-pf=pause-menu][data-world]').isVisible().catch(() => false))) await p.keyboard.press('p')
      await pause(p, 600)
    }
  })
  await scene(veteran, 'end of a match', '/?mode=timed&diff=chill&time=3&menu=0', async p => { await pause(p, 6000) })
  await scene(veteran, 'sandbox lab', '/?mode=sandbox&menu=0', async p => { await pause(p, 2500); await clickAll(p, '[data-pf=lab] button, [data-pf=lab] summary', 30) })
  await scene(veteran, 'versus', '/?mode=versus&menu=0', async p => { await pause(p, 2500) })
  await scene(veteran, 'duo fall', '/?mode=duo-fall&menu=0', async p => { await pause(p, 2500) })
  await scene(fresh, 'solo fall (first match)', '/?mode=solo-fall&menu=0', async p => { await pause(p, 3000) })
  await scene(fresh, 'rules page', '/rules.html', async p => { await pause(p, 800) })
  await scene(fresh, 'dev notes page', '/about.html', async p => { await pause(p, 800) })
  await browser.close()

  const cur = readCatalog()
  const added = Object.keys(found).filter(k => !(k in cur)).length
  writeCatalog({ ...cur, ...found })
  console.log(`crawl: ${Object.keys(found).length} strings seen, ${added} new, catalogue now ${Object.keys({ ...cur, ...found }).filter(k => !k.startsWith('_')).length}`)
}
void main()
