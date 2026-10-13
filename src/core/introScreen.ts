import { createFx, feedFx } from '../render/eyes'
import { newCamera, renderWorld, stepCamera } from '../render/draw'
import { arenaDims } from '../sim/world'
import { FIXED_DT } from '../sim/tuning'
import type { World } from '../sim/world'
import { createIntroAttractWorld, stepIntroAttractWorld } from './introAttract'
import { CHANGELOG, CURRENT_VERSION } from '../changelog'

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

type IntroCamera = 'cinematic' | 'locked' | 'shaft'
type IntroPlacement = 'center' | 'upper' | 'lower'
const CAMERAS: IntroCamera[] = ['cinematic', 'locked', 'shaft']
interface IntroPrefs { demo: boolean; instantMatches?: boolean; camera?: IntroCamera; placement?: IntroPlacement; reduceMotion?: boolean; colorway: number }
function readPrefs(): IntroPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(INTRO_KEY) ?? '{}') as Partial<IntroPrefs>
    return { demo: v.demo !== false, instantMatches: v.instantMatches === true, camera: CAMERAS.includes(v.camera as IntroCamera) ? v.camera as IntroCamera : 'cinematic', placement: ['center','upper','lower'].includes(String(v.placement)) ? v.placement as IntroPlacement : 'center', reduceMotion: v.reduceMotion, colorway: Number.isInteger(v.colorway) ? ((v.colorway! % COLORWAYS.length) + COLORWAYS.length) % COLORWAYS.length : 0 }
  } catch { return { demo: true, instantMatches: false, camera: 'cinematic', colorway: 0 } }
}
function savePrefs(prefs: IntroPrefs) { try { localStorage.setItem(INTRO_KEY, JSON.stringify(prefs)) } catch { /* local play still works when storage is unavailable */ } }
function systemReducedMotion() { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches }

export interface IntroScreenOptions { onStart(takeover?: World): void }

