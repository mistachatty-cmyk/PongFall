// A small kit for drawing the world's objects as lit, physical things: metal with a bevel and grain, brass, glass, enamel plates, rivets and lamps.
// Everything is palette-driven (palette.ts) so each theme gets the same objects in its own materials. Light comes from the top left throughout.
import { mix, rgba, shade, type Palette } from '../palette'

export const SVG_SIZE = 160
/** The shared definitions: material gradients, a grain filter, soft glows. Ids are fixed because every sprite is its own document. */
export function defs(p: Palette): string {
  const [s0, s1, s2, s3] = p.steel, [b0, b1, b2] = p.brass
  return `<defs>
<linearGradient id="steel" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset=".18" stop-color="${s0}"/><stop offset=".5" stop-color="${s2}"/><stop offset="1" stop-color="${s3}"/></linearGradient>
<linearGradient id="steelH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${s3}"/><stop offset=".22" stop-color="${s1}"/><stop offset=".4" stop-color="${s0}"/><stop offset=".7" stop-color="${s2}"/><stop offset="1" stop-color="${s3}"/></linearGradient>
<linearGradient id="darkSteel" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="${shade(s2, -0.1)}"/><stop offset="1" stop-color="${shade(s3, -0.06)}"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${b0}"/><stop offset=".35" stop-color="${b1}"/><stop offset=".7" stop-color="${mix(b1, b2, 0.45)}"/><stop offset="1" stop-color="${b2}"/></linearGradient>
<linearGradient id="brassH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b2}"/><stop offset=".25" stop-color="${b1}"/><stop offset=".45" stop-color="${b0}"/><stop offset=".75" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient>
<linearGradient id="deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(p.deep, 0.04)}"/><stop offset="1" stop-color="${shade(p.deep, -0.03)}"/></linearGradient>
<linearGradient id="glassG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".3" stop-color="#ffffff" stop-opacity=".08"/><stop offset=".7" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".18"/></linearGradient>
<linearGradient id="paperG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(p.paper, '#ffffff', 0.35)}"/><stop offset="1" stop-color="${mix(p.paper, '#000000', 0.18)}"/></linearGradient>
<radialGradient id="rivet" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${s0}"/><stop offset=".5" stop-color="${s2}"/><stop offset="1" stop-color="${s3}"/></radialGradient>
<radialGradient id="brassDome" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${b0}"/><stop offset=".55" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></radialGradient>
<radialGradient id="aoR" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1 .06" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 -.12"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="wood" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".02 .5" numOctaves="3" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.3 -.42"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter><filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter><filter id="blur1"><feGaussianBlur stdDeviation="1"/></filter>
<filter id="drop" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="1.5" dy="3.5" stdDeviation="3" flood-color="#000" flood-opacity=".55"/></filter>
</defs>`
}

export const wrap = (p: Palette, body: string, size = SVG_SIZE): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${size * 2}" height="${size * 2}">${defs(p)}<g filter="url(#drop)">${body}</g></svg>`

const f = (n: number) => Math.round(n * 100) / 100

export const rivet = (x: number, y: number, r = 2): string =>
  `<circle cx="${x}" cy="${y + 0.5}" r="${r + 0.5}" fill="#000" opacity=".35"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#rivet)"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.28)}" fill="#fff" opacity=".7"/>`

/** A bevelled metal plate: gradient body, grain, a lit top-left edge and a shadowed bottom-right edge. `rivets` places one in each corner. */
export function plate(x: number, y: number, w: number, h: number, r: number, o: { fill?: string; rivets?: number; edge?: string; grain?: boolean } = {}): string {
  const fill = o.fill ?? 'steel', e = o.edge
  const id = `c${Math.round(x)}_${Math.round(y)}_${Math.round(w)}_${Math.round(h)}`
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${fill})"/>`
  if (o.grain !== false) s += `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath><g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" filter="url(#grain)" opacity=".22"/></g>`
  s += `<rect x="${x + 0.75}" y="${y + 0.75}" width="${w - 1.5}" height="${h - 1.5}" rx="${Math.max(0, r - 0.75)}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.1"/>`
  s += `<path d="M${x + r} ${y + h - 0.6} H${x + w - r} Q${x + w - 0.6} ${y + h - 0.6} ${x + w - 0.6} ${y + h - r} V${y + r}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.4"/>`
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${e ?? '#000'}" stroke-opacity="${e ? 0.9 : 0.55}" stroke-width=".9"/>`
  const n = o.rivets ?? 0, m = Math.min(5, r + 3.5)
  if (n >= 4) s += rivet(x + m, y + m) + rivet(x + w - m, y + m) + rivet(x + m, y + h - m) + rivet(x + w - m, y + h - m)
  else if (n === 2) s += rivet(x + m, y + m) + rivet(x + w - m, y + m)
  return s
}

