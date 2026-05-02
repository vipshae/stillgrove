import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRightIcon, LeafIcon } from 'lucide-react';
import { type Screen } from '../../core/types';
import TreeSketch from '../TreeSketch';
import { replayGrowthAnimation } from '../../core/sketch';

interface SessionResultProps {
  sqs: number;
  durationMinutes: number;
  totalHours: number;
  replayFromHours: number;
  moodBefore: number | null;
  moodAfter: number;
  treeName: string;
  treeId: string | null;
  onNavigate: (screen: Screen) => void;
  key?: string;
}

function sqsLabel(sqs: number): string {
  if (sqs >= 0.85) return 'Exceptional';
  if (sqs >= 0.70) return 'Strong';
  if (sqs >= 0.55) return 'Good';
  if (sqs >= 0.40) return 'Building';
  return 'Gentle start';
}

export default function SessionResult({
  sqs,
  durationMinutes,
  totalHours,
  replayFromHours,
  moodBefore,
  moodAfter,
  treeName,
  onNavigate,
}: SessionResultProps) {
  // After the new canvas instance mounts via TreeSketch, replay the growth animation
  // from the pre-session baseline so the tree visibly grows on this screen.
  // replayFromHours is prevTotalHours for same-stage sessions, or the new
  // stage's minHours when a boundary was crossed — so the tree animates from
  // the stage entry state on the freshly-mounted canvas.
  useEffect(() => {
    const id = setTimeout(() => replayGrowthAnimation(replayFromHours), 120);
    return () => clearTimeout(id);
  }, [replayFromHours]);

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const sqsPercent = Math.round(sqs * 100);
  const moodDelta = moodAfter - (moodBefore ?? 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-start bg-[#f4f2eb] px-6 py-16 overflow-y-auto"
    >
      <div className="w-full max-w-xl flex flex-col items-center gap-10">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/70 border border-on-surface/5 text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface/50">
            <LeafIcon className="w-3.5 h-3.5 text-primary" />
            Session complete
          </div>
          <h1 className="font-headline text-5xl md:text-6xl text-primary font-medium tracking-tight leading-none italic">
            {treeName} grows deeper.
          </h1>
        </div>

        {/* Tree — canvas is 500×720; anchor bottom so trunk is visible */}
        <div
          className="w-full overflow-hidden rounded-[40px] border border-on-surface/5 shadow-xl bg-[#f8f8f2] relative"
          style={{ height: 460 }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <TreeSketch totalHours={totalHours} sqs={sqs} />
          </div>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-3 gap-4">
          <div className="bg-white rounded-[24px] p-6 flex flex-col gap-1 border border-on-surface/5 shadow-sm">
            <span className="font-body text-[10px] uppercase tracking-widest font-bold text-on-surface/40">Quality</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-4xl text-primary">{sqsPercent}</span>
              <span className="font-body text-[10px] font-bold uppercase tracking-tight text-on-surface/30">SQS</span>
            </div>
            <span className="font-body text-xs text-on-surface/50">{sqsLabel(sqs)}</span>
          </div>

          <div className="bg-white rounded-[24px] p-6 flex flex-col gap-1 border border-on-surface/5 shadow-sm">
            <span className="font-body text-[10px] uppercase tracking-widest font-bold text-on-surface/40">Duration</span>
            <span className="font-headline text-4xl text-primary">{durationDisplay}</span>
            <span className="font-body text-xs text-on-surface/50">
              +{(durationMinutes / 60).toFixed(2)} hrs
            </span>
          </div>

          <div className="bg-white rounded-[24px] p-6 flex flex-col gap-1 border border-on-surface/5 shadow-sm">
            <span className="font-body text-[10px] uppercase tracking-widest font-bold text-on-surface/40">Mood</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline text-4xl text-primary">{moodBefore ?? '—'}</span>
              <span className="text-on-surface/30 text-lg">→</span>
              <span className="font-headline text-4xl text-primary">{moodAfter}</span>
            </div>
            <span className="font-body text-xs text-on-surface/50">
              {moodDelta > 0 ? 'Lifted' : moodDelta < 0 ? 'Shifted' : 'Steady'}
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate('sanctuary')}
          className="group inline-flex items-center justify-center gap-3 px-10 py-5 font-bold text-[13px] uppercase tracking-widest text-white bg-[#425a4a] rounded-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 w-full max-w-sm"
        >
          Return to Sanctuary
          <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>

      </div>
    </motion.div>
  );
}
