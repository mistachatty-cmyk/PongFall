// Animated backdrops for the LokPack themes: sparks, northern lights, snow and falling stars drawn over the world menu and the pause/end dialogs.
// Render-only and cheap (a few dozen particles from a fixed hash, no allocation per frame); reduced motion draws one still frame.
import type { Ambient, Palette } from './palette'
import { rgba } from './palette'

const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

export function drawAmbient(c: CanvasRenderingContext2D, kind: Ambient | undefined, w: number, h: number, t: number, p: Palette, reduce: boolean): void {
  if (!kind) return
  const time = reduce ? 4 : t
  c.save(); c.globalCompositeOperation = 'lighter'
  switch (kind) {
    case 'embers':
      for (let i = 0; i < 46; i++) {
        const life = (time * (0.05 + rnd(i) * 0.07) + rnd(i + 3)) % 1, x = rnd(i + 9) * w + Math.sin(life * 8 + i) * 14, y = h - life * h * 1.05
        c.fillStyle = rgba(life < 0.4 ? p.lamp : p.accent, (1 - life) * 0.75); c.beginPath(); c.arc(x, y, 0.8 + (1 - life) * 1.8, 0, 7); c.fill()
      }
      break
    case 'aurora':
      for (let k = 0; k < 3; k++) {
        const col = k === 1 ? p.accent2 : p.accent, g = c.createLinearGradient(0, 0, 0, h * 0.55)
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.45, rgba(col, 0.16)); g.addColorStop(1, rgba(col, 0))
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 0)
        for (let x = 0; x <= w; x += w / 24) c.lineTo(x, h * (0.08 + k * 0.06) + Math.sin(x * 0.006 + time * 0.35 + k * 2) * h * 0.06)
        c.lineTo(w, 0); c.closePath(); c.fill()
      }
      break
    case 'snow':
      for (let i = 0; i < 70; i++) {
        const life = (time * (0.03 + rnd(i) * 0.04) + rnd(i + 3)) % 1, x = (rnd(i + 9) * w + Math.sin(life * 10 + i) * 18 + w) % w, y = life * (h + 20) - 10
        c.fillStyle = rgba('#ffffff', 0.25 + rnd(i + 5) * 0.5); c.beginPath(); c.arc(x, y, 0.9 + rnd(i + 2) * 1.6, 0, 7); c.fill()
      }
      break
    case 'stars':
      for (let i = 0; i < 90; i++) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (1 + rnd(i) * 2) + i)), x = rnd(i + 9) * w, y = rnd(i + 21) * h
        c.fillStyle = rgba(i % 7 === 0 ? p.accent : '#ffffff', tw * 0.7); c.fillRect(x, y, 1.2 + rnd(i + 5) * 1.2, 1.2 + rnd(i + 5) * 1.2)
      }
      for (let i = 0; i < 3; i++) {
        const life = (time * 0.12 + i / 3) % 1, x = w * (0.15 + i * 0.35) + life * w * 0.25, y = -20 + life * h * 0.9
        const g = c.createLinearGradient(x, y, x - 60, y - 90); g.addColorStop(0, rgba('#ffffff', 0.8 * (1 - life))); g.addColorStop(1, rgba(p.accent, 0))
        c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 60, y - 90); c.stroke()
      }
      break
  }
  c.restore()
}
