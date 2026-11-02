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
      return <CornerUpLeft className="w-8 h-8 text-white stroke-[3]" />;
    }
    if (modifier?.includes('right')) {
      return <CornerUpRight className="w-8 h-8 text-white stroke-[3]" />;
    }
    if (type?.includes('roundabout') || modifier?.includes('u-turn')) {
      return <RotateCcw className="w-8 h-8 text-white stroke-[3]" />;
    }
    return <ArrowUp className="w-8 h-8 text-white stroke-[3]" />;
  };

  const distanceText = currentManeuver
    ? currentManeuver.distanceMeters > 1000
      ? `${(currentManeuver.distanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(currentManeuver.distanceMeters)} m`
    : `${distanceToDestinationKm} km`;

  const instructionText = currentManeuver?.instruction || `Continue to ${destinationName}`;

  return (
    <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0.75rem))] left-[max(0.875rem,env(safe-area-inset-left,0.875rem))] z-30 pointer-events-auto select-none max-w-[320px] sm:max-w-sm animate-fadeIn">
      {/* Iconic Google Maps Navigation Turn Banner (Signature Green) */}
      <div className="bg-[#0F5132] text-white rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] border border-emerald-500/20 overflow-hidden flex items-stretch backdrop-blur-md">
        {/* Left Turn Maneuver Icon */}
        <div className="w-16 bg-[#0B3D26] flex flex-col items-center justify-center p-3 shrink-0 border-r border-emerald-900/50">
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
            {getManeuverIcon(currentManeuver?.type, currentManeuver?.modifier)}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-200 mt-1">
            In
          </span>
        </div>

        {/* Right Info: Distance & Instruction */}
        <div className="p-3.5 flex flex-col justify-center flex-1 min-w-0 pr-4">
          <div className="text-2xl font-black font-sans tracking-tight leading-none text-white">
            {distanceText}
          </div>
          <div className="text-sm font-semibold text-emerald-50 mt-1 line-clamp-2 leading-tight">
            {instructionText}
          </div>
          <div className="text-[11px] text-emerald-300 truncate mt-1 font-medium flex items-center gap-1.5">
            <Navigation className="w-3 h-3 shrink-0 text-emerald-300" />
            <span className="truncate">{destinationName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
