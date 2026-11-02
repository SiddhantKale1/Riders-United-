import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Rider, Waypoint, TacticalAlert, CameraMode } from '../types';
import { Crosshair, Navigation, Crown, AlertTriangle, Layers, MapPin } from 'lucide-react';

interface MapViewProps {
  riders: Rider[];
  waypoints: Waypoint[];
  currentRiderId: string;
  cameraMode: CameraMode;
  onSetCameraMode: (mode: CameraMode) => void;
  activeRoutePath?: [number, number][];
  isRideActive?: boolean;
  startPoint?: { lat: number; lng: number } | null;
  alerts?: TacticalAlert[];
}

export const CARTO_API_KEY = 'cb1_4zkt_1_ddbf774aaf22c246a6596148';

// 1. Google Maps Navigation Style Tiles (CartoDB Voyager: Crisp roads, highway shields, green terrain, water)
const GOOGLE_MAPS_STREETS_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;
// 2. High-Res Satellite View (Esri World Imagery)
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
// 3. Labels Overlay for Satellite
const LABELS_OVERLAY_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;

export const MapView: React.FC<MapViewProps> = ({
  riders,
  waypoints,
  currentRiderId,
  cameraMode,
  onSetCameraMode,
  activeRoutePath,
  isRideActive,
  startPoint,
  alerts = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const ridersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const casingPolylineRef = useRef<L.Polyline | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapLayerMode, setMapLayerMode] = useState<'streets' | 'satellite'>('streets');
  const [isOverviewingRoute, setIsOverviewingRoute] = useState<boolean>(false);
  const isOverviewingRouteRef = useRef<boolean>(false);
  const overviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overviewLockReleaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredInitialOverviewRef = useRef<boolean>(false);

  const pathCoordinates = activeRoutePath && activeRoutePath.length > 1
    ? activeRoutePath
    : [];

  // 2-Second Route Overview Animation on Ride Start ➔ Zoom in on Current Location (2-5 km Area)
  const triggerRouteOverviewSequence = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (overviewTimeoutRef.current) clearTimeout(overviewTimeoutRef.current);
    if (overviewLockReleaseRef.current) clearTimeout(overviewLockReleaseRef.current);

    setIsOverviewingRoute(true);
    isOverviewingRouteRef.current = true;

    // 1. Show the entire route for ~2 seconds
    const targetRoute = pathCoordinates.length > 1
      ? pathCoordinates
      : (activeRoutePath && activeRoutePath.length > 1 ? activeRoutePath : []);

    if (targetRoute.length > 1) {
      const bounds = L.latLngBounds(targetRoute);
      map.fitBounds(bounds, { padding: [60, 60], animate: true, maxZoom: 14 });
    }

    // 2. After 2 seconds, zoom onto current location and show ~2-5 km area (Zoom 15)
    overviewTimeoutRef.current = setTimeout(() => {
      let zoomLat = 18.9220;
      let zoomLng = 72.8347;

      const me = riders.find((r) => r.id === currentRiderId) || riders[0];
      if (me && Number.isFinite(me.lat) && Number.isFinite(me.lng)) {
        zoomLat = me.lat;
        zoomLng = me.lng;
      } else if (startPoint && Number.isFinite(startPoint.lat)) {
        zoomLat = startPoint.lat;
        zoomLng = startPoint.lng;
      } else if (targetRoute.length > 0) {
        zoomLat = targetRoute[0][0];
        zoomLng = targetRoute[0][1];
      }

      // Zoom 15 renders ~2.5 to 4.5 km of roads and terrain across screen
      map.flyTo([zoomLat, zoomLng], 15, { animate: true, duration: 1.8 });

      // 3. Release overview lock once flyTo animation completes
      overviewLockReleaseRef.current = setTimeout(() => {
        setIsOverviewingRoute(false);
        isOverviewingRouteRef.current = false;
      }, 1900);
    }, 2000);
  };

  // Trigger sequence whenever ride becomes active
  useEffect(() => {
    if (isRideActive) {
      const timer = setTimeout(() => {
        triggerRouteOverviewSequence();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      if (overviewTimeoutRef.current) clearTimeout(overviewTimeoutRef.current);
      if (overviewLockReleaseRef.current) clearTimeout(overviewLockReleaseRef.current);
      setIsOverviewingRoute(false);
      isOverviewingRouteRef.current = false;
      hasTriggeredInitialOverviewRef.current = false;
    }
  }, [isRideActive]);

  // Initialize Map with Google Maps Navigation Streets as Default
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = startPoint
      ? [startPoint.lat, startPoint.lng]
      : pathCoordinates.length > 0
      ? [pathCoordinates[0][0], pathCoordinates[0][1]]
      : [18.9220, 72.8347];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    const streetLayer = L.tileLayer(GOOGLE_MAPS_STREETS_URL, {
      maxZoom: 19,
      subdomains: 'abc',
      attribution: '© OpenStreetMap, © CARTO'
    }).addTo(map);
    streetLayer.bringToBack();
    activeTileLayerRef.current = streetLayer;

    // Zoom control positioned on bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    ridersLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);
    alertsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size on mount to ensure tiles are immediately rendered
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // ResizeObserver ensures map fills container when layout or tab changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Map Layer between Google Navigation Streets & Photorealistic Satellite Hybrid
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
      activeTileLayerRef.current = null;
    }
    if (labelsTileLayerRef.current) {
      map.removeLayer(labelsTileLayerRef.current);
      labelsTileLayerRef.current = null;
    }

    if (mapLayerMode === 'satellite') {
      const satLayer = L.tileLayer(SATELLITE_TILE_URL, {
        maxZoom: 19,
        attribution: '© Esri, Maxar'
      }).addTo(map);
      satLayer.bringToBack();
      activeTileLayerRef.current = satLayer;

      // Overlay road & city labels
      const labelsLayer = L.tileLayer(LABELS_OVERLAY_URL, {
        maxZoom: 19,
        subdomains: 'abc'
      }).addTo(map);
      labelsTileLayerRef.current = labelsLayer;
    } else {
      const streetLayer = L.tileLayer(GOOGLE_MAPS_STREETS_URL, {
        maxZoom: 19,
        subdomains: 'abc',
        attribution: '© OpenStreetMap, © CARTO'
      }).addTo(map);
      streetLayer.bringToBack();
      activeTileLayerRef.current = streetLayer;
    }

    map.invalidateSize();
  }, [mapLayerMode]);

  // Draw Google Maps Highway Route Polyline (Signature Navigation Blue with Soft White Casing)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
    if (casingPolylineRef.current) map.removeLayer(casingPolylineRef.current);

    if (pathCoordinates.length > 1) {
      // Google Maps Soft Elevated Casing
      const casing = L.polyline(pathCoordinates, {
        color: '#ffffff',
        weight: 9.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Google Maps Vibrant Navigation Blue Line
      const navigationBlueLine = L.polyline(pathCoordinates, {
        color: '#1A73E8',
        weight: 6.5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      casingPolylineRef.current = casing;
      routePolylineRef.current = navigationBlueLine;

      if (activeRoutePath && activeRoutePath.length > 1 && !isRideActive) {
        const bounds = L.latLngBounds(activeRoutePath);
        map.fitBounds(bounds, { padding: [80, 80], animate: true });
      }
    }

    return () => {
      if (casingPolylineRef.current) map.removeLayer(casingPolylineRef.current);
      if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
    };
  }, [activeRoutePath, isRideActive]);

  // Update Tactical Alert Markers (Google Maps Incident Reporting Style)
  useEffect(() => {
    const layer = alertsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    alerts.forEach((alert) => {
      let iconEmoji = '⚠️';
      let pinColor = '#f59e0b';
      let titleTag = 'Hazard';

      if (alert.type === 'sos') {
        iconEmoji = '🚨';
        pinColor = '#ef4444';
        titleTag = 'SOS';
      } else if (alert.type === 'police') {
        iconEmoji = '👮';
        pinColor = '#2563eb';
        titleTag = 'Police';
      } else if (alert.type === 'fuel') {
        iconEmoji = '⛽';
        pinColor = '#ea580c';
        titleTag = 'Fuel';
      } else if (alert.type === 'breakdown') {
        iconEmoji = '🔧';
        pinColor = '#8b5cf6';
        titleTag = 'Repair';
      }

      const alertIcon = L.divIcon({
        className: 'custom-alert-marker',
        html: `
          <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            <div class="px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 border border-white" style="background-color: ${pinColor}; color: white;">
              <span>${iconEmoji}</span>
              <span class="text-[10px] font-bold tracking-tight uppercase">${titleTag}</span>
            </div>
            <div class="hidden group-hover:block absolute top-8 bg-gray-900 text-white text-[10px] font-medium px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
              ${alert.detail} (${alert.creatorName})
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([alert.lat, alert.lng], { icon: alertIcon });
      layer.addLayer(marker);
    });
  }, [alerts]);

  // Update Waypoint Markers (Google Maps Teardrop Destination Pin & Circular Waypoint Pills)
  useEffect(() => {
    const layer = waypointsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    waypoints.forEach((wp) => {
      const isStart = wp.type === 'start';
      const isDest = wp.type === 'destination';

      let markerHtml = '';

      if (isDest) {
        // Iconic Google Maps Red Teardrop Destination Pin with Checkered Flag
        markerHtml = `
          <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-full group cursor-pointer">
            <svg viewBox="0 0 32 44" class="w-8 h-11" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
              <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 44 16 44 C16 44 32 28 32 16 C32 7.16 24.84 0 16 0 Z" fill="#EA4335" stroke="#FFFFFF" stroke-width="1.5" />
              <circle cx="16" cy="15" r="7.5" fill="#FFFFFF" />
              <text x="16" y="19" font-size="10" font-weight="bold" fill="#EA4335" text-anchor="middle">🏁</text>
            </svg>
            <div class="hidden group-hover:block absolute -top-8 bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
              ${wp.name}
            </div>
          </div>
        `;
      } else if (isStart) {
        // Google Maps Green Origin Pin
        markerHtml = `
          <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
              A
            </div>
            <div class="hidden group-hover:block absolute top-7 bg-gray-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
              ${wp.name}
            </div>
          </div>
        `;
      } else {
        // Google Maps Clean Waypoint Badge
        let label = 'WP';
        let bg = '#18191D';
        if (wp.type === 'fuel') { label = '⛽'; bg = '#ea580c'; }
        else if (wp.type === 'food') { label = '☕'; bg = '#0284c7'; }
        else if (wp.type === 'regroup') { label = '🔄'; bg = '#059669'; }

        markerHtml = `
          <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            <div class="w-7 h-7 rounded-full text-white shadow-md flex items-center justify-center text-xs border border-white" style="background-color: ${bg};">
              ${label}
            </div>
            <div class="hidden group-hover:block absolute top-8 bg-gray-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
              ${wp.name}
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-wp-icon',
        html: markerHtml,
        iconSize: [32, 44],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });
      layer.addLayer(marker);
    });
  }, [waypoints]);

  // Update Rider Markers: MOTORCYCLE IN PLACE OF AN ARROW!
  useEffect(() => {
    const layer = ridersLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    const now = Date.now();

    // Ensure there is ALWAYS at least the current rider visible on the map
    const displayRiders: Rider[] = riders.length > 0 ? riders : [
      {
        id: currentRiderId || 'rider-me',
        name: 'You',
        callsign: 'You',
        bikeModel: 'Motorcycle',
        avatarColor: '#2563eb',
        role: 'leader' as const,
        lat: startPoint ? startPoint.lat : (activeRoutePath?.[0]?.[0] || 18.9220),
        lng: startPoint ? startPoint.lng : (activeRoutePath?.[0]?.[1] || 72.8347),
        heading: 45,
        speed: 0,
        altitude: 10,
        battery: 100,
        isOnline: true,
        isTalking: false,
        lastPing: now,
        distanceFromLeader: 0,
        distanceCoveredKm: 0,
        channel: 'convoy-main'
      }
    ];

    displayRiders.forEach((rider) => {
      const isLeader = rider.role === 'leader';
      const isMe = rider.id === currentRiderId || rider.name === 'You';
      const isTalking = Boolean(rider.isTalking);

      // Dead-Zone Ghosting
      const isGhost = rider.lastPing && now - rider.lastPing > 30000 && !isMe;
      const pingAgoSec = rider.lastPing ? Math.round((now - rider.lastPing) / 1000) : 0;

      const bodyColor = isGhost ? '#f59e0b' : rider.avatarColor || (isLeader ? '#ef4444' : isMe ? '#2563eb' : '#18191D');
      const beamColor = isGhost ? 'rgba(245, 158, 11, 0.35)' : isMe ? 'rgba(37, 99, 235, 0.45)' : 'rgba(239, 68, 68, 0.4)';

      const heading = Number.isFinite(rider.heading) ? rider.heading : 45;

      const talkingRipple = isTalking
        ? `<div class="absolute -inset-3 rounded-full border-2 border-red-500 animate-ping opacity-75"></div>`
        : '';

      const riderIcon = L.divIcon({
        className: 'custom-motorcycle-rider-marker',
        html: `
          <div class="relative flex flex-col items-center select-none cursor-pointer group" style="transform: translate(-50%, -50%);">
            
            <!-- Ground Shadow -->
            <div class="absolute w-8 h-12 bg-black/25 rounded-full blur-[2px] pointer-events-none"></div>

            <!-- Pulsing Accuracy Halo for current rider -->
            ${isMe ? `<div class="absolute w-14 h-14 rounded-full bg-blue-500/20 animate-ping pointer-events-none"></div>` : ''}
            ${talkingRipple}

            <!-- ROTATING MOTORCYCLE VEHICLE (REPLACES THE ARROW) -->
            <div
              class="relative w-12 h-14 flex items-center justify-center transition-transform duration-300 ease-out pointer-events-none"
              style="transform: rotate(${heading}deg); transform-origin: 24px 28px;"
            >
              <svg viewBox="0 0 48 56" class="w-12 h-14 overflow-visible" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
                <defs>
                  <!-- Forward Headlight Vision Cone Gradient -->
                  <linearGradient id="beam-${rider.id}" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="${beamColor}" stop-opacity="0.85" />
                    <stop offset="50%" stop-color="${beamColor}" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="${beamColor}" stop-opacity="0" />
                  </linearGradient>
                  <!-- Glossy Tank Highlight -->
                  <linearGradient id="tank-${rider.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
                    <stop offset="100%" stop-color="${bodyColor}" />
                  </linearGradient>
                </defs>

                <!-- 1. Headlight Beam Shining Forward onto Highway -->
                <polygon points="21,12 6,-18 42,-18 27,12" fill="url(#beam-${rider.id})" />

                <!-- 2. Front Tyre (Detailed Rubber) -->
                <rect x="22" y="2" width="4" height="13" rx="2" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />
                
                <!-- 3. Front Fender -->
                <rect x="21" y="6" width="6" height="4.5" rx="1.5" fill="${bodyColor}" />

                <!-- 4. Handlebars & Controls -->
                <path d="M12 16 L36 16" stroke="#27272a" stroke-width="2.8" stroke-linecap="round" />
                <!-- Left & Right Handgrips -->
                <circle cx="11" cy="16" r="1.8" fill="#09090b" stroke="#71717a" stroke-width="0.5" />
                <circle cx="37" cy="16" r="1.8" fill="#09090b" stroke="#71717a" stroke-width="0.5" />
                
                <!-- Aerodynamic Side Mirrors -->
                <line x1="14" y1="16" x2="10.5" y2="11.5" stroke="#52525b" stroke-width="1.6" stroke-linecap="round" />
                <ellipse cx="10" cy="11" rx="1.5" ry="1.2" fill="#38bdf8" />
                <line x1="34" y1="16" x2="37.5" y2="11.5" stroke="#52525b" stroke-width="1.6" stroke-linecap="round" />
                <ellipse cx="38" cy="11" rx="1.5" ry="1.2" fill="#38bdf8" />

                <!-- 5. Bright LED Motorcycle Headlight -->
                <circle cx="24" cy="9.5" r="3.2" fill="#fef08a" stroke="#eab308" stroke-width="1" />
                <circle cx="24" cy="9.5" r="1.6" fill="#ffffff" />

                <!-- 6. Motorcycle Chassis Frame & Fuel Tank -->
                <path d="M18.5 16 Q17 25 19.5 30 L28.5 30 Q31 25 29.5 16 Z" fill="${bodyColor}" stroke="#09090b" stroke-width="1.4" />
                <path d="M20 18 Q19 24 21.5 28 L26.5 28 Q29 24 28 18 Z" fill="url(#tank-${rider.id})" />

                <!-- 7. Rider Body / Leather Jacket -->
                <ellipse cx="24" cy="27" rx="7" ry="4.5" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />

                <!-- 8. Rider Full-Face Helmet with Visor -->
                <circle cx="24" cy="22.5" r="5.2" fill="#09090b" stroke="#ffffff" stroke-width="1.5" />
                <path d="M20.5 20 Q24 17.5 27.5 20" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" fill="none" />

                <!-- 9. Motorcycle Seat -->
                <rect x="20.5" y="30" width="7" height="9" rx="2.5" fill="#09090b" stroke="#27272a" stroke-width="0.8" />

                <!-- 10. Dual Exhaust Pipes -->
                <rect x="17.5" y="35" width="2" height="11" rx="1" fill="#71717a" />
                <rect x="28.5" y="35" width="2" height="11" rx="1" fill="#71717a" />

                <!-- 11. Rear Wheel -->
                <rect x="21.5" y="38" width="5" height="13" rx="2.5" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />

                <!-- 12. Glowing Red LED Tail Light / Brake Light -->
                <rect x="21" y="36.5" width="6" height="2" rx="1" fill="#ef4444" stroke="#991b1b" stroke-width="0.5" />
              </svg>
            </div>

            <!-- UNROTATED GOOGLE MAPS STYLE CALLSIGN & SPEED PILL (HORIZONTALLY READABLE) -->
            <div class="mt-1 bg-white/95 backdrop-blur-md text-gray-900 shadow-md border border-gray-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap pointer-events-auto">
              <span class="truncate max-w-[80px]">${rider.callsign || rider.name}</span>
              <span class="w-1 h-1 rounded-full bg-gray-300"></span>
              <span class="${isMe ? 'text-blue-600' : 'text-emerald-700'} font-extrabold font-mono">${rider.speed} km/h</span>
              ${isGhost ? `<span class="text-amber-600 font-bold">⚠️ ${pingAgoSec}s</span>` : ''}
            </div>

          </div>
        `,
        iconSize: [48, 64],
        iconAnchor: [24, 32]
      });

      const marker = L.marker([rider.lat, rider.lng], { icon: riderIcon });
      layer.addLayer(marker);
    });

    // Camera Auto-Follow (suppressed during the 2-second full route overview)
    if (isOverviewingRouteRef.current) {
      return;
    }

    if (cameraMode === 'convoy' && displayRiders.length > 0) {
      const bounds = L.latLngBounds(displayRiders.map(r => [r.lat, r.lng]));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true });
    } else if (cameraMode === 'leader') {
      const leader = displayRiders.find(r => r.role === 'leader') || displayRiders[0];
      if (leader) map.panTo([leader.lat, leader.lng], { animate: true });
    } else if (cameraMode === 'me') {
      const me = displayRiders.find(r => r.id === currentRiderId) || displayRiders[0];
      if (me) map.panTo([me.lat, me.lng], { animate: true });
    }
  }, [riders, currentRiderId, cameraMode, startPoint, activeRoutePath]);

  return (
    <div className="relative w-full h-full min-h-[300px] overflow-hidden bg-[#e5e7eb]">
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />

      {/* 2-Second Route Overview Notification Pill */}
      {isOverviewingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fadeIn">
          <div className="bg-black/85 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl border border-white/20 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-xs font-bold tracking-tight">
              Route Overview (2s) • Zooming to live location (2-5 km)...
            </span>
          </div>
        </div>
      )}

      {/* Floating Right Controls (Google Maps Recenter & Layer Switcher) */}
      <div className="absolute top-[max(5rem,calc(env(safe-area-inset-top,0px)+3.5rem))] right-[max(0.875rem,env(safe-area-inset-right,0.875rem))] z-20 flex flex-col items-center gap-2.5 pointer-events-auto">
        {/* 1. Google Maps Map Layer Toggle (Streets vs Satellite) */}
        <button
          onClick={() => setMapLayerMode(mapLayerMode === 'streets' ? 'satellite' : 'streets')}
          aria-label="Toggle map layer (Streets / Satellite)"
          className={`w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/80 flex items-center justify-center transition-all hover:bg-white active:scale-95 ${
            mapLayerMode === 'satellite' ? 'text-blue-600 ring-2 ring-blue-500' : 'text-gray-700'
          }`}
          title={`Layer: ${mapLayerMode === 'streets' ? 'Navigation Streets' : 'Satellite Terrain'}`}
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* 2. Recenter Camera Mode FAB */}
        <button
          onClick={() => {
            const nextMode: CameraMode = cameraMode === 'convoy' ? 'leader' : cameraMode === 'leader' ? 'me' : 'convoy';
            onSetCameraMode(nextMode);
          }}
          aria-label={`Switch camera mode (currently ${cameraMode})`}
          className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/80 flex flex-col items-center justify-center hover:bg-white active:scale-95 transition-all text-gray-800"
          title={`Camera Tracking: ${cameraMode.toUpperCase()} (Tap to switch)`}
        >
          {cameraMode === 'convoy' && <Crosshair className="w-4 h-4 text-blue-600" />}
          {cameraMode === 'leader' && <Crown className="w-4 h-4 text-amber-500" />}
          {cameraMode === 'me' && <Navigation className="w-4 h-4 text-red-600" />}
          <span className="text-[7.5px] font-black uppercase text-gray-900 leading-none mt-0.5">
            {cameraMode === 'convoy' ? 'PACK' : cameraMode === 'leader' ? 'LEAD' : 'ME'}
          </span>
        </button>
      </div>
    </div>
  );
};
