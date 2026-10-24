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
      return <CornerUpLeft className="w-8 h-8 text-white stroke-[2.5]" />;
    }
    if (modifier?.includes('right')) {
      return <CornerUpRight className="w-8 h-8 text-white stroke-[2.5]" />;
    }
    if (type?.includes('roundabout') || modifier?.includes('u-turn')) {
      return <RotateCcw className="w-8 h-8 text-white stroke-[2.5]" />;
    }
    return <ArrowUp className="w-8 h-8 text-white stroke-[2.5]" />;
  };

  const distanceText = currentManeuver
    ? currentManeuver.distanceMeters > 1000
      ? `${(currentManeuver.distanceMeters / 1000).toFixed(1)} km`
      : `${currentManeuver.distanceMeters} m`
    : `${distanceToDestinationKm} km`;

  const instructionText = currentManeuver?.instruction || `Continue towards ${destinationName}`;

  return (
    <div className="absolute top-4 left-4 z-30 pointer-events-auto select-none max-w-sm md:max-w-md animate-fadeIn">
      {/* Authentic Google Maps Green Navigation Card */}
      <div className="bg-[#1b873f] text-white rounded-2xl shadow-2xl overflow-hidden border border-emerald-400/30 flex items-stretch">
        {/* Left Turn Arrow Box */}
        <div className="w-16 sm:w-20 bg-[#136f32] flex flex-col items-center justify-center p-3 shrink-0">
          {getManeuverIcon(currentManeuver?.type, currentManeuver?.modifier)}
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 mt-1">
            Turn
          </span>
        </div>

        {/* Right Details Box */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-center flex-1 min-w-0 pr-4">
          <div className="text-xl sm:text-2xl font-black font-sans tracking-tight leading-none text-white">
            {distanceText}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-emerald-50 mt-1 truncate">
            {instructionText}
          </div>
          <div className="text-[11px] text-emerald-200 truncate mt-0.5 font-medium flex items-center space-x-1">
            <Navigation className="w-3 h-3 shrink-0" />
            <span className="truncate">Towards {destinationName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
