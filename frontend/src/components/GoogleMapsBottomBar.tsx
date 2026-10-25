import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Radio,
  Volume2,
  Users,
  Play,
  X,
  Fuel
} from 'lucide-react';
import { voiceComms } from '../services/voiceComms';
import { nativeMobile } from '../services/nativeMobile';

interface GoogleMapsBottomBarProps {
  durationMinutes: number;
  distanceKm: number;
  destinationName: string;
  isRideActive: boolean;
  hasActiveRoute?: boolean;
  onStartRide: () => void;
  onEndRide: () => void;
  onOpenRoster: () => void;
  onHighlightFuel: () => void;
  ridersCount: number;
  currentRiderId: string;
  callsign: string;
  activeSpeaker: { riderId: string; callsign: string } | null;
  channel: string;
}

export const GoogleMapsBottomBar: React.FC<GoogleMapsBottomBarProps> = ({
  durationMinutes,
  distanceKm,
  isRideActive,
  hasActiveRoute = true,
  onStartRide,
  onEndRide,
  onOpenRoster,
  onHighlightFuel,
  ridersCount,
  currentRiderId,
  callsign,
  activeSpeaker,
  channel
}) => {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [_audioLevel, setAudioLevel] = useState(0);
  const isTransmittingRef = useRef(false);

  useEffect(() => {
    isTransmittingRef.current = isTransmitting;
  }, [isTransmitting]);

  useEffect(() => {
    voiceComms.setLevelCallback((level) => {
      setAudioLevel(level);
    });
    return () => {
      voiceComms.setLevelCallback(null);
    };
  }, []);

  // Keyboard shortcut Spacebar or T for PTT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.code === 'Space' || e.key === 't' || e.key === 'T') && !isTransmittingRef.current) {
        e.preventDefault();
        startTalking();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.code === 'Space' || e.key === 't' || e.key === 'T') && isTransmittingRef.current) {
        e.preventDefault();
        stopTalking();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentRiderId, callsign, channel]);

  const startTalking = () => {
    if (isTransmittingRef.current) return;
    setIsTransmitting(true);
    nativeMobile.triggerHaptic('heavy');
    voiceComms.startTransmission(currentRiderId, callsign, channel);
  };

  const stopTalking = () => {
    if (!isTransmittingRef.current) return;
    setIsTransmitting(false);
    nativeMobile.triggerHaptic('light');
    voiceComms.stopTransmission(currentRiderId, callsign, channel);
  };

  const isOtherRiderTalking = activeSpeaker !== null && activeSpeaker.riderId !== currentRiderId;

  const arrivalTime = new Date(Date.now() + durationMinutes * 60 * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="absolute bottom-[max(0.875rem,env(safe-area-inset-bottom,0.875rem))] right-[max(0.875rem,env(safe-area-inset-right,0.875rem))] z-30 pointer-events-auto select-none flex items-center justify-end space-x-2 animate-fadeIn">
      {/* Remote Speaker Banner */}
      {isOtherRiderTalking && (
        <div className="absolute -top-10 right-0 bg-[#ef4444] text-white border-2 border-black shadow-[2px_2px_0px_#000] px-2.5 py-1 rounded-lg text-xs font-black flex items-center space-x-1.5 animate-bounce">
          <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
          <span>
            <strong>{activeSpeaker.callsign}</strong> transmitting...
          </span>
        </div>
      )}

      {/* Neobrutalist Bottom Navigation Bar (White, Red & Blue) */}
      <div className="bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-1.5 sm:px-3 sm:py-2 flex items-center space-x-2 sm:space-x-2.5">
        {/* Left: ETA & Distance */}
        <div className="flex flex-col justify-center pr-2 sm:pr-2.5 border-r-2 border-black">
          <div className="flex items-baseline space-x-1">
            <span className="text-lg sm:text-xl font-black text-[#2563eb] font-mono leading-none tracking-tight">
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                : `${durationMinutes}m`}
            </span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-700 mt-0.5 flex items-center space-x-1">
            <span>{distanceKm} km</span>
            <span>•</span>
            <span>{arrivalTime}</span>
          </div>
        </div>

        {/* Center: Push-To-Talk Button (Visible, Compact, Punchy) */}
        <div className="relative flex items-center justify-center">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              startTalking();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              stopTalking();
            }}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Push To Talk Walkie Talkie Radio"
            className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-none ${
              isTransmitting
                ? 'bg-[#ef4444] text-white animate-pulse'
                : isOtherRiderTalking
                ? 'bg-red-600 text-white'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
            }`}
            title="Hold to Talk (or Spacebar)"
          >
            {isTransmitting ? (
              <Radio className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            <span className="text-[7.5px] font-black font-mono tracking-wider uppercase mt-0.5 leading-none">
              {isTransmitting ? 'LIVE' : 'PTT'}
            </span>
          </button>
        </div>

        {/* Small, Visible Action Buttons (Fuel, Hazard, Squad) */}
        <div className="flex items-center space-x-1">
          {/* Fuel Stops */}
          <button
            onClick={onHighlightFuel}
            aria-label="View Highway Fuel Pumps"
            className="h-8 px-2 rounded bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1 font-bold text-xs transition-transform"
            title="Highway Fuel Pumps"
          >
            <Fuel className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline text-[11px]">Fuel</span>
          </button>

          {/* Squad Riders */}
          <button
            onClick={onOpenRoster}
            aria-label="View Convoy Pack Squadron"
            className="h-8 px-2 rounded bg-[#2563eb] hover:bg-blue-700 text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1 font-bold text-xs transition-transform"
            title="Convoy Pack"
          >
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="font-mono text-[11px] font-black">{ridersCount}</span>
          </button>
        </div>

        {/* Start / End Navigation Button */}
        <div>
          {!isRideActive ? (
            <button
              onClick={() => {
                if (!hasActiveRoute) {
                  alert('Please enter a destination to start ride navigation.');
                  return;
                }
                onStartRide();
              }}
              aria-label="Start Navigation"
              className={`h-8 px-2.5 rounded font-black text-xs uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1 transition-transform ${
                hasActiveRoute
                  ? 'bg-[#2563eb] hover:bg-blue-700 text-white'
                  : 'bg-slate-300 text-slate-600 cursor-not-allowed'
              }`}
              title={hasActiveRoute ? "Start Navigation" : "Destination required to start"}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{hasActiveRoute ? 'Start' : 'Set Dest'}</span>
            </button>
          ) : (
            <button
              onClick={onEndRide}
              aria-label="End Navigation"
              className="h-8 px-2.5 rounded bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1 transition-transform"
              title="Exit Navigation"
            >
              <X className="w-3.5 h-3.5" />
              <span>End</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
