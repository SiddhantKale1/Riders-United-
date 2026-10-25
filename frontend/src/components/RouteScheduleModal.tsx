import React from 'react';
import { X, MapPin, Fuel, Coffee, Flag, Mountain } from 'lucide-react';
import { Waypoint } from '../types';

interface RouteScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  waypoints: Waypoint[];
  onSelectWaypoint: (wp: Waypoint) => void;
  onJumpSimulation?: (fraction: number) => void;
}

export const RouteScheduleModal: React.FC<RouteScheduleModalProps> = ({
  isOpen,
  onClose,
  waypoints,
  onSelectWaypoint,
  onJumpSimulation
}) => {
  if (!isOpen) return null;

  const getWaypointIcon = (type: string) => {
    switch (type) {
      case 'start':
        return <Flag className="w-3.5 h-3.5 text-white" />;
      case 'destination':
        return <Flag className="w-3.5 h-3.5 text-white" />;
      case 'fuel':
        return <Fuel className="w-3.5 h-3.5 text-black" />;
      case 'food':
        return <Coffee className="w-3.5 h-3.5 text-black" />;
      case 'scenic':
        return <Mountain className="w-3.5 h-3.5 text-white" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-white" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'start':
        return 'bg-[#2563eb]';
      case 'destination':
        return 'bg-[#ef4444]';
      case 'fuel':
        return 'bg-amber-400';
      case 'food':
        return 'bg-amber-300';
      case 'scenic':
        return 'bg-purple-600';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      {/* Neobrutalist Route Schedule Modal */}
      <div className="bg-white text-black border-2 border-black rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-[5px_5px_0px_#000] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b-2 border-black flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wide text-black flex items-center space-x-1.5">
              <span>Highway Route Checkpoints</span>
            </h2>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">
              {waypoints.length} Mapped Corridor Waypoints
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-white hover:bg-red-500 hover:text-white border border-black text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Waypoints List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {waypoints.map((wp, index) => {
            const progressFraction = index / (waypoints.length - 1);

            return (
              <div
                key={wp.id}
                className="bg-slate-50 border-2 border-black rounded-lg p-2.5 hover:bg-blue-50 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-start justify-between group cursor-pointer"
                onClick={() => {
                  onSelectWaypoint(wp);
                  onClose();
                }}
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded border border-black flex items-center justify-center shrink-0 mt-0.5 ${getBadgeColor(wp.type)}`}>
                    {getWaypointIcon(wp.type)}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="text-[10px] font-mono font-black text-slate-500">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-xs font-black truncate text-black">{wp.name}</h4>
                    </div>

                    {wp.description && (
                      <p className="text-[10px] text-slate-600 truncate font-mono mt-0.5">
                        {wp.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {onJumpSimulation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpSimulation(progressFraction);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-black text-[9px] font-black uppercase text-black"
                      title="Jump simulation here"
                    >
                      Jump
                    </button>
                  )}
                  <span className="text-[10px] font-black text-[#2563eb] group-hover:underline">
                    View
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
