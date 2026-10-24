import React, { useState } from 'react';
import { X, Plus, LogIn, Bike, User, ShieldCheck } from 'lucide-react';
import { RiderRole } from '../types';

interface CreateJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRide: (code: string, riderInfo: any) => void;
  onCreateRide: (rideData: any) => void;
  currentProfile: {
    name: string;
    callsign: string;
    bikeModel: string;
    avatarColor: string;
    role: RiderRole;
  };
  onUpdateProfile: (profile: any) => void;
}

const PRESET_COLORS = [
  '#f59e0b', // Amber / Gold
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#3b82f6', // Sapphire Blue
  '#ef4444', // Red
  '#ec4899', // Pink
  '#eab308'  // Yellow
];

export const CreateJoinModal: React.FC<CreateJoinModalProps> = ({
  isOpen,
  onClose,
  onJoinRide,
  onCreateRide,
  currentProfile,
  onUpdateProfile
}) => {
  const [tab, setTab] = useState<'profile' | 'join' | 'create'>('profile');
  const [rideCode, setRideCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTargetSpeed, setNewTargetSpeed] = useState(75);

  const [name, setName] = useState(currentProfile.name);
  const [callsign, setCallsign] = useState(currentProfile.callsign);
  const [bikeModel, setBikeModel] = useState(currentProfile.bikeModel);
  const [avatarColor, setAvatarColor] = useState(currentProfile.avatarColor);
  const [role, setRole] = useState<RiderRole>(currentProfile.role);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, callsign, bikeModel, avatarColor, role });
    onClose();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideCode.trim()) return;
    onUpdateProfile({ name, callsign, bikeModel, avatarColor, role });
    onJoinRide(rideCode.trim().toUpperCase(), { name, callsign, bikeModel, avatarColor, role });
    onClose();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, callsign, bikeModel, avatarColor, role });
    onCreateRide({
      title: newTitle || 'Custom Motorcycle Convoy',
      leaderName: name,
      leaderBike: bikeModel,
      targetSpeed: Number(newTargetSpeed)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bike className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Riders United Station
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs font-semibold">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center space-x-1.5 border-b-2 ${
              tab === 'profile'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Rider Profile</span>
          </button>

          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center space-x-1.5 border-b-2 ${
              tab === 'join'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Join Ride</span>
          </button>

          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center space-x-1.5 border-b-2 ${
              tab === 'create'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Ride</span>
          </button>
        </div>

        {/* Tab Forms */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">RIDER NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Vikram Singh"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">CALLSIGN / RADIO TAG</label>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Thunder Lead"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">MOTORCYCLE MODEL</label>
                <input
                  type="text"
                  value={bikeModel}
                  onChange={(e) => setBikeModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Royal Enfield Himalayan 450"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1.5">MARKER COLOR</label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        avatarColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">TACTICAL ROLE</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RiderRole)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="leader">Road Captain (Leader)</option>
                  <option value="scout">Point Scout</option>
                  <option value="rider">Pack Rider</option>
                  <option value="sweeper">Tail Gunner (Sweeper)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider mt-4"
              >
                Save Profile
              </button>
            </form>
          )}

          {tab === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1.5">RIDE CHANNEL CODE</label>
                <input
                  type="text"
                  value={rideCode}
                  onChange={(e) => setRideCode(e.target.value)}
                  placeholder="e.g. MUM-GOA"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-center font-mono text-base font-bold text-amber-400 placeholder-slate-600 uppercase tracking-widest focus:outline-none focus:border-amber-400"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Enter the 6-character code shared by your Ride Leader. Default active room: <strong>MUM-GOA</strong>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider"
              >
                Join Ride Channel
              </button>
            </form>
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">RIDE EXPEDITION TITLE</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Goa Monsoon Thunder Run"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">TARGET CONVOY SPEED (KM/H)</label>
                <input
                  type="number"
                  value={newTargetSpeed}
                  onChange={(e) => setNewTargetSpeed(Number(e.target.value))}
                  min={30}
                  max={140}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-400">
                You will be designated as the <strong>Road Captain (Ride Leader)</strong> and a private ride code will be generated.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 text-xs uppercase tracking-wider"
              >
                Create Ride Lobby
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
