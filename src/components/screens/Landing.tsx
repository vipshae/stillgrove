import { motion } from 'motion/react';
import { ArrowRightIcon } from 'lucide-react';
import { type Screen } from '../../core/types';

interface LandingProps {
  onNavigate: (screen: Screen) => void;
  key?: string | number;
}

export default function Landing({ onNavigate }: LandingProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-grow flex flex-col relative w-full overflow-hidden bg-background"
    >
      {/* Ambient Background Washes */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,238,219,0.2)_0%,rgba(255,249,233,0)_100%)] opacity-70 pointer-events-none"></div>
      
      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 py-20 text-center max-w-screen-2xl mx-auto w-full">
        
        {/* Floating Polaroid (Left) */}
        <motion.div 
          initial={{ x: -100, opacity: 0, rotate: -15 }}
          animate={{ x: 0, opacity: 1, rotate: -8 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          className="absolute left-[5%] xl:left-[10%] top-[25%] hidden lg:block hover:rotate-[-4deg] transition-transform duration-700 cursor-pointer"
        >
          <div className="bg-white p-4 pt-4 pb-12 rounded-sm shadow-xl w-72 border border-on-surface/5">
            <div className="w-full aspect-square overflow-hidden bg-surface-container mb-4">
              <img 
                alt="A moment of stillness" 
                className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]" 
                src="https://picsum.photos/seed/fern/600/600"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="font-script text-2xl text-on-surface/60 text-center">A moment of stillness.</p>
          </div>
        </motion.div>

        {/* Hero Content */}
        <div className="max-w-5xl z-20">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-[#efefea] text-on-surface opacity-60 text-[11px] font-bold tracking-[0.25em] uppercase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
            A living journal
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-headline text-6xl md:text-8xl lg:text-9xl text-primary font-medium tracking-tight leading-[0.95] mb-12"
          >
            Cultivate your presence, <br />
            <span className="italic">one breath at a time.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-body text-xl text-on-surface opacity-70 max-w-2xl mx-auto mb-16 leading-relaxed font-light"
          >
            A sanctuary from the noise. Gather your thoughts, tend to your rituals, and watch your inner grove flourish in a space designed for quiet reflection.
          </motion.p>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-10 items-center justify-center"
          >
            <button 
              onClick={() => onNavigate('auth')}
              className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-[13px] uppercase tracking-widest text-white bg-[#425a4a] rounded-xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
            >
              <span className="relative z-10 flex items-center gap-3">
                Start Your Grove
                <ArrowRightIcon className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </button>
            <a className="font-headline text-xl text-primary border-b-2 border-primary/20 pb-0.5 hover:border-primary transition-all duration-500 cursor-pointer">
              Explore the methodology
            </a>
          </motion.div>
        </div>

        {/* Sticky Note (Right) */}
        <motion.div 
          initial={{ x: 100, opacity: 0, rotate: 10 }}
          animate={{ x: 0, opacity: 1, rotate: 4 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
          className="absolute right-[5%] xl:right-[15%] bottom-[15%] hidden lg:block hover:rotate-[2deg] transition-transform duration-700 cursor-pointer"
        >
          <div className="bg-[#f0f0e8]/80 backdrop-blur-sm p-8 rounded-lg shadow-lg w-80 text-left border border-on-surface/5">
            <p className="font-body text-[15px] text-on-surface opacity-70 leading-relaxed italic mb-6">
              "The mind is like water. When it's turbulent, it's difficult to see. When it's calm, everything becomes clear."
            </p>
            <div className="flex flex-col gap-1 items-start">
              <div className="w-24 h-px bg-on-surface/10 mb-4"></div>
              <span className="font-body text-[10px] uppercase tracking-[0.25em] font-bold text-on-surface opacity-30">Morning Reflection</span>
            </div>
          </div>
        </motion.div>

      </section>
    </motion.div>
  );
}
