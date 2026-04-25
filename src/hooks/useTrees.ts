import { useState, useEffect } from 'react';
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

const treeCollectionName = 'trees';

export function useTrees(user?: User | null) {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // only subscribe to tree updates if user is signed in
  useEffect(() => {
    if (!user) {
      setTrees([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, treeCollectionName), where('userId', '==', user.uid));
    setLoading(true);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userTrees = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId as string,
          name: data.name as string,
          totalHours: (data.totalHours ?? 0) as number,
          sqs: (data.sqs ?? 0.5) as number,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          hasBloomed: data.hasBloomed as boolean | undefined,
          groveId: data.groveId as string | undefined,
        } as Tree;
      });
      setTrees(userTrees);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error listening for trees:', err);
      setError(err as Error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  const createTree = async (name: string) => {
    if (!user) return;
    const newTreeSeedData: Omit<Tree, 'id'> = {
      name,
      userId: user.uid,
      createdAt: new Date(),
      totalHours: 0,
      sqs: 0.5,
      hasBloomed: false,
      groveId: null,    
    };
    let docRef;
    try {
      docRef = await addDoc(collection(db, treeCollectionName), newTreeSeedData);
    } catch (err) {
      console.error('Error creating tree:', err);
      setError(err as Error);
      throw err;
    }
    // Do not mutate local state here — onSnapshot will pick up the new document and update state.
    const newTree: Tree = { 
      id: docRef.id, userId: user.uid, name, createdAt: newTreeSeedData.createdAt, totalHours: 0, sqs: 0.5, hasBloomed: false, groveId: null};
    return newTree;
  };

  const updateTree = async (treeId: string, updates: Partial<Tree>) => {
    try {
      await updateDoc(doc(db, treeCollectionName, treeId), updates);
    } catch (err) {
      console.error('Error updating tree:', err);
      setError(err as Error);
      throw err;
    }
    setTrees(prev => prev.map(tree =>
      tree.id === treeId ? { ...tree, ...updates } : tree
    ));
  };

  return { trees, loading, error, createTree, updateTree };
}
