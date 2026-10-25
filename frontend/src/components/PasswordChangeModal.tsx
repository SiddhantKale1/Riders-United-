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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-black bg-white p-5 text-black shadow-[6px_6px_0px_#000]">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2 font-black uppercase">
            <KeyRound className="h-4 w-4 text-[#2563eb]" /> Change password
          </div>
          <button type="button" onClick={onClose} aria-label="Close password change" className="rounded border border-black p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-xs font-bold">
          Current password
          <input
            required
            autoComplete="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-black bg-slate-50 p-2"
          />
        </label>
        <label className="block text-xs font-bold">
          New password (12 characters minimum)
          <input
            required
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-black bg-slate-50 p-2"
          />
        </label>
        {error && <p role="alert" className="text-xs font-bold text-red-700">{error}</p>}
        <button disabled={isSaving} className="w-full rounded-lg border-2 border-black bg-[#ef4444] p-2 text-sm font-black text-white disabled:opacity-60">
          {isSaving ? 'Saving…' : 'Update password'}
        </button>
        <p className="text-[10px] text-slate-600">Changing your password signs out other sessions.</p>
      </form>
    </div>
  );
};
