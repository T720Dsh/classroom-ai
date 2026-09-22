// audio.js — 合成钢琴 BGM（多变版）+ 音效
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

    // 混响
    this.reverb = this.ctx.createConvolver ? this.ctx.createConvolver() : null;
    if (this.reverb) {
      this.reverb.buffer = this._makeImpulse(2.8, 3.0);
      this.reverb.connect(this.master);
    }

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.22;
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

    // 多段和弦进行，循环变化
    const progressions = [
      // 段1：Am - F - C - G（温柔）
      [
        [220.00, 261.63, 329.63],
        [174.61, 220.00, 261.63],
        [261.63, 329.63, 392.00],
        [196.00, 246.94, 293.66],
      ],
      // 段2：Dm - Bb - F - C（明亮）
      [
        [293.66, 349.23, 440.00],
        [233.08, 293.66, 349.23],
        [174.61, 220.00, 261.63],
        [261.63, 329.63, 392.00],
      ],
      // 段3：Em - C - G - D（略带忧郁）
      [
        [329.63, 392.00, 493.88],
        [261.63, 329.63, 392.00],
        [196.00, 246.94, 293.66],
        [293.66, 369.99, 440.00],
      ],
      // 段4：F - Am - Dm - G（收尾回到温柔）
      [
        [174.61, 220.00, 261.63],
        [220.00, 261.63, 329.63],
        [293.66, 349.23, 440.00],
        [196.00, 246.94, 293.66],
      ],
    ];

    let progIdx = 0;
    let step = 0;
    let phrase = 0;

    const playChord = () => {
      if (!this.started) return;
      const prog = progressions[progIdx % progressions.length];
      const chord = prog[step % prog.length];

      // Rotate voicings and dynamics so repeated progressions do not sound identical.
      const softness = [0.78, 0.95, 0.87, 1.06][step % 4];
      chord.forEach((f, i) => this._pianoNote(f/2, 2.5, 0.14*softness, i*0.06));
      chord.forEach((f, i) => this._pianoNote(f * (phrase % 3 === 2 && i === 2 ? 2 : 1),
        1.8, 0.13*softness, i*0.11));

      // 旋律琶音（每段不同）
      const arpPatterns = [
        [1, 2, 3, 2, 1],
        [3, 2, 1, 2, 3],
        [1, 3, 5, 3, 1],
        [2, 3, 1, 3, 2],
      ];
      const arp = arpPatterns[(progIdx + phrase) % arpPatterns.length];
      arp.forEach((mult, i) => {
        if (phrase % 4 === 3 && i === 2) return; // occasional breath in the melody
        this._pianoNote(chord[(i + phrase) % 3] * (mult > 3 ? 2 : 1),
          0.9 + (i % 2)*0.25, 0.07*softness, 1.35 + i*0.34);
      });

      // 偶尔加高音装饰
      if (step % 4 === 2) {
        this._pianoNote(chord[2] * 2, 1.7, 0.045, 2.8);
      }

      step++;
      if (step % 4 === 0) { progIdx++; phrase++; }
      setTimeout(playChord, [4100, 3900, 4300, 4000][phrase % 4]);
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

  chairFall() {
    this._ensure();
    const t = this.ctx.currentTime;
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
