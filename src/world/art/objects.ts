// The world's objects, drawn as lit physical things in the shaft's own materials. Each has a static sprite (SVG, palette-driven), optional spinning parts
// (separate sprites rotated by the renderer) and an optional live overlay (lamps, bars, reels, bubbles) drawn straight onto the canvas each frame.
// All coordinates are in a 160 x 160 box; light comes from the top left.
import { glass, glow, hazard, enamel, lamp, plate, rivet, shade, mix, rgba, wrap } from './kit'
import type { Palette } from '../palette'

export type ArtId = 'jukebox' | 'stats' | 'gear' | 'easel' | 'wardrobe' | 'eye' | 'door' | 'cassette' | 'flask' | 'book' | 'exit' | 'keys' | 'save' | 'restart' | 'pack'
export interface Spin { svg(p: Palette): string; cx: number; cy: number; /** turns per second */ rps: number }
export interface Fx { (c: CanvasRenderingContext2D, t: number, p: Palette, hot: boolean): void }
export interface ArtDef { svg(p: Palette): string; spin?: Spin[]; fx?: Fx }

const f = (n: number) => Math.round(n * 100) / 100
const tri = (t: number) => Math.abs(((t % 2) + 2) % 2 - 1)
const rnd = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s) }

/** A gear outline: trapezoid teeth between an inner and outer radius. */
export function gearPath(cx: number, cy: number, rOut: number, rIn: number, teeth: number, rot = 0): string {
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a0 = rot + (i / teeth) * Math.PI * 2, step = (Math.PI * 2) / teeth
    const pts = [[a0 - step * 0.28, rIn], [a0 - step * 0.17, rOut], [a0 + step * 0.17, rOut], [a0 + step * 0.28, rIn]] as const
    pts.forEach(([a, r], k) => { d += `${i === 0 && k === 0 ? 'M' : 'L'}${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}` })
  }
  return d + 'Z'
}
const gearSprite = (p: Palette, cx: number, cy: number, rOut: number, rIn: number, teeth: number, hub: number, spokes = 0): string => {
  let s = `<path d="${gearPath(cx, cy, rOut, rIn, teeth)}" fill="url(#steel)" stroke="#000" stroke-opacity=".55" stroke-width="1"/>`
  s += `<path d="${gearPath(cx, cy, rOut - 1.2, rIn - 0.4, teeth)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`
  s += `<circle cx="${cx}" cy="${cy}" r="${rIn - 4}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${rIn - 5.4}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>`
  for (let i = 0; i < spokes; i++) { const a = (i / spokes) * Math.PI * 2; s += `<path d="M${f(cx + Math.cos(a) * hub)} ${f(cy + Math.sin(a) * hub)} L${f(cx + Math.cos(a) * (rIn - 6))} ${f(cy + Math.sin(a) * (rIn - 6))}" stroke="${p.steel[3]}" stroke-width="5" stroke-linecap="round"/>` }
  s += `<circle cx="${cx}" cy="${cy}" r="${hub}" fill="url(#brassDome)" stroke="#000" stroke-opacity=".55"/><circle cx="${cx}" cy="${cy}" r="${hub * 0.42}" fill="${p.brass[2]}"/>`
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s += `<circle cx="${f(cx + Math.cos(a) * hub * 0.72)}" cy="${f(cy + Math.sin(a) * hub * 0.72)}" r="1" fill="${p.brass[0]}" opacity=".8"/>` }
  return s
}

const arch = (x0: number, x1: number, top: number, bottom: number) => { const r = (x1 - x0) / 2; return `M${x0} ${bottom} V${top + r} A${r} ${r} 0 0 1 ${x1} ${top + r} V${bottom}Z` }

