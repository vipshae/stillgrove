import { useState, useEffect, useCallback, startTransition } from 'react';
import { collection, addDoc, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';

export interface Tree {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  totalHours: number;
  sqs: number;
  hasBloomed?: boolean;
  groveId?: string | null;
}

const TREES = 'trees';

export function useTrees(user?: User | null) {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  // Flips false→true exactly once after the first snapshot arrives for the current user.
  // Never reverts to false mid-session; resets to false only on sign-out.
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      startTransition(() => {
        setTrees([]);
        setLoading(false);
        setInitialized(false);
      });
      return;
    }
    const q = query(collection(db, TREES), where('userId', '==', user.uid));
    startTransition(() => setLoading(true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        startTransition(() => {
          setTrees(snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              userId: data.userId as string,
              name: data.name as string,
              totalHours: (data.totalHours ?? 0) as number,
              sqs: (data.sqs ?? 0.5) as number,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              hasBloomed: data.hasBloomed as boolean | undefined,
              groveId: data.groveId as string | undefined,
            } satisfies Tree;
          }));
          setLoading(false);
          setInitialized(true);
          setError(null);
        });
      },
      (err) => {
        console.error('Error listening for trees:', err);
        startTransition(() => {
          setError(err as Error);
          setLoading(false);
          setInitialized(true); // unblock routing even on error; treesError will show instead
        });
      },
    );
    return () => unsubscribe();
  }, [user]);

  // user.uid is the only closure dep; user identity change triggers full re-sub above
  const createTree = useCallback(async (name: string) => {
    if (!user) return;
    const seed = {
      name,
      userId: user.uid,
      createdAt: new Date(),
      totalHours: 0,
      sqs: 0.5,
      hasBloomed: false,
      groveId: null,
    };
    try {
      const ref = await addDoc(collection(db, TREES), seed);
      // Return the optimistic tree; onSnapshot will confirm it shortly
      return { id: ref.id, ...seed } as Tree;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [user]);

  // No state deps — only calls Firestore and setError (stable setter)
  const createSession = useCallback(async (treeId: string, data: Record<string, unknown>) => {
    try {
      const ref = await addDoc(
        collection(doc(db, TREES, treeId), 'sessions'),
        { ...data, createdAt: new Date() },
      );
      return { id: ref.id };
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const updateSession = useCallback(async (
    treeId: string,
    sessionId: string,
    updates: Record<string, unknown>,
  ) => {
    try {
      await updateDoc(doc(db, TREES, treeId, 'sessions', sessionId), updates);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // setTrees is a stable React setter — safe in [] deps
  const updateTree = useCallback(async (treeId: string, updates: Partial<Tree>) => {
    try {
      await updateDoc(doc(db, TREES, treeId), updates);
      setTrees(prev => prev.map(t => t.id === treeId ? { ...t, ...updates } : t));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return { trees, loading, initialized, error, createTree, createSession, updateSession, updateTree };
}