/** The persistent title/attract layer before the eye menu. */
export function createIntroScreen(host: HTMLElement, options: IntroScreenOptions) {
  const prefs = readPrefs()
  let reduceMotion = prefs.reduceMotion ?? systemReducedMotion()
  let demoEnabled = prefs.demo
  let instantMatches = prefs.instantMatches ?? false
  let cameraMode: IntroCamera = prefs.camera ?? 'cinematic'
  const placement: IntroPlacement = prefs.placement ?? 'center'
  let colorway = prefs.colorway
  let lineIndex = Math.floor(Math.random() * LINES.length)
  let started = false, dead = false
  const root = document.createElement('section'); root.className = 'pf-intro'; root.dataset.pf = 'intro'
  root.style.cssText = `position:fixed;inset:0;z-index:45;overflow:hidden;display:grid;place-items:center;background:#05080e;color:#eaf3ff;font:16px system-ui,sans-serif;opacity:1;transition:opacity .55s ease;--pf-accent:${COLORWAYS[colorway]!.accent};--pf-glow:${COLORWAYS[colorway]!.glow}`
  const style = document.createElement('style'); style.textContent = `
    @media(max-height:560px){.pf-intro-content{gap:4px!important}.pf-intro-start{min-height:46px!important;margin-top:6px!important}}
    .pf-intro-options{position:absolute;z-index:5;left:50%;bottom:max(-5px,calc(env(safe-area-inset-bottom) - 5px));transform:translateX(-50%);text-align:center;color:#d9e7f5;font:11px system-ui}
    .pf-intro-options summary{display:grid;place-items:center;list-style:none;cursor:pointer;box-sizing:border-box;width:58px;height:28px;margin:auto;border:1px solid #8ba2bd66;border-bottom:0;border-radius:13px 13px 0 0;background:linear-gradient(180deg,#0b1520aa,#07101b88);color:#b8d9ffb3;font:700 18px/1 system-ui;opacity:.43;transform:translateY(9px);transition:opacity .28s,transform .32s,box-shadow .28s}
    .pf-intro-options summary::-webkit-details-marker{display:none}
    .pf-intro-options:hover summary,.pf-intro-options:focus-within summary,.pf-intro-options[open] summary{opacity:.96;transform:translateY(0);box-shadow:0 -5px 22px var(--pf-glow)}
    .pf-intro-options[open] summary{color:var(--pf-accent)}
    .pf-intro-options[open] summary{transform:rotate(180deg)}
    .pf-intro-options-panel{position:absolute;left:50%;bottom:22px;box-sizing:border-box;width:min(350px,calc(100vw - 28px));padding:16px 18px 13px;border:1px solid #6480a066;border-bottom:0;border-radius:16px 16px 0 0;background:linear-gradient(155deg,#101b2aeF,#070d17f7);box-shadow:0 -18px 54px #0009;backdrop-filter:blur(14px);text-align:left;opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,22px);transition:opacity .3s ease,transform .38s cubic-bezier(.2,.75,.25,1),visibility .38s}
    .pf-intro-options[open] .pf-intro-options-panel{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,0)}
    .pf-intro-options-panel label{display:flex;align-items:center;gap:9px;cursor:pointer;color:#e4eefb;font:600 13px system-ui}
    .pf-intro-options-panel p{margin:5px 0 12px;color:#aabbd0;font:12px/1.45 system-ui}
    .pf-version-link{display:inline-flex;align-items:center;gap:7px;color:#79baff;text-decoration:none;font:700 12px ui-monospace,monospace;letter-spacing:.04em;transition:color .18s,text-shadow .18s}
    .pf-version-link:hover,.pf-version-link:focus-visible{color:#b9dcff;text-decoration:underline;text-shadow:0 0 14px #57aaff88}
    .pf-demo-toggle{position:absolute;z-index:5;left:max(14px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));display:inline-flex;align-items:center;gap:9px;padding:7px 10px;border:1px solid #8299b04d;border-radius:999px;background:#07101b88;color:#c8d9ed;font:650 10px ui-monospace,monospace;letter-spacing:.09em;cursor:pointer;opacity:.58;backdrop-filter:blur(8px);transition:opacity .2s,border-color .2s,transform .2s}
    .pf-demo-toggle:hover,.pf-demo-toggle:focus-visible{opacity:.95;transform:translateY(-2px)}
    .pf-demo-toggle[aria-pressed="true"]{border-color:#63b4ff88;color:#a9d5ff}
    .pf-demo-switch{position:relative;width:27px;height:15px;border-radius:999px;background:#344459;transition:background .22s}
    .pf-demo-switch:after{content:"";position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#94a6bd;transition:transform .22s,background .22s}
    .pf-demo-toggle[aria-pressed="true"] .pf-demo-switch{background:#2b6eaa}
    .pf-demo-toggle[aria-pressed="true"] .pf-demo-switch:after{transform:translateX(12px);background:#e9f6ff}
    .pf-intro-updates{box-sizing:border-box;width:min(620px,calc(100vw - 28px));max-height:min(78dvh,760px);overflow:auto;border:1px solid #50627b;border-radius:14px;background:#0b111b;color:#e5f1ff;padding:20px;box-shadow:0 20px 70px #000c}
    .pf-intro-updates::backdrop{background:#02050acc;backdrop-filter:blur(5px)}
    @media(max-width:560px){.pf-intro-content{width:min(96vw,900px)!important;padding:8px!important}.pf-intro-content h1{font-size:clamp(40px,13vw,68px)!important}.pf-intro-start{min-width:min(84vw,300px)!important}.pf-demo-toggle{left:8px;bottom:max(12px,env(safe-area-inset-bottom));font-size:9px}.pf-intro-options-panel{padding:14px 15px 12px}}
    @media(prefers-reduced-motion:reduce){.pf-intro-options summary,.pf-intro-options-panel,.pf-demo-toggle,.pf-demo-switch,.pf-demo-switch:after,.pf-version-link{transition:none!important}}
  `
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:.9'
  const shade = document.createElement('div'); shade.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(3,6,12,.02) 18%,rgba(3,6,12,.12) 54%,rgba(3,6,12,.58) 100%),linear-gradient(180deg,rgba(3,6,12,.46),transparent 38%,rgba(3,6,12,.15) 72%,rgba(3,6,12,.52))'
  const content = document.createElement('div'); content.className = 'pf-intro-content'; content.style.cssText = `position:absolute;z-index:2;top:${placement === 'upper' ? '34%' : placement === 'lower' ? '63%' : '50%'};left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;width:min(94vw,900px);padding:16px 18px;text-align:center;transition:transform .65s ease,opacity .55s ease`
  const eyebrow = document.createElement('div'); eyebrow.textContent = 'A GSIX DESIGNS GAME · LOK ECOSYSTEM'; eyebrow.style.cssText = 'color:var(--pf-accent);font:700 11px system-ui;letter-spacing:.24em;text-transform:uppercase'
  const title = document.createElement('h1'); title.textContent = 'PONGFALL'; title.tabIndex = 0; title.setAttribute('aria-label', 'PongFall title. You can drag it and let it spring back.')
  title.style.cssText = 'margin:0;color:#e9f1ff;font:900 clamp(44px,7vw,82px)/.9 system-ui;letter-spacing:.09em;text-shadow:0 8px 0 #172235,0 0 44px var(--pf-glow);cursor:grab;touch-action:none;user-select:none'
  const hook = document.createElement('p'); hook.textContent = 'WIN. BUT AT WHAT COST?'; hook.style.cssText = 'margin:0;color:#f4f7ff;font:900 clamp(18px,3vw,30px)/1.1 system-ui;letter-spacing:.1em;text-shadow:0 2px 18px var(--pf-glow)'
  const tagline = document.createElement('p'); tagline.setAttribute('aria-live', 'polite'); tagline.style.cssText = 'min-height:1.3em;margin:0;color:var(--pf-accent);font:700 clamp(11px,1.7vw,15px) ui-monospace,monospace;letter-spacing:.18em'
  const description = document.createElement('p'); description.textContent = 'Two paddles. One arena. One way to stop the fall.'; description.style.cssText = 'margin:2px 0 0;color:#d3deed;font:14px/1.5 system-ui;max-width:48ch;text-shadow:0 1px 8px #000'
  const start = document.createElement('button'); start.type = 'button'; start.dataset.pf = 'intro-start'; start.textContent = 'ENTER THE FALL  ↓'
  start.className = 'pf-intro-start'; start.style.cssText = 'min-width:260px;min-height:62px;margin-top:14px;padding:16px 30px;border:2px solid var(--pf-accent);border-radius:12px;background:rgba(7,12,20,.88);color:#f5f8ff;font:850 17px system-ui;letter-spacing:.14em;cursor:pointer;box-shadow:0 0 30px var(--pf-glow)'
  const insta = document.createElement('details'); insta.className = 'pf-intro-options'
  insta.innerHTML = '<summary aria-label="Open intro options" title="Intro options">⌃</summary><div class="pf-intro-options-panel"><label><input type="checkbox" data-insta aria-label="Insta-Matches"> ⚡ Insta-Matches</label><p>Enter the Fall takes over the live rally already playing behind this screen.</p><a class="pf-version-link" aria-label="Open version notes" href="#version-notes" data-version-notes>▸ Version notes · v' + CURRENT_VERSION + '</a></div>'
  const optionsSummary = insta.querySelector<HTMLElement>('summary')!
  insta.addEventListener('toggle', () => { optionsSummary.setAttribute('aria-label', insta.open ? 'Close intro options' : 'Open intro options') })
  const instaToggle = insta.querySelector<HTMLInputElement>('[data-insta]')!; instaToggle.checked = instantMatches
  instaToggle.onchange = () => { instantMatches = instaToggle.checked; prefs.instantMatches = instantMatches; savePrefs({ ...prefs, demo: demoEnabled, instantMatches, reduceMotion, colorway, camera: cameraMode }) }
  insta.querySelector<HTMLAnchorElement>('[data-version-notes]')!.onclick = e => { e.preventDefault(); updates.showModal() }
  const demoToggle = document.createElement('button'); demoToggle.type = 'button'; demoToggle.className = 'pf-demo-toggle'; demoToggle.setAttribute('aria-pressed', String(demoEnabled)); demoToggle.setAttribute('aria-label', 'Live demo'); demoToggle.innerHTML = '<span data-demo-label>LIVE DEMO: ON</span><span class="pf-demo-switch" aria-hidden="true"></span>'
  const demoLabel = demoToggle.querySelector<HTMLElement>('[data-demo-label]')!
  demoToggle.onclick = () => { demoEnabled = !demoEnabled; prefs.demo = demoEnabled; savePrefs({ ...prefs, demo: demoEnabled, instantMatches, reduceMotion, colorway, camera: cameraMode }); demoToggle.setAttribute('aria-pressed', String(demoEnabled)); demoLabel.textContent = `LIVE DEMO: ${demoEnabled ? 'ON' : 'OFF'}`; syncControls(); animate() }
  const updates = document.createElement('dialog'); updates.className = 'pf-intro-updates'; updates.setAttribute('aria-label', 'PongFall version notes')
  updates.innerHTML = `<header style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="color:#63b4ff;font:700 11px system-ui;letter-spacing:.2em">SHAFT TRANSMISSION · v${CURRENT_VERSION}</div><h2 style="margin:4px 0">Version notes</h2><div style="color:#9cabc0;font:12px system-ui">Recent updates from the fall</div></div><button type="button" data-close aria-label="Close version notes" style="font:22px system-ui;border:1px solid #50627b;border-radius:7px;background:#121b29;color:#e5f1ff;padding:4px 12px;cursor:pointer">×</button></header><div style="margin-top:12px">${[...CHANGELOG].reverse().slice(0,8).map(entry => `<article style="padding:10px 0;border-bottom:1px solid #25364b"><h3 style="margin:0 0 5px;font-size:15px">${entry.title} <span style="color:#9cabc0;font-size:12px">v${entry.version}</span></h3><ul style="margin:0;padding-left:20px;color:#bfccdd;font-size:13px;line-height:1.5">${entry.notes.map(note => `<li>${note}</li>`).join('')}</ul></article>`).join('')}</div>`
  updates.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => updates.close()
  updates.addEventListener('click', e => { if (e.target === updates) updates.close() })
  content.append(eyebrow, title, hook, tagline, description, start)
  root.append(style, canvas, shade, content, demoToggle, insta, updates); host.appendChild(root)

  const ctx = canvas.getContext('2d')
  let cw = 1, ch = 1, dpr = 1, last = performance.now(), accumulator = 0, raf = 0, resetAt = 0
  const world = { current: createIntroAttractWorld((Math.random() * 0x7fffffff) | 0) }
  let fx = createFx(reduceMotion); fx.fogMode = 'low'
  const viewCamera = newCamera(); viewCamera.lock = 'arena'
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
    instaToggle.checked = instantMatches
    demoToggle.setAttribute('aria-pressed', String(demoEnabled))
    demoLabel.textContent = `LIVE DEMO: ${demoEnabled ? 'ON' : 'OFF'}`
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
          viewCamera.lock = cameraMode === 'locked' ? 'arena' : cameraMode === 'shaft' ? 'field' : escaped ? 'auto' : 'arena'
          stepCamera(world.current, viewCamera, cw, ch, FIXED_DT)
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
      renderWorld(ctx, world.current, viewCamera, cw, ch, { paused: false, result: null, best: null, user: null, me: 0, trail: [], now, muted: true, perks: [], hints: false, gauge: false }, fx)
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
    root.style.opacity = '0'; content.style.transform = 'translate(-50%,-54%) scale(.98)'; content.style.opacity = '0'
    window.setTimeout(() => {
      if (dead) return
      if (instantMatches) options.onStart(world.current)
      else options.onStart()
    }, reduceMotion ? 0 : 560)
  }
  start.onclick = startRun
  const keyStart = (e: KeyboardEvent) => {
    const interactive = e.target instanceof HTMLElement && e.target.closest('button,a,input,select,summary,dialog')
    if ((e.key === 'Enter' || e.key === ' ') && !started && !interactive) { e.preventDefault(); startRun() }
  }
  window.addEventListener('keydown', keyStart)
  // The title is a playful, spring-returning touch target, like 616's intro lockup.
  let drag: { x: number; y: number; px: number; py: number } | null = null
  let titleMotion = { x: 0, y: 0, vx: 0, vy: 0 }, titleSpringRaf = 0
  const springTitle = () => {
    titleMotion.vx = (titleMotion.vx - titleMotion.x * .16) * .72
    titleMotion.vy = (titleMotion.vy - titleMotion.y * .16) * .72
    titleMotion.x += titleMotion.vx; titleMotion.y += titleMotion.vy
    title.style.transform = `translate(${titleMotion.x}px,${titleMotion.y}px) rotate(${titleMotion.x * .08}deg)`
    if (Math.abs(titleMotion.x) + Math.abs(titleMotion.y) + Math.abs(titleMotion.vx) + Math.abs(titleMotion.vy) > .2) titleSpringRaf = requestAnimationFrame(springTitle)
    else { titleMotion = { x: 0, y: 0, vx: 0, vy: 0 }; title.style.transform = ''; titleSpringRaf = 0 }
  }
  title.addEventListener('pointerdown', e => { if (reduceMotion) return; if (titleSpringRaf) cancelAnimationFrame(titleSpringRaf); drag = { x: e.clientX, y: e.clientY, px: 0, py: 0 }; titleMotion.vx = titleMotion.vy = 0; title.setPointerCapture(e.pointerId); title.style.cursor = 'grabbing' })
  title.addEventListener('pointermove', e => { if (!drag) return; const x = Math.max(-54, Math.min(54, e.clientX - drag.x)); const y = Math.max(-32, Math.min(32, e.clientY - drag.y)); titleMotion.vx = x - drag.px; titleMotion.vy = y - drag.py; titleMotion.x = x; titleMotion.y = y; drag.px = x; drag.py = y; title.style.transform = `translate(${x}px,${y}px) rotate(${x * .08}deg)` })
  const releaseTitle = () => { if (!drag) return; drag = null; title.style.cursor = 'grab'; if (!reduceMotion) titleSpringRaf = requestAnimationFrame(springTitle); else { titleMotion = { x: 0, y: 0, vx: 0, vy: 0 }; title.style.transform = '' } }
  title.addEventListener('pointerup', releaseTitle); title.addEventListener('pointercancel', releaseTitle)
  title.addEventListener('keydown', e => {
    const dx = e.key === 'ArrowRight' ? 12 : e.key === 'ArrowLeft' ? -12 : 0
    const dy = e.key === 'ArrowDown' ? 8 : e.key === 'ArrowUp' ? -8 : 0
    if ((!dx && !dy) || reduceMotion) return
    e.preventDefault(); titleMotion.x = Math.max(-54, Math.min(54, titleMotion.x + dx)); titleMotion.y = Math.max(-32, Math.min(32, titleMotion.y + dy)); titleMotion.vx = dx * .7; titleMotion.vy = dy * .7
    title.style.transform = `translate(${titleMotion.x}px,${titleMotion.y}px) rotate(${titleMotion.x * .08}deg)`
    if (!titleSpringRaf) titleSpringRaf = requestAnimationFrame(springTitle)
  })
  const cycleLine = window.setInterval(() => { if (dead || reduceMotion) return; lineIndex = (lineIndex + 1) % LINES.length; tagline.style.opacity = '0'; window.setTimeout(() => { if (!dead) { tagline.textContent = LINES[lineIndex]!; tagline.style.opacity = '1' } }, 180) }, 6500)
  tagline.textContent = LINES[lineIndex]!
  tagline.style.transition = reduceMotion ? 'none' : 'opacity .2s ease'
  applyColor(); syncControls(); resize(); animate()
  return {
    start: startRun,
    destroy() {
      if (dead) return
      dead = true; stopFrame(); if (titleSpringRaf) cancelAnimationFrame(titleSpringRaf); window.clearInterval(cycleLine); window.removeEventListener('keydown', keyStart); document.removeEventListener('visibilitychange', visibility); ro.disconnect(); fx.fog?.destroy(); updates.remove(); root.remove()
    },
  }
}

