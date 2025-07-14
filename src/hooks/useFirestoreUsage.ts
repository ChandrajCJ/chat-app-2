import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UsageStats {
  reads: number;
  writes: number;
  deletes: number;
  lastUpdated: Date;
}

export const useFirestoreUsage = () => {
  const [usage, setUsage] = useState<UsageStats>({
    reads: 0,
    writes: 0,
    deletes: 0,
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let readCount = 0;
    let writeCount = 0;
    let deleteCount = 0;

    // Track reads from messages collection
    const messagesRef = collection(db, 'messages');
    const unsubscribeMessages = onSnapshot(messagesRef, (snapshot) => {
      // Each snapshot listener counts as reads
      readCount += snapshot.docs.length;
      
      // Track document changes
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          writeCount++;
        } else if (change.type === 'modified') {
          writeCount++;
        } else if (change.type === 'removed') {
          deleteCount++;
        }
      });

      setUsage(prev => ({
        reads: readCount,
        writes: writeCount,
        deletes: deleteCount,
        lastUpdated: new Date()
      }));
      setLoading(false);
    });

    // Track reads from status collection
    const statusRef = collection(db, 'status');
    const unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
      readCount += snapshot.docs.length;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          writeCount++;
        } else if (change.type === 'modified') {
          writeCount++;
        }
      });

      setUsage(prev => ({
        reads: readCount,
        writes: writeCount,
        deletes: deleteCount,
        lastUpdated: new Date()
      }));
    });

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, []);

  const resetUsage = () => {
    setUsage({
      reads: 0,
      writes: 0,
      deletes: 0,
      lastUpdated: new Date()
    });
  };

  return { usage, loading, resetUsage };
};