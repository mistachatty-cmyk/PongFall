import { CHANGELOG, CURRENT_VERSION } from '../changelog'
import { createFx, feedFx } from '../render/eyes'
import { newCamera, renderWorld, stepCamera } from '../render/draw'
import { arenaDims } from '../sim/world'
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
  const style = document.createElement('style'); style.textContent = `
    .pf-intro-tools{position:absolute;z-index:4;left:18px;right:18px;bottom:max(14px,env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:12px;pointer-events:none}
    .pf-intro-tools-group{display:flex;flex-wrap:wrap;gap:7px;pointer-events:auto}
    .pf-intro-tools-compact button{padding:5px 7px!important;font-size:10px!important;white-space:nowrap}
    .pf-intro-tools button,.pf-intro-tools a{opacity:.72;transition:opacity .2s,border-color .2s}
    .pf-intro-tools button:hover,.pf-intro-tools a:hover,.pf-intro-tools button:focus-visible,.pf-intro-tools a:focus-visible{opacity:1}
    @media(max-width:640px){.pf-intro-tools{left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));justify-content:center;gap:6px}.pf-intro-tools-group{justify-content:center;gap:5px}}
    @media(max-height:560px){.pf-intro-content{top:12px!important;gap:4px!important}.pf-intro-start{min-height:46px!important;margin-top:6px!important}.pf-intro-tools{bottom:6px}}
    @media(prefers-reduced-motion:reduce){.pf-intro-tools button,.pf-intro-tools a{transition:none}}
  `
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.9'
  const shade = document.createElement('div'); shade.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(3,6,12,.02) 18%,rgba(3,6,12,.12) 54%,rgba(3,6,12,.58) 100%),linear-gradient(180deg,rgba(3,6,12,.46),transparent 38%,rgba(3,6,12,.15) 72%,rgba(3,6,12,.52))'
  const content = document.createElement('div'); content.className = 'pf-intro-content'; content.style.cssText = 'position:absolute;z-index:2;top:clamp(8px,2vh,20px);left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:7px;width:min(94vw,900px);padding:8px 18px;text-align:center;transition:transform .65s ease,opacity .55s ease'
  const eyebrow = document.createElement('div'); eyebrow.textContent = 'A GSIX DESIGNS GAME · LOK ECOSYSTEM'; eyebrow.style.cssText = 'color:var(--pf-accent);font:700 11px system-ui;letter-spacing:.24em;text-transform:uppercase'
  const title = document.createElement('h1'); title.textContent = 'PONGFALL'; title.tabIndex = 0; title.setAttribute('aria-label', 'PongFall title. You can drag it and let it spring back.')
  title.style.cssText = 'margin:0;color:#e9f1ff;font:900 clamp(44px,7vw,82px)/.9 system-ui;letter-spacing:.09em;text-shadow:0 8px 0 #172235,0 0 44px var(--pf-glow);cursor:grab;touch-action:none;user-select:none'
  const hook = document.createElement('p'); hook.textContent = 'WIN. BUT AT WHAT COST?'; hook.style.cssText = 'margin:0;color:#f4f7ff;font:900 clamp(18px,3vw,30px)/1.1 system-ui;letter-spacing:.1em;text-shadow:0 2px 18px var(--pf-glow)'
  const tagline = document.createElement('p'); tagline.setAttribute('aria-live', 'polite'); tagline.style.cssText = 'min-height:1.3em;margin:0;color:var(--pf-accent);font:700 clamp(11px,1.7vw,15px) ui-monospace,monospace;letter-spacing:.18em'
  const description = document.createElement('p'); description.textContent = 'Two paddles. One arena. One way to stop the fall.'; description.style.cssText = 'margin:2px 0 0;color:#d3deed;font:14px/1.5 system-ui;max-width:48ch;text-shadow:0 1px 8px #000'
  const start = document.createElement('button'); start.type = 'button'; start.dataset.pf = 'intro-start'; start.textContent = 'ENTER THE FALL  ↓'
  start.className = 'pf-intro-start'; start.style.cssText = 'min-width:260px;min-height:62px;margin-top:14px;padding:16px 30px;border:2px solid var(--pf-accent);border-radius:12px;background:rgba(7,12,20,.88);color:#f5f8ff;font:850 17px system-ui;letter-spacing:.14em;cursor:pointer;box-shadow:0 0 30px var(--pf-glow)'
  const nav = document.createElement('div'); nav.className = 'pf-intro-tools'
  const navLeft = document.createElement('div'); navLeft.className = 'pf-intro-tools-group'
  const navRight = document.createElement('div'); navRight.className = 'pf-intro-tools-group pf-intro-tools-compact'
  const actionButton = (label: string, action: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'border:1px solid #718198;border-radius:7px;background:rgba(7,12,20,.72);color:#dce9f8;padding:6px 9px;font:600 11px system-ui;cursor:pointer'; b.onclick = action; return b }
  const fieldManual = document.createElement('a'); fieldManual.href = '/rules.html'; fieldManual.textContent = '📖 Field Manual'; fieldManual.style.cssText = 'border:1px solid #718198;border-radius:7px;background:rgba(7,12,20,.72);color:#dce9f8;padding:6px 9px;font:600 11px system-ui;text-decoration:none'
  const updates = actionButton('📰 Patch notes', () => showUpdates())
  const color = actionButton('🎨 Shift the light', () => { colorway = (colorway + 1) % COLORWAYS.length; applyColor(); savePrefs({ demo: demoEnabled, reduceMotion, colorway }) })
  const motion = actionButton('', () => { reduceMotion = !reduceMotion; prefs.reduceMotion = reduceMotion; savePrefs({ demo: demoEnabled, reduceMotion, colorway }); syncControls(); drawFrame(performance.now()) })
  const demo = actionButton('', () => { demoEnabled = !demoEnabled; prefs.demo = demoEnabled; savePrefs({ demo: demoEnabled, reduceMotion, colorway }); syncControls() })
  navLeft.append(fieldManual, updates); navRight.append(color, motion, demo); nav.append(navLeft, navRight)
  const updateDialog = document.createElement('dialog'); updateDialog.dataset.pf = 'intro-updates'; updateDialog.style.cssText = 'width:min(90vw,620px);max-height:80dvh;overflow:auto;border:1px solid #50627b;border-radius:14px;background:#0b111b;color:#e5f1ff;padding:22px;box-shadow:0 20px 70px #000c'
  const latest = [...CHANGELOG].reverse().slice(0, 8)
  updateDialog.innerHTML = `<header style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="color:var(--pf-accent);font:700 11px system-ui;letter-spacing:.2em">SHAFT TRANSMISSION · v${esc(CURRENT_VERSION)}</div><h2 style="margin:4px 0">Patch notes</h2><div style="color:#9cabc0;font:12px system-ui">Recent updates from the fall</div></div><button type="button" data-close aria-label="Close patch notes" style="font:22px system-ui;border:1px solid #50627b;border-radius:7px;background:#121b29;color:#e5f1ff;padding:4px 12px;cursor:pointer">×</button></header><div style="margin-top:12px">${latest.map(entry => `<article style="padding:10px 0;border-bottom:1px solid #25364b"><h3 style="margin:0 0 5px;font-size:15px">${esc(entry.title)} <span style="color:#9cabc0;font-size:12px">v${esc(entry.version)}</span></h3><ul style="margin:0;padding-left:20px;color:#bfccdd;font-size:13px;line-height:1.5">${entry.notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></article>`).join('')}</div>`
  updateDialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => updateDialog.close()
  updateDialog.addEventListener('click', e => { if (e.target === updateDialog) updateDialog.close() })
  content.append(eyebrow, title, hook, tagline, description, start)
  root.append(style, canvas, shade, content, nav, updateDialog); host.appendChild(root)

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
  function scheduleFrame() {
    if (dead || !demoEnabled || document.hidden || raf) return
    raf = requestAnimationFrame(animationFrame)
  }
  function stopFrame() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }
  function syncControls() {
    motion.textContent = `♿ Motion: ${reduceMotion ? 'on' : 'off'}`
    demo.textContent = `👁 Demo: ${demoEnabled ? 'on' : 'off'}`
    fx.reduce = reduceMotion
    root.style.transition = reduceMotion ? 'none' : 'opacity .55s ease'
    content.style.transition = reduceMotion ? 'none' : 'transform .65s ease,opacity .55s ease'
    tagline.style.transition = reduceMotion ? 'none' : 'opacity .2s ease'
    canvas.style.opacity = demoEnabled ? '.66' : '.35'
    // A settings change can happen while a frame is queued. Reset elapsed time
    // so the next tick starts cleanly, then keep exactly one RAF loop alive.
    last = performance.now(); accumulator = 0
    if (!demoEnabled || document.hidden) stopFrame()
    drawFrame(performance.now())
  }
  function showUpdates() { updateDialog.showModal() }
  function drawFrame(now: number) {
    if (!ctx || dead) return
    if (demoEnabled) {
      const elapsed = Math.min(.1, Math.max(0, (now - last) / 1000)); accumulator += elapsed
      while (accumulator >= FIXED_DT) {
        if (world.current.status === 'over') {
          if (!resetAt) resetAt = now + 1400
          if (now >= resetAt) { world.current = createIntroAttractWorld((Math.random() * 0x7fffffff) | 0); resetAt = 0; fx.fog?.destroy(); fx = createFx(reduceMotion); fx.fogMode = 'low' }
        } else {
          world.current.events.length = 0
          stepIntroAttractWorld(world.current)
          // Stay tight on the opening rally. Ease out only when a ball escapes
          // the personal arena; return to the close shot when play comes home.
          const { W } = arenaDims(world.current)
          const escaped = world.current.balls.some(ball => !ball.scored && Math.abs(ball.x) > W / 2 + 24)
          camera.lock = escaped ? 'auto' : 'arena'
          stepCamera(world.current, camera, cw, ch, FIXED_DT)
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
    scheduleFrame()
  }
  function animationFrame(now: number) {
    raf = 0
    drawFrame(now)
  }
  function animate() { scheduleFrame() }
  const visibility = () => { if (document.hidden) stopFrame(); else { last = performance.now(); accumulator = 0; animate() } }
  document.addEventListener('visibilitychange', visibility)
  function startRun() {
    if (started) return
    started = true; start.disabled = true; start.textContent = 'ENTERING THE FALL…'; root.classList.add('leaving')
    root.style.opacity = '0'; content.style.transform = 'translate(-50%,-14px) scale(.98)'; content.style.opacity = '0'
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
      dead = true; stopFrame(); window.clearInterval(cycleLine); window.removeEventListener('keydown', keyStart); document.removeEventListener('visibilitychange', visibility); ro.disconnect(); fx.fog?.destroy(); updateDialog.close(); root.remove()
    },
  }
}

