import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  Share2,
  Settings,
  Radio,
  Sun,
  Moon
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
      {/* Google Maps Top Bar Controls */}
      <div className="w-full flex items-center justify-between gap-3 pointer-events-auto">
        {/* Placeholder spacer for Turn Card on Left */}
        <div className="w-0 sm:w-72 md:w-80 shrink-0 pointer-events-none" />

        {/* Center: Search Route Box */}
        <div className="flex-1 max-w-sm flex justify-center">
          <RouteSearchBox
            onRouteSelected={onRouteSelected}
            currentGpsCoords={currentGpsCoords}
            activeRouteSummary={activeRouteSummary}
            isLeader={isLeader}
          />
        </div>

        {/* Right: Floating Google Maps Style Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ride Room Code Pill */}
          {ride && (
            <button
              onClick={handleCopyCode}
              aria-label="Copy Convoy Room Code"
              className="px-3 py-2 rounded-full bg-white/95 backdrop-blur-md text-gray-900 border border-gray-200/80 shadow-md font-mono text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 active:scale-95 transition-all"
              title="Copy Ride Room Code"
            >
              <span>{ride.code}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle Navigation SFX Sound"
            className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md text-gray-700 border border-gray-200/80 shadow-md flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
            title={soundEnabled ? 'Audio SFX Enabled' : 'Audio SFX Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-gray-900" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>

          {/* Screen WakeLock Toggle */}
          <button
            onClick={onToggleWakeLock}
            aria-label="Toggle Phone Screen Always On (WakeLock)"
            className={`w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md flex items-center justify-center active:scale-95 transition-all ${
              wakeLockActive ? 'text-amber-500' : 'text-gray-400'
            }`}
            title={wakeLockActive ? 'Screen Always Awake (Handlebar Mode)' : 'Normal Screen Timeout'}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
