/**
 * AudioManager — procedural sound effects + world music via the Web Audio API.
 * Zero audio files required — everything is synthesised.
 *
 * Usage:
 *   import { audioManager } from './AudioManager.js';
 *   audioManager.resume();                  // call once after a user gesture
 *   audioManager.setVolume(0.7);            // 0..1
 *   audioManager.startWorldMusic(1);
 *   audioManager.playLaser();
 */

export class AudioManager {
  constructor() {
    this._ctx         = null;
    this._master      = null;
    this._music       = null;   // music gain bus
    this._sfx         = null;   // sfx gain bus
    this._musicNodes  = [];     // nodes stopped when world changes
    this._loopHandles = [];     // setTimeout handles for music loops
    this._musicToken  = null;   // Symbol changed on every world switch
    this._ready       = false;
    this._pendingVol  = 0.7;
  }

  // ─── Initialise ─────────────────────────────────────────────────────────────
  // Must be called inside a user-gesture handler (click / pointer-lock).

  resume() {
    if (!this._ctx) {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._makeGain(this._pendingVol, this._ctx.destination);
      this._music  = this._makeGain(0.55, this._master);
      this._sfx    = this._makeGain(1.0,  this._master);
    } else if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    this._ready = true;
  }

  setVolume(v) {   // v in 0..1
    this._pendingVol = v;
    if (this._master) this._master.gain.setTargetAtTime(v, this._ctx.currentTime, 0.05);
  }

  // ─── SFX ────────────────────────────────────────────────────────────────────

