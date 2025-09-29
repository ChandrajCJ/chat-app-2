import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, setDoc, writeBatch, where, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { Message, User, UserStatuses, ReactionType, PaginationState } from '../types';

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

  // Refs for optimization and state management
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const pendingMessagesToMarkReadRef = useRef<Set<string>>(new Set());
  const markReadTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef<boolean>(false);
  const isOnlineRef = useRef<boolean>(false);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout>();
  const messageListenerRef = useRef<(() => void) | null>(null);
  const statusListenerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const lastHeartbeatRef = useRef<number>(0);
  const connectionStateRef = useRef<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  // Immediate status update function (no debouncing for critical updates)
  const updateStatusImmediately = useCallback(async (updates: any) => {
    try {
      const userStatusRef = doc(db, 'status', currentUser);
      await setDoc(userStatusRef, {
        ...updates,
        lastSeen: serverTimestamp()
      }, { merge: true });
      lastHeartbeatRef.current = Date.now();
    } catch (error) {
      console.error('Error updating status immediately:', error);
      connectionStateRef.current = 'disconnected';
    }
  }, [currentUser]);

  // Enhanced connection recovery function
  const handleConnectionRecovery = useCallback(async () => {
    console.log('🔄 Attempting connection recovery...');
    connectionStateRef.current = 'reconnecting';
    
    try {
      // Force immediate status update to test connection
      await updateStatusImmediately({ 
        isOnline: true, 
        isTyping: isTypingRef.current,
        reconnectedAt: serverTimestamp()
      });
      
      connectionStateRef.current = 'connected';
      console.log('✅ Connection recovered successfully');
      
      // Force refresh of message listeners
      if (messageListenerRef.current) {
        messageListenerRef.current();
        messageListenerRef.current = null;
      }
      
      // Restart real-time listeners
      setupMessageListener();
      
    } catch (error) {
      console.error('❌ Connection recovery failed:', error);
      connectionStateRef.current = 'disconnected';
      
      // Retry connection recovery after delay
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
      }
      reconnectionTimeoutRef.current = setTimeout(handleConnectionRecovery, 3000);
    }
  }, [updateStatusImmediately, currentUser]);

  // Enhanced heartbeat function with connection monitoring
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
      
      lastHeartbeatRef.current = Date.now();
      
      // If we were disconnected, mark as connected
      if (connectionStateRef.current !== 'connected') {
        connectionStateRef.current = 'connected';
        console.log('✅ Heartbeat successful - connection restored');
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      connectionStateRef.current = 'disconnected';
      // If heartbeat fails, we might be offline
      isOnlineRef.current = false;
      
      // Attempt connection recovery
      handleConnectionRecovery();
    }
  }, [currentUser, handleConnectionRecovery]);

  // Batch mark messages as read with enhanced error handling
  const batchMarkMessagesAsRead = useCallback(async () => {
    if (pendingMessagesToMarkReadRef.current.size === 0) return;
    
    // Only mark as read if user is actually online and connected
    if (!isOnlineRef.current || connectionStateRef.current !== 'connected') {
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
      console.log(`✅ Marked ${messageIds.length} messages as read`);
    } catch (error) {
      console.error('Error batch marking messages as read:', error);
      // Don't clear pending messages on error - retry later
      connectionStateRef.current = 'disconnected';
      handleConnectionRecovery();
    }
  }, [handleConnectionRecovery]);

  // Setup message listener with enhanced error handling
  const setupMessageListener = useCallback(() => {
    if (messageListenerRef.current) {
      messageListenerRef.current();
      messageListenerRef.current = null;
    }

    console.log('🔄 Setting up message listener...');
    
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`📨 Message snapshot received: ${snapshot.docChanges().length} changes`);
      
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const message = {
          id: change.doc.id,
          text: data.text || '',
          sender: data.sender,
          timestamp: data.timestamp?.toDate() || new Date(),
          delivered: data.delivered || false,
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;

        if (change.type === 'added') {
          // Only add messages that are newer than our latest loaded timestamp
          // or if we don't have a timestamp reference yet
          setMessages(prev => {
            const isNewMessage = !prev.some(msg => msg.id === message.id);
            if (isNewMessage) {
              console.log(`➕ Adding new message from ${message.sender}`);
              return [...prev, message];
            }
            return prev;
          });
        } else if (change.type === 'modified') {
          // Message updated (reaction, edit, read receipt, etc.)
          console.log(`✏️ Updating message ${message.id} - read: ${message.read}, reaction: ${message.reaction}`);
          setMessages(prev => 
            prev.map(msg => msg.id === message.id ? message : msg)
          );
        } else if (change.type === 'removed') {
          // Message deleted
          console.log(`🗑️ Removing message ${message.id}`);
          setMessages(prev => prev.filter(msg => msg.id !== message.id));
        }

        // Handle delivery and read receipts for incoming messages
        if (message.sender !== currentUser) {
          // Mark as delivered when message reaches recipient's device
          if (!message.delivered) {
            const messageRef = doc(db, 'messages', message.id);
            updateDoc(messageRef, { delivered: true }).catch(error => {
              console.error('Error marking message as delivered:', error);
            });
          }
          
          // Only mark as read if recipient is online, connected, and message is not already read
          if (!message.read && isOnlineRef.current && connectionStateRef.current === 'connected') {
            pendingMessagesToMarkReadRef.current.add(message.id);
            
            if (markReadTimeoutRef.current) {
              clearTimeout(markReadTimeoutRef.current);
            }
            
            markReadTimeoutRef.current = setTimeout(() => {
              batchMarkMessagesAsRead();
            }, 300); // Reduced timeout for faster read receipts
          }
        }
      });
      
      // Mark connection as healthy when we receive updates
      connectionStateRef.current = 'connected';
    }, (error) => {
      console.error('❌ Message listener error:', error);
      connectionStateRef.current = 'disconnected';
      
      // Attempt to reconnect
      handleConnectionRecovery();
    });

    messageListenerRef.current = unsubscribe;
    return unsubscribe;
  }, [currentUser, batchMarkMessagesAsRead, handleConnectionRecovery]);

  // Setup status listener with enhanced error handling
  const setupStatusListener = useCallback(() => {
    if (statusListenerRef.current) {
      statusListenerRef.current();
      statusListenerRef.current = null;
    }

    console.log('🔄 Setting up status listener...');
    
    const statusRef = collection(db, 'status');
    const unsubscribe = onSnapshot(statusRef, (snapshot) => {
      console.log(`👥 Status snapshot received: ${snapshot.docs.length} users`);
      
      const newStatuses = { ...userStatuses };
      
      snapshot.docs.forEach((doc) => {
        const user = doc.id as User;
        const data = doc.data();
        const lastSeen = data.lastSeen?.toDate() || new Date();
        
        // Consider user offline if last seen is more than 30 seconds ago (2x heartbeat interval)
        const isRecentlyActive = (new Date().getTime() - lastSeen.getTime()) < 30000; // 30 seconds
        
        newStatuses[user] = {
          lastSeen,
          isOnline: Boolean(data.isOnline && isRecentlyActive),
          isTyping: data.isTyping || false
        };
        
        console.log(`👤 ${user}: online=${newStatuses[user].isOnline}, typing=${newStatuses[user].isTyping}`);
      });
      
      setUserStatuses(newStatuses);
    }, (error) => {
      console.error('❌ Status listener error:', error);
      connectionStateRef.current = 'disconnected';
      
      // Attempt to reconnect
      handleConnectionRecovery();
    });

    statusListenerRef.current = unsubscribe;
    return unsubscribe;
  }, [userStatuses, handleConnectionRecovery]);

  // Handle user status with improved accuracy and connection recovery
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    console.log('🚀 Initializing chat connection...');
    
    // Set initial online status immediately
    isOnlineRef.current = true;
    updateStatusImmediately({ isOnline: true, isTyping: false });

    // Start heartbeat to maintain online status (every 10 seconds for better accuracy)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);

    // Enhanced visibility change handler
    const handleVisibilityChange = () => {
      console.log(`👁️ Visibility changed: ${document.hidden ? 'hidden' : 'visible'}`);
      
      if (document.hidden) {
        // Immediately update to offline when tab becomes hidden
        isOnlineRef.current = false;
        updateStatusImmediately({ isOnline: false, isTyping: false });
        
        // Clear heartbeat when hidden
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Clean up listeners to prevent stale connections
        if (messageListenerRef.current) {
          messageListenerRef.current();
          messageListenerRef.current = null;
        }
        if (statusListenerRef.current) {
          statusListenerRef.current();
          statusListenerRef.current = null;
        }
      } else {
        // Immediately update to online when tab becomes visible
        isOnlineRef.current = true;
        updateStatusImmediately({ isOnline: true, isTyping: false });
        
        // Restart heartbeat with immediate first beat
        sendHeartbeat();
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);
        
        // Restart listeners for real-time updates
        setTimeout(() => {
          setupMessageListener();
          setupStatusListener();
        }, 100);
        
        // Force connection recovery to ensure we're properly connected
        setTimeout(handleConnectionRecovery, 500);
      }
    };

    const handleFocus = () => {
      console.log('🎯 Window focused');
      isOnlineRef.current = true;
      updateStatusImmediately({ isOnline: true });
      
      // Restart heartbeat on focus
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      sendHeartbeat();
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);
      
      // Ensure listeners are active
      if (!messageListenerRef.current) {
        setupMessageListener();
      }
      if (!statusListenerRef.current) {
        setupStatusListener();
      }
    };

    const handleBlur = () => {
      // Don't immediately go offline on blur, wait for visibility change
      // This prevents false offline status when clicking outside the window
      console.log('🌫️ Window blurred');
    };

    const handleBeforeUnload = () => {
      console.log('👋 Page unloading - marking offline');
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
      console.log('🌐 Network online');
      isOnlineRef.current = true;
      updateStatusImmediately({ isOnline: true });
      handleConnectionRecovery();
    };

    const handleOffline = () => {
      console.log('📵 Network offline');
      isOnlineRef.current = false;
      updateStatusImmediately({ isOnline: false, isTyping: false });
      connectionStateRef.current = 'disconnected';
    };

    // Add multiple event listeners for better detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup initial listeners
    setupStatusListener();

    return () => {
      console.log('🧹 Cleaning up chat connection...');
      
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Clean up listeners
      if (statusListenerRef.current) {
        statusListenerRef.current();
        statusListenerRef.current = null;
      }
      if (messageListenerRef.current) {
        messageListenerRef.current();
        messageListenerRef.current = null;
      }
      
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
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
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
  }, [currentUser, updateStatusImmediately, sendHeartbeat, setupStatusListener, handleConnectionRecovery]);

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
        limit(10) // Reduced to 10 messages for instant loading
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
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
          voiceUrl: data.voiceUrl,
          reaction: data.reaction
        } as Message;
      }).reverse(); // Reverse to get chronological order

      setMessages(initialMessages);
      setPagination(prev => ({
        ...prev,
        lastVisible: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === 10, // If we got less than 10, no more messages
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
        }, 300);
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
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
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
        }, 300);
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
        
        // Setup message listener after initial load
        setTimeout(() => {
          setupMessageListener();
        }, 100);
      })
      .catch((error) => {
        console.error('Error in initial load, but continuing with real-time listener:', error);
        // Still allow real-time listener to work even if initial load fails
        isInitialLoadComplete = true;
        
        // Setup message listener even if initial load fails
        setTimeout(() => {
          setupMessageListener();
        }, 100);
      });

    return () => {
      // Cleanup handled by setupMessageListener
    };
  }, [currentUser, loadInitialMessages, setupMessageListener]);

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
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
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
                  read: data.read || false,
                  readAt: data.readAt?.toDate(),
                  replyTo: data.replyTo,
                  edited: data.edited || false,
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
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          replyTo: data.replyTo,
          edited: data.edited || false,
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
    sendVoiceMessage
  };
};