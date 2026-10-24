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
        return <Flag className="w-4 h-4 text-emerald-400" />;
      case 'destination':
        return <Flag className="w-4 h-4 text-amber-400" />;
      case 'fuel':
        return <Fuel className="w-4 h-4 text-orange-400" />;
      case 'food':
        return <Coffee className="w-4 h-4 text-amber-300" />;
      case 'scenic':
        return <Mountain className="w-4 h-4 text-indigo-400" />;
      default:
        return <MapPin className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      <div className="glass-panel rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center space-x-2">
              <span>🛣️ Mumbai to Goa NH 66 Route Guide</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              550 km Coastal Highway Corridor • 14 Checkpoints
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white glass-button transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route Stats Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 border-b border-white/10 text-center font-mono text-xs">
          <div className="glass-pill p-2 rounded-2xl">
            <span className="text-slate-500 block text-[10px]">TOTAL DISTANCE</span>
            <strong className="text-amber-400 text-sm font-bold">550 KM</strong>
          </div>
          <div className="glass-pill p-2 rounded-2xl">
            <span className="text-slate-500 block text-[10px]">EST. RIDE TIME</span>
            <strong className="text-emerald-400 text-sm font-bold">~8.5 HRS</strong>
          </div>
          <div className="glass-pill p-2 rounded-2xl">
            <span className="text-slate-500 block text-[10px]">PLANNED STOPS</span>
            <strong className="text-cyan-400 text-sm font-bold">4 HALTS</strong>
          </div>
        </div>

        {/* Waypoints List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {waypoints.map((wp, index) => {
            const progressFraction = index / (waypoints.length - 1);

            return (
              <div
                key={wp.id}
                className="glass-panel rounded-2xl p-3 hover:border-amber-500/40 transition-all flex items-start justify-between group cursor-pointer"
                onClick={() => {
                  onSelectWaypoint(wp);
                  onClose();
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                    {getWaypointIcon(wp.type)}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                        {wp.name}
                      </h3>
                    </div>

                    {wp.description && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {wp.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-slate-500">
                      <span className="uppercase px-2 py-0.5 bg-white/5 rounded-full text-slate-300">
                        {wp.type}
                      </span>
                      <span>•</span>
                      <span>GPS: {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {onJumpSimulation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpSimulation(progressFraction);
                      onClose();
                    }}
                    className="shrink-0 text-[10px] font-mono font-bold px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg border border-amber-500/30 transition-all ml-2"
                    title="Jump simulation to this checkpoint"
                  >
                    Jump Sim
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 text-center text-xs text-slate-400 font-mono">
          Click any checkpoint to pan map • Staggered riding advised in Western Ghats
        </div>
      </div>
    </div>
  );
};
