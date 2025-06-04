import React, { useEffect, useRef, useState } from 'react';
import { Message, User, ReactionType } from '../types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import { ChevronDown } from 'lucide-react';

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
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    // Only scroll to bottom if a new message is added
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isNotAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div className="relative flex-1">
      <div 
        ref={containerRef} 
        className="h-full overflow-y-auto px-4 py-4"
      >
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
      
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700 transition-all duration-200 transform hover:scale-105 animate-fade-in"
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={24} />
        </button>
      )}
    </div>
  );
};

export default MessageList;