// ---- jukebox -------------------------------------------------------------------------------------------------------------------------------------
const jukebox: ArtDef = {
  svg: p => wrap(p, `
    <path d="${arch(26, 134, 8, 150)}" fill="url(#steel)"/><path d="${arch(26, 134, 8, 150)}" fill="#fff" filter="url(#grain)" opacity=".18"/>
    <path d="${arch(26, 134, 8, 150)}" fill="none" stroke="url(#brass)" stroke-width="5"/><path d="${arch(28.5, 131.5, 10.5, 150)}" fill="none" stroke="#fff" stroke-opacity=".35"/>
    <path d="${arch(40, 120, 24, 124)}" fill="${p.deep}"/>
    <path d="${arch(36, 124, 20, 128)}" fill="none" stroke="${p.accent}" stroke-width="3.4" opacity=".95"/><path d="${arch(36, 124, 20, 128)}" fill="none" stroke="${p.accent}" stroke-width="7" opacity=".3" filter="url(#blur2)"/>
    <path d="${arch(30, 130, 14, 134)}" fill="none" stroke="${p.accent2}" stroke-width="1.6" opacity=".7"/>
    <circle cx="80" cy="76" r="27" fill="#07090e"/><circle cx="80" cy="76" r="27" fill="none" stroke="${p.steel[1]}" stroke-width="1.6" opacity=".7"/>
    ${[24, 20, 16, 12].map(r => `<circle cx="80" cy="76" r="${r}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".7"/>`).join('')}
    <circle cx="80" cy="76" r="8" fill="${p.accent}"/><circle cx="80" cy="76" r="8" fill="url(#glassG)" opacity=".7"/><circle cx="80" cy="76" r="2" fill="#07090e"/>
    <path d="M58 56 A27 27 0 0 1 96 52" stroke="#fff" stroke-opacity=".28" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="44" y="108" width="72" height="16" rx="2" fill="#05070b"/>
    <path d="${arch(40, 120, 24, 124)}" fill="url(#glassG)" opacity=".5"/>
    ${plate(40, 130, 80, 14, 3, { fill: 'darkSteel', rivets: 2 })}
    ${[56, 72, 88].map(x => `<circle cx="${x}" cy="137" r="3.6" fill="url(#brassDome)" stroke="#000" stroke-opacity=".5"/><circle cx="${x - 1}" cy="136" r="1" fill="#fff" opacity=".7"/>`).join('')}
    <rect x="100" y="134" width="12" height="3.4" rx="1.7" fill="#000"/><rect x="100.5" y="134.5" width="11" height="1.2" rx=".6" fill="${p.lamp}" opacity=".7"/>
    <rect x="22" y="146" width="116" height="8" rx="2" fill="url(#darkSteel)"/><rect x="22" y="146" width="116" height="8" rx="2" fill="none" stroke="#000" stroke-opacity=".55"/>
    <circle cx="80" cy="13" r="4" fill="url(#brassDome)" stroke="#000" stroke-opacity=".5"/>
    ${[34, 126].map(x => `<rect x="${x - 3}" y="60" width="6" height="84" rx="2" fill="url(#steelH)"/>${[70, 90, 110, 130].map(y => `<rect x="${x - 3}" y="${y}" width="6" height="2" fill="#000" opacity=".3"/>`).join('')}`).join('')}`),
  fx: (c, t, p, hot) => {
    const bars = 9, w = 6.2
    for (let i = 0; i < bars; i++) {
      const v = 0.25 + 0.75 * tri(t * (1.1 + (i % 4) * 0.37) + i * 0.7), h = 4 + v * 15
      const x = 48.5 + i * (w + 1.1), g = c.createLinearGradient(0, 122, 0, 122 - h); g.addColorStop(0, p.accent2); g.addColorStop(1, p.accent)
      c.fillStyle = g; c.fillRect(x, 122 - h, w, h)
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x, 122 - h, w, 1)
    }
    c.save(); c.translate(80, 76); c.rotate(t * 1.9)
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-1, -26, 2, 15); c.restore()
    c.fillStyle = `rgba(255,224,138,${0.55 + 0.4 * Math.sin(t * 5)})`; c.fillRect(100.5, 134.5, 11, 1.2)
    if (hot) { c.strokeStyle = p.accent2; c.globalAlpha = 0.5; c.lineWidth = 2; c.beginPath(); c.arc(80, 76, 31, 0, 7); c.stroke(); c.globalAlpha = 1 }
  },
}

// ---- gear ----------------------------------------------------------------------------------------------------------------------------------------
const gear: ArtDef = {
  svg: p => wrap(p, `
    <circle cx="80" cy="80" r="72" fill="url(#steel)"/><circle cx="80" cy="80" r="72" fill="#fff" filter="url(#grain)" opacity=".2"/>
    <circle cx="80" cy="80" r="71" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/><circle cx="80" cy="80" r="72" fill="none" stroke="#000" stroke-opacity=".6"/>
    <circle cx="80" cy="80" r="63" fill="${p.deep}"/><circle cx="80" cy="80" r="63" fill="none" stroke="#000" stroke-width="4" opacity=".6"/><circle cx="80" cy="80" r="64.5" fill="none" stroke="${p.steel[0]}" stroke-opacity=".5" stroke-width="1"/>
    <circle cx="80" cy="80" r="63" fill="url(#aoR)"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return rivet(f(80 + Math.cos(a) * 68), f(80 + Math.sin(a) * 68), 1.9) }).join('')}
    ${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, r0 = 56, r1 = i % 2 ? 59 : 61.5; return `<path d="M${f(80 + Math.cos(a) * r0)} ${f(80 + Math.sin(a) * r0)} L${f(80 + Math.cos(a) * r1)} ${f(80 + Math.sin(a) * r1)}" stroke="${p.accent}" stroke-width="${i % 2 ? 0.8 : 1.3}" opacity=".55"/>` }).join('')}`),
  spin: [
    { cx: 80, cy: 80, rps: 0.04, svg: p => wrap(p, gearSprite(p, 80, 80, 40, 32, 14, 9, 6)) },
    { cx: 112, cy: 112, rps: -0.095, svg: p => wrap(p, gearSprite(p, 80, 80, 15, 11.5, 8, 4.5)) },
  ],
  fx: (c, t, p, hot) => { c.fillStyle = hot ? p.accent2 : p.accent; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2); c.beginPath(); c.arc(80, 80, 1.6, 0, 7); c.fill(); c.globalAlpha = 1 },
}

// ---- stat board ----------------------------------------------------------------------------------------------------------------------------------
const stats: ArtDef = {
  svg: p => wrap(p, `
    <path d="M46 98 L34 152" stroke="url(#steelH)" stroke-width="5" stroke-linecap="round"/><path d="M114 98 L126 152" stroke="url(#steelH)" stroke-width="5" stroke-linecap="round"/><path d="M80 98 V150" stroke="url(#steelH)" stroke-width="5" stroke-linecap="round"/>
    <rect x="28" y="124" width="104" height="5" rx="2" fill="url(#darkSteel)"/><rect x="30" y="148" width="10" height="5" rx="2" fill="#000" opacity=".6"/><rect x="120" y="148" width="10" height="5" rx="2" fill="#000" opacity=".6"/>
    <rect x="8" y="12" width="144" height="92" rx="7" fill="url(#brass)"/><rect x="8" y="12" width="144" height="92" rx="7" fill="#fff" filter="url(#grain)" opacity=".16"/>
    <rect x="8.8" y="12.8" width="142.4" height="90.4" rx="6.4" fill="none" stroke="#fff" stroke-opacity=".5"/><rect x="8" y="12" width="144" height="92" rx="7" fill="none" stroke="#000" stroke-opacity=".6"/>
    <rect x="17" y="21" width="126" height="74" rx="3" fill="${p.deep}"/><rect x="17" y="21" width="126" height="74" rx="3" fill="none" stroke="#000" stroke-width="2.5" opacity=".6"/>
    ${[0, 1, 2, 3, 4].map(i => `<path d="M17 ${f(34 + i * 12)} H143" stroke="${p.accent}" stroke-opacity=".13"/>`).join('')}${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${f(32 + i * 20)} 21 V95" stroke="${p.accent}" stroke-opacity=".08"/>`).join('')}
    <path d="M24 88 H138 M24 88 V26" stroke="${p.accent}" stroke-opacity=".55" stroke-width="1.2"/>
    <rect x="17" y="21" width="126" height="74" rx="3" fill="url(#glassG)" opacity=".5"/>
    ${rivet(14, 18, 1.8)}${rivet(146, 18, 1.8)}${rivet(14, 98, 1.8)}${rivet(146, 98, 1.8)}
    ${lamp(80, 108, 2.6, p.lamp, 1)}${plate(70, 118, 20, 6, 2, { fill: 'brass', grain: false })}`),
  fx: (c, t, p) => {
    const vals = [0.35, 0.55, 0.42, 0.78, 0.62, 0.9], grow = Math.min(1, (t % 9) / 1.4)
    vals.forEach((v, i) => {
      const h = 60 * v * (0.6 + 0.4 * grow) * (0.97 + 0.03 * Math.sin(t * 2 + i)), x = 30 + i * 18.5
      const g = c.createLinearGradient(0, 88, 0, 88 - h); g.addColorStop(0, p.accent); g.addColorStop(1, p.accent2)
      c.fillStyle = g; c.fillRect(x, 88 - h, 12, h); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x, 88 - h, 12, 1.4)
    })
    c.strokeStyle = p.lamp; c.lineWidth = 1.8; c.lineJoin = 'round'; c.beginPath()
    vals.forEach((v, i) => { const y = 88 - 60 * v * (0.6 + 0.4 * grow) - 6, x = 36 + i * 18.5; if (i) c.lineTo(x, y); else c.moveTo(x, y) }); c.stroke()
    vals.forEach((v, i) => { const y = 88 - 60 * v * (0.6 + 0.4 * grow) - 6, x = 36 + i * 18.5; c.fillStyle = p.lamp; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill() })
  },
}

// ---- doors (multiplayer and exit share one build) ----------------------------------------------------------------------------------------------------
function door(p: Palette, kind: 'vs' | 'exit'): string {
  const tone = kind === 'exit' ? p.danger : p.accent2
  return wrap(p, `
    <path d="${arch(22, 138, 8, 150)}" fill="url(#steel)"/><path d="${arch(22, 138, 8, 150)}" fill="#fff" filter="url(#grain)" opacity=".2"/><path d="${arch(22, 138, 8, 150)}" fill="none" stroke="#000" stroke-opacity=".6"/>
    <path d="${arch(24, 136, 10, 150)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/>
    <path d="${arch(34, 126, 20, 146)}" fill="url(#darkSteel)"/><path d="${arch(34, 126, 20, 146)}" fill="none" stroke="#000" stroke-width="2.4" opacity=".7"/>
    ${[52, 70, 88, 106].map(x => `<path d="M${x} 66 V146" stroke="#000" stroke-opacity=".38"/><path d="M${x + 1} 66 V146" stroke="#fff" stroke-opacity=".12"/>`).join('')}
    <rect x="34" y="92" width="92" height="9" fill="url(#steelH)"/><rect x="34" y="92" width="92" height="9" fill="none" stroke="#000" stroke-opacity=".5"/>
    ${[40, 56, 72, 88, 104, 120].map(x => rivet(x, 96.5, 1.5)).join('')}
    <circle cx="80" cy="52" r="19" fill="url(#brass)" stroke="#000" stroke-opacity=".6"/><circle cx="80" cy="52" r="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1" transform="translate(-.6 -.6)"/>
    <circle cx="80" cy="52" r="14.5" fill="${p.deep}"/>${glow(80, 52, 12, tone, 0.55)}<circle cx="80" cy="52" r="14.5" fill="url(#glassG)" opacity=".7"/>
    ${kind === 'vs' ? `<circle cx="73" cy="52" r="4.2" fill="${p.accent}"/><circle cx="87" cy="52" r="4.2" fill="${p.danger}"/><path d="M77 52 H83" stroke="#fff" stroke-width="1.4"/>` : `<path d="M72 52 H88 M82 45 L89 52 L82 59" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`}
    ${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return rivet(f(80 + Math.cos(a) * 17.5), f(52 + Math.sin(a) * 17.5), 1) }).join('')}
    ${enamel(54, 106, 52, 20, kind === 'vs' ? 'VS' : 'EXIT', { bg: kind === 'vs' ? '#e9e1cb' : '#f1d6d6', fg: kind === 'vs' ? '#1b2330' : '#5a1220', size: 15 })}
    <circle cx="112" cy="104" r="5" fill="url(#brassDome)" stroke="#000" stroke-opacity=".6"/><path d="M112 99 V109 M107 104 H117" stroke="${p.brass[2]}" stroke-width="1.4"/>
    ${hazard(34, 136, 92, 8, '#ffcf3a', '#15110a')}
    ${lamp(44, 17, 3.4, kind === 'exit' ? p.danger : p.accent, 0.5)}${lamp(116, 17, 3.4, kind === 'exit' ? p.danger : p.danger, 0.5)}`)
}
const flash = (c: CanvasRenderingContext2D, x: number, y: number, color: string, k: number) => {
  const g = c.createRadialGradient(x, y, 1, x, y, 14); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.globalAlpha = k * 0.75; c.fillStyle = g; c.fillRect(x - 14, y - 14, 28, 28); c.globalAlpha = k; c.fillStyle = color; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); c.globalAlpha = 1
}
const doorVs: ArtDef = { svg: p => door(p, 'vs'), fx: (c, t, p, hot) => { const a = 0.5 + 0.5 * Math.sin(t * 3.2); flash(c, 44, 17, p.accent, hot ? 1 : a); flash(c, 116, 17, p.danger, hot ? 1 : 1 - a) } }
const doorExit: ArtDef = { svg: p => door(p, 'exit'), fx: (c, t, p, hot) => { flash(c, 44, 17, p.danger, hot ? 1 : 0.45 + 0.55 * (Math.sin(t * 4) > 0 ? 1 : 0.15)); flash(c, 116, 17, p.danger, hot ? 1 : 0.45 + 0.55 * (Math.sin(t * 4) > 0 ? 0.15 : 1)) } }

// ---- easel -----------------------------------------------------------------------------------------------------------------------------------------
const WOOD = ['#c8935a', '#8a5a2e', '#4a2b12'] as const
const easel: ArtDef = {
  svg: p => wrap(p, `
    <path d="M44 150 L64 14 H72 L56 150Z" fill="${WOOD[1]}"/><path d="M116 150 L96 14 H88 L104 150Z" fill="${WOOD[1]}"/><path d="M76 20 H84 V150 H76Z" fill="${WOOD[2]}"/>
    <path d="M44 150 L64 14 H67 L48 150Z" fill="${WOOD[0]}" opacity=".7"/><path d="M116 150 L96 14 H93 L112 150Z" fill="${WOOD[0]}" opacity=".5"/>
    <path d="M44 150 L64 14 H72 L56 150Z" fill="#000" filter="url(#wood)" opacity=".4"/><path d="M116 150 L96 14 H88 L104 150Z" fill="#000" filter="url(#wood)" opacity=".4"/>
    <rect x="24" y="116" width="112" height="9" rx="2" fill="${WOOD[1]}"/><rect x="24" y="116" width="112" height="3" rx="1.5" fill="${WOOD[0]}"/><rect x="24" y="116" width="112" height="9" rx="2" fill="none" stroke="#000" stroke-opacity=".55"/>
    <rect x="22" y="22" width="116" height="90" rx="3" fill="${mix(p.paper, '#ffffff', 0.15)}" stroke="#000" stroke-opacity=".6"/>
    <rect x="22" y="22" width="116" height="90" rx="3" fill="url(#paperG)" opacity=".6"/>
    <rect x="22" y="22" width="116" height="90" fill="#000" filter="url(#wood)" opacity=".12"/>
    <rect x="34" y="34" width="9" height="46" rx="1.5" fill="${p.accent}"/><rect x="117" y="52" width="9" height="46" rx="1.5" fill="${p.danger}"/>
    <path d="M60 94 Q80 28 100 78" stroke="${p.lamp}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".92"/><circle cx="80" cy="66" r="6" fill="${p.paper}" stroke="#000" stroke-opacity=".4"/>
    <path d="M38 100 Q60 108 82 100 T126 104" stroke="${p.accent2}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>
    <rect x="22" y="22" width="116" height="90" rx="3" fill="url(#glassG)" opacity=".28"/>
    <ellipse cx="38" cy="132" rx="14" ry="6" fill="${p.steel[2]}"/><ellipse cx="38" cy="130.5" rx="13" ry="5" fill="${p.steel[1]}"/><circle cx="32" cy="130" r="2.6" fill="${p.danger}"/><circle cx="38" cy="129" r="2.6" fill="${p.lamp}"/><circle cx="44" cy="130.5" r="2.6" fill="${p.accent}"/>
    <path d="M128 140 L146 110" stroke="${WOOD[0]}" stroke-width="3.4" stroke-linecap="round"/><path d="M146 110 L150 102" stroke="${p.brass[1]}" stroke-width="3.4" stroke-linecap="round"/><path d="M150 102 L152 98" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>`),
}

// ---- wardrobe --------------------------------------------------------------------------------------------------------------------------------------
const wardrobe: ArtDef = {
  svg: p => wrap(p, `
    <rect x="30" y="144" width="9" height="12" fill="${WOOD[2]}"/><rect x="121" y="144" width="9" height="12" fill="${WOOD[2]}"/>
    <rect x="22" y="8" width="116" height="14" rx="3" fill="${WOOD[0]}"/><rect x="22" y="8" width="116" height="5" rx="2.5" fill="#fff" opacity=".25"/><rect x="22" y="8" width="116" height="14" rx="3" fill="none" stroke="#000" stroke-opacity=".55"/>
    <rect x="26" y="20" width="108" height="126" rx="2" fill="${WOOD[1]}"/><rect x="26" y="20" width="108" height="126" fill="#000" filter="url(#wood)" opacity=".45"/><rect x="26" y="20" width="108" height="126" rx="2" fill="none" stroke="#000" stroke-opacity=".6"/>
    <rect x="32" y="26" width="46" height="114" rx="2" fill="${WOOD[2]}" stroke="#000" stroke-opacity=".6"/>
    <rect x="82" y="26" width="46" height="114" rx="2" fill="${p.deep}" stroke="#000" stroke-opacity=".6"/>
    <rect x="82" y="26" width="46" height="114" rx="2" fill="${p.accent}" opacity=".12"/>
    <path d="M86 40 H124 V70 L108 58 L86 76Z" fill="${p.accent2}" opacity=".18"/>
    <path d="M90 30 V132" stroke="#fff" stroke-opacity=".1" stroke-width="6"/>
    <path d="M88 44 H112 V54 H100 V64 H88Z" fill="${p.danger}"/><path d="M88 66 H112 V76 H88Z" fill="${p.paper}"/><path d="M88 78 H112 V88 H88Z" fill="${p.accent}"/>
    <rect x="36" y="32" width="38" height="46" rx="1.5" fill="${WOOD[1]}" stroke="#000" stroke-opacity=".5"/><rect x="36" y="86" width="38" height="46" rx="1.5" fill="${WOOD[1]}" stroke="#000" stroke-opacity=".5"/>
    <rect x="36" y="32" width="38" height="46" rx="1.5" fill="none" stroke="${WOOD[0]}" stroke-opacity=".5"/><rect x="36" y="86" width="38" height="46" rx="1.5" fill="none" stroke="${WOOD[0]}" stroke-opacity=".5"/>
    ${glass(40, 36, 30, 38, 2, '#0e1822', 0.8)}
    <circle cx="70" cy="86" r="3.6" fill="url(#brassDome)" stroke="#000" stroke-opacity=".6"/><rect x="66" y="82" width="8" height="8" rx="3" fill="none"/>
    <path d="M78 26 V140" stroke="#000" stroke-opacity=".5" stroke-width="2"/>
    <rect x="22" y="144" width="116" height="6" rx="2" fill="${WOOD[0]}" stroke="#000" stroke-opacity=".55"/>`),
  fx: (c, t, p) => { c.globalAlpha = 0.18 + 0.1 * Math.sin(t * 1.6); c.fillStyle = p.accent2; c.fillRect(82, 26, 46, 114); c.globalAlpha = 1 },
}

// ---- LilEye's nest ---------------------------------------------------------------------------------------------------------------------------------
const NEST = ['#c9a56a', '#8a6a3a', '#4b351a'] as const
const eye: ArtDef = {
  svg: p => wrap(p, `
    <ellipse cx="80" cy="124" rx="62" ry="24" fill="${NEST[2]}"/>
    ${Array.from({ length: 42 }, (_, i) => { const a = (i / 42) * Math.PI * 2 + rnd(i) * 0.2, rx = 58 + rnd(i + 3) * 5, ry = 20 + rnd(i + 9) * 4; return `<path d="M${f(80 + Math.cos(a) * rx * 0.6)} ${f(124 + Math.sin(a) * ry * 0.6)} Q${f(80 + Math.cos(a + 0.5) * rx)} ${f(124 + Math.sin(a + 0.5) * ry * 1.1)} ${f(80 + Math.cos(a + 1) * rx * 0.7)} ${f(124 + Math.sin(a + 1) * ry * 0.7)}" stroke="${i % 3 ? NEST[0] : NEST[1]}" stroke-width="${f(2 + rnd(i + 5) * 2)}" fill="none" stroke-linecap="round" opacity=".9"/>` }).join('')}
    <ellipse cx="80" cy="120" rx="50" ry="16" fill="${NEST[2]}" opacity=".85"/>
    <circle cx="80" cy="76" r="44" fill="#000" opacity=".25" filter="url(#blur4)" transform="translate(2 6)"/>
    <circle cx="80" cy="74" r="43" fill="#f4ecdf"/><circle cx="80" cy="74" r="43" fill="url(#aoR)"/>
    <path d="M40 78 q10 -3 14 4 M122 62 q-9 5 -10 14 M62 112 q4 -9 14 -9 M110 108 q-3 -7 -10 -10 M46 56 q7 1 11 7" stroke="#d98a8a" stroke-width=".9" fill="none" opacity=".6"/>
    <circle cx="80" cy="74" r="43" fill="url(#glassG)" opacity=".4"/>`),
  fx: (c, t, p, hot) => {
    const look = hot ? 0 : 1, gx = Math.sin(t * 0.7) * 11 * look, gy = Math.cos(t * 0.53) * 7 * look + 2
    const blink = (t % 4.6) > 4.42 ? Math.max(0.06, Math.abs(((t % 4.6) - 4.51) / 0.09)) : 1
    c.save(); c.translate(80 + gx, 74 + gy); c.scale(1, blink)
    const ir = c.createRadialGradient(-4, -5, 2, 0, 0, 22); ir.addColorStop(0, mix(p.accent, '#ffffff', 0.3)); ir.addColorStop(0.55, p.accent); ir.addColorStop(1, shade(p.accent, -0.3))
    c.fillStyle = ir; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill()
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 21.2, 0, 7); c.stroke()
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 0.8
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); c.stroke() }
    c.fillStyle = '#05070b'; c.beginPath(); c.arc(0, 0, 9.5 - 1.5 * Math.sin(t * 0.9), 0, 7); c.fill()
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-8, -9, 5, 3.2, -0.6, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(7, 8, 2.2, 0, 7); c.fill()
    c.restore()
    if (blink < 1) { c.fillStyle = '#d9c2a4'; c.beginPath(); c.ellipse(80, 74, 43, (1 - blink) * 43, 0, 0, 7); c.fill() }
  },
}

// ---- cassette --------------------------------------------------------------------------------------------------------------------------------------
const reel = (c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, p: Palette) => {
  c.save(); c.translate(x, y); c.rotate(a)
  c.fillStyle = '#e9e4d6'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill()
  c.fillStyle = '#0b0d12'; c.beginPath(); c.arc(0, 0, r * 0.62, 0, 7); c.fill()
  c.fillStyle = '#e9e4d6'; for (let i = 0; i < 6; i++) { c.save(); c.rotate((i / 6) * Math.PI * 2); c.fillRect(-1, -r * 0.62, 2, r * 0.3); c.restore() }
  c.strokeStyle = p.steel[2]; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); c.restore()
}
const cassette: ArtDef = {
  svg: p => wrap(p, `
    ${plate(10, 32, 140, 96, 8, { fill: 'darkSteel', rivets: 4 })}
    <rect x="22" y="40" width="116" height="48" rx="3" fill="${p.paper}"/><rect x="22" y="40" width="116" height="48" rx="3" fill="url(#paperG)" opacity=".8"/><rect x="22" y="40" width="116" height="48" rx="3" fill="none" stroke="#000" stroke-opacity=".5"/>
    <rect x="22" y="40" width="116" height="9" fill="${p.danger}" opacity=".85"/>
    <path d="M30 62 H120 M30 70 H108 M30 78 H114" stroke="#33405a" stroke-width="1" opacity=".5"/>
    <text x="80" y="60" text-anchor="middle" font-family="'Courier New',monospace" font-weight="900" font-size="9" fill="#1d2536" letter-spacing=".8">SAVED FALL</text>
    <path d="M44 108 L50 128 H110 L116 108Z" fill="${p.deep}" stroke="#000" stroke-opacity=".6"/>
    <rect x="44" y="96" width="72" height="30" rx="4" fill="#0a0c11" stroke="${p.steel[1]}" stroke-opacity=".6"/>
    <circle cx="62" cy="111" r="11" fill="#0a0c11"/><circle cx="98" cy="111" r="11" fill="#0a0c11"/>
    <path d="M62 122 H98" stroke="#5b4a3a" stroke-width="2"/>
    <rect x="44" y="96" width="72" height="30" rx="4" fill="url(#glassG)" opacity=".6"/>
    ${([[16, 36], [144, 36], [16, 124], [144, 124]] as const).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="url(#rivet)"/><path d="M${x - 2} ${y} H${x + 2}" stroke="#000" stroke-opacity=".6"/>`).join('')}
    <path d="M52 92 H108" stroke="#000" stroke-opacity=".5" stroke-width="3"/>`),
  fx: (c, t, p) => { reel(c, 62, 111, 9.5, t * 2.4, p); reel(c, 98, 111, 9.5, t * 2.4 + 1, p) },
}

