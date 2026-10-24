import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Navigation,
  MapPin,
  X,
  Compass,
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { routingService, LocationSearchResult } from '../services/routingService';

interface RouteSearchBoxProps {
  onRouteSelected: (start: { name: string; lat: number; lng: number }, dest: { name: string; lat: number; lng: number }) => void;
  currentGpsCoords?: { lat: number; lng: number } | null;
  activeRouteSummary?: string;
  isLeader?: boolean;
}

const PRESET_TOURS = [
  {
    name: 'Mumbai ➔ Goa (NH 66 Coastal)',
    start: { name: 'Gateway of India, Mumbai', lat: 18.9220, lng: 72.8347 },
    dest: { name: 'Baga Beach, Goa', lat: 15.5553, lng: 73.7517 }
  },
  {
    name: 'Delhi ➔ Manali (Himalayan Run)',
    start: { name: 'India Gate, New Delhi', lat: 28.6129, lng: 77.2295 },
    dest: { name: 'Mall Road, Manali', lat: 32.2396, lng: 77.1887 }
  },
  {
    name: 'Bangalore ➔ Ooty (Nilgiri Ghats)',
    start: { name: 'Vidhana Soudha, Bangalore', lat: 12.9797, lng: 77.5912 },
    dest: { name: 'Ooty Lake, Tamil Nadu', lat: 11.4102, lng: 76.6950 }
  },
  {
    name: 'Pune ➔ Mahabaleshwar',
    start: { name: 'Shaniwar Wada, Pune', lat: 18.5196, lng: 73.8553 },
    dest: { name: 'Venna Lake, Mahabaleshwar', lat: 17.9237, lng: 73.6586 }
  }
];

export const RouteSearchBox: React.FC<RouteSearchBoxProps> = ({
  onRouteSelected,
  currentGpsCoords,
  activeRouteSummary,
  isLeader = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('My Current Location');
  const [destQuery, setDestQuery] = useState('');
  const [selectedStart, setSelectedStart] = useState<{ name: string; lat: number; lng: number } | null>(
    currentGpsCoords
      ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'Gateway of India, Mumbai', lat: 18.9220, lng: 72.8347 }
  );
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const [startSuggestions, setStartSuggestions] = useState<LocationSearchResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<'start' | 'dest' | null>(null);

  const startDebounceRef = useRef<any>(null);
  const destDebounceRef = useRef<any>(null);

  // Sync GPS coordinates if available
  useEffect(() => {
    if (currentGpsCoords && (!selectedStart || selectedStart.name === 'My Current Location')) {
      setSelectedStart({
        name: 'My Current Location',
        lat: currentGpsCoords.lat,
        lng: currentGpsCoords.lng
      });
    }
  }, [currentGpsCoords]);

  // Search places for Start
  const handleStartInputChange = (val: string) => {
    setStartQuery(val);
    setActiveInput('start');
    if (startDebounceRef.current) clearTimeout(startDebounceRef.current);

    if (val.trim().length >= 3) {
      startDebounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        const results = await routingService.searchPlaces(val);
        setStartSuggestions(results);
        setIsLoading(false);
      }, 350);
    } else {
      setStartSuggestions([]);
    }
  };

  // Search places for Destination
  const handleDestInputChange = (val: string) => {
    setDestQuery(val);
    setActiveInput('dest');
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);

    if (val.trim().length >= 3) {
      destDebounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        const results = await routingService.searchPlaces(val);
        setDestSuggestions(results);
        setIsLoading(false);
      }, 350);
    } else {
      setDestSuggestions([]);
    }
  };

  const handleApplyRoute = () => {
    if (selectedStart && selectedDest) {
      onRouteSelected(selectedStart, selectedDest);
      setIsOpen(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_TOURS[0]) => {
    setSelectedStart(preset.start);
    setSelectedDest(preset.dest);
    setStartQuery(preset.start.name);
    setDestQuery(preset.dest.name);
    onRouteSelected(preset.start, preset.dest);
    setIsOpen(false);
  };

  return (
    <div className="relative pointer-events-auto select-none">
      {/* Compact Google Maps-Style Search Pill (Header Bar) */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="glass-pill rounded-2xl px-3.5 py-2 flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white transition-all shadow-xl max-w-[280px] sm:max-w-xs group"
          title="Search any destination or route anywhere in the world"
        >
          <Search className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="truncate font-medium text-slate-200">
            {activeRouteSummary || 'Where to? (Search any route...)'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] text-amber-300 font-mono">
            MAPS
          </span>
        </button>
      ) : (
        /* Expanded Google Maps-Style Direction Drawer */
        <div className="glass-panel rounded-3xl p-4 shadow-2xl border border-white/10 w-[90vw] sm:w-[420px] max-h-[85vh] flex flex-col text-slate-100 animate-fadeIn z-50">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Route Anywhere (Turn-by-Turn)
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-xl text-slate-400 hover:text-white glass-button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Start Point Input */}
          <div className="relative mb-2">
            <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
              <span>START LOCATION</span>
              {currentGpsCoords && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStart({
                      name: 'My Current Location',
                      lat: currentGpsCoords.lat,
                      lng: currentGpsCoords.lng
                    });
                    setStartQuery('My Current Location');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <Compass className="w-3 h-3" />
                  <span>Use My GPS</span>
                </button>
              )}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-emerald-400 text-xs font-bold">A</span>
              <input
                type="text"
                value={startQuery}
                onChange={(e) => handleStartInputChange(e.target.value)}
                onFocus={() => setActiveInput('start')}
                placeholder="Starting city, road, or GPS..."
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Start Suggestions */}
            {activeInput === 'start' && startSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-2xl p-1.5 shadow-2xl z-50 max-h-48 overflow-y-auto">
                {startSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedStart(item);
                      setStartQuery(item.name);
                      setStartSuggestions([]);
                      setActiveInput(null);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-white/10 text-slate-200 transition-colors flex items-start space-x-2 truncate"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Point Input */}
          <div className="relative mb-3">
            <label className="block text-[10px] font-mono text-slate-400 mb-1">
              DESTINATION (ANYWHERE IN THE WORLD)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-amber-400 text-xs font-bold">B</span>
              <input
                type="text"
                value={destQuery}
                onChange={(e) => handleDestInputChange(e.target.value)}
                onFocus={() => setActiveInput('dest')}
                placeholder="Destination city, beach, mountain pass..."
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 w-3.5 h-3.5 text-amber-400 animate-spin" />
              )}
            </div>

            {/* Destination Suggestions */}
            {activeInput === 'dest' && destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-2xl p-1.5 shadow-2xl z-50 max-h-48 overflow-y-auto">
                {destSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDest(item);
                      setDestQuery(item.name);
                      setDestSuggestions([]);
                      setActiveInput(null);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-white/10 text-slate-200 transition-colors flex items-start space-x-2 truncate"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Apply Route Button */}
          <button
            type="button"
            onClick={handleApplyRoute}
            disabled={!selectedStart || !selectedDest}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 mb-3"
          >
            <span>Navigate Road Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Quick Preset Tours (1-Click) */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1 mb-2">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>POPULAR CONVOY TOURS (1-CLICK)</span>
            </span>

            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
              {PRESET_TOURS.map((tour, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPreset(tour)}
                  className="text-left p-2 rounded-xl text-xs glass-button flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <span className="truncate font-medium">{tour.name}</span>
                  <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
