// Bug sweep: opens the built game on desktop, phone and with reduced motion, in both menu styles, several themes and languages, and reports console
// errors, failed requests, horizontal overflow and pages that do not open. Usage: node scripts/sweep.mjs [baseUrl]   (needs playwright-core and a running preview)
import { chromium } from 'playwright-core'
import fs from 'node:fs'
const base = process.argv[2] ?? 'http://localhost:4173'
const exe = process.env.CHROMIUM_PATH ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const issues = new Map()
const note = (where, what) => { const k = `${where}: ${what}`; issues.set(k, (issues.get(k) ?? 0) + 1) }
const IGNORE = /GL Driver Message|lok_supporter_feed|Failed to load resource: the server responded with a status of 404/
async function visit(name, ctxOpts, init, steps) {
  const ctx = await b.newContext(ctxOpts); await ctx.addInitScript(i => { for (const [k, v] of Object.entries(i)) localStorage.setItem(k, v) }, { 'pongfall.progress': JSON.stringify({ falls: 20 }), ...init })
  const p = await ctx.newPage()
  p.on('pageerror', e => note(name, 'pageerror ' + String(e).slice(0, 120))); p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) note(name, 'console ' + m.text().slice(0, 120)) })
  p.on('response', r => { if (r.status() >= 400 && !IGNORE.test(r.url())) note(name, `${r.status()} ${r.url().slice(0, 100)}`) })
  try { await steps(p) } catch (e) { note(name, 'step failed ' + String(e.message).split('\n')[0]) }
  const over = await p.evaluate(() => { const w = document.documentElement.clientWidth; return document.documentElement.scrollWidth > w + 2 ? document.documentElement.scrollWidth : 0 }).catch(() => 0)
  if (over) note(name, `horizontal overflow ${over}px`)
  await ctx.close()
}
const click = (p, id) => p.evaluate(i => document.querySelector(`.wm-sr button[data-id="${i}"]`)?.click(), id)
const worldTour = async p => { await p.goto(base + '/'); await p.waitForTimeout(2000); for (const id of ['sign:mode', 'sign:difficulty', 'sign:arenas']) { await click(p, id); await p.waitForTimeout(250) } await p.keyboard.press('Escape')
  for (const id of ['prop:stats', 'prop:easel', 'prop:wardrobe', 'prop:eye', 'prop:gear', 'prop:cassette', 'prop:door', 'prop:flask', 'prop:pack']) { await click(p, id); await p.waitForTimeout(1600); const open = await p.evaluate(() => !!document.querySelector('.wm-pages.open')); if (!open) note('tour', `${id} did not open`); else { const h = await p.evaluate(() => { const r = document.querySelector('.wm-pages.open').getBoundingClientRect(); return Math.round(Math.min(r.height, r.width)) }); if (h < 200) note('tour', `${id} opened a collapsed page (${h}px)`) } await p.keyboard.press('Escape'); await p.waitForTimeout(600); if (await p.evaluate(() => !!document.querySelector('.wm-pages.open'))) note('tour', `${id} did not close with Esc`) } }
const matchTour = async p => { await p.goto(base + '/?mode=classic&diff=chill&menu=0'); await p.waitForTimeout(2500); await p.keyboard.press('p'); await p.waitForTimeout(1200)
  for (const l of ['Settings', 'Keyboard controls', 'Music', 'Arena Sides', 'Save match', 'Rules']) { await p.evaluate(x => Array.from(document.querySelectorAll('[data-pf=pause-menu] button')).find(b => b.textContent.startsWith(x))?.click(), l); await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (!(await p.evaluate(() => getComputedStyle(document.querySelector('[data-pf=pause-menu]')).display !== 'none'))) await p.keyboard.press('p') } }
const D = { viewport: { width: 1280, height: 800 } }, M = { viewport: { width: 390, height: 844 }, hasTouch: true }
await visit('desktop world', D, {}, async p => { await worldTour(p); await matchTour(p) })
await visit('phone world', M, {}, async p => { await worldTour(p); await matchTour(p) })
await visit('reduced motion', { ...D, reducedMotion: 'reduce' }, {}, worldTour)
await visit('original menu', D, { 'pongfall.settings': JSON.stringify({ menuStyle: 'classic' }) }, async p => { await p.goto(base + '/'); await p.waitForTimeout(3000); await p.evaluate(() => document.querySelector('button')?.click()); await p.waitForTimeout(1500); await matchTour(p) })
for (const [theme, lang] of [['frost', 'de'], ['blueprint', 'ja'], ['dusk', 'es'], ['graphite', 'fr'], ['gold', 'pt-BR'], ['terminal', 'ko'], ['paper', 'zh-CN']]) await visit(`theme ${theme} / ${lang}`, D, { 'pongfall.settings': JSON.stringify({ uiTheme: theme }), 'pongfall.lang': lang }, async p => { await p.goto(base + '/'); await p.waitForTimeout(2200); await click(p, 'sign:mode'); await p.waitForTimeout(300); await p.screenshot({ path: `/tmp/claude-0/sweep-${theme}-${lang}.png` }) })
await b.close()
console.log(issues.size ? [...issues].map(([k, n]) => `${n}x ${k}`).join('\n') : 'no issues found')
