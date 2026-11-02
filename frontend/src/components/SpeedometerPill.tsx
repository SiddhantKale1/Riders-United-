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
  const isSpreadCaution = packSpreadMeters > 1500 && packSpreadMeters <= 2500;

  return (
    <div className="absolute bottom-[max(0.875rem,env(safe-area-inset-bottom,0.875rem))] left-[max(0.875rem,env(safe-area-inset-left,0.875rem))] z-30 pointer-events-auto select-none flex items-end gap-2 animate-fadeIn">
      {/* Google Maps Speedometer Card */}
      <div className="bg-white/95 backdrop-blur-md text-gray-900 border border-gray-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.25)] rounded-2xl p-3 flex items-center gap-3">
        {/* Speed Readout */}
        <div className="flex flex-col items-center justify-center min-w-[50px]">
          <span className="text-3xl font-black font-sans tracking-tight leading-none text-gray-900">
            {speed}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
            km/h
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-8 bg-gray-200" />

        {/* Speed Limit & Compass Info */}
        <div className="flex flex-col gap-1 pr-1">
          <div className="flex items-center gap-2">
            {/* Google Maps Style Speed Limit Circular Badge */}
            <div className="w-6 h-6 rounded-full border-2 border-red-600 bg-white flex items-center justify-center text-[10px] font-black text-gray-900 shadow-xs">
              80
            </div>

            {/* Compass Heading */}
            <div className="flex items-center gap-1 text-gray-700 font-bold text-xs">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>{heading}° {getCardinal(heading)}</span>
            </div>
          </div>

          {/* Convoy Pack Spread Badge */}
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isSpreadWarning
              ? 'bg-red-100 text-red-700 animate-pulse'
              : isSpreadCaution
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            <Shield className="w-3 h-3" />
            <span>{(packSpreadMeters / 1000).toFixed(1)} km pack {isSpreadWarning ? '• Stretch' : '• Optimal'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
