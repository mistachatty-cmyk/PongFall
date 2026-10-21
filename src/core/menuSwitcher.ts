import type { MenuStyle } from '../world/enabled'

/** The two complete menus share one persistent, keyboard-accessible switch. */
export function createMenuSwitcher(onSelect: (style: MenuStyle) => void) {
  const style = document.createElement('style')
  style.textContent = `
.pf-menu-switch{position:fixed;z-index:80;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);box-sizing:border-box;width:min(620px,calc(100vw - 24px));min-height:54px;padding:6px 8px 6px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #8cb9ed66;border-radius:16px;background:linear-gradient(120deg,#101d30f0,#07111cec);box-shadow:0 12px 35px #000a,0 0 25px #6eaaff22;backdrop-filter:blur(16px);color:#e9f3ff;font:700 12px system-ui}
.pf-menu-switch .pf-menu-brand{white-space:nowrap;letter-spacing:.12em;color:#9fc6f8}
.pf-menu-switch .pf-menu-brand b{color:#ffe08a}
.pf-menu-switch .pf-menu-tabs{display:flex;gap:4px;padding:4px;border:1px solid #6c9dcc44;border-radius:12px;background:#050b15bb}
.pf-menu-switch button{position:relative;min-height:36px;min-width:104px;padding:5px 12px;border:0;border-radius:9px;background:transparent;color:#9badc6;font:700 12px system-ui;cursor:pointer;transition:background .28s ease,color .28s ease,transform .28s ease,box-shadow .28s ease}
.pf-menu-switch button:hover{color:white;transform:translateY(-2px)}
.pf-menu-switch button[aria-pressed="true"]{background:linear-gradient(135deg,#3382d8,#1b436e);color:#fff;box-shadow:0 4px 15px #4ba7ff4d}
.pf-menu-switch button[aria-pressed="true"]:after{content:"";position:absolute;left:25%;right:25%;bottom:-4px;height:2px;border-radius:2px;background:#8bd9ff;box-shadow:0 0 8px #8bd9ff}
.pf-menu-switch button:focus-visible{outline:2px solid #ffe08a;outline-offset:2px}
.pf-menu .pf-panel{margin-top:112px}
.pf-menu>.pf-settings{top:76px}
body.pf-menu-open [data-pf-music-button]{top:76px!important}
@media(max-width:420px){.pf-menu-switch{padding-left:9px;gap:5px}.pf-menu-switch .pf-menu-brand{font-size:10px;letter-spacing:.04em}.pf-menu-switch button{min-width:83px;padding:5px 6px;font-size:11px}}
@media(max-width:560px){body[data-pf-menu-style="classic"] #pf-jam-nav{display:none!important}}
@media(prefers-reduced-motion:reduce){.pf-menu-switch button{transition:none}.pf-menu-switch button:hover{transform:none}}
`
  const bar = document.createElement('nav')
  bar.className = 'pf-menu-switch'
  bar.setAttribute('aria-label', 'Main menu appearance')
  const brand = document.createElement('span')
  brand.className = 'pf-menu-brand'
  brand.innerHTML = '👁 PONG<b>FALL</b>'
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
