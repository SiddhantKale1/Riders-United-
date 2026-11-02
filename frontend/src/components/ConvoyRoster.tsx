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
        return <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">Captain</span>;
      case 'sweeper':
        return <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">Sweeper</span>;
      case 'scout':
        return <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">Scout</span>;
      default:
        return <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium uppercase">Pack</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[360px] bg-white text-gray-900 border-l border-gray-200 shadow-2xl flex flex-col transition-all select-none animate-fadeIn">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-none">
              Convoy Pack
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {riders.length} Riders in Squadron
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Leader Actions */}
      {isLeader && (
        <div className="px-4 py-2 bg-red-50/70 border-b border-red-100 flex items-center justify-between text-xs shrink-0">
          <span className="text-red-900 font-bold flex items-center gap-1.5 text-xs">
            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Leader Controls</span>
          </span>
          <button
            onClick={onTriggerRegroup}
            className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
          >
            <BellRing className="w-3 h-3" />
            <span>Regroup</span>
          </button>
        </div>
      )}

      {/* Segmented Pill Tabs */}
      <div className="p-2 border-b border-gray-100 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-full">
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'roster'
                ? 'bg-[#18191D] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster ({riders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'chat'
                ? 'bg-[#18191D] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radio ({messages.length})</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'roster' ? (
          <>
            {/* Voice Channel Status */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 flex items-center justify-between text-blue-900 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>#convoy-main</span>
              </div>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                CONNECTED
              </span>
            </div>

            {/* Rider Cards */}
            <div className="space-y-2">
              {riders.map((rider) => {
                const isMe = rider.id === currentRiderId;
                const isSelected = selectedRiderForRole === rider.id;

                return (
                  <div
                    key={rider.id}
                    className={`rounded-2xl p-3 border transition-all ${
                      isMe
                        ? 'bg-blue-50/40 border-blue-200 shadow-sm'
                        : 'bg-gray-50/70 border-gray-150 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                        onClick={() => onFocusRider(rider.id)}
                        title="Focus on map"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: rider.avatarColor }}
                        >
                          <Bike className="w-4 h-4 text-white" />
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {rider.name}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {rider.callsign}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {getRoleBadge(rider.role)}
                        {isLeader && (
                          <button
                            onClick={() => setSelectedRiderForRole(isSelected ? null : rider.id)}
                            className="w-7 h-7 rounded-full bg-white hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                            title="Change Role"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-[11px] text-gray-500 font-medium truncate">
                      {rider.bikeModel}
                    </p>

                    <div className="mt-2 grid grid-cols-3 gap-1 bg-white border border-gray-150 rounded-xl p-1.5 text-[10px] font-mono text-gray-700 font-bold text-center">
                      <div>
                        <span className="text-gray-400 font-normal">SPD:</span>{' '}
                        <span className="text-red-600">{rider.speed}k</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-normal">BAT:</span>{' '}
                        <span className="text-blue-600">{rider.battery}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-normal">GAP:</span>{' '}
                        <span>{rider.distanceFromLeader}m</span>
                      </div>
                    </div>

                    {isSelected && isLeader && (
                      <div className="mt-2.5 pt-2 border-t border-gray-150 grid grid-cols-4 gap-1">
                        {(['leader', 'scout', 'rider', 'sweeper'] as RiderRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              onAssignRole(rider.id, r);
                              setSelectedRiderForRole(null);
                            }}
                            className={`py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                              rider.role === r
                                ? 'bg-[#18191D] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <div className="space-y-2 mb-3 overflow-y-auto flex-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl text-xs border ${
                    msg.type === 'alert'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-gray-50 text-gray-800 border-gray-150'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span className="font-bold text-gray-900">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="font-medium">{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message to convoy..."
                className="flex-1 bg-gray-50 border border-gray-200/80 rounded-full px-4 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-full bg-[#18191D] hover:bg-black text-white flex items-center justify-center transition-colors shadow-sm"
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
