import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  ArrowRight,
  Plus,
  LogIn,
  User,
  Bike,
  Sparkles,
  Wifi,
  WifiOff,
  Edit3,
  Check,
  Search,
  MapPin,
  Loader2,
  X,
  Navigation,
  Crosshair
} from 'lucide-react';
import { RiderRole } from '../types';
import { routingService, LocationSearchResult } from '../services/routingService';

interface LandingPageProps {
  currentProfile: {
    id: string;
    name: string;
    callsign: string;
    bikeModel: string;
    avatarColor: string;
    role: RiderRole;
  };
  onUpdateProfile: (profile: any) => void;
  onCreateGroup: (title: string, targetSpeed: number) => Promise<void>;
  onJoinGroup: (code: string) => Promise<void>;
  onStartSoloRide: (
    start: { name: string; lat: number; lng: number },
    dest: { name: string; lat: number; lng: number }
  ) => Promise<void> | void;
  isConnected: boolean;
  initialCode?: string;
  currentGpsCoords?: { lat: number; lng: number } | null;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#2563eb', // Blue
  '#000000', // Black
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6'  // Purple
];

const PRESET_TOURS = [
  {
    name: 'Current Location ➔ Goa',
    destTitle: 'Baga Beach, Goa (NH 66)',
    desc: 'Coastal highway & scenic ghats • 580 KM',
    dest: { name: 'Baga Beach, Goa', lat: 15.5553, lng: 73.7517 }
  },
  {
    name: 'Current Location ➔ Manali',
    destTitle: 'Mall Road, Manali (Himalayan)',
    desc: 'High mountain passes & twisties • 530 KM',
    dest: { name: 'Mall Road, Manali', lat: 32.2396, lng: 77.1887 }
  },
  {
    name: 'Current Location ➔ Ooty',
    destTitle: 'Ooty Lake, Tamil Nadu (Nilgiri)',
    desc: '36 hairpin curves & hill climb • 270 KM',
    dest: { name: 'Ooty Lake, Tamil Nadu', lat: 11.4102, lng: 76.6950 }
  },
  {
    name: 'Current Location ➔ Mahabaleshwar',
    destTitle: 'Venna Lake, Mahabaleshwar',
    desc: 'Lush green ghat twisties • 125 KM',
    dest: { name: 'Venna Lake, Mahabaleshwar', lat: 17.9237, lng: 73.6586 }
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  currentProfile,
  onUpdateProfile,
  onCreateGroup,
  onJoinGroup,
  onStartSoloRide,
  isConnected,
  initialCode = '',
  currentGpsCoords
}) => {
  // Mobile Tab Switcher: 'solo' | 'join' | 'create'
  const [activeTab, setActiveTab] = useState<'solo' | 'join' | 'create'>('solo');

  // Profile modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentProfile.name);
  const [profileCallsign, setProfileCallsign] = useState(currentProfile.callsign);
  const [profileBike, setProfileBike] = useState(currentProfile.bikeModel);
  const [profileColor, setProfileColor] = useState(currentProfile.avatarColor);

  // Group create form state
  const [createTitle, setCreateTitle] = useState('');
  const [targetSpeed, setTargetSpeed] = useState(75);
  const [isCreating, setIsCreating] = useState(false);

  // Group join form state
  const [joinCode, setJoinCode] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Current Location and Destination filled together
  const [gpsAddress, setGpsAddress] = useState<string>('');
  const [startQuery, setStartQuery] = useState('My Current Location');
  const [destQuery, setDestQuery] = useState('');

  const [selectedStart, setSelectedStart] = useState<{ name: string; lat: number; lng: number } | null>(
    currentGpsCoords
      ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 }
  );
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const [destSuggestions, setDestSuggestions] = useState<LocationSearchResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isStartingSolo, setIsStartingSolo] = useState(false);
  const destDebounceRef = useRef<any>(null);

  // Reverse geocode live GPS to enhance current location display
  useEffect(() => {
    if (currentGpsCoords) {
      setSelectedStart({
        name: 'My Current Location',
        lat: currentGpsCoords.lat,
        lng: currentGpsCoords.lng
      });

      routingService.reverseGeocode(currentGpsCoords.lat, currentGpsCoords.lng).then((addr) => {
        if (addr) {
          const parts = addr.split(',').slice(0, 2).map((s) => s.trim()).join(', ');
          setGpsAddress(parts);
          const resolvedText = `My Current Location (${parts})`;
          setSelectedStart({
            name: resolvedText,
            lat: currentGpsCoords.lat,
            lng: currentGpsCoords.lng
          });
          setStartQuery(resolvedText);
        }
      });
    }
  }, [currentGpsCoords]);

  const getCurrentLocationLabel = () => {
    return gpsAddress ? `My Current Location (${gpsAddress})` : 'My Current Location';
  };

  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    setSelectedDest(null);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);

    // Ensure current location and destination are filled together
    if (!startQuery.trim()) {
      const loc = getCurrentLocationLabel();
      setStartQuery(loc);
      if (currentGpsCoords) {
        setSelectedStart({ name: loc, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng });
      }
    }

    if (val.trim().length >= 3) {
      destDebounceRef.current = setTimeout(async () => {
        setIsSearchingDest(true);
        const results = await routingService.searchPlaces(val);
        setDestSuggestions(results);
        setIsSearchingDest(false);
      }, 350);
    } else {
      setDestSuggestions([]);
    }
  };

  // When a destination suggestion is chosen: BOTH Current Location & Destination are filled together!
  const handleSelectDestSuggestion = (item: LocationSearchResult) => {
    const locText = getCurrentLocationLabel();

    // Fill current location and destination together!
    setStartQuery(locText);
    setSelectedStart(
      currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 }
    );

    setSelectedDest(item);
    setDestQuery(item.name.split(',')[0]);
    setDestSuggestions([]);
  };

  // When a preset tour is selected: BOTH Current Location & Destination are filled together!
  const handleSelectPresetTour = (preset: typeof PRESET_TOURS[0]) => {
    const locText = getCurrentLocationLabel();

    const startPt = currentGpsCoords
      ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 };

    // Fill current location and destination together!
    setStartQuery(locText);
    setSelectedStart(startPt);
    setSelectedDest(preset.dest);
    setDestQuery(preset.dest.name.split(',')[0]);
    setDestSuggestions([]);
  };

  const handleLaunchSolo = async () => {
    if (!selectedDest) {
      alert('Without putting a destination location, you cannot start the ride.');
      return;
    }

    const startPt = (startQuery.trim() && selectedStart && !startQuery.startsWith('My Current Location'))
      ? selectedStart
      : (currentGpsCoords
        ? { name: getCurrentLocationLabel(), lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: 'Current GPS', lat: 18.5204, lng: 73.8567 });

    setIsStartingSolo(true);
    try {
      await onStartSoloRide(startPt, selectedDest);
    } finally {
      setIsStartingSolo(false);
    }
  };

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onCreateGroup(createTitle.trim() || `${currentProfile.name}'s Convoy`, targetSpeed);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await onJoinGroup(joinCode.trim().toUpperCase());
    } catch (err: any) {
      setJoinError(err?.message || 'Could not find convoy group. Verify code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full min-h-dvh h-dvh bg-[#050811] flex justify-center items-stretch sm:items-center overflow-hidden">
      {/* Mobile App Viewport: fills mobile phone screen naturally, centered mobile frame on desktop */}
      <div className="w-full max-w-md h-full min-h-dvh max-h-dvh flex flex-col justify-between bg-[#0b0f19] text-black font-sans select-none relative overflow-hidden sm:border-2 sm:border-black sm:shadow-[6px_6px_0px_#000] sm:rounded-2xl safe-pt safe-pb">
        
        {/* Decluttered Mobile Header Bar */}
        <header className="px-3.5 py-2.5 border-b-2 border-black bg-white flex items-center justify-between shrink-0 shadow-[0_2px_0px_#000]">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#ef4444] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-black">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-black leading-none">
                Riders United
              </h1>
              <span className="text-[9px] text-[#2563eb] font-mono font-bold leading-none">
                100% Real GPS • Zero Bots
              </span>
            </div>
          </div>

          {/* Profile Chip (Tap to Edit) */}
          <button
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform"
            title="Edit Rider Profile"
          >
            <div
              className="w-4 h-4 rounded-full border border-black shrink-0"
              style={{ backgroundColor: currentProfile.avatarColor }}
            />
            <span className="text-[10px] font-black text-black truncate max-w-[80px]">
              {currentProfile.callsign}
            </span>
            <Edit3 className="w-3 h-3 text-[#2563eb] shrink-0" />
          </button>
        </header>

        {/* Mobile Segmented Tab Switcher */}
        <div className="px-3 pt-2.5 shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-black p-1 rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_#000]">
            <button
              type="button"
              onClick={() => setActiveTab('solo')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
                activeTab === 'solo'
                  ? 'bg-[#2563eb] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Solo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
                activeTab === 'join'
                  ? 'bg-[#ef4444] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Main Content Area (Properly distributes vertical space with zero dead space) */}
        <main className="flex-1 flex flex-col justify-between p-3 overflow-y-auto space-y-3">
          
          {/* TAB 1: SOLO RIDE MODE */}
          {activeTab === 'solo' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-fadeIn">
              
              {/* Route Input Box (Current Location & Destination Filled Together) */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black flex items-center space-x-1">
                    <Navigation className="w-3 h-3 text-[#2563eb]" />
                    <span>Plan Route: Current Location ➔ Destination</span>
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-[#2563eb] border border-black">
                    Live GPS
                  </span>
                </div>

                {/* Connected Input Fields */}
                <div className="relative space-y-2">
                  {/* Start Point: Automatically Filled with Current Location */}
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-[10px] font-black border border-black shadow-[1px_1px_0px_#000] shrink-0">
                      A
                    </div>
                    <input
                      type="text"
                      value={startQuery}
                      onChange={(e) => {
                        setStartQuery(e.target.value);
                        if (!e.target.value.trim() && currentGpsCoords) {
                          setSelectedStart({
                            name: getCurrentLocationLabel(),
                            lat: currentGpsCoords.lat,
                            lng: currentGpsCoords.lng
                          });
                        }
                      }}
                      placeholder="My Current Location (GPS)"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg pl-9 pr-14 py-2 text-xs text-black font-mono font-bold focus:outline-none focus:bg-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const loc = getCurrentLocationLabel();
                        setStartQuery(loc);
                        if (currentGpsCoords) {
                          setSelectedStart({ name: loc, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng });
                        }
                      }}
                      className="absolute right-2 text-[#2563eb] text-[9px] font-mono font-black flex items-center space-x-0.5 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                      title="Reset to current live GPS"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      <span>GPS</span>
                    </button>
                  </div>

                  {/* Destination Point: Filled together with Current Location */}
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-black border border-black shadow-[1px_1px_0px_#000] shrink-0">
                      B
                    </div>
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => handleDestInputChange(e.target.value)}
                      placeholder="Where to? (Enter destination city, beach, ghat)"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg pl-9 pr-8 py-2 text-xs text-black font-mono font-bold focus:outline-none focus:bg-white placeholder:text-slate-500"
                    />
                    {isSearchingDest && (
                      <Loader2 className="absolute right-2.5 w-4 h-4 text-[#2563eb] animate-spin" />
                    )}
                    {destQuery && !isSearchingDest && (
                      <button
                        type="button"
                        onClick={() => {
                          setDestQuery('');
                          setSelectedDest(null);
                          setDestSuggestions([]);
                        }}
                        className="absolute right-2.5 text-slate-400 hover:text-black font-black text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-[4px_4px_0px_#000] rounded-lg p-1 z-50 max-h-48 overflow-y-auto">
                      {destSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDestSuggestion(item)}
                          className="w-full text-left p-2 rounded hover:bg-blue-50 text-xs text-black transition-colors flex items-start space-x-2 truncate font-bold border-b border-slate-100 last:border-b-0"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#ef4444] shrink-0 mt-0.5" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Both Destination & Current Location Filled Together Confirmation Card */}
                {selectedDest && (
                  <div className="bg-emerald-50 border-2 border-black rounded-lg p-2.5 text-xs flex items-center justify-between shadow-[1.5px_1.5px_0px_#000]">
                    <div className="truncate pr-2">
                      <span className="text-[9px] font-black uppercase text-emerald-800 block leading-tight">
                        ✓ Route Pair Locked
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5 text-xs font-black text-black truncate">
                        <span className="text-[#2563eb] truncate">{startQuery || 'My Current Location'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-black shrink-0" />
                        <span className="text-[#ef4444] truncate">{selectedDest.name.split(',')[0]}</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500 text-white font-black text-[9px] uppercase shrink-0 border border-black shadow-[1px_1px_0px_#000]">
                      Ready
                    </span>
                  </div>
                )}
              </div>

              {/* Popular Motorcycle Destinations (1-Tap from Current Location) */}
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-300 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Popular Motorcycle Runs (From Current Location)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 flex-1">
                  {PRESET_TOURS.map((tour, idx) => {
                    const isSelected = selectedDest?.name === tour.dest.name || destQuery === tour.dest.name.split(',')[0];

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPresetTour(tour)}
                        className={`text-left p-2.5 rounded-xl border-2 border-black transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-[#2563eb] shadow-[2.5px_2.5px_0px_#2563eb]'
                            : 'bg-white hover:bg-slate-50 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs text-black truncate block">
                              {tour.name}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-[#2563eb] text-white text-[8px] font-black uppercase border border-black">
                                ✓ Locked
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-600 font-bold block truncate mt-0.5">
                            {tour.desc}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#2563eb] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOIN SQUAD CONVOY */}
          {activeTab === 'join' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-fadeIn">
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-black">
                  <div className="w-7 h-7 rounded-lg bg-[#ef4444] text-white flex items-center justify-center font-black border border-black shadow-[1px_1px_0px_#000]">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-black leading-tight">
                      Join Active Convoy
                    </h3>
                    <p className="text-[10px] text-slate-600 font-bold">
                      Enter the 6-character room code from your Captain.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleJoinSubmit} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-800 mb-1">
                      CONVOY ROOM CODE
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="RD-..."
                      inputMode="text"
                      autoCapitalize="characters"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-3 text-center text-2xl font-mono font-black tracking-widest text-black focus:outline-none focus:bg-white uppercase"
                      required
                    />
                  </div>

                  {joinError && (
                    <p className="text-[11px] font-bold text-[#ef4444] bg-red-50 border border-black p-2 rounded-lg">
                      {joinError}
                    </p>
                  )}
                </form>
              </div>

              {/* Informational feature card */}
              <div className="bg-slate-900 border-2 border-black rounded-xl p-3 text-white space-y-1.5 shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-mono font-black text-blue-400 uppercase block">
                  ✓ Real-time group navigation:
                </span>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  • Phone GPS links live to the squad map.<br />
                  • See Road Captain & Sweeper positions in landscape.<br />
                  • Hold PTT button for real-time walkie-talkie audio.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE CONVOY GROUP */}
          {activeTab === 'create' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-fadeIn">
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-black">
                  <div className="w-7 h-7 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-black border border-black shadow-[1px_1px_0px_#000]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-black leading-tight">
                      Establish Convoy Room
                    </h3>
                    <p className="text-[10px] text-slate-600 font-bold">
                      You will lead the squadron as Road Captain.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-800 mb-1">
                      Convoy / Trip Title
                    </label>
                    <input
                      type="text"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="e.g. Sunday Morning Ghat Run"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-800 mb-1">
                      Target Cruise Speed: <span className="text-[#2563eb] font-mono">{targetSpeed} km/h</span>
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      step="5"
                      value={targetSpeed}
                      onChange={(e) => setTargetSpeed(Number(e.target.value))}
                      className="w-full accent-[#2563eb] cursor-pointer"
                    />
                  </div>
                </form>
              </div>

              {/* Informational captain card */}
              <div className="bg-slate-900 border-2 border-black rounded-xl p-3 text-white space-y-1.5 shadow-[2px_2px_0px_#000]">
                <span className="text-[10px] font-mono font-black text-red-400 uppercase block">
                  👑 Captain Responsibilities:
                </span>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  • Lock the convoy route before flagging off.<br />
                  • Share room code with members via WhatsApp.<br />
                  • Broadcast voice commands to the pack.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Sticky Mobile Bottom Action Bar */}
        <footer className="p-3 bg-white border-t-2 border-black shrink-0 shadow-[0_-2px_0px_#000]">
          {activeTab === 'solo' && (
            <button
              type="button"
              onClick={handleLaunchSolo}
              disabled={!selectedDest || isStartingSolo}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider border-2 border-black transition-all flex items-center justify-center space-x-2 ${
                selectedDest && !isStartingSolo
                  ? 'bg-[#2563eb] hover:bg-blue-700 text-white shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-slate-200 text-slate-500 border-slate-400 cursor-not-allowed opacity-80'
              }`}
            >
              {isStartingSolo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculating Route...</span>
                </>
              ) : selectedDest ? (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Launch Solo Navigation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>⛔ Put Destination to Start Ride</span>
              )}
            </button>
          )}

          {activeTab === 'join' && (
            <button
              type="button"
              onClick={handleJoinSubmit}
              disabled={isJoining || !joinCode.trim()}
              className="w-full py-3.5 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{isJoining ? 'Connecting...' : 'Connect to Squad'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={handleCreateSubmit}
              disabled={isCreating}
              className="w-full py-3.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{isCreating ? 'Creating Room...' : 'Create Convoy Lobby'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </footer>
      </div>

      {/* Profile Edit Modal */}
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
