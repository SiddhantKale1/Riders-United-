// 100% On-Device Smartphone Motion Crash & Fall Detection Engine
// Uses phone's built-in accelerometer & gyroscope (Zero external hardware, $0 cost)

export interface CrashEventData {
  timestamp: number;
  maxG: number;
  lat?: number;
  lng?: number;
}

export type CrashListener = (event: CrashEventData) => void;

class CrashDetectionService {
  private isListening: boolean = false;
  private isEnabled: boolean = true;
  private listeners: CrashListener[] = [];
  private lastTriggerTime: number = 0;
  private readonly COOLDOWN_MS = 60000; // 1 minute lockout between crash triggers

  // Physics thresholds calibrated for motorcycle touring
  // Normal road bumps: 1.5G - 2.5G. Severe crash/impact: > 3.8G
  private readonly CRASH_G_THRESHOLD = 3.8; 
  private recentMaxG: number = 0;
  private highGDetectedTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('riders_crash_detection_enabled');
      if (saved !== null) {
        this.isEnabled = saved === 'true';
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('riders_crash_detection_enabled', String(enabled));
    if (!enabled) {
      this.stop();
    } else {
      this.start();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public subscribe(listener: CrashListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public start() {
    if (this.isListening || !this.isEnabled || typeof window === 'undefined') return;

    if ('DeviceMotionEvent' in window) {
      // In iOS 13+, explicit permission is required
      const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DME.requestPermission === 'function') {
        DME.requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              this.attachListener();
            }
          })
          .catch(() => {});
      } else {
        this.attachListener();
      }
    }
  }

  private attachListener() {
    window.addEventListener('devicemotion', this.handleDeviceMotion, true);
    this.isListening = true;
  }

  public stop() {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
    this.isListening = false;
  }

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.isEnabled) return;
    const now = Date.now();
    if (now - this.lastTriggerTime < this.COOLDOWN_MS) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    // Calculate total G-Force: sqrt(x^2 + y^2 + z^2) / 9.80665
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const gForce = magnitude / 9.80665;

    if (gForce > this.recentMaxG) {
      this.recentMaxG = gForce;
    }

    // Phase 1: High-G impact detected
    if (gForce >= this.CRASH_G_THRESHOLD && this.highGDetectedTime === 0) {
      this.highGDetectedTime = now;
      this.recentMaxG = gForce;
    }

    // Phase 2: Check for sudden standstill/drop within 1.5 seconds after impact
    if (this.highGDetectedTime > 0 && now - this.highGDetectedTime > 1200) {
      // If motion has suddenly collapsed to stationary gravity range
      if (gForce < 1.4) {
        this.triggerCrash(this.recentMaxG);
      }
      this.highGDetectedTime = 0;
      this.recentMaxG = 0;
    }
  };

  private triggerCrash(maxG: number) {
    const now = Date.now();
    this.lastTriggerTime = now;
    const eventData: CrashEventData = {
      timestamp: now,
      maxG: parseFloat(maxG.toFixed(1))
    };

    console.warn('⚠️ CRASH DETECTION TRIGGERED:', eventData);
    this.listeners.forEach(cb => {
      try {
        cb(eventData);
      } catch (err) {
        console.error('Error in crash listener:', err);
      }
    });
  }

  // Simulator helper: Allows testing the full emergency SOS flow on phone/desktop without crashing!
  public simulateCrash(simulatedG: number = 4.2) {
    this.triggerCrash(simulatedG);
  }
}

export const crashDetectionService = new CrashDetectionService();
