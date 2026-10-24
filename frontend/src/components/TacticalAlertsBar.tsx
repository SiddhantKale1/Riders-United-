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

  return (
    <div className="flex flex-col items-center space-y-2 pointer-events-none select-none">
      {/* Active Alerts Banner Ticker */}
      {activeAlerts.length > 0 && (
        <div className="flex flex-col space-y-1.5 w-full max-w-lg px-2 pointer-events-auto">
          {activeAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="bg-red-950/90 border border-red-500/80 backdrop-blur-md rounded-xl p-2.5 shadow-2xl flex items-center justify-between text-xs text-red-100 animate-pulse"
            >
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-base">
                  {alert.type === 'sos' ? '🛑' : alert.type === 'fuel' ? '⛽' : alert.type === 'police' ? '🚨' : '⚠️'}
                </span>
                <div className="truncate">
                  <div className="font-bold text-red-200 uppercase tracking-wider text-[11px]">
                    {alert.title}
                  </div>
                  <div className="text-[10px] text-red-300 truncate">
                    {alert.detail} • <em>{alert.creatorName}</em>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDismissAlert(alert.id)}
                className="p-1 rounded hover:bg-red-900/50 text-red-300 hover:text-white transition-colors ml-2"
                title="Dismiss Alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 1-Tap Quick Action Buttons (Bar at bottom) */}
      <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl flex items-center space-x-1 sm:space-x-2">
        {/* Hazard */}
        <button
          onClick={() => onTriggerAlert('hazard', 'Road Hazard Ahead', 'Pothole / Debris on road surface')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 hover:text-amber-300 transition-all flex items-center space-x-1.5 text-xs font-semibold"
          title="Report Road Hazard (Pothole / Gravel / Cattle)"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="hidden sm:inline">Hazard</span>
        </button>

        {/* Fuel */}
        <button
          onClick={() => onTriggerAlert('fuel', 'Fuel Stop Needed', 'Rider fuel reserve warning')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 hover:text-orange-300 transition-all flex items-center space-x-1.5 text-xs font-semibold"
          title="Request Fuel Stop"
        >
          <Fuel className="w-4 h-4" />
          <span className="hidden sm:inline">Fuel</span>
        </button>

        {/* Speed Trap / Police */}
        <button
          onClick={() => onTriggerAlert('police', 'Speed Trap / Police Ahead', 'Speed radar checkpoint spotted')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 transition-all flex items-center space-x-1.5 text-xs font-semibold"
          title="Speed Trap / Police Checkpoint"
        >
          <Siren className="w-4 h-4" />
          <span className="hidden sm:inline">Radar</span>
        </button>

        {/* Mechanical / Breakdown */}
        <button
          onClick={() => onTriggerAlert('breakdown', 'Mechanical Breakdown', 'Puncture or mechanical issue, pulling over')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 hover:text-purple-300 transition-all flex items-center space-x-1.5 text-xs font-semibold"
          title="Mechanical Breakdown / Flat Tyre"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Breakdown</span>
        </button>

        {/* Regroup */}
        <button
          onClick={() => onTriggerAlert('regroup', 'Regroup Formation', 'Convoy spread too wide, slow down to regroup')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all flex items-center space-x-1.5 text-xs font-semibold"
          title="Regroup Convoy"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Regroup</span>
        </button>

        {/* Emergency SOS */}
        <button
          onClick={() => onTriggerAlert('sos', 'EMERGENCY SOS', 'Immediate stop required! Convoy halt!')}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 transition-all flex items-center space-x-1.5 text-xs font-bold animate-pulse"
          title="Emergency Stop SOS"
        >
          <OctagonAlert className="w-4 h-4" />
          <span className="hidden sm:inline">SOS</span>
        </button>
      </div>
    </div>
  );
};
