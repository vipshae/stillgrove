import { useState, useEffect, startTransition } from 'react';
import { collection, doc, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface Session {
  id: string;
  durationMinutes: number;
  moodBefore: number | null;
  moodAfter: number | null;
  sqs: number | null;
  createdAt: Date;
}

export function useSessions(treeId: string | null, count = 3) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!treeId) {
      startTransition(() => { setSessions([]); setLoading(false); });
      return;
    }
    startTransition(() => setLoading(true));
    const q = query(
      collection(doc(db, 'trees', treeId), 'sessions'),
      orderBy('createdAt', 'desc'),
      limit(count),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        startTransition(() => {
          setSessions(snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              durationMinutes: (data.durationMinutes ?? 0) as number,
              moodBefore: (data.moodBefore ?? null) as number | null,
              moodAfter: (data.moodAfter ?? null) as number | null,
              sqs: (data.sqs ?? null) as number | null,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            };
          }));
          setLoading(false);
        });
      },
      (err) => {
        console.error('Error fetching sessions:', err);
        startTransition(() => setLoading(false));
      },
    );
    return () => unsub();
  }, [treeId, count]);

  return { sessions, loading };
}

// Returns a Set of 'YYYY-MM-DD' strings for days in the past 7 days that had sessions.
export function useWeekActivity(treeId: string | null): Set<string> {
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!treeId) { startTransition(() => setActiveDays(new Set())); return; }
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const q = query(
      collection(doc(db, 'trees', treeId), 'sessions'),
      where('createdAt', '>=', since),
    );
    const unsub = onSnapshot(q, (snap) => {
      const days = new Set<string>();
      snap.docs.forEach(d => {
        const ts = d.data().createdAt;
        const date: Date | null = ts?.toDate ? ts.toDate() : null;
        if (date) days.add(date.toISOString().split('T')[0]);
      });
      startTransition(() => setActiveDays(days));
    });
    return () => unsub();
  }, [treeId]);

  return activeDays;
}
