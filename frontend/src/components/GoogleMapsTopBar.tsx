import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  Share2,
  Settings,
  Radio,
  Sliders,
  AlertTriangle,
  X
} from 'lucide-react';
import { RideChannel, TrackingMode, TacticalAlert } from '../types';
import { RouteSearchBox } from './RouteSearchBox';

interface GoogleMapsTopBarProps {
  ride: RideChannel | null;
  trackingMode: TrackingMode;
  onToggleTrackingMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  wakeLockActive: boolean;
  onToggleWakeLock: () => void;
  onOpenRideModal: () => void;
  onRouteSelected: (
    start: { name: string; lat: number; lng: number },
    dest: { name: string; lat: number; lng: number }
  ) => void;
  currentGpsCoords?: { lat: number; lng: number } | null;
  activeRouteSummary?: string;
  isLeader?: boolean;
  alerts: TacticalAlert[];
  onDismissAlert: (id: string) => void;
}

export const GoogleMapsTopBar: React.FC<GoogleMapsTopBarProps> = ({
  ride,
  trackingMode,
  onToggleTrackingMode,
  soundEnabled,
  onToggleSound,
  wakeLockActive,
  onToggleWakeLock,
  onOpenRideModal,
  onRouteSelected,
  currentGpsCoords,
  activeRouteSummary,
  isLeader = true,
  alerts,
  onDismissAlert
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!ride) return;
    navigator.clipboard.writeText(ride.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeAlerts = alerts.filter((a) => a.active);

  return (
    <div className="absolute top-4 left-0 right-0 z-30 pointer-events-none select-none px-4 flex flex-col items-center">
      {/* Google Maps Style Clean Top Bar */}
      <div className="w-full flex items-center justify-between space-x-3 pointer-events-auto">
        {/* Placeholder / Spacer for Turn Card on Left */}
        <div className="w-0 sm:w-80 shrink-0 pointer-events-none" />

        {/* Center: Google Maps Search Pill */}
        <div className="flex-1 max-w-sm flex justify-center">
          <RouteSearchBox
            onRouteSelected={onRouteSelected}
            currentGpsCoords={currentGpsCoords}
            activeRouteSummary={activeRouteSummary}
            isLeader={isLeader}
          />
        </div>

        {/* Right: Quick Settings Pill */}
        <div className="flex items-center space-x-1.5 shrink-0 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-xl text-slate-200">
          {/* Ride Room Code */}
          {ride && (
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold flex items-center space-x-1 transition-all"
              title="Copy Ride Channel Code"
            >
              <span>{ride.code}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-amber-400" />}
            </button>
          )}

          {/* GPS / Simulation Toggle */}
          <button
            onClick={onToggleTrackingMode}
            className={`p-1.5 rounded-xl transition-all ${
              trackingMode === 'device_gps'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={trackingMode === 'device_gps' ? 'Mode: Live Device GPS' : 'Mode: Convoy Simulator'}
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Audio SFX Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-xl transition-all ${
              soundEnabled ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Radio Squelch Audio: ON' : 'Audio: Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Screen Wake Lock */}
          <button
            onClick={onToggleWakeLock}
            className={`p-1.5 rounded-xl transition-all ${
              wakeLockActive
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Keep Handlebar Screen Awake"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Ride Lobby & Profile Settings */}
          <button
            onClick={onOpenRideModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Ride Channel & Profile Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Waze-style Active Alert Pill (if any alert is active) */}
      {activeAlerts.length > 0 && (
        <div className="mt-2 pointer-events-auto flex flex-col items-center space-y-1 animate-fadeIn">
          {activeAlerts.slice(0, 1).map((alert) => (
            <div
              key={alert.id}
              className="bg-red-950/90 border border-red-500/50 text-red-100 rounded-full px-4 py-1.5 shadow-2xl flex items-center space-x-2 text-xs backdrop-blur-md"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
              <span className="font-bold text-red-200">{alert.title}:</span>
              <span className="text-red-300 font-mono text-[11px] truncate max-w-xs">{alert.detail}</span>
              <button
                onClick={() => onDismissAlert(alert.id)}
                className="ml-2 p-0.5 rounded-full hover:bg-white/20 text-red-300 transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
