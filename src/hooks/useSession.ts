import { useState, useRef, useCallback } from 'react';
import { calculateSQS } from '../core/sqs';
import { triggerEndSession } from '../core/sketch';
import { getCrossedStages, getStage } from '../core/stages';
import type { ActiveSession, DistractionSignal, SessionResultData } from '../core/types';
import type { Tree } from './useTrees';

interface SessionDeps {
  createSession: (treeId: string, data: Record<string, unknown>) => Promise<{ id: string }>;
  updateSession: (treeId: string, sessionId: string, updates: Record<string, unknown>) => Promise<void>;
  updateTree: (treeId: string, updates: Partial<Tree>) => Promise<void>;
}

export function useSession({ createSession, updateSession, updateTree }: SessionDeps) {
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(0);
  const [sessionResult, setSessionResult] = useState<SessionResultData | null>(null);

  const activeSessionRef = useRef<ActiveSession | null>(null);
  const sessionDurationRef = useRef(0);
  const perMinuteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (perMinuteTimerRef.current) {
      clearInterval(perMinuteTimerRef.current);
      perMinuteTimerRef.current = null;
    }
  }, []);

  // Stable — no deps. Breathing's useEffect([onSignal]) relies on ref stability.
  const onSignal = useCallback((update: DistractionSignal) => {
    if (!activeSessionRef.current) return;
    const d = activeSessionRef.current.distraction;
    activeSessionRef.current.distraction = {
      count:             update.distractionCount     ?? d.count,
      seconds:           update.distractionSeconds   ?? d.seconds,
      stillness:         update.stillnessScore       ?? d.stillness,
      uninterruptedMins: update.uninterruptedMinutes ?? d.uninterruptedMins,
    };
  }, []);

  // createSession and updateSession are both stable (memoized with [] in useTrees)
  const startSession = useCallback(async (treeId: string, moodBefore: number) => {
    const res = await createSession(treeId, {
      moodBefore, durationMinutes: 0, uninterruptedMinutes: 0,
      stillnessScore: 0, distractionCount: 0, distractionSeconds: 0,
    });
    activeSessionRef.current = {
      id: res.id, treeId, moodBefore,
      distraction: { count: 0, seconds: 0, stillness: 0.8, uninterruptedMins: 0 },
    };
    sessionDurationRef.current = 0;
    setSessionDurationMinutes(0);
    perMinuteTimerRef.current = setInterval(() => {
      setSessionDurationMinutes(prev => {
        const next = prev + 1;
        sessionDurationRef.current = next;
        if (activeSessionRef.current) {
          updateSession(activeSessionRef.current.treeId, activeSessionRef.current.id, { durationMinutes: next })
            .catch(console.error);
        }
        return next;
      });
    }, 60_000);
  }, [createSession, updateSession]);

  // trees is passed at call time rather than being a dep, so finishSession stays stable
  // even as the Firestore snapshot updates the tree list during a session.
  const finishSession = useCallback(async (moodAfter: number, trees: Tree[]): Promise<SessionResultData | undefined> => {
    const session = activeSessionRef.current;
    if (!session) return;
    stopTimer();
    const duration = sessionDurationRef.current;

    await updateSession(session.treeId, session.id, { moodAfter, durationMinutes: duration });

    const d = session.distraction;
    const newSqs = calculateSQS(
      {
        durationMinutes:      duration,
        uninterruptedMinutes: d.uninterruptedMins || duration,
        stillnessScore:       d.stillness,
        moodBefore:           session.moodBefore,
        moodAfter,
        distractionCount:     d.count,
        distractionSeconds:   d.seconds,
      },
      { recentSQS: [], sessionsLast7Days: 0, totalHours: trees.find(t => t.id === session.treeId)?.totalHours ?? 0 },
    );

    await updateSession(session.treeId, session.id, { sqs: newSqs });

    const tree = trees.find(t => t.id === session.treeId);
    const addedHours = duration / 60;
    const newTotalHours = (tree?.totalHours ?? 0) + addedHours;

    // Streak: compare today's date (midnight) against lastSessionDate (midnight).
    // Same day → unchanged (multiple sessions). Yesterday → +1. Older → reset to 1.
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const yesterdayMidnight = new Date(todayMidnight); yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
    const lastMidnight = tree?.lastSessionDate ? new Date(tree.lastSessionDate) : null;
    if (lastMidnight) lastMidnight.setHours(0, 0, 0, 0);
    const newStreak = !lastMidnight
      ? 1
      : lastMidnight.getTime() === todayMidnight.getTime()
        ? (tree?.currentStreak ?? 1)
        : lastMidnight.getTime() === yesterdayMidnight.getTime()
          ? (tree?.currentStreak ?? 0) + 1
          : 1;

    await updateTree(session.treeId, { totalHours: newTotalHours, sqs: newSqs, currentStreak: newStreak, lastSessionDate: new Date() });

    triggerEndSession(newTotalHours, addedHours);

    const prevTotalHours = tree?.totalHours ?? 0;
    const crossedStages  = getCrossedStages(prevTotalHours, newTotalHours);
    // If a stage boundary was crossed, replay the animation from the new stage's
    // entry point so the tree visibly grows from a fresh start on the new canvas.
    const replayFromHours = crossedStages.length > 0
      ? getStage(newTotalHours).minHours
      : prevTotalHours;

    const result: SessionResultData = {
      sqs:           newSqs,
      durationMinutes: duration,
      totalHours:    newTotalHours,
      prevTotalHours,
      replayFromHours,
      moodBefore:    session.moodBefore,
      moodAfter,
      treeName:      tree?.name ?? '',
      treeId:        session.treeId,
      crossedStages,
    };

    setSessionResult(result);

    activeSessionRef.current = null;
    sessionDurationRef.current = 0;
    setSessionDurationMinutes(0);

    return result;
  }, [stopTimer, updateSession, updateTree]);

  // Called on sign-out to discard any in-progress session
  const resetSession = useCallback(() => {
    stopTimer();
    activeSessionRef.current = null;
    sessionDurationRef.current = 0;
    setSessionDurationMinutes(0);
    setSessionResult(null);
  }, [stopTimer]);

  return { sessionDurationMinutes, sessionResult, onSignal, startSession, finishSession, resetSession };
}
