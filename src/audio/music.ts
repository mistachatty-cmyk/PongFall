// PongFall music: procedural tracks. `TRACKS` and `notesAt` are pure data/functions (tested); the player plays them with WebAudio.
export interface Track {
  id: string
  name: string
  bpm: number
  root: number          // MIDI note of the scale root
  scale: number[]       // semitone offsets
  bass: Array<number | null>   // 16 steps, scale degrees (null = rest)
  lead: Array<number | null>   // 16 steps, scale degrees
  wave: OscillatorType
}

export const TRACKS: Track[] = [
  { id: 'free-fall', name: 'Free Fall', bpm: 84, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'triangle',
    bass: [0, null, null, null, 0, null, 4, null, 3, null, null, null, 2, null, 4, null],
    lead: [7, null, 9, null, 11, null, 9, 7, null, null, 11, null, 9, null, 7, null] },
  { id: 'glass-cathedral', name: 'Glass Cathedral', bpm: 68, root: 50, scale: [0, 2, 3, 5, 7, 9, 10], wave: 'sine',
    bass: [0, null, null, null, null, null, 0, null, 5, null, null, null, null, null, 4, null],
    lead: [null, 14, null, 11, null, 9, null, 11, 7, null, null, 9, null, 11, null, null] },
  { id: 'eyes-open', name: 'Eyes Open', bpm: 112, root: 40, scale: [0, 1, 4, 5, 7, 8, 11], wave: 'sawtooth',
    bass: [0, null, 0, 0, null, 0, null, 0, 3, null, 3, 3, null, 3, null, 2],
    lead: [null, null, 7, null, 8, null, 7, null, null, null, 11, null, 8, 7, null, null] },
]

export const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
export const stepSeconds = (t: Track) => 60 / t.bpm / 4

/** Frequencies sounding on a given 16th-note step (wraps every 16). */
export function notesAt(t: Track, step: number): { bass: number | null; lead: number | null } {
  const n = t.scale.length
  const hz = (deg: number | null, oct: number) => deg === null ? null : midiHz(t.root + oct + t.scale[((deg % n) + n) % n]! + 12 * Math.floor(deg / n))
  const i = ((step % 16) + 16) % 16
  return { bass: hz(t.bass[i]!, 0), lead: hz(t.lead[i]!, 12) }
}

const KEY = 'pongfall.music'
export interface MusicState { on: boolean; track: number; vol: number }
export function sanitizeMusic(raw: unknown): MusicState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    on: r.on !== false,
    track: typeof r.track === 'number' && r.track >= 0 && r.track < TRACKS.length ? Math.floor(r.track) : 0,
    vol: typeof r.vol === 'number' && r.vol >= 0 && r.vol <= 1 ? r.vol : 0.5,
  }
}

export interface MusicPlayer {
  unlock(): void
  toggle(): void
  next(d?: 1 | -1): void
  setVolume(v: number): void
  state(): MusicState & { name: string }
  onChange(cb: () => void): void
}

let shared: MusicPlayer | null = null
/** One player for the whole page, so music carries from the menu into the match. */
export function getMusic(): MusicPlayer {
  if (shared) return shared
  let st: MusicState
  try { st = sanitizeMusic(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { st = sanitizeMusic(null) }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)) } catch { /* ignore */ } }
  const subs: Array<() => void> = []
  const fire = () => subs.forEach(f => f())
  let ctx: AudioContext | null = null
  let out: GainNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let step = 0, nextAt = 0

  const blip = (hz: number, at: number, dur: number, wave: OscillatorType, peak: number) => {
    const o = ctx!.createOscillator(); o.type = wave; o.frequency.value = hz
    const g = ctx!.createGain()
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g); g.connect(out!); o.start(at); o.stop(at + dur + 0.05)
  }
  const pump = () => {
    if (!ctx) return
    const t = TRACKS[st.track]!
    while (nextAt < ctx.currentTime + 0.25) {
      const n = notesAt(t, step), s = stepSeconds(t)
      if (n.bass !== null) blip(n.bass, nextAt, s * 3, t.wave, 0.5)
      if (n.lead !== null) blip(n.lead, nextAt, s * 2.5, 'sine', 0.28)
      nextAt += s; step++
    }
  }
  const start = () => { if (timer || !ctx) return; nextAt = ctx.currentTime + 0.05; step = 0; timer = setInterval(pump, 80) }
  const stop = () => { if (timer) clearInterval(timer); timer = null }

  shared = {
    unlock() {
      if (!ctx) {
        const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
        if (!AC) return
        ctx = new AC(); out = ctx.createGain(); out.gain.value = st.vol * 0.35; out.connect(ctx.destination)
      }
      if (ctx.state === 'suspended') void ctx.resume()
      if (st.on) start()
    },
    toggle() { st.on = !st.on; save(); if (st.on) shared!.unlock(); else stop(); fire() },
    next(d = 1) { st.track = (st.track + d + TRACKS.length) % TRACKS.length; save(); step = 0; if (ctx) nextAt = ctx.currentTime + 0.05; fire() },
    setVolume(v) { st.vol = Math.max(0, Math.min(1, v)); save(); if (out && ctx) out.gain.setTargetAtTime(st.vol * 0.35, ctx.currentTime, 0.03); fire() },
    state: () => ({ ...st, name: TRACKS[st.track]!.name }),
    onChange: cb => { subs.push(cb) },
  }
  return shared
}
