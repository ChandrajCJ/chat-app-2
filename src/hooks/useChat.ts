import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, setDoc, writeBatch, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { Message, User, UserStatuses, ReactionType } from '../types';

export const useChat = (currentUser: User) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStatuses, setUserStatuses] = useState<UserStatuses>({
    '🐞': { lastSeen: new Date(), isOnline: false, isTyping: false },
    '🦎': { lastSeen: new Date(), isOnline: false, isTyping: false }
  });

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
    if (document.hidden || !isOnlineRef.current) return;
    
    try {
      const userStatusRef = doc(db, 'status', currentUser);
      await updateDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: true
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [currentUser]);

  // Batch mark messages as read
  const batchMarkMessagesAsRead = useCallback(async () => {
    if (pendingMessagesToMarkReadRef.current.size === 0) return;

    try {
      const batch = writeBatch(db);
      const messageIds = Array.from(pendingMessagesToMarkReadRef.current);
      
      messageIds.forEach(messageId => {
        const messageRef = doc(db, 'messages', messageId);
        batch.update(messageRef, { read: true });
      });

      await batch.commit();
      pendingMessagesToMarkReadRef.current.clear();
    } catch (error) {
      console.error('Error batch marking messages as read:', error);
    }
  }, []);

  // Handle user status with improved accuracy
  useEffect(() => {
    // Set initial online status immediately
    isOnlineRef.current = true;
    updateStatusImmediately({ isOnline: true, isTyping: false });

    // Start heartbeat to maintain online status (every 30 seconds)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

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
        
        // Restart heartbeat
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
      }
    };

    const handleFocus = () => {
      isOnlineRef.current = true;
      updateStatusImmediately({ isOnline: true });
      
      // Restart heartbeat on focus
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
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
        
        // Consider user offline if last seen is more than 2 minutes ago
        const isRecentlyActive = (new Date().getTime() - lastSeen.getTime()) < 120000; // 2 minutes
        
        newStatuses[user] = {
          lastSeen,
          isOnline: data.isOnline && isRecentlyActive,
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
  }, [currentUser, updateStatusImmediately, sendHeartbeat]);

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

  // Listen to messages - removed limit to show all messages
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc')
      // Removed limit(50) to show all messages
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read || false,
          replyTo: data.replyTo,
          edited: data.edited || false,
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;
      }).reverse(); // Reverse to get chronological order
      
      setMessages(newMessages);
      setLoading(false);

      // Batch mark unread messages from other users as read
      const unreadMessages = newMessages.filter(
        message => message.sender !== currentUser && !message.read
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(message => {
          pendingMessagesToMarkReadRef.current.add(message.id);
        });

        // Faster batch read updates (reduced from 1000ms to 500ms)
        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }
        
        markReadTimeoutRef.current = setTimeout(() => {
          batchMarkMessagesAsRead();
        }, 500);
      }
    }, (error) => {
      console.error('Error listening to messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, batchMarkMessagesAsRead]);

  const sendMessage = async (text: string, replyTo?: Message) => {
    try {
      // Clear typing status immediately when sending
      setTypingStatus(false);
      
      const messageData: any = {
        text,
        sender: currentUser,
        timestamp: serverTimestamp(),
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
      await updateDoc(messageRef, {
        text: newText,
        edited: true
      });
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

  return { 
    messages, 
    sendMessage, 
    loading,
    userStatuses,
    editMessage,
    deleteMessage,
    deleteAllMessages,
    reactToMessage,
    removeReaction,
    setTypingStatus,
    sendVoiceMessage
  };
};