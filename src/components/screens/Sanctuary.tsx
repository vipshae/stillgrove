import { motion } from 'motion/react';
import { ArrowRightIcon, LeafIcon, TimerIcon, FlameIcon, SunIcon, ChevronRightIcon } from 'lucide-react';
import { type Screen } from '../../core/types';
import { useTree } from '../../hooks/useTree';
import { useSessions, useWeekActivity } from '../../hooks/useSessions';
import TreeSketch from '../TreeSketch';

interface SanctuaryProps {
  treeName?: string;
  treeId?: string | null;
  onNavigate: (screen: Screen) => void;
  key?: string;
}

export default function Sanctuary({ treeName, treeId, onNavigate }: SanctuaryProps) {
  const { tree, loading: treeLoading } = useTree(treeId ?? null);
  const { sessions } = useSessions(treeId ?? null, 3);
  const activeDays = useWeekActivity(treeId ?? null);
  const avgDuration = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / sessions.length)
    : null;
  const currentStreak = tree?.currentStreak ?? 0;

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d;
  });

  const displayName = tree?.name ?? treeName ?? 'Aethelgard';
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-grow flex flex-col w-full bg-background selection:bg-primary-container selection:text-on-primary-container"
    >
      {/* Texture Noise is on body via index.css */}

      {/* Dashboard Content */}
      <main className="flex-grow max-w-screen-2xl mx-auto w-full px-10 md:px-16 pt-12 pb-24 space-y-24">
        
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-20 items-center">
          <div className="space-y-10 max-w-xl">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#efefea] text-on-surface/60 text-[11px] font-bold tracking-[0.2em] uppercase">
              <LeafIcon className="w-4 h-4 text-primary-container" />
              Your Grove is flourishing
            </div>
            
            <div className="space-y-8">
              <h1 className="font-headline text-7xl md:text-8xl text-primary font-medium tracking-tight leading-[0.95]">
                Welcome back to stillness.
              </h1>
              <p className="font-body text-xl text-on-surface/70 leading-relaxed font-light">
                Your anchor tree, <span className="font-headline italic text-primary font-medium">{displayName}</span>, has grown deeper roots. It remembers your quiet moments. Ready to cultivate more?
              </p>
            </div>

            <div className="flex flex-col gap-6 items-start pt-8">
              <button 
                onClick={() => onNavigate('pre_session')}
                className="group inline-flex items-center justify-center px-10 py-5 font-bold text-[14px] uppercase tracking-[0.2em] text-white bg-[#425a4a] rounded-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
              >
                Begin New Session
                <ArrowRightIcon className="w-5 h-5 ml-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Procedural Tree Part */}
          <div className="relative">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="w-full lg:w-[700px] aspect-[4/3] rounded-[48px] overflow-hidden shadow-2xl relative border border-on-surface/5 bg-[#f8f8f2]"
            >
              {/* Render the procedural sketch for this tree */}
              {!treeLoading && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                  <TreeSketch totalHours={tree?.totalHours ?? 0} sqs={tree?.sqs ?? 0.5} />
                </div>
              )}
              
              <div className="absolute top-10 right-10 bg-white/80 backdrop-blur-sm px-6 py-2.5 rounded-full border border-on-surface/5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
                <span className="font-headline italic text-primary text-sm opacity-60">Planted Oct 12</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Dash Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-24">
          
          {/* Growth & Insights */}
          <div className="space-y-10">
            <h2 className="font-headline text-5xl text-primary font-medium">Growth & Insights</h2>
            
            <div className="space-y-6">
              {/* Avg Session Card */}
              <div className="bg-[#e9e8de] rounded-[32px] p-10 flex flex-col justify-between h-[220px] relative border border-on-surface/5 overflow-hidden group hover:shadow-xl transition-all duration-500">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <TimerIcon className="w-5 h-5 text-primary-container" />
                    </div>
                    <span className="font-body text-[13px] uppercase tracking-widest font-bold text-on-surface opacity-60">Average Session</span>
                  </div>
                  <span className="font-body text-[10px] uppercase tracking-widest font-bold text-on-surface opacity-30">{sessions.length > 0 ? `Last ${sessions.length}` : ''}</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-4">
                    <span className="font-headline text-7xl text-primary leading-none">{avgDuration ?? '—'}</span>
                    <span className="font-body text-xl text-on-surface opacity-60 font-light italic">{avgDuration !== null ? 'minutes' : 'no sessions yet'}</span>
                  </div>
                </div>
              </div>

              {/* Continuity Card */}
              <div className="bg-[#f5f5f0] rounded-[32px] p-10 flex flex-col justify-between h-[220px] relative border border-on-surface/5 overflow-hidden group hover:shadow-xl transition-all duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <FlameIcon className="w-5 h-5 text-[#c27d66]" />
                  </div>
                  <span className="font-body text-[13px] uppercase tracking-widest font-bold text-[#c27d66]">Continuity</span>
                </div>
                <div className="space-y-6">
                  <div className="flex items-baseline gap-4">
                    <span className="font-headline text-5xl text-on-surface">{currentStreak}</span>
                    <span className="font-body text-xl text-on-surface opacity-60 font-light italic">day streak</span>
                  </div>
                  <div className="flex gap-2">
                    {last7Days.map((date) => {
                      const key = date.toISOString().split('T')[0];
                      const active = activeDays.has(key);
                      const isToday = key === new Date().toISOString().split('T')[0];
                      return (
                        <div
                          key={key}
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-body text-[10px] font-bold transition-all duration-500 ${
                            active
                              ? 'bg-[#5a5a40] text-white shadow-md'
                              : 'bg-white border border-on-surface/5 text-on-surface opacity-20'
                          } ${isToday ? 'ring-2 ring-[#5a5a40]/40 ring-offset-1' : ''}`}
                        >
                          {DAY_LABELS[date.getDay()]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="space-y-10">
            <div className="flex justify-between items-end">
              <h2 className="font-headline text-5xl text-primary font-medium">Recent Notes</h2>
              <button className="flex items-center gap-2 font-body text-[11px] uppercase tracking-widest font-bold text-on-surface opacity-40 hover:opacity-100 transition-opacity">
                View All <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Note Card 1 */}
              <div className="bg-[#f0f0e8] rounded-[24px] p-10 relative overflow-hidden group hover:shadow-lg transition-all duration-500 border border-on-surface/5 pl-14">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#5a5a40]/20 group-hover:bg-[#5a5a40] transition-all"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-body text-[13px] text-on-surface/40 italic">Yesterday, Evening</span>
                  <LeafIcon className="w-5 h-5 text-primary opacity-20" />
                </div>
                <h3 className="font-headline text-3xl text-on-surface mb-3">The weight of the afternoon</h3>
                <p className="font-body text-sm text-on-surface/60 leading-relaxed line-clamp-2">
                  Found it difficult to settle today. The wind outside seemed to mirror the rushing thoughts. Eventually, focusing on the breath acting as an anchor brought some...
                </p>
              </div>

              {/* Note Card 2 */}
              <div className="bg-[#fefaf0] rounded-[24px] p-10 relative overflow-hidden group hover:shadow-lg transition-all duration-500 border border-on-surface/5 pl-14">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-on-surface/5 group-hover:bg-[#c27d66]/40 transition-all"></div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-body text-[13px] text-on-surface/40 italic">Monday, Morning</span>
                  <SunIcon className="w-5 h-5 text-primary opacity-20" />
                </div>
                <h3 className="font-headline text-3xl text-on-surface mb-3">Clarity after rain</h3>
                <p className="font-body text-sm text-on-surface/60 leading-relaxed line-clamp-2">
                  A surprisingly deep session. The sound of lingering rain on the window helped ground me immediately. Noticed a pattern of anxiety around upcoming...
                </p>
              </div>
            </div>
          </div>

        </section>
      </main>
    </motion.div>
  );
}
