// Web Audio API Synthesizer for Walkie-Talkie & Tactical Convoy SFX

class AudioEffectsManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  // Walkie-Talkie PTT Press - Dual-tone radio key chirp + subtle squelch click
  public playMicKey() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Chirp 1 (880 Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1150, now + 0.04);

    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.05);

    // Second chirp (1200 Hz)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.045);
    osc2.frequency.exponentialRampToValueAtTime(1450, now + 0.08);

    gain2.gain.setValueAtTime(0.15, now + 0.045);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc2.start(now + 0.045);
    osc2.stop(now + 0.09);

    // White noise squelch burst
    this.playNoiseBurst(now + 0.08, 0.03, 0.05);
  }

  // Roger Beep - Classic NASA/CB Radio tone on PTT release
  public playRogerBeep() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // High roger tone (2475 Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2475, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);

    // Squelch tail burst
    this.playNoiseBurst(now + 0.11, 0.04, 0.04);
  }

  // Incoming transmission alert
  public playIncomingTransmission() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880, now + 0.06); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);

    this.playNoiseBurst(now + 0.12, 0.02, 0.04);
  }

  // Tactical Alert Sounds (Hazard, Regroup, SOS, Fuel)
  public playAlertSound(type: string) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (type === 'sos') {
      // Urgent high-low two-tone siren
      [0, 0.18, 0.36].forEach((offset, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 987 : 784, now + offset);

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } else if (type === 'regroup') {
      // Triple rising chime
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const offset = idx * 0.1;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);

        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } else {
      // General alert double ding
      [800, 1000].forEach((freq, idx) => {
        const offset = idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);

        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    }
  }

  // Synthesize realistic radio static / squelch noise
  private playNoiseBurst(startTime: number, duration: number, volume: number) {
    if (!this.ctx) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to make it sound like a radio receiver
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + duration);
    } catch {
      // Audio fallback silent fail
    }
  }
}

export const audioEffects = new AudioEffectsManager();
