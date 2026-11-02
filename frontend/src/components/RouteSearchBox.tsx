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
    name: 'Current Location ➔ Lonavala',
    start: { name: 'My Current Location', lat: 18.5204, lng: 73.8567 },
    dest: { name: 'Lonavala Ghats, Maharashtra', lat: 18.7557, lng: 73.4091 }
  },
  {
    name: 'Current Location ➔ Lavasa',
    start: { name: 'My Current Location', lat: 18.5204, lng: 73.8567 },
    dest: { name: 'Lavasa, Maharashtra', lat: 18.4102, lng: 73.5074 }
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
      {/* Google Maps Search Pill */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white/95 backdrop-blur-md text-gray-800 border border-gray-200/80 shadow-md rounded-full px-4 py-2 flex items-center gap-2 text-xs font-semibold transition-all max-w-[280px] sm:max-w-xs hover:bg-white active:scale-95"
          title="Search route or destination"
        >
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="truncate text-gray-800">
            {activeRouteSummary || 'Where to? (Search Route)'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold shrink-0">
            NAV
          </span>
        </button>
      ) : (
        /* Google Maps Direction Panel */
        <div className="bg-white text-gray-900 border border-gray-150 rounded-3xl p-4 w-[92vw] sm:w-[380px] max-h-[85vh] shadow-2xl flex flex-col animate-fadeIn z-50">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Plan Navigation Route
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Start Point Input */}
          <div className="relative mb-2.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase mb-1">
              <span>Start Location</span>
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
                  className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <Compass className="w-3 h-3" />
                  <span>Use GPS</span>
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 w-2 h-2 rounded-full bg-blue-600" />
              <input
                type="text"
                value={startQuery}
                onChange={(e) => handleStartInputChange(e.target.value)}
                onFocus={() => setActiveInput('start')}
                placeholder="My Current Location (GPS)"
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:bg-white"
              />
            </div>

            {/* Start Suggestions */}
            {activeInput === 'start' && startSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-150 rounded-2xl shadow-xl p-1 z-50 max-h-44 overflow-y-auto divide-y divide-gray-100">
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
                    className="w-full text-left p-2.5 hover:bg-gray-50 text-xs text-gray-800 transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="truncate font-medium">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Point Input */}
          <div className="relative mb-3">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
              Destination Point
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 w-2 h-2 rounded-full bg-red-500" />
              <input
                type="text"
                value={destQuery}
                onChange={(e) => handleDestInputChange(e.target.value)}
                onFocus={() => setActiveInput('dest')}
                placeholder="Destination city, hill, highway..."
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-8 pr-8 py-2 text-xs text-gray-800 font-medium focus:outline-none focus:bg-white"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 w-3.5 h-3.5 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Destination Suggestions */}
            {activeInput === 'dest' && destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-150 rounded-2xl shadow-xl p-1 z-50 max-h-44 overflow-y-auto divide-y divide-gray-100">
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
                    className="w-full text-left p-2.5 hover:bg-gray-50 text-xs text-gray-800 transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span className="truncate font-medium">{item.name}</span>
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
            className="w-full py-2.5 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 mb-3 disabled:opacity-40"
          >
            <span>Navigate Route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Preset Tours */}
          <div className="pt-2.5 border-t border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase block mb-1.5">
              Popular Biker Corridors:
            </span>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {PRESET_TOURS.map((tour, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPreset(tour)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors"
                >
                  <span className="truncate">{tour.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
