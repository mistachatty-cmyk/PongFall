import type { MusicPlayer } from '../audio/musicPlayer'
import type { AudioEngine } from '../audio/engine'

const BTN = 'background:#101722;color:#cfe3ff;border:1px solid #2a3446;border-radius:6px;padding:4px 10px;font:14px system-ui;cursor:pointer'

/** The music icon: opens a small player (play/pause, previous/next, volume, track list with the locked ones marked). */
export function createMusicPanel(host: HTMLElement, music: MusicPlayer, audio: AudioEngine) {
  const btn = document.createElement('button')
  btn.setAttribute('data-pf', 'music'); btn.setAttribute('aria-label', 'Music'); btn.title = 'Music'
  btn.style.cssText = 'position:absolute;right:144px;top:56px;width:36px;height:36px;border-radius:8px;border:1px solid #2a3446;background:rgba(16,21,31,.85);color:#cfe3ff;font-size:18px;cursor:pointer;z-index:6'
  const panel = document.createElement('div')
  panel.setAttribute('data-pf', 'music-panel')
  panel.style.cssText = 'position:absolute;right:12px;top:98px;width:300px;max-height:calc(100% - 130px);overflow:auto;padding:12px 14px;border-radius:10px;border:1px solid #2a3446;background:rgba(12,16,24,.96);color:#cfe3ff;font:13px system-ui;display:none;z-index:7'
  let open = false
  function render() {
    const st = music.state()
    btn.textContent = st.playing ? '♪' : '🔇'
    btn.style.opacity = st.playing ? '1' : '0.6'
    if (!open) return
    const items = music.items()
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Music</b><button data-k="close" style="background:none;border:0;color:#7f8da3;font-size:18px;cursor:pointer" aria-label="Close">✕</button></div>
      <div style="margin:8px 0 2px;font-weight:600">${esc(st.title)}</div>
      <div style="color:#7f8da3;min-height:16px">${st.error ? esc(st.error) : st.playing ? 'Playing' : 'Paused'}</div>
      <div style="display:flex;gap:6px;align-items:center;margin:8px 0">
        <button data-k="prev" style="${BTN}" aria-label="Previous track">⏮</button>
        <button data-k="play" style="${BTN}" aria-label="${st.playing ? 'Pause' : 'Play'}">${st.playing ? '⏸' : '▶'}</button>
        <button data-k="next" style="${BTN}" aria-label="Next track">⏭</button>
        <input data-k="vol" type="range" min="0" max="100" value="${Math.round(audio.getBus('mus') * 100)}" style="flex:1" aria-label="Music volume">
      </div>
      <div style="margin:10px 0 4px;color:#7f8da3;font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase">Tracks${st.loading ? ' (loading 616 Survivor…)' : ''}</div>
      ${items.map(t => `<button data-t="${esc(t.id)}" ${t.locked ? 'aria-disabled="true"' : ''} style="display:block;width:100%;text-align:left;margin:2px 0;${BTN};${t.id === st.current ? 'border-color:#8affc1;color:#d8ffe9' : ''}${t.locked ? ';opacity:.5;cursor:default' : ''}">${t.locked ? '🔒 ' : ''}${esc(t.title)}<br><span style="color:#7f8da3;font-size:11px">${esc(t.locked ? t.note ?? '' : t.artist ?? '')}</span></button>`).join('')}
      <div style="color:#7f8da3;margin-top:8px;font-size:11px">Game Jam Playlist by Trijam. 616 Survivor's Lokifed soundtrack is streamed from 616; gated tracks unlock there.</div>`
    const q = (k: string) => panel.querySelector(`[data-k="${k}"]`) as HTMLElement
    q('close').onclick = () => setOpen(false)
    q('prev').onclick = () => music.next(-1); q('next').onclick = () => music.next(1); q('play').onclick = () => { music.toggle(); music.kick() }
    ;(q('vol') as HTMLInputElement).oninput = ev => audio.setBus('mus', Number((ev.target as HTMLInputElement).value) / 100)
    panel.querySelectorAll<HTMLButtonElement>('button[data-t]').forEach(b => { b.onclick = () => music.select(b.dataset.t!) })
  }
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  function setOpen(o: boolean) { open = o; panel.style.display = o ? 'block' : 'none'; render() }
  btn.onclick = () => { audio.unlock(); setOpen(!open) }
  for (const e of [panel, btn]) e.addEventListener('pointerdown', ev => ev.stopPropagation())
  panel.addEventListener('keydown', ev => ev.stopPropagation())
  music.onChange(render)
  host.style.position ||= 'relative'
  host.appendChild(btn); host.appendChild(panel)
  render()
  return { toggle: () => setOpen(!open), destroy() { btn.remove(); panel.remove() } }
}
