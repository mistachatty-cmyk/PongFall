import type { MenuStyle } from '../world/enabled'

/** The two complete menus share one persistent, keyboard-accessible switch. */
export function createMenuSwitcher(onSelect: (style: MenuStyle) => void) {
  const style = document.createElement('style')
  style.textContent = `
.pf-menu-switch{position:fixed;z-index:80;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);box-sizing:border-box;width:max-content;max-width:calc(100vw - 24px);min-height:42px;padding:3px 5px 3px 10px;display:flex;align-items:center;gap:6px;border:1px solid #8cb9ed3b;border-radius:12px;background:#091422d9;box-shadow:0 5px 18px #0007;backdrop-filter:blur(12px);color:#d7e8fb;font:700 11px system-ui;opacity:.78;transition:opacity .25s ease,border-color .25s ease}
.pf-menu-switch:hover,.pf-menu-switch:focus-within{opacity:1;border-color:#8cb9ed70}
.pf-menu-switch .pf-menu-brand{width:18px;text-align:center;font-size:13px;opacity:.72}
.pf-menu-switch .pf-menu-tabs{display:flex;gap:2px}
.pf-menu-switch button{position:relative;min-height:34px;min-width:92px;padding:5px 8px;border:0;border-radius:8px;background:transparent;color:#b4c6dc;font:700 11px system-ui;cursor:pointer;transition:background .25s ease,color .25s ease}
.pf-menu-switch button:hover{color:white;background:#8db9e01b}
.pf-menu-switch button[aria-pressed="true"]{background:#3f77b34d;color:#f2f8ff}
.pf-menu-switch button[aria-pressed="true"]:after{content:"";position:absolute;left:36%;right:36%;bottom:1px;height:1px;border-radius:2px;background:#a5d9ff}
.pf-menu-switch button:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}
.pf-menu .pf-panel{margin-top:112px}
.pf-menu>.pf-settings{top:62px}
body.pf-menu-open [data-pf-music-button]{top:62px!important}
@media(max-width:420px){.pf-menu-switch button{min-width:88px;padding:5px 6px}}
@media(max-width:560px){body[data-pf-menu-style="classic"] #pf-jam-nav{display:none!important}}
@media(prefers-reduced-motion:reduce){.pf-menu-switch,.pf-menu-switch button{transition:none}}
`
  const bar = document.createElement('nav')
  bar.className = 'pf-menu-switch'
  bar.setAttribute('aria-label', 'Main menu appearance')
  const brand = document.createElement('span')
  brand.className = 'pf-menu-brand'
  brand.textContent = '👁'
  brand.setAttribute('aria-hidden', 'true')
  const tabs = document.createElement('div')
  tabs.className = 'pf-menu-tabs'
  const make = (id: MenuStyle, label: string) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.menuStyle = id
    button.textContent = label
    button.onclick = () => onSelect(id)
    tabs.append(button)
    return button
  }
  const classic = make('classic', 'Classic menu')
  const world = make('world', 'New menu')
  bar.append(brand, tabs)
  document.head.append(style)
  document.body.append(bar)
  return {
    element: bar,
    setActive(id: MenuStyle) {
      classic.setAttribute('aria-pressed', String(id === 'classic'))
      world.setAttribute('aria-pressed', String(id === 'world'))
    },
    destroy() { bar.remove(); style.remove() },
  }
}
