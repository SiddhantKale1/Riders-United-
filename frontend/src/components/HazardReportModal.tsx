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
    color: string;
    bgColor: string;
  }[] = [
    {
      type: 'hazard',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      title: 'Road Hazard',
      subtitle: 'Pothole / Debris / Oil on tarmac',
      color: 'border-amber-500/40 hover:border-amber-400',
      bgColor: 'bg-amber-500/10 hover:bg-amber-500/20'
    },
    {
      type: 'police',
      icon: <Siren className="w-6 h-6 text-cyan-400" />,
      title: 'Police / Radar',
      subtitle: 'Speed trap / Checkpoint ahead',
      color: 'border-cyan-500/40 hover:border-cyan-400',
      bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20'
    },
    {
      type: 'fuel',
      icon: <Fuel className="w-6 h-6 text-orange-400" />,
      title: 'Fuel Pitstop',
      subtitle: 'Request fuel stop at next pump',
      color: 'border-orange-500/40 hover:border-orange-400',
      bgColor: 'bg-orange-500/10 hover:bg-orange-500/20'
    },
    {
      type: 'sos',
      icon: <OctagonAlert className="w-6 h-6 text-red-400" />,
      title: 'Emergency SOS',
      subtitle: 'Immediate medical / safety help',
      color: 'border-red-500/50 hover:border-red-400 ring-1 ring-red-500/30',
      bgColor: 'bg-red-500/15 hover:bg-red-500/25'
    },
    {
      type: 'breakdown',
      icon: <Wrench className="w-6 h-6 text-purple-400" />,
      title: 'Breakdown / Flat',
      subtitle: 'Puncture / Mechanical failure',
      color: 'border-purple-500/40 hover:border-purple-400',
      bgColor: 'bg-purple-500/10 hover:bg-purple-500/20'
    },
    {
      type: 'regroup',
      icon: <RotateCcw className="w-6 h-6 text-blue-400" />,
      title: 'Pack Regroup',
      subtitle: 'Slow down and close pack spacing',
      color: 'border-blue-500/40 hover:border-blue-400',
      bgColor: 'bg-blue-500/10 hover:bg-blue-500/20'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 w-full max-w-lg shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">Report Road Condition</h3>
              <p className="text-[11px] text-slate-400 font-mono">Broadcasts instantly to all riders in convoy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white glass-button transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Tap Hazard Grid (Landscape Handlebar Friendly) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {HAZARD_OPTIONS.map((item) => (
            <button
              key={item.type}
              onClick={() => handleSelect(item.type, item.title, item.subtitle)}
              className={`p-3.5 rounded-2xl border ${item.color} ${item.bgColor} flex flex-col items-center text-center transition-all active:scale-95 group shadow-lg`}
            >
              <div className="mb-2 p-2 rounded-xl bg-slate-950/60 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <span className="font-bold text-xs text-white leading-tight mb-1">{item.title}</span>
              <span className="text-[10px] text-slate-400 leading-tight">{item.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