/** A glass pane: dark tint, a diagonal glare and a thin bright rim. */
export function glass(x: number, y: number, w: number, h: number, r: number, tintHex = '#0a1624', a = 0.86): string {
  const id = `g${Math.round(x)}_${Math.round(y)}`
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${tintHex}" opacity="${a}"/><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath><g clip-path="url(#${id})"><path d="M${x - 4} ${y + h * 0.7} L${x + w * 0.6} ${y - 4} L${x + w * 0.85} ${y - 4} L${x - 4} ${y + h * 1.0}Z" fill="url(#glassG)" opacity=".9"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glassG)" opacity=".5"/></g><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="#fff" stroke-opacity=".28"/>`
}

/** A lamp: a glowing dome with a metal bezel. `on` dims it. */
export function lamp(x: number, y: number, r: number, color: string, on = 1): string {
  return `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="${color}" opacity="${0.22 * on}" filter="url(#blur4)"/><circle cx="${x}" cy="${y}" r="${r + 1.6}" fill="url(#steel)"/><circle cx="${x}" cy="${y}" r="${r + 1.6}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="${r}" fill="${shade(color, -0.25)}"/><circle cx="${x}" cy="${y}" r="${r * 0.82}" fill="${color}" opacity="${0.35 + 0.65 * on}"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.32)}" fill="#fff" opacity="${0.35 + 0.5 * on}"/>`
}

/** A soft glow behind or around something. */
export const glow = (x: number, y: number, r: number, color: string, a = 0.4): string => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${a}" filter="url(#blur4)"/>`

/** An enamel sign: a paper-white or coloured plate with a dark border and the text stamped on it. */
export function enamel(x: number, y: number, w: number, h: number, text: string, o: { bg?: string; fg?: string; size?: number; border?: string } = {}): string {
  const bg = o.bg ?? '#efe6cf', fg = o.fg ?? '#1b1a17', border = o.border ?? fg, size = o.size ?? h * 0.55
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${bg}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="url(#glassG)" opacity=".5"/><rect x="${x + 1.6}" y="${y + 1.6}" width="${w - 3.2}" height="${h - 3.2}" rx="1.6" fill="none" stroke="${border}" stroke-width=".8" opacity=".8"/><text x="${x + w / 2}" y="${y + h / 2 + size * 0.35}" text-anchor="middle" font-family="Impact,'Arial Black',system-ui,sans-serif" font-weight="900" font-size="${size}" letter-spacing=".6" fill="${fg}">${text}</text>`
}

/** Hazard stripes (a door sill). */
export function hazard(x: number, y: number, w: number, h: number, a: string, b: string): string {
  const id = `hz${Math.round(x)}_${Math.round(y)}`
  let s = `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${b}"/><g clip-path="url(#${id})">`
  for (let i = -h; i < w + h; i += h * 1.6) s += `<path d="M${x + i} ${y + h} L${x + i + h} ${y} L${x + i + h * 1.8} ${y} L${x + i + h * 0.8} ${y + h}Z" fill="${a}"/>`
  return s + `</g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glassG)" opacity=".35"/>`
}

export { rgba, shade, mix }
