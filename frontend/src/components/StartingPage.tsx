import React, { useState } from 'react';
import {
  Bike,
  Compass,
  LogIn,
  Plus,
  Edit3,
  Check,
  User,
  Radio,
  Navigation,
  Fuel,
  ArrowRight
} from 'lucide-react';
import { RiderRole } from '../types';

interface StartingPageProps {
  currentProfile: {
    id: string;
    name: string;
    callsign: string;
    bikeModel: string;
    avatarColor: string;
    role: RiderRole;
  };
  onUpdateProfile: (profile: any) => void;
  onSelectMode: (mode: 'solo' | 'join' | 'create') => void;
  isConnected: boolean;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#2563eb', // Blue
  '#000000', // Black
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6'  // Purple
];

export const StartingPage: React.FC<StartingPageProps> = ({
  currentProfile,
  onUpdateProfile,
  onSelectMode,
  isConnected
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentProfile.name);
  const [profileCallsign, setProfileCallsign] = useState(currentProfile.callsign);
  const [profileBike, setProfileBike] = useState(currentProfile.bikeModel);
  const [profileColor, setProfileColor] = useState(currentProfile.avatarColor);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: profileName.trim() || 'Rider',
      callsign: profileCallsign.trim() || 'Solo Rider',
      bikeModel: profileBike.trim() || 'Motorcycle',
      avatarColor: profileColor
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="w-full min-h-dvh h-dvh bg-[#050811] flex justify-center items-stretch sm:items-center overflow-hidden">
      {/* Mobile App Shell */}
      <div className="w-full max-w-md h-full min-h-dvh max-h-dvh flex flex-col justify-between bg-[#0b0f19] text-black font-sans select-none relative overflow-hidden sm:border-2 sm:border-black sm:shadow-[6px_6px_0px_#000] sm:rounded-2xl safe-pt safe-pb">
        
        {/* Top Header Bar */}
        <header className="px-3.5 py-2.5 border-b-2 border-black bg-white flex items-center justify-between shrink-0 shadow-[0_2px_0px_#000]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#ef4444] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-black">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-black leading-none">
                Riders United
              </h1>
              <span className="text-[9px] text-[#2563eb] font-mono font-bold leading-none">
                Cockpit v1.0 • 100% Real GPS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-100 border border-black shadow-[1px_1px_0px_#000] text-[9px] font-black uppercase">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-black">LIVE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="text-[#ef4444]">SYNCING</span>
              </>
            )}
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-3.5 flex flex-col justify-between space-y-3.5">
          
          {/* Hero Welcome Banner */}
          <div className="bg-white border-2 border-black shadow-[3.5px_3.5px_0px_#000] rounded-xl p-3.5 text-center relative overflow-hidden">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#2563eb] text-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-xl mb-2">
              🏍️
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-black leading-tight">
              Motorcycle Convoy Cockpit
            </h2>
            <p className="text-[11px] text-slate-700 font-bold mt-1">
              Real-time satellite navigation, group telemetry & walkie-talkie audio for real riders.
            </p>

            {/* Badges Checklist */}
            <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-slate-200 text-[10px] font-mono font-bold">
              <div className="flex items-center justify-center space-x-1 bg-slate-100 py-1 px-1.5 rounded border border-black">
                <Navigation className="w-3 h-3 text-[#2563eb]" />
                <span>Satellite Only</span>
              </div>
              <div className="flex items-center justify-center space-x-1 bg-slate-100 py-1 px-1.5 rounded border border-black">
                <Radio className="w-3 h-3 text-[#ef4444]" />
                <span>PTT Radio</span>
              </div>
              <div className="flex items-center justify-center space-x-1 bg-slate-100 py-1 px-1.5 rounded border border-black">
                <Fuel className="w-3 h-3 text-amber-500" />
                <span>Fuel Pumps</span>
              </div>
              <div className="flex items-center justify-center space-x-1 bg-slate-100 py-1 px-1.5 rounded border border-black">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Zero Bots</span>
              </div>
            </div>
          </div>

          {/* Rider Identity Card */}
          <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate">
              <div
                className="w-10 h-10 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center text-white text-base font-black shrink-0"
                style={{ backgroundColor: currentProfile.avatarColor }}
              >
                🏍️
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-xs font-black text-black truncate leading-tight">
                    {currentProfile.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#2563eb] text-white border border-black text-[8px] font-black uppercase shadow-[1px_1px_0px_#000]">
                    {currentProfile.callsign}
                  </span>
                </div>
                <p className="text-[10px] font-mono font-bold text-slate-600 truncate mt-0.5">
                  {currentProfile.bikeModel}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-[10px] font-black flex items-center space-x-1 shrink-0 transition-transform"
            >
              <Edit3 className="w-3 h-3 text-[#2563eb]" />
              <span>Edit</span>
            </button>
          </div>

          {/* 3 Main Action Launcher Buttons (Thumb-friendly 54px targets) */}
          <div className="space-y-2.5">
            {/* 1. Solo Ride Launcher */}
            <button
              type="button"
              onClick={() => onSelectMode('solo')}
              className="w-full p-3.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center font-bold shrink-0">
                  <Compass className="w-4 h-4 text-[#2563eb]" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black text-white leading-tight">
                    Start Solo Ride
                  </span>
                  <span className="block text-[10px] text-blue-100 font-normal">
                    Plan route anywhere with speedometer & fuel stops
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 2. Join Convoy Launcher */}
            <button
              type="button"
              onClick={() => onSelectMode('join')}
              className="w-full p-3.5 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center font-bold shrink-0">
                  <LogIn className="w-4 h-4 text-[#ef4444]" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black text-white leading-tight">
                    Join Convoy Squad
                  </span>
                  <span className="block text-[10px] text-red-100 font-normal">
                    Enter Captain's 6-character room code
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 3. Create Convoy Launcher */}
            <button
              type="button"
              onClick={() => onSelectMode('create')}
              className="w-full p-3.5 rounded-xl bg-white hover:bg-slate-50 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white border-2 border-black flex items-center justify-center font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black text-black leading-tight">
                    Create Convoy Room
                  </span>
                  <span className="block text-[10px] text-slate-600 font-normal">
                    Establish a new room as Road Captain
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-black shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </main>

        {/* Footer Note */}
        <footer className="p-2 border-t border-black/40 text-center text-[10px] font-mono font-bold text-slate-400 shrink-0 bg-[#070b14]">
          Designed for Handlebar Landscape Cockpit Mount
        </footer>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white text-black border-2 border-black rounded-xl p-4 w-full max-w-xs shadow-[5px_5px_0px_#000] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
              <h3 className="text-xs font-black uppercase tracking-wide flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Rider Profile</span>
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-xs font-black text-black hover:text-[#ef4444]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 font-bold text-black focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Callsign / Radio Tag
                </label>
                <input
                  type="text"
                  value={profileCallsign}
                  onChange={(e) => setProfileCallsign(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 font-bold text-black focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Motorcycle Model
                </label>
                <input
                  type="text"
                  value={profileBike}
                  onChange={(e) => setProfileBike(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 font-bold text-black focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Puck Marker Color
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setProfileColor(c)}
                      className={`w-6 h-6 rounded-md border-2 border-black transition-transform ${
                        profileColor === c ? 'scale-125 shadow-[1px_1px_0px_#000]' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
