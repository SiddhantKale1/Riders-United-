import React from 'react';
import { Gauge, Shield, MapPin, Compass, BatteryCharging } from 'lucide-react';
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

  // Pack formation evaluation
  let spreadStatus = 'OPTIMAL PACK';
  let spreadColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

  if (packSpreadMeters > 2500) {
    spreadStatus = 'STRAGGLER WARNING';
    spreadColor = 'text-red-400 border-red-500/40 bg-red-500/10 animate-pulse';
  } else if (packSpreadMeters > 1500) {
    spreadStatus = 'PACK STRETCHED';
    spreadColor = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  }

  // Heading cardinal direction
  const getCardinal = (deg: number) => {
    const val = Math.floor((deg / 45) + 0.5);
    const arr = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return arr[(val % 8)];
  };

  return (
    <div className="absolute top-20 right-4 z-20 flex flex-col items-end space-y-2 pointer-events-none select-none max-w-[260px] md:max-w-[280px]">
      {/* Speedometer Digital HUD Card */}
      <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-2xl w-full text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>SPEED HUD</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span>{battery}%</span>
          </div>
        </div>

        {/* Speed readout */}
        <div className="flex items-baseline justify-center my-1">
          <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-amber-400">
            {speed}
          </span>
          <span className="text-xs font-mono text-slate-400 ml-1.5 font-bold">KM/H</span>
        </div>

        {/* Speed Bar Progress Indicator */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (speed / 120) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-2">
          <span className="flex items-center space-x-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>{heading}° {getCardinal(heading)}</span>
          </span>
          <span>TARGET: 75 KM/H</span>
        </div>
      </div>

      {/* Pack Formation Telemetry Card */}
      <div className={`pointer-events-auto backdrop-blur-md border rounded-xl p-2.5 shadow-xl w-full text-xs font-mono ${spreadColor}`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1.5 font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>CONVOY SPREAD</span>
          </span>
          <span className="font-bold text-sm">
            {(packSpreadMeters / 1000).toFixed(2)} km
          </span>
        </div>
        <div className="text-[10px] font-bold tracking-wider uppercase mt-1">
          STATUS: {spreadStatus}
        </div>
      </div>

      {/* Destination / Next Pitstop HUD */}
      <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl w-full text-slate-200 text-xs font-mono">
        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>ROUTE NAVIGATION</span>
        </div>

        {nextWaypoint && (
          <div className="text-[11px] text-slate-300 truncate">
            <span className="text-amber-400 font-bold">Next:</span> {nextWaypoint.name}
          </div>
        )}

        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/80">
          <span>To Baga Beach, Goa:</span>
          <span className="font-bold text-amber-400">{distanceToDestinationKm} km</span>
        </div>
      </div>
    </div>
  );
};
