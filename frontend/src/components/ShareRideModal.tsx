import React, { useState } from 'react';
import { Share2, Copy, Check, MessageSquare, QrCode, X } from 'lucide-react';

interface ShareRideModalProps {
  isOpen: boolean;
  rideCode: string;
  rideTitle?: string;
  onClose: () => void;
}

export const ShareRideModal: React.FC<ShareRideModalProps> = ({
  isOpen,
  rideCode,
  rideTitle = 'Convoy Ride',
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?code=${encodeURIComponent(rideCode)}`
    : `https://ridersunited.app?code=${rideCode}`;

  const shareText = `🏍️ Join our motorcycle convoy on Riders United!\n\n🚩 Ride: ${rideTitle}\n🔑 Ride Code: ${rideCode}\n\nSign in, then open the invite to join live GPS and radio comms:\n${joinUrl}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/40">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wide text-white">INVITE CONVOY</h3>
            <p className="text-xs text-neutral-400">Share with signed-in riders; codes expire after inactivity</p>
          </div>
        </div>

        {/* Big Ride Code Banner */}
        <div className="mt-5 rounded-2xl border-2 border-red-500/40 bg-red-950/20 p-4 text-center">
          <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">OFFICIAL RIDE CODE</span>
          <div className="mt-1 font-mono text-3xl font-black tracking-widest text-red-500">
            {rideCode.toUpperCase()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-3">
          {/* 1-Tap WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 active:scale-95 transition-transform"
          >
            <MessageSquare className="h-5 w-5" />
            SHARE TO WHATSAPP GROUP
          </button>

          {/* Copy Direct Join Link */}
          <button
            onClick={handleCopyLink}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-200 hover:bg-neutral-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'JOIN LINK COPIED!' : 'COPY DIRECT INVITE LINK'}
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-center text-[11px] text-neutral-400">
          Riders need a Riders United account to join. Lobby codes expire after 24 hours without activity; active ride codes expire after 48 hours without activity.
        </div>

      </div>
    </div>
  );
};
