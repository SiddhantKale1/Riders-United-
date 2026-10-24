import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rider, Waypoint, TacticalAlert, CameraMode } from '../types';
import { MUMBAI_GOA_DETAILED_PATH } from '../services/simulationEngine';
import { Crosshair, Navigation, Compass } from 'lucide-react';

interface MapViewProps {
  riders: Rider[];
  waypoints: Waypoint[];
  alerts: TacticalAlert[];
  currentRiderId: string;
  cameraMode: CameraMode;
  onSetCameraMode: (mode: CameraMode) => void;
  onMapClickReportAlert?: (lat: number, lng: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  riders,
  waypoints,
  alerts,
  currentRiderId,
  cameraMode,
  onSetCameraMode,
  onMapClickReportAlert
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const ridersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

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

    // Dark Tactical / CarPlay Tile Layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

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

  // Draw Highway Route Polyline (Glow + Neon Core)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
    }

    const glowLine = L.polyline(MUMBAI_GOA_DETAILED_PATH, {
      color: '#0284c7',
      weight: 8,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const mainLine = L.polyline(MUMBAI_GOA_DETAILED_PATH, {
      color: '#38bdf8',
      weight: 3.5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    routePolylineRef.current = mainLine;

    return () => {
      map.removeLayer(glowLine);
      map.removeLayer(mainLine);
    };
  }, []);

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
        ring = 'border-emerald-400 bg-emerald-950/80 text-emerald-400';
      } else if (wp.type === 'destination') {
        icon = '🏁';
        ring = 'border-amber-400 bg-amber-950/80 text-amber-400';
      } else if (wp.type === 'fuel') {
        icon = '⛽';
        ring = 'border-orange-400 bg-orange-950/80 text-orange-400';
      } else if (wp.type === 'food') {
        icon = '☕';
        ring = 'border-amber-300 bg-amber-950/80 text-amber-300';
      } else if (wp.type === 'regroup') {
        icon = '🔄';
        ring = 'border-blue-400 bg-blue-950/80 text-blue-400';
      }

      const customIcon = L.divIcon({
        className: 'custom-wp-icon',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold border ${ring} shadow-xl backdrop-blur-md transition-transform group-hover:scale-125">
              ${icon}
            </div>
            <div class="hidden group-hover:block absolute top-9 glass-panel text-slate-100 text-[11px] px-2.5 py-1 rounded-xl shadow-2xl whitespace-nowrap z-50 pointer-events-none">
              <span class="font-bold text-amber-400">${wp.name}</span>
              ${wp.description ? `<p class="text-[10px] text-slate-400">${wp.description}</p>` : ''}
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

      let roleBadge = '';
      if (isLeader) roleBadge = '<span class="absolute -top-1.5 -left-1.5 text-[9px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded-full font-black">👑</span>';
      else if (isSweeper) roleBadge = '<span class="absolute -top-1.5 -left-1.5 text-[9px] bg-cyan-500 text-slate-950 px-1 py-0.2 rounded-full font-black">🛡️</span>';

      const talkingGlow = isTalking
        ? '<div class="absolute -inset-2 rounded-full bg-red-500/40 animate-ping"></div>'
        : '';

      const meRing = isMe
        ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950'
        : '';

      const riderIcon = L.divIcon({
        className: 'custom-rider-icon',
        html: `
          <div class="relative flex flex-col items-center select-none cursor-pointer group" style="transform: translate(-50%, -50%);">
            <!-- Modern Sleek Pill: Callsign & Speed -->
            <div class="mb-1 glass-pill px-2 py-0.5 rounded-full shadow-2xl whitespace-nowrap text-[10px] font-mono flex items-center space-x-1.5">
              <span class="font-bold" style="color: ${rider.avatarColor}">${rider.callsign}</span>
              <span class="text-white/20">•</span>
              <span class="text-slate-300 font-semibold">${rider.speed} km/h</span>
            </div>

            <!-- Motorcycle Avatar with Heading Arrow -->
            <div class="relative flex items-center justify-center">
              ${talkingGlow}
              ${roleBadge}

              <!-- Heading Direction Arrow -->
              <div
                class="absolute w-11 h-11 flex items-center justify-center transition-transform duration-500 ease-out pointer-events-none"
                style="transform: rotate(${rider.heading}deg);"
              >
                <div class="w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-b-[8px] border-b-amber-400 absolute -top-1.5 filter drop-shadow"></div>
              </div>

              <!-- Sleek Rounded Avatar -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xl transition-transform group-hover:scale-125 ${meRing}"
                style="background-color: ${rider.avatarColor}; color: #07090e; box-shadow: 0 0 20px ${rider.avatarColor}90;"
              >
                🏍️
              </div>
            </div>
          </div>
        `,
        iconSize: [36, 48],
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

      {/* Modern Floating Camera Mode Capsule (Top Left) */}
      <div className="absolute top-20 left-4 z-20 flex items-center glass-pill rounded-2xl p-1 shadow-2xl space-x-1">
        <button
          onClick={() => onSetCameraMode('convoy')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            cameraMode === 'convoy'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Fit All Convoy Riders"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Convoy</span>
        </button>

        <button
          onClick={() => onSetCameraMode('leader')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            cameraMode === 'leader'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Follow Leader"
        >
          <span>👑 Lead</span>
        </button>

        <button
          onClick={() => onSetCameraMode('me')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            cameraMode === 'me'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Center on My Bike"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Me</span>
        </button>
      </div>

      {/* Highway Label (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center space-x-2 glass-pill rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300">
        <Compass className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-amber-400 font-bold">NH 66</span>
        <span className="text-white/20">|</span>
        <span>Mumbai ➔ Goa Highway (550 km)</span>
      </div>
    </div>
  );
};
