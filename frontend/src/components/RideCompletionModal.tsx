import React from 'react';
import { Award, Compass, Clock, Gauge, ArrowRight, X, AlertTriangle, CheckCircle2, History, MessageSquare } from 'lucide-react';
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

  const handleShareStory = () => {
    const text = `🏆 Mission Accomplished with Riders United!\n\n🛣️ Route: ${rideData.startName} ➔ ${rideData.destName}\n📏 Distance: ${rideData.distanceKm} km\n⏱️ Duration: ${timeStr}\n⚡ Avg Speed: ${rideData.avgSpeedKmh || 45} km/h\n\nTrack your motorcycle convoy live on Riders United!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Sleek Victory Modal Card */}
      <div className="bg-white text-gray-900 border border-gray-150 rounded-[32px] p-6 w-full max-w-sm shadow-2xl flex flex-col space-y-4 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Victory Header Badge */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center mb-2.5">
            <Award className="w-7 h-7 text-white" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            Mission Accomplished
          </span>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            Ride Completed!
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Congratulations on conquering the tarmac!
          </p>
        </div>

        {/* Route Details Card */}
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-150 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase">
            <span>Route Traversed</span>
            <span className="text-blue-600 font-bold uppercase">{rideData.mode} Ride</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
            <span className="truncate max-w-[120px]">{rideData.startName}</span>
            <span className="text-red-500 font-bold">➔</span>
            <span className="truncate max-w-[120px]">{rideData.destName}</span>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Distance */}
          <div className="bg-white border border-gray-150 rounded-2xl p-3 shadow-sm">
            <Compass className="w-4 h-4 mx-auto text-blue-600 mb-1" />
            <div className="text-sm font-bold text-gray-900 leading-tight">
              {rideData.distanceKm}
            </div>
            <div className="text-[9px] font-medium uppercase text-gray-400 mt-0.5">
              Kilometers
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white border border-gray-150 rounded-2xl p-3 shadow-sm">
            <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <div className="text-sm font-bold text-gray-900 leading-tight">
              {timeStr}
            </div>
            <div className="text-[9px] font-medium uppercase text-gray-400 mt-0.5">
              Duration
            </div>
          </div>

          {/* Average Speed */}
          <div className="bg-white border border-gray-150 rounded-2xl p-3 shadow-sm">
            <Gauge className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
            <div className="text-sm font-bold text-gray-900 leading-tight">
              {rideData.avgSpeedKmh || 45}
            </div>
            <div className="text-[9px] font-medium uppercase text-gray-400 mt-0.5">
              Avg km/h
            </div>
          </div>
        </div>

        {/* Persistence Confirmation */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Ride saved to your Ride History</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleShareStory}
            className="w-full py-3 px-4 rounded-full bg-[#25D366] hover:bg-emerald-600 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-white" />
            <span>Share on WhatsApp</span>
          </button>

          {onViewHistory && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewHistory();
              }}
              className="w-full py-2.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <History className="w-4 h-4 text-gray-600" />
              <span>View In Ride History</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Return to Home</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Sleek Confirmation Sheet */}
      <div className="bg-white text-gray-900 border border-gray-150 rounded-[32px] p-6 w-full max-w-sm shadow-2xl flex flex-col space-y-4">
        
        {/* Header Warning */}
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white shadow-md flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">
              Exit Navigation?
            </h3>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              Live GPS telemetry session active
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Are you sure you want to conclude this ride and stop GPS satellite navigation?
        </p>

        {/* Dual Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors"
          >
            Keep Riding
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="py-3 px-3 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs transition-colors shadow-md"
          >
            Conclude Ride
          </button>
        </div>

      </div>
    </div>
  );
};
