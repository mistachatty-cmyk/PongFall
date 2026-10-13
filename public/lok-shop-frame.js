/*
 * lok-shop-frame.js — shared, framework-neutral Lok Shop screen structure.
 *
 * Apps provide their own auth/economy adapter and fill named slots. This keeps
 * the account, purchase, and catalog boundary in each app while giving every
 * LOK-enabled game the same shop order, navigation, responsive frame, and
 * accessibility baseline. No network calls or token logic live in this file.
 *
 * <lok-shop-frame aria-label="LOK Shop">
 *   <button slot="back">Back</button>
 *   <div slot="supporters">...</div>
 *   <div slot="wallet">...</div>
 *   <h1 slot="title">Game shop</h1><p slot="subtitle">...</p>
 *   <section slot="host">...</section><nav slot="topics">...</nav>
 *   <nav slot="tabs">...</nav><main slot="items">...</main>
 *   <div slot="status">...</div><footer slot="footer">...</footer>
 * </lok-shop-frame>
 */
(function () {
  if (!('customElements' in window) || customElements.get('lok-shop-frame')) return;

  var template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host{--lok-shop-bg:radial-gradient(ellipse at 50% 0%,#17162c 0,#080b12 56%,#05070b 100%);--lok-shop-text:#e4edff;--lok-shop-muted:#a8a6ba;--lok-shop-accent:#67edf0;--lok-shop-border:#704c94;--lok-shop-panel:#100d1d;position:fixed;inset:0;z-index:90;display:block;overflow:auto;box-sizing:border-box;padding:clamp(12px,3vw,30px);background:var(--lok-shop-bg);color:var(--lok-shop-text);font:14px system-ui,sans-serif;overscroll-behavior:contain}
      *,*::before,*::after{box-sizing:border-box}
      .frame{width:min(100%,820px);margin:0 auto}
      .heading{margin:14px 0 0}
      .body{display:grid;gap:0}
      ::slotted([slot=back]){margin:0 0 4px}
      ::slotted([slot=title]){display:block;margin:14px 0 2px;color:var(--lok-shop-title,#efdbff);font-size:clamp(27px,6vw,42px);font-weight:900;letter-spacing:.16em;text-shadow:0 0 18px color-mix(in srgb,var(--lok-shop-title,#efdbff) 40%,transparent)}
      ::slotted([slot=subtitle]){display:block;margin:0;color:var(--lok-shop-muted);font-size:12px}
      ::slotted([slot=wallet]){margin-top:12px}
      ::slotted([slot=host]){margin-top:12px}
      ::slotted([slot=topics]){margin-top:9px}
      ::slotted([slot=tabs]){margin-top:14px}
      ::slotted([slot=items]){margin-top:12px}
      ::slotted([slot=status]){margin-top:12px}
      ::slotted([slot=footer]){margin-top:10px}
      :host(:focus-visible){outline:2px solid var(--lok-shop-accent);outline-offset:-4px}
      @media(prefers-reduced-motion:reduce){:host{scroll-behavior:auto}}
      @media(max-width:480px){:host{padding:12px}.frame{width:100%}}
    </style>
    <main class="frame" part="frame">
      <slot name="back"></slot>
      <slot name="supporters"></slot>
      <slot name="wallet"></slot>
      <header class="heading"><slot name="title"></slot><slot name="subtitle"></slot></header>
      <div class="body"><slot name="host"></slot><slot name="topics"></slot><slot name="tabs"></slot><slot name="items"></slot><slot name="status"></slot><slot name="footer"></slot></div>
    </main>`;

  class LokShopFrame extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.setAttribute('role', this.getAttribute('role') || 'dialog');
      if (!this.hasAttribute('aria-modal')) this.setAttribute('aria-modal', 'true');
    }
  }

  customElements.define('lok-shop-frame', LokShopFrame);
})();
