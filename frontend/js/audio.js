// audio.js — 合成钢琴 BGM + 音效（无需外部音频文件）
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.muted = false;
    this.started = false;
  }

  _ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    // 简单混响
    this.reverb = this.ctx.createConvolver ? this.ctx.createConvolver() : null;
    if (this.reverb) {
      this.reverb.buffer = this._makeImpulse(2.5, 2.5);
      this.reverb.connect(this.master);
    }

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;
    this.bgmGain.connect(this.master);
    if (this.reverb) this.bgmGain.connect(this.reverb);
  }

  _makeImpulse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = rate * duration;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, decay);
      }
    }
    return buf;
  }

  startBGM() {
    this._ensure();
    if (this.started) return;
    this.started = true;

    // 舒缓古典钢琴和弦进行：Am - F - C - G
    // 频率（Hz）
    const chords = [
      [220.00, 261.63, 329.63],  // Am
      [174.61, 220.00, 261.63],  // F
      [261.63, 329.63, 392.00],  // C
      [196.00, 246.94, 293.66],  // G
    ];
    let step = 0;
    const playChord = () => {
      if (!this.started) return;
      const chord = chords[step % chords.length];
      chord.forEach((freq, i) => {
        this._pianoNote(freq, 1.8, 0.25, i*0.08);
      });
      // 高音琶音
      const arp = [440, 523.25, 659.25, 523.25];
      arp.forEach((f, i) => {
        this._pianoNote(f, 1.0, 0.12, 1.2 + i*0.25);
      });
      step++;
      setTimeout(playChord, 4000);
    };
    playChord();
  }

  _pianoNote(freq, dur, vol, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const g2 = this.ctx.createGain();
    g2.gain.value = 0.3;
    osc.connect(g);
    osc2.connect(g2); g2.connect(g);
    g.connect(this.bgmGain);

    osc.start(t); osc2.start(t);
    osc.stop(t + dur); osc2.stop(t + dur);
  }

  // 音效：敲击
  knock() {
    this._ensure();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.15);
  }

  // 音效：椅子倒地
  chairFall() {
    this._ensure();
    const t = this.ctx.currentTime;
    // 噪声 burst
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate*0.3, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(rate*0.05));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.4;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 800;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t);
  }

  // 音效：UI 点击
  click() {
    this._ensure();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.08);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
}
