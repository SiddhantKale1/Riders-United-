import React from 'react';
import { CornerUpRight, CornerUpLeft, ArrowUp, RotateCcw, Navigation } from 'lucide-react';
import { RouteManeuver } from '../types';

interface GoogleMapsTurnCardProps {
  currentManeuver: RouteManeuver | null;
  destinationName: string;
  distanceToDestinationKm: number;
}

export const GoogleMapsTurnCard: React.FC<GoogleMapsTurnCardProps> = ({
  currentManeuver,
  destinationName,
  distanceToDestinationKm
}) => {
  const getManeuverIcon = (type?: string, modifier?: string) => {
    if (modifier?.includes('left')) {
      return <CornerUpLeft className="w-6 h-6 text-white stroke-[3]" />;
    }
    if (modifier?.includes('right')) {
      return <CornerUpRight className="w-6 h-6 text-white stroke-[3]" />;
    }
    if (type?.includes('roundabout') || modifier?.includes('u-turn')) {
      return <RotateCcw className="w-6 h-6 text-white stroke-[3]" />;
    }
    return <ArrowUp className="w-6 h-6 text-white stroke-[3]" />;
  };

  const distanceText = currentManeuver
    ? currentManeuver.distanceMeters > 1000
      ? `${(currentManeuver.distanceMeters / 1000).toFixed(1)} km`
      : `${currentManeuver.distanceMeters} m`
    : `${distanceToDestinationKm} km`;

  const instructionText = currentManeuver?.instruction || `Continue to ${destinationName}`;

  return (
    <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0.75rem))] left-[max(0.875rem,env(safe-area-inset-left,0.875rem))] z-30 pointer-events-auto select-none max-w-[280px] sm:max-w-xs animate-fadeIn">
      {/* Neobrutalist Navigation Turn Card (Blue & White with Black Borders) */}
      <div className="bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] rounded-xl overflow-hidden flex items-stretch">
        {/* Left Icon Block in Bold Blue */}
        <div className="w-13 bg-[#2563eb] border-r-2 border-black flex flex-col items-center justify-center p-2 shrink-0">
          {getManeuverIcon(currentManeuver?.type, currentManeuver?.modifier)}
          <span className="text-[8px] font-black uppercase text-blue-100 tracking-wider mt-0.5">
            Turn
          </span>
        </div>

        {/* Right Info Details */}
        <div className="p-2 sm:p-2.5 flex flex-col justify-center flex-1 min-w-0 pr-3">
          <div className="text-lg sm:text-xl font-black font-mono tracking-tight leading-none text-black">
            {distanceText}
          </div>
          <div className="text-xs font-bold text-slate-800 mt-1 truncate">
            {instructionText}
          </div>
          <div className="text-[10px] text-[#2563eb] truncate mt-0.5 font-bold flex items-center space-x-1">
            <Navigation className="w-2.5 h-2.5 shrink-0 text-[#2563eb]" />
            <span className="truncate">{destinationName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
