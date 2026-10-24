import React, { useState } from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
  Smartphone,
  Users,
  MapPin,
  Play,
  Pause,
  FastForward,
  Share2,
  Check,
  PlusCircle,
  ShieldAlert
} from 'lucide-react';
import { RideChannel, TrackingMode } from '../types';

interface NavbarProps {
  ride: RideChannel | null;
  trackingMode: TrackingMode;
  onToggleTrackingMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  wakeLockActive: boolean;
  onToggleWakeLock: () => void;
  isSimulating: boolean;
  simSpeed: number;
  onToggleSimulation: () => void;
  onChangeSimSpeed: (speed: number) => void;
  onOpenRoster: () => void;
  onOpenRoute: () => void;
  onOpenAlerts: () => void;
  onOpenRideModal: () => void;
  unreadAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  ride,
  trackingMode,
  onToggleTrackingMode,
  soundEnabled,
  onToggleSound,
  wakeLockActive,
  onToggleWakeLock,
  isSimulating,
  simSpeed,
  onToggleSimulation,
  onChangeSimSpeed,
  onOpenRoster,
  onOpenRoute,
  onOpenRideModal,
  unreadAlertsCount
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!ride) return;
    navigator.clipboard.writeText(ride.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ridersCount = ride ? ride.riders.length : 0;

  return (
    <header className="absolute top-4 inset-x-4 z-30 pointer-events-none flex items-center justify-between select-none">
      {/* Left Capsule: Brand & Ride Channel */}
      <div className="pointer-events-auto flex items-center space-x-2">
        <div className="glass-pill rounded-2xl px-3 py-2 flex items-center space-x-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-sm shadow-md shadow-amber-500/20 font-black">
            🏍️
          </div>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black tracking-wider uppercase text-slate-100">
                Riders United
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
              <span className="text-amber-400 font-bold">{ride ? ride.code : 'MUM-GOA'}</span>
              <span>•</span>
              <span>{ridersCount} Bikes</span>
            </div>
          </div>

          {/* Quick Copy Link */}
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white glass-button transition-colors ml-1"
            title="Copy Ride Join Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Center Capsule: Mode Switcher & Sim Speed (Apple CarPlay Style) */}
      <div className="pointer-events-auto hidden md:flex items-center space-x-2">
        <div className="glass-pill rounded-2xl p-1 flex items-center space-x-1">
          {/* Mode toggle */}
          <button
            onClick={() => trackingMode !== 'simulation' && onToggleTrackingMode()}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              trackingMode === 'simulation'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            NH-66 Sim
          </button>

          <button
            onClick={() => trackingMode !== 'device_gps' && onToggleTrackingMode()}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              trackingMode === 'device_gps'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Live GPS</span>
          </button>

          {/* If Sim mode: Controls */}
          {trackingMode === 'simulation' && (
            <div className="flex items-center pl-1 border-l border-white/10 space-x-1">
              <button
                onClick={onToggleSimulation}
                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 glass-button"
                title={isSimulating ? 'Pause Convoy' : 'Start Convoy'}
              >
                {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  const nextSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 5 : simSpeed === 5 ? 10 : 1;
                  onChangeSimSpeed(nextSpeed);
                }}
                className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold text-slate-300 glass-button flex items-center space-x-1"
                title="Cycle Speed (1x, 2x, 5x, 10x)"
              >
                <FastForward className="w-3 h-3 text-amber-400" />
                <span>{simSpeed}x</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Capsule: Handlebar controls & Discord channel launcher */}
      <div className="pointer-events-auto flex items-center space-x-2">
        <div className="glass-pill rounded-2xl p-1 flex items-center space-x-1">
          {/* Screen Wake Lock */}
          <button
            onClick={onToggleWakeLock}
            className={`p-2 rounded-xl text-xs transition-all ${
              wakeLockActive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 glass-button'
            }`}
            title={wakeLockActive ? 'Handlebar Screen Awake: ON' : 'Keep Screen Awake (Handlebar Mode)'}
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl text-xs transition-all ${
              soundEnabled
                ? 'text-cyan-400 hover:text-cyan-300 glass-button'
                : 'text-slate-500 glass-button'
            }`}
            title={soundEnabled ? 'Walkie-Talkie Sounds: ON' : 'Mute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Route Itinerary */}
          <button
            onClick={onOpenRoute}
            className="p-2 rounded-xl text-slate-300 hover:text-white glass-button flex items-center space-x-1.5"
            title="Mumbai to Goa Itinerary"
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold hidden lg:inline">Route</span>
          </button>

          {/* Discord-style Roster & Voice Channels */}
          <button
            onClick={onOpenRoster}
            className="relative px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
            title="Rider Roster & Discord Channels"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs font-mono font-black">{ridersCount}</span>
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-slate-950 animate-ping" />
            )}
          </button>

          {/* Create / Switch Ride */}
          <button
            onClick={onOpenRideModal}
            className="p-2 rounded-xl text-slate-400 hover:text-amber-400 glass-button"
            title="Create or Join Ride"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
