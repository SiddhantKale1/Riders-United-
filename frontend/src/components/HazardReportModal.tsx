import React from 'react';
import {
  AlertTriangle,
  Fuel,
  Siren,
  Wrench,
  OctagonAlert,
  RotateCcw,
  X
} from 'lucide-react';
import { AlertType } from '../types';
import { nativeMobile } from '../services/nativeMobile';

interface HazardReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAlert: (type: AlertType, title: string, detail: string) => void;
}

export const HazardReportModal: React.FC<HazardReportModalProps> = ({
  isOpen,
  onClose,
  onTriggerAlert
}) => {
  if (!isOpen) return null;

  const handleSelect = (type: AlertType, title: string, detail: string) => {
    nativeMobile.triggerEmergencyHaptic();
    onTriggerAlert(type, title, detail);
    onClose();
  };

  const HAZARD_OPTIONS: {
    type: AlertType;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    btnClass: string;
  }[] = [
    {
      type: 'hazard',
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      title: 'Road Hazard',
      subtitle: 'Pothole / Debris / Oil slick',
      btnClass: 'bg-[#ef4444] text-white hover:bg-red-600'
    },
    {
      type: 'sos',
      icon: <OctagonAlert className="w-5 h-5 text-white" />,
      title: 'Emergency SOS',
      subtitle: 'Medical or safety help',
      btnClass: 'bg-black text-white hover:bg-slate-900'
    },
    {
      type: 'police',
      icon: <Siren className="w-5 h-5 text-white" />,
      title: 'Police / Radar',
      subtitle: 'Speed trap / Checkpoint',
      btnClass: 'bg-[#2563eb] text-white hover:bg-blue-700'
    },
    {
      type: 'fuel',
      icon: <Fuel className="w-5 h-5 text-black" />,
      title: 'Fuel Pitstop',
      subtitle: 'Request petrol pump stop',
      btnClass: 'bg-amber-400 text-black hover:bg-amber-500'
    },
    {
      type: 'breakdown',
      icon: <Wrench className="w-5 h-5 text-white" />,
      title: 'Breakdown / Flat',
      subtitle: 'Puncture / Mechanical halt',
      btnClass: 'bg-slate-800 text-white hover:bg-slate-900'
    },
    {
      type: 'regroup',
      icon: <RotateCcw className="w-5 h-5 text-white" />,
      title: 'Pack Regroup',
      subtitle: 'Slow down & close convoy gap',
      btnClass: 'bg-[#2563eb] text-white hover:bg-blue-700'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
      {/* Neobrutalist Modal Box */}
      <div className="bg-white text-black border-2 border-black rounded-xl p-4 w-full max-w-md shadow-[5px_5px_0px_#000] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b-2 border-black mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-[#ef4444] text-white border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wide uppercase text-black">Broadcast Road Hazard</h3>
              <p className="text-[10px] text-slate-600 font-mono">1-tap broadcast to all riders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-100 hover:bg-red-500 hover:text-white border border-black text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1-Tap Hazard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {HAZARD_OPTIONS.map((item) => (
            <button
              key={item.type}
              onClick={() => handleSelect(item.type, item.title, item.subtitle)}
              className={`p-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex flex-col items-center text-center transition-all ${item.btnClass}`}
            >
              <div className="mb-1 p-1 rounded bg-black/20 border border-black/30">
                {item.icon}
              </div>
              <span className="font-black text-xs leading-tight">{item.title}</span>
              <span className="text-[9px] opacity-80 leading-tight mt-0.5">{item.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
