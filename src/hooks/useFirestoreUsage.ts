import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface HourlyUsage {
  hour: string;
  reads: number;
  writes: number;
  deletes: number;
  timestamp: Date;
}

interface UsageStats {
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  hourlyData: HourlyUsage[];
  lastUpdated: Date;
}

export const useFirestoreUsage = () => {
  const [usage, setUsage] = useState<UsageStats>({
    totalReads: 0,
    totalWrites: 0,
    totalDeletes: 0,
    hourlyData: [],
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);

  // Initialize hourly data for the last 24 hours
  const initializeHourlyData = (): HourlyUsage[] => {
    const data: HourlyUsage[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      data.push({
        hour: hour.toISOString().slice(0, 13), // YYYY-MM-DDTHH format
        reads: 0,
        writes: 0,
        deletes: 0,
        timestamp: hour
      });
    }
    
    return data;
  };

  // Get current hour key
  const getCurrentHourKey = () => {
    return new Date().toISOString().slice(0, 13);
  };

  // Update usage for current hour
  const updateCurrentHourUsage = async (reads: number = 0, writes: number = 0, deletes: number = 0) => {
    const currentHour = getCurrentHourKey();
    const usageRef = doc(db, 'usage_analytics', currentHour);
    
    try {
      const docSnap = await getDoc(usageRef);
      const currentData = docSnap.exists() ? docSnap.data() : { reads: 0, writes: 0, deletes: 0 };
      
      await setDoc(usageRef, {
        reads: (currentData.reads || 0) + reads,
        writes: (currentData.writes || 0) + writes,
        deletes: (currentData.deletes || 0) + deletes,
        timestamp: serverTimestamp(),
        hour: currentHour
      }, { merge: true });
    } catch (error) {
      console.error('Error updating usage analytics:', error);
    }
  };

  // Load historical data from Firestore
  const loadHistoricalData = async () => {
    const hourlyData = initializeHourlyData();
    let totalReads = 0;
    let totalWrites = 0;
    let totalDeletes = 0;

    try {
      // Load data for each hour in the last 24 hours
      const promises = hourlyData.map(async (hourData) => {
        const usageRef = doc(db, 'usage_analytics', hourData.hour);
        const docSnap = await getDoc(usageRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            ...hourData,
            reads: data.reads || 0,
            writes: data.writes || 0,
            deletes: data.deletes || 0
          };
        }
        return hourData;
      });

      const resolvedData = await Promise.all(promises);
      
      // Calculate totals
      resolvedData.forEach(hour => {
        totalReads += hour.reads;
        totalWrites += hour.writes;
        totalDeletes += hour.deletes;
      });

      setUsage({
        totalReads,
        totalWrites,
        totalDeletes,
        hourlyData: resolvedData,
        lastUpdated: new Date()
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading historical usage data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load initial historical data
    loadHistoricalData();

    // Set up real-time listeners for current operations
    let currentSessionReads = 0;
    let currentSessionWrites = 0;
    let currentSessionDeletes = 0;

    // Track reads from messages collection
    const messagesRef = collection(db, 'messages');
    const unsubscribeMessages = onSnapshot(messagesRef, (snapshot) => {
      // Count reads (each document in snapshot)
      const newReads = snapshot.docs.length;
      if (newReads > currentSessionReads) {
        const readsToAdd = newReads - currentSessionReads;
        currentSessionReads = newReads;
        updateCurrentHourUsage(readsToAdd, 0, 0);
      }
      
      // Track document changes for writes/deletes
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          currentSessionWrites++;
          updateCurrentHourUsage(0, 1, 0);
        } else if (change.type === 'modified') {
          currentSessionWrites++;
          updateCurrentHourUsage(0, 1, 0);
        } else if (change.type === 'removed') {
          currentSessionDeletes++;
          updateCurrentHourUsage(0, 0, 1);
        }
      });
    });

    // Track reads from status collection
    const statusRef = collection(db, 'status');
    const unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
      // Count status reads
      const statusReads = snapshot.docs.length;
      updateCurrentHourUsage(statusReads, 0, 0);
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          updateCurrentHourUsage(0, 1, 0);
        }
      });
    });

    // Refresh data every hour to get latest analytics
    const refreshInterval = setInterval(() => {
      loadHistoricalData();
    }, 60 * 60 * 1000); // Every hour

    // Refresh data every 5 minutes for more frequent updates
    const quickRefreshInterval = setInterval(() => {
      loadHistoricalData();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
      clearInterval(refreshInterval);
      clearInterval(quickRefreshInterval);
    };
  }, []);

  const resetUsage = async () => {
    try {
      // Clear all hourly data from Firestore
      const hourlyData = initializeHourlyData();
      const promises = hourlyData.map(async (hourData) => {
        const usageRef = doc(db, 'usage_analytics', hourData.hour);
        await setDoc(usageRef, {
          reads: 0,
          writes: 0,
          deletes: 0,
          timestamp: serverTimestamp(),
          hour: hourData.hour
        });
      });

      await Promise.all(promises);
      
      // Reset local state
      setUsage({
        totalReads: 0,
        totalWrites: 0,
        totalDeletes: 0,
        hourlyData: initializeHourlyData(),
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error resetting usage data:', error);
    }
  };

  return { usage, loading, resetUsage };
};