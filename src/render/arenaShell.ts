/** Outer arena silhouettes are decorative and never change the collision box. */
export function drawArenaShell(ctx: CanvasRenderingContext2D, width: number, height: number, style: string | undefined, color: string) {
  if (!style || style === 'plain') return
  const x = width / 2 + 34, y = height / 2 + 32
  ctx.save()
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = .72
  if (style === 'ribbed') for (let k = -2; k <= 2; k++) {
    const yy = k * height / 5
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * x, yy - 12); ctx.lineTo(side * (x + 20), yy); ctx.lineTo(side * x, yy + 12); ctx.stroke() }
  }
  if (style === 'wings') for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * x, -height * .35); ctx.quadraticCurveTo(side * (x + 75), -height * .55, side * (x + 36), 0); ctx.quadraticCurveTo(side * (x + 75), height * .55, side * x, height * .35); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(side * x, 0); ctx.lineTo(side * (x + 48), 0); ctx.stroke()
  }
  if (style === 'cradle') {
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * (x + 12), -y - 24); ctx.lineTo(side * (x + 12), y + 18); ctx.stroke() }
    ctx.beginPath(); ctx.arc(0, y - 16, width * .55, .12, Math.PI - .12); ctx.stroke()
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * width / 6, -y); ctx.lineTo(k * width / 6, -y - 22); ctx.stroke() }
  }
  if (style === 'shield') for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * x, -y); ctx.lineTo(side * (x + 30), -y + 22); ctx.lineTo(side * (x + 30), y - 22); ctx.lineTo(side * x, y); ctx.stroke()
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(side * (x + 18), k * height / 3, 3, 0, Math.PI * 2); ctx.fill() }
  }
  if (style === 'crown') {
    ctx.beginPath(); ctx.moveTo(-width * .35, -y); ctx.lineTo(-width * .35, -y - 18); ctx.lineTo(-width * .18, -y - 8); ctx.lineTo(0, -y - 30); ctx.lineTo(width * .18, -y - 8); ctx.lineTo(width * .35, -y - 18); ctx.lineTo(width * .35, -y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-width * .35, y); ctx.lineTo(width * .35, y); ctx.stroke()
  }
  ctx.restore()
}
