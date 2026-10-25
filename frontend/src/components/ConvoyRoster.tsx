import React, { useState } from 'react';
import {
  Users,
  Volume2,
  Send,
  X,
  Radio,
  Settings,
  BellRing,
  Crown,
  Bike
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
        return <span className="text-[9px] bg-[#ef4444] text-white border border-black px-1.5 py-0.2 rounded font-black uppercase shadow-[1px_1px_0px_#000]">LEAD</span>;
      case 'sweeper':
        return <span className="text-[9px] bg-[#2563eb] text-white border border-black px-1.5 py-0.2 rounded font-black uppercase shadow-[1px_1px_0px_#000]">SWEEP</span>;
      case 'scout':
        return <span className="text-[9px] bg-amber-400 text-black border border-black px-1.5 py-0.2 rounded font-black uppercase shadow-[1px_1px_0px_#000]">SCOUT</span>;
      default:
        return <span className="text-[9px] bg-slate-200 text-black border border-black px-1.5 py-0.2 rounded font-black uppercase">PACK</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[350px] bg-white text-black border-l-2 border-black shadow-[-4px_0px_0px_#000] flex flex-col transition-all select-none animate-fadeIn">
      {/* Header */}
      <div className="p-3 border-b-2 border-black flex items-center justify-between shrink-0 bg-slate-50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-[#2563eb] text-white border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center font-bold">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wide text-black leading-none">
              Convoy Pack
            </h2>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">
              {riders.length} Riders in Squadron
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded bg-white hover:bg-red-500 hover:text-white border border-black text-black transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Leader Actions */}
      {isLeader && (
        <div className="px-3 py-1.5 bg-red-50 border-b-2 border-black flex items-center justify-between text-xs shrink-0">
          <span className="text-black font-black flex items-center space-x-1.5 text-[11px]">
            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>LEAD CONTROLS</span>
          </span>
          <button
            onClick={onTriggerRegroup}
            className="px-2 py-0.5 rounded bg-[#ef4444] hover:bg-red-600 text-white font-black border border-black shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center space-x-1 text-[10px] uppercase"
          >
            <BellRing className="w-3 h-3" />
            <span>Regroup</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-black text-xs font-black shrink-0">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2 text-center transition-colors flex items-center justify-center space-x-1 border-r-2 border-black ${
            activeTab === 'roster'
              ? 'bg-[#2563eb] text-white'
              : 'bg-white text-black hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Roster ({riders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-center transition-colors flex items-center justify-center space-x-1 ${
            activeTab === 'chat'
              ? 'bg-[#ef4444] text-white'
              : 'bg-white text-black hover:bg-slate-100'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Comms ({messages.length})</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {activeTab === 'roster' ? (
          <>
            {/* Voice Channel Status */}
            <div className="bg-blue-50 border-2 border-black rounded-lg p-2 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between text-[#2563eb]">
                <div className="flex items-center space-x-1.5 font-black text-xs">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>#convoy-main</span>
                </div>
                <span className="text-[9px] bg-[#2563eb] text-white border border-black px-1.5 py-0.2 rounded font-black">
                  CONNECTED
                </span>
              </div>
            </div>

            {/* Rider Cards */}
            <div className="space-y-1.5 mt-2">
              {riders.map((rider) => {
                const isMe = rider.id === currentRiderId;
                const isSelected = selectedRiderForRole === rider.id;

                return (
                  <div
                    key={rider.id}
                    className={`rounded-lg p-2 border-2 border-black transition-all ${
                      isMe
                        ? 'bg-blue-50 shadow-[2px_2px_0px_#000]'
                        : 'bg-white hover:bg-slate-50 shadow-[2px_2px_0px_#000]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0"
                        onClick={() => onFocusRider(rider.id)}
                        title="Focus on map"
                      >
                        <div
                          className="w-7 h-7 rounded-md border border-black flex items-center justify-center text-white shadow-[1px_1px_0px_#000] shrink-0"
                          style={{ backgroundColor: rider.avatarColor }}
                        >
                          <Bike className="w-3.5 h-3.5 text-white" />
                        </div>

                        <div className="truncate">
                          <div className="flex items-center space-x-1 truncate">
                            <span className="font-black text-xs text-black truncate">
                              {rider.name}
                            </span>
                            {isMe && (
                              <span className="text-[8px] bg-[#2563eb] text-white font-black px-1 py-0.2 rounded border border-black">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 font-mono">
                            {rider.callsign}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-1">
                        {getRoleBadge(rider.role)}
                        {isLeader && (
                          <button
                            onClick={() => setSelectedRiderForRole(isSelected ? null : rider.id)}
                            className="p-1 rounded bg-slate-100 hover:bg-black hover:text-white border border-black text-black ml-1 transition-colors"
                            title="Change Role"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 text-[10px] text-slate-600 font-medium truncate">
                      {rider.bikeModel}
                    </div>

                    <div className="mt-1.5 grid grid-cols-3 gap-1 bg-slate-100 border border-black rounded p-1 text-[9px] font-mono text-black font-bold">
                      <div>
                        <span className="text-slate-500">SPD:</span>{' '}
                        <span className="text-[#ef4444]">{rider.speed}k</span>
                      </div>
                      <div>
                        <span className="text-slate-500">BAT:</span>{' '}
                        <span className="text-[#2563eb]">{rider.battery}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">GAP:</span>{' '}
                        <span>{rider.distanceFromLeader}m</span>
                      </div>
                    </div>

                    {isSelected && isLeader && (
                      <div className="mt-2 pt-1.5 border-t border-black grid grid-cols-4 gap-1">
                        {(['leader', 'scout', 'rider', 'sweeper'] as RiderRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              onAssignRole(rider.id, r);
                              setSelectedRiderForRole(null);
                            }}
                            className={`py-0.5 rounded text-[9px] font-black uppercase border border-black transition-all ${
                              rider.role === r
                                ? 'bg-black text-white'
                                : 'bg-white text-black hover:bg-slate-100'
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
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-1.5 mb-2 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg text-xs font-mono border-2 border-black shadow-[2px_2px_0px_#000] ${
                    msg.type === 'alert'
                      ? 'bg-red-50 text-[#ef4444]'
                      : 'bg-slate-50 text-black'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-slate-600 mb-0.5">
                    <span className="font-black text-black">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="font-bold">{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex items-center space-x-1 pt-2 border-t-2 border-black">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message to convoy..."
                className="flex-1 bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-black font-bold placeholder-slate-400 focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-[#2563eb] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-black hover:bg-blue-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
