import React from 'react';
import {
  Compass,
  Radio,
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
  onOpenAlerts,
  onOpenRideModal,
  unreadAlertsCount
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    if (!ride) return;
    navigator.clipboard.writeText(ride.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ridersCount = ride ? ride.riders.length : 0;
  const leader = ride ? ride.riders.find(r => r.role === 'leader') : null;

  return (
    <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 md:px-5 flex items-center justify-between z-30 select-none">
      {/* Brand & Ride Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-slate-950">
            🏍️
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-black tracking-wider uppercase bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 bg-clip-text text-transparent leading-none">
              Riders United
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              Tactical GPS & Comms
            </p>
          </div>
        </div>

        {/* Ride Channel Code Badge */}
        {ride && (
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs space-x-2">
            <span className="text-slate-400 font-medium hidden md:inline">Ride:</span>
            <span className="font-mono font-bold text-amber-400 tracking-wider">{ride.code}</span>
            <button
              onClick={handleCopyCode}
              title="Copy Ride Join Code"
              className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Lead Rider Indicator */}
        {leader && (
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <span className="text-amber-400">👑 Lead:</span>
            <span className="font-semibold text-slate-200">{leader.name}</span>
          </div>
        )}
      </div>

      {/* Center Controls: Simulation / GPS Mode Toggle */}
      <div className="flex items-center space-x-2">
        {/* Tracking Mode Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => trackingMode !== 'simulation' && onToggleTrackingMode()}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
              trackingMode === 'simulation'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Sim NH-66</span>
          </button>
          <button
            onClick={() => trackingMode !== 'device_gps' && onToggleTrackingMode()}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1.5 ${
              trackingMode === 'device_gps'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live GPS</span>
          </button>
        </div>

        {/* Simulation Controls (if Sim mode) */}
        {trackingMode === 'simulation' && (
          <div className="hidden md:flex items-center bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-0.5 space-x-1 text-xs">
            <button
              onClick={onToggleSimulation}
              className="p-1 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300"
              title={isSimulating ? 'Pause Convoy Sim' : 'Start Convoy Sim'}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                const nextSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 5 : simSpeed === 5 ? 10 : 1;
                onChangeSimSpeed(nextSpeed);
              }}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-300 hover:bg-slate-800 flex items-center space-x-1"
              title="Cycle Speed (1x, 2x, 5x, 10x)"
            >
              <FastForward className="w-3 h-3 text-amber-400" />
              <span>{simSpeed}x</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Actions: Bike screen lock, sound, channel roster, waypoints */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* WakeLock (Handlebar Mode) */}
        <button
          onClick={onToggleWakeLock}
          className={`p-2 rounded-lg border text-xs flex items-center space-x-1 transition-all ${
            wakeLockActive
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={wakeLockActive ? 'Handlebar Screen Awake: ON' : 'Keep Screen Awake (Handlebar Mount)'}
        >
          <Smartphone className="w-4 h-4" />
          <span className="text-[10px] font-mono hidden xl:inline">
            {wakeLockActive ? 'AWAKE' : 'SLEEP'}
          </span>
        </button>

        {/* Audio SFX Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg border text-xs transition-all ${
            soundEnabled
              ? 'bg-slate-900 border-slate-700 text-cyan-400 hover:text-cyan-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-500'
          }`}
          title={soundEnabled ? 'Walkie-Talkie Sounds: ON' : 'Mute Sound Effects'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
          title="Tactical Road Hazards & Alerts"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-slate-950 animate-pulse">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Route / Itinerary Button */}
        <button
          onClick={onOpenRoute}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors flex items-center space-x-1.5"
          title="View Mumbai to Goa Route Waypoints"
        >
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold hidden md:inline">Route</span>
        </button>

        {/* Convoy Roster / Discord Channel Drawer Button */}
        <button
          onClick={onOpenRoster}
          className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white transition-all flex items-center space-x-1.5 shadow-sm"
          title="Rider Roster & Discord Channels"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs font-bold font-mono">
            {ridersCount}
          </span>
        </button>

        {/* New / Switch Ride Button */}
        <button
          onClick={onOpenRideModal}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
          title="Create or Join Another Ride Room"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
