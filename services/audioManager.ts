
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentTrack: 'main' | 'battle' | null = null;
  private schedulerTimer: number | null = null;

  private tempo: number = 95;
  private nextNoteTime: number = 0;
  private currentNote: number = 0;

  constructor() {}

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.musicGain.gain.value = 0.22;
    this.sfxGain.gain.value = 0.35;
  }

  private playInstrument(freq: number, time: number, duration: number = 0.4, volume: number = 0.3) {
    if (!this.ctx || !this.musicGain) return;
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const env = this.ctx.createGain();
    carrier.type = 'triangle';
    modulator.type = 'sine';
    modulator.frequency.value = freq * 2.01;
    modGain.gain.value = freq * 0.75;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(volume, time + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, time + duration);
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(this.musicGain);
    carrier.start(time); modulator.start(time);
    carrier.stop(time + duration); modulator.stop(time + duration);

    const tine = this.ctx.createOscillator();
    const tineEnv = this.ctx.createGain();
    tine.type = 'sine'; tine.frequency.value = freq * 4;
    tineEnv.gain.setValueAtTime(volume * 0.3, time);
    tineEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    tine.connect(tineEnv); tineEnv.connect(this.musicGain);
    tine.start(time); tine.stop(time + 0.05);
  }

  private playPercussion(time: number, type: 'kick' | 'hat') {
    if (!this.ctx || !this.musicGain) return;
    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      g.gain.setValueAtTime(0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(g); g.connect(this.musicGain);
      osc.start(time); osc.stop(time + 0.1);
    } else {
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 8000;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.05, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      noise.connect(filter); filter.connect(g); g.connect(this.musicGain);
      noise.start(time); noise.stop(time + 0.05);
    }
  }

  private mainMelody = [
    261.63, 0, 329.63, 261.63, 392.00, 0, 329.63, 0,
    293.66, 0, 349.23, 293.66, 440.00, 0, 349.23, 0,
    392.00, 0, 329.63, 392.00, 261.63, 329.63, 392.00, 0,
    349.23, 0, 293.66, 349.23, 261.63, 0, 0, 0
  ];

  private battleMelody = [
    329.63, 0, 293.66, 0, 261.63, 329.63, 392.00, 0,
    440.00, 0, 392.00, 0, 349.23, 440.00, 523.25, 0,
    392.00, 349.23, 329.63, 293.66, 261.63, 329.63, 196.00, 0,
    220.00, 246.94, 261.63, 293.66, 261.63, 0, 0, 0
  ];

  private scheduler = () => {
    if (!this.isPlaying || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      const isBattle = this.currentTrack === 'battle';
      const melody = isBattle ? this.battleMelody : this.mainMelody;
      const note = melody[this.currentNote % melody.length];
      const step = this.currentNote % 16;
      if (note > 0) {
        this.playInstrument(note, this.nextNoteTime, isBattle ? 0.3 : 0.45, isBattle ? 0.15 : 0.25);
        if (step % 8 === 0) this.playInstrument(note / 2, this.nextNoteTime, 0.2, 0.1);
      }
      if (step % 4 === 0) this.playPercussion(this.nextNoteTime, 'kick');
      if (step % 2 !== 0) this.playPercussion(this.nextNoteTime, 'hat');
      const secondsPerBeat = 60.0 / (isBattle ? this.tempo * 1.1 : this.tempo);
      this.nextNoteTime += 0.25 * secondsPerBeat;
      this.currentNote++;
    }
    this.schedulerTimer = window.setTimeout(this.scheduler, 25);
  };

  public setMusicEnabled(enabled: boolean) {
    this.init();
    if (enabled && !this.isPlaying) {
      this.isPlaying = true; this.nextNoteTime = this.ctx!.currentTime; this.scheduler();
    } else if (!enabled && this.isPlaying) {
      this.isPlaying = false; if (this.schedulerTimer) clearTimeout(this.schedulerTimer);
    }
  }

  public switchTrack(track: 'main' | 'battle') { this.currentTrack = track; }

  public playSFX(type: 'collect' | 'hit' | 'victory' | 'bingo' | 'trade' | 'click') {
    this.init(); if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime;
    switch (type) {
      case 'collect': this.playInstrument(880, time, 0.15, 0.4); this.playInstrument(1108.73, time + 0.05, 0.15, 0.4); break;
      case 'hit': this.playInstrument(110, time, 0.2, 0.5); break;
      case 'victory': [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => this.playInstrument(f, time + i * 0.1, 0.6, 0.3)); break;
      case 'bingo': for (let i = 0; i < 6; i++) this.playInstrument(600 + i * 200, time + i * 0.05, 0.1, 0.3); break;
      case 'click': this.playInstrument(2000, time, 0.02, 0.2); break;
    }
  }
}
export const audioManager = new AudioManager();
