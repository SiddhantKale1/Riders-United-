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
  AlertCircle
} from 'lucide-react';
import { AuthUser } from '../types';
import { getApiBaseUrl } from '../services/apiConfig';

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

      const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
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
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with database server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      {/* Neobrutalist Auth Card */}
      <div className="bg-white text-black border-2 border-black rounded-2xl p-5 w-full max-w-sm shadow-[6px_6px_0px_#000] flex flex-col space-y-3.5 relative">
        
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

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black text-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

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
                ? 'bg-[#ef4444] text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 border-2 border-[#ef4444] text-red-900 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Database Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {tab === 'register' && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
                  Rider Callsign
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="e.g. Apex, Ghost, Falcon"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
                  Motorcycle Model
                </label>
                <div className="relative flex items-center">
                  <Bike className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={bikeModel}
                    onChange={(e) => setBikeModel(e.target.value)}
                    placeholder="e.g. Himalayan 450, Duke 390"
                    className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                className="w-full bg-slate-50 border-2 border-black rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-0.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="password"
                required
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

        {/* Guest Mode Fallback */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] font-mono font-bold text-slate-500 hover:text-black underline"
          >
            Continue as Guest Rider
          </button>
        </div>

      </div>
    </div>
  );
};
