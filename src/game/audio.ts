// ─── ROBOT LEGENDS — Web Audio synthesized SFX & music ───────────────────────
// All sounds are generated in-code (oscillators + noise), so no external assets
// are required and every sound is original.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  muted = false;
  volume = 0.8;
  musicVolume = 0.55;
  sfxVolume = 0.9;

  constructor() {
    if (typeof window !== "undefined") {
      this.muted = localStorage.getItem("rl_muted") === "1";
      this.volume = Number(localStorage.getItem("rl_vol_master") ?? 0.8);
      this.musicVolume = Number(localStorage.getItem("rl_vol_music") ?? 0.55);
      this.sfxVolume = Number(localStorage.getItem("rl_vol_sfx") ?? 0.9);
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.applyVolumes();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  applyVolumes() {
    if (!this.ctx || !this.master || !this.musicGain || !this.sfxGain) return;
    const m = this.muted ? 0 : this.volume;
    this.master.gain.value = m;
    this.musicGain.gain.value = this.musicVolume;
    this.sfxGain.gain.value = this.sfxVolume;
  }

  setVolumes(v: { master?: number; music?: number; sfx?: number; muted?: boolean }) {
    if (v.master !== undefined) { this.volume = v.master; localStorage.setItem("rl_vol_master", String(v.master)); }
    if (v.music !== undefined) { this.musicVolume = v.music; localStorage.setItem("rl_vol_music", String(v.music)); }
    if (v.sfx !== undefined) { this.sfxVolume = v.sfx; localStorage.setItem("rl_vol_sfx", String(v.sfx)); }
    if (v.muted !== undefined) { this.muted = v.muted; localStorage.setItem("rl_muted", v.muted ? "1" : "0"); }
    this.applyVolumes();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, dest: GainNode | null, when = 0, slideTo?: number) {
    const ctx = this.ensure(); if (!ctx || !dest) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(dest);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, when = 0, lowpass = 1200) {
    const ctx = this.ensure(); if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime + when;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  }

  // ─── Public SFX ────────────────────────────────────────────────────────────
  uiClick() { this.tone(1400, 0.06, "square", 0.12, this.sfxGain); }
  shoot() { this.tone(880, 0.09, "square", 0.22, this.sfxGain, 0, 420); }
  laser() { this.tone(1600, 0.16, "sawtooth", 0.2, this.sfxGain, 0, 300); this.tone(2400, 0.1, "square", 0.08, this.sfxGain, 0.02, 500); }
  melee() { this.noise(0.12, 0.28, 0, 2400); this.tone(320, 0.09, "triangle", 0.2, this.sfxGain, 0, 180); }
  explosion() { this.noise(0.55, 0.5, 0, 900); this.tone(140, 0.5, "sawtooth", 0.35, this.sfxGain, 0, 40); }
  hit() { this.noise(0.06, 0.18, 0, 3000); this.tone(220, 0.05, "square", 0.14, this.sfxGain, 0, 150); }
  hurt() { this.tone(180, 0.15, "sawtooth", 0.2, this.sfxGain, 0, 90); }
  coin() { this.tone(1250, 0.07, "sine", 0.2, this.sfxGain); this.tone(1750, 0.12, "sine", 0.18, this.sfxGain, 0.06); }
  heal() { this.tone(660, 0.18, "sine", 0.18, this.sfxGain, 0, 990); this.tone(990, 0.22, "sine", 0.15, this.sfxGain, 0.08, 1320); }
  shieldUp() { this.tone(440, 0.3, "triangle", 0.2, this.sfxGain, 0, 660); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, "square", 0.16, this.sfxGain, i * 0.09)); }
  correct() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.25, "sine", 0.22, this.sfxGain, i * 0.1)); }
  wrong() { this.tone(220, 0.3, "sawtooth", 0.2, this.sfxGain, 0, 160); this.tone(160, 0.4, "sawtooth", 0.18, this.sfxGain, 0.15, 110); }
  turretFire() { this.tone(300, 0.2, "square", 0.25, this.sfxGain, 0, 120); this.noise(0.15, 0.2, 0, 1500); }
  turretDown() { this.noise(0.7, 0.45, 0, 700); this.tone(90, 0.6, "sawtooth", 0.3, this.sfxGain, 0, 38); }
  coreDown() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.4, "sawtooth", 0.25, this.sfxGain, i * 0.25, f * 0.7)); this.noise(1.1, 0.5, 0.1, 500); }
  recall() { this.tone(523, 0.4, "sine", 0.15, this.sfxGain, 0, 1568); }
  ultimate() { this.tone(98, 0.7, "sawtooth", 0.3, this.sfxGain, 0, 392); [523, 784, 1046].forEach((f, i) => this.tone(f, 0.3, "square", 0.14, this.sfxGain, 0.2 + i * 0.12)); }
  victory() { [523, 523, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, "square", 0.2, this.sfxGain, i * 0.16)); }
  defeat() { [392, 370, 330, 262].forEach((f, i) => this.tone(f, 0.45, "sawtooth", 0.18, this.sfxGain, i * 0.3)); }
  buy() { this.tone(988, 0.08, "sine", 0.2, this.sfxGain); this.tone(1480, 0.14, "sine", 0.16, this.sfxGain, 0.05); }
  error() { this.tone(196, 0.15, "square", 0.15, this.sfxGain); }

  // ─── Background music (heroic synth loop, Am – F – C – G) ──────────────────
  startMusic() {
    const ctx = this.ensure(); if (!ctx || this.musicTimer) return;
    const roots = [110, 87.31, 130.81, 98]; // A2 F2 C3 G2
    const arp = [0, 3, 7, 12, 7, 3, 7, 10]; // minor-ish arpeggio offsets
    const stepDur = 0.21;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      const bar = Math.floor(this.musicStep / 8) % 4;
      const step = this.musicStep % 8;
      const root = roots[bar];
      const note = root * Math.pow(2, arp[step] / 12);
      this.tone(note, stepDur * 0.95, "triangle", 0.11, this.musicGain);
      if (step % 2 === 0) this.tone(root / 2, stepDur * 1.1, "sine", 0.14, this.musicGain);
      if (step === 0) this.tone(root * 2, stepDur * 2.4, "sawtooth", 0.025, this.musicGain);
      this.musicStep++;
    }, stepDur * 1000);
  }

  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
}

export const audio = new AudioEngine();
