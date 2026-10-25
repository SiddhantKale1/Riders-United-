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
    name: 'Current Location ➔ Goa',
    start: { name: 'My Current Location', lat: 18.9220, lng: 72.8347 },
    dest: { name: 'Baga Beach, Goa', lat: 15.5553, lng: 73.7517 }
  },
  {
    name: 'Current Location ➔ Manali',
    start: { name: 'My Current Location', lat: 28.6129, lng: 77.2295 },
    dest: { name: 'Mall Road, Manali', lat: 32.2396, lng: 77.1887 }
  },
  {
    name: 'Current Location ➔ Ooty',
    start: { name: 'My Current Location', lat: 12.9797, lng: 77.5912 },
    dest: { name: 'Ooty Lake, Tamil Nadu', lat: 11.4102, lng: 76.6950 }
  },
  {
    name: 'Current Location ➔ Mahabaleshwar',
    start: { name: 'My Current Location', lat: 18.5196, lng: 73.8553 },
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
  const [startQuery, setStartQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [selectedStart, setSelectedStart] = useState<{ name: string; lat: number; lng: number } | null>(
    currentGpsCoords
      ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: 18.5204, lng: 73.8567 }
  );
  const [selectedDest, setSelectedDest] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const [startSuggestions, setStartSuggestions] = useState<LocationSearchResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<'start' | 'dest' | null>(null);

  const startDebounceRef = useRef<any>(null);
  const destDebounceRef = useRef<any>(null);

  useEffect(() => {
    if (currentGpsCoords && (!selectedStart || selectedStart.name === 'My Current Location')) {
      setSelectedStart({
        name: 'My Current Location',
        lat: currentGpsCoords.lat,
        lng: currentGpsCoords.lng
      });
    }
  }, [currentGpsCoords]);

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
    const startPoint = (startQuery.trim() && selectedStart && selectedStart.name !== 'My Current Location')
      ? selectedStart
      : (currentGpsCoords
        ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
        : selectedStart);

    if (startPoint && selectedDest) {
      onRouteSelected(startPoint, selectedDest);
      setIsOpen(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_TOURS[0]) => {
    const startPt = currentGpsCoords
      ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
      : { name: 'My Current Location', lat: preset.start.lat, lng: preset.start.lng };

    setSelectedStart(startPt);
    setSelectedDest(preset.dest);
    setStartQuery(startPt.name);
    setDestQuery(preset.dest.name.split(',')[0]);
    onRouteSelected(startPt, preset.dest);
    setIsOpen(false);
  };

  return (
    <div className="relative pointer-events-auto select-none">
      {/* Neobrutalist Compact Search Pill */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none rounded-lg px-2.5 py-1.5 flex items-center space-x-2 text-xs font-bold transition-all max-w-[260px] sm:max-w-xs group hover:bg-slate-50"
          title="Search route or destination"
        >
          <Search className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
          <span className="truncate text-black">
            {activeRouteSummary || 'Where to? (Search Route)'}
          </span>
          <span className="px-1 py-0.2 rounded bg-[#2563eb] text-white text-[9px] font-black shrink-0">
            NAV
          </span>
        </button>
      ) : (
        /* Neobrutalist Expanded Direction Drawer */
        <div className="bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-xl p-3.5 w-[92vw] sm:w-[380px] max-h-[85vh] flex flex-col animate-fadeIn z-50">
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-black mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-[#2563eb] text-white flex items-center justify-center border border-black shadow-[1px_1px_0px_#000]">
                <Navigation className="w-3 h-3" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-black">
                Plan Route Anywhere
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded bg-slate-100 hover:bg-red-500 hover:text-white border border-black text-black transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Start Point Input */}
          <div className="relative mb-2">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-700 mb-1">
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
                  className="text-[#2563eb] hover:underline flex items-center space-x-0.5"
                >
                  <Compass className="w-3 h-3" />
                  <span>Use GPS</span>
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[#2563eb] text-xs font-black">A</span>
              <input
                type="text"
                value={startQuery}
                onChange={(e) => handleStartInputChange(e.target.value)}
                onFocus={() => setActiveInput('start')}
                placeholder="My Current Location (GPS)"
                className="w-full bg-slate-50 border-2 border-black rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-black font-mono font-bold focus:outline-none focus:bg-white placeholder:text-slate-500 placeholder:font-bold"
              />
            </div>

            {/* Start Suggestions */}
            {activeInput === 'start' && startSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-lg p-1 z-50 max-h-44 overflow-y-auto">
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
                    className="w-full text-left p-1.5 rounded hover:bg-blue-50 text-xs text-black transition-colors flex items-start space-x-1.5 truncate font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#2563eb] shrink-0 mt-0.5" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Point Input */}
          <div className="relative mb-3">
            <label className="block text-[10px] font-black text-slate-700 mb-1">
              DESTINATION POINT
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[#ef4444] text-xs font-black">B</span>
              <input
                type="text"
                value={destQuery}
                onChange={(e) => handleDestInputChange(e.target.value)}
                onFocus={() => setActiveInput('dest')}
                placeholder="Destination city, hill, highway..."
                className="w-full bg-slate-50 border-2 border-black rounded-lg pl-7 pr-7 py-1.5 text-xs text-black font-mono font-bold focus:outline-none focus:bg-white"
              />
              {isLoading && (
                <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-[#2563eb] animate-spin" />
              )}
            </div>

            {/* Destination Suggestions */}
            {activeInput === 'dest' && destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-lg p-1 z-50 max-h-44 overflow-y-auto">
                {destSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const startPt = (startQuery.trim() && selectedStart && selectedStart.name !== 'My Current Location')
                        ? selectedStart
                        : (currentGpsCoords
                          ? { name: 'My Current Location', lat: currentGpsCoords.lat, lng: currentGpsCoords.lng }
                          : (selectedStart || { name: 'My Current Location', lat: 18.5204, lng: 73.8567 }));

                      setSelectedStart(startPt);
                      setStartQuery(startPt.name);
                      setSelectedDest(item);
                      setDestQuery(item.name.split(',')[0]);
                      setDestSuggestions([]);
                      setActiveInput(null);
                    }}
                    className="w-full text-left p-1.5 rounded hover:bg-blue-50 text-xs text-black transition-colors flex items-start space-x-1.5 truncate font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#ef4444] shrink-0 mt-0.5" />
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
            className="w-full py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-1.5 mb-2.5"
          >
            <span>Navigate Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Quick Preset Tours (1-Click) */}
          <div className="pt-2 border-t-2 border-black">
            <span className="text-[9px] font-black text-slate-600 flex items-center space-x-1 mb-1.5 uppercase">
              <Sparkles className="w-3 h-3 text-[#2563eb]" />
              <span>POPULAR RIDE TOURS</span>
            </span>

            <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
              {PRESET_TOURS.map((tour, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPreset(tour)}
                  className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-blue-50 border border-black text-xs font-bold text-black flex items-center justify-between transition-colors"
                >
                  <span className="truncate">{tour.name}</span>
                  <ArrowRight className="w-3 h-3 text-[#2563eb] shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
