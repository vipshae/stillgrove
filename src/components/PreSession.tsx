import { motion } from 'motion/react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { type Screen } from '../types';

interface PreSessionProps {
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  key?: string;
}

const moods = [
  { icon: '😊', label: 'Great' },
  { icon: '😐', label: 'Okay' },
  { icon: '😔', label: 'Sad' },
  { icon: '😰', label: 'Anxious' },
  { icon: '😠', label: 'Angry' },
];

export default function PreSession({ onNavigate, onBack }: PreSessionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="flex-grow flex flex-col max-w-3xl mx-auto w-full px-6 pb-24 relative"
    >
      <header className="flex items-center justify-between py-8 w-full">
        <button 
          onClick={onBack}
          aria-label="Go back" 
          className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors duration-500"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <div className="font-headline text-lg italic text-on-surface-variant tracking-wide opacity-70">
          Pre-Session
        </div>
        <div className="w-12 h-12"></div>
      </header>
      
      <main className="flex-1 flex flex-col gap-12 sm:gap-16">
        <section className="flex flex-col gap-4 mt-4">
          <h1 className="font-headline text-4xl sm:text-5xl font-normal leading-tight tracking-[-0.02em] text-on-surface">
            How are you<br/>arriving today?
          </h1>
          <p className="text-on-surface-variant text-lg font-normal max-w-md">
            Take a quiet moment to check in with yourself before we begin.
          </p>
        </section>
        
        <section className="bg-white/50 p-6 sm:p-10 rounded-[40px] border border-on-surface/5 shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="grid grid-cols-5 gap-3 sm:gap-6 relative z-10">
            {moods.map((mood, i) => (
              <button key={i} className="flex flex-col items-center gap-4 group focus:outline-none">
                <div className="w-full aspect-square rounded-full bg-white flex items-center justify-center text-3xl shadow-sm border border-on-surface/5 transition-all duration-500 group-hover:scale-110 group-focus:ring-2 ring-primary ring-offset-2">
                  {mood.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface opacity-40 group-hover:opacity-100 transition-opacity">{mood.label}</span>
              </button>
            ))}
          </div>
        </section>
        
        <section className="flex flex-col items-center justify-center py-4 relative">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl"></div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }} 
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
              className="absolute inset-2 border-2 border-primary-fixed/40 rounded-full opacity-60"
            ></motion.div>
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 1 }}
              className="absolute inset-8 border border-primary-fixed/60 rounded-full opacity-80"
            ></motion.div>
            <div className="relative w-28 h-28 bg-gradient-to-tr from-primary/10 to-primary-fixed-dim/20 rounded-full backdrop-blur-sm flex items-center justify-center border border-surface-container-highest">
              <span className="font-headline text-primary-container text-lg italic opacity-80">breathe</span>
            </div>
          </div>
          <div className="absolute top-0 right-10 md:right-32 rotate-[-6deg] bg-secondary-container px-4 py-1.5 rounded-full shadow-sm text-on-secondary-container">
            <span className="font-script text-xl">take a deep breath</span>
          </div>
        </section>
        
        <section className="flex flex-col gap-4">
          <label className="font-headline text-2xl text-on-surface font-normal" htmlFor="intention">Set your intention</label>
          <div className="relative">
            <textarea 
              className="w-full bg-surface-container-high text-on-surface text-lg rounded-xl rounded-b-none border-0 border-b-2 border-outline-variant/15 focus:ring-0 focus:border-primary focus:bg-surface-dim transition-all duration-700 resize-none p-6 pb-8 placeholder:text-on-surface-variant/40 min-h-[140px] font-body" 
              id="intention" 
              placeholder="e.g., I want to stay present and calm..."
            ></textarea>
          </div>
        </section>
        
        <div className="mt-8 flex justify-center pb-8">
          <button 
            onClick={() => onNavigate('breathing')}
            className="bg-primary text-white font-body text-sm uppercase tracking-[0.2em] font-bold px-16 py-6 rounded-full hover:bg-primary-container transition-all duration-500 w-full max-w-md shadow-lg shadow-primary/10 flex items-center justify-center gap-3 group"
          >
            <span>Start Session</span>
            <ArrowRightIcon className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" />
          </button>
        </div>
      </main>
    </motion.div>
  );
}
