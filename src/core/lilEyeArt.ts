// LilEye's LokPack cosmetics (hats and auras), drawn around the eye. Pure canvas code, kept apart from the page so it can be tested and reused on cards.
/** LokPack cosmetics, drawn around the eye (centre 0,0, radii rx, ry). Auras sit behind it, hats on top. */
export function drawLilEyeAura(ctx: CanvasRenderingContext2D, aura: string, rx: number, ry: number, t: number, reduce: boolean) {
  const time = reduce ? 2 : t
  ctx.save()
  if (aura === 'ember') for (let i = 0; i < 9; i++) { const life = (time * .5 + i / 9) % 1, a = i * 2.4; ctx.fillStyle = `rgba(255,${130 + (i % 3) * 40},60,${(1 - life) * .85})`; ctx.beginPath(); ctx.arc(Math.cos(a) * rx * 1.05 + Math.sin(life * 6 + i) * 3, ry * .9 - life * ry * 2.4, 1.2 + (1 - life) * 1.8, 0, 7); ctx.fill() }
  else if (aura === 'aurora') { for (let k = 0; k < 2; k++) { const g = ctx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, 'rgba(109,255,196,0)'); g.addColorStop(.5, k ? 'rgba(180,138,255,.75)' : 'rgba(109,255,196,.75)'); g.addColorStop(1, 'rgba(109,255,196,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.12, ry * 1.18, time * (k ? -.7 : .9), 0, Math.PI * 1.3); ctx.stroke() } }
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

