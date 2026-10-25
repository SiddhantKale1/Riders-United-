import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Play,
  ArrowLeft,
  Navigation,
  MapPin,
  Clock,
  Sparkles,
  Search,
  Loader2,
  Edit2,
  Crosshair,
  ArrowRight,
  Bike
} from 'lucide-react';
import { RideChannel, Rider, RiderRole } from '../types';
import { routingService, LocationSearchResult } from '../services/routingService';

interface StagingLobbyProps {
  ride: RideChannel;
  currentRiderId: string;
  isLeader: boolean;
  onStartRide: () => void;
  onLeaveRide: () => void;
  onRouteSelected: (
    start: { name: string; lat: number; lng: number },
    dest: { name: string; lat: number; lng: number }
  ) => Promise<void> | void;
  currentGpsCoords?: { lat: number; lng: number } | null;
}

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
    desc: 'Western Ghats twisties • 125 KM',
    dest: { name: 'Venna Lake, Mahabaleshwar', lat: 17.9237, lng: 73.6586 }
  }
];

export const StagingLobby: React.FC<StagingLobbyProps> = ({
  ride,
  currentRiderId,
  isLeader,
  onStartRide,
  onLeaveRide,
  onRouteSelected,
  currentGpsCoords
}) => {
  const [copied, setCopied] = useState(false);
  const [isChangingRoute, setIsChangingRoute] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Both Start (Current Location) and Destination filled together
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

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?code=${ride.code}`
    : `/?code=${ride.code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join my motorcycle convoy "${ride.title}" on Riders United!\nRoom Code: ${ride.code}\nDirect Link: ${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const ridersList: Rider[] = Array.isArray(ride.riders) ? ride.riders : [];

  const hasDestination = Boolean(
    ride.activeRoute &&
    ride.activeRoute.coordinates &&
    ride.activeRoute.coordinates.length > 0
  );

  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    setSelectedDest(null);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);

    // Ensure start location is also filled together
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
  const handleSelectDestSuggestion = async (item: LocationSearchResult) => {
    const locText = getCurrentLocationLabel();

    const startPt = (startQuery.trim() && selectedStart && !startQuery.startsWith('My Current Location'))
      ? selectedStart
      : (currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 });

    setStartQuery(startPt.name);
    setSelectedStart(startPt);
    setSelectedDest(item);
    setDestQuery(item.name.split(',')[0]);
    setDestSuggestions([]);

    setIsCalculatingRoute(true);
    try {
      await onRouteSelected(startPt, item);
      setIsChangingRoute(false);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // When a preset tour is selected: BOTH Current Location & Destination are filled together!
  const handleSelectPresetTour = async (preset: typeof PRESET_TOURS[0]) => {
    const locText = getCurrentLocationLabel();

    const startPt = currentGpsCoords
      ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 };

    setStartQuery(locText);
    setSelectedStart(startPt);
    setSelectedDest(preset.dest);
    setDestQuery(preset.dest.name.split(',')[0]);
    setDestSuggestions([]);

    setIsCalculatingRoute(true);
    try {
      await onRouteSelected(startPt, preset.dest);
      setIsChangingRoute(false);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const getRoleBadge = (role: RiderRole) => {
    switch (role) {
      case 'leader':
        return (
          <span className="text-[9px] bg-[#ef4444] text-white border border-black px-1.5 py-0.2 rounded font-black uppercase shadow-[1px_1px_0px_#000]">
            CAPTAIN
          </span>
        );
      case 'sweeper':
        return (
          <span className="text-[9px] bg-[#2563eb] text-white border border-black px-1.5 py-0.2 rounded font-black uppercase shadow-[1px_1px_0px_#000]">
            SWEEPER
          </span>
        );
      case 'scout':
        return (
          <span className="text-[9px] bg-amber-400 text-black border border-black px-1.5 py-0.2 rounded font-black uppercase shadow-[1px_1px_0px_#000]">
            SCOUT
          </span>
        );
      default:
        return (
          <span className="text-[9px] bg-slate-200 text-black border border-black px-1.5 py-0.2 rounded font-black uppercase">
            PACK
          </span>
        );
    }
  };

  return (
    <div className="mobile-app-viewport w-full bg-[#050811] flex justify-center items-stretch sm:items-center overflow-hidden">
      {/* Mobile App Viewport Container */}
      <div className="staging-lobby-shell w-full max-w-md h-full min-h-0 flex flex-col bg-[#0b0f19] text-black font-sans relative overflow-hidden sm:border-2 sm:border-black sm:shadow-[6px_6px_0px_#000] sm:rounded-2xl">
        
        {/* Mobile Header Bar */}
        <header className="px-3 py-2.5 border-b-2 border-black bg-white flex items-center justify-between shrink-0 shadow-[0_2px_0px_#000]">
          <button
            onClick={onLeaveRide}
            className="min-h-11 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-[10px] font-black flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main</span>
          </button>

          <div className="text-center truncate px-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#2563eb] font-mono bg-blue-100 px-1.5 py-0.2 rounded border border-black inline-block">
              STAGING LOBBY
            </span>
            <h1 className="text-xs font-black uppercase text-black truncate max-w-[180px] leading-tight">
              {ride.title}
            </h1>
          </div>

          <div className="flex items-center space-x-1 bg-emerald-50 border border-black px-2 py-0.5 rounded text-[9px] font-black text-emerald-800 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE</span>
          </div>
        </header>

        {/* Scrollable Mobile Body */}
        <main className="mobile-app-content flex-1 overflow-y-auto p-3 space-y-3">
          {/* Room Code & Share Card */}
          <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-mono font-black text-slate-600 uppercase">
              Convoy Room Code
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black font-mono tracking-widest bg-slate-100 px-4 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] text-black">
                {ride.code}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-700 mt-1.5">
              Share code or link with riders to join on phone
            </p>

            <div className="grid grid-cols-2 gap-2 w-full mt-2.5">
              <button
                onClick={handleCopyLink}
                className="py-2 rounded-lg bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-black flex items-center justify-center space-x-1.5 transition-transform"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#2563eb]" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="py-2 rounded-lg bg-[#25D366] hover:bg-emerald-500 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-black flex items-center justify-center space-x-1.5 transition-transform"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Convoy Route & Destination (Current Location & Destination Inputted Together) */}
          <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-black">
              <div className="flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#2563eb]" />
                <h3 className="text-xs font-black uppercase text-black">Convoy Route & Destination</h3>
              </div>

              {hasDestination ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-black font-black text-[9px] uppercase shadow-[1px_1px_0px_#000]">
                  ✓ Route Locked
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-[#ef4444] border border-black font-black text-[9px] uppercase animate-pulse">
                  * Dest. Required
                </span>
              )}
            </div>

            {hasDestination && !isChangingRoute ? (
              <div className="space-y-2">
                <div className="bg-slate-50 border-2 border-black rounded-lg p-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-black truncate">
                    <span className="text-[#2563eb] truncate">{ride.activeRoute?.startName?.split(',')[0] || 'My Current Location'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black shrink-0" />
                    <span className="text-[#ef4444] truncate">{ride.activeRoute?.destName.split(',')[0]}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs font-mono font-bold">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Total Distance</span>
                      <span className="text-[#2563eb] font-black">{ride.activeRoute?.distanceKm} KM</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Est. Ride Time</span>
                      <span className="text-[#ef4444] font-black">
                        {Math.floor((ride.activeRoute?.durationMinutes || 0) / 60)}h{' '}
                        {(ride.activeRoute?.durationMinutes || 0) % 60}m
                      </span>
                    </div>
                  </div>
                </div>

                {isLeader && (
                  <button
                    type="button"
                    onClick={() => setIsChangingRoute(true)}
                    className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-black border border-black font-black text-[11px] flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-[#2563eb]" />
                    <span>Change Convoy Route</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {isLeader ? (
                  <div className="space-y-2">
                    {/* Connected Input Fields (Current Location [A] & Destination [B] Filled Together) */}
                    <div className="relative space-y-2">
                      {/* Point A: Start / Current Location */}
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

                      {/* Point B: Destination Search Input */}
                      <div className="relative flex items-center">
                        <div className="absolute left-2.5 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-black border border-black shadow-[1px_1px_0px_#000] shrink-0">
                          B
                        </div>
                        <input
                          type="text"
                          value={destQuery}
                          onChange={(e) => handleDestInputChange(e.target.value)}
                          placeholder="Where is convoy heading? (City, beach, ghat)"
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

                      {/* Suggestions Dropdown */}
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

                    {/* Calculating Route Loader Banner */}
                    {isCalculatingRoute && (
                      <div className="p-2.5 bg-blue-50 border-2 border-black rounded-lg flex items-center justify-center space-x-2 text-xs font-black text-[#2563eb] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Calculating Convoy Road Route & Fuel Stops...</span>
                      </div>
                    )}

                    {/* Quick 1-Tap Preset Tours from Current Location */}
                    <div>
                      <span className="text-[9px] font-black text-slate-600 flex items-center space-x-1 mb-1 uppercase">
                        <Sparkles className="w-3 h-3 text-[#2563eb]" />
                        <span>Or Pick Popular Convoy Run (1-Tap)</span>
                      </span>

                      <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                        {PRESET_TOURS.map((tour, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPresetTour(tour)}
                            className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-blue-50 border border-black text-xs font-bold text-black flex items-center justify-between transition-colors"
                          >
                            <span className="truncate">{tour.name}</span>
                            <span className="text-[9px] text-[#2563eb] shrink-0 ml-1 font-mono">
                              Lock Route ➔
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasDestination && (
                      <button
                        type="button"
                        onClick={() => setIsChangingRoute(false)}
                        className="w-full py-1 text-center text-[10px] font-black text-slate-500 hover:text-black underline"
                      >
                        Cancel & keep current locked route
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border-2 border-black rounded-lg text-center text-xs font-bold text-[#2563eb]">
                    Road Captain is setting the convoy destination. Once locked, it will appear here immediately.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connected Squadron (Zero Bots • Pure Mobile List) */}
          <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-black">
              <div className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-[#ef4444]" />
                <h3 className="text-xs font-black uppercase text-black">
                  Connected Squadron ({ridersList.length})
                </h3>
              </div>
              <span className="text-[9px] text-slate-500 font-mono font-bold">100% Real GPS</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ridersList.map((r) => {
                const isMe = r.id === currentRiderId;

                return (
                  <div
                    key={r.id}
                    className={`p-2 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center space-x-2 ${
                      isMe ? 'bg-blue-50' : 'bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: r.avatarColor || '#2563eb' }}
                    >
                      <Bike className="w-4 h-4 text-white" />
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center space-x-1 truncate">
                        <span className="font-black text-xs text-black truncate">{r.name}</span>
                        {isMe && (
                          <span className="text-[8px] bg-[#2563eb] text-white font-black px-1 rounded border border-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-slate-600 font-mono truncate">
                        {r.callsign} • {r.bikeModel}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getRoleBadge(r.role)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Sticky Mobile Bottom Bar (Start Convoy Ride Action) */}
        <footer className="staging-lobby-footer p-3 pt-2 bg-white border-t-2 border-black shrink-0 shadow-[0_-2px_0px_#000]">
          {isLeader ? (
            hasDestination ? (
              <button
                type="button"
                onClick={onStartRide}
                className="w-full py-3.5 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center space-x-2 transition-transform"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Convoy Ride</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsChangingRoute(true);
                  alert('A destination is strictly required to start the ride! Please select a destination above.');
                }}
                className="w-full py-3.5 rounded-xl bg-slate-200 text-slate-500 font-black text-xs uppercase tracking-wider border-2 border-slate-400 cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Set Destination to Start</span>
              </button>
            )
          ) : (
            <div className="w-full py-2.5 rounded-xl bg-blue-50 border-2 border-black flex items-center justify-center space-x-2 text-xs font-mono font-bold text-[#2563eb]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] animate-ping" />
              <span>
                {hasDestination ? "Route Locked! Awaiting Captain's Flag-off..." : "Waiting for Captain to set route..."}
              </span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
