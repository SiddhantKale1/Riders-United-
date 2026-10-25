import React from 'react';
import { Fuel, MapPin, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      {/* Neobrutalist Fuel Modal */}
      <div className="bg-white text-black border-2 border-black rounded-xl p-4 w-full max-w-md shadow-[5px_5px_0px_#000] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b-2 border-black mb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-amber-400 text-black border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center">
              <Fuel className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wide uppercase">Highway Fuel Stops</h3>
              <p className="text-[10px] text-slate-600 font-mono">
                {fuelStops.length} petrol stations mapped along corridor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-100 hover:bg-red-500 hover:text-white border border-black text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List of Fuel Stations */}
        <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
          {fuelStops.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-bold">
              <Fuel className="w-6 h-6 mx-auto text-slate-400 mb-1" />
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
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded bg-amber-400 text-black border border-black flex items-center justify-center shrink-0">
                    <Fuel className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-black truncate text-black">{stop.name}</h4>
                    <p className="text-[10px] text-slate-600 truncate font-mono">
                      {stop.description || 'Highway Fuel & Air Station'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <span className="text-[10px] font-black text-[#2563eb] group-hover:underline flex items-center space-x-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>View</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
