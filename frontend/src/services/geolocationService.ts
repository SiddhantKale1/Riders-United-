// Real Device Geolocation & Screen WakeLock Service

export interface GPSPosition {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  altitude: number;
  accuracy: number;
  timestamp: number;
}

class GeolocationService {
  private watchId: number | null = null;
  private wakeLockSentinel: any = null;
  private lastPosition: GPSPosition | null = null;
  private isWatching: boolean = false;
  private onPositionUpdate: ((pos: GPSPosition) => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;

  public setOnPositionUpdate(cb: (pos: GPSPosition) => void) {
    this.onPositionUpdate = cb;
  }

  public setOnError(cb: (err: string) => void) {
    this.onErrorCallback = cb;
  }

  // Request Bike Screen WakeLock (keeps phone screen on while riding)
  public async requestWakeLock(): Promise<boolean> {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
    return false;
  }

  public releaseWakeLock() {
    if (this.wakeLockSentinel) {
      this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
    }
  }

  public isWakeLockActive(): boolean {
    return this.wakeLockSentinel !== null;
  }

  // Get Battery percentage if supported
  public async getBatteryLevel(): Promise<number> {
    try {
      if ('getBattery' in navigator && (navigator as any).getBattery) {
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      // ignore
    }
    return 95; // default fallback
  }

  // Start watching real device GPS
  public startTracking(): boolean {
    if (this.isWatching) return true;
    if (!navigator.geolocation) {
      if (this.onErrorCallback) this.onErrorCallback('Geolocation not supported by device');
      return false;
    }

    this.isWatching = true;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        let speedKmH = 0;
        if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed)) {
          speedKmH = Math.round(coords.speed * 3.6); // m/s to km/h
        } else if (this.lastPosition) {
          // Approximate speed from time delta & distance
          const dMeters = this.haversine(this.lastPosition.lat, this.lastPosition.lng, coords.latitude, coords.longitude);
          const dtSeconds = (pos.timestamp - this.lastPosition.timestamp) / 1000;
          if (dtSeconds > 0) {
            speedKmH = Math.min(160, Math.round((dMeters / dtSeconds) * 3.6));
          }
        }

        let heading = coords.heading || 0;
        if ((heading === null || isNaN(heading)) && this.lastPosition) {
          heading = this.calculateBearing(
            this.lastPosition.lat, this.lastPosition.lng,
            coords.latitude, coords.longitude
          );
        }

        const positionData: GPSPosition = {
          lat: coords.latitude,
          lng: coords.longitude,
          heading: Math.round(heading || 0),
          speed: Math.max(0, speedKmH),
          altitude: Math.round(coords.altitude || 15),
          accuracy: Math.round(coords.accuracy || 10),
          timestamp: pos.timestamp
        };

        this.lastPosition = positionData;

        if (this.onPositionUpdate) {
          this.onPositionUpdate(positionData);
        }
      },
      (err) => {
        console.warn('Geolocation watchPosition error:', err.message);
        if (this.onErrorCallback) {
          this.onErrorCallback(err.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    return true;
  }

  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
  }

  public isTracking(): boolean {
    return this.isWatching;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const geolocationService = new GeolocationService();
