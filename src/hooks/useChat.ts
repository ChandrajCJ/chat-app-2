import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, setDoc, writeBatch, where, limit } from 'firebase/firestore';
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
  const lastStatusUpdateRef = useRef<number>(0);
  const pendingMessagesToMarkReadRef = useRef<Set<string>>(new Set());
  const markReadTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef<boolean>(false);

  // Debounced status update function
  const debouncedStatusUpdate = useCallback(async (updates: any) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastStatusUpdateRef.current;
    
    // Only update if it's been at least 5 seconds since last update
    if (timeSinceLastUpdate < 5000) {
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      
      statusUpdateTimeoutRef.current = setTimeout(() => {
        debouncedStatusUpdate(updates);
      }, 5000 - timeSinceLastUpdate);
      return;
    }

    try {
      const userStatusRef = doc(db, 'status', currentUser);
      await setDoc(userStatusRef, {
        ...updates,
        lastSeen: serverTimestamp()
      }, { merge: true });
      lastStatusUpdateRef.current = now;
    } catch (error) {
      console.error('Error updating status:', error);
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

  // Handle user status with optimization
  useEffect(() => {
    // Set initial online status
    debouncedStatusUpdate({ isOnline: true, isTyping: false });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Immediately update to offline when tab becomes hidden
        const userStatusRef = doc(db, 'status', currentUser);
        setDoc(userStatusRef, {
          lastSeen: serverTimestamp(),
          isOnline: false,
          isTyping: false
        }, { merge: true });
      } else {
        // Update to online when tab becomes visible
        debouncedStatusUpdate({ isOnline: true, isTyping: false });
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for more reliable offline status update
      const userStatusRef = doc(db, 'status', currentUser);
      setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: false,
        isTyping: false
      }, { merge: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Listen to status changes with reduced frequency
    const statusRef = collection(db, 'status');
    const unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
      const newStatuses = { ...userStatuses };
      
      snapshot.docs.forEach((doc) => {
        const user = doc.id as User;
        const data = doc.data();
        newStatuses[user] = {
          lastSeen: data.lastSeen?.toDate() || new Date(),
          isOnline: data.isOnline || false,
          isTyping: data.isTyping || false
        };
      });
      
      setUserStatuses(newStatuses);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribeStatus();
      
      // Clear timeouts
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
      const userStatusRef = doc(db, 'status', currentUser);
      setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: false,
        isTyping: false
      }, { merge: true });
    };
  }, [currentUser, debouncedStatusUpdate]);

  // Simplified typing indicator
  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const userStatusRef = doc(db, 'status', currentUser);
      
      if (isTyping) {
        // Only update if not already typing to reduce writes
        if (!isTypingRef.current) {
          await updateDoc(userStatusRef, { isTyping: true });
          isTypingRef.current = true;
        }
        
        // Auto-clear typing status after 3 seconds
        typingTimeoutRef.current = setTimeout(async () => {
          try {
            await updateDoc(userStatusRef, { isTyping: false });
            isTypingRef.current = false;
          } catch (error) {
            console.error('Error clearing typing status:', error);
          }
        }, 3000);
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

  // Listen to messages with optimization
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(50) // Limit initial load to last 50 messages
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

        // Debounce batch read updates
        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }
        
        markReadTimeoutRef.current = setTimeout(() => {
          batchMarkMessagesAsRead();
        }, 1000);
      }
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