// Lil Eye on screen: the little companion, its speech bubble, and its page (name, personality, iris, dex). Render-only.
import { IRIS_CHOICES, LIL_EYE_EVENT, PERSONALITIES, cleanName, emitLilEye, isUnlocked, loadLilEye, lokpetSku, personalityById, pose, reaction, saveLilEye, type DexProgress, type LilEyeEvent, type Mood } from './lilEye'
import { earnedProgress } from './playerProgress'
import { queueCloudSync } from './cloudSyncQueue'

export const dexProgress = (): DexProgress => earnedProgress()

const css = `
.le-wrap{position:fixed;left:12px;bottom:118px;z-index:55;width:84px;height:72px;pointer-events:none;user-select:none}
.le-wrap canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 6px 10px #000a)}
.le-bubble{position:absolute;left:2px;bottom:100%;margin-bottom:2px;max-width:220px;width:max-content;padding:7px 10px;border:1px solid #8cece6aa;border-radius:10px 10px 10px 2px;background:#06151cf0;color:#e9ffff;font:700 12px/1.35 system-ui;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}
.le-bubble.on{opacity:1;transform:none}
@media (max-width:520px){.le-wrap{left:6px;transform:scale(.8);transform-origin:left bottom}}
.le-page{position:fixed;inset:0;z-index:60;overflow:auto;padding:18px clamp(12px,4vw,40px) 40px;background:radial-gradient(ellipse at 50% 0,#17162c,#070a11 70%);color:#e4edff;font:13px/1.45 system-ui;box-sizing:border-box}
.le-page h1{margin:10px 0 2px;font-size:clamp(24px,5vw,36px);letter-spacing:.14em}.le-page h2{margin:16px 0 8px;font:800 11px ui-monospace,monospace;letter-spacing:.14em;color:#8ceced;text-transform:uppercase}
.le-page button,.le-page input{font:700 12px ui-monospace,monospace;color:#dff0ff;background:#0e1828;border:1px solid #4d6b8a;border-radius:6px;padding:8px 12px}.le-page button{cursor:pointer}.le-page button:hover:not(:disabled){border-color:#8cece6}.le-page button[aria-pressed=true]{border-color:#8cece6;background:#18404c}.le-page button:disabled{opacity:.5;cursor:default}
.le-page :focus-visible{outline:2px solid #65f4f2;outline-offset:2px}.le-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px}.le-card{padding:12px;border:1px solid #33506b;border-radius:8px;background:#0a111dcc}.le-card p{margin:4px 0;color:#a8b3c9}
.le-sw{display:inline-block;width:30px;height:30px;padding:0!important;border-radius:50%;margin-right:6px;border:2px solid #fff6!important}.le-sw[aria-pressed=true]{border-color:#fff!important;box-shadow:0 0 10px #fff8}.le-note{color:#8c9bb3;font-size:11px}
`

export function drawLilEye(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, mood: Mood, blinkEvery: number, iris: string, look: { x: number; y: number }, reduce: boolean) {
  const p = pose(mood, t, blinkEvery), bob = reduce ? 0 : p.bob
  ctx.clearRect(0, 0, w, h)
  ctx.save(); ctx.translate(w / 2, h * .5 + bob)
  const rx = w * .42, ry = w * .34
  const sg = ctx.createRadialGradient(-rx * .2, -ry * .3, 2, 0, 0, rx * 1.1); sg.addColorStop(0, '#fbf8f0'); sg.addColorStop(.7, '#d9d4c8'); sg.addColorStop(1, '#8a8478')
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill()
  const ix = look.x * rx * .22, iy = look.y * ry * .2, ir = ry * .62
  const ig = ctx.createRadialGradient(ix, iy, 1, ix, iy, ir); ig.addColorStop(0, '#ffffffcc'); ig.addColorStop(.25, iris); ig.addColorStop(1, '#0a1626')
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, 7); ctx.fill()
  ctx.fillStyle = '#04070c'; ctx.beginPath(); ctx.arc(ix, iy, ir * p.pupil * .75, 0, 7); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(ix - ir * .35, iy - ir * .38, ir * .22, ir * .15, -.4, 0, 7); ctx.fill()
  // lids: they close from the top (and a touch from below) and carry the mood
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.clip()
  ctx.fillStyle = '#2d3a52'
  const tilt = mood === 'sad' ? .28 : mood === 'squint' ? -.22 : 0
  ctx.save(); ctx.rotate(tilt); ctx.fillRect(-rx * 1.3, -ry * 1.4, rx * 2.6, ry * 1.4 * p.lid + (mood === 'sad' ? ry * .25 : 0)); ctx.restore()
  if (mood === 'happy') { ctx.fillStyle = '#2d3a52'; ctx.beginPath(); ctx.ellipse(0, ry * 1.05, rx * 1.1, ry * .55, 0, 0, 7); ctx.fill() }
  else ctx.fillRect(-rx * 1.3, ry - ry * p.lid * .5, rx * 2.6, ry)
  ctx.restore()
  ctx.strokeStyle = '#141b2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.stroke()
  ctx.restore()
}

export interface LilEyeHandle { react(e: LilEyeEvent): void; setVisible(v: boolean): void; refresh(): void; destroy(): void }

