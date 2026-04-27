import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon } from 'lucide-react';

interface BreathingProps {
  onEndSession: () => void;
  onSignal?: (update: { distractionCount?: number; distractionSeconds?: number; stillnessScore?: number; uninterruptedMinutes?: number }) => void;
  key?: string;
}

export default function Breathing({ onEndSession, onSignal }: BreathingProps) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [showUI, setShowUI] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track interaction-based signals and report periodically
  const distractionCountRef = useRef(0);
  const distractionSecondsRef = useRef(0);
  const elapsedRef = useRef(0);
  const secondsSinceActivityRef = useRef(0);
  const signalThrottleRef = useRef(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const DURATIONS = { inhale: 4000, hold: 2000, exhale: 4000 } as const;
    const NEXT = { inhale: 'hold', hold: 'exhale', exhale: 'inhale' } as const;
    const tick = (current: keyof typeof NEXT) => {
      const next = NEXT[current];
      setPhase(next);
      t = setTimeout(() => tick(next), DURATIONS[next]);
    };
    t = setTimeout(() => tick('inhale'), DURATIONS.inhale);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const hideUI = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowUI(false), 3500);

      // record this as an interaction (possible distraction)
      distractionCountRef.current += 1;
      distractionSecondsRef.current += 5; // approximate seconds lost
      secondsSinceActivityRef.current = 0;

      if (onSignal) {
        const elapsed = elapsedRef.current || 1;
        const stillnessScore = 1 - Math.min(distractionSecondsRef.current / Math.max(60, elapsed), 1);
        onSignal({ distractionCount: distractionCountRef.current, distractionSeconds: distractionSecondsRef.current, stillnessScore, uninterruptedMinutes: Math.max(0, Math.floor((elapsed - distractionSecondsRef.current) / 60)) });
      }
    };

    const activityHandler = hideUI;
    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('mousedown', activityHandler);
    window.addEventListener('touchstart', activityHandler);
    window.addEventListener('keydown', activityHandler);

    hideUI();

    return () => {
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('mousedown', activityHandler);
      window.removeEventListener('touchstart', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      clearTimeout(timeout);
    };
  }, [onSignal]);

  // report periodic signals (every 10s)
  useEffect(() => {
    const rpt = setInterval(() => {
      elapsedRef.current += 1;
      secondsSinceActivityRef.current += 1;
      signalThrottleRef.current += 1;
      if (signalThrottleRef.current >= 10) {
        signalThrottleRef.current = 0;
        if (onSignal) {
          const elapsed = elapsedRef.current || 1;
          const stillnessScore = 1 - Math.min(distractionSecondsRef.current / Math.max(60, elapsed), 1);
          onSignal({ distractionCount: distractionCountRef.current, distractionSeconds: distractionSecondsRef.current, stillnessScore, uninterruptedMinutes: Math.max(0, Math.floor((elapsed - distractionSecondsRef.current) / 60)) });
        }
      }
    }, 1000);
    return () => clearInterval(rpt);
  }, [onSignal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#051108] z-[100] h-screen w-screen overflow-hidden flex flex-col items-center justify-center text-surface selection:bg-primary-container"
    >
      <div className="fixed inset-0 pointer-events-none opacity-5 bg-[url('data:image/svg+xml,%3Csvg_viewBox=%220_0_200_200%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22noiseFilter%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.65%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]"></div>
      
      <motion.div 
        animate={{ 
          scale: phase === 'inhale' ? 1.4 : phase === 'hold' ? 1.4 : 0.8,
          opacity: phase === 'inhale' ? 0.6 : phase === 'hold' ? 0.6 : 0.2
        }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[800px] max-h-[800px] bg-amber-500 rounded-full blur-[120px] pointer-events-none"
      ></motion.div>

      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-6 h-full">
        <div className="relative w-80 h-80 flex items-center justify-center mb-12">
          <div className="absolute inset-0 rounded-full border border-amber-500/10 scale-150 transition-transform duration-[4000ms] ease-in-out"></div>
          <div className="absolute inset-0 rounded-full bg-amber-500/5 scale-125 transition-transform duration-[4000ms] ease-in-out"></div>
          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-2xl scale-110"></div>
          <motion.div 
            animate={{ scale: phase === 'inhale' ? 1.1 : 1 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="relative w-56 h-56 rounded-full overflow-hidden z-20 flex items-center justify-center border border-white/5 bg-black/40"
          >
            <img 
              alt="Geometric fractal tree" 
              className="w-full h-full object-cover mix-blend-screen opacity-90" 
              src="https://picsum.photos/seed/fractal/600/600"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        <div className="relative h-16 w-full flex items-center justify-center mb-8">
          <AnimatePresence mode="wait">
            <motion.h1 
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 1 }}
              className="absolute font-headline text-4xl md:text-5xl text-amber-100/90 tracking-tighter font-light"
            >
              {phase === 'inhale' ? 'Inhale...' : phase === 'hold' ? 'Hold...' : 'Exhale...'}
            </motion.h1>
          </AnimatePresence>
        </div>

        <motion.div 
          animate={{ opacity: showUI ? 0.6 : 0 }}
          className="absolute bottom-16 flex flex-col items-center space-y-6"
        >
          <div className="text-amber-100/40 text-xs tracking-widest font-headline">
            {formatTime(timer)} <span className="mx-2">|</span> 05:00
          </div>
          <button 
            onClick={onEndSession}
            className="px-8 py-3 rounded-full bg-black/30 backdrop-blur-md text-amber-50/70 border border-amber-500/10 hover:bg-black/50 hover:border-amber-500/30 hover:text-amber-50 transition-all duration-500 flex items-center gap-3 group shadow-lg shadow-black/20"
          >
            <span className="text-[10px] tracking-widest uppercase font-medium">End Session</span>
            <XIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </motion.div>
      </main>
    </motion.div>
  );
}
