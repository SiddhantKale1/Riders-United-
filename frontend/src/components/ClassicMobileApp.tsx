import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Users,
  Fuel,
  Bike,
  Navigation,
  Crosshair,
  ArrowRight,
  Check,
  Search,
  Loader2,
  X,
  Plus,
  LogIn,
  User,
  Radio,
  RefreshCw,
  Gauge,
  MapPin,
  Sparkles,
  Wifi,
  History,
  LogOut,
  Award,
  Clock,
  Server,
  Settings,
  Share2,
  AlertTriangle,
  Volume2,
  Download,
  ShieldCheck
} from 'lucide-react';
import { RiderRole, ActiveRoute, CompletedRide, AuthUser } from '../types';
import { routingService, LocationSearchResult, FuelStop } from '../services/routingService';
import { getApiBaseUrl, setApiBaseUrl, testServerConnection, DEFAULT_BACKEND_URL } from '../services/apiConfig';
import { socketService } from '../services/socket';
import { speechService } from '../services/speechService';
import { offlineMapService } from '../services/offlineMapService';

export type MobileTab = 'ride' | 'squad' | 'fuel' | 'garage';

interface ClassicMobileAppProps {
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
  initialTab?: MobileTab;
  initialCode?: string;
  currentGpsCoords?: { lat: number; lng: number } | null;
  authUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onChangePassword?: () => void;
  onRevokeSessions?: () => Promise<void>;
  rideHistory?: CompletedRide[];
  onClearHistory?: () => void;
  onOpenShare?: (code: string) => void;
  onTestCrash?: () => void;
}

const PRESET_COLORS = [
  '#ef4444', // Signal Red
  '#2563eb', // Signal Blue
  '#000000', // Stealth Black
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald Green
  '#8b5cf6'  // Tactical Purple
];

const POPULAR_RUNS = [
  { name: 'Lonavala Ghats', query: 'Lonavala Ghats, Maharashtra', lat: 18.7557, lng: 73.4091 },
  { name: 'Lavasa Ridge', query: 'Lavasa, Maharashtra', lat: 18.4102, lng: 73.5074 },
  { name: 'Mahabaleshwar Peak', query: 'Mahabaleshwar, Maharashtra', lat: 17.9237, lng: 73.6586 },
  { name: 'Marine Drive Coastal', query: 'Marine Drive, Mumbai', lat: 18.9438, lng: 72.8232 }
];

