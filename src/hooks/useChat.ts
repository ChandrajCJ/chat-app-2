import { useState, useEffect } from 'react';
import { socket, api } from '../services/api';
import { Message, User, UserStatuses, ReactionType } from '../types';

export const useChat = (currentUser: User) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStatuses, setUserStatuses] = useState<UserStatuses>({
    '🐞': { lastSeen: new Date(), isOnline: false, isTyping: false },
    '🦎': { lastSeen: new Date(), isOnline: false, isTyping: false }
  });

  // Initialize socket connection and load initial data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Load initial messages
        const initialMessages = await api.getMessages();
        setMessages(initialMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));

        // Load user statuses
        const statuses = await api.getUserStatuses();
        const statusMap: UserStatuses = {
          '🐞': { lastSeen: new Date(), isOnline: false, isTyping: false },
          '🦎': { lastSeen: new Date(), isOnline: false, isTyping: false }
        };

        statuses.forEach((status: any) => {
          statusMap[status.userId as User] = {
            lastSeen: new Date(status.lastSeen),
            isOnline: status.isOnline,
            isTyping: status.isTyping
          };
        });

        setUserStatuses(statusMap);
        setLoading(false);

        // Login user
        socket.emit('user-login', currentUser);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setLoading(false);
      }
    };

    initializeChat();

    // Socket event listeners
    socket.on('new-message', (message: any) => {
      const formattedMessage = {
        ...message,
        id: message._id,
        timestamp: new Date(message.timestamp)
      };
      setMessages(prev => [...prev, formattedMessage]);

      // Mark as read if it's from another user
      if (message.sender !== currentUser) {
        socket.emit('mark-as-read', { messageId: message._id, userId: currentUser });
      }
    });

    socket.on('message-edited', (message: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === message._id 
          ? { ...message, id: message._id, timestamp: new Date(message.timestamp) }
          : msg
      ));
    });

    socket.on('message-deleted', (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    socket.on('message-reaction', (message: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === message._id 
          ? { ...message, id: message._id, timestamp: new Date(message.timestamp) }
          : msg
      ));
    });

    socket.on('message-read', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    });

    socket.on('user-statuses', (statuses: any[]) => {
      const statusMap: UserStatuses = { ...userStatuses };
      statuses.forEach((status: any) => {
        statusMap[status.userId as User] = {
          lastSeen: new Date(status.lastSeen),
          isOnline: status.isOnline,
          isTyping: status.isTyping
        };
      });
      setUserStatuses(statusMap);
    });

    socket.on('user-typing', ({ userId, isTyping }: { userId: User; isTyping: boolean }) => {
      setUserStatuses(prev => ({
        ...prev,
        [userId]: { ...prev[userId], isTyping }
      }));
    });

    socket.on('all-messages-deleted', () => {
      setMessages([]);
    });

    return () => {
      socket.off('new-message');
      socket.off('message-edited');
      socket.off('message-deleted');
      socket.off('message-reaction');
      socket.off('message-read');
      socket.off('user-statuses');
      socket.off('user-typing');
      socket.off('all-messages-deleted');
    };
  }, [currentUser]);

  const sendMessage = async (text: string, replyTo?: Message) => {
    try {
      const messageData: any = {
        text,
        sender: currentUser,
        timestamp: new Date()
      };

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          sender: replyTo.sender
        };
      }

      socket.emit('send-message', messageData);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendVoiceMessage = async (blob: Blob) => {
    try {
      await api.uploadVoiceMessage(blob, currentUser);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message. Please try again.');
    }
  };

  const editMessage = async (messageId: string, newText: string) => {
    try {
      socket.emit('edit-message', { messageId, text: newText });
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      socket.emit('delete-message', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const deleteAllMessages = async () => {
    try {
      await api.deleteAllMessages();
    } catch (error) {
      console.error('Error deleting all messages:', error);
    }
  };

  const reactToMessage = async (messageId: string, emoji: ReactionType) => {
    try {
      socket.emit('react-to-message', { messageId, reaction: emoji });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const removeReaction = async (messageId: string) => {
    try {
      socket.emit('remove-reaction', messageId);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const setTypingStatus = async (isTyping: boolean) => {
    try {
      socket.emit('typing', { userId: currentUser, isTyping });
    } catch (error) {
      console.error('Error setting typing status:', error);
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