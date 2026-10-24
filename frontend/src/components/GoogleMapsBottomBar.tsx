import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Radio,
  Volume2,
  Users,
  AlertTriangle,
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
  onStartRide: () => void;
  onEndRide: () => void;
  onOpenRoster: () => void;
  onOpenAlerts: () => void;
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
  onStartRide,
  onEndRide,
  onOpenRoster,
  onOpenAlerts,
  onHighlightFuel,
  ridersCount,
  currentRiderId,
  callsign,
  activeSpeaker,
  channel
}) => {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
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

  // Format arrival time
  const arrivalTime = new Date(Date.now() + durationMinutes * 60 * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="absolute bottom-4 right-4 z-30 pointer-events-auto select-none flex items-center justify-end space-x-3 animate-fadeIn">
      {/* Remote Speaker Alert Banner */}
      {isOtherRiderTalking && (
        <div className="absolute -top-12 right-0 bg-cyan-950/90 border border-cyan-400 text-cyan-200 px-3 py-1.5 rounded-full text-xs font-mono flex items-center space-x-2 shadow-xl animate-bounce">
          <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>
            <strong>{activeSpeaker.callsign}</strong> transmitting...
          </span>
        </div>
      )}

      {/* Google Maps Authentic Bottom Navigation Bar */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-2 sm:px-4 sm:py-2.5 shadow-2xl flex items-center space-x-3 sm:space-x-4 text-slate-100">
        {/* Left: ETA, Time & Distance */}
        <div className="flex flex-col justify-center pr-2 sm:pr-4 border-r border-white/10">
          <div className="flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-sans tracking-tight leading-none">
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
                : `${durationMinutes} min`}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center space-x-1.5">
            <span>{distanceKm} km</span>
            <span>•</span>
            <span className="text-slate-300 font-semibold">{arrivalTime} arrival</span>
          </div>
        </div>

        {/* Center: Push-To-Talk Walkie-Talkie Button */}
        <div className="relative flex items-center justify-center">
          {isTransmitting && (
            <div className="absolute w-16 h-16 rounded-full bg-red-500/40 animate-ping"></div>
          )}
          {isOtherRiderTalking && (
            <div className="absolute w-16 h-16 rounded-full bg-cyan-500/30 animate-ping"></div>
          )}

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
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 touch-none ${
              isTransmitting
                ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white ring-4 ring-red-400/30 shadow-red-500/50'
                : isOtherRiderTalking
                ? 'bg-cyan-900 text-cyan-300 ring-2 ring-cyan-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15'
            }`}
            title="Hold to Talk (or Spacebar)"
          >
            {isTransmitting ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="text-[9px] font-black font-mono tracking-wider uppercase mt-0.5 leading-none">
              {isTransmitting ? 'LIVE' : 'PTT'}
            </span>
          </button>
        </div>

        {/* Action Buttons: Fuel, Hazard, Squad */}
        <div className="flex items-center space-x-1.5">
          {/* Fuel Stops */}
          <button
            onClick={onHighlightFuel}
            className="p-2 sm:px-2.5 sm:py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-amber-400 transition-colors flex items-center space-x-1"
            title="Highway Fuel Stations"
          >
            <Fuel className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Fuel</span>
          </button>

          {/* Hazard */}
          <button
            onClick={onOpenAlerts}
            className="p-2 sm:px-2.5 sm:py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-rose-400 transition-colors flex items-center space-x-1"
            title="Report Road Hazard"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Hazard</span>
          </button>

          {/* Squad Riders Button */}
          <button
            onClick={onOpenRoster}
            className="p-2 sm:px-2.5 sm:py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-cyan-400 transition-colors flex items-center space-x-1"
            title="View Convoy Pack"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold font-mono">{ridersCount}</span>
          </button>
        </div>

        {/* Start / End Navigation Button */}
        <div>
          {!isRideActive ? (
            <button
              onClick={onStartRide}
              className="px-4 py-2.5 rounded-2xl bg-[#1b873f] hover:bg-[#136f32] text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
              title="Start Navigation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          ) : (
            <button
              onClick={onEndRide}
              className="px-3 py-2.5 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1 shadow-md shadow-red-600/30 active:scale-95 transition-all"
              title="Exit Navigation"
            >
              <X className="w-4 h-4" />
              <span>End</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