  playLaser() {
    if (!this._ready) return;
    const { ctx, t } = this._now();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.13);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g); g.connect(this._sfx);
    osc.start(t); osc.stop(t + 0.15);
  }

  playEnemyExplode() {
    if (!this._ready) return;
    const { ctx, t } = this._now();
    // Filtered noise burst
    const nb = this._noiseSrc(0.6);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(900, t);
    nf.frequency.exponentialRampToValueAtTime(80, t + 0.5);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    nb.connect(nf); nf.connect(ng); ng.connect(this._sfx);
    nb.start(t); nb.stop(t + 0.6);
    // Sub-bass punch
    const punch = ctx.createOscillator();
    const pg    = ctx.createGain();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(130, t);
    punch.frequency.exponentialRampToValueAtTime(28, t + 0.22);
    pg.gain.setValueAtTime(0.8, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    punch.connect(pg); pg.connect(this._sfx);
    punch.start(t); punch.stop(t + 0.3);
  }

  playBatteryPickup() {
    if (!this._ready) return;
    const { ctx, t } = this._now();
    // Ascending C-major arpeggio (C5 → E5 → G5)
    for (const [i, freq] of [[0, 523.25], [1, 659.25], [2, 783.99]]) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      const ts = t + i * 0.075;
      g.gain.setValueAtTime(0, ts);
      g.gain.linearRampToValueAtTime(0.32, ts + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ts + 0.30);
      osc.connect(g); g.connect(this._sfx);
      osc.start(ts); osc.stop(ts + 0.36);
    }
  }

  playBossDefeat() {
    if (!this._ready) return;
    const { ctx, t } = this._now();
    // Massive noise explosion
    const nb = this._noiseSrc(2.2);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(2200, t);
    nf.frequency.exponentialRampToValueAtTime(55, t + 1.8);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.85, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
    nb.connect(nf); nf.connect(ng); ng.connect(this._sfx);
    nb.start(t); nb.stop(t + 2.2);
    // Ascending victory sweep
    for (const [i, freq] of [165, 220, 330, 440, 554, 660, 880].entries()) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      const ts = t + i * 0.14;
      osc.frequency.setValueAtTime(freq, ts);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ts + 0.9);
      g.gain.setValueAtTime(0.35, ts);
      g.gain.exponentialRampToValueAtTime(0.001, ts + 1.1);
      osc.connect(g); g.connect(this._sfx);
      osc.start(ts); osc.stop(ts + 1.2);
    }
  }

  // ─── World music ────────────────────────────────────────────────────────────

  startWorldMusic(worldNum) {
    this._killMusic();
    if (!this._ready) return;
    // Fade music bus back up (it was zeroed by _killMusic)
    this._music.gain.setValueAtTime(0, this._ctx.currentTime);
    this._music.gain.linearRampToValueAtTime(0.55, this._ctx.currentTime + 2.5);
    const token = Symbol();
    this._musicToken = token;
    if      (worldNum === 1) this._jungleMusic(token);
    else if (worldNum === 2) this._caveMusic(token);
    else if (worldNum === 3) this._citadelMusic(token);
  }

  stopMusic() {
    if (!this._ctx || !this._music) return;
    // Graceful fade-out then hard stop
    const token = Symbol();
    this._musicToken = token;
    this._music.gain.setTargetAtTime(0, this._ctx.currentTime, 0.4);
    setTimeout(() => this._killMusic(), 1600);
  }

  // ─── World 1: Garden Edge — bioluminescent jungle ──────────────────────────

  _jungleMusic(token) {
    const ctx = this._ctx, now = ctx.currentTime;

    // Bass drones — slightly detuned pair for warmth
    for (const freq of [82, 83.1]) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.13, now + 3);
      osc.connect(g); g.connect(this._music); osc.start(now);
      this._musicNodes.push(osc);
    }

    // Slow LFO — gentle breathing pulse on the music bus
    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.18; lfoG.gain.value = 0.10;
    lfo.connect(lfoG); lfoG.connect(this._music.gain); lfo.start(now);
    this._musicNodes.push(lfo);

    // Shimmering noise layer (insects/leaves)
    const shim = this._noiseSrc(5, true);
    const sf   = ctx.createBiquadFilter();
    sf.type = 'bandpass'; sf.frequency.value = 5000; sf.Q.value = 3;
    const sg = ctx.createGain(); sg.gain.value = 0.020;
    shim.connect(sf); sf.connect(sg); sg.connect(this._music); shim.start(now + 1);
    this._musicNodes.push(shim);

    // Sparse pentatonic melody
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const melody = () => {
      if (this._musicToken !== token) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.25 ? 0.5 : 1);
      const t2 = ctx.currentTime;
      g.gain.setValueAtTime(0, t2); g.gain.linearRampToValueAtTime(0.07, t2 + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t2 + 1.4);
      osc.connect(g); g.connect(this._music); osc.start(t2); osc.stop(t2 + 1.5);
      this._loopHandles.push(setTimeout(melody, 900 + Math.random() * 2400));
    };
    this._loopHandles.push(setTimeout(melody, 2000));
  }

  // ─── World 2: Crystal Cavern — deep resonant cave ──────────────────────────

  _caveMusic(token) {
    const ctx = this._ctx, now = ctx.currentTime;

    // Deep drones — D minor feel (D2, A2, D3)
    for (const [freq, vol] of [[73.4, 0.22], [110.0, 0.12], [146.8, 0.07]]) {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq + Math.random() * 0.3;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + 3);
      osc.connect(g); g.connect(this._music); osc.start(now);
      this._musicNodes.push(osc);
    }

    // Crystal resonance — high-Q bandpass noise bands
    for (const [freq, q] of [[880, 18], [1320, 22], [1760, 25]]) {
      const src = this._noiseSrc(6, true);
      const f   = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0.020;
      src.connect(f); f.connect(g); g.connect(this._music); src.start(now + 1);
      this._musicNodes.push(src);
    }

    // Sparse crystal drip tones
    const dripFreqs = [1174.66, 1396.91, 1661.2, 2093.0];
    const drip = () => {
      if (this._musicToken !== token) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = dripFreqs[Math.floor(Math.random() * dripFreqs.length)];
      const t2 = ctx.currentTime;
      g.gain.setValueAtTime(0, t2); g.gain.linearRampToValueAtTime(0.09, t2 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t2 + 0.85);
      osc.connect(g); g.connect(this._music); osc.start(t2); osc.stop(t2 + 0.95);
      this._loopHandles.push(setTimeout(drip, 1100 + Math.random() * 3800));
    };
    this._loopHandles.push(setTimeout(drip, 1400));
  }

  // ─── World 3: Corrupt's Citadel — industrial machine rhythm ────────────────

  _citadelMusic(token) {
    const ctx = this._ctx, now = ctx.currentTime;

    // Heavy sawtooth bass drones
    for (const [freq, cut, vol] of [[55, 180, 0.19], [55.4, 360, 0.07]]) {
      const osc = ctx.createOscillator();
      const f   = ctx.createBiquadFilter();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + 2.5);
      osc.connect(f); f.connect(g); g.connect(this._music); osc.start(now);
      this._musicNodes.push(osc);
    }

    // Metallic noise texture
    const met = this._noiseSrc(5, true);
    const mf  = ctx.createBiquadFilter();
    mf.type = 'bandpass'; mf.frequency.value = 2800; mf.Q.value = 5;
    const mg = ctx.createGain(); mg.gain.value = 0.015;
    met.connect(mf); mf.connect(mg); mg.connect(this._music); met.start(now + 1);
    this._musicNodes.push(met);

    // Mechanical beat at 120 bpm — kick every 500 ms, clang on beat 3
    let beatN = 0;
    const beat = () => {
      if (this._musicToken !== token) return;
      const t2 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t2); osc.frequency.exponentialRampToValueAtTime(32, t2 + 0.2);
      g.gain.setValueAtTime(0.50, t2); g.gain.exponentialRampToValueAtTime(0.001, t2 + 0.27);
      osc.connect(g); g.connect(this._music); osc.start(t2); osc.stop(t2 + 0.3);
      if (beatN % 4 === 2) {
        const cl = ctx.createOscillator();
        const cg = ctx.createGain();
        cl.type = 'square'; cl.frequency.value = 480 + Math.random() * 200;
        cg.gain.setValueAtTime(0.09, t2); cg.gain.exponentialRampToValueAtTime(0.001, t2 + 0.38);
        cl.connect(cg); cg.connect(this._music); cl.start(t2); cl.stop(t2 + 0.42);
      }
      beatN++;
      this._loopHandles.push(setTimeout(beat, 500));
    };
    this._loopHandles.push(setTimeout(beat, 600));
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  _killMusic() {
    this._musicToken = Symbol();
    for (const h of this._loopHandles) clearTimeout(h);
    this._loopHandles = [];
    for (const n of this._musicNodes) {
      try { n.stop(); }       catch {}
      try { n.disconnect(); } catch {}
    }
    this._musicNodes = [];
    // Reset music bus gain so the next world can fade in cleanly
    if (this._music && this._ctx) {
      this._music.gain.cancelScheduledValues(this._ctx.currentTime);
      this._music.gain.setValueAtTime(0, this._ctx.currentTime);
    }
  }

  _now() { return { ctx: this._ctx, t: this._ctx.currentTime }; }

  _makeGain(v, dest) {
    const g = this._ctx.createGain(); g.gain.value = v; g.connect(dest); return g;
  }

  _noiseSrc(seconds, loop = false) {
    const ctx = this._ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = loop;
    return src;
  }
}

export const audioManager = new AudioManager();
