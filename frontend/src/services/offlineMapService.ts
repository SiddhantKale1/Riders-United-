// 100% Free On-Device Offline Map Tile Caching using CacheStorage API
// Pre-downloads OpenStreetMap / Carto tiles along touring routes for mountain/valley rides

export class OfflineMapService {
  private cacheName: string = 'riders-offline-tiles-v1';

  // Convert lat/lng to tile numbers
  private lon2tile(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  }

  private lat2tile(lat: number, zoom: number): number {
    return Math.floor(
      ((1 -
        Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
        2) *
        Math.pow(2, zoom)
    );
  }

  // Pre-download map tiles covering the route
  public async downloadRouteTiles(
    coordinates: [number, number][],
    onProgress: (percent: number, current: number, total: number) => void
  ): Promise<{ success: boolean; totalTiles: number }> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return { success: false, totalTiles: 0 };
    }

    try {
      const cache = await caches.open(this.cacheName);
      const uniqueTiles = new Set<string>();

      // Zoom levels 9 (regional) to 13 (highways & ghats)
      const zoomLevels = [9, 10, 11, 12, 13];

      coordinates.forEach(([lat, lon]) => {
        zoomLevels.forEach((zoom) => {
          const x = this.lon2tile(lon, zoom);
          const y = this.lat2tile(lat, zoom);
          // Sample 1 neighbor tile in each direction for corridor buffer
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              uniqueTiles.add(`${zoom}/${x + dx}/${y + dy}`);
            }
          }
        });
      });

      const tileList = Array.from(uniqueTiles);
      const total = tileList.length;
      let completed = 0;

      // Limit concurrent downloads to avoid overwhelming mobile network
      const BATCH_SIZE = 6;
      for (let i = 0; i < tileList.length; i += BATCH_SIZE) {
        const batch = tileList.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (tileCoord) => {
            const url = `https://a.basemaps.cartocdn.com/dark_all/${tileCoord}.png`;
            try {
              const match = await cache.match(url);
              if (!match) {
                const res = await fetch(url, { mode: 'cors' });
                if (res.ok) {
                  await cache.put(url, res);
                }
              }
            } catch (err) {
              // Ignore single tile fetch failure
            } finally {
              completed++;
              const percent = Math.round((completed / total) * 100);
              onProgress(percent, completed, total);
            }
          })
        );
      }

      return { success: true, totalTiles: completed };
    } catch (err) {
      console.error('Offline map cache error:', err);
      return { success: false, totalTiles: 0 };
    }
  }

  // Check how many tiles are cached
  public async getCachedCount(): Promise<number> {
    if (typeof window === 'undefined' || !('caches' in window)) return 0;
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      return keys.length;
    } catch {
      return 0;
    }
  }

  // Clear offline tile cache
  public async clearCache(): Promise<boolean> {
    if (typeof window === 'undefined' || !('caches' in window)) return false;
    try {
      await caches.delete(this.cacheName);
      return true;
    } catch {
      return false;
    }
  }
}

export const offlineMapService = new OfflineMapService();
