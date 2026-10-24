import React from 'react';
import { Compass, Shield } from 'lucide-react';

interface SpeedometerPillProps {
  speed: number;
  heading: number;
  packSpreadMeters: number;
}

export const SpeedometerPill: React.FC<SpeedometerPillProps> = ({
  speed,
  heading,
  packSpreadMeters
}) => {
  const getCardinal = (deg: number) => {
    const val = Math.floor((deg / 45) + 0.5);
    const arr = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return arr[(val % 8)];
  };

  const isSpreadWarning = packSpreadMeters > 2500;

  return (
    <div className="absolute bottom-4 left-4 z-30 pointer-events-auto select-none flex items-end space-x-2 animate-fadeIn">
      {/* Google Maps Circular Speedometer Pill */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 shadow-2xl flex items-center space-x-3 text-slate-100">
        <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl px-3 py-1.5 border border-white/10 min-w-[64px]">
          <span className="text-3xl font-black font-mono tracking-tight text-white leading-none">
            {speed}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            km/h
          </span>
        </div>

        <div className="flex flex-col text-xs font-mono pr-2">
          {/* Compass direction */}
          <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{heading}° {getCardinal(heading)}</span>
          </div>

          {/* Convoy Spread */}
          <div className={`flex items-center space-x-1 text-[11px] font-bold mt-1 ${
            isSpreadWarning ? 'text-red-400 animate-pulse' : 'text-emerald-400'
          }`}>
            <Shield className="w-3 h-3" />
            <span>{(packSpreadMeters / 1000).toFixed(1)} km pack</span>
          </div>
        </div>
      </div>
    </div>
  );
};
