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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      {/* Sleek Modern Auth Card */}
      <div className="bg-white text-gray-900 border border-gray-150 rounded-[32px] p-6 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl flex flex-col space-y-4 relative my-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Riders United
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Rider Account Authentication
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              title="Server IP Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Configuration Drawer / Alert */}
        {showServerConfig && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Backend Host Address</span>
              </span>
              <button
                type="button"
                onClick={handleResetDefaultLan}
                className="text-[10px] text-blue-600 hover:underline font-semibold"
              >
                Reset Default
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="http://192.168.29.64:5001"
                className="w-full bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium text-gray-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestAndSaveServer}
                disabled={isTestingServer}
                className="px-3 py-1.5 bg-[#18191D] text-white rounded-xl text-xs font-semibold shrink-0 hover:bg-black transition-colors"
              >
                {isTestingServer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
            </div>
            {serverStatus && (
              <p className={`text-[11px] font-medium ${serverStatus.success ? 'text-emerald-700' : 'text-red-600'}`}>
                {serverStatus.message}
              </p>
            )}
          </div>
        )}

        {/* Tab Switcher: Sign In vs Register (Pills) */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-full">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2 rounded-full text-xs font-semibold transition-all ${
              tab === 'login'
                ? 'bg-[#18191D] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
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
            className={`py-2 rounded-full text-xs font-semibold transition-all ${
              tab === 'register'
                ? 'bg-[#18191D] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Full Name / Rider Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Siddhartha"
                    className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    Radio Callsign
                  </label>
                  <input
                    type="text"
                    required
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="GhostRider"
                    className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 uppercase focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    Motorcycle
                  </label>
                  <div className="relative">
                    <Bike className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      placeholder="Ninja 650"
                      className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-8 pr-2 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@ridersunited.app"
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                minLength={tab === 'register' ? 12 : undefined}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-full bg-[#18191D] hover:bg-black text-white font-semibold text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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

        {/* Footer */}
        <div className="pt-2 flex flex-col items-center gap-1 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-700 font-medium"
          >
            Continue as Guest Rider
          </button>
        </div>

      </div>
    </div>
  );
};
