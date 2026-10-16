// The lit, physical look for the DOM pages (settings, controls, Arena Sides, LilEye, stats, saved matches, the original menu, pause and end cards),
// matching the world's objects: bevelled metal panels with grain and a lit top edge, brass-edged buttons that press, lamp-style switches, brushed
// sliders. Pure: a palette goes in, a stylesheet comes out (applied by applyPageSkin). It only adds depth (gradients, shadows, bevels): colours still
// come from the theme (uiThemes.ts), so every theme and accent keeps working and no layout changes.
import { rgba, shade, mix, type Palette } from '../world/palette'

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9 .05' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .3 -.1'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='.3'/></svg>\")"

const PANELS = '.pf-menu .pf-panel, [data-pf="panel"], [data-pf="pause-menu"] > div, .pf-end-panel, .as-card, .le-card, .as-item, .wm-saves li, .pf-menu-settings'
const BUTTONS = '.pf-menu button, [data-pf="panel"] button, [data-pf="pause-menu"] button, .pf-end-panel button, .as-btn, .le-page button, .as-root button, .wm-saves button'
const HEADS = '.pf-menu h1, .as-root h1, .le-page h1, .wm-saves h1, [data-pf="panel"] b'

export function skinCss(p: Palette): string {
  const lit = rgba('#ffffff', 0.2), dark = 'rgba(0,0,0,.45)', edge = p.plaque.edge, rim = p.plaque.rim
  return `
${PANELS}{background-image:linear-gradient(180deg,${rgba('#ffffff', 0.07)},rgba(0,0,0,.18)),${GRAIN} !important;box-shadow:inset 0 1px 0 ${lit},inset 0 -2px 0 ${dark},inset 0 0 0 1px ${rgba(rim, 0.25)},0 8px 24px rgba(0,0,0,.5) !important}
${BUTTONS}{background-image:linear-gradient(180deg,${rgba('#ffffff', 0.14)},rgba(0,0,0,.2)) !important;box-shadow:inset 0 1px 0 ${lit},inset 0 -2px 0 ${dark},0 2px 5px rgba(0,0,0,.45) !important;transition:transform .08s,box-shadow .08s,filter .12s}
${BUTTONS.split(', ').map(s => s + ':hover').join(', ')}{filter:brightness(1.12)}
${BUTTONS.split(', ').map(s => s + ':active').join(', ')}{transform:translateY(1px);box-shadow:inset 0 2px 4px rgba(0,0,0,.55),0 1px 2px rgba(0,0,0,.4) !important}
${HEADS}{text-shadow:0 1px 0 rgba(0,0,0,.6),0 0 18px ${rgba(p.accent, 0.35)}}
[data-pf="panel"] input[type=checkbox]{-webkit-appearance:none;appearance:none;width:34px;height:18px;border-radius:9px;background:${shade(p.deep, 0.02)} linear-gradient(180deg,rgba(0,0,0,.5),rgba(255,255,255,.06));border:1px solid ${edge};position:relative;cursor:pointer;box-shadow:inset 0 2px 4px rgba(0,0,0,.6)}
[data-pf="panel"] input[type=checkbox]::after{content:"";position:absolute;top:1px;left:1px;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${p.steel[0]},${p.steel[2]} 65%,${p.steel[3]});box-shadow:0 1px 2px rgba(0,0,0,.6);transition:left .12s}
[data-pf="panel"] input[type=checkbox]:checked{border-color:${p.accent};box-shadow:inset 0 2px 4px rgba(0,0,0,.6),0 0 8px ${rgba(p.accent, 0.5)}}
[data-pf="panel"] input[type=checkbox]:checked::after{left:17px;background:radial-gradient(circle at 35% 30%,${mix(p.accent, '#ffffff', 0.7)},${p.accent} 65%,${shade(p.accent, -0.25)})}
[data-pf="panel"] input[type=checkbox]:focus-visible{outline:2px solid ${p.accent2};outline-offset:2px}
[data-pf="panel"] input[type=range]{-webkit-appearance:none;appearance:none;height:8px;border-radius:4px;background:linear-gradient(180deg,rgba(0,0,0,.6),${rgba(p.steel[2], 0.6)});border:1px solid ${edge};box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
[data-pf="panel"] input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${p.steel[0]},${p.steel[2]} 60%,${p.steel[3]});border:1px solid #000;box-shadow:0 1px 3px rgba(0,0,0,.6)}
[data-pf="panel"] input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${p.steel[0]},${p.steel[2]});border:1px solid #000}
@media (prefers-reduced-motion:reduce){${BUTTONS}{transition:none}[data-pf="panel"] input[type=checkbox]::after{transition:none}}
`
}

let style: HTMLStyleElement | null = null
export function applyPageSkin(p: Palette): void {
  if (typeof document === 'undefined') return
  if (!style) { style = document.createElement('style'); style.id = 'pf-page-skin'; document.head.append(style) }
  style.textContent = skinCss(p)
}
