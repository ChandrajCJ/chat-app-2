import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Message, User, ReactionType, PaginationState } from '../types';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  loading: boolean;
  pagination: PaginationState;
  onLoadMore: () => void;
  isOtherUserTyping: boolean;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, text: string) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: ReactionType) => void;
  onRemoveReaction: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onLoadMessagesUntil?: (messageId: string) => Promise<boolean>;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUser,
  loading,
  pagination,
  onLoadMore,
  isOtherUserTyping,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  onScrollToMessage: externalScrollToMessage,
  onLoadMessagesUntil
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isUserScrolledUpRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const lastLoadTimeRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // State for Discord-style new messages banner
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);

  // Handle scroll behavior
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider user scrolled up if they're more than 100px from bottom
    const wasScrolledUp = isUserScrolledUpRef.current;
    isUserScrolledUpRef.current = scrollFromBottom > 100;
    
    // If user scrolled to bottom, clear new messages banner
    if (wasScrolledUp && !isUserScrolledUpRef.current && showNewMessagesBanner) {
      setNewMessagesCount(0);
      setShowNewMessagesBanner(false);
    }
  }, [showNewMessagesBanner]);

  // Automatic load more function with cooldown
  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // Enforce minimum 1 second cooldown between loads for automatic loading
    if (timeSinceLastLoad < 1000) {
      return;
    }
    
    if (pagination.isLoadingMore || !pagination.hasMore) {
      return;
    }
    
    // Store current scroll height before loading
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
    }
    
    lastLoadTimeRef.current = now;
    onLoadMore();
  }, [pagination.isLoadingMore, pagination.hasMore, onLoadMore]);

  // Intersection Observer for lazy loading with better control
  useEffect(() => {
    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!loadMoreTriggerRef.current || !pagination.hasMore || pagination.isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px 0px', // Trigger earlier when scrolling up
        threshold: 0.1 // Lower threshold for more sensitive automatic loading
      }
    );

    observerRef.current = observer;
    observer.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [pagination.hasMore, pagination.isLoadingMore, handleLoadMore]);

  // Preserve scroll position when messages are loaded and handle new messages
  useEffect(() => {
    if (!containerRef.current) return;

    const messageCountChanged = messages.length !== prevMessagesLengthRef.current;
    const messagesIncreased = messages.length > prevMessagesLengthRef.current;
    const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
    
    if (messageCountChanged && messagesIncreased) {
      const newMessageCount = messages.length - prevMessagesLengthRef.current;
      
      // Initial load - always scroll to bottom when first entering the app
      if (isInitialLoad) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      // If user is scrolled up and we loaded older messages (large batch)
      else if (isUserScrolledUpRef.current && newMessageCount >= 10) {
        // This indicates we loaded older messages, preserve scroll position
        const newScrollHeight = containerRef.current.scrollHeight;
        const heightDifference = newScrollHeight - prevScrollHeightRef.current;
        
        // Adjust scroll position to maintain visual position
        if (heightDifference > 0) {
          containerRef.current.scrollTop += heightDifference;
        }
      } else if (!isUserScrolledUpRef.current) {
        // User is at bottom, scroll to new message (normal behavior)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (isUserScrolledUpRef.current && newMessageCount < 10) {
        // User is scrolled up and new messages arrived (not a bulk load)
        // Show the Discord-style banner
        setNewMessagesCount(prev => prev + newMessageCount);
        setShowNewMessagesBanner(true);
      }
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);



    const scrollToMessage = async (messageId: string) => {
    if (!containerRef.current) return;
    
    // First check if message is already loaded
    const messageElement = containerRef.current.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      // Use external scroll handler if available (has highlighting logic)
      if (externalScrollToMessage) {
        externalScrollToMessage(messageId);
      } else {
        // Fallback to local scroll
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the message with dull, subtle background
        messageElement.classList.add('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
        setTimeout(() => {
          messageElement.classList.remove('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
        }, 3000);
      }
    } else if (onLoadMessagesUntil) {
      // Message not loaded, need to load it first
      console.log('Message not loaded, loading messages until found:', messageId);
      try {
        const messageFound = await onLoadMessagesUntil(messageId);
        
        if (messageFound) {
          // Wait for DOM updates after loading messages
          setTimeout(() => {
            if (externalScrollToMessage) {
              externalScrollToMessage(messageId);
            } else {
              // Fallback to local scroll after loading
              const updatedMessageElement = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
              if (updatedMessageElement) {
                updatedMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the message with dull, subtle background
                updatedMessageElement.classList.add('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
                setTimeout(() => {
                  updatedMessageElement.classList.remove('bg-gray-200/40', 'dark:bg-gray-700/20', 'border-l-4', 'border-primary-500/60', 'shadow-md', 'shadow-gray-500/5');
                }, 3000);
              }
            }
          }, 300);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  };

  // Handle clicking the new messages banner
  const handleScrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setNewMessagesCount(0);
      setShowNewMessagesBanner(false);
    }
  }, []);

  // Scroll to bottom when component first loads with messages
  useEffect(() => {
    if (!loading && messages.length > 0 && messagesEndRef.current) {
      // Use a longer timeout to ensure DOM is fully rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 300);
    }
  }, [loading]); // Only trigger when loading state changes

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-primary-500 dark:bg-primary-400 rounded-full"></div>
          <div className="h-3 w-3 bg-primary-500 dark:bg-primary-400 rounded-full"></div>
          <div className="h-3 w-3 bg-primary-500 dark:bg-primary-400 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-y-auto px-4 py-4 relative"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-400">
          No messages yet. Start the conversation!
        </div>
        </div>
      ) : (
        <>
          {/* Automatic load trigger - positioned at the top */}
          {pagination.hasMore && (
            <div 
              ref={loadMoreTriggerRef}
              className="flex justify-center py-2 min-h-[40px]"
            >
              {pagination.isLoadingMore && (
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                  <span className="text-sm">Loading older messages...</span>
                </div>
              )}
            </div>
          )}
          
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
      
      {/* Discord-style new messages banner */}
      {showNewMessagesBanner && newMessagesCount > 0 && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handleScrollToBottom}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl border-2 border-white dark:border-gray-800 transition-all duration-200 flex items-center space-x-2 animate-slide-up"
          >
            <span className="text-sm font-semibold">
              {newMessagesCount} new message{newMessagesCount !== 1 ? 's' : ''}
            </span>
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </button>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;