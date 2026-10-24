import React from 'react';
import { Shield, Compass, BatteryCharging, ArrowUpRight } from 'lucide-react';
import { Rider, Waypoint } from '../types';

interface CockpitHUDProps {
  currentRider: Rider | null;
  packSpreadMeters: number;
  nextWaypoint: Waypoint | null;
  distanceToDestinationKm: number;
}

export const CockpitHUD: React.FC<CockpitHUDProps> = ({
  currentRider,
  packSpreadMeters,
  nextWaypoint,
  distanceToDestinationKm
}) => {
  const speed = currentRider ? currentRider.speed : 0;
  const heading = currentRider ? currentRider.heading : 0;
  const battery = currentRider ? currentRider.battery : 95;

  // Formation Spread Logic
  let spreadLabel = 'Optimal Pack';
  let spreadBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  if (packSpreadMeters > 2500) {
    spreadLabel = 'Straggler Alert';
    spreadBadge = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
  } else if (packSpreadMeters > 1500) {
    spreadLabel = 'Pack Stretched';
    spreadBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }

  const getCardinal = (deg: number) => {
    const val = Math.floor((deg / 45) + 0.5);
    const arr = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return arr[(val % 8)];
  };

  return (
    <div className="absolute top-20 right-4 z-20 flex flex-col items-end space-y-2 pointer-events-none select-none max-w-[260px] md:max-w-[290px]">
      {/* BMW Motorrad / CarPlay Style Speed & Nav Card */}
      <div className="pointer-events-auto glass-panel rounded-3xl p-4 w-full shadow-2xl text-slate-100 flex flex-col">
        {/* Top telemetry bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{heading}° {getCardinal(heading)}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>{battery}%</span>
          </div>
        </div>

        {/* Big Speed Readout */}
        <div className="flex items-baseline justify-between my-1">
          <div className="flex items-baseline">
            <span className="text-5xl font-black tracking-tight text-white font-mono leading-none">
              {speed}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400 ml-1.5 uppercase">
              km/h
            </span>
          </div>

          {/* Convoy Spread Pill */}
          <div className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold flex items-center space-x-1 ${spreadBadge}`}>
            <Shield className="w-3 h-3" />
            <span>{(packSpreadMeters / 1000).toFixed(1)}k</span>
          </div>
        </div>

        {/* Minimalist Speed Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden mt-2 mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (speed / 120) * 100)}%` }}
          />
        </div>

        {/* Next Waypoint Info (CarPlay Nav style) */}
        {nextWaypoint && (
          <div className="pt-2 border-t border-white/10 flex items-start space-x-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-100 truncate">
                {nextWaypoint.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {nextWaypoint.description || 'Highway Waypoint'}
              </div>
            </div>
          </div>
        )}

        {/* Distance Remaining to Goa */}
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>To Baga Beach, Goa:</span>
          <span className="font-bold text-amber-400">{distanceToDestinationKm} km</span>
        </div>
      </div>
    </div>
  );
};
