import React, { useState, useEffect, useRef } from 'react';
import { Mic, Radio, Volume2 } from 'lucide-react';
import { voiceComms } from '../services/voiceComms';

interface PushToTalkProps {
  currentRiderId: string;
  callsign: string;
  activeSpeaker: {
    riderId: string;
    callsign: string;
    role?: string;
  } | null;
  channel: string;
  onChangeChannel: (channel: string) => void;
}

export const PushToTalk: React.FC<PushToTalkProps> = ({
  currentRiderId,
  callsign,
  activeSpeaker,
  channel,
  onChangeChannel
}) => {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [toggleMode, setToggleMode] = useState(false);
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
        if (!toggleMode) {
          stopTalking();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleMode, currentRiderId, callsign, channel]);

  const startTalking = () => {
    if (isTransmittingRef.current) return;
    setIsTransmitting(true);
    voiceComms.startTransmission(currentRiderId, callsign, channel);
  };

  const stopTalking = () => {
    if (!isTransmittingRef.current) return;
    setIsTransmitting(false);
    voiceComms.stopTransmission(currentRiderId, callsign, channel);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (toggleMode) {
      if (isTransmitting) stopTalking();
      else startTalking();
    } else {
      startTalking();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!toggleMode && isTransmitting) {
      stopTalking();
    }
  };

  const isOtherRiderTalking = activeSpeaker !== null && activeSpeaker.riderId !== currentRiderId;

  return (
    <div className="flex flex-col items-center select-none pointer-events-auto">
      {/* Remote Speaker Banner */}
      {isOtherRiderTalking && (
        <div className="mb-2 px-3.5 py-1.5 glass-panel rounded-full text-xs font-mono flex items-center space-x-2 text-cyan-300 border border-cyan-500/40 shadow-xl animate-bounce">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>
            <strong>{activeSpeaker.callsign}</strong> transmitting...
          </span>
        </div>
      )}

      {/* Modern CarPlay / BMW Motorrad Style Circular PTT Thumb Button */}
      <div className="relative flex items-center justify-center">
        {/* Glow rings */}
        {isTransmitting && (
          <div className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-ping"></div>
        )}
        {isOtherRiderTalking && (
          <div className="absolute w-24 h-24 rounded-full bg-cyan-500/20 animate-ping"></div>
        )}

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 transform active:scale-95 touch-none ${
            isTransmitting
              ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/50 animate-ptt-pulse ring-4 ring-red-400/30'
              : isOtherRiderTalking
              ? 'glass-panel border-cyan-400/80 text-cyan-400 shadow-cyan-500/30 ring-2 ring-cyan-400/30'
              : 'glass-panel text-slate-100 hover:border-amber-400 hover:text-amber-400 hover:shadow-amber-500/20'
          }`}
          title="Hold Spacebar or Click & Hold to Transmit Voice"
        >
          {isTransmitting ? (
            <Radio className="w-7 h-7 animate-pulse" />
          ) : (
            <Mic className="w-7 h-7" />
          )}

          <span className="text-[10px] font-mono font-bold tracking-wider uppercase mt-1">
            {isTransmitting ? 'LIVE' : toggleMode ? (isTransmitting ? 'OFF' : 'PTT') : 'PTT'}
          </span>
        </button>
      </div>

      {/* Voice Activity Audio Bars */}
      <div className="mt-2 flex items-center space-x-1 h-3">
        {[20, 60, 90, 100, 80, 50, 90, 40].map((h, i) => {
          const barHeight = isTransmitting
            ? Math.max(3, Math.min(14, (audioLevel / 100) * h * 0.16 + Math.random() * 3))
            : 3;
          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                isTransmitting ? 'bg-red-400' : isOtherRiderTalking ? 'bg-cyan-400' : 'bg-white/10'
              }`}
              style={{ height: `${barHeight}px` }}
            />
          );
        })}
      </div>

      {/* Minimal Footer Capsule */}
      <div className="mt-1 flex items-center space-x-2 text-[10px] font-mono text-slate-400">
        <select
          value={channel}
          onChange={(e) => onChangeChannel(e.target.value)}
          className="bg-slate-900/80 border border-white/10 text-amber-400 rounded-lg px-2 py-0.5 text-[10px] focus:outline-none"
        >
          <option value="convoy-main">#convoy-main</option>
          <option value="captains-briefing">#captains-briefing</option>
          <option value="emergency-priority">#emergency-sos</option>
        </select>

        <button
          onClick={() => setToggleMode(!toggleMode)}
          className="hover:text-slate-200 transition-colors"
          title="Toggle between Hold-to-Talk and Tap-to-Talk"
        >
          {toggleMode ? '[TAP]' : '[SPACE]'}
        </button>
      </div>
    </div>
  );
};
