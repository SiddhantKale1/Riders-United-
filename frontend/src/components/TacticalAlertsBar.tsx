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
import { AlertType, TacticalAlert } from '../types';
import { nativeMobile } from '../services/nativeMobile';

interface TacticalAlertsBarProps {
  alerts: TacticalAlert[];
  onTriggerAlert: (type: AlertType, title: string, detail: string) => void;
  onDismissAlert: (alertId: string) => void;
}

export const TacticalAlertsBar: React.FC<TacticalAlertsBarProps> = ({
  alerts,
  onTriggerAlert,
  onDismissAlert
}) => {
  const activeAlerts = alerts.filter(a => a.active);

  const handleTrigger = (type: AlertType, title: string, detail: string) => {
    nativeMobile.triggerEmergencyHaptic();
    onTriggerAlert(type, title, detail);
  };

  return (
    <div className="flex flex-col items-center space-y-2 pointer-events-none select-none">
      {/* Active Alerts Banner Card (CarPlay Notification style) */}
      {activeAlerts.length > 0 && (
        <div className="flex flex-col space-y-1.5 w-full max-w-md px-3 pointer-events-auto">
          {activeAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="glass-panel rounded-2xl p-3 border border-red-500/40 text-xs text-red-100 flex items-center justify-between shadow-2xl animate-pulse"
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-base">
                  {alert.type === 'sos' ? '🛑' : alert.type === 'fuel' ? '⛽' : alert.type === 'police' ? '🚨' : '⚠️'}
                </div>
                <div className="truncate">
                  <div className="font-bold text-red-200 text-xs tracking-wide">
                    {alert.title}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    {alert.detail} • <em>{alert.creatorName}</em>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDismissAlert(alert.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white glass-button ml-2"
                title="Dismiss Alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating 1-Tap Glass Pill Dock (CarPlay style) */}
      <div className="pointer-events-auto glass-pill rounded-2xl p-1.5 flex items-center space-x-1 sm:space-x-1.5 shadow-2xl">
        <button
          onClick={() => handleTrigger('hazard', 'Road Hazard Ahead', 'Pothole / Debris on road')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl text-amber-400 hover:text-amber-300 glass-button flex items-center space-x-1.5 text-xs font-semibold"
          title="Report Road Hazard"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="hidden sm:inline">Hazard</span>
        </button>

        <button
          onClick={() => handleTrigger('fuel', 'Fuel Stop Needed', 'Refuel pitstop requested')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl text-orange-400 hover:text-orange-300 glass-button flex items-center space-x-1.5 text-xs font-semibold"
          title="Request Fuel Stop"
        >
          <Fuel className="w-4 h-4" />
          <span className="hidden sm:inline">Fuel</span>
        </button>

        <button
          onClick={() => handleTrigger('police', 'Speed Trap / Police', 'Radar check ahead')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl text-cyan-400 hover:text-cyan-300 glass-button flex items-center space-x-1.5 text-xs font-semibold"
          title="Speed Trap Checkpoint"
        >
          <Siren className="w-4 h-4" />
          <span className="hidden sm:inline">Radar</span>
        </button>

        <button
          onClick={() => handleTrigger('breakdown', 'Mechanical Breakdown', 'Puncture or bike issue')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl text-purple-400 hover:text-purple-300 glass-button flex items-center space-x-1.5 text-xs font-semibold"
          title="Breakdown / Puncture"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Issue</span>
        </button>

        <button
          onClick={() => handleTrigger('regroup', 'Regroup Formation', 'Slow down to regroup pack')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl text-emerald-400 hover:text-emerald-300 glass-button flex items-center space-x-1.5 text-xs font-semibold"
          title="Regroup Convoy"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Regroup</span>
        </button>

        <button
          onClick={() => handleTrigger('sos', 'EMERGENCY SOS', 'Immediate stop required!')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center space-x-1.5 text-xs shadow-md shadow-red-600/30 animate-pulse"
          title="Emergency Stop SOS"
        >
          <OctagonAlert className="w-4 h-4" />
          <span className="hidden sm:inline">SOS</span>
        </button>
      </div>
    </div>
  );
};