export function mountLilEye(parent: HTMLElement = document.body, reduce = false): LilEyeHandle {
  const style = document.createElement('style'); style.textContent = css
  const wrap = document.createElement('div'); wrap.className = 'le-wrap'
  const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'button'); canvas.tabIndex = 0
  const bubble = document.createElement('div'); bubble.className = 'le-bubble'; bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite')
  wrap.append(canvas, bubble); parent.append(style, wrap)
  const dpr = Math.min(devicePixelRatio || 1, 2), W = 84, H = 72
  canvas.width = W * dpr; canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  let save = loadLilEye(dexProgress()), mood: Mood = 'neutral', moodUntil = 0, raf = 0, bubbleTimer = 0, idleTimer = 0, visible = true
  const look = { x: 0, y: 0 }
  const label = () => canvas.setAttribute('aria-label', `${save.name}, your Lil Eye (${personalityById(save.personality).name}). Press to say hello.`)
  label()
  const say = (e: LilEyeEvent) => {
    if (!visible) return
    const r = reaction(save.personality, e); mood = r.mood; moodUntil = performance.now() + (e === 'idle' ? 4000 : 2600)
    bubble.textContent = r.line; bubble.classList.add('on'); window.clearTimeout(bubbleTimer); bubbleTimer = window.setTimeout(() => bubble.classList.remove('on'), 3400)
  }
  const poke = () => { save = { ...save, pokes: save.pokes + 1 }; saveLilEye(save); say('poke') }
  canvas.onclick = poke; canvas.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke() } }
  const onMove = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); look.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 260)) * personalityById(save.personality).gaze; look.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 260)) * personalityById(save.personality).gaze }
  window.addEventListener('pointermove', onMove, { passive: true })
  const onEvent = (e: Event) => say((e as CustomEvent<LilEyeEvent>).detail)
  window.addEventListener(LIL_EYE_EVENT, onEvent)
  const onSave = () => { save = loadLilEye(dexProgress()); label() }
  window.addEventListener('pongfall-lil-eye-changed', onSave)
  const scheduleIdle = () => { idleTimer = window.setTimeout(() => { say('idle'); scheduleIdle() }, 30000 + Math.random() * 30000) }
  scheduleIdle()
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (!ctx || !visible || document.hidden) return
    if (moodUntil && now > moodUntil) { mood = save.personality === 'sleepy' ? 'sleepy' : 'neutral'; moodUntil = 0 }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawLilEye(ctx, W, H, now / 1000, moodUntil ? mood : save.personality === 'sleepy' ? 'sleepy' : 'neutral', personalityById(save.personality).blink, save.iris, look, reduce)
  }
  raf = requestAnimationFrame(frame)
  return {
    react: say,
    setVisible(v) { visible = v; wrap.style.display = v ? '' : 'none' },
    refresh: onSave,
    destroy() { cancelAnimationFrame(raf); window.clearTimeout(bubbleTimer); window.clearTimeout(idleTimer); window.removeEventListener('pointermove', onMove); window.removeEventListener(LIL_EYE_EVENT, onEvent); window.removeEventListener('pongfall-lil-eye-changed', onSave); wrap.remove(); style.remove() },
  }
}

/** The Lil Eye page: rename, choose a personality (locked ones show how to earn them), pick an iris, see the dex. */
export function mountLilEyePage(parent: HTMLElement, onClose: () => void): () => void {
  const prog = dexProgress()
  let save = loadLilEye(prog)
  const root = document.createElement('section'); root.className = 'le-page'; root.setAttribute('aria-labelledby', 'le-title')
  const style = document.createElement('style'); style.textContent = css
  const commit = () => { saveLilEye(save); queueCloudSync(); window.dispatchEvent(new Event('pongfall-lil-eye-changed')); render() }
  function render() {
    root.replaceChildren(style)
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = ''): HTMLElementTagNameMap[K] => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n }
    const back = el('button', '← Back'); back.type = 'button'; back.onclick = onClose
    const h1 = el('h1', 'LIL EYE'); h1.id = 'le-title'
    const sub = el('p', 'A small eye that lives at the edge of your screen, watches the fall with you and has opinions. It is also a lokpet in the LOK dex.'); sub.style.color = '#a8b3c9'
    const nameRow = el('div'); const lab = el('label', 'Name '); lab.htmlFor = 'le-name'; const input = el('input'); input.id = 'le-name'; input.maxLength = 14; input.value = save.name
    input.onchange = () => { save = { ...save, name: cleanName(input.value) || 'Lil Eye' }; commit() }; nameRow.append(lab, input)
    const h2a = el('h2', 'Personality'), grid = el('div', '', 'le-grid')
    for (const p of PERSONALITIES) {
      const ok = isUnlocked(p, prog) || save.owned.includes(p.id), card = el('div', '', 'le-card')
      const b = el('button', ok ? (save.personality === p.id ? '✓ ' : '') + p.name : '🔒 ' + p.name); b.type = 'button'; b.disabled = !ok; b.setAttribute('aria-pressed', String(save.personality === p.id))
      b.onclick = () => { save = { ...save, personality: p.id }; commit(); emitLilEye('poke') }
      card.append(b, el('p', p.blurb), el('p', ok ? `Dex: ${lokpetSku(p)}` : `Earn it: ${p.unlock.note}`, 'le-note')); grid.append(card)
    }
    const h2b = el('h2', 'Iris'), irisRow = el('div')
    for (const c of IRIS_CHOICES) { const s = el('button', '', 'le-sw'); s.type = 'button'; s.style.background = c; s.setAttribute('aria-label', `Iris colour ${c}`); s.setAttribute('aria-pressed', String(save.iris === c)); s.onclick = () => { save = { ...save, iris: c }; commit() }; irisRow.append(s) }
    const note = el('p', `You have said hello ${save.pokes} time${save.pokes === 1 ? '' : 's'}. Turn the companion off any time in Settings.`, 'le-note')
    root.append(back, h1, sub, nameRow, h2a, grid, h2b, irisRow, note)
    back.focus()
  }
  render(); parent.append(root)
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
  window.addEventListener('keydown', onKey)
  return () => { window.removeEventListener('keydown', onKey); root.remove() }
}
