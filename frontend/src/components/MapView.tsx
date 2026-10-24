import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Rider, Waypoint, TacticalAlert, CameraMode } from '../types';
import { MUMBAI_GOA_DETAILED_PATH } from '../services/simulationEngine';
import { Crosshair, Navigation, Compass, Layers, Sun, Moon, Globe } from 'lucide-react';

export type MapTheme = 'voyager' | 'dark' | 'satellite';

interface MapViewProps {
  riders: Rider[];
  waypoints: Waypoint[];
  alerts: TacticalAlert[];
  currentRiderId: string;
  cameraMode: CameraMode;
  onSetCameraMode: (mode: CameraMode) => void;
  onMapClickReportAlert?: (lat: number, lng: number) => void;
  activeRoutePath?: [number, number][];
  isRideActive?: boolean;
  startPoint?: { lat: number; lng: number } | null;
}

const TILE_LAYERS: Record<MapTheme, { url: string; subdomains?: string; maxZoom: number; attribution: string }> = {
  // Free public Carto Voyager — NO API KEY NEEDED
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CARTO'
  },
  // Free public Carto Dark Matter — NO API KEY NEEDED
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CARTO'
  },
  // Free public Esri World Imagery Satellite — NO API KEY NEEDED
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: '© Esri, Maxar, Earthstar Geographics'
  }
};

