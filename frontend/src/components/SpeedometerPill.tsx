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
    <div className="absolute bottom-[max(0.875rem,env(safe-area-inset-bottom,0.875rem))] left-[max(0.875rem,env(safe-area-inset-left,0.875rem))] z-30 pointer-events-auto select-none flex items-end space-x-2 animate-fadeIn">
      {/* Neobrutalist Red & Blue Speedometer Box */}
      <div className="bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl p-2 flex items-center space-x-2.5">
        {/* Speed Number in Bold Red Block */}
        <div className="flex flex-col items-center justify-center bg-[#ef4444] text-white rounded-lg px-2.5 py-1 border-2 border-black min-w-[56px] shadow-[1px_1px_0px_#000]">
          <span className="text-2xl font-black font-mono tracking-tight leading-none text-white">
            {speed}
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest text-red-100 mt-0.5">
            KM/H
          </span>
        </div>

        {/* Heading & Convoy Pack Spread */}
        <div className="flex flex-col text-xs font-mono pr-1">
          {/* Compass Direction */}
          <div className="flex items-center space-x-1 text-black font-bold text-[11px]">
            <Compass className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>{heading}° {getCardinal(heading)}</span>
          </div>

          {/* Convoy Spread */}
          <div className={`flex items-center space-x-1 text-[10px] font-black mt-1 px-1.5 py-0.5 rounded border border-black ${
            isSpreadWarning ? 'bg-red-100 text-[#ef4444] animate-pulse' : 'bg-blue-100 text-[#2563eb]'
          }`}>
            <Shield className="w-2.5 h-2.5" />
            <span>{(packSpreadMeters / 1000).toFixed(1)} km pack</span>
          </div>
        </div>
      </div>
    </div>
  );
};
