// The Sandbox lab: spawn things, bend the rules with sliders, apply presets and rewind. Every action is a `lab` command through the
// normal input path, so a sandbox run is still a deterministic, replayable run.
import { LAB_PRESETS, LAB_SLIDERS, LAB_TOOLS } from '../sim/data/lab'
import type { LabOp } from '../sim/world'
import { DEFAULT_TUNING, type Tuning } from '../sim/tuning'

export interface SandboxLab { setActive(on: boolean): void; sync(t: Tuning): void; destroy(): void }
export interface SandboxLabDeps {
  host: HTMLElement
  send(op: LabOp, v?: number): void
  rewind(seconds: number): void
  /** Called when the panel opens or closes so the game can pause behind it if it wants. */
  onToggle?(open: boolean): void
}

const FIELD: Record<string, (t: Tuning) => number> = {
  fall: t => t.baseFall / DEFAULT_TUNING.baseFall,
  ballSpeed: t => t.serveSpeed / DEFAULT_TUNING.serveSpeed,
  tearGravity: t => t.tearGravity / DEFAULT_TUNING.tearGravity,
}

export function createSandboxLab(d: SandboxLabDeps): SandboxLab {
  const root = document.createElement('details'); root.dataset.pf = 'sandbox-lab'
  root.style.cssText = 'position:absolute;left:12px;top:96px;z-index:7;width:min(250px,calc(100% - 24px));max-height:calc(100% - 140px);overflow:auto;padding:8px 10px;border:1px solid #2a3446;border-radius:10px;background:rgba(12,16,24,.92);color:#cfe3ff;font:12px system-ui;display:none'
  const summary = document.createElement('summary'); summary.textContent = '🧪 Sandbox lab'; summary.style.cssText = 'cursor:pointer;font:700 13px system-ui;padding:2px 0'
  root.append(summary)
  const btnCss = 'background:#101722;color:#cfe3ff;border:1px solid #2a3446;border-radius:6px;padding:5px 8px;font:600 12px system-ui;cursor:pointer;margin:2px 2px 2px 0'
  const heading = (t: string) => { const h = document.createElement('div'); h.textContent = t; h.style.cssText = 'margin:10px 0 4px;color:#7f8da3;font:700 10px system-ui;letter-spacing:.1em;text-transform:uppercase'; root.append(h) }
  const button = (label: string, run: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = btnCss; b.onclick = () => { run(); b.blur() }; return b }

  heading('Spawn')
  const tools = document.createElement('div'); for (const t of LAB_TOOLS) tools.append(button(t.label, () => d.send(t.op))); root.append(tools)

  heading('Rules')
  const sliders = new Map<string, { input: HTMLInputElement; out: HTMLElement }>()
  for (const s of LAB_SLIDERS) {
    const row = document.createElement('label'); row.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin:6px 0'
    const name = document.createElement('span'); name.textContent = s.label
    const out = document.createElement('output'); out.textContent = `${s.value.toFixed(2)}×`; out.style.color = '#8ceced'
    const input = document.createElement('input'); input.type = 'range'; input.min = String(s.min); input.max = String(s.max); input.step = String(s.step); input.value = String(s.value); input.style.gridColumn = '1 / 3'
    input.oninput = () => { out.textContent = `${Number(input.value).toFixed(2)}×` }
    input.onchange = () => d.send(s.op, Number(input.value))
    row.append(name, out, input); root.append(row); sliders.set(s.op, { input, out })
  }

  heading('Presets')
  const presets = document.createElement('div')
  for (const p of LAB_PRESETS) { const b = button(p.name, () => { for (const o of p.ops) { d.send(o.op, o.v); const el = sliders.get(o.op); if (el && o.v !== undefined) { el.input.value = String(o.v); el.out.textContent = `${o.v.toFixed(2)}×` } } }); b.title = p.note; presets.append(b) }
  root.append(presets)

  heading('Time')
  const time = document.createElement('div'); time.append(button('⟲ Rewind 10 s', () => d.rewind(10)), button('⟲ Rewind 30 s', () => d.rewind(30))); root.append(time)
  const note = document.createElement('p'); note.textContent = 'Sandbox runs are unranked and pay nothing. Rewinding replays the run up to an earlier moment.'; note.style.cssText = 'margin:8px 0 0;color:#7f8da3;font-size:11px;line-height:1.4'; root.append(note)

  root.addEventListener('toggle', () => d.onToggle?.(root.open))
  d.host.append(root)
  return {
    setActive(on) { root.style.display = on ? 'block' : 'none' },
    sync(t) { for (const [op, el] of sliders) { const v = FIELD[op]!(t); el.input.value = String(v); el.out.textContent = `${v.toFixed(2)}×` } },
    destroy() { root.remove() },
  }
}
