// Free Open-Source Routing Engine (OSRM) and Geocoding (Nominatim)
// 100% Free - Zero API keys, zero subscriptions, works anywhere in the world.

export interface LocationSearchResult {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteManeuver {
  type: string;
  modifier?: string;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteCalculationResult {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet
  distanceKm: number;
  durationMinutes: number;
  maneuvers: RouteManeuver[];
  summary: string;
}

class RoutingService {
  // Free Nominatim Geocoding Search (Google Maps-like location search)
  public async searchPlaces(query: string): Promise<LocationSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim()
      )}&limit=5&addressdetails=1`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RidersUnitedMotorcycleApp/1.0'
        }
      });

      if (!res.ok) return [];

      const data = await res.json();
      return data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
    } catch (err) {
      console.warn('Place search failed:', err);
      return [];
    }
  }

  // Reverse Geocode: Get place name from coordinates
  public async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RidersUnitedMotorcycleApp/1.0'
        }
      });
      if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const data = await res.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  // Calculate Real Road Route using free OSRM (Open Source Routing Machine)
  public async calculateRoute(
    waypoints: { lat: number; lng: number }[]
  ): Promise<RouteCalculationResult | null> {
    if (!waypoints || waypoints.length < 2) return null;

    try {
      // OSRM expects coordinates in lng,lat format joined by semicolon
      const coordString = waypoints
        .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
        .join(';');

      const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        return null;
      }

      const primaryRoute = data.routes[0];

      // Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
      const coordinates: [number, number][] = primaryRoute.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );

      const distanceKm = Math.round((primaryRoute.distance / 1000) * 10) / 10;
      const durationMinutes = Math.round(primaryRoute.duration / 60);

      // Extract Turn-by-Turn maneuvers (like Google Maps)
      const maneuvers: RouteManeuver[] = [];
      if (primaryRoute.legs) {
        primaryRoute.legs.forEach((leg: any) => {
          if (leg.steps) {
            leg.steps.forEach((step: any) => {
              const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
              const instruction = step.name
                ? `${step.maneuver.type}${modifier} onto ${step.name}`
                : `${step.maneuver.type}${modifier}`;

              maneuvers.push({
                type: step.maneuver.type,
                modifier: step.maneuver.modifier,
                instruction: this.humanizeInstruction(step),
                distanceMeters: Math.round(step.distance),
                durationSeconds: Math.round(step.duration)
              });
            });
          }
        });
      }

      return {
        coordinates,
        distanceKm,
        durationMinutes,
        maneuvers,
        summary: primaryRoute.legs && primaryRoute.legs[0]?.summary ? primaryRoute.legs[0].summary : 'Highway Route'
      };
    } catch (err) {
      console.warn('OSRM routing request failed:', err);
      return null;
    }
  }

  private humanizeInstruction(step: any): string {
    const maneuver = step.maneuver;
    const name = step.name || 'highway';
    const type = maneuver.type;
    const modifier = maneuver.modifier;

    if (type === 'depart') return `Head towards ${name}`;
    if (type === 'arrive') return 'Arrive at destination';
    if (type === 'turn') {
      if (modifier === 'left') return `Turn left onto ${name}`;
      if (modifier === 'right') return `Turn right onto ${name}`;
      if (modifier === 'slight left') return `Slight left onto ${name}`;
      if (modifier === 'slight right') return `Slight right onto ${name}`;
      if (modifier === 'sharp left') return `Sharp left onto ${name}`;
      if (modifier === 'sharp right') return `Sharp right onto ${name}`;
    }
    if (type === 'roundabout') return `Enter roundabout and take exit onto ${name}`;
    if (type === 'merge') return `Merge onto ${name}`;
    if (type === 'fork') return `Keep ${modifier || 'straight'} at fork`;

    return `Continue on ${name}`;
  }
}

export const routingService = new RoutingService();
