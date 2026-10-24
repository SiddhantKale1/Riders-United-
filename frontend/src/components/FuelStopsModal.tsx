import React from 'react';
import { Fuel, MapPin, X, Navigation, CheckCircle } from 'lucide-react';
import { Waypoint } from '../types';

interface FuelStopsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelStops: Waypoint[];
  onSelectFuelStop?: (lat: number, lng: number) => void;
}

export const FuelStopsModal: React.FC<FuelStopsModalProps> = ({
  isOpen,
  onClose,
  fuelStops,
  onSelectFuelStop
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 w-full max-w-lg shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">Highway Fuel Stops</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {fuelStops.length} petrol stations mapped along your route
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white glass-button transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Fuel Stations */}
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {fuelStops.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <Fuel className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
              <span>No fuel stops mapped yet. Choose a route or start ride to calculate corridor pumps.</span>
            </div>
          ) : (
            fuelStops.map((stop, idx) => (
              <div
                key={stop.id || idx}
                onClick={() => {
                  if (onSelectFuelStop) onSelectFuelStop(stop.lat, stop.lng);
                  onClose();
                }}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-white/10 hover:border-orange-500/40 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 font-bold font-mono text-xs group-hover:scale-105 transition-transform">
                    ⛽
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs text-white group-hover:text-orange-300 transition-colors truncate">
                      {stop.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {stop.description || 'Verified Highway Petrol Pump'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  {stop.distanceFromStartKm !== undefined && (
                    <span className="text-[11px] font-mono text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      +{stop.distanceFromStartKm} km
                    </span>
                  )}
                  <Navigation className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center shrink-0">
          <p className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Automatic fuel stop calculation for uninterrupted pack touring</span>
          </p>
        </div>
      </div>
    </div>
  );
};
