import { CHANGELOG, CURRENT_VERSION } from '../changelog'
import { createFx, feedFx } from '../render/eyes'
import { newCamera, renderWorld } from '../render/draw'
import { FIXED_DT } from '../sim/tuning'
import { createIntroAttractWorld, stepIntroAttractWorld } from './introAttract'

const INTRO_KEY = 'pongfall.introSettings'
const COLORWAYS = [
  { name: 'Shaft blue', accent: '#63b4ff', glow: 'rgba(67,153,255,.28)' },
  { name: 'Watching green', accent: '#88f0c0', glow: 'rgba(52,186,137,.25)' },
  { name: 'Falling gold', accent: '#ffe08a', glow: 'rgba(222,160,51,.24)' },
]
const LINES = [
  'HOLD THE GLASS. KEEP FALLING.',
  'THE WALLS HAVE EYES.',
  'ONE MORE POINT. ONE MORE SECOND.',
  'THE SHAFT REMEMBERS EVERY FALL.',
  'SCORE BIG ENOUGH TO STOP THE DROP.',
]

interface IntroPrefs { demo: boolean; reduceMotion?: boolean; colorway: number }
function readPrefs(): IntroPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(INTRO_KEY) ?? '{}') as Partial<IntroPrefs>
    return { demo: v.demo !== false, reduceMotion: v.reduceMotion, colorway: Number.isInteger(v.colorway) ? ((v.colorway! % COLORWAYS.length) + COLORWAYS.length) % COLORWAYS.length : 0 }
  } catch { return { demo: true, colorway: 0 } }
}
function savePrefs(prefs: IntroPrefs) { try { localStorage.setItem(INTRO_KEY, JSON.stringify(prefs)) } catch { /* local play still works when storage is unavailable */ } }
function systemReducedMotion() { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export interface IntroScreenOptions { onStart(): void }

/** The persistent title/attract layer before the eye menu. */
export function createIntroScreen(host: HTMLElement, options: IntroScreenOptions) {
  const prefs = readPrefs()
  let reduceMotion = prefs.reduceMotion ?? systemReducedMotion()
  let demoEnabled = prefs.demo
  let colorway = prefs.colorway
  let lineIndex = Math.floor(Math.random() * LINES.length)
  let started = false, dead = false
  const root = document.createElement('section'); root.className = 'pf-intro'; root.dataset.pf = 'intro'
  root.style.cssText = `position:fixed;inset:0;z-index:45;overflow:hidden;display:grid;place-items:center;background:#05080e;color:#eaf3ff;font:16px system-ui,sans-serif;opacity:1;transition:opacity .55s ease;--pf-accent:${COLORWAYS[colorway]!.accent};--pf-glow:${COLORWAYS[colorway]!.glow}`
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.66'
  const shade = document.createElement('div'); shade.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 12%,rgba(3,6,12,.25) 48%,rgba(3,6,12,.93) 100%),linear-gradient(0deg,rgba(3,6,12,.72),transparent 72%)'
  const content = document.createElement('div'); content.style.cssText = 'position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:14px;width:min(92vw,720px);padding:28px 18px;text-align:center;transition:transform .65s ease,opacity .55s ease'
  const eyebrow = document.createElement('div'); eyebrow.textContent = 'A GSIX DESIGNS GAME · LOK ECOSYSTEM'; eyebrow.style.cssText = 'color:var(--pf-accent);font:700 11px system-ui;letter-spacing:.24em;text-transform:uppercase'
  const title = document.createElement('h1'); title.textContent = 'PONGFALL'; title.tabIndex = 0; title.setAttribute('aria-label', 'PongFall title. You can drag it and let it spring back.')
  title.style.cssText = 'margin:0;color:#e9f1ff;font:900 clamp(54px,13vw,118px)/.95 system-ui;letter-spacing:.11em;text-shadow:0 8px 0 #172235,0 0 44px var(--pf-glow);cursor:grab;touch-action:none;user-select:none'
  const tagline = document.createElement('p'); tagline.setAttribute('aria-live', 'polite'); tagline.style.cssText = 'min-height:1.5em;margin:0;color:var(--pf-accent);font:700 clamp(12px,2vw,16px) ui-monospace,monospace;letter-spacing:.2em'
  const description = document.createElement('p'); description.innerHTML = 'Two paddles, one falling arena.<br>Watch the shaft play before you enter it.'; description.style.cssText = 'margin:0;color:#c1cede;font:15px/1.6 system-ui;max-width:42ch;text-shadow:0 1px 8px #000'
  const start = document.createElement('button'); start.type = 'button'; start.dataset.pf = 'intro-start'; start.textContent = 'ENTER THE FALL  ↓'
  start.style.cssText = 'min-width:230px;min-height:54px;padding:13px 24px;border:2px solid var(--pf-accent);border-radius:10px;background:rgba(10,16,25,.92);color:#f5f8ff;font:800 16px system-ui;letter-spacing:.12em;cursor:pointer;box-shadow:0 0 24px var(--pf-glow)'
  const nav = document.createElement('div'); nav.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px'
  const actionButton = (label: string, action: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'border:1px solid #50627b;border-radius:8px;background:rgba(11,17,26,.85);color:#dce9f8;padding:8px 12px;font:600 12px system-ui;cursor:pointer'; b.onclick = action; return b }
  const fieldManual = document.createElement('a'); fieldManual.href = '/rules.html'; fieldManual.textContent = '📖 Shaft Field Manual'; fieldManual.style.cssText = 'border:1px solid #50627b;border-radius:8px;background:rgba(11,17,26,.85);color:#dce9f8;padding:8px 12px;font:600 12px system-ui;text-decoration:none'
  const updates = actionButton('📰 Version notes', () => showUpdates())
  const color = actionButton('🎨 Shift the light', () => { colorway = (colorway + 1) % COLORWAYS.length; applyColor(); savePrefs({ demo: demoEnabled, reduceMotion, colorway }) })
  const motion = actionButton('', () => { reduceMotion = !reduceMotion; prefs.reduceMotion = reduceMotion; savePrefs({ demo: demoEnabled, reduceMotion, colorway }); syncControls(); drawFrame(performance.now()) })
  const demo = actionButton('', () => { demoEnabled = !demoEnabled; prefs.demo = demoEnabled; savePrefs({ demo: demoEnabled, reduceMotion, colorway }); syncControls() })
  nav.append(fieldManual, updates, color, motion, demo)
  const updateDialog = document.createElement('dialog'); updateDialog.dataset.pf = 'intro-updates'; updateDialog.style.cssText = 'width:min(90vw,620px);max-height:80dvh;overflow:auto;border:1px solid #50627b;border-radius:14px;background:#0b111b;color:#e5f1ff;padding:22px;box-shadow:0 20px 70px #000c'
  const latest = [...CHANGELOG].reverse().slice(0, 8)
  updateDialog.innerHTML = `<header style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="color:var(--pf-accent);font:700 11px system-ui;letter-spacing:.2em">THE SHAFT FIELD MANUAL · v${esc(CURRENT_VERSION)}</div><h2 style="margin:4px 0">Recent falls</h2></div><button type="button" data-close aria-label="Close version notes" style="font:22px system-ui;border:1px solid #50627b;border-radius:7px;background:#121b29;color:#e5f1ff;padding:4px 12px;cursor:pointer">×</button></header><div>${latest.map(entry => `<article style="padding:10px 0;border-bottom:1px solid #25364b"><h3 style="margin:0 0 5px;font-size:15px">${esc(entry.title)} <span style="color:#9cabc0;font-size:12px">v${esc(entry.version)}</span></h3><ul style="margin:0;padding-left:20px;color:#bfccdd;font-size:13px;line-height:1.5">${entry.notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></article>`).join('')}</div>`
  updateDialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => updateDialog.close()
  updateDialog.addEventListener('click', e => { if (e.target === updateDialog) updateDialog.close() })
  content.append(eyebrow, title, tagline, description, start, nav)
  root.append(canvas, shade, content, updateDialog); host.appendChild(root)

  const ctx = canvas.getContext('2d')
  let cw = 1, ch = 1, dpr = 1, last = performance.now(), accumulator = 0, raf = 0, resetAt = 0
  const world = { current: createIntroAttractWorld((Math.random() * 0x7fffffff) | 0) }
  let fx = createFx(reduceMotion); fx.fogMode = 'low'
  const camera = newCamera(); camera.lock = 'arena'
  const ro = new ResizeObserver(resize); ro.observe(root)
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const r = root.getBoundingClientRect(); cw = Math.max(1, r.width); ch = Math.max(1, r.height)
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr)
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawFrame(performance.now())
  }
  function applyColor() { root.style.setProperty('--pf-accent', COLORWAYS[colorway]!.accent); root.style.setProperty('--pf-glow', COLORWAYS[colorway]!.glow) }
  function syncControls() {
    motion.textContent = `♿ Reduce motion: ${reduceMotion ? 'on' : 'off'}`
    demo.textContent = `👁 Live demo: ${demoEnabled ? 'on' : 'off'}`
    fx.reduce = reduceMotion
    root.style.transition = reduceMotion ? 'none' : 'opacity .55s ease'
    content.style.transition = reduceMotion ? 'none' : 'transform .65s ease,opacity .55s ease'
    tagline.style.transition = reduceMotion ? 'none' : 'opacity .2s ease'
    canvas.style.opacity = demoEnabled ? '.66' : '.35'
    drawFrame(performance.now())
    if (!reduceMotion && demoEnabled && !document.hidden) animate()
    else cancelAnimationFrame(raf)
  }
  function showUpdates() { updateDialog.showModal() }
  function drawFrame(now: number) {
    if (!ctx || dead) return
    if (!reduceMotion && demoEnabled) {
      const elapsed = Math.min(.1, Math.max(0, (now - last) / 1000)); accumulator += elapsed
      while (accumulator >= FIXED_DT) {
        if (world.current.status === 'over') {
          if (!resetAt) resetAt = now + 1400
          if (now >= resetAt) { world.current = createIntroAttractWorld((Math.random() * 0x7fffffff) | 0); resetAt = 0; fx.fog?.destroy(); fx = createFx(reduceMotion); fx.fogMode = 'low' }
        } else {
          world.current.events.length = 0
          stepIntroAttractWorld(world.current)
          const events = world.current.events.splice(0)
          feedFx(fx, world.current, events, FIXED_DT, now)
          if ((world.current as { status: string }).status === 'over') resetAt = now + 1400
        }
        accumulator -= FIXED_DT
      }
      last = now
    } else last = now
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      renderWorld(ctx, world.current, camera, cw, ch, { paused: false, result: null, best: null, user: null, me: 0, trail: [], now, muted: true, perks: [], hints: false, gauge: false }, fx)
    }
    if (!dead && !reduceMotion && demoEnabled) raf = requestAnimationFrame(drawFrame)
  }
  function animate() { if (dead || reduceMotion || !demoEnabled) return; raf = requestAnimationFrame(drawFrame) }
  const visibility = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); animate() } }
  document.addEventListener('visibilitychange', visibility)
  function startRun() {
    if (started) return
    started = true; start.disabled = true; start.textContent = 'ENTERING THE FALL…'; root.classList.add('leaving')
    root.style.opacity = '0'; content.style.transform = 'translateY(-14px) scale(.98)'; content.style.opacity = '0'
    window.setTimeout(() => { if (!dead) options.onStart() }, reduceMotion ? 0 : 560)
  }
  start.onclick = startRun
  const keyStart = (e: KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && !updateDialog.open && !started && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); startRun() } }
  window.addEventListener('keydown', keyStart)
  // The title is a playful, spring-returning touch target, like 616's intro lockup.
  let drag: { x: number; y: number; ox: number; oy: number } | null = null
  title.addEventListener('pointerdown', e => { if (reduceMotion) return; drag = { x: e.clientX, y: e.clientY, ox: 0, oy: 0 }; title.setPointerCapture(e.pointerId); title.style.cursor = 'grabbing'; title.style.transition = 'none' })
  title.addEventListener('pointermove', e => { if (!drag) return; const dx = Math.max(-48, Math.min(48, e.clientX - drag.x)); const dy = Math.max(-30, Math.min(30, e.clientY - drag.y)); title.style.transform = `translate(${dx}px,${dy}px) rotate(${dx * .08}deg)` })
  const releaseTitle = () => { if (!drag) return; drag = null; title.style.cursor = 'grab'; title.style.transition = 'transform .55s cubic-bezier(.2,.8,.2,1)'; title.style.transform = '' }
  title.addEventListener('pointerup', releaseTitle); title.addEventListener('pointercancel', releaseTitle)
  const cycleLine = window.setInterval(() => { if (dead || reduceMotion) return; lineIndex = (lineIndex + 1) % LINES.length; tagline.style.opacity = '0'; window.setTimeout(() => { if (!dead) { tagline.textContent = LINES[lineIndex]!; tagline.style.opacity = '1' } }, 180) }, 6500)
  tagline.textContent = LINES[lineIndex]!
  tagline.style.transition = reduceMotion ? 'none' : 'opacity .2s ease'
  applyColor(); syncControls(); resize(); animate()
  return {
    start: startRun,
    destroy() {
      if (dead) return
      dead = true; cancelAnimationFrame(raf); window.clearInterval(cycleLine); window.removeEventListener('keydown', keyStart); document.removeEventListener('visibilitychange', visibility); ro.disconnect(); fx.fog?.destroy(); updateDialog.close(); root.remove()
    },
  }
}

