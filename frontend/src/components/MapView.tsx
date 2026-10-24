import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rider, Waypoint, TacticalAlert, CameraMode } from '../types';
import { MUMBAI_GOA_DETAILED_PATH } from '../services/simulationEngine';
import { Crosshair, Eye, Navigation } from 'lucide-react';

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

    // Default center near Mangaon on NH 66
    const initialCenter: [number, number] = [18.2520, 73.2878];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Dark Tactical Tile Layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer groups for dynamic updates
    ridersLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);
    alertsLayerGroupRef.current = L.layerGroup().addTo(map);

    // Click handler for reporting hazard on map
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

  // Draw Mumbai to Goa Highway Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
    }

    // Glow underlayer
    const glowLine = L.polyline(MUMBAI_GOA_DETAILED_PATH, {
      color: '#0284c7',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Core route polyline (Amber / Neon Cyan)
    const mainLine = L.polyline(MUMBAI_GOA_DETAILED_PATH, {
      color: '#38bdf8',
      weight: 3.5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '8, 8'
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
      let iconHtml = '📍';
      let bgColor = 'bg-slate-800 text-slate-200 border-slate-600';

      if (wp.type === 'start') {
        iconHtml = '🚩';
        bgColor = 'bg-emerald-600 text-white border-emerald-400';
      } else if (wp.type === 'destination') {
        iconHtml = '🏁';
        bgColor = 'bg-amber-500 text-slate-950 font-black border-amber-300';
      } else if (wp.type === 'fuel') {
        iconHtml = '⛽';
        bgColor = 'bg-orange-600 text-white border-orange-400';
      } else if (wp.type === 'food') {
        iconHtml = '☕';
        bgColor = 'bg-amber-600 text-white border-amber-400';
      } else if (wp.type === 'regroup') {
        iconHtml = '🔄';
        bgColor = 'bg-blue-600 text-white border-blue-400';
      } else if (wp.type === 'scenic') {
        iconHtml = '🏔️';
        bgColor = 'bg-indigo-600 text-white border-indigo-400';
      }

      const customIcon = L.divIcon({
        className: 'custom-wp-icon',
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-lg ${bgColor} transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform">
              ${iconHtml}
            </div>
            <div class="hidden group-hover:block absolute top-6 bg-slate-900/95 border border-slate-700 text-slate-200 text-[11px] font-sans px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
              <span class="font-bold text-amber-400">${wp.name}</span>
              ${wp.description ? `<p class="text-[10px] text-slate-400">${wp.description}</p>` : ''}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; color: #1e293b; padding: 4px;">
          <strong style="color: #0f172a; font-size: 14px;">${wp.name}</strong>
          <p style="margin: 4px 0; color: #475569;">${wp.description || ''}</p>
          <span style="display: inline-block; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
            ${wp.type}
          </span>
        </div>
      `);
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
      let ringColor = 'border-amber-500 bg-amber-500/20';

      if (alert.type === 'sos') {
        icon = '🛑';
        ringColor = 'border-red-500 bg-red-500/30';
      } else if (alert.type === 'police') {
        icon = '🚨';
        ringColor = 'border-blue-500 bg-blue-500/30';
      } else if (alert.type === 'fuel') {
        icon = '⛽';
        ringColor = 'border-orange-500 bg-orange-500/20';
      } else if (alert.type === 'regroup') {
        icon = '🔄';
        ringColor = 'border-cyan-500 bg-cyan-500/20';
      }

      const alertDivIcon = L.divIcon({
        className: 'custom-alert-icon',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute w-12 h-12 rounded-full border-2 ${ringColor} animate-ping opacity-75"></div>
            <div class="w-8 h-8 rounded-full bg-slate-900 border-2 border-red-500 shadow-xl flex items-center justify-center text-sm z-10 cursor-pointer transform hover:scale-125 transition-transform">
              ${icon}
            </div>
            <div class="absolute -bottom-6 bg-red-950/90 border border-red-500/60 text-red-200 text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg">
              ${alert.title}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([alert.lat, alert.lng], { icon: alertDivIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; color: #1e293b; padding: 4px;">
          <strong style="color: #dc2626; font-size: 14px;">⚠️ ${alert.title}</strong>
          <p style="margin: 4px 0; color: #475569;">${alert.detail || 'Caution advised on this stretch.'}</p>
          <small style="color: #64748b;">Reported by: ${alert.creatorName}</small>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [alerts]);

  // Update Dynamic Rider Markers & Camera Tracking
  useEffect(() => {
    const layer = ridersLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    riders.forEach((rider) => {
      const isLeader = rider.role === 'leader';
      const isSweeper = rider.role === 'sweeper';
      const isScout = rider.role === 'scout';
      const isMe = rider.id === currentRiderId;
      const isTalking = rider.isTalking;

      let roleBadge = '';
      if (isLeader) roleBadge = '<span class="text-[10px] absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-950 px-1 rounded-full font-black">👑</span>';
      else if (isSweeper) roleBadge = '<span class="text-[10px] absolute -top-1.5 -left-1.5 bg-cyan-500 text-slate-950 px-1 rounded-full font-black">🛡️</span>';
      else if (isScout) roleBadge = '<span class="text-[10px] absolute -top-1.5 -left-1.5 bg-purple-500 text-white px-1 rounded-full font-black">⚡</span>';

      const talkingRipple = isTalking
        ? `<div class="absolute -inset-3 rounded-full border-2 border-red-500 animate-ping opacity-90"></div>
           <div class="absolute -inset-1.5 rounded-full border border-red-400 animate-pulse"></div>`
        : '';

      const meHighlight = isMe
        ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950'
        : '';

      const riderIcon = L.divIcon({
        className: 'custom-rider-icon',
        html: `
          <div class="relative flex flex-col items-center select-none cursor-pointer group" style="transform: translate(-50%, -50%);">
            <!-- Rider Callsign & Speed Badge -->
            <div class="mb-1 flex items-center space-x-1 bg-slate-950/90 border border-slate-700/80 px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap text-[10px] font-mono">
              <span class="font-bold" style="color: ${rider.avatarColor}">${rider.callsign}</span>
              <span class="text-slate-400">|</span>
              <span class="text-amber-400 font-semibold">${rider.speed} km/h</span>
            </div>

            <!-- Direction Pointer & Bike Avatar -->
            <div class="relative flex items-center justify-center">
              ${talkingRipple}
              ${roleBadge}

              <!-- Direction Arrow Pointer -->
              <div
                class="absolute w-10 h-10 flex items-center justify-center transition-transform duration-500 ease-out pointer-events-none"
                style="transform: rotate(${rider.heading}deg);"
              >
                <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-amber-400 absolute -top-1.5 filter drop-shadow"></div>
              </div>

              <!-- Rider Circular Icon -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xl transition-transform transform group-hover:scale-125 ${meHighlight}"
                style="background-color: ${rider.avatarColor}; color: #0b0f19; box-shadow: 0 0 16px ${rider.avatarColor}80;"
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
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; color: #0f172a; padding: 4px; min-width: 170px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: ${rider.avatarColor}; font-size: 14px;">${rider.callsign}</strong>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">
              ${rider.role}
            </span>
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">
            ${rider.name} • <em>${rider.bikeModel}</em>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div><strong>Speed:</strong> ${rider.speed} km/h</div>
            <div><strong>Battery:</strong> ${rider.battery}%</div>
            <div><strong>Heading:</strong> ${rider.heading}°</div>
            <div><strong>From Lead:</strong> ${rider.distanceFromLeader}m</div>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });

    // Auto-Camera Positioning based on selected camera mode
    if (cameraMode === 'convoy' && riders.length > 0) {
      const bounds = L.latLngBounds(riders.map(r => [r.lat, r.lng]));
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14, animate: true });
    } else if (cameraMode === 'leader') {
      const leader = riders.find(r => r.role === 'leader');
      if (leader) {
        map.panTo([leader.lat, leader.lng], { animate: true });
      }
    } else if (cameraMode === 'me') {
      const me = riders.find(r => r.id === currentRiderId);
      if (me) {
        map.panTo([me.lat, me.lng], { animate: true });
      }
    }
  }, [riders, currentRiderId, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Camera Mode Selector Floating Bar (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-2xl space-x-1">
        <button
          onClick={() => onSetCameraMode('convoy')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            cameraMode === 'convoy'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Fit All Convoy Riders on Screen"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Convoy</span>
        </button>

        <button
          onClick={() => onSetCameraMode('leader')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            cameraMode === 'leader'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Follow Ride Leader"
        >
          <span>👑 Leader</span>
        </button>

        <button
          onClick={() => onSetCameraMode('me')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            cameraMode === 'me'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Center on My Bike"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Me</span>
        </button>

        <button
          onClick={() => onSetCameraMode('free')}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            cameraMode === 'free'
              ? 'bg-slate-800 text-slate-200 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Free Pan / Zoom"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Highway Label Badge (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/90 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 shadow-xl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="text-amber-400 font-bold">NH 66</span>
        <span className="text-slate-500">|</span>
        <span>Mumbai ➔ Goa Highway (550 km)</span>
      </div>
    </div>
  );
};
