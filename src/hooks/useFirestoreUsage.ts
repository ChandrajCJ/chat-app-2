import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UsageStats {
  reads: number;
  writes: number;
  deletes: number;
  lastUpdated: Date;
}

export const useFirestoreUsage = () => {
  const [usage, setUsage] = useState<UsageStats>({
    reads: 0, // Your exact Firebase console reads
    writes: 0, // Your exact Firebase console writes
    deletes: 0, // Your exact Firebase console deletes
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let totalReads = 0; // Starting with your exact Firebase console values
    let totalWrites = 0;
    let totalDeletes = 0;

    // Create a function to estimate usage based on operations
    const estimateUsage = () => {
      // Listen to messages collection to estimate reads/writes
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
      
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        // Each snapshot listener call counts as reads equal to document count
        const currentReads = snapshot.docs.length;
        
        // Track document changes for writes/deletes
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            totalWrites++;
          } else if (change.type === 'modified') {
            totalWrites++;
          } else if (change.type === 'removed') {
            totalDeletes++;
          }
        });

        // Add reads from this snapshot
        totalReads += currentReads;

        setUsage({
          reads: totalReads,
          writes: totalWrites,
          deletes: totalDeletes,
          lastUpdated: new Date()
        });
        setLoading(false);
      });

      // Listen to status collection
      const statusRef = collection(db, 'status');
      const unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
        // Each status check counts as reads
        totalReads += snapshot.docs.length;
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            totalWrites++;
          }
        });

        setUsage(prev => ({
          reads: totalReads,
          writes: totalWrites,
          deletes: totalDeletes,
          lastUpdated: new Date()
        }));
      });

      return () => {
        unsubscribeMessages();
        unsubscribeStatus();
      };
    };

    const cleanup = estimateUsage();
    return cleanup;
  }, []);

  // Function to manually sync with actual Firebase usage (if you have access to usage API)
  const syncWithFirebaseUsage = async () => {
    try {
      // Reset to your current Firebase console values
      setUsage({
        reads: 0, // Your exact Firebase console reads
        writes: 0, // Your exact Firebase console writes
        deletes: 0, // Your exact Firebase console deletes
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error syncing with Firebase usage:', error);
    }
  };

  const resetUsage = () => {
    // Reset to your exact Firebase console values
    setUsage({
      reads: 0,
      writes: 0,
      deletes: 0,
      lastUpdated: new Date()
    });
  };

  return { usage, loading, resetUsage, syncWithFirebaseUsage };
};