// ---- flask (game lab) --------------------------------------------------------------------------------------------------------------------------------
const flask: ArtDef = {
  svg: p => wrap(p, `
    <ellipse cx="80" cy="146" rx="46" ry="8" fill="#000" opacity=".45" filter="url(#blur2)"/>
    ${plate(36, 134, 88, 14, 4, { fill: 'brass', rivets: 2 })}
    <path d="M64 12 H96 V52 L132 120 Q140 136 124 136 H36 Q20 136 28 120 L64 52Z" fill="#0e1b28" opacity=".55"/>
    <path d="M50 94 L28 120 Q20 136 36 136 H124 Q140 136 132 120 L110 94 Q80 84 50 94Z" fill="${p.accent2}" opacity=".92"/>
    <path d="M50 94 L28 120 Q20 136 36 136 H124 Q140 136 132 120 L110 94 Q80 84 50 94Z" fill="url(#aoR)"/>
    <path d="M50 94 Q80 84 110 94" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/>
    ${glow(80, 122, 22, p.accent2, 0.22)}
    <path d="M64 12 H96 V52 L132 120 Q140 136 124 136 H36 Q20 136 28 120 L64 52Z" fill="none" stroke="#dff3ff" stroke-opacity=".7" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M70 14 V54 L36 120" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="60" y="6" width="40" height="8" rx="3" fill="url(#steelH)" stroke="#000" stroke-opacity=".5"/>
    ${[26, 34, 42].map((y, i) => `<path d="M${i % 2 ? 92 : 90} ${y} H96" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/>`).join('')}`),
  fx: (c, t, p) => {
    for (let i = 0; i < 7; i++) {
      const k = ((t * (0.25 + rnd(i) * 0.2) + rnd(i + 4)) % 1), x = 54 + rnd(i + 1) * 52, y = 124 - k * 96, r = 1.2 + rnd(i + 7) * 2.4
      if (y < 56 && (x < 70 || x > 90)) continue
      c.globalAlpha = Math.sin(k * Math.PI) * 0.85; c.strokeStyle = '#eafffb'; c.fillStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1
      c.beginPath(); c.arc(x + Math.sin(t * 2 + i) * 2, y, r, 0, 7); c.fill(); c.stroke()
    }
    c.globalAlpha = 1
  },
}

