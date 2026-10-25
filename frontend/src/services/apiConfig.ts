// API and Socket.IO Base URL resolver for Web, LAN & Native Android/iOS
import { Capacitor } from '@capacitor/core';

// Override at build time with VITE_BACKEND_URL for packaged native apps.
export const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.trim() || 'http://localhost:5001';

export const getApiBaseUrl = (): string => {
  // 1. User manual override (from in-app Server Settings)
  if (typeof localStorage !== 'undefined') {
    const customIp = localStorage.getItem('riders_backend_ip');
    if (customIp && customIp.trim()) {
      let clean = customIp.trim().replace(/\/$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      return clean;
    }
  }

  // 2. Native apps use the configured deployment URL (or localhost for local development).
  if (Capacitor.isNativePlatform()) {
    return DEFAULT_BACKEND_URL;
  }

  // Web app and API are served through the same origin in development and production.
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return window.location.origin;
    }
  }

  return DEFAULT_BACKEND_URL;
};

export const setApiBaseUrl = (newUrl: string): void => {
  if (typeof localStorage === 'undefined') return;
  const trimmed = newUrl.trim();
  if (!trimmed) {
    localStorage.removeItem('riders_backend_ip');
    return;
  }
  let clean = trimmed.replace(/\/$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  localStorage.setItem('riders_backend_ip', clean);
};

export const testServerConnection = async (
  targetUrl?: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  const base = (targetUrl || getApiBaseUrl()).replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: 'Server reached successfully!', data };
    }
    return { success: false, message: `Server error HTTP ${res.status}` };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: 'Connection timed out (4s). Verify IP & Wi-Fi.' };
    }
    return {
      success: false,
      message: err?.message ? `Failed to connect: ${err.message}` : 'Cannot reach server'
    };
  }
};
