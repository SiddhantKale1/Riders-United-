import React, { useState } from 'react';
import {
  Users,
  Volume2,
  Send,
  X,
  Radio,
  Settings,
  BellRing
} from 'lucide-react';
import { Rider, RiderRole, ChatMessage } from '../types';

interface ConvoyRosterProps {
  isOpen: boolean;
  onClose: () => void;
  riders: Rider[];
  currentRiderId: string;
  isLeader: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onAssignRole: (riderId: string, newRole: RiderRole) => void;
  onFocusRider: (riderId: string) => void;
  onTriggerRegroup: () => void;
}

export const ConvoyRoster: React.FC<ConvoyRosterProps> = ({
  isOpen,
  onClose,
  riders,
  currentRiderId,
  isLeader,
  messages,
  onSendMessage,
  onAssignRole,
  onFocusRider,
  onTriggerRegroup
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'chat'>('roster');
  const [chatInput, setChatInput] = useState('');
  const [selectedRiderForRole, setSelectedRiderForRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const getRoleBadge = (role: RiderRole) => {
    switch (role) {
      case 'leader':
        return <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold uppercase">Lead Captain</span>;
      case 'sweeper':
        return <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold uppercase">Tail Sweeper</span>;
      case 'scout':
        return <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold uppercase">Point Scout</span>;
      default:
        return <span className="text-[10px] bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 rounded-full font-bold uppercase">Pack Rider</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] glass-panel border-l border-white/10 shadow-2xl flex flex-col text-slate-100 transition-all select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-slate-100 leading-none">
              Convoy Channel
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {riders.length} Riders Active
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white glass-button transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Leader Actions */}
      {isLeader && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
          <span className="text-amber-400 font-semibold flex items-center space-x-1">
            <span>👑 Captain Controls</span>
          </span>
          <button
            onClick={onTriggerRegroup}
            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors flex items-center space-x-1 shadow-sm"
          >
            <BellRing className="w-3 h-3" />
            <span>Regroup Chime</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center space-x-1.5 border-b-2 ${
            activeTab === 'roster'
              ? 'border-amber-400 text-amber-400 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Roster ({riders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center space-x-1.5 border-b-2 ${
            activeTab === 'chat'
              ? 'border-amber-400 text-amber-400 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Comms & Radio ({messages.length})</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeTab === 'roster' ? (
          <>
            {/* Voice Channels (Discord-style) */}
            <div className="mb-2 px-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Voice Frequencies
              </div>
              <div className="glass-pill rounded-2xl p-2.5 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-emerald-400">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="font-bold">#convoy-main</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300 font-bold">
                    CONNECTED
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-white/5">
                  <span>#captains-briefing</span>
                  <span>Lead / Sweeper</span>
                </div>
              </div>
            </div>

            {/* Rider Cards */}
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
              Convoy Formation
            </div>

            {riders.map((rider) => {
              const isMe = rider.id === currentRiderId;
              const isSelected = selectedRiderForRole === rider.id;

              return (
                <div
                  key={rider.id}
                  className={`glass-panel rounded-2xl p-3 transition-all ${
                    isMe
                      ? 'border-emerald-500/50 bg-emerald-950/20 shadow-emerald-500/10'
                      : 'hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-center space-x-2.5 cursor-pointer flex-1"
                      onClick={() => onFocusRider(rider.id)}
                      title="Locate on map"
                    >
                      <div
                        className="relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shadow-md"
                        style={{ backgroundColor: rider.avatarColor }}
                      >
                        🏍️
                        {rider.isTalking && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-100 truncate">
                            {rider.name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-amber-400 font-mono">
                          {rider.callsign}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {getRoleBadge(rider.role)}
                      {isLeader && (
                        <button
                          onClick={() => setSelectedRiderForRole(isSelected ? null : rider.id)}
                          className="p-1 text-slate-400 hover:text-amber-400 glass-button ml-1"
                          title="Change Role"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-400 italic">
                    {rider.bikeModel}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5 bg-black/40 rounded-xl p-2 text-[10px] font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500">SPEED:</span>{' '}
                      <strong className="text-amber-400">{rider.speed} km/h</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">BATT:</span>{' '}
                      <strong className="text-emerald-400">{rider.battery}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">SPREAD:</span>{' '}
                      <strong>{rider.distanceFromLeader}m</strong>
                    </div>
                  </div>

                  {isSelected && isLeader && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-4 gap-1">
                      {(['leader', 'scout', 'rider', 'sweeper'] as RiderRole[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            onAssignRole(rider.id, r);
                            setSelectedRiderForRole(null);
                          }}
                          className={`px-1.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            rider.role === r
                              ? 'bg-amber-500 text-slate-950'
                              : 'glass-button text-slate-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-2 mb-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl text-xs font-mono border ${
                    msg.type === 'system'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : msg.type === 'alert'
                      ? 'bg-red-950/30 border-red-500/40 text-red-200'
                      : 'glass-panel text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-amber-400">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex items-center space-x-1.5 pt-2 border-t border-white/10">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Radio message to convoy..."
                className="flex-1 bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
