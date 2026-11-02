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

    const handleHardwarePtt = (e: Event) => {
      const customEvent = e as CustomEvent<{ state: 'down' | 'up' }>;
      if (customEvent.detail?.state === 'down') {
        startTalking();
      } else if (customEvent.detail?.state === 'up') {
        stopTalking();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('hardware-ptt', handleHardwarePtt);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('hardware-ptt', handleHardwarePtt);
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
    <div className="absolute bottom-[max(0.875rem,env(safe-area-inset-bottom,0.875rem))] right-[max(0.875rem,env(safe-area-inset-right,0.875rem))] z-30 pointer-events-auto select-none flex items-center justify-end gap-2 animate-fadeIn">
      {/* Remote Speaker Banner */}
      {isOtherRiderTalking && (
        <div className="absolute -top-12 right-0 bg-red-600 text-white shadow-xl px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 animate-bounce border border-red-400/40">
          <Volume2 className="w-4 h-4 text-white animate-pulse" />
          <span>
            <strong>{activeSpeaker.callsign}</strong> transmitting...
          </span>
        </div>
      )}

      {/* Google Maps Navigation Card */}
      <div className="bg-white/95 backdrop-blur-md text-gray-900 border border-gray-200/80 shadow-[0_12px_36px_rgba(0,0,0,0.25)] rounded-3xl p-2 sm:px-4 sm:py-2.5 flex items-center gap-3">
        {/* Left: ETA, Remaining Distance & Arrival Time */}
        <div className="flex flex-col justify-center pr-3 border-r border-gray-200">
          <div className="text-xl sm:text-2xl font-black text-[#0F5132] font-sans leading-none tracking-tight">
            {durationMinutes >= 60
              ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
              : `${durationMinutes} min`}
          </div>
          <div className="text-[11px] font-semibold text-gray-500 mt-1 flex items-center gap-1.5">
            <span>{distanceKm} km</span>
            <span>•</span>
            <span className="text-gray-900 font-bold">{arrivalTime}</span>
          </div>
        </div>

        {/* Center: Push-To-Talk Radio Button */}
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
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all touch-none shadow-md ${
              isTransmitting
                ? 'bg-red-600 text-white scale-95 shadow-red-500/50'
                : isOtherRiderTalking
                ? 'bg-red-500 text-white'
                : 'bg-[#18191D] hover:bg-black text-white active:scale-95'
            }`}
            title="Hold to Talk (or Spacebar)"
          >
            {isTransmitting ? (
              <Radio className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none">
              {isTransmitting ? 'LIVE' : 'PTT'}
            </span>
          </button>
        </div>

        {/* Action Buttons (Fuel Stops & Convoy Pack) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onHighlightFuel}
            aria-label="View Highway Fuel Pumps"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
            title="Highway Fuel Pumps"
          >
            <Fuel className="w-4 h-4 text-amber-600" />
          </button>

          <button
            onClick={onOpenRoster}
            aria-label="View Convoy Pack Squadron"
            className="h-9 px-3 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1.5 font-bold text-xs transition-colors"
            title="Convoy Pack"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>{ridersCount}</span>
          </button>
        </div>

        {/* Start Navigation or End Trip (Google Maps Red Exit Button) */}
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
              className={`h-10 px-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                hasActiveRoute
                  ? 'bg-[#1A73E8] hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          ) : (
            <button
              onClick={onEndRide}
              aria-label="Exit Navigation"
              className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all shadow-sm"
              title="Exit Navigation"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
