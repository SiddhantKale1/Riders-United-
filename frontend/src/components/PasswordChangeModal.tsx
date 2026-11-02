import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { getApiBaseUrl } from '../services/apiConfig';
import { socketService } from '../services/socket';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const token = localStorage.getItem('riders_auth_token');
      const response = await fetch(`${getApiBaseUrl()}/api/auth/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not change password.');
      localStorage.setItem('riders_auth_token', data.token);
      socketService.reconnect();
      setCurrentPassword('');
      setNewPassword('');
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-[32px] border border-gray-150 bg-white p-6 text-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
            <KeyRound className="h-4 w-4 text-blue-600" /> Change Password
          </div>
          <button type="button" onClick={onClose} aria-label="Close password change" className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-xs font-semibold text-gray-700">
          Current password
          <input
            required
            autoComplete="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200/80 bg-gray-50 p-2.5 text-xs font-medium focus:bg-white focus:outline-none"
          />
        </label>
        <label className="block text-xs font-semibold text-gray-700">
          New password (12 characters minimum)
          <input
            required
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200/80 bg-gray-50 p-2.5 text-xs font-medium focus:bg-white focus:outline-none"
          />
        </label>
        {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
        <button disabled={isSaving} className="w-full rounded-full bg-[#18191D] hover:bg-black py-3 text-xs font-semibold text-white shadow-md transition-all disabled:opacity-60">
          {isSaving ? 'Saving…' : 'Update Password'}
        </button>
        <p className="text-[10px] text-gray-400 text-center">Changing your password signs out other active sessions.</p>
      </form>
    </div>
  );
};
