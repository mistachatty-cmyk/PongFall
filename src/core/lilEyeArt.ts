// LilEye's LokPack cosmetics (hats and auras), drawn around the eye. Pure canvas code, kept apart from the page so it can be tested and reused on cards.
/** LokPack cosmetics, drawn around the eye (centre 0,0, radii rx, ry). Auras sit behind it, hats on top. */
export function drawLilEyeAura(ctx: CanvasRenderingContext2D, aura: string, rx: number, ry: number, t: number, reduce: boolean) {
  const time = reduce ? 2 : t
  ctx.save()
  if (aura === 'ember') for (let i = 0; i < 9; i++) { const life = (time * .5 + i / 9) % 1, a = i * 2.4; ctx.fillStyle = `rgba(255,${130 + (i % 3) * 40},60,${(1 - life) * .85})`; ctx.beginPath(); ctx.arc(Math.cos(a) * rx * 1.05 + Math.sin(life * 6 + i) * 3, ry * .9 - life * ry * 2.4, 1.2 + (1 - life) * 1.8, 0, 7); ctx.fill() }
  else if (aura === 'aurora') { for (let k = 0; k < 2; k++) { const g = ctx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, 'rgba(109,255,196,0)'); g.addColorStop(.5, k ? 'rgba(180,138,255,.75)' : 'rgba(109,255,196,.75)'); g.addColorStop(1, 'rgba(109,255,196,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.12, ry * 1.18, time * (k ? -.7 : .9), 0, Math.PI * 1.3); ctx.stroke() } }
  else if (aura === 'bubbles') for (let i = 0; i < 8; i++) { const life = (time * 0.35 + i / 8) % 1, a = i * 2.1; ctx.strokeStyle = `rgba(190,235,255,${(1 - life) * 0.8})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(Math.cos(a) * rx * 1.05 + Math.sin(life * 5 + i) * 3, ry * 0.9 - life * ry * 2.2, 2 + (1 - life) * 3, 0, 7); ctx.stroke() }
  else if (aura === 'sakura') for (let i = 0; i < 7; i++) { const a = time * 0.9 + (i * Math.PI * 2) / 7; ctx.save(); ctx.translate(Math.cos(a) * rx * 1.12, Math.sin(a) * ry * 1.2); ctx.rotate(a * 2); ctx.fillStyle = i % 2 ? '#ffb3d1' : '#ffd9e6'; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.4, 0, 0, 7); ctx.fill(); ctx.restore() }
  else if (aura === 'void') { const pulse = .75 + Math.sin(time * 2) * .15, g = ctx.createRadialGradient(0, 0, ry * .6, 0, 0, rx * 1.35); g.addColorStop(0, 'rgba(10,0,30,0)'); g.addColorStop(.6, `rgba(70,20,140,${.45 * pulse})`); g.addColorStop(1, 'rgba(10,0,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx * 1.35, 0, 7); ctx.fill() }
  ctx.restore()
}
export function drawLilEyeHat(ctx: CanvasRenderingContext2D, hat: string, rx: number, ry: number, t: number, reduce: boolean) {
  const time = reduce ? 1 : t
  ctx.save(); ctx.lineJoin = 'round'
  if (hat === 'party') { ctx.translate(rx * .15, -ry * .88); ctx.rotate(.28); ctx.fillStyle = '#ff5ab4'; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(0, -22); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffe14f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(5, -2); ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 3); ctx.stroke(); ctx.fillStyle = '#4ff0ff'; ctx.beginPath(); ctx.arc(0, -22, 3, 0, 7); ctx.fill() }
  else if (hat === 'beanie') { ctx.translate(0, -ry * .78); ctx.fillStyle = '#d6504a'; ctx.beginPath(); ctx.ellipse(0, 0, rx * .72, ry * .55, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#f2eee4'; ctx.fillRect(-rx * .74, -1, rx * 1.48, 7); ctx.beginPath(); ctx.arc(0, -ry * .55, 4.2, 0, 7); ctx.fill() }
  else if (hat === 'monocle') { ctx.translate(rx * .34, ry * .02); ctx.strokeStyle = '#d9a55a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, ry * .5, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(217,165,90,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ry * .35, ry * .38); ctx.quadraticCurveTo(ry * .9, ry * .9, ry * .5, ry * 1.5); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(0, 0, ry * .46, 0, 7); ctx.fill() }
  else if (hat === 'halo') { const y = -ry * 1.05 + Math.sin(time * 2) * 1.6; ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 8; ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, y, rx * .5, ry * .16, 0, 0, 7); ctx.stroke() }
  else if (hat === 'crown') { ctx.translate(0, -ry * .86 + Math.sin(time * 2.4) * .8); const w = rx * .62; ctx.fillStyle = '#ffc857'; ctx.strokeStyle = '#8a5a08'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-w, 4); ctx.lineTo(-w, -9); ctx.lineTo(-w / 2, -2); ctx.lineTo(0, -13); ctx.lineTo(w / 2, -2); ctx.lineTo(w, -9); ctx.lineTo(w, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); for (const [gx, col] of [[-w / 2, '#ff5a7a'], [0, '#4ff0ff'], [w / 2, '#7affc8']] as const) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(gx, 0, 1.8, 0, 7); ctx.fill() } }
  ctx.restore()
}


/** Glasses sit over the eye, a scarf below it and wings behind it (drawn before the eye). */
export function drawLilEyeGlasses(ctx: CanvasRenderingContext2D, kind: string, rx: number, ry: number): void {
  ctx.save(); ctx.lineJoin = 'round'
  const lens = (x: number, fillA: string, fillB = fillA) => { ctx.fillStyle = fillA; ctx.beginPath(); ctx.ellipse(x, 0, rx * 0.42, ry * 0.62, 0, 0, 7); ctx.fill() ; void fillB }
  if (kind === 'shades') { ctx.fillStyle = 'rgba(8,10,18,.92)'; ctx.beginPath(); ctx.roundRect(-rx * 0.85, -ry * 0.5, rx * 1.7, ry * 0.95, ry * 0.3); ctx.fill(); ctx.strokeStyle = '#2a3140'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-rx * 0.6, -ry * 0.35, rx * 0.5, 3) }
  else if (kind === 'heart') { ctx.fillStyle = 'rgba(255,90,140,.55)'; ctx.strokeStyle = '#ff3d7a'; ctx.lineWidth = 2.4; const h = (x: number) => { ctx.beginPath(); ctx.moveTo(x, ry * 0.5); ctx.bezierCurveTo(x - rx * 0.7, -ry * 0.1, x - rx * 0.35, -ry * 0.7, x, -ry * 0.2); ctx.bezierCurveTo(x + rx * 0.35, -ry * 0.7, x + rx * 0.7, -ry * 0.1, x, ry * 0.5); ctx.fill(); ctx.stroke() }; h(0) }
  else if (kind === 'threed') { ctx.lineWidth = 2.4; ctx.strokeStyle = '#e9eef7'; lens(-rx * 0.46, 'rgba(255,60,60,.5)'); ctx.stroke(); ctx.beginPath(); ctx.ellipse(-rx * 0.46, 0, rx * 0.42, ry * 0.62, 0, 0, 7); ctx.stroke(); lens(rx * 0.46, 'rgba(60,220,255,.5)'); ctx.beginPath(); ctx.ellipse(rx * 0.46, 0, rx * 0.42, ry * 0.62, 0, 0, 7); ctx.stroke() }
  ctx.restore()
}
export function drawLilEyeScarf(ctx: CanvasRenderingContext2D, kind: string, rx: number, ry: number, t: number, reduce: boolean): void {
  const time = reduce ? 1 : t, y = ry * 0.9
  ctx.save(); ctx.lineCap = 'round'
  const band = (col: string) => { ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, y - 2, rx * 0.7, ry * 0.22, 0, 0.1, Math.PI - 0.1); ctx.stroke() }
  if (kind === 'red') { band('#d6504a'); ctx.fillStyle = '#d6504a'; ctx.beginPath(); ctx.moveTo(rx * 0.3, y + 4); ctx.lineTo(rx * 0.5, y + 4 + 16 + Math.sin(time * 3) * 2); ctx.lineTo(rx * 0.22, y + 18); ctx.closePath(); ctx.fill() }
  else if (kind === 'rainbow') { for (let i = 0; i < 6; i++) { ctx.strokeStyle = `hsl(${i * 60},85%,60%)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, y - 5 + i * 1.8, rx * 0.7, ry * 0.2, 0, 0.1, Math.PI - 0.1); ctx.stroke() } for (let i = 0; i < 6; i++) { ctx.fillStyle = `hsl(${i * 60},85%,60%)`; ctx.fillRect(rx * 0.3 + i * 2.2, y + 4, 2.2, 14 + Math.sin(time * 4 + i * 0.6) * 3) } }
  ctx.restore()
}
export function drawLilEyeWings(ctx: CanvasRenderingContext2D, kind: string, rx: number, ry: number, t: number, reduce: boolean): void {
  const flap = reduce ? 0 : Math.sin(t * 4) * 0.18
  ctx.save()
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.scale(sx, 1); ctx.rotate(-flap * 0.6 - 0.2)
    if (kind === 'bat') { ctx.fillStyle = '#3a2a4a'; ctx.strokeStyle = '#1a1024'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(rx * 0.7, 0); ctx.quadraticCurveTo(rx * 1.5, -ry * 1.1, rx * 1.9, -ry * 0.2); ctx.quadraticCurveTo(rx * 1.6, 0, rx * 1.5, ry * 0.5); ctx.quadraticCurveTo(rx * 1.3, ry * 0.1, rx * 1.1, ry * 0.5); ctx.quadraticCurveTo(rx * 1, 0, rx * 0.7, ry * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke() }
    else if (kind === 'angel') { ctx.fillStyle = '#f6f8ff'; ctx.strokeStyle = 'rgba(150,170,210,.8)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const len = rx * (1.2 - i * 0.12); ctx.save(); ctx.rotate(-0.5 + i * 0.28); ctx.beginPath(); ctx.moveTo(rx * 0.7, 0); ctx.quadraticCurveTo(rx * 0.7 + len * 0.5, -ry * 0.4, rx * 0.7 + len, -ry * 0.05); ctx.quadraticCurveTo(rx * 0.7 + len * 0.5, ry * 0.3, rx * 0.7, ry * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore() } }
    else if (kind === 'butterfly') { for (const [k, col] of [[0, '#ff7ad9'], [1, '#6fb1ff']] as const) { ctx.fillStyle = col; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(rx * 1.25, (k ? 1 : -1) * ry * 0.55, rx * 0.6, ry * 0.7, (k ? 0.5 : -0.5), 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.stroke() } }
    ctx.restore()
  }
  ctx.restore()
}
