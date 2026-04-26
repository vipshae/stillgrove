import { useState, useEffect, startTransition } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Tree } from './useTrees';
import { db } from '../firebase';

export function useTree(treeId?: string | null) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!treeId) {
      startTransition(() => {
        setTree(null);
        setLoading(false);
      });
      return;
    }

    startTransition(() => {
      setLoading(true);
    });

    const ref = doc(db, 'trees', treeId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setTree(null);
      } else {
        const data = snap.data();
        setTree({
          id: snap.id,
          userId: data.userId as string,
          name: data.name as string,
          totalHours: (data.totalHours ?? 0) as number,
          sqs: (data.sqs ?? 0.5) as number,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          hasBloomed: data.hasBloomed as boolean | undefined,
          groveId: data.groveId as string | undefined,
        });
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error fetching tree:', err);
      setError(err as Error);
      setLoading(false);
    });

    return () => unsub();
  }, [treeId]);

  return { tree, loading, error } as const;
}
