import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
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

  // Handle user status
  useEffect(() => {
    const userStatusRef = doc(db, 'status', currentUser);
    
    const updateStatus = async () => {
      await setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: true,
        isTyping: false
      });
    };

    updateStatus();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setDoc(userStatusRef, {
          lastSeen: serverTimestamp(),
          isOnline: false,
          isTyping: false
        });
      } else {
        updateStatus();
      }
    };

    const handleBeforeUnload = () => {
      setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: false,
        isTyping: false
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

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
      setDoc(userStatusRef, {
        lastSeen: serverTimestamp(),
        isOnline: false,
        isTyping: false
      });
    };
  }, [currentUser]);

  // Handle typing indicator
  const setTypingStatus = async (isTyping: boolean) => {
    const userStatusRef = doc(db, 'status', currentUser);
    await updateDoc(userStatusRef, { isTyping });
  };

  // Listen to messages in real-time
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc')
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
      });
      
      setMessages(newMessages);
      setLoading(false);

      // Mark messages as read if they're from other users
      newMessages.forEach(async (message) => {
        if (message.sender !== currentUser && !message.read) {
          const messageRef = doc(db, 'messages', message.id);
          await updateDoc(messageRef, { read: true });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  const sendMessage = async (text: string, replyTo?: Message) => {
    try {
      await setTypingStatus(false);
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
      const timestamp = Date.now();
      const voiceRef = ref(storage, `voice-messages/${currentUser}-${timestamp}.webm`);
      
      // Upload the blob
      await uploadBytes(voiceRef, blob);
      
      // Get the download URL
      const voiceUrl = await getDownloadURL(voiceRef);
      
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        text: '🎤 Voice message',
        sender: currentUser,
        timestamp: serverTimestamp(),
        read: false,
        voiceUrl
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
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
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
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