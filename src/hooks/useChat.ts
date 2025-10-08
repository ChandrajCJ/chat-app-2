import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, setDoc, writeBatch, where, limit, startAfter, arrayUnion, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { Message, User, UserStatuses, ReactionType, PaginationState, RecurrenceType, DayOfWeek, ScheduledMessage } from '../types';

export const useChat = (currentUser: User) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    hasMore: true,
    isLoadingMore: false,
    lastVisible: null,
    totalLoaded: 0
  });
  const [userStatuses, setUserStatuses] = useState<UserStatuses>({
    '🐞': { lastSeen: new Date(), isOnline: false, isTyping: false },
    '🦎': { lastSeen: new Date(), isOnline: false, isTyping: false }
  });
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);

  // Refs for optimization
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const pendingMessagesToMarkReadRef = useRef<Set<string>>(new Set());
  const markReadTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef<boolean>(false);
  const isOnlineRef = useRef<boolean>(false);

  // Immediate status update function (no debouncing for critical updates)
  const updateStatusImmediately = useCallback(async (updates: any) => {
    try {
      const userStatusRef = doc(db, 'status', currentUser);
      await setDoc(userStatusRef, {
        ...updates,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating status immediately:', error);
    }
  }, [currentUser]);

  // Heartbeat function to maintain online status
  const sendHeartbeat = useCallback(async () => {
    // Only send heartbeat if tab is visible and user should be online
    if (document.hidden || !isOnlineRef.current) {
      // If tab is hidden, mark as offline
      if (document.hidden && isOnlineRef.current) {
        isOnlineRef.current = false;
        try {
          const userStatusRef = doc(db, 'status', currentUser);
          await updateDoc(userStatusRef, {
            lastSeen: serverTimestamp(),
            isOnline: false,
            isTyping: false
          });
        } catch (error) {
          console.error('Error updating offline status in heartbeat:', error);
        }
      }
      return;
    }
    
    try {
      const userStatusRef = doc(db, 'status', currentUser);
      await updateDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: true,
        isTyping: isTypingRef.current // Maintain current typing status
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      // If heartbeat fails, we might be offline
      isOnlineRef.current = false;
    }
  }, [currentUser]);

  // Batch mark messages as read
  const batchMarkMessagesAsRead = useCallback(async () => {
    if (pendingMessagesToMarkReadRef.current.size === 0) return;
    
    // Only mark as read if user is actually online
    if (!isOnlineRef.current) {
      return;
    }

    try {
      const batch = writeBatch(db);
      const messageIds = Array.from(pendingMessagesToMarkReadRef.current);
      const readTimestamp = serverTimestamp();
      
      messageIds.forEach(messageId => {
        const messageRef = doc(db, 'messages', messageId);
        batch.update(messageRef, { 
          read: true,
          readAt: readTimestamp
        });
      });

      await batch.commit();
      pendingMessagesToMarkReadRef.current.clear();
    } catch (error) {
      console.error('Error batch marking messages as read:', error);
    }
  }, []);

  // Mark all unread messages from other users as read when user comes online
  const markUnreadMessagesAsRead = useCallback(() => {
    if (!isOnlineRef.current) return;

    setMessages(prev => {
      const unreadMessages = prev.filter(
        message => message.sender !== currentUser && !message.read
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(message => {
          pendingMessagesToMarkReadRef.current.add(message.id);
        });

        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }

        markReadTimeoutRef.current = setTimeout(() => {
          batchMarkMessagesAsRead();
        }, 500);
      }

      return prev;
    });
  }, [currentUser, batchMarkMessagesAsRead]);

  // Handle user status with improved accuracy
  useEffect(() => {
    // Set initial online status immediately
    isOnlineRef.current = true;
    updateStatusImmediately({ isOnline: true, isTyping: false });

    // Mark unread messages as read when coming online
    markUnreadMessagesAsRead();

    // Start heartbeat to maintain online status (every 15 seconds for better accuracy)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Immediately update to offline when tab becomes hidden
        isOnlineRef.current = false;
        updateStatusImmediately({ isOnline: false, isTyping: false });

        // Clear heartbeat when hidden
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      } else {
        // Immediately update to online when tab becomes visible
        isOnlineRef.current = true;
        updateStatusImmediately({ isOnline: true, isTyping: false });

        // Mark unread messages as read when tab becomes visible again
        markUnreadMessagesAsRead();

        // Restart heartbeat
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);
      }
    };

    const handleFocus = () => {
      isOnlineRef.current = true;
      updateStatusImmediately({ isOnline: true });

      // Mark unread messages as read when window gets focus
      markUnreadMessagesAsRead();

      // Restart heartbeat on focus
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);
    };

    const handleBlur = () => {
      // Don't immediately go offline on blur, wait for visibility change
      // This prevents false offline status when clicking outside the window
    };

    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for more reliable offline status update
      isOnlineRef.current = false;
      const userStatusRef = doc(db, 'status', currentUser);
      
      // Try sendBeacon first (more reliable), fallback to regular update
      const data = JSON.stringify({
        isOnline: false,
        isTyping: false,
        lastSeen: new Date().toISOString()
      });
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/status/${currentUser}`, data);
      }
      
      // Also try regular update as fallback
      setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: false,
        isTyping: false
      }, { merge: true }).catch(() => {
        // Ignore errors on page unload
      });
    };

    const handleOnline = () => {
      isOnlineRef.current = true;
      updateStatusImmediately({ isOnline: true });

      // Mark unread messages as read when network comes back online
      markUnreadMessagesAsRead();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      updateStatusImmediately({ isOnline: false, isTyping: false });
    };

    // Add multiple event listeners for better detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to status changes with real-time updates
    const statusRef = collection(db, 'status');
    const unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
      const newStatuses = { ...userStatuses };
      
      snapshot.docs.forEach((doc) => {
        const user = doc.id as User;
        const data = doc.data();
        const lastSeen = data.lastSeen?.toDate() || new Date();
        
        // Consider user offline if last seen is more than 45 seconds ago (3x heartbeat interval)
        const isRecentlyActive = (new Date().getTime() - lastSeen.getTime()) < 45000; // 45 seconds
        
        newStatuses[user] = {
          lastSeen,
          isOnline: Boolean(data.isOnline && isRecentlyActive),
          isTyping: data.isTyping || false
        };
      });
      
      setUserStatuses(newStatuses);
    }, (error) => {
      console.error('Error listening to status updates:', error);
    });

    return () => {
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeStatus();
      
      // Clear intervals and timeouts
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }

      // Final offline status update
      isOnlineRef.current = false;
      const userStatusRef = doc(db, 'status', currentUser);
      setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: false,
        isTyping: false
      }, { merge: true }).catch(() => {
        // Ignore errors during cleanup
      });
    };
  }, [currentUser, updateStatusImmediately, sendHeartbeat, markUnreadMessagesAsRead]);

  // Improved typing indicator with faster response
  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const userStatusRef = doc(db, 'status', currentUser);
      
      if (isTyping) {
        // Immediately update typing status
        if (!isTypingRef.current) {
          await updateDoc(userStatusRef, { isTyping: true });
          isTypingRef.current = true;
        }
        
        // Auto-clear typing status after 2 seconds (reduced from 3)
        typingTimeoutRef.current = setTimeout(async () => {
          try {
            await updateDoc(userStatusRef, { isTyping: false });
            isTypingRef.current = false;
          } catch (error) {
            console.error('Error clearing typing status:', error);
          }
        }, 2000);
      } else {
        // Immediately clear typing status
        if (isTypingRef.current) {
          await updateDoc(userStatusRef, { isTyping: false });
          isTypingRef.current = false;
        }
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [currentUser]);

  // Load initial messages with pagination
  const loadInitialMessages = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(50) // Load more messages initially to ensure chat history is visible
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setMessages([]);
        setPagination(prev => ({
          ...prev,
          lastVisible: null,
          hasMore: false,
          totalLoaded: 0
        }));
        setLoading(false);
        return;
      }

      const initialMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          delivered: data.delivered || false,
          deliveredAt: data.deliveredAt?.toDate(),
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          editHistory: data.editHistory?.map((h: any) => ({
            text: h.text,
            editedAt: h.editedAt?.toDate()
          })) || [],
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;
      }).reverse(); // Reverse to get chronological order

      setMessages(initialMessages);
      setPagination(prev => ({
        ...prev,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === 50, // If we got less than 50, no more messages
        totalLoaded: snapshot.docs.length
      }));
      setLoading(false);

      // Batch mark unread messages from other users as read
      const unreadMessages = initialMessages.filter(
        message => message.sender !== currentUser && !message.read
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(message => {
          pendingMessagesToMarkReadRef.current.add(message.id);
        });

        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }
        
        markReadTimeoutRef.current = setTimeout(() => {
          batchMarkMessagesAsRead();
        }, 500);
      }
    } catch (error) {
      console.error('Error loading initial messages:', error);
      setLoading(false);
      // Re-throw to let the caller know there was an error
      throw error;
    }
  }, [currentUser, batchMarkMessagesAsRead]);

  // Load more messages for pagination
  const loadMoreMessages = useCallback(async () => {
    if (!pagination.hasMore || pagination.isLoadingMore || !pagination.lastVisible) {
      return;
    }

    try {
      setPagination(prev => ({ ...prev, isLoadingMore: true }));
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(pagination.lastVisible),
        limit(30) // Increased batch size for faster subsequent loading
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPagination(prev => ({
          ...prev,
          hasMore: false,
          isLoadingMore: false
        }));
        return;
      }

      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          delivered: data.delivered || false,
          deliveredAt: data.deliveredAt?.toDate(),
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          editHistory: data.editHistory?.map((h: any) => ({
            text: h.text,
            editedAt: h.editedAt?.toDate()
          })) || [],
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;
      }).reverse(); // Reverse to get chronological order

      // Prepend older messages to the beginning of the array
      setMessages(prev => [...newMessages, ...prev]);
      
      // The lastVisible should be the last document in the query order (before reversing)
      // This is the oldest message we just loaded, which will be our cursor for the next batch
      setPagination(prev => ({
        ...prev,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === 30, // If we got less than 30, no more messages
        totalLoaded: prev.totalLoaded + snapshot.docs.length,
        isLoadingMore: false
      }));

      // Batch mark unread messages as read
      const unreadMessages = newMessages.filter(
        message => message.sender !== currentUser && !message.read
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(message => {
          pendingMessagesToMarkReadRef.current.add(message.id);
        });

        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }
        
        markReadTimeoutRef.current = setTimeout(() => {
          batchMarkMessagesAsRead();
        }, 500);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      setPagination(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [pagination, currentUser, batchMarkMessagesAsRead]);

  // Real-time listener for new messages only (latest)
  useEffect(() => {
    let isInitialLoadComplete = false;
    let latestTimestamp: Date | null = null;
    let hasProcessedInitialSnapshot = false;

    // Initial load
    loadInitialMessages()
      .then(() => {
        isInitialLoadComplete = true;
        // Set the latest timestamp from loaded messages to filter real-time updates
        setMessages(prev => {
          if (prev.length > 0) {
            latestTimestamp = prev[prev.length - 1].timestamp;
          }
          return prev;
        });
      })
      .catch((error) => {
        console.error('Error in initial load, but continuing with real-time listener:', error);
        // Still allow real-time listener to work even if initial load fails
        isInitialLoadComplete = true;
      });

    // Listen for all message changes in real-time (new messages, reactions, edits, read receipts)
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Skip the very first snapshot from the listener as initial load handles it
      if (!hasProcessedInitialSnapshot) {
        hasProcessedInitialSnapshot = true;
        return;
      }

      // Skip processing until initial load is complete to avoid duplicates
      if (!isInitialLoadComplete) {
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const message = {
          id: change.doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          delivered: data.delivered || false,
          deliveredAt: data.deliveredAt?.toDate(),
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          editHistory: data.editHistory?.map((h: any) => ({
            text: h.text,
            editedAt: h.editedAt?.toDate()
          })) || [],
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;

        if (change.type === 'added') {
          // Only add messages that are newer than our latest loaded timestamp
          // or if we don't have a timestamp reference yet
          const shouldAddMessage = !latestTimestamp || 
            message.timestamp > latestTimestamp;
            
          if (shouldAddMessage) {
            setMessages(prev => {
              const isNewMessage = !prev.some(msg => msg.id === message.id);
              if (isNewMessage) {
                // Update latest timestamp
                latestTimestamp = message.timestamp;
                return [...prev, message];
              }
              return prev;
            });
          }
        } else if (change.type === 'modified') {
          // Message updated (reaction, edit, read receipt, etc.)
          setMessages(prev => 
            prev.map(msg => msg.id === message.id ? message : msg)
          );
        } else if (change.type === 'removed') {
          // Message deleted
          setMessages(prev => prev.filter(msg => msg.id !== message.id));
        }

        // Handle delivery and read receipts for incoming messages
        if (message.sender !== currentUser) {
          // Mark as delivered when message reaches recipient's device
          if (!message.delivered) {
            const messageRef = doc(db, 'messages', message.id);
            updateDoc(messageRef, {
              delivered: true,
              deliveredAt: serverTimestamp()
            }).catch(error => {
              console.error('Error marking message as delivered:', error);
            });
          }
          
          // Only mark as read if recipient is online and message is not already read
          if (!message.read && isOnlineRef.current) {
            pendingMessagesToMarkReadRef.current.add(message.id);
            
            if (markReadTimeoutRef.current) {
              clearTimeout(markReadTimeoutRef.current);
            }
            
            markReadTimeoutRef.current = setTimeout(() => {
              batchMarkMessagesAsRead();
            }, 500);
          }
        }
      });
    }, (error) => {
      console.error('Error listening to new messages:', error);
    });

    return () => unsubscribe();
  }, [currentUser, loadInitialMessages, batchMarkMessagesAsRead]);

  const sendMessage = async (text: string, replyTo?: Message) => {
    try {
      // Clear typing status immediately when sending
      setTypingStatus(false);
      
      const messageData: any = {
        text,
        sender: currentUser,
        timestamp: serverTimestamp(),
        delivered: false,
        read: false
      };

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          sender: replyTo.sender
        };
      }

      await addDoc(collection(db, 'messages'), messageData);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendVoiceMessage = async (blob: Blob) => {
    try {
      const filename = `voice-${currentUser}-${Date.now()}.webm`;
      const voiceRef = ref(storage, `voice-messages/${filename}`);
      
      const uploadResult = await uploadBytes(voiceRef, blob);
      const voiceUrl = await getDownloadURL(uploadResult.ref);
      
      await addDoc(collection(db, 'messages'), {
        text: '🎤 Voice message',
        sender: currentUser,
        timestamp: serverTimestamp(),
        delivered: false,
        read: false,
        voiceUrl
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message. Please try again.');
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    try {
      const messageRef = doc(db, 'messages', messageId);

      // Get current message to save its text to history
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const currentData = messageDoc.data();
        const currentText = currentData.text;

        // Only add to history if text is actually different
        if (currentText !== newText) {
          await updateDoc(messageRef, {
            text: newText,
            edited: true,
            editHistory: arrayUnion({
              text: currentText,
              editedAt: new Date()
            })
          });
        }
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const deleteAllMessages = async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      // Use batch for better performance
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting all messages:', error);
    }
  };

  const reactToMessage = async (messageId: string, emoji: ReactionType) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        reaction: emoji
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const removeReaction = async (messageId: string) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        reaction: null
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const scheduleMessage = async (text: string, date: Date, time: string, recurrence: RecurrenceType, selectedDays?: DayOfWeek[]) => {
    try {
      // Combine date and time into a single Date object
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const scheduledMessageData: any = {
        text,
        sender: currentUser,
        scheduledDate: Timestamp.fromDate(scheduledDateTime),
        scheduledTime: time,
        recurrence,
        createdAt: serverTimestamp(),
        sent: false,
        enabled: true
      };

      // Add selected days if custom recurrence
      if (recurrence === 'custom' && selectedDays && selectedDays.length > 0) {
        scheduledMessageData.selectedDays = selectedDays;
      }

      await addDoc(collection(db, 'scheduledMessages'), scheduledMessageData);
    } catch (error) {
      console.error('Error scheduling message:', error);
      throw error;
    }
  };

  const deleteScheduledMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'scheduledMessages', messageId));
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      throw error;
    }
  };

  const toggleScheduledMessage = async (messageId: string, enabled: boolean) => {
    try {
      const scheduledMsgRef = doc(db, 'scheduledMessages', messageId);
      await updateDoc(scheduledMsgRef, { enabled });
    } catch (error) {
      console.error('Error toggling scheduled message:', error);
      throw error;
    }
  };

  // Function to calculate next scheduled date for recurring messages
  const calculateNextScheduledDate = (currentDate: Date, recurrence: RecurrenceType): Date => {
    const nextDate = new Date(currentDate);
    
    switch (recurrence) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        // 'none' - don't reschedule
        return nextDate;
    }
    
    return nextDate;
  };

  // Listen to scheduled messages
  useEffect(() => {
    console.log('👂 Setting up scheduled messages listener for:', currentUser);
    
    const scheduledMessagesRef = collection(db, 'scheduledMessages');
    // Simple query with just where clause - no orderBy to avoid composite index requirement
    const q = query(scheduledMessagesRef, where('sender', '==', currentUser));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📨 Received scheduled messages update: ${snapshot.docs.length} messages`);
      
      const scheduled = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          sender: data.sender,
          scheduledDate: data.scheduledDate?.toDate() || new Date(),
          scheduledTime: data.scheduledTime,
          recurrence: data.recurrence,
          selectedDays: data.selectedDays,
          createdAt: data.createdAt?.toDate() || new Date(),
          sent: data.sent || false,
          enabled: data.enabled !== undefined ? data.enabled : true
        } as ScheduledMessage;
      });
      
      // Sort by scheduledDate in memory (ascending - soonest first)
      scheduled.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
      
      console.log('📋 Updated scheduled messages state:', scheduled.length);
      setScheduledMessages(scheduled);
    }, (error) => {
      console.error('❌ Error listening to scheduled messages:', error);
      console.error('Error details:', error);
    });

    return () => {
      console.log('🔌 Unsubscribing from scheduled messages listener');
      unsubscribe();
    };
  }, [currentUser]);

  // Scheduler service to check and send scheduled messages
  useEffect(() => {
    let schedulerInterval: NodeJS.Timeout;

    const checkAndSendScheduledMessages = async () => {
      console.log('🔍 Checking for scheduled messages...');
      try {
        const scheduledMessagesRef = collection(db, 'scheduledMessages');
        const now = new Date();
        
        // Simplified query - just get all scheduled messages and filter in memory
        // This avoids composite index requirements
        const q = query(scheduledMessagesRef);
        const snapshot = await getDocs(q);
        
        console.log(`📋 Found ${snapshot.docs.length} total scheduled messages`);

        // Process each scheduled message
        const sendPromises = snapshot.docs.map(async (docSnapshot) => {
          const scheduledMessageData = docSnapshot.data();
          const scheduledDate = scheduledMessageData.scheduledDate.toDate();
          
          // Filter: only process enabled, not-sent messages that are due
          if (!scheduledMessageData.enabled || scheduledMessageData.sent || scheduledDate > now) {
            return;
          }
          
          console.log(`✅ Processing scheduled message: "${scheduledMessageData.text.substring(0, 30)}..."`);
          console.log(`   Scheduled for: ${scheduledDate.toLocaleString()}`);
          console.log(`   Current time: ${now.toLocaleString()}`);
          console.log(`   Recurrence: ${scheduledMessageData.recurrence}`);
          
          // For custom recurrence, check if today is one of the selected days
          if (scheduledMessageData.recurrence === 'custom' && scheduledMessageData.selectedDays) {
            const dayName = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
            if (!scheduledMessageData.selectedDays.includes(dayName)) {
              console.log(`⏭️  Skipping - not a selected day (${dayName})`);
              // Not a selected day, skip sending but update to next occurrence
              const nextScheduledDate = calculateNextScheduledDate(
                scheduledDate, 
                scheduledMessageData.recurrence
              );
              const scheduledMsgRef = doc(db, 'scheduledMessages', docSnapshot.id);
              await updateDoc(scheduledMsgRef, {
                scheduledDate: Timestamp.fromDate(nextScheduledDate)
              });
              return;
            }
          }
          
          try {
            console.log(`📤 Sending message: "${scheduledMessageData.text}"`);
            
            // Send the message
            await addDoc(collection(db, 'messages'), {
              text: scheduledMessageData.text,
              sender: scheduledMessageData.sender,
              timestamp: serverTimestamp(),
              delivered: false,
              read: false
            });
            
            console.log('✉️ Message sent successfully!');

            // Check if this is a recurring message
            if (scheduledMessageData.recurrence && scheduledMessageData.recurrence !== 'none') {
              // Calculate next scheduled date
              let nextScheduledDate = calculateNextScheduledDate(
                scheduledDate, 
                scheduledMessageData.recurrence
              );

              // For custom recurrence, find the next matching day
              if (scheduledMessageData.recurrence === 'custom' && scheduledMessageData.selectedDays) {
                let attempts = 0;
                while (attempts < 7) {
                  const dayName = nextScheduledDate.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
                  if (scheduledMessageData.selectedDays.includes(dayName)) {
                    break;
                  }
                  nextScheduledDate = new Date(nextScheduledDate.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
                  attempts++;
                }
              }

              console.log(`🔁 Recurring message - next send: ${nextScheduledDate.toLocaleString()}`);
              
              // Update the scheduled message with the next date
              const scheduledMsgRef = doc(db, 'scheduledMessages', docSnapshot.id);
              await updateDoc(scheduledMsgRef, {
                scheduledDate: Timestamp.fromDate(nextScheduledDate),
                sent: false // Reset sent flag for next occurrence
              });
            } else {
              console.log('✔️  One-time message - marking as sent');
              // Mark as sent for non-recurring messages
              const scheduledMsgRef = doc(db, 'scheduledMessages', docSnapshot.id);
              await updateDoc(scheduledMsgRef, {
                sent: true
              });
            }
          } catch (error) {
            console.error('❌ Error sending scheduled message:', error);
          }
        });
        
        // Wait for all sends to complete
        await Promise.all(sendPromises);
        
      } catch (error) {
        console.error('❌ Error checking scheduled messages:', error);
      }
    };

    // Check for scheduled messages every 10 seconds (faster for testing)
    schedulerInterval = setInterval(checkAndSendScheduledMessages, 10000);
    
    console.log('⏰ Scheduler started - checking every 10 seconds');
    
    // Also check immediately on mount
    checkAndSendScheduledMessages();

    return () => {
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        console.log('⏹️  Scheduler stopped');
      }
    };
  }, [currentUser]);

  // Function to load all messages for search
  const loadAllMessagesForSearch = useCallback(async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      const allMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          delivered: data.delivered || false,
          deliveredAt: data.deliveredAt?.toDate(),
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          editHistory: data.editHistory?.map((h: any) => ({
            text: h.text,
            editedAt: h.editedAt?.toDate()
          })) || [],
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;
      }).reverse();
      
      return allMessages;
    } catch (error) {
      console.error('Error loading all messages:', error);
      return [];
    }
  }, []);

  // Optimized function to load messages until a specific message is found
  const loadMessagesUntil = useCallback(async (targetMessageId: string): Promise<boolean> => {
    try {
      // Check if message is already loaded
      const isAlreadyLoaded = messages.some(msg => msg.id === targetMessageId);
      if (isAlreadyLoaded) {
        return true;
      }

      console.log('Loading messages until target:', targetMessageId);

      // Strategy 1: Try to get the specific message document first
      const messagesRef = collection(db, 'messages');
      const targetDocRef = doc(db, 'messages', targetMessageId);
      
      try {
        const targetDocSnapshot = await getDocs(query(messagesRef, where('__name__', '==', targetDocRef)));
        
        if (!targetDocSnapshot.empty) {
          const targetDoc = targetDocSnapshot.docs[0];
          const targetData = targetDoc.data();
          const targetTimestamp = targetData.timestamp;

          if (targetTimestamp) {
            console.log('Found target message timestamp, loading context');
            // Load messages around the target timestamp
            const contextQuery = query(
              messagesRef,
              orderBy('timestamp', 'desc'),
              where('timestamp', '<=', targetTimestamp),
              limit(150) // Load more messages around target
            );

            const contextSnapshot = await getDocs(contextQuery);
            
            if (!contextSnapshot.empty) {
              const contextMessages = contextSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  text: data.text || '',
                  sender: data.sender,
                  timestamp: data.timestamp?.toDate() || new Date(),
                  delivered: data.delivered || false,
                  deliveredAt: data.deliveredAt?.toDate(),
                  read: data.read || false,
                  readAt: data.readAt?.toDate(),
                  replyTo: data.replyTo,
                  edited: data.edited || false,
                  editHistory: data.editHistory?.map((h: any) => ({
                    text: h.text,
                    editedAt: h.editedAt?.toDate()
                  })) || [],
                  voiceUrl: data.voiceUrl,
                  reaction: data.reaction
                } as Message;
              }).reverse();

              const foundInContext = contextMessages.some(msg => msg.id === targetMessageId);
              
              if (foundInContext) {
                console.log('Target message found in context, updating messages');
                
                // Merge messages without duplicates
                setMessages(prev => {
                  const existingIds = new Set(prev.map(msg => msg.id));
                  const newMessages = contextMessages.filter(msg => !existingIds.has(msg.id));
                  
                  // Prepend older messages to maintain chronological order
                  return [...newMessages, ...prev].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                });

                setPagination(prev => ({
                  ...prev,
                  totalLoaded: prev.totalLoaded + contextMessages.filter(msg => 
                    !messages.some(existing => existing.id === msg.id)
                  ).length,
                  hasMore: true
                }));

                return true;
              }
            }
          }
        }
      } catch (timestampError) {
        console.log('Timestamp strategy failed, falling back to batch loading');
      }

      // Fallback: Use the reliable batch loading method
      console.log('Using fallback batch loading');
      return await loadMessagesInBatches(targetMessageId);
    } catch (error) {
      console.error('Error in loadMessagesUntil:', error);
      // Final fallback to batch loading
      return await loadMessagesInBatches(targetMessageId);
    }
  }, [messages, pagination]);

  // Reliable batch loading function
  const loadMessagesInBatches = useCallback(async (targetMessageId: string): Promise<boolean> => {
    console.log('Starting batch loading for:', targetMessageId);
    
    let attempts = 0;
    const maxAttempts = 8; // Increased attempts for better reliability
    let currentLastVisible = pagination.lastVisible;
    let foundMessage = false;

    // If we don't have a cursor, start from the beginning
    if (!currentLastVisible) {
      console.log('No cursor found, starting fresh batch load');
      const messagesRef = collection(db, 'messages');
      const initialQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const initialSnapshot = await getDocs(initialQuery);
      if (!initialSnapshot.empty) {
        currentLastVisible = initialSnapshot.docs[initialSnapshot.docs.length - 1];
      }
    }

    while (!foundMessage && attempts < maxAttempts && currentLastVisible) {
      attempts++;
      console.log(`Batch loading attempt ${attempts}/${maxAttempts}`);
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(currentLastVisible),
        limit(50) // Load 50 messages per batch
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No more messages to load');
        break;
      }

      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          delivered: data.delivered || false,
          deliveredAt: data.deliveredAt?.toDate(),
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          editHistory: data.editHistory?.map((h: any) => ({
            text: h.text,
            editedAt: h.editedAt?.toDate()
          })) || [],
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;
      }).reverse();

      foundMessage = newMessages.some(msg => msg.id === targetMessageId);
      console.log(`Loaded ${newMessages.length} messages, target found:`, foundMessage);

      // Add messages to the beginning of the array (older messages)
      setMessages(prev => [...newMessages, ...prev]);
      
      // Update pagination state
      setPagination(prev => ({
        ...prev,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === 50,
        totalLoaded: prev.totalLoaded + snapshot.docs.length
      }));

      currentLastVisible = snapshot.docs[snapshot.docs.length - 1];

      if (foundMessage) {
        console.log('Target message found in batch!');
        break;
      }
    }

    console.log(`Batch loading completed. Found message:`, foundMessage);
    return foundMessage;
  }, [pagination, messages]);

  return { 
    messages, 
    sendMessage, 
    loading,
    pagination,
    loadMoreMessages,
    loadMessagesUntil,
    loadAllMessagesForSearch,
    userStatuses,
    editMessage,
    deleteMessage,
    deleteAllMessages,
    reactToMessage,
    removeReaction,
    setTypingStatus,
    sendVoiceMessage,
    scheduleMessage,
    deleteScheduledMessage,
    toggleScheduledMessage,
    scheduledMessages
  };
};