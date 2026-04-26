import { motion } from 'motion/react';
import { LeafIcon, WindIcon, AnchorIcon, DropletsIcon, SunIcon } from 'lucide-react';

interface ClosingProps {
  onFinish: (moodAfter: number) => void;
  durationMinutes?: number;
  key?: string;
}

const moods = [
  { icon: <WindIcon className="w-4 h-4" />, label: 'Light' },
  { icon: <AnchorIcon className="w-4 h-4" />, label: 'Grounded' },
  { icon: <DropletsIcon className="w-4 h-4" />, label: 'Flowing' },
  { icon: <SunIcon className="w-4 h-4" />, label: 'Clear' },
];

export default function Closing({ onFinish, durationMinutes = 0 }: ClosingProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-grow flex items-center justify-center p-6 md:p-12"
    >
      <main className="w-full max-w-4xl mx-auto relative z-20">
        <div className="bg-white rounded-[40px] p-10 md:p-16 ambient-shadow relative overflow-hidden flex flex-col items-center text-center border border-on-surface/5">
          <div className="mb-12 relative w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mb-6">
              <LeafIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-headline text-5xl md:text-6xl text-primary mb-4 italic">Ritual Complete</h1>
            <p className="font-body text-[11px] uppercase tracking-[0.2em] font-bold text-on-surface opacity-40">Your stillness has nurtured a new branch in your grove.</p>
          </div>
          
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 mb-14">
            <div className="col-span-1 md:col-span-8 h-80 rounded-[32px] relative overflow-hidden flex items-center justify-center bg-[#e9e9e0] border border-on-surface/5">
              <img 
                className="w-full h-full object-cover opacity-90" 
                src="https://picsum.photos/seed/growth/800/400" 
                alt="Growth Visual"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-8 left-8 bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full border border-on-surface/5">
                <span className="font-headline italic text-primary text-sm">Today's Growth</span>
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
              <div className="bg-[#f5f5f0] rounded-[24px] p-8 flex-1 flex flex-col justify-center items-start text-left border border-on-surface/5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-primary-container mb-3">Stillness Quality</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-5xl text-primary">87</span>
                  <span className="text-[10px] uppercase font-bold text-on-surface opacity-30 tracking-tighter">SQS</span>
                </div>
              </div>
              <div className="bg-[#f5f5f0] rounded-[24px] p-8 flex-1 flex flex-col justify-center items-start text-left border border-on-surface/5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-primary-container mb-3">Duration</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-4xl text-on-surface">{durationMinutes}</span>
                  <span className="text-[10px] uppercase font-bold text-on-surface opacity-30 tracking-tighter">min</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full max-w-xl bg-surface-container-low/50 rounded-[32px] p-10 mb-12 relative border border-on-surface/5">
            <h2 className="font-headline text-3xl text-primary mb-8 italic">How do you feel now?</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {moods.map((mood, i) => (
                <button key={i} onClick={() => { if (onFinish) onFinish(i+1); }} className="bg-white hover:bg-primary text-on-surface hover:text-white px-8 py-4 rounded-full transition-all duration-400 border border-on-surface/5 shadow-sm flex items-center gap-3 font-body text-[11px] uppercase tracking-widest font-bold group">
                    <span className="opacity-60 group-hover:opacity-100">{mood.icon}</span>
                    {mood.label}
                  </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-8 mt-4">
            <button
              onClick={() => onFinish && onFinish(3)}
              className="font-body text-[11px] uppercase tracking-widest font-bold text-on-surface opacity-30 hover:opacity-60 transition-opacity underline underline-offset-8"
            >
              Skip reflection
            </button>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
