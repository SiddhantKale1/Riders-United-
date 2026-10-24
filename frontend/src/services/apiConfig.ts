// API and Socket.IO Base URL resolver for Web, LAN & Native iOS/Android
import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If running in web browser (Safari on iPhone, Chrome on Desktop)
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      if (window.location.port === '5001') {
        return window.location.origin;
      }
      // If served via Vite dev server on port 5173, point to backend port 5001 on the same machine
      if (window.location.hostname && window.location.hostname !== '') {
        return `http://${window.location.hostname}:5001`;
      }
    }
  }

  // Native Capacitor fallback on iPhone / Android:
  const customIp = typeof localStorage !== 'undefined' ? localStorage.getItem('riders_backend_ip') : null;
  return customIp || 'http://192.168.29.187:5001';
};
