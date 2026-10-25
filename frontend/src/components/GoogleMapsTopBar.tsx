import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  Share2,
  Settings,
  Radio
} from 'lucide-react';
import { RideChannel, TrackingMode } from '../types';
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
  isLeader = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!ride) return;
    navigator.clipboard.writeText(ride.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0.75rem))] left-0 right-0 z-30 pointer-events-none select-none px-[max(0.875rem,env(safe-area-inset-left,0.875rem))] pr-[max(0.875rem,env(safe-area-inset-right,0.875rem))] flex flex-col items-center">
      {/* Neobrutalist Decluttered Top Bar */}
      <div className="w-full flex items-center justify-between space-x-2 pointer-events-auto">
        {/* Placeholder spacer for Turn Card on Left */}
        <div className="w-0 sm:w-64 md:w-72 shrink-0 pointer-events-none" />

        {/* Center: Search Box */}
        <div className="flex-1 max-w-sm flex justify-center">
          <RouteSearchBox
            onRouteSelected={onRouteSelected}
            currentGpsCoords={currentGpsCoords}
            activeRouteSummary={activeRouteSummary}
            isLeader={isLeader}
          />
        </div>

        {/* Right: Small, Visible Neobrutalist Settings Buttons */}
        <div className="flex items-center space-x-1 shrink-0 bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-lg p-1 text-black">
          {/* Ride Room Code */}
          {ride && (
            <button
              onClick={handleCopyCode}
              aria-label="Copy Convoy Room Code"
              className="px-2 py-0.5 rounded bg-[#2563eb] text-white border border-black font-mono text-[10px] font-black flex items-center space-x-1 shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              title="Copy Ride Room Code"
            >
              <span>{ride.code}</span>
              {copied ? <Check className="w-3 h-3 text-white" /> : <Share2 className="w-3 h-3 text-white" />}
            </button>
          )}

          {/* GPS / Simulation Toggle */}
          <button
            onClick={onToggleTrackingMode}
            aria-label="Toggle Live GPS Tracking Mode"
            className={`w-7 h-7 rounded flex items-center justify-center border border-black transition-all ${
              trackingMode === 'device_gps'
                ? 'bg-[#ef4444] text-white font-bold shadow-[1px_1px_0px_#000]'
                : 'bg-white hover:bg-slate-100 text-black'
            }`}
            title={trackingMode === 'device_gps' ? 'Live GPS Active' : 'Convoy Simulation Active'}
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          {/* Audio SFX Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Mute audio sound effects" : "Enable radio audio effects"}
            className={`w-7 h-7 rounded flex items-center justify-center border border-black transition-all ${
              soundEnabled
                ? 'bg-[#2563eb] text-white font-bold shadow-[1px_1px_0px_#000]'
                : 'bg-slate-100 text-slate-400'
            }`}
            title={soundEnabled ? 'Radio Audio: ON' : 'Audio: Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Screen Wake Lock */}
          <button
            onClick={onToggleWakeLock}
            aria-label="Toggle Handlebar Screen Wake Lock"
            className={`w-7 h-7 rounded flex items-center justify-center border border-black transition-all ${
              wakeLockActive
                ? 'bg-[#ef4444] text-white font-bold shadow-[1px_1px_0px_#000]'
                : 'bg-white hover:bg-slate-100 text-black'
            }`}
            title="Screen Wake Lock (Keep Handlebar Awake)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>

          {/* Settings & Lobby Modal */}
          <button
            onClick={onOpenRideModal}
            aria-label="Channel and Profile Settings"
            className="w-7 h-7 rounded bg-white hover:bg-blue-50 border border-black flex items-center justify-center text-black transition-colors"
            title="Channel & Profile Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
