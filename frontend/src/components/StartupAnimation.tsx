import React, { useState, useEffect } from 'react';

interface StartupAnimationProps {
  onComplete: () => void;
}

export function StartupAnimation({ onComplete }: StartupAnimationProps) {
  const [phase, setPhase] = useState<number>(0);
  const [progressWidth, setProgressWidth] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    // Trigger progress line expansion
    const animFrame = requestAnimationFrame(() => {
      setProgressWidth(100);
    });

    // Phase 1: Eyebrow text reveals
    const t1 = setTimeout(() => setPhase(1), 120);

    // Phase 2: Main title reveals
    const t2 = setTimeout(() => setPhase(2), 450);

    // Phase 3: Divider line & tagline reveal
    const t3 = setTimeout(() => setPhase(3), 950);

    // Phase 4: Telemetry status confirms ready
    const t4 = setTimeout(() => setPhase(4), 1600);

    // Phase 5: Smooth exit transition
    const t5 = setTimeout(() => {
      setIsExiting(true);
    }, 2450);

    // Phase 6: Unmount callback
    const t6 = setTimeout(() => {
      onComplete();
    }, 2850);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        setIsExiting(true);
        setTimeout(onComplete, 220);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(onComplete, 220);
  };

  const getStatusText = () => {
    if (phase < 2) return 'INITIALIZING SENSORS';
    if (phase < 3) return 'SYNCHRONIZING FLEET GRID';
    if (phase < 4) return 'ENCRYPTED COMMS ACTIVE';
    return 'SYSTEM READY';
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] bg-[#08080a] flex flex-col justify-between items-center px-6 py-8 sm:px-12 sm:py-12 select-none cursor-pointer transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-[1.015] filter blur-[2px] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="Application Startup Sequence"
    >
      {/* Top Header Row (Minimalist telemetry coordinates & skip prompt) */}
      <div className="w-full max-w-4xl flex items-center justify-between text-zinc-500 font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase">
        <div className={`transition-opacity duration-700 ${phase >= 1 ? 'opacity-70' : 'opacity-0'}`}>
          NODE / IN-BOM-01
        </div>
        <div className="opacity-40 hover:opacity-100 transition-opacity">
          SKIP
        </div>
      </div>

      {/* Center Typographic Focal Point */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center px-4 my-auto">
        {/* Eyebrow Label */}
        <div
          className={`font-mono text-[10px] sm:text-[11px] tracking-[0.38em] text-zinc-500 uppercase transition-all duration-700 ease-out mb-3 sm:mb-4 ${
            phase >= 1
              ? 'opacity-80 translate-y-0 filter blur-0'
              : 'opacity-0 translate-y-2 filter blur-[4px]'
          }`}
        >
          CONVOY TELEMETRY PLATFORM
        </div>

        {/* Primary Brand Title */}
        <h1
          className={`font-light text-3xl sm:text-5xl md:text-6xl tracking-[0.28em] text-zinc-100 uppercase transition-all duration-700 ease-out ${
            phase >= 2
              ? 'opacity-100 translate-y-0 filter blur-0'
              : 'opacity-0 translate-y-3 filter blur-[6px]'
          }`}
        >
          RIDERS UNITED
        </h1>

        {/* Minimal Precision Hairline Divider */}
        <div
          className={`my-5 sm:my-6 h-[1px] bg-gradient-to-r from-transparent via-zinc-500 to-transparent transition-all duration-700 ease-out ${
            phase >= 3 ? 'w-32 sm:w-48 opacity-100' : 'w-0 opacity-0'
          }`}
        />

        {/* Secondary Tagline */}
        <p
          className={`font-sans text-[10px] sm:text-[12px] font-normal tracking-[0.26em] text-zinc-400 uppercase transition-all duration-700 ease-out ${
            phase >= 3
              ? 'opacity-90 translate-y-0 filter blur-0'
              : 'opacity-0 translate-y-2 filter blur-[4px]'
          }`}
        >
          REAL-TIME SQUAD GPS AND TACTICAL COMMS
        </p>
      </div>

      {/* Bottom Telemetry & Status Gauge */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-3">
        {/* Diagnostic Status Line */}
        <div
          className={`font-mono text-[9px] sm:text-[10px] tracking-[0.32em] text-zinc-400 uppercase transition-opacity duration-500 ${
            phase >= 1 ? 'opacity-80' : 'opacity-0'
          }`}
        >
          {getStatusText()}
        </div>

        {/* Ultra-Slim Progress Line */}
        <div className="w-24 sm:w-36 h-[1px] bg-zinc-800/80 overflow-hidden rounded-full">
          <div
            className="h-full bg-zinc-200 transition-all ease-linear"
            style={{
              width: `${progressWidth}%`,
              transitionDuration: '2400ms'
            }}
          />
        </div>

        {/* Tap Prompt */}
        <div className="text-zinc-600 font-mono text-[8px] sm:text-[9px] tracking-[0.3em] uppercase opacity-40 mt-1">
          TAP ANYWHERE TO ENTER
        </div>
      </div>
    </div>
  );
}

export default StartupAnimation;
