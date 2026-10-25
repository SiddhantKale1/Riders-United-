import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rider, Waypoint, TacticalAlert, CameraMode } from '../types';
import { Crosshair, Navigation, Crown, AlertTriangle } from 'lucide-react';

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

// Strictly Satellite View Only — Esri World Imagery (High-Res Photorealistic Satellite)
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_MAX_ZOOM = 19;
const SATELLITE_ATTRIBUTION = '© Esri, Maxar, Earthstar Geographics';

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

  // When Ride is Started: Zoom in close on starting area in Satellite view
  useEffect(() => {
    if (isRideActive) {
      const map = mapInstanceRef.current;
      if (map) {
        let zoomLat = 18.9220;
        let zoomLng = 72.8347;

        if (startPoint) {
          zoomLat = startPoint.lat;
          zoomLng = startPoint.lng;
        } else if (activeRoutePath && activeRoutePath.length > 0) {
          zoomLat = activeRoutePath[0][0];
          zoomLng = activeRoutePath[0][1];
        } else if (riders.length > 0) {
          const leader = riders.find(r => r.role === 'leader') || riders[0];
          zoomLat = leader.lat;
          zoomLng = leader.lng;
        }

        map.flyTo([zoomLat, zoomLng], 16, { animate: true, duration: 1.6 });
      }
    }
  }, [isRideActive, startPoint]);

  const pathCoordinates = activeRoutePath && activeRoutePath.length > 1
    ? activeRoutePath
    : [];

  // Initialize Map with Satellite Layer ONLY
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [18.2520, 73.2878];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Pure Satellite Tile Layer
    const satLayer = L.tileLayer(SATELLITE_TILE_URL, {
      maxZoom: SATELLITE_MAX_ZOOM,
      attribution: SATELLITE_ATTRIBUTION
    }).addTo(map);
    satLayer.bringToBack();

    // Zoom control at bottom right (Neobrutalism styled via CSS)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    ridersLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);
    alertsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Draw Highway Route Polyline (Neobrutalist High-Contrast Blue with Black Casing)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
    if (casingPolylineRef.current) map.removeLayer(casingPolylineRef.current);

    const blackCasing = L.polyline(pathCoordinates, {
      color: '#000000',
      weight: 8,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const blueLine = L.polyline(pathCoordinates, {
      color: '#2563eb',
      weight: 4.5,
      opacity: 1.0,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    casingPolylineRef.current = blackCasing;
    routePolylineRef.current = blueLine;

    if (activeRoutePath && activeRoutePath.length > 1) {
      const bounds = L.latLngBounds(activeRoutePath);
      map.fitBounds(bounds, { padding: [70, 70], animate: true });
    }

    return () => {
      map.removeLayer(blackCasing);
      map.removeLayer(blueLine);
    };
  }, [activeRoutePath]);

  // Update Tactical Alert Markers (Hazard Radar)
  useEffect(() => {
    const layer = alertsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    alerts.forEach((alert) => {
      let iconText = '⚠️';
      let bgColor = 'bg-amber-400 text-black';

      if (alert.type === 'sos') {
        iconText = '🚨';
        bgColor = 'bg-red-600 text-white animate-bounce';
      } else if (alert.type === 'police') {
        iconText = '👮';
        bgColor = 'bg-blue-600 text-white';
      } else if (alert.type === 'fuel') {
        iconText = '⛽';
        bgColor = 'bg-orange-500 text-white';
      } else if (alert.type === 'breakdown') {
        iconText = '🔧';
        bgColor = 'bg-purple-600 text-white';
      }

      const alertIcon = L.divIcon({
        className: 'custom-alert-marker',
        html: `
          <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
            <div class="px-2 py-1 rounded-xl text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] ${bgColor} flex items-center gap-1">
              <span>${iconText}</span>
              <span class="text-[9px] uppercase font-bold tracking-tight">${alert.title.split(' ')[0]}</span>
            </div>
            <div class="hidden group-hover:block absolute top-7 bg-black text-white border border-white/40 text-[9px] font-mono px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
              ${alert.detail} (${alert.creatorName})
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([alert.lat, alert.lng], { icon: alertIcon });
      layer.addLayer(marker);
    });
  }, [alerts]);

  // Update Waypoint Markers (Neobrutal Red & Blue Badges)
  useEffect(() => {
    const layer = waypointsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    waypoints.forEach((wp) => {
      let icon = 'WP';
      let bgClass = 'bg-white text-black';

      if (wp.type === 'start') {
        icon = 'A';
        bgClass = 'bg-[#2563eb] text-white';
      } else if (wp.type === 'destination') {
        icon = 'B';
        bgClass = 'bg-[#ef4444] text-white';
      } else if (wp.type === 'fuel') {
        icon = 'FUEL';
        bgClass = 'bg-amber-400 text-black';
      } else if (wp.type === 'food') {
        icon = 'PIT';
        bgClass = 'bg-white text-black';
      } else if (wp.type === 'regroup') {
        icon = 'STOP';
        bgClass = 'bg-[#2563eb] text-white';
      }

      const customIcon = L.divIcon({
        className: 'custom-wp-icon',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="px-1.5 h-6 rounded-md flex items-center justify-center text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_#000] ${bgClass} transition-transform group-hover:scale-110">
              ${icon}
            </div>
            <div class="hidden group-hover:block absolute top-8 bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-50 pointer-events-none">
              <span>${wp.name}</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });
      layer.addLayer(marker);
    });
  }, [waypoints]);

  // Update Rider Markers with Dead-Zone Ghosting
  useEffect(() => {
    const layer = ridersLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    const now = Date.now();

    riders.forEach((rider) => {
      const isLeader = rider.role === 'leader';
      const isMe = rider.id === currentRiderId;
      const isTalking = rider.isTalking;

      // Dead-Zone Ghosting: If rider has not pinged in > 30 seconds
      const isGhost = rider.lastPing && now - rider.lastPing > 30000 && !isMe;
      const pingAgoSec = rider.lastPing ? Math.round((now - rider.lastPing) / 1000) : 0;

      const puckBg = isGhost ? '#f97316' : isLeader ? '#ef4444' : isMe ? '#2563eb' : '#ffffff';
      const puckText = (isLeader || isMe || isGhost) ? '#ffffff' : '#000000';
      const puckOpacity = isGhost ? 'opacity-75' : 'opacity-100';

      const roleTag = isLeader
        ? '<span class="absolute -top-1.5 -right-1.5 text-[7px] bg-yellow-400 text-black border border-black rounded px-0.5 font-black">LEAD</span>'
        : isGhost
        ? '<span class="absolute -top-1.5 -right-1.5 text-[7px] bg-red-600 text-white border border-black rounded px-0.5 font-black animate-pulse">!</span>'
        : '';

      const talkingGlow = isTalking
        ? '<div class="absolute -inset-2 rounded-full bg-red-500/60 animate-ping"></div>'
        : '';

      const riderInitial = rider.callsign ? rider.callsign.charAt(0).toUpperCase() : 'R';

      const tagBadge = isGhost
        ? `<span class="text-amber-500 font-mono font-bold">${pingAgoSec}s GHOST</span>`
        : `<span class="${isLeader ? 'text-red-600' : 'text-blue-600'}">${rider.speed}k</span>`;

      const riderIcon = L.divIcon({
        className: 'custom-rider-icon',
        html: `
          <div class="relative flex flex-col items-center select-none cursor-pointer group ${puckOpacity}" style="transform: translate(-50%, -50%);">
            <!-- Heading Pointer Arrow -->
            <div
              class="absolute w-8 h-8 flex items-center justify-center pointer-events-none"
              style="transform: rotate(${rider.heading}deg);"
            >
              <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] ${isGhost ? 'border-b-amber-500' : 'border-b-blue-500'} absolute -top-1.5"></div>
            </div>

            <!-- Neobrutalist Rider Puck -->
            <div class="relative flex items-center justify-center">
              ${talkingGlow}
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_#000] transition-transform group-hover:scale-110"
                style="background-color: ${puckBg}; color: ${puckText};"
              >
                ${riderInitial}
              </div>
              ${roleTag}
            </div>

            <!-- Crisp Small Callsign Tag -->
            <div class="mt-1 bg-white text-black border border-black shadow-[1px_1px_0px_#000] px-1.5 py-0.2 rounded text-[8px] font-black flex items-center space-x-1 whitespace-nowrap">
              <span>${rider.callsign.split(' ')[0]}</span>
              <span class="text-slate-400">•</span>
              ${tagBadge}
            </div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([rider.lat, rider.lng], { icon: riderIcon });
      layer.addLayer(marker);
    });

    // Camera Auto-Follow
    if (cameraMode === 'convoy' && riders.length > 0) {
      const bounds = L.latLngBounds(riders.map(r => [r.lat, r.lng]));
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14, animate: true });
    } else if (cameraMode === 'leader') {
      const leader = riders.find(r => r.role === 'leader');
      if (leader) map.panTo([leader.lat, leader.lng], { animate: true });
    } else if (cameraMode === 'me') {
      const me = riders.find(r => r.id === currentRiderId);
      if (me) map.panTo([me.lat, me.lng], { animate: true });
    }
  }, [riders, currentRiderId, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0f19]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Right Action: Recenter Mode FAB */}
      <div className="absolute top-[max(4.5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] right-[max(0.875rem,env(safe-area-inset-right,0.875rem))] z-20 flex flex-col items-center pointer-events-auto">
        <button
          onClick={() => {
            const nextMode: CameraMode = cameraMode === 'convoy' ? 'leader' : cameraMode === 'leader' ? 'me' : 'convoy';
            onSetCameraMode(nextMode);
          }}
          aria-label={`Switch camera tracking mode (currently ${cameraMode})`}
          className="w-9 h-9 rounded-lg bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex flex-col items-center justify-center hover:bg-slate-100 transition-all"
          title={`Camera: ${cameraMode.toUpperCase()} (Click to toggle)`}
        >
          {cameraMode === 'convoy' && <Crosshair className="w-4 h-4 text-blue-600" />}
          {cameraMode === 'leader' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
          {cameraMode === 'me' && <Navigation className="w-3.5 h-3.5 text-red-600" />}
          <span className="text-[7px] font-black uppercase text-black leading-none mt-0.5">
            {cameraMode === 'convoy' ? 'PACK' : cameraMode === 'leader' ? 'LEAD' : 'ME'}
          </span>
        </button>
      </div>
    </div>
  );
};