// ---- book (rules) ----------------------------------------------------------------------------------------------------------------------------------
const book: ArtDef = {
  svg: p => wrap(p, `
    <path d="M18 24 Q50 14 80 28 Q110 14 142 24 V132 Q110 124 80 138 Q50 124 18 132Z" fill="${shade(p.steel[3], -0.02)}" stroke="#000" stroke-opacity=".6"/>
    <path d="M24 28 Q52 20 80 32 V132 Q52 122 24 128Z" fill="${p.paper}"/><path d="M80 32 Q108 20 136 28 V128 Q108 122 80 132Z" fill="${mix(p.paper, '#000000', 0.1)}"/>
    <path d="M24 28 Q52 20 80 32 V132 Q52 122 24 128Z" fill="url(#paperG)" opacity=".5"/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M32 ${44 + i * 11} Q54 ${40 + i * 11} 72 ${48 + i * 11}" stroke="#2a3550" stroke-opacity=".55" fill="none"/><path d="M88 ${48 + i * 11} Q108 ${40 + i * 11} 128 ${44 + i * 11}" stroke="#2a3550" stroke-opacity=".55" fill="none"/>`).join('')}
    <circle cx="48" cy="104" r="8" fill="none" stroke="${p.danger}" stroke-width="1.6" opacity=".8"/><path d="M42 104 Q48 98 54 104 Q48 110 42 104Z" fill="${p.accent}" opacity=".8"/>
    <path d="M80 32 V132" stroke="#000" stroke-opacity=".45" stroke-width="3"/><path d="M82 32 V132" stroke="#fff" stroke-opacity=".15"/>
    <path d="M92 130 V152 L97 147 L102 152 V129" fill="${p.danger}" stroke="#000" stroke-opacity=".5"/>
    <path d="M18 132 Q50 124 80 138 Q110 124 142 132 V138 Q110 130 80 144 Q50 130 18 138Z" fill="${shade(p.steel[3], 0.02)}" stroke="#000" stroke-opacity=".6"/>`),
}

// ---- keyboard --------------------------------------------------------------------------------------------------------------------------------------
const keys: ArtDef = {
  svg: p => {
    let caps = ''
    const row = (y: number, n: number, x0: number, w: number) => { for (let i = 0; i < n; i++) { const x = x0 + i * (w + 3); caps += `<rect x="${x}" y="${y + 3}" width="${w}" height="13" rx="2.5" fill="#05070b" opacity=".6"/><rect x="${x}" y="${y}" width="${w}" height="13" rx="2.5" fill="url(#darkSteel)"/><rect x="${x + 1.4}" y="${y + 1.2}" width="${w - 2.8}" height="9" rx="2" fill="${p.steel[2]}" opacity=".85"/><rect x="${x + 1.4}" y="${y + 1.2}" width="${w - 2.8}" height="3" rx="1.5" fill="#fff" opacity=".28"/>` } }
    row(50, 8, 18, 12); row(68, 8, 22, 12); row(86, 7, 28, 12)
    caps += `<rect x="42" y="106" width="76" height="13" rx="2.5" fill="#05070b" opacity=".6"/><rect x="42" y="103" width="76" height="13" rx="2.5" fill="url(#darkSteel)"/><rect x="43.4" y="104.2" width="73.2" height="9" rx="2" fill="${p.steel[2]}" opacity=".85"/><rect x="43.4" y="104.2" width="73.2" height="3" rx="1.5" fill="#fff" opacity=".28"/>`
    return wrap(p, `${plate(8, 38, 144, 90, 8, { fill: 'steel', rivets: 4 })}<rect x="14" y="44" width="132" height="78" rx="4" fill="${p.deep}"/><rect x="14" y="44" width="132" height="78" rx="4" fill="none" stroke="#000" stroke-width="2" opacity=".6"/>${caps}${lamp(22, 32, 2, p.lamp, 1)}${lamp(32, 32, 2, p.accent, 1)}`)
  },
  fx: (c, t, p) => {
    const rows = [{ y: 50, n: 8, x0: 18, w: 12 }, { y: 68, n: 8, x0: 22, w: 12 }, { y: 86, n: 7, x0: 28, w: 12 }]
    for (let i = 0; i < 3; i++) { const r = rows[(i + Math.floor(t * 0.9)) % 3]!, k = Math.floor(t * 2.2 + i * 3.7) % r.n; c.globalAlpha = 0.6 * (0.5 + 0.5 * Math.sin(t * 6 + i)); c.fillStyle = p.accent2; c.fillRect(r.x0 + k * (r.w + 3) + 1.4, r.y + 1.2, r.w - 2.8, 9) }
    c.globalAlpha = 1
  },
}

// ---- floppy ----------------------------------------------------------------------------------------------------------------------------------------
const save: ArtDef = {
  svg: p => wrap(p, `
    <path d="M18 18 H112 L142 48 V142 H18Z" fill="${p.accent}" stroke="#000" stroke-opacity=".6"/>
    <path d="M18 18 H112 L142 48 V142 H18Z" fill="url(#glassG)" opacity=".55"/><path d="M18 18 H112 L142 48 V142 H18Z" fill="#000" filter="url(#grain)" opacity=".2"/>
    <path d="M18.8 18.8 H111.7 L141.2 48.3 V141.2 H18.8Z" fill="none" stroke="#fff" stroke-opacity=".4"/>
    <rect x="46" y="18" width="62" height="42" rx="2" fill="url(#steelH)" stroke="#000" stroke-opacity=".6"/><rect x="88" y="24" width="12" height="30" rx="1.5" fill="${p.deep}" stroke="#000" stroke-opacity=".6"/>
    <path d="M46 40 H88" stroke="#000" stroke-opacity=".25"/>
    <rect x="30" y="80" width="100" height="56" rx="2" fill="${p.paper}" stroke="#000" stroke-opacity=".5"/><rect x="30" y="80" width="100" height="56" rx="2" fill="url(#paperG)" opacity=".7"/>
    <rect x="30" y="80" width="100" height="10" fill="${p.danger}" opacity=".85"/>
    ${[100, 109, 118, 127].map(y => `<path d="M38 ${y} H122" stroke="#33405a" stroke-opacity=".45"/>`).join('')}
    <path d="M44 114 q10 -9 18 0 t18 0 t16 0" fill="none" stroke="#1d2a44" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="26" cy="134" r="2" fill="${p.deep}"/>`),
}

// ---- restart ---------------------------------------------------------------------------------------------------------------------------------------
const restart: ArtDef = {
  svg: p => wrap(p, `
    ${plate(14, 14, 132, 132, 14, { fill: 'steel', rivets: 4 })}
    <circle cx="80" cy="84" r="47" fill="#000" opacity=".5" filter="url(#blur2)"/>
    <circle cx="80" cy="80" r="46" fill="url(#brass)" stroke="#000" stroke-opacity=".6"/><circle cx="80" cy="80" r="46" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.4" transform="translate(-.7 -.7)"/>
    <circle cx="80" cy="80" r="37" fill="url(#brassDome)" stroke="#000" stroke-opacity=".5"/>
    <path d="M104 80 A24 24 0 1 1 94 60" fill="none" stroke="${p.brass[2]}" stroke-width="8" stroke-linecap="round"/>
    <path d="M104 80 A24 24 0 1 1 94 60" fill="none" stroke="${p.paper}" stroke-width="5" stroke-linecap="round"/>
    <path d="M84 52 L100 56 L92 70Z" fill="${p.paper}" stroke="${p.brass[2]}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M56 58 Q66 46 80 44" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`),
  fx: (c, t, p, hot) => { c.globalAlpha = 0.15 + (hot ? 0.3 : 0.1) * Math.sin(t * 3); c.strokeStyle = p.accent2; c.lineWidth = 3; c.beginPath(); c.arc(80, 80, 51, 0, 7); c.stroke(); c.globalAlpha = 1 },
}

// ---- LokPack in its neon Loksleeve -------------------------------------------------------------------------------------------------------------
const pack: ArtDef = {
  svg: p => wrap(p, `
    <ellipse cx="80" cy="146" rx="46" ry="6" fill="#000" opacity=".4" filter="url(#blur2)"/>
    <rect x="44" y="30" width="72" height="104" rx="7" fill="${p.deep}" stroke="#000" stroke-opacity=".6"/>
    <path d="M52 40 H108 V128 H52Z" fill="url(#glassG)" opacity=".5"/>
    <g transform="translate(80 84) rotate(-6) translate(-26 -44)">
      <rect width="52" height="88" rx="4" fill="url(#brass)" stroke="#000" stroke-opacity=".6"/>
      <rect width="52" height="88" rx="4" fill="${p.accent}" opacity=".55"/><rect width="52" height="88" rx="4" fill="url(#glassG)" opacity=".5"/>
      <path d="M0 6 H52 M0 82 H52" stroke="#000" stroke-opacity=".35" stroke-dasharray="2 2"/>
      <rect x="9" y="22" width="34" height="30" rx="4" fill="none" stroke="${p.paper}" stroke-width="1.6"/>
      <text x="26" y="43" text-anchor="middle" font-family="system-ui" font-weight="900" font-size="15" fill="${p.paper}">LOK</text>
      <rect x="10" y="62" width="32" height="4" rx="2" fill="${p.paper}" opacity=".7"/><rect x="14" y="70" width="24" height="3" rx="1.5" fill="${p.paper}" opacity=".45"/>
    </g>
    <rect x="44" y="30" width="72" height="104" rx="7" fill="none" stroke="${p.accent2}" stroke-width="3"/>
    <rect x="44" y="30" width="72" height="104" rx="7" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1" transform="translate(-.6 -.6)"/>
    ${glow(44, 30, 14, p.accent2, 0.35)}${glow(116, 134, 14, p.accent, 0.35)}`),
  fx: (c, t, p, hot) => { c.save(); c.strokeStyle = p.accent2; c.shadowColor = p.accent2; c.shadowBlur = hot ? 16 : 9; c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2.4) + (hot ? 0.2 : 0); c.lineWidth = 3; c.beginPath(); c.roundRect(44, 30, 72, 104, 7); c.stroke(); c.restore()
    for (let i = 0; i < 5; i++) { const k = (t * 0.4 + i / 5) % 1; c.globalAlpha = (1 - k) * 0.8; c.fillStyle = p.lamp; c.beginPath(); c.arc(50 + rnd(i) * 60, 128 - k * 90, 1.2, 0, 7); c.fill() } c.globalAlpha = 1 },
}

export const ART: Record<ArtId, ArtDef> = { jukebox, stats, gear, easel, wardrobe, eye, door: doorVs, cassette, flask, book, exit: doorExit, keys, save, restart, pack }
export { rgba }
