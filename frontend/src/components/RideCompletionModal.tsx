import React from 'react';
import { Award, Compass, Clock, Gauge, ArrowRight, X, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { CompletedRide } from '../types';

interface RideCompletionModalProps {
  isOpen: boolean;
  rideData: CompletedRide | null;
  onClose: () => void;
  onViewHistory?: () => void;
}

export const RideCompletionModal: React.FC<RideCompletionModalProps> = ({
  isOpen,
  rideData,
  onClose,
  onViewHistory
}) => {
  if (!isOpen || !rideData) return null;

  const hours = Math.floor(rideData.durationMinutes / 60);
  const mins = Math.round(rideData.durationMinutes % 60);
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      {/* Neobrutalist Victory Modal Card */}
      <div className="bg-white text-black border-2 border-black rounded-2xl p-5 w-full max-w-sm shadow-[6px_6px_0px_#000] flex flex-col space-y-4 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black text-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Victory Header Badge */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ef4444] text-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mb-2">
            <Award className="w-7 h-7 text-white" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 border border-black text-[9px] font-black uppercase text-emerald-800 tracking-wider mb-1">
            Mission Accomplished
          </div>
          <h2 className="text-lg font-black uppercase tracking-wider text-black leading-tight">
            Ride Completed!
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-0.5">
            Congratulations on conquering the tarmac!
          </p>
        </div>

        {/* Route Details Card */}
        <div className="bg-slate-50 border-2 border-black rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase pb-1 border-b border-black/20">
            <span>Route Traversed</span>
            <span className="text-[#2563eb] font-black uppercase">{rideData.mode} Ride</span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-black text-black">
            <span className="truncate max-w-[120px]">{rideData.startName}</span>
            <span className="text-[#ef4444] font-bold">➔</span>
            <span className="truncate max-w-[120px]">{rideData.destName}</span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Distance */}
          <div className="bg-white border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
            <Compass className="w-4 h-4 mx-auto text-[#2563eb] mb-1" />
            <div className="text-base font-black text-black leading-tight">
              {rideData.distanceKm}
            </div>
            <div className="text-[9px] font-mono font-black uppercase text-slate-500">
              Kilometers
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
            <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <div className="text-base font-black text-black leading-tight">
              {timeStr}
            </div>
            <div className="text-[9px] font-mono font-black uppercase text-slate-500">
              Duration
            </div>
          </div>

          {/* Average Speed */}
          <div className="bg-white border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
            <Gauge className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
            <div className="text-base font-black text-black leading-tight">
              {rideData.avgSpeedKmh || 45}
            </div>
            <div className="text-[9px] font-mono font-black uppercase text-slate-500">
              Avg km/h
            </div>
          </div>
        </div>

        {/* Persistence Confirmation */}
        <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 py-1.5 px-2 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Ride automatically saved to your Ride History</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {onViewHistory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewHistory();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2"
            >
              <History className="w-4 h-4 text-[#2563eb]" />
              <span>View In Ride History</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2"
          >
            <span>Return to Cockpit Home</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>

      </div>
    </div>
  );
};

interface ExitConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      {/* Neobrutalist Confirmation Sheet */}
      <div className="bg-white text-black border-2 border-black rounded-2xl p-5 w-full max-w-sm shadow-[6px_6px_0px_#000] flex flex-col space-y-4">
        
        {/* Header Warning */}
        <div className="flex items-center space-x-3 pb-2 border-b-2 border-black">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-black leading-tight">
              Exit Navigation?
            </h3>
            <p className="text-[10px] text-slate-600 font-mono font-bold">
              GPS telemetry session active
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-700 font-bold leading-relaxed">
          Are you sure you want to conclude this ride and stop GPS satellite navigation?
        </p>

        {/* Dual Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            Keep Riding
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 px-3 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            Conclude Ride
          </button>
        </div>

      </div>
    </div>
  );
};
