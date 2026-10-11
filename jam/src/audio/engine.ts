import { MUSIC, planCut } from './music'
import { CUES, CueId, shouldPlay, ambienceFor, tinklePlan } from './cues'

const KEY = 'pongfall.jam.audio'
export interface AudioEngine {
  /** Create/resume the context. Must be called from a user gesture. */
  unlock(): void
  play(cue: CueId, level?: number): void
  setAmbience(fallV: number, wind: number, on: boolean): void
  setVolume(v: number): void
  setBus(bus: 'sfx' | 'amb' | 'mus', v: number): void
  getBus(bus: 'sfx' | 'amb' | 'mus'): number
  /** Start the DJ'd default track (needs a user gesture; safe to call repeatedly). */
  startMusic(): void
  setMuted(m: boolean): void
  getVolume(): number
  isMuted(): boolean
  destroy(): void
}

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); const n = (v: unknown, d: number) => typeof v === 'number' && v >= 0 && v <= 1 ? v : d; return { vol: n(s.vol, 0.7), sfx: n(s.sfx, 1), amb: n(s.amb, 0.8), mus: n(s.mus, 0.6), muted: !!s.muted } } catch { return { vol: 0.7, sfx: 1, amb: 0.8, mus: 0.6, muted: false } }
}

/** Procedural WebAudio (no sample files). Safe to construct anywhere: it does nothing without a browser. */
export function createAudio(): AudioEngine {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let sfxBus: GainNode | null = null
  let ambBus: GainNode | null = null
  let musBus: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null
  let dj: { stop(): void } | null = null
  let amb: { whistle: GainNode; bp: BiquadFilterNode; o1: OscillatorNode; o2: OscillatorNode; lfo: OscillatorNode; rumble: GainNode; src: AudioBufferSourceNode; src2: AudioBufferSourceNode } | null = null
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
    sfxBus = ctx.createGain(); sfxBus.gain.value = st.sfx; sfxBus.connect(master)
    ambBus = ctx.createGain(); ambBus.gain.value = st.amb; ambBus.connect(master)
    musBus = ctx.createGain(); musBus.gain.value = st.mus; musBus.connect(master)
    const len = ctx.sampleRate * 2
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return ctx
  }

  function startAmbience() {
    if (amb || !ctx || !master || !noiseBuf) return
    // whistling wind: resonant band-passed noise plus two thin whistle partials with a slow vibrato, over a low rumble
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 14
    const whistle = ctx.createGain(); whistle.gain.value = 0
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 900
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1350
    const g1 = ctx.createGain(); g1.gain.value = 0.35
    const g2 = ctx.createGain(); g2.gain.value = 0.18
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4
    const lg = ctx.createGain(); lg.gain.value = 18
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency)
    const ng = ctx.createGain(); ng.gain.value = 1.6
    src.connect(bp); bp.connect(ng); ng.connect(whistle)
    o1.connect(g1); g1.connect(whistle); o2.connect(g2); g2.connect(whistle)
    whistle.connect(ambBus!)
    const src2 = ctx.createBufferSource(); src2.buffer = noiseBuf; src2.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 130
    const rumble = ctx.createGain(); rumble.gain.value = 0
    src2.connect(lp); lp.connect(rumble); rumble.connect(ambBus!)
    src.start(); src2.start(0, 0.7); o1.start(); o2.start(); lfo.start()
    amb = { whistle, bp, o1, o2, lfo, rumble, src, src2 }
  }


  /** Two media elements crossfade; each cut jumps to a random spot for a random hold. Missing file = silence. */
  function startDj() {
    if (dj || !ctx || !musBus) return
    const c = ctx, bus = musBus
    const mk = () => {
      const a = new Audio(MUSIC.url); a.preload = 'auto'; a.crossOrigin = 'anonymous'
      const g = c.createGain(); g.gain.value = 0
      c.createMediaElementSource(a).connect(g); g.connect(bus)
      return { a, g }
    }
    const decks = [mk(), mk()]
    let cur = 0, prev = -1, timer = 0, dead = false
    const cut = () => {
      if (dead) return
      const d = decks[cur]!, o = decks[1 - cur]!
      const dur = Number.isFinite(d.a.duration) ? d.a.duration : 0
      const plan = planCut(dur, Math.random, prev); prev = plan.start
      try { d.a.currentTime = plan.start } catch { /* not seekable yet */ }
      void d.a.play().catch(() => { /* blocked or file missing */ })
      const t = c.currentTime
      d.g.gain.cancelScheduledValues(t); d.g.gain.setTargetAtTime(1, t, MUSIC.fade / 3)
      o.g.gain.cancelScheduledValues(t); o.g.gain.setTargetAtTime(0, t, MUSIC.fade / 3)
      setTimeout(() => { if (!dead && decks[1 - cur] === o) o.a.pause() }, MUSIC.fade * 1000 + 300)
      cur = 1 - cur
      timer = window.setTimeout(cut, plan.hold * 1000)
    }
    const first = decks[0]!.a
    const go = () => { if (!dj) return; cut() }
    if (first.readyState >= 1) go(); else first.addEventListener('loadedmetadata', go, { once: true })
    dj = { stop() { dead = true; clearTimeout(timer); for (const k of decks) { k.a.pause(); k.a.removeAttribute('src'); k.a.load() } } }
  }

  return {
    unlock() { const c = ensure(); if (c && c.state === 'suspended') void c.resume(); if (c) startAmbience() },
    startMusic() { if (ensure()) startDj() },
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
      out.connect(sfxBus!)
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
      if (def.seq) for (const [f, at] of def.seq) {
        const o = c.createOscillator(); o.type = def.wave
        o.frequency.value = f
        const og = c.createGain(); og.gain.setValueAtTime(0.0001, t0 + at / 1000); og.gain.exponentialRampToValueAtTime(peak, t0 + at / 1000 + 0.006); og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
        o.connect(og); og.connect(sfxBus!); o.start(t0 + at / 1000); o.stop(t0 + dur + 0.05); stops.push(o)
      }
      if (def.tinkles) for (const t of tinklePlan(def.tinkles, Math.floor(now * 7) & 0xffff)) {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = t.f
        const tg = c.createGain(); const a0 = t0 + t.at
        tg.gain.setValueAtTime(0.0001, a0); tg.gain.exponentialRampToValueAtTime(t.gain * (0.5 + 0.5 * level), a0 + 0.003); tg.gain.exponentialRampToValueAtTime(0.0001, a0 + t.dur)
        o.connect(tg); tg.connect(sfxBus!); o.start(a0); o.stop(a0 + t.dur + 0.02); stops.push(o)
      }
      if (def.shatter) {
        const n = c.createBufferSource(); n.buffer = noiseBuf
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500
        const hg = c.createGain(); hg.gain.setValueAtTime(0.0001, t0); hg.gain.exponentialRampToValueAtTime(0.32, t0 + 0.004); hg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45)
        n.connect(hp); hp.connect(hg); hg.connect(sfxBus!); n.start(t0, Math.random()); n.stop(t0 + 0.5); stops.push(n)
      }
      active++
      void stops
      setTimeout(() => { active = Math.max(0, active - 1); out.disconnect() }, (Math.max(dur, def.tinkles ? 0.9 : 0) + 0.2) * 1000)
    },
    setAmbience(fallV, wind, on) {
      if (!ctx || !amb) return
      const p = ambienceFor(fallV, wind)
      const t = ctx.currentTime
      const g = on && !st.muted ? p.gain : 0
      amb.whistle.gain.setTargetAtTime(g, t, 0.25)
      amb.rumble.gain.setTargetAtTime(on && !st.muted ? p.rumble : 0, t, 0.4)
      amb.bp.frequency.setTargetAtTime(p.whistleHz, t, 0.3)
      amb.bp.Q.setTargetAtTime(p.q, t, 0.3)
      amb.o1.frequency.setTargetAtTime(p.whistleHz * 0.98, t, 0.3)
      amb.o2.frequency.setTargetAtTime(p.whistleHz * 1.5, t, 0.3)
      amb.lfo.frequency.setTargetAtTime(p.vibrato, t, 0.5)
    },
    setBus(bus, v) { const x = Math.max(0, Math.min(1, v)); if (bus === 'sfx') st.sfx = x; else if (bus === 'mus') st.mus = x; else st.amb = x; save(); const node = bus === 'sfx' ? sfxBus : bus === 'mus' ? musBus : ambBus; if (node && ctx) node.gain.setTargetAtTime(x, ctx.currentTime, 0.03) },
    getBus: bus => (bus === 'sfx' ? st.sfx : bus === 'mus' ? st.mus : st.amb),
    setVolume(v) { st.vol = Math.max(0, Math.min(1, v)); save(); applyMaster() },
    setMuted(m) { st.muted = m; save(); applyMaster() },
    getVolume: () => st.vol,
    isMuted: () => st.muted,
    destroy() { dj?.stop(); dj = null; try { amb?.src.stop(); amb?.src2.stop(); amb?.o1.stop(); amb?.o2.stop(); amb?.lfo.stop() } catch { /* already stopped */ } amb = null; void ctx?.close(); ctx = null; master = null },
  }
}
