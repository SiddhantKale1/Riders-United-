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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Google Maps Style Fuel Sheet */}
      <div className="bg-white text-gray-900 border border-gray-150 rounded-[32px] p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white shadow-md flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                Highway Petrol Pumps
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                {fuelStops.length} stations mapped along corridor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Fuel Stations */}
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {fuelStops.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs font-medium">
              <Fuel className="w-8 h-8 mx-auto text-gray-300 mb-2" />
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
                className="p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-150 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold truncate text-gray-900">{stop.name}</h4>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {stop.description || 'Highway Fuel & Air Station'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[11px] font-bold text-blue-600 group-hover:underline flex items-center gap-0.5">
                    <MapPin className="w-3.5 h-3.5" />
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
