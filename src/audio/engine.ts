import { CUES, CueId, shouldPlay, ambienceFor } from './cues'

const KEY = 'pongfall.audio'
export interface AudioEngine {
  /** Create/resume the context. Must be called from a user gesture. */
  unlock(): void
  play(cue: CueId, level?: number): void
  setAmbience(fallV: number, wind: number, on: boolean): void
  setVolume(v: number): void
  setMuted(m: boolean): void
  getVolume(): number
  isMuted(): boolean
  destroy(): void
}

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { vol: typeof s.vol === 'number' ? s.vol : 0.7, muted: !!s.muted } } catch { return { vol: 0.7, muted: false } }
}

/** Procedural WebAudio (no sample files). Safe to construct anywhere: it does nothing without a browser. */
export function createAudio(): AudioEngine {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null
  let amb: { gain: GainNode; lp: BiquadFilterNode; drone: OscillatorNode; src: AudioBufferSourceNode } | null = null
  const st = load()
  const last: Partial<Record<CueId, number>> = {}
  let active = 0

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)) } catch { /* ignore */ } }
  const applyMaster = () => { if (master && ctx) master.gain.setTargetAtTime(st.muted ? 0 : st.vol * 0.8, ctx.currentTime, 0.03) }

  function ensure() {
    if (ctx) return ctx
    const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain(); master.connect(ctx.destination); applyMaster()
    const len = ctx.sampleRate * 2
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return ctx
  }

  function startAmbience() {
    if (amb || !ctx || !master || !noiseBuf) return
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400
    const gain = ctx.createGain(); gain.gain.value = 0
    const drone = ctx.createOscillator(); drone.type = 'sine'; drone.frequency.value = 50
    const dg = ctx.createGain(); dg.gain.value = 0.25
    src.connect(lp); lp.connect(gain); drone.connect(dg); dg.connect(gain); gain.connect(master)
    src.start(); drone.start()
    amb = { gain, lp, drone, src }
  }

  return {
    unlock() { const c = ensure(); if (c && c.state === 'suspended') void c.resume(); if (c) startAmbience() },
    play(cue, level = 1) {
      const c = ctx
      if (!c || !master || !noiseBuf || st.muted) return
      const now = performance.now()
      if (!shouldPlay(cue, now, last[cue] ?? -1e9, active)) return
      last[cue] = now
      const def = CUES[cue]
      const t0 = c.currentTime, dur = def.ms / 1000
      const out = c.createGain()
      const peak = def.gain * (0.5 + 0.5 * level)
      out.gain.setValueAtTime(0.0001, t0)
      out.gain.exponentialRampToValueAtTime(peak, t0 + 0.006)
      out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      out.connect(master)
      const stops: Array<AudioScheduledSourceNode> = []
      if (def.noise < 1) {
        const o = c.createOscillator(); o.type = def.wave
        o.frequency.setValueAtTime(def.f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, def.f1), t0 + dur)
        const og = c.createGain(); og.gain.value = 1 - def.noise * 0.6
        if (def.wobbleHz) {
          const lfo = c.createOscillator(); lfo.frequency.value = def.wobbleHz
          const lg = c.createGain(); lg.gain.value = def.wobbleDepth ?? 40
          lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05); stops.push(lfo)
        }
        o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + dur + 0.05); stops.push(o)
      }
      if (def.noise > 0) {
        const n = c.createBufferSource(); n.buffer = noiseBuf
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4
        bp.frequency.setValueAtTime(def.band, t0)
        if (def.bandEnd) bp.frequency.exponentialRampToValueAtTime(def.bandEnd, t0 + dur)
        const ng = c.createGain(); ng.gain.value = def.noise * 1.4
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t0, Math.random()); n.stop(t0 + dur + 0.05); stops.push(n)
      }
      active++
      const end = stops[stops.length - 1]!
      end.onended = () => { active = Math.max(0, active - 1); out.disconnect() }
    },
    setAmbience(fallV, wind, on) {
      if (!ctx || !amb) return
      const p = ambienceFor(fallV, wind)
      const g = on && !st.muted ? p.gain : 0
      amb.gain.gain.setTargetAtTime(g, ctx.currentTime, 0.25)
      amb.lp.frequency.setTargetAtTime(p.cutoff, ctx.currentTime, 0.25)
      amb.drone.frequency.setTargetAtTime(p.droneHz, ctx.currentTime, 0.4)
    },
    setVolume(v) { st.vol = Math.max(0, Math.min(1, v)); save(); applyMaster() },
    setMuted(m) { st.muted = m; save(); applyMaster() },
    getVolume: () => st.vol,
    isMuted: () => st.muted,
    destroy() { try { amb?.src.stop(); amb?.drone.stop() } catch { /* already stopped */ } amb = null; void ctx?.close(); ctx = null; master = null },
  }
}
