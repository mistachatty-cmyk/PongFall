import type { MusicPlayer } from '../audio/musicPlayer'
import type { AudioEngine } from '../audio/engine'

const ACCEPT = 'audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.oga,.aiff,.aif'
const BTN = 'border:1px solid #394a62;border-radius:7px;background:#121b29;color:#e5f1ff;padding:7px 10px;font:600 13px system-ui;cursor:pointer'
const MUTED = '#9cabc0'

/** Persistent music controls and device-local library, mounted outside disposable game/menu screens. */
export function createMusicPanel(host: HTMLElement, music: MusicPlayer, audio: AudioEngine) {
  const button = document.createElement('button')
  button.type = 'button'; button.dataset.pf = 'music-library-toggle'; button.textContent = '♫ Music'
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false')
  button.style.cssText = `position:fixed;right:12px;top:12px;z-index:82;${BTN};background:rgba(12,18,28,.94);box-shadow:0 2px 14px #0009`
  button.dataset.pfMusicButton = 'true'
  const overlay = document.createElement('div')
  overlay.dataset.pf = 'music-library'
  overlay.style.cssText = 'position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(2,5,10,.78);backdrop-filter:blur(7px);font:14px system-ui;color:#e5f1ff'
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'PongFall music library')
  const card = document.createElement('section')
  card.style.cssText = 'width:min(760px,96vw);max-height:min(88dvh,900px);overflow:auto;border:1px solid #50627b;border-radius:14px;background:linear-gradient(145deg,#111a27,#090e16);padding:18px;box-shadow:0 24px 90px #000c'
  overlay.appendChild(card)
  let isOpen = false, query = '', notice = ''
  const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = ACCEPT; fileInput.multiple = true; fileInput.hidden = true; fileInput.setAttribute('aria-label', 'Choose audio files to add to this device')
  const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  const formatTime = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`
  function render() {
    const state = music.state(), items = music.items(), collections = music.collections(), playlists = music.playlists()
    button.textContent = `${state.playing ? '♫' : '♪'} ${state.playing ? 'Music on' : 'Music'}`
    button.setAttribute('aria-label', `Open music library. ${state.playing ? 'Music is playing.' : 'Music is paused.'}`)
    if (!isOpen) return
    const needle = query.trim().toLowerCase()
    const visible = items.filter(item => !needle || `${item.title} ${item.artist ?? ''} ${item.album ?? ''}`.toLowerCase().includes(needle))
    const current = items.find(item => item.id === state.current)
    const safeCurrent = esc(current?.title ?? state.title)
    const selectedCollection = music.collection()
    card.innerHTML = `
      <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div><div style="color:#65b2ff;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase">PongFall audio</div><h2 style="margin:3px 0;font-size:24px">Music library</h2></div>
        <button type="button" data-action="close" aria-label="Close music library" style="${BTN};font-size:20px">×</button>
      </header>
      <div style="border:1px solid #30415a;border-radius:10px;background:#080e17;padding:12px">
        <div style="font-weight:700;overflow-wrap:anywhere">${safeCurrent}</div>
        <div data-status style="color:${MUTED};min-height:20px;margin-top:3px">${state.loading ? 'Loading LOK soundtrack…' : esc(notice || state.error || (state.playing ? 'Playing' : 'Paused'))}</div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" data-action="prev" aria-label="Previous track" style="${BTN}">⏮</button>
          <button type="button" data-action="toggle" aria-label="${state.playing ? 'Pause music' : 'Play music'}" style="${BTN};min-width:68px">${state.playing ? '⏸ Pause' : '▶ Play'}</button>
          <button type="button" data-action="next" aria-label="Next track" style="${BTN}">⏭</button>
          <button type="button" data-action="shuffle" aria-pressed="${state.shuffle}" style="${BTN};${state.shuffle ? 'border-color:#8affc1;color:#baffd6' : ''}">🔀 Shuffle</button>
          <button type="button" data-action="repeat" aria-label="Repeat ${state.repeat}" style="${BTN};${state.repeat !== 'off' ? 'border-color:#8affc1;color:#baffd6' : ''}">↻ ${state.repeat}</button>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-top:8px;color:${MUTED};font-size:12px">
          <span data-time>${formatTime(state.time)}</span><input type="range" data-action="seek" min="0" max="${Math.max(1, state.duration)}" value="${Math.min(state.time, Math.max(1, state.duration))}" aria-label="Seek through current track" style="width:100%"><span data-duration>${formatTime(state.duration)}</span>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:8px;color:${MUTED};font-size:12px">Volume <input type="range" data-action="volume" min="0" max="100" value="${Math.round(audio.getBus('mus') * 100)}" aria-label="Music volume" style="flex:1"></label>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:13px 0">
        <label style="display:flex;flex:1;min-width:180px;flex-direction:column;gap:4px;color:${MUTED};font-size:12px">Library
          <select data-action="collection" style="${BTN};text-align:left">${collections.map(c => `<option value="${esc(c.id ?? '')}" ${c.id === selectedCollection ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        </label>
        <button type="button" data-action="import" style="${BTN};border-color:#8affc1;color:#ccffe0">＋ Add audio files</button>
        <label style="display:flex;flex:1;min-width:160px;flex-direction:column;gap:4px;color:${MUTED};font-size:12px">Search
          <input type="search" data-action="search" value="${esc(query)}" placeholder="Track, artist, album" style="${BTN};font-weight:400">
        </label>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:9px">
        <input data-action="new-playlist-name" maxlength="48" placeholder="New playlist name" aria-label="New playlist name" style="${BTN};font-weight:400;min-width:150px">
        <button type="button" data-action="new-playlist" style="${BTN}">Create playlist</button>
        <label style="color:${MUTED};font-size:12px">Add selected track to <select data-action="playlist" style="${BTN}"><option value="">Choose playlist</option>${playlists.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
      </div>
      <p style="margin:0 0 8px;color:${MUTED};font-size:12px">Files stay in this browser on this device. They are never uploaded. LOK soundtrack tracks may have account-based unlocks.</p>
      <div data-list role="list" aria-label="Tracks" style="max-height:34dvh;overflow:auto;border-top:1px solid #27364a">
        ${visible.map(item => `<div role="listitem" style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:7px;border-bottom:1px solid #27364a;padding:7px 2px">
          <button type="button" data-track="${esc(item.id)}" ${item.locked ? 'disabled aria-disabled="true"' : ''} style="${BTN};text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;${item.id === state.current ? 'border-color:#8affc1;color:#d4ffe4' : ''}${item.locked ? ';opacity:.55' : ''}">${item.locked ? '🔒 ' : ''}${esc(item.title)}<span style="display:block;color:${MUTED};font-size:11px;font-weight:400">${esc(item.locked ? item.note ?? 'Locked' : [item.artist, item.album, item.local ? 'On this device' : ''].filter(Boolean).join(' · '))}</span></button>
          <button type="button" data-favorite="${esc(item.id)}" aria-label="${item.favorite ? 'Remove from' : 'Add to'} favorites: ${esc(item.title)}" aria-pressed="${!!item.favorite}" title="${item.favorite ? 'Remove favorite' : 'Add favorite'}" style="${BTN};color:${item.favorite ? '#ff8ba7' : MUTED}">${item.favorite ? '♥' : '♡'}</button>
          ${item.local ? `<button type="button" data-remove="${esc(item.id)}" aria-label="Remove ${esc(item.title)} from this device" style="${BTN};color:#ffb3b3">Delete</button>` : '<span></span>'}
        </div>`).join('') || `<p style="padding:12px;color:${MUTED}">${state.loading ? 'Loading tracks…' : 'No tracks in this view yet.'}</p>`}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:11px;color:${MUTED};font-size:11px"><span>LOK soundtrack · 616 Survivor</span>${playlists.length ? '<button type="button" data-action="delete-playlist" style="'+BTN+';color:#ffb3b3">Delete current playlist</button>' : ''}</div>`
    card.appendChild(fileInput)
    const action = (name: string) => card.querySelector<HTMLElement>(`[data-action="${name}"]`)
    action('close')!.onclick = close
    action('toggle')!.onclick = () => music.toggle()
    action('prev')!.onclick = () => music.next(-1)
    action('next')!.onclick = () => music.next(1)
    action('shuffle')!.onclick = () => music.setShuffle(!state.shuffle)
    action('repeat')!.onclick = () => music.setRepeat(state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off')
    ;(action('seek') as HTMLInputElement).oninput = e => music.seek(Number((e.target as HTMLInputElement).value))
    ;(action('volume') as HTMLInputElement).oninput = e => audio.setBus('mus', Number((e.target as HTMLInputElement).value) / 100)
    ;(action('collection') as HTMLSelectElement).onchange = e => { const id = (e.target as HTMLSelectElement).value; music.setCollection(id || null) }
    action('import')!.onclick = () => fileInput.click()
    fileInput.onchange = async () => {
      try { const report = await music.importFiles(Array.from(fileInput.files ?? [])); notice = `${report.added} file${report.added === 1 ? '' : 's'} added to this device.${report.skipped.length ? ` Skipped: ${report.skipped.join(', ')}` : ''}`; render() }
      catch (error) { notice = error instanceof Error ? error.message : 'Could not import these files.'; render() }
      fileInput.value = ''
    }
    ;(action('search') as HTMLInputElement).oninput = e => {
      const value = (e.target as HTMLInputElement).value
      const cursor = value.length
      query = value; render()
      const next = action('search') as HTMLInputElement | null; next?.focus(); next?.setSelectionRange(cursor, cursor)
    }
    action('new-playlist')!.onclick = () => {
      const field = action('new-playlist-name') as HTMLInputElement
      try { const p = music.createPlaylist(field.value); music.setCollection(p.id) }
      catch (error) { notice = error instanceof Error ? error.message : 'Could not create playlist.'; render() }
    }
    action('delete-playlist')?.addEventListener('click', () => {
      const id = music.collection(), playlist = music.playlists().find(p => p.id === id)
      if (id && playlist && confirm(`Delete playlist “${playlist.name}”? The audio files will stay in your library.`)) music.deletePlaylist(id)
    })
    card.querySelectorAll<HTMLButtonElement>('button[data-track]').forEach(b => b.onclick = () => music.select(b.dataset.track!))
    card.querySelectorAll<HTMLButtonElement>('button[data-favorite]').forEach(b => b.onclick = () => music.toggleFavorite(b.dataset.favorite!))
    card.querySelectorAll<HTMLButtonElement>('button[data-remove]').forEach(b => b.onclick = () => {
      const item = items.find(i => i.id === b.dataset.remove)
      if (item && confirm(`Remove “${item.title}” from this device?`)) void music.removeLocalTrack(item.id)
    })
  }
  function openPanel() { isOpen = true; overlay.style.display = 'flex'; button.setAttribute('aria-expanded', 'true'); render(); card.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus() }
  function close() { isOpen = false; overlay.style.display = 'none'; button.setAttribute('aria-expanded', 'false'); button.focus() }
  button.onclick = () => { audio.unlock(); music.kick(); isOpen ? close() : openPanel() }
  overlay.addEventListener('pointerdown', e => { if (e.target === overlay) close() })
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key !== 'Tab') return
    const focusable = Array.from(overlay.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not([hidden]),select,[tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null)
    if (!focusable.length) return
    const first = focusable[0]!, last = focusable[focusable.length - 1]!
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  })
  const unsubscribe = music.onChange(render)
  host.append(button, overlay)
  render()
  return { open: openPanel, close, toggle() { isOpen ? close() : openPanel() }, isOpen: () => isOpen, destroy() { unsubscribe(); button.remove(); overlay.remove() } }
}
