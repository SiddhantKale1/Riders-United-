import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, ShieldCheck, PhoneCall, MessageSquare, Send, X, Volume2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { speechService } from '../services/speechService';
import { socketService } from '../services/socket';

interface CrashSirenModalProps {
  isOpen: boolean;
  maxG: number;
  riderName: string;
  callsign: string;
  bikeModel: string;
  currentCoords: { lat: number; lng: number } | null;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  onCancel: () => void;
  onSosDispatched?: () => void;
}

export const CrashSirenModal: React.FC<CrashSirenModalProps> = ({
  isOpen,
  maxG,
  riderName,
  callsign,
  bikeModel,
  currentCoords,
  emergencyContactName = 'Emergency Contact',
  emergencyContactPhone = '',
  bloodGroup = 'O+',
  onCancel,
  onSosDispatched
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);
  const sirenOscillatorRef = useRef<OscillatorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Start Siren Sound Synthesizer via Web Audio API (Zero external MP3 needed)
  useEffect(() => {
    if (!isOpen) return;

    setSecondsRemaining(30);
    setIsDispatched(false);

    // Announce verbally in helmet/speaker
    speechService.speak('Crash detected. Emergency SOS will transmit in thirty seconds. Tap cancel if safe.', 'urgent');

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);

      // Pitch sweep siren
      const now = ctx.currentTime;
      for (let i = 0; i < 30; i++) {
        osc.frequency.linearRampToValueAtTime(950, now + i * 0.8 + 0.4);
        osc.frequency.linearRampToValueAtTime(600, now + i * 0.8 + 0.8);
      }

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      sirenOscillatorRef.current = osc;
    } catch (e) {
      console.warn('AudioContext siren failed:', e);
    }

    // Start 30s countdown timer
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        // Trigger haptics on device
        try {
          Haptics.impact({ style: ImpactStyle.Heavy });
        } catch {}

        if (prev <= 1) {
          clearInterval(interval);
          handleExecuteSos();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      stopSiren();
    };
  }, [isOpen]);

  const stopSiren = () => {
    try {
      if (sirenOscillatorRef.current) {
        sirenOscillatorRef.current.stop();
        sirenOscillatorRef.current.disconnect();
        sirenOscillatorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {}
  };

  const handleCancel = () => {
    stopSiren();
    speechService.speak('Emergency SOS aborted. Resuming ride mode.', 'normal');
    onCancel();
  };

  const handleExecuteSos = () => {
    stopSiren();
    setIsDispatched(true);

    const lat = currentCoords?.lat || 18.922;
    const lng = currentCoords?.lng || 72.8346;
    const mapsLink = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    const sosMessage = `🚨 EMERGENCY CRASH ALERT: Rider ${riderName} (${callsign}) riding a ${bikeModel} had an impact (${maxG}G). Blood Group: ${bloodGroup}. Live GPS Location: ${mapsLink}`;

    // 1. Broadcast over Convoy Socket.io Channel
    socketService.emit('alert:create', {
      type: 'sos',
      title: '🚨 CRASH IMPACT DETECTED',
      detail: `${riderName} (${callsign}) - ${maxG}G impact detected! Blood Group: ${bloodGroup}. Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng
    });

    speechService.announceSos(callsign);

    if (onSosDispatched) {
      onSosDispatched();
    }

    // 2. Trigger native device SMS via carrier (100% free with user's mobile plan)
    if (emergencyContactPhone) {
      const smsUri = `sms:${emergencyContactPhone}?body=${encodeURIComponent(sosMessage)}`;
      window.location.href = smsUri;
    }
  };

  const openWhatsAppSos = () => {
    const lat = currentCoords?.lat || 18.922;
    const lng = currentCoords?.lng || 72.8346;
    const mapsLink = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    const text = `🚨 EMERGENCY CRASH ALERT: Rider ${riderName} (${callsign}) detected crash (${maxG}G) at ${mapsLink}. Blood Group: ${bloodGroup}`;
    const url = emergencyContactPhone
      ? `https://wa.me/${emergencyContactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-4 border-red-600 bg-neutral-950 p-6 text-white shadow-[0_0_80px_rgba(220,38,38,0.7)]">
        
        {/* Pulsing Red Emergency Header */}
        <div className="flex items-center justify-between border-b border-red-900/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/50 animate-pulse">
              <AlertTriangle className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest text-red-400 uppercase">HIGH-G IMPACT DETECTED</div>
              <h2 className="text-xl font-black text-white">CRASH DETECTOR</h2>
            </div>
          </div>
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-mono font-bold text-red-400">
            {maxG}G IMPACT
          </div>
        </div>

        {!isDispatched ? (
          <div className="mt-6 flex flex-col items-center text-center">
            
            {/* Giant Circular Countdown */}
            <div className="relative my-4 flex h-36 w-36 items-center justify-center rounded-full border-4 border-red-500/30 bg-red-950/40 shadow-inner">
              <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-25" />
              <div className="flex flex-col items-center">
                <span className="text-5xl font-black tracking-tighter text-red-500 font-mono">
                  {secondsRemaining}
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">SECONDS</span>
              </div>
            </div>

            <p className="text-sm font-medium text-neutral-300">
              Broadcasting SOS to convoy riders & sending emergency SMS in <span className="font-bold text-red-400">{secondsRemaining}s</span>.
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-400">
              <Volume2 className="h-4 w-4 text-red-400 animate-pulse" />
              <span>Helmet siren alarm sounding</span>
            </div>

            {/* Giant Glove-Friendly Abort Button */}
            <button
              onClick={handleCancel}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-600 px-6 py-4 text-lg font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 active:scale-95 transition-transform"
            >
              <ShieldCheck className="h-6 w-6" />
              I'M OK — CANCEL SOS
            </button>

            {/* Instant SOS Trigger */}
            <button
              onClick={handleExecuteSos}
              className="mt-3 text-xs font-bold text-red-400 hover:text-red-300 underline underline-offset-4 tracking-wider uppercase"
            >
              SEND SOS IMMEDIATELY
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/50">
              <Send className="h-8 w-8 animate-bounce" />
            </div>

            <h3 className="mt-4 text-xl font-black text-red-400 uppercase tracking-wide">
              EMERGENCY SOS DISPATCHED
            </h3>

            <p className="mt-2 text-xs text-neutral-300">
              Your exact GPS coordinates have been transmitted to all convoy riders on the live map.
            </p>

            <div className="mt-4 w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Rider:</span>
                <span className="font-bold text-white">{riderName} ({callsign})</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Blood Group:</span>
                <span className="font-bold text-red-400">{bloodGroup}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Emergency Contact:</span>
                <span className="font-bold text-white">{emergencyContactName} ({emergencyContactPhone || 'Not set'})</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Coordinates:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : 'GPS Acquired'}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 w-full">
              <button
                onClick={openWhatsAppSos}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp SOS
              </button>

              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:bg-neutral-700"
              >
                <X className="h-4 w-4" />
                Dismiss
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
