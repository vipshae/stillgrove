import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRightIcon } from 'lucide-react';
import type { MilestoneData } from '../../core/types';

const STAGE_ICONS: Record<string, string> = {
  'Seedling':   '🌱',
  'Sapling':    '🌿',
  'Young Tree': '🌳',
  'Elder Tree': '🌲',
  'Elder':      '🌳',
};

interface MilestoneProps extends MilestoneData {
  remainingCount: number;
  onContinue: () => void;
}

export default function Milestone({ stage, treeName, remainingCount, onContinue }: MilestoneProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(id);
  }, []);

  const icon = STAGE_ICONS[stage.label] ?? '🌿';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center justify-center bg-[#1c2418] px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={revealed ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-8 max-w-sm"
      >
        <div className="text-7xl">{icon}</div>

        <div className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.25em] text-white/40">
            A new stage
          </p>
          <h1 className="font-headline text-6xl text-white font-medium italic tracking-tight leading-none">
            {stage.label}
          </h1>
          <p className="font-body text-base text-white/50 leading-relaxed">
            {stage.description}
          </p>
        </div>

        <p className="font-body text-sm text-white/30">
          {treeName} grows onward.
        </p>

        <button
          onClick={onContinue}
          className="group inline-flex items-center gap-3 px-8 py-4 font-bold text-[12px] uppercase tracking-widest text-[#1c2418] bg-white/90 rounded-xl transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 mt-2"
        >
          {remainingCount > 1 ? 'Next milestone' : 'See your tree'}
          <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </motion.div>
  );
}