export const MapView: React.FC<MapViewProps> = ({
  riders,
  waypoints,
  alerts,
  currentRiderId,
  cameraMode,
  onSetCameraMode,
  onMapClickReportAlert,
  activeRoutePath,
  isRideActive,
  startPoint
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const ridersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const glowPolylineRef = useRef<L.Polyline | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>('voyager');

  // When Ride is Started: Switch to Satellite view and zoom in close on starting area
  useEffect(() => {
    if (isRideActive) {
      setMapTheme('satellite');

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

        map.flyTo([zoomLat, zoomLng], 16, { animate: true, duration: 1.8 });
      }
    }
  }, [isRideActive, startPoint]);

  const pathCoordinates = activeRoutePath && activeRoutePath.length > 1
    ? activeRoutePath
    : MUMBAI_GOA_DETAILED_PATH;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [18.2520, 73.2878];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Add Initial Tile Layer
    const tileConfig = TILE_LAYERS[mapTheme];
    const initialTileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc'
    }).addTo(map);
    activeTileLayerRef.current = initialTileLayer;

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    ridersLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);
    alertsLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      if (onMapClickReportAlert) {
        onMapClickReportAlert(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer when mapTheme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[mapTheme];
    const newTileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc'
    }).addTo(map);

    // Bring tile layer to back so polylines and markers stay on top
    newTileLayer.bringToBack();
    activeTileLayerRef.current = newTileLayer;

    // Update route polyline color to match theme
    if (routePolylineRef.current) {
      const coreColor = mapTheme === 'voyager' ? '#2563eb' : mapTheme === 'dark' ? '#38bdf8' : '#38bdf8';
      const glowColor = mapTheme === 'voyager' ? '#60a5fa' : mapTheme === 'dark' ? '#0284c7' : '#0369a1';
      routePolylineRef.current.setStyle({ color: coreColor });
      if (glowPolylineRef.current) {
        glowPolylineRef.current.setStyle({ color: glowColor });
      }
    }
  }, [mapTheme]);

  // Draw Highway Route Polyline (Glow + Neon Core)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
    if (glowPolylineRef.current) map.removeLayer(glowPolylineRef.current);

    const glowColor = mapTheme === 'voyager' ? '#60a5fa' : '#0284c7';
    const coreColor = mapTheme === 'voyager' ? '#2563eb' : '#38bdf8';

    const glowLine = L.polyline(pathCoordinates, {
      color: glowColor,
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const mainLine = L.polyline(pathCoordinates, {
      color: coreColor,
      weight: 4,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    glowPolylineRef.current = glowLine;
    routePolylineRef.current = mainLine;

    // If new custom route selected, fit bounds to show the entire route
    if (activeRoutePath && activeRoutePath.length > 1) {
      const bounds = L.latLngBounds(activeRoutePath);
      map.fitBounds(bounds, { padding: [80, 80], animate: true });
    }

    return () => {
      map.removeLayer(glowLine);
      map.removeLayer(mainLine);
    };
  }, [mapTheme, activeRoutePath]);

  // Update Waypoint Markers
  useEffect(() => {
    const layer = waypointsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    waypoints.forEach((wp) => {
      let icon = '📍';
      let ring = 'border-slate-500 bg-slate-900';

      if (wp.type === 'start') {
        icon = '🚩';
        ring = 'border-emerald-500 bg-emerald-600 text-white';
      } else if (wp.type === 'destination') {
        icon = '🏁';
        ring = 'border-amber-400 bg-amber-500 text-slate-950 font-black';
      } else if (wp.type === 'fuel') {
        icon = '⛽';
        ring = 'border-orange-500 bg-orange-600 text-white';
      } else if (wp.type === 'food') {
        icon = '☕';
        ring = 'border-amber-500 bg-amber-600 text-white';
      } else if (wp.type === 'regroup') {
        icon = '🔄';
        ring = 'border-blue-500 bg-blue-600 text-white';
      }

      const customIcon = L.divIcon({
        className: 'custom-wp-icon',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold border-2 ${ring} shadow-xl backdrop-blur-md transition-transform group-hover:scale-125">
              ${icon}
            </div>
            <div class="hidden group-hover:block absolute top-9 glass-panel text-slate-100 text-[11px] px-2.5 py-1 rounded-xl shadow-2xl whitespace-nowrap z-50 pointer-events-none">
              <span class="font-bold text-amber-400">${wp.name}</span>
              ${wp.description ? `<p class="text-[10px] text-slate-300">${wp.description}</p>` : ''}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });
      layer.addLayer(marker);
    });
  }, [waypoints]);

  // Update Tactical Alert Markers
  useEffect(() => {
    const layer = alertsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    alerts.filter(a => a.active).forEach((alert) => {
      let icon = '⚠️';
      if (alert.type === 'sos') icon = '🛑';
      else if (alert.type === 'police') icon = '🚨';
      else if (alert.type === 'fuel') icon = '⛽';
      else if (alert.type === 'regroup') icon = '🔄';

      const alertDivIcon = L.divIcon({
        className: 'custom-alert-icon',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
            <div class="absolute w-12 h-12 rounded-full bg-red-500/30 animate-ping"></div>
            <div class="w-9 h-9 rounded-2xl bg-slate-950/90 border-2 border-red-500 shadow-2xl flex items-center justify-center text-sm z-10 hover:scale-125 transition-transform">
              ${icon}
            </div>
            <div class="absolute -bottom-6 glass-panel border border-red-500/50 text-red-200 text-[10px] font-mono px-2 py-0.5 rounded-lg whitespace-nowrap shadow-xl">
              ${alert.title}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([alert.lat, alert.lng], { icon: alertDivIcon });
      layer.addLayer(marker);
    });
  }, [alerts]);

  // Update Dynamic Modern Rider Markers
  useEffect(() => {
    const layer = ridersLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    riders.forEach((rider) => {
      const isLeader = rider.role === 'leader';
      const isSweeper = rider.role === 'sweeper';
      const isMe = rider.id === currentRiderId;
      const isTalking = rider.isTalking;

      let borderClass = 'border-white/80 shadow-md';
      let roleIcon = '';
      if (isLeader) {
        borderClass = 'border-amber-400 ring-2 ring-amber-400/30';
        roleIcon = '<span class="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 px-0.5 rounded-full font-black">👑</span>';
      } else if (isSweeper) {
        borderClass = 'border-cyan-400 ring-2 ring-cyan-400/30';
        roleIcon = '<span class="absolute -top-1 -right-1 text-[8px] bg-cyan-500 text-slate-950 px-0.5 rounded-full font-black">🛡️</span>';
      } else if (isMe) {
        borderClass = 'border-emerald-400 ring-2 ring-emerald-400/40';
      }

      const talkingGlow = isTalking
        ? '<div class="absolute -inset-2.5 rounded-full bg-cyan-400/50 animate-ping"></div>'
        : '';

      const riderInitial = rider.callsign ? rider.callsign.charAt(0).toUpperCase() : 'R';

      const riderIcon = L.divIcon({
        className: 'custom-rider-icon',
        html: `
          <div class="relative flex flex-col items-center select-none cursor-pointer group" style="transform: translate(-50%, -50%);">
            <!-- Google Maps Directional Arrow -->
            <div
              class="absolute w-10 h-10 flex items-center justify-center transition-transform duration-300 ease-out pointer-events-none"
              style="transform: rotate(${rider.heading}deg);"
            >
              <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-cyan-400 absolute -top-1.5 filter drop-shadow"></div>
            </div>

            <!-- Authentic Google Maps Clean Location Puck -->
            <div class="relative flex items-center justify-center">
              ${talkingGlow}
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-xl border-2 ${borderClass} transition-transform group-hover:scale-125"
                style="background-color: ${rider.avatarColor}; color: #0a0d14;"
              >
                ${riderInitial}
              </div>
              ${roleIcon}
            </div>

            <!-- Crisp Callsign & Speed Micro-Label -->
            <div class="mt-1 bg-slate-950/85 backdrop-blur-md border border-white/15 px-1.5 py-0.5 rounded-md shadow-lg text-[9px] font-mono flex items-center space-x-1 whitespace-nowrap">
              <span class="font-bold" style="color: ${rider.avatarColor}">${rider.callsign.split(' ')[0]}</span>
              <span class="text-white/30">•</span>
              <span class="text-slate-300 font-semibold">${rider.speed}k</span>
            </div>
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([rider.lat, rider.lng], { icon: riderIcon });
      layer.addLayer(marker);
    });

    // Camera Auto-Follow
    if (cameraMode === 'convoy' && riders.length > 0) {
      const bounds = L.latLngBounds(riders.map(r => [r.lat, r.lng]));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14, animate: true });
    } else if (cameraMode === 'leader') {
      const leader = riders.find(r => r.role === 'leader');
      if (leader) map.panTo([leader.lat, leader.lng], { animate: true });
    } else if (cameraMode === 'me') {
      const me = riders.find(r => r.id === currentRiderId);
      if (me) map.panTo([me.lat, me.lng], { animate: true });
    }
  }, [riders, currentRiderId, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Right FAB Action Stack (Google Maps Style: Layer & Recenter) */}
      <div className="absolute right-4 top-20 z-20 flex flex-col items-center space-y-2 pointer-events-auto">
        {/* Layer Switcher (Cycles Voyager -> Dark -> Satellite) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-xl flex flex-col space-y-1">
          <button
            onClick={() => {
              const nextTheme: MapTheme = mapTheme === 'voyager' ? 'dark' : mapTheme === 'dark' ? 'satellite' : 'voyager';
              setMapTheme(nextTheme);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-all"
            title={`Map Layer: ${mapTheme.toUpperCase()} (Click to switch)`}
          >
            {mapTheme === 'voyager' && <Sun className="w-4 h-4 text-amber-400" />}
            {mapTheme === 'dark' && <Moon className="w-4 h-4 text-cyan-400" />}
            {mapTheme === 'satellite' && <Globe className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Camera Recenter FAB (Cycles Convoy -> Lead -> Me) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-xl flex flex-col space-y-1">
          <button
            onClick={() => {
              const nextMode: CameraMode = cameraMode === 'convoy' ? 'leader' : cameraMode === 'leader' ? 'me' : 'convoy';
              onSetCameraMode(nextMode);
            }}
            className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-all relative"
            title={`Camera: ${cameraMode.toUpperCase()} (Click to switch)`}
          >
            {cameraMode === 'convoy' && <Crosshair className="w-4 h-4 text-cyan-400" />}
            {cameraMode === 'leader' && <span className="text-xs">👑</span>}
            {cameraMode === 'me' && <Navigation className="w-4 h-4 text-emerald-400" />}
            <span className="text-[8px] font-black font-mono uppercase tracking-tighter text-slate-400 leading-none mt-0.5">
              {cameraMode === 'convoy' ? 'PACK' : cameraMode === 'leader' ? 'LEAD' : 'ME'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
