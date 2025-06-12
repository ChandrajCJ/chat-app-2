import React, { useEffect, useRef } from 'react';
import { Message, User, ReactionType } from '../types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  loading: boolean;
  isOtherUserTyping: boolean;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, text: string) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: ReactionType) => void;
  onRemoveReaction: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUser,
  loading,
  isOtherUserTyping,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const lastMessageIdRef = useRef<string>('');

  useEffect(() => {
    const shouldScroll = () => {
      if (messages.length === 0) return false;
      
      const lastMessage = messages[messages.length - 1];
      const isNewMessage = messages.length > prevMessagesLengthRef.current;
      const isDifferentMessage = lastMessage.id !== lastMessageIdRef.current;
      
      // Always scroll for new messages or when the last message changes
      if (isNewMessage || isDifferentMessage) {
        // Check if user is near bottom of chat (within 100px)
        if (containerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          
          // Auto-scroll if user is near bottom OR if it's their own message
          return isNearBottom || lastMessage.sender === currentUser;
        }
        return true;
      }
      
      return false;
    };

    if (shouldScroll()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    // Update refs
    prevMessagesLengthRef.current = messages.length;
    if (messages.length > 0) {
      lastMessageIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages, currentUser]);

  // Also scroll when typing indicator appears/disappears
  useEffect(() => {
    if (isOtherUserTyping && containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [isOtherUserTyping]);

  const scrollToMessage = (messageId: string) => {
    if (!containerRef.current) return;

    const messageElement = containerRef.current.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
          <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
          <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageItem 
              key={message.id} 
              message={message} 
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onRemoveReaction={onRemoveReaction}
              scrollToMessage={scrollToMessage}
            />
          ))}
          {isOtherUserTyping && <TypingIndicator />}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;