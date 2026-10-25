import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Bike,
  Shield,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
  Settings
} from 'lucide-react';
import { AuthUser } from '../types';
import { getApiBaseUrl, setApiBaseUrl, testServerConnection, DEFAULT_BACKEND_URL } from '../services/apiConfig';
import { socketService } from '../services/socket';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login'
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server URL configuration for mobile devices on LAN
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  // Handle Standard Email & Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = tab === 'login'
        ? { email: email.trim(), password }
        : {
            email: email.trim(),
            password,
            name: name.trim() || 'Rider',
            callsign: callsign.trim() || 'Apex',
            bikeModel: bikeModel.trim() || 'Motorcycle'
          };

      const base = getApiBaseUrl();
      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Persist auth token and user
      if (data.user) {
        localStorage.setItem('riders_auth_user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('riders_auth_token', data.token);
        socketService.reconnect();
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const isFetchErr = err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError';
      if (isFetchErr) {
        setError(`Failed to fetch from ${getApiBaseUrl()}. Check Wi-Fi connection or update Server IP.`);
        setShowServerConfig(true);
      } else {
        setError(err?.message || 'Error communicating with database server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAndSaveServer = async () => {
    setIsTestingServer(true);
    setServerStatus(null);
    const res = await testServerConnection(serverUrlInput);
    setIsTestingServer(false);
    setServerStatus(res);
    if (res.success) {
      setApiBaseUrl(serverUrlInput);
      socketService.reconnect();
      setError(null);
    }
  };

  const handleResetDefaultLan = () => {
    setServerUrlInput(DEFAULT_BACKEND_URL);
    setApiBaseUrl(DEFAULT_BACKEND_URL);
    socketService.reconnect();
    setServerStatus({ success: true, message: `Set to default: ${DEFAULT_BACKEND_URL}` });
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      {/* Neobrutalist Auth Card */}
      <div className="bg-white text-black border-2 border-black rounded-2xl p-4 sm:p-5 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-[6px_6px_0px_#000] flex flex-col space-y-3 relative my-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-black">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#ef4444] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-black">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-black leading-none">
                Riders United
              </h2>
              <span className="text-[9px] text-[#2563eb] font-mono font-bold leading-none">
                Database Rider Authentication
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black text-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              title="Server IP Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black text-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Server Configuration Drawer / Alert */}
        {showServerConfig && (
          <div className="bg-amber-50 border-2 border-black rounded-xl p-3 space-y-2 shadow-[2px_2px_0px_#000]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase flex items-center space-x-1 text-slate-800">
                <Server className="w-3 h-3 text-[#2563eb]" />
                <span>Backend Server Address</span>
              </span>
              <button
                type="button"
                onClick={handleResetDefaultLan}
                className="text-[9px] font-mono font-bold text-[#2563eb] hover:underline"
              >
                Reset Default
              </button>
            </div>
            <div className="flex space-x-1.5">
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="http://192.168.29.64:5001"
                className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 text-xs font-mono font-bold text-black focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestAndSaveServer}
                disabled={isTestingServer}
                className="px-2.5 py-1 bg-black text-white rounded-lg text-xs font-black uppercase shrink-0 hover:bg-slate-800 active:scale-95"
              >
                {isTestingServer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
            </div>
            {serverStatus && (
              <p className={`text-[10px] font-bold ${serverStatus.success ? 'text-emerald-700' : 'text-red-600'}`}>
                {serverStatus.message}
              </p>
            )}
            <p className="text-[9px] text-slate-500 font-medium leading-tight">
              Phone and host laptop must be on the same Wi-Fi / Hotspot.
            </p>
          </div>
        )}

        {/* Tab Switcher: Sign In vs Register */}
        <div className="grid grid-cols-2 gap-1.5 bg-black p-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'login'
                ? 'bg-[#2563eb] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'register'
                ? 'bg-[#2563eb] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 bg-red-100 border-2 border-red-600 rounded-xl text-red-700 text-xs font-bold flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-[10px] font-mono font-black uppercase text-slate-600 mb-1">
                  Full Name / Rider Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Siddhartha"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase text-slate-600 mb-1">
                    Radio Callsign
                  </label>
                  <input
                    type="text"
                    required
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="GhostRider"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-black uppercase focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-black uppercase text-slate-600 mb-1">
                    Motorcycle
                  </label>
                  <div className="relative">
                    <Bike className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      placeholder="Ninja 650"
                      className="w-full bg-slate-50 border-2 border-black rounded-lg pl-7 pr-2 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-mono font-black uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@ridersunited.app"
                className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-black uppercase text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                minLength={tab === 'register' ? 12 : undefined}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-1 ${
              tab === 'login' ? 'bg-[#2563eb] hover:bg-blue-700' : 'bg-[#ef4444] hover:bg-red-600'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Connecting to DB...</span>
              </>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In To Garage' : 'Register Rider In DB'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer / Server Host Indicator & Guest Mode */}
        <div className="pt-1 flex flex-col items-center space-y-1">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-mono font-bold text-slate-500 hover:text-black underline"
          >
            Continue as Guest Rider
          </button>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="text-[9px] font-mono text-slate-400 hover:text-black flex items-center space-x-1"
          >
            <Server className="w-2.5 h-2.5" />
            <span>Host: {getApiBaseUrl()}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
