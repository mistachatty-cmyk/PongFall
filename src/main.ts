import { createWorld, stepWorld, collectTear, World } from './sim/world'
import { stepAI } from './sim/ai'
import { renderWorld, newCamera, stepCamera, screenToWorld } from './render/draw'

const canvas = document.getElementById('c') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
let cw = 0, ch = 0
function resize() {
  const dpr = window.devicePixelRatio || 1
  cw = window.innerWidth; ch = window.innerHeight
  canvas.width = cw * dpr; canvas.height = ch * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
window.addEventListener('resize', resize); resize()

const q = new URLSearchParams(location.search)
const mk = (): World => createWorld({ target: Number(q.get('target')) || 14, timeLimit: Number(q.get('time')) || 0 }, (Math.random() * 1e9) | 0)
let world = mk()
const cam = newCamera()
cam.zoom = 0.5
const keys = new Set<string>()

window.addEventListener('keydown', e => {
  keys.add(e.key.toLowerCase())
  if (e.key.toLowerCase() === 'z') cam.lock = cam.lock === 'auto' ? 'field' : cam.lock === 'field' ? 'arena' : 'auto'
  if (e.key.toLowerCase() === 'r') world = mk()
})
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()))

function pointerToPaddle(e: PointerEvent) {
  const p = screenToWorld(cam, cw, ch, e.clientX, e.clientY)
  if (collectTear(world, p.x, p.y, 40 / Math.max(0.3, cam.zoom * 2))) return
  world.sides[0].targetY = p.y
}
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pointerToPaddle(e) })
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) pointerToPaddle(e) })

const STEP = 1 / 120
let last = performance.now(), acc = 0
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  acc += dt
  while (acc >= STEP) {
    const k = (keys.has('w') || keys.has('arrowup') ? -1 : 0) + (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
    if (k) world.sides[0].targetY = world.sides[0].paddleY + k * 80
    stepAI(world, 1)
    stepWorld(world, STEP)
    world.events.length = 0
    acc -= STEP
  }
  stepCamera(world, cam, cw, dt)
  renderWorld(ctx, world, cam, cw, ch)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
;(window as unknown as { __pf: () => World }).__pf = () => world
