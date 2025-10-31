import React, { useState } from 'react';
import { Pin, X, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import { Message, User } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface PinnedMessagesBarProps {
  pinnedMessages: Message[];
  onUnpin: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
  currentUser: User;
}

const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({
  pinnedMessages,
  onUnpin,
  onScrollToMessage,
  currentUser
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  if (pinnedMessages.length === 0) {
    return null;
  }

  const currentMessage = pinnedMessages[currentIndex];

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        {/* Pin Icon */}
        <div className="flex-shrink-0">
          <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onScrollToMessage(currentMessage.id)}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
              Pinned by {currentMessage.pinnedBy}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300">
              • {formatDistanceToNow(currentMessage.pinnedAt || currentMessage.timestamp, { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-amber-800 dark:text-amber-200 flex-shrink-0">
              {currentMessage.sender}:
            </span>
            <p className="text-sm text-amber-900 dark:text-amber-100 line-clamp-2 hover:underline">
              {isExpanded ? currentMessage.text : truncateText(currentMessage.text, 100)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Expand/Collapse for long messages */}
          {currentMessage.text.length > 100 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
              title={isExpanded ? 'Show less' : 'Show more'}
            >
              <span className="text-xs text-amber-700 dark:text-amber-300">
                {isExpanded ? 'Less' : 'More'}
              </span>
            </button>
          )}

          {/* Navigation arrows if multiple pinned messages */}
          {pinnedMessages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
                title="Previous pinned message"
              >
                <ChevronLeft className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              </button>
              
              <span className="text-xs text-amber-700 dark:text-amber-300 px-1">
                {currentIndex + 1}/{pinnedMessages.length}
              </span>
              
              <button
                onClick={goToNext}
                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
                title="Next pinned message"
              >
                <ChevronRight className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              </button>
            </>
          )}

          {/* Unpin button (only if current user pinned it) */}
          {currentMessage.pinnedBy === currentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(currentMessage.id);
                // Adjust index if needed
                if (currentIndex >= pinnedMessages.length - 1) {
                  setCurrentIndex(Math.max(0, currentIndex - 1));
                }
              }}
              className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
              title="Unpin message"
            >
              <X className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            </button>
          )}
        </div>
      </div>

      {/* Show all pinned messages in collapsed view */}
      {pinnedMessages.length > 1 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {pinnedMessages.map((msg, idx) => (
              <button
                key={msg.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  onScrollToMessage(msg.id);
                }}
                className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  idx === currentIndex
                    ? 'bg-amber-600 dark:bg-amber-700 text-white'
                    : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-700'
                }`}
              >
                {idx + 1}. {msg.sender}: {truncateText(msg.text, 30)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PinnedMessagesBar;

