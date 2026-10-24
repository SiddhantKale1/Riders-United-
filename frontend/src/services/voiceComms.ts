// Push-To-Talk Voice Communication Engine with Web Audio & WebRTC / WebSocket fallback

import { audioEffects } from './audioEffects';

export interface VoiceLevelCallback {
  (level: number): void;
}

class VoiceCommsEngine {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isTransmitting: boolean = false;
  private isMuted: boolean = false;
  private animationFrameId: number | null = null;
  private levelCallback: VoiceLevelCallback | null = null;
  private socketEmitCallback: ((event: string, data: any) => void) | null = null;
  private remoteAudioPlayer: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.remoteAudioPlayer = new Audio();
      this.remoteAudioPlayer.autoplay = true;
    }
  }

  public setSocketEmitter(emitter: (event: string, data: any) => void) {
    this.socketEmitCallback = emitter;
  }

  public setLevelCallback(cb: VoiceLevelCallback | null) {
    this.levelCallback = cb;
  }

  // Request microphone permission and prepare audio analyzer
  public async setupMicrophone(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported in this browser.');
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      return true;
    } catch (err) {
      console.warn('Microphone access denied or not available, simulation mode fallback active:', err);
      return false;
    }
  }

  // Start PTT Transmission
  public async startTransmission(riderId: string, callsign: string, channel: string = 'convoy-main') {
    if (this.isTransmitting) return;
    this.isTransmitting = true;

    // Play walkie-talkie chirp sound
    audioEffects.playMicKey();

    // Notify backend
    if (this.socketEmitCallback) {
      this.socketEmitCallback('voice:start', { riderId, callsign, channel });
    }

    // Try starting media stream if not active
    if (!this.mediaStream) {
      await this.setupMicrophone();
    }

    // Start audio level visualizer loop
    this.startLevelLoop();

    // Start recording audio chunks to send
    if (this.mediaStream && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
        this.mediaRecorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0 && this.socketEmitCallback) {
            const buffer = await e.data.arrayBuffer();
            const base64 = this.arrayBufferToBase64(buffer);
            this.socketEmitCallback('voice:chunk', {
              riderId,
              audioBlobBase64: base64,
              channel
            });
          }
        };

        this.mediaRecorder.start(250); // Send 250ms audio slices for walkie-talkie
      } catch (err) {
        console.warn('MediaRecorder error:', err);
      }
    }
  }

  // Stop PTT Transmission
  public stopTransmission(riderId: string, callsign: string, channel: string = 'convoy-main') {
    if (!this.isTransmitting) return;
    this.isTransmitting = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.levelCallback) {
      this.levelCallback(0);
    }

    // Play NASA roger beep
    audioEffects.playRogerBeep();

    if (this.socketEmitCallback) {
      this.socketEmitCallback('voice:stop', { riderId, callsign, channel });
    }
  }

  // Play incoming audio chunks from other riders
  public playIncomingAudioChunk(base64Chunk: string) {
    try {
      const audioBlob = this.base64ToBlob(base64Chunk, 'audio/webm');
      const blobUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(blobUrl);

      // Walkie-talkie slight audio bandpass filter for authentic radio feel
      audio.volume = 0.9;
      audio.play().catch(() => {});
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
      };
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  private startLevelLoop() {
    const dataArray = this.analyser ? new Uint8Array(this.analyser.frequencyBinCount) : null;

    const tick = () => {
      if (!this.isTransmitting) return;

      if (this.analyser && dataArray) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        if (this.levelCallback) this.levelCallback(normalized);
      } else {
        // Fallback simulation wave level
        const simLevel = Math.round(30 + Math.random() * 50);
        if (this.levelCallback) this.levelCallback(simLevel);
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToBlob(base64: string, type: string): Blob {
    const binary = window.atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type });
  }

  public cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const voiceComms = new VoiceCommsEngine();