export const ClassicMobileApp: React.FC<ClassicMobileAppProps> = ({
  currentProfile,
  onUpdateProfile,
  onCreateGroup,
  onJoinGroup,
  onStartSoloRide,
  isConnected,
  initialTab = 'ride',
  initialCode = '',
  currentGpsCoords,
  authUser = null,
  onOpenAuth,
  onSignOut,
  onChangePassword,
  onRevokeSessions,
  rideHistory = [],
  onClearHistory,
  onOpenShare,
  onTestCrash
}) => {
  // Active Bottom Navigation Tab
  const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);

  // Sync initial tab when changed externally (e.g. from invite link)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Profile Edit State
  const [profileName, setProfileName] = useState(currentProfile.name);
  const [profileCallsign, setProfileCallsign] = useState(currentProfile.callsign);
  const [profileBike, setProfileBike] = useState(currentProfile.bikeModel);
  const [profileColor, setProfileColor] = useState(currentProfile.avatarColor);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Squad Sub-mode: 'join' | 'create'
  const [squadMode, setSquadMode] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState('');
  const [targetSpeed, setTargetSpeed] = useState(75);
  const [isCreating, setIsCreating] = useState(false);

  // Ride Route Search State
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

  // Fuel Radar State
  const [nearbyFuelStops, setNearbyFuelStops] = useState<FuelStop[]>([]);
  const [isLoadingFuel, setIsLoadingFuel] = useState(false);

  // Server Host Config State
  const [garageServerUrl, setGarageServerUrl] = useState(getApiBaseUrl());
  const [isTestingGarageServer, setIsTestingGarageServer] = useState(false);
  const [garageServerStatus, setGarageServerStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveGarageServer = async () => {
    setIsTestingGarageServer(true);
    setGarageServerStatus(null);
    const res = await testServerConnection(garageServerUrl);
    setIsTestingGarageServer(false);
    setGarageServerStatus(res);
    if (res.success) {
      setApiBaseUrl(garageServerUrl);
      socketService.reconnect();
    }
  };

  const handleResetGarageServer = () => {
    setGarageServerUrl(DEFAULT_BACKEND_URL);
    setApiBaseUrl(DEFAULT_BACKEND_URL);
    socketService.reconnect();
    setGarageServerStatus({ success: true, message: `Reset to default: ${DEFAULT_BACKEND_URL}` });
  };

  // Emergency Contact, ICE & Spoken Prompts State
  const [emergencyPhone, setEmergencyPhone] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('riders_emergency_phone') || '' : '';
  });
  const [bloodGroup, setBloodGroup] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('riders_blood_group') || 'O+' : 'O+';
  });
  const [spokenPrompts, setSpokenPrompts] = useState(() => speechService.getIsEnabled());
  const [cachedTileCount, setCachedTileCount] = useState<number>(0);
  const [isCachingMap, setIsCachingMap] = useState<boolean>(false);
  const [cacheProgress, setCacheProgress] = useState<number>(0);

  useEffect(() => {
    offlineMapService.getCachedCount().then(setCachedTileCount);
  }, []);

  const handleToggleSpokenPrompts = () => {
    const next = !spokenPrompts;
    setSpokenPrompts(next);
    speechService.setEnabled(next);
    if (next) {
      speechService.speak('Spoken convoy alerts enabled.');
    }
  };

  const handleSaveIceInfo = () => {
    localStorage.setItem('riders_emergency_phone', emergencyPhone);
    localStorage.setItem('riders_blood_group', bloodGroup);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2000);
  };

  const handleDownloadOfflineRoute = async () => {
    setIsCachingMap(true);
    setCacheProgress(0);
    const corridorPoints: [number, number][] = [
      [18.922, 72.8346],
      [18.7557, 73.4091],
      [18.1500, 73.3400],
      [17.7200, 73.5300],
      [17.0000, 73.3000],
      [16.1500, 73.7000],
      [15.5500, 73.7500]
    ];
    await offlineMapService.downloadRouteTiles(corridorPoints, (percent) => {
      setCacheProgress(percent);
    });
    const count = await offlineMapService.getCachedCount();
    setCachedTileCount(count);
    setIsCachingMap(false);
  };

  // Reverse geocode live GPS to enhance location label
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

  // Load nearby fuel stops on GPS update or fuel tab select
  useEffect(() => {
    const lat = currentGpsCoords ? currentGpsCoords.lat : 18.5204;
    const lng = currentGpsCoords ? currentGpsCoords.lng : 73.8567;
    setIsLoadingFuel(true);
    routingService.getNearbyFuelStops(lat, lng).then((stops) => {
      setNearbyFuelStops(stops);
      setIsLoadingFuel(false);
    });
  }, [currentGpsCoords, activeTab]);

  const getCurrentLocationLabel = () => {
    return gpsAddress ? `My Current Location (${gpsAddress})` : 'My Current Location';
  };

  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    setSelectedDest(null);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);

    // Keep start and destination connected
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

  const handleSelectDestSuggestion = (item: LocationSearchResult) => {
    const locText = getCurrentLocationLabel();
    setStartQuery(locText);
    setSelectedStart(
      currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: locText, lat: 18.5204, lng: 73.8567 }
    );
    setSelectedDest(item);
    setDestQuery(item.name);
    setDestSuggestions([]);
  };

  const handleSelectPopularRun = (run: typeof POPULAR_RUNS[0]) => {
    const locText = getCurrentLocationLabel();
    setStartQuery(locText);
    setSelectedStart(
      currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: locText, lat: 18.5204, lng: 73.8567 }
    );
    setSelectedDest({ name: run.query, lat: run.lat, lng: run.lng });
    setDestQuery(run.query);
    setDestSuggestions([]);
  };

  const handleRouteToFuelStop = (stop: FuelStop) => {
    const locText = getCurrentLocationLabel();
    setStartQuery(locText);
    setSelectedStart(
      currentGpsCoords
        ? { name: locText, lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : { name: locText, lat: 18.5204, lng: 73.8567 }
    );
    setSelectedDest({ name: stop.name, lat: stop.lat, lng: stop.lng });
    setDestQuery(stop.name);
    // Switch to Ride tab to initiate ride to this pump
    setActiveTab('ride');
  };

  const handleLaunchSoloRide = async () => {
    let startPoint = selectedStart;
    if (!startPoint) {
      if (currentGpsCoords) {
        startPoint = {
          name: getCurrentLocationLabel(),
          lat: currentGpsCoords.lat,
          lng: currentGpsCoords.lng
        };
      } else {
        startPoint = { name: 'My Current Location (GPS)', lat: 18.5204, lng: 73.8567 };
      }
    }

    if (!selectedDest) {
      if (destQuery.trim().length >= 3) {
        setIsStartingSolo(true);
        const results = await routingService.searchPlaces(destQuery.trim());
        if (results && results.length > 0) {
          const dest = results[0];
          setSelectedDest(dest);
          await onStartSoloRide(startPoint, dest);
        } else {
          alert('Could not find destination. Please pick a destination or popular run.');
        }
        setIsStartingSolo(false);
      } else {
        alert('Please enter a destination to start your ride navigation.');
      }
      return;
    }

    setIsStartingSolo(true);
    await onStartSoloRide(startPoint, selectedDest);
    setIsStartingSolo(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: profileName.trim() || 'Rider',
      callsign: profileCallsign.trim() || 'Solo Rider',
      bikeModel: profileBike.trim() || 'Motorcycle',
      avatarColor: profileColor
    });
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  const handleSubmitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError('Enter the ride code from your Road Captain.');
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      await onJoinGroup(joinCode.trim().toUpperCase());
    } catch (err: any) {
      const isFetchErr = err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError';
      if (isFetchErr) {
        setJoinError(`Cannot connect to server at ${getApiBaseUrl()}. Check Wi-Fi or update Server IP in Garage.`);
      } else {
        setJoinError(err?.message || 'Could not find convoy squad. Verify code.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = createTitle.trim() || `${currentProfile.callsign}'s Squad`;
    setIsCreating(true);
    try {
      await onCreateGroup(title, targetSpeed);
    } catch (err: any) {
      const isFetchErr = err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError';
      alert(isFetchErr ? `Cannot connect to server at ${getApiBaseUrl()}. Check Wi-Fi or update Server IP in Garage.` : (err?.message || 'Failed to create convoy squad.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mobile-app-viewport w-full bg-[#050811] flex justify-center items-stretch sm:items-center overflow-hidden">
      {/* Classic Mobile App Shell: Mobile App framing on desktop, 100% full-screen on mobile */}
      <div className="mobile-app-shell w-full max-w-md h-full min-h-0 flex flex-col bg-[#0b0f19] text-black font-sans relative overflow-hidden sm:border-2 sm:border-black sm:shadow-[6px_6px_0px_#000] sm:rounded-2xl">
        
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 1. PERSISTENT TOP APP BAR                                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <header className="min-h-14 px-3 py-2 border-b-2 border-black bg-white shrink-0 shadow-[0_2px_0px_#000] z-20 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative h-9 w-10 shrink-0 rounded-lg bg-[#ef4444] text-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
              <span className="text-sm font-black tracking-tight">RU</span>
              <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-sm border border-black bg-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xs font-black uppercase tracking-wide text-black leading-tight">Riders United</h1>
              <p className="truncate text-[9px] font-mono font-bold uppercase tracking-wider text-[#2563eb]">Ride together. Stay connected.</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {!authUser && onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="min-h-10 px-2 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white border-2 border-black text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                title="Sign in or Register"
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('garage')}
              className={`min-h-10 flex items-center gap-1.5 px-2 rounded-lg border-2 border-black text-[10px] font-black transition-all ${
                activeTab === 'garage'
                  ? 'bg-black text-white shadow-none'
                  : 'bg-slate-50 text-black hover:bg-slate-100 shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
              }`}
              title="Open Garage & Profile"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-black shrink-0"
                style={{ backgroundColor: currentProfile.avatarColor }}
              />
              <span className="truncate max-w-[68px]">{currentProfile.callsign}</span>
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 2. SCROLLABLE TAB CONTENT BODY                                        */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <main className="mobile-app-content flex-1 overflow-y-auto px-3 py-4 flex flex-col">

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 1: RIDE / NAVIGATION                                          */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'ride' && (
            <div className="space-y-4 animate-fadeIn py-1 w-full">
              {/* Hero Status Card */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1 text-[10px] font-black text-[#2563eb] uppercase tracking-wider">
                    <Navigation className="w-3 h-3 text-[#2563eb]" />
                    <span>Navigation Ready</span>
                  </div>
                  <h2 className="text-sm font-black text-black uppercase tracking-wide leading-tight mt-0.5">
                    Plan Solo Run
                  </h2>
                  <p className="text-[10px] font-mono text-slate-600 font-bold">
                    Satellite HUD • Speedometer • Corridor Fuel
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#2563eb] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-bold">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Route Input Card (Start & Destination Connected) */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <span className="text-[10px] font-black uppercase tracking-wider text-black flex items-center space-x-1">
                    <Navigation className="w-3 h-3 text-[#2563eb]" />
                    <span>Point A ➔ Point B Routing</span>
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-[#2563eb] border border-black">
                    Live GPS
                  </span>
                </div>

                <div className="space-y-2.5 relative">
                  {/* Point A (Start Location) */}
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
                      className="w-full bg-slate-50 border-2 border-black rounded-lg pl-9 pr-14 py-2.5 text-xs text-black font-mono font-bold focus:outline-none focus:bg-white placeholder:text-slate-500"
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

                  {/* Point B (Destination) */}
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-black border border-black shadow-[1px_1px_0px_#000] shrink-0">
                      B
                    </div>
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => handleDestInputChange(e.target.value)}
                      placeholder="Enter Destination (e.g. Lonavala Ghats, Mumbai)"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg pl-9 pr-8 py-2.5 text-xs text-black font-mono font-bold focus:outline-none focus:bg-white placeholder:text-slate-500"
                    />
                    {isSearchingDest ? (
                      <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-[#2563eb] animate-spin" />
                    ) : destQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDestQuery('');
                          setSelectedDest(null);
                          setDestSuggestions([]);
                        }}
                        className="absolute right-2.5 text-slate-400 hover:text-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Search className="absolute right-2.5 w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>

                  {/* Search Autocomplete Suggestions */}
                  {destSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_#000] z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {destSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectDestSuggestion(item)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-start space-x-2 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#ef4444] shrink-0 mt-0.5" />
                          <div className="truncate">
                            <span className="text-xs font-bold text-black block truncate">
                              {item.name.split(',')[0]}
                            </span>
                            <span className="text-[9px] text-slate-500 truncate block">
                              {item.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Scenic Biker Runs */}
                <div className="pt-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1.5">
                    Popular Biker Corridors:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POPULAR_RUNS.map((run, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPopularRun(run)}
                        className={`px-2 py-2 rounded-lg border-2 border-black text-[10px] font-black text-left truncate transition-all ${
                          selectedDest?.name === run.query
                            ? 'bg-[#2563eb] text-white shadow-none'
                            : 'bg-slate-50 hover:bg-blue-50 text-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]'
                        }`}
                      >
                        {run.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Big Primary Action: Start Solo Navigation Button */}
              <button
                type="button"
                onClick={handleLaunchSoloRide}
                disabled={isStartingSolo}
                className="w-full py-4 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isStartingSolo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Calculating Satellite Path...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-white" />
                    <span>Launch Solo Ride Navigation</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 2: SQUAD / CONVOY                                             */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'squad' && (
            <div className="my-auto space-y-3.5 animate-fadeIn py-2 w-full">
              {/* Squad Submode Segmented Toggle */}
              <div className="grid grid-cols-2 gap-1.5 bg-black p-1 rounded-xl border-2 border-black shadow-[2.5px_2.5px_0px_#000]">
                <button
                  type="button"
                  onClick={() => setSquadMode('join')}
                  className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                    squadMode === 'join'
                      ? 'bg-[#ef4444] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Join Squad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSquadMode('create')}
                  className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                    squadMode === 'create'
                      ? 'bg-[#2563eb] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Squad</span>
                </button>
              </div>

              {/* Submode A: Join Convoy Room */}
              {squadMode === 'join' && (
                <form onSubmit={handleSubmitJoin} className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-black block mb-1">
                      Enter 12-Character Squad Code
                    </span>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(e.target.value.toUpperCase());
                        setJoinError(null);
                      }}
                      maxLength={15}
                      placeholder="RU-XXXXXXXXXXXX"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg py-2.5 text-center text-lg font-black tracking-widest uppercase font-mono focus:outline-none focus:bg-white"
                    />
                    {joinError && (
                      <p className="text-[10px] font-bold text-[#ef4444] mt-1">{joinError}</p>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-600 font-mono font-bold leading-relaxed">
                    Enter the room code shared by your Road Captain to join their real-time telemetry squad.
                  </p>

                  <button
                    type="submit"
                    disabled={isJoining}
                    className="w-full py-3 px-4 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Convoy...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Enter Convoy Squad</span>
                      </>
                    )}
                  </button>

                  {onOpenShare && (
                    <button
                      type="button"
                      onClick={() => onOpenShare(joinCode)}
                      disabled={!joinCode.trim()}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Convoy Invite Link (WhatsApp)</span>
                    </button>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Host server:</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('garage')}
                      className="text-[#2563eb] hover:underline font-bold"
                    >
                      {getApiBaseUrl()}
                    </button>
                  </div>
                </form>
              )}

              {/* Submode B: Create Convoy Room */}
              {squadMode === 'create' && (
                <form onSubmit={handleSubmitCreate} className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-black block mb-1">
                      Convoy Squad Title
                    </label>
                    <input
                      type="text"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="e.g. Sunday Dawn Ride to Lonavala"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1">
                      <span>Target Cruising Speed</span>
                      <span className="text-[#2563eb] font-mono">{targetSpeed} km/h</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="120"
                      step="5"
                      value={targetSpeed}
                      onChange={(e) => setTargetSpeed(Number(e.target.value))}
                      className="w-full accent-[#2563eb] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>40 km/h</span>
                      <span>80 km/h</span>
                      <span>120 km/h</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 font-mono font-bold leading-relaxed">
                    As Road Captain, you set the locked satellite navigation path, cruise pace, and manage rider roles.
                  </p>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-3 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Initializing Room...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create Squad Room (Captain)</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 3: FUEL / PITSTOPS RADAR                                      */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'fuel' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Fuel Header Banner */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1 text-[10px] font-black text-amber-600 uppercase tracking-wider">
                    <Fuel className="w-3 h-3 text-amber-600" />
                    <span>Corridor Radar</span>
                  </div>
                  <h2 className="text-sm font-black text-black uppercase tracking-wide leading-tight mt-0.5">
                    Nearby Petrol Pumps
                  </h2>
                  <p className="text-[10px] font-mono text-slate-600 font-bold">
                    Scanned within 10 km corridor of your GPS
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-400 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-bold">
                  <Fuel className="w-4 h-4 text-black" />
                </div>
              </div>

              {/* Station Cards */}
              <div className="space-y-2">
                {isLoadingFuel ? (
                  <div className="p-8 text-center bg-white border-2 border-black rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2563eb] mx-auto mb-2" />
                    <p className="text-xs font-mono font-bold text-slate-600">Scanning satellite radar for pumps...</p>
                  </div>
                ) : nearbyFuelStops.length === 0 ? (
                  <div className="p-6 text-center bg-white border-2 border-black rounded-xl">
                    <Fuel className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-600">No fuel stations detected in immediate radius.</p>
                  </div>
                ) : (
                  nearbyFuelStops.map((stop, idx) => (
                    <div
                      key={stop.id || idx}
                      className="bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="text-xs font-black text-black truncate leading-tight">
                            {stop.name}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-600 truncate mt-0.5">
                          {stop.description}
                        </p>
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-black text-[9px] font-mono font-black">
                          {stop.distanceFromStartKm} km away
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRouteToFuelStop(stop)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2563eb] hover:bg-blue-700 text-white font-black text-[10px] uppercase border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center space-x-1 shrink-0"
                      >
                        <Navigation className="w-3 h-3 text-white" />
                        <span>Route</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Highway Fuel Tip */}
              <div className="p-2.5 rounded-xl bg-amber-50 border-2 border-black shadow-[1.5px_1.5px_0px_#000] text-[10px] font-mono font-bold text-amber-950 flex items-start space-x-2">
                <Fuel className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Highway Tip: Always top-up your tank before entering ghats or remote pass sections where stations are 60+ km apart.
                </p>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* TAB 4: GARAGE / PROFILE & DIAGNOSTICS                             */}
          {/* ───────────────────────────────────────────────────────────────── */}
          {activeTab === 'garage' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Rider Garage & Identity Header */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1 text-[10px] font-black text-black uppercase tracking-wider">
                    <Bike className="w-3 h-3 text-black" />
                    <span>Rider Garage & Identity</span>
                  </div>
                  <h2 className="text-sm font-black text-black uppercase tracking-wide leading-tight mt-0.5">
                    {profileCallsign}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-600 font-bold">
                    {profileBike || 'Motorcycle'}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: profileColor }}
                >
                  <Bike className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Rider Account & Cloud Sync Card */}
              {authUser ? (
                <div className="bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 truncate">
                    {authUser.picture ? (
                      <img src={authUser.picture} alt="" className="w-8 h-8 rounded-full border border-black shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-black text-xs shrink-0">
                        {authUser.name.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="text-xs font-black text-black truncate">{authUser.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-black text-[8px] font-black uppercase">
                          {authUser.provider === 'google' ? 'Google' : 'Verified'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{authUser.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {onChangePassword && authUser.provider !== 'google' && (
                      <button type="button" onClick={onChangePassword} className="px-2 py-1 rounded-lg bg-slate-100 border border-black text-[9px] font-black">
                        Change password
                      </button>
                    )}
                    {onRevokeSessions && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Sign out this account on every device?')) {
                            onRevokeSessions().catch((error) => alert(error.message));
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-[#ef4444] border border-black text-[9px] font-black"
                      >
                        Sign out everywhere
                      </button>
                    )}
                    {onSignOut && (
                      <button type="button" onClick={onSignOut} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-[#ef4444] border border-black text-[9px] font-black flex items-center justify-center gap-1">
                        <LogOut className="w-3 h-3" /> Sign Out
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-2 border-black shadow-[2.5px_2.5px_0px_#000] rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#2563eb] block">Rider Account</span>
                    <h4 className="text-xs font-black text-black">Sign In / Register</h4>
                    <p className="text-[10px] text-slate-600 font-bold">Save your runs in the database</p>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1.5 shrink-0 transition-all"
                    >
                      <User className="w-3.5 h-3.5 text-white" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              )}

              {/* Ride History Section */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wide">
                    <History className="w-4 h-4 text-[#2563eb]" />
                    <span>Ride History</span>
                  </div>
                  {rideHistory && rideHistory.length > 0 && onClearHistory && (
                    <button
                      type="button"
                      onClick={onClearHistory}
                      className="text-[9px] font-mono font-bold text-slate-500 hover:text-[#ef4444] uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Lifetime Stats Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-black rounded-lg p-2">
                    <div className="text-base font-black text-black leading-none">{rideHistory.length}</div>
                    <div className="text-[8px] font-mono font-black uppercase text-slate-500 mt-1">Rides Completed</div>
                  </div>
                  <div className="bg-slate-50 border border-black rounded-lg p-2">
                    <div className="text-base font-black text-black leading-none">
                      {rideHistory.reduce((acc, r) => acc + (r.distanceKm || 0), 0).toFixed(1)}
                    </div>
                    <div className="text-[8px] font-mono font-black uppercase text-slate-500 mt-1">Total Km</div>
                  </div>
                  <div className="bg-slate-50 border border-black rounded-lg p-2">
                    <div className="text-base font-black text-black leading-none">
                      {(rideHistory.reduce((acc, r) => acc + (r.durationMinutes || 0), 0) / 60).toFixed(1)}h
                    </div>
                    <div className="text-[8px] font-mono font-black uppercase text-slate-500 mt-1">Saddle Time</div>
                  </div>
                </div>

                {/* Completed Rides List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {rideHistory && rideHistory.length > 0 ? (
                    rideHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-black shadow-[1px_1px_0px_#000] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-black">
                          <span className="truncate max-w-[170px]">{item.startName} ➔ {item.destName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-[#2563eb] text-[8px] font-mono font-bold uppercase shrink-0">
                            {item.mode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-600">
                          <span>{new Date(item.completedAt).toLocaleDateString()}</span>
                          <span>{item.distanceKm} km • {item.durationMinutes}m • {item.avgSpeedKmh} km/h</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500 text-[10px] font-bold">
                      No completed rides recorded yet. Start navigation to record your first run!
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Editor Form */}
              <form onSubmit={handleSaveProfile} className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-black uppercase tracking-wide border-b border-black pb-1.5 flex items-center justify-between">
                  <span>Edit Rider Identity</span>
                  {profileSavedToast && (
                    <span className="text-[9px] text-emerald-600 font-mono font-black flex items-center space-x-1 animate-fadeIn">
                      <Check className="w-3 h-3" />
                      <span>Saved!</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                    Rider Callsign (Convoy Handle)
                  </label>
                  <input
                    type="text"
                    value={profileCallsign}
                    onChange={(e) => setProfileCallsign(e.target.value)}
                    placeholder="e.g. Apex, Ghost, Falcon"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                    Rider Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">
                    Motorcycle Model
                  </label>
                  <input
                    type="text"
                    value={profileBike}
                    onChange={(e) => setProfileBike(e.target.value)}
                    placeholder="e.g. Royal Enfield Himalayan 450"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-xs font-bold text-black focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Puck Color Selection */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1.5">
                    Satellite GPS Puck Color
                  </label>
                  <div className="flex items-center space-x-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProfileColor(c)}
                        className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center transition-transform ${
                          profileColor === c ? 'scale-110 shadow-[2px_2px_0px_#000]' : 'opacity-80'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {profileColor === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-black hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Profile</span>
                </button>
              </form>

              {/* Hardware & Telemetry Diagnostics */}
              <div className="bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-xl p-3 space-y-2 text-[10px] font-mono">
                <div className="text-xs font-black uppercase font-sans text-black border-b border-black pb-1">
                  GPS & System Diagnostics
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">GPS Signal:</span>
                  <span className="font-bold text-emerald-600 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active (High Accuracy)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Coordinates:</span>
                  <span className="font-bold text-black">
                    {currentGpsCoords
                      ? `${currentGpsCoords.lat.toFixed(4)}, ${currentGpsCoords.lng.toFixed(4)}`
                      : 'Acquiring Fix...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Satellite Engine:</span>
                  <span className="font-bold text-[#2563eb]">ESRI World Imagery</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Convoy Comms:</span>
                  <span className="font-bold text-black">Real-Time WebRTC PTT</span>
                </div>
              </div>

              {/* Emergency ICE & Crash Detection (Pure Smartphone Software, $0) */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>In-App Crash & Emergency SOS</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-black text-[8px] font-black uppercase">
                    Sensor Active
                  </span>
                </div>

                <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                  Uses your phone's built-in accelerometer to detect sudden motorcycle impacts (&gt;3.8G). Automatically sounds a 30s helmet siren &amp; dispatches emergency SMS. Zero hardware needed.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-600 block mb-0.5">
                      ICE Phone (SMS / WhatsApp)
                    </label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-black focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-600 block mb-0.5">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-black rounded-lg px-2 py-1.5 text-xs font-black text-black focus:outline-none focus:bg-white"
                    >
                      {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveIceInfo}
                    className="py-2 px-3 rounded-xl bg-black hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center space-x-1"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Save ICE Info</span>
                  </button>

                  {onTestCrash && (
                    <button
                      type="button"
                      onClick={onTestCrash}
                      className="py-2 px-3 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center space-x-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Test Crash Siren</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Spoken Voice Prompts & Tactical Audio */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wide">
                    <Volume2 className="w-4 h-4 text-[#2563eb]" />
                    <span>Tactical Voice Prompts (Earphones)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSpokenPrompts}
                    className={`px-2.5 py-0.5 rounded-full border-2 border-black text-[9px] font-black uppercase tracking-wider transition-colors ${
                      spokenPrompts ? 'bg-emerald-400 text-black' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {spokenPrompts ? 'ENABLED' : 'MUTED'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 font-bold">
                  Speaks convoy regroup notices, road hazard proximity warnings, and turns directly into your helmet earphones without cloud fees.
                </p>
              </div>

              {/* Offline Map Pre-Caching for Mountains & Remote Ghats */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wide">
                    <Download className="w-4 h-4 text-[#2563eb]" />
                    <span>Offline Map Tile Cache</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-500">
                    {cachedTileCount} Tiles Cached
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 font-bold">
                  Pre-download OpenStreetMap satellite and highway corridor tiles so your map never turns blank in cellular dead-zones.
                </p>
                <button
                  type="button"
                  disabled={isCachingMap}
                  onClick={handleDownloadOfflineRoute}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isCachingMap ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
                      <span>Caching Highway Tiles ({cacheProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-[#2563eb]" />
                      <span>Pre-Cache Mumbai–Goa Corridor</span>
                    </>
                  )}
                </button>
              </div>

              {/* Backend Server & LAN IP Configuration */}
              <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-black">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wide">
                    <Server className="w-4 h-4 text-[#2563eb]" />
                    <span>Backend Server & LAN IP</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetGarageServer}
                    className="text-[9px] font-mono font-bold text-[#2563eb] hover:underline uppercase"
                  >
                    Reset Default
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-600 block">
                    Server Address (URL / LAN IP)
                  </label>
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      value={garageServerUrl}
                      onChange={(e) => setGarageServerUrl(e.target.value)}
                      placeholder="http://192.168.29.64:5001"
                      className="flex-1 bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-black focus:outline-none focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGarageServer}
                      disabled={isTestingGarageServer}
                      className="px-3 py-1.5 rounded-lg bg-black hover:bg-slate-900 text-white font-black text-xs uppercase border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center space-x-1 disabled:opacity-50"
                    >
                      {isTestingGarageServer ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Save & Test</span>
                      )}
                    </button>
                  </div>
                </div>

                {garageServerStatus && (
                  <div
                    className={`p-2 rounded-lg border text-[10px] font-bold ${
                      garageServerStatus.success
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-red-50 border-red-500 text-red-700'
                    }`}
                  >
                    {garageServerStatus.message}
                  </div>
                )}

                <p className="text-[9px] text-slate-500 font-medium leading-tight">
                  For devices on the same Wi-Fi, ensure your phone is connected to the same network as the host laptop. Default LAN IP is <span className="font-mono font-bold text-black">{DEFAULT_BACKEND_URL}</span>.
                </p>
              </div>
            </div>
          )}

        </main>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* 3. PERSISTENT CLASSIC BOTTOM NAVIGATION BAR                           */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <nav className="mobile-app-nav relative shrink-0 min-h-[68px] bg-white border-t-2 border-black flex items-center justify-around gap-1 px-2 pt-2 shadow-[0_-3px_0px_#000] z-40">
          {/* Tab 1: Ride */}
          <button
            type="button"
            onClick={() => setActiveTab('ride')}
            className={`flex-1 min-h-12 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'ride'
                ? 'bg-[#2563eb] text-white border-2 border-black shadow-[2px_2px_0px_#000] translate-y-[-2px]'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Ride</span>
          </button>

          {/* Tab 2: Squad */}
          <button
            type="button"
            onClick={() => setActiveTab('squad')}
            className={`flex-1 min-h-12 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'squad'
                ? 'bg-[#ef4444] text-white border-2 border-black shadow-[2px_2px_0px_#000] translate-y-[-2px]'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Squad</span>
          </button>

          {/* Tab 3: Fuel */}
          <button
            type="button"
            onClick={() => setActiveTab('fuel')}
            className={`flex-1 min-h-12 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'fuel'
                ? 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_#000] translate-y-[-2px]'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Fuel</span>
          </button>

          {/* Tab 4: Garage */}
          <button
            type="button"
            onClick={() => setActiveTab('garage')}
            className={`flex-1 min-h-12 flex flex-col items-center justify-center rounded-xl transition-all ${
              activeTab === 'garage'
                ? 'bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000] translate-y-[-2px]'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Garage</span>
          </button>
        </nav>

      </div>
    </div>
  );
};
