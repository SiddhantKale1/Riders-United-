// Native Mobile & Landscape Orientation Engine (Android, iOS & PWA)

import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

class NativeMobileService {
  private isLandscapeLocked: boolean = false;

  // Initialize native mobile settings
  public async init() {
    // Native mobile status bar and theme configuration
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch {
      // Browser fallback
    }
  }

  // Force Landscape & Fullscreen Mode
  public async enterLandscapeFullscreen(): Promise<boolean> {
    try {
      // Request native capacitor screen orientation lock
      await ScreenOrientation.lock({ orientation: 'landscape' });
      this.isLandscapeLocked = true;
    } catch {
      // Web standard fallback
      this.tryWebLandscapeLock();
    }

    // Request fullscreen on document
    try {
      if (document.documentElement && document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      }
    } catch {
      // ignore
    }

    return true;
  }

  private tryWebLandscapeLock() {
    try {
      const orientation = (screen as any).orientation;
      if (orientation && orientation.lock) {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // Trigger tactile vibration for PTT and alerts (motorcycle handlebar glove feedback)
  public async triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'heavy') {
    try {
      const impactStyle = style === 'light'
        ? ImpactStyle.Light
        : style === 'medium'
        ? ImpactStyle.Medium
        : ImpactStyle.Heavy;

      await Haptics.impact({ style: impactStyle });
    } catch {
      // Browser vibration API fallback
      if (navigator.vibrate) {
        navigator.vibrate(style === 'heavy' ? 80 : 35);
      }
    }
  }

  // Double pulse haptic for emergency alerts
  public async triggerEmergencyHaptic() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(async () => {
        try {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch {}
      }, 150);
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  }
}

export const nativeMobile = new NativeMobileService();
