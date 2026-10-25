import React, { useState } from 'react';
import { X, Plus, LogIn, Bike, User } from 'lucide-react';
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
  '#ef4444', // Red
  '#2563eb', // Blue
  '#000000', // Black
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6'  // Purple
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
      title: newTitle || 'Custom Convoy Route',
      leaderName: name,
      leaderBike: bikeModel,
      targetSpeed: Number(newTargetSpeed)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      {/* Neobrutalist Modal Window */}
      <div className="bg-white text-black border-2 border-black rounded-xl max-w-md w-full shadow-[5px_5px_0px_#000] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3.5 border-b-2 border-black flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-[#2563eb] text-white border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center font-bold">
              <Bike className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wide text-black">
              Riders United Station
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-white hover:bg-red-500 hover:text-white border border-black text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-black text-xs font-black">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-2 text-center transition-colors flex items-center justify-center space-x-1 border-r-2 border-black ${
              tab === 'profile'
                ? 'bg-[#2563eb] text-white'
                : 'bg-white text-black hover:bg-slate-100'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-center transition-colors flex items-center justify-center space-x-1 border-r-2 border-black ${
              tab === 'join'
                ? 'bg-[#ef4444] text-white'
                : 'bg-white text-black hover:bg-slate-100'
            }`}
          >
            <LogIn className="w-3 h-3" />
            <span>Join</span>
          </button>

          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-center transition-colors flex items-center justify-center space-x-1 ${
              tab === 'create'
                ? 'bg-[#2563eb] text-white'
                : 'bg-white text-black hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Create</span>
          </button>
        </div>

        {/* Tab Forms */}
        <div className="p-3.5 flex-1 overflow-y-auto">
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Rider Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-black font-bold focus:outline-none focus:bg-white"
                  placeholder="e.g. Vikram Singh"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Callsign / Radio Tag</label>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-black font-bold focus:outline-none focus:bg-white"
                  placeholder="e.g. Thunder Lead"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Motorcycle Model</label>
                <input
                  type="text"
                  value={bikeModel}
                  onChange={(e) => setBikeModel(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-black font-bold focus:outline-none focus:bg-white"
                  placeholder="e.g. Royal Enfield Himalayan 450"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Puck Color</label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-6 h-6 rounded-md border-2 border-black transition-transform ${
                        avatarColor === c ? 'scale-125 shadow-[1px_1px_0px_#000]' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Role in Pack</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['leader', 'scout', 'rider', 'sweeper'] as RiderRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-1 rounded text-[10px] font-black uppercase border border-black ${
                        role === r
                          ? 'bg-black text-white'
                          : 'bg-slate-100 text-black hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                Save Profile
              </button>
            </form>
          )}

          {tab === 'join' && (
            <form onSubmit={handleJoin} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Enter Ride Channel Code
                </label>
                <input
                  type="text"
                  value={rideCode}
                  onChange={(e) => setRideCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-2 text-center text-lg font-mono font-black tracking-widest text-black focus:outline-none focus:bg-white"
                  placeholder="e.g. RIDERS-66"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                Join Channel
              </button>
            </form>
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Convoy Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-black font-bold focus:outline-none focus:bg-white"
                  placeholder="e.g. Goa Coastal Weekend Run"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                  Target Speed (km/h)
                </label>
                <input
                  type="number"
                  value={newTargetSpeed}
                  onChange={(e) => setNewTargetSpeed(Number(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-black font-bold focus:outline-none focus:bg-white"
                  min="30"
                  max="160"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-1 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                Initialize Channel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
