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
    desc: 'Coastal highway & scenic ghats • 550 KM',
    dest: { name: 'Baga Beach, Goa', lat: 15.5553, lng: 73.7517 }
  },
  {
    name: 'Current Location ➔ Lonavala',
    destTitle: 'Lonavala Ghats, Maharashtra',
    desc: 'Western Ghats twisties • 85 KM',
    dest: { name: 'Lonavala Ghats, Maharashtra', lat: 18.7557, lng: 73.4091 }
  },
  {
    name: 'Current Location ➔ Lavasa',
    destTitle: 'Lavasa Ridge, Maharashtra',
    desc: 'Mountain switchbacks • 65 KM',
    dest: { name: 'Lavasa, Maharashtra', lat: 18.4102, lng: 73.5074 }
  },
  {
    name: 'Current Location ➔ Mahabaleshwar',
    destTitle: 'Venna Lake, Mahabaleshwar',
    desc: 'Sahyadri high pass • 125 KM',
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

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/join/${ride.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const inviteUrl = `${window.location.origin}/join/${ride.code}`;
    const text = `🏍️ Join our Riders United convoy squad! Ride Code: *${ride.code}*\n\nTap to join live convoy telemetry: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const hasDestination = Boolean(ride.activeRoute && ride.activeRoute.destName);
  const ridersList = ride.riders || [];

  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    setSelectedDest(null);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);

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

  const handleSelectDestSuggestion = async (item: LocationSearchResult) => {
    const locText = getCurrentLocationLabel();
    const startPt = currentGpsCoords
      ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 };

    setStartQuery(locText);
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
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
            Captain
          </span>
        );
      case 'sweeper':
        return (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
            Sweeper
          </span>
        );
      case 'scout':
        return (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
            Scout
          </span>
        );
      default:
        return (
          <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold uppercase">
            Pack
          </span>
        );
    }
  };

  return (
    <div className="mobile-app-viewport w-full min-h-dvh bg-[#0d0f14] flex justify-center items-stretch sm:items-center overflow-hidden">
      {/* Mobile App Viewport Container */}
      <div className="staging-lobby-shell w-full max-w-[430px] h-full sm:h-[92dvh] sm:max-h-[900px] flex flex-col bg-[#F7F8FA] text-[#111827] font-sans relative overflow-hidden sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] sm:border sm:border-gray-800/20">

        {/* Mobile Header Bar */}
        <header className="px-5 pt-4 pb-3 bg-white flex items-center justify-between shrink-0 border-b border-gray-150">
          <button
            type="button"
            onClick={onLeaveRide}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200/80 flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all"
            title="Leave Lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center truncate px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
              Staging Lobby
            </span>
            <h1 className="text-sm font-bold text-gray-900 truncate max-w-[180px] leading-tight mt-0.5">
              {ride.title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-800 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE</span>
          </div>
        </header>

        {/* Scrollable Mobile Body */}
        <main className="mobile-app-content flex-1 overflow-y-auto p-5 space-y-4">
          {/* Room Code & Share Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Convoy Room Code
            </span>
            <div className="mt-1.5">
              <span className="text-2xl font-bold font-mono tracking-widest bg-gray-50 px-5 py-2 rounded-2xl border border-gray-200/80 text-gray-900 inline-block shadow-inner">
                {ride.code}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Share code with riders to join on phone
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full mt-3.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 rounded-full bg-[#25D366] hover:bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Convoy Route & Destination */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Convoy Destination
                </h3>
              </div>

              {hasDestination ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                  ✓ Locked
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold text-[10px] uppercase animate-pulse">
                  Required
                </span>
              )}
            </div>

            {hasDestination && !isChangingRoute ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900 truncate">
                    <span className="text-blue-600 truncate">{ride.activeRoute?.startName?.split(',')[0] || 'My Current Location'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-red-500 truncate">{ride.activeRoute?.destName.split(',')[0]}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-gray-200/80 text-xs font-medium">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Total Distance</span>
                      <span className="text-gray-900 font-bold">{ride.activeRoute?.distanceKm} KM</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Est. Ride Time</span>
                      <span className="text-gray-900 font-bold">
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
                    className="w-full py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Change Convoy Route</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isLeader ? (
                  <div className="space-y-3">
                    <div className="relative space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-3 w-2 h-2 rounded-full bg-blue-600" />
                        <input
                          type="text"
                          value={startQuery}
                          onChange={(e) => setStartQuery(e.target.value)}
                          placeholder="Point A (Current Location)"
                          className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl pl-8 pr-12 py-2.5 text-xs text-gray-800 font-medium focus:bg-white focus:outline-none"
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
                          className="absolute right-2.5 top-2.5 text-[10px] font-semibold text-blue-600 flex items-center gap-0.5 hover:underline"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>GPS</span>
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-3 w-2 h-2 rounded-full bg-red-500" />
                        <input
                          type="text"
                          value={destQuery}
                          onChange={(e) => handleDestInputChange(e.target.value)}
                          placeholder="Where is convoy heading? (City, beach, ghat)"
                          className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl pl-8 pr-8 py-2.5 text-xs text-gray-800 font-medium focus:bg-white focus:outline-none"
                        />
                        {isSearchingDest && (
                          <Loader2 className="absolute right-3 top-3 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                      </div>

                      {destSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-150 z-30 max-h-48 overflow-y-auto divide-y divide-gray-100">
                          {destSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectDestSuggestion(item)}
                              className="w-full text-left p-3 hover:bg-gray-50 text-xs text-gray-800 transition-colors flex items-start gap-2"
                            >
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              <span className="truncate font-medium">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isCalculatingRoute && (
                      <div className="p-3 bg-blue-50 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Calculating Convoy Road Route & Waypoints...</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase block mb-1.5">
                        Or Pick Popular Convoy Corridor (1-Tap):
                      </span>
                      <div className="space-y-1.5">
                        {PRESET_TOURS.map((tour, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPresetTour(tour)}
                            className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-150 text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors"
                          >
                            <span className="truncate">{tour.name}</span>
                            <span className="text-[10px] text-blue-600 font-bold ml-1 shrink-0">
                              Lock Route ➔
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 text-center text-xs text-gray-600 font-medium">
                    Road Captain is setting the convoy destination. Once locked, it will appear here immediately.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connected Squadron */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Connected Squadron ({ridersList.length})
                </h3>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">100% Real GPS</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ridersList.map((r) => {
                const isMe = r.id === currentRiderId;

                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                      isMe ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-150'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: r.avatarColor || '#18191D' }}
                    >
                      <Bike className="w-4 h-4 text-white" />
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-gray-900 truncate">{r.name}</span>
                        {isMe && (
                          <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {r.callsign} • {r.bikeModel}
                      </p>
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

        {/* Sticky Mobile Bottom Bar */}
        <footer className="p-4 bg-white/95 backdrop-blur border-t border-gray-150 shrink-0">
          {isLeader ? (
            hasDestination ? (
              <button
                type="button"
                onClick={onStartRide}
                className="w-full py-4 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
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
                className="w-full py-4 rounded-full bg-gray-200 text-gray-500 font-semibold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Set Destination to Start</span>
              </button>
            )
          ) : (
            <div className="w-full py-3.5 rounded-full bg-gray-100 flex items-center justify-center gap-2 text-xs font-semibold text-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
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
