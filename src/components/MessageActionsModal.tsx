import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Trash2, X, MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { Message } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  message: Message;
  index: number;
}

interface MessageActionsModalProps {
  messages: Message[];
  onDeleteAll: () => void;
  onScrollToMessage: (messageId: string) => void;
  onLoadAllMessages?: () => Promise<Message[]>;
  onLoadMessagesUntil?: (messageId: string) => Promise<boolean>;
}

const MessageActionsModal: React.FC<MessageActionsModalProps> = ({
  messages,
  onDeleteAll,
  onScrollToMessage,
  onLoadAllMessages,
  onLoadMessagesUntil
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>(messages);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current && !isSearching) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isSearching]);

  // Load all messages when search modal opens (only once per session)
  useEffect(() => {
    if (isOpen && onLoadAllMessages && !isSearching) {
      // Only load if we haven't already loaded all messages or if we only have the paginated subset
      const shouldLoadAllMessages = allMessages.length <= messages.length;
      
      if (shouldLoadAllMessages) {
        setIsSearching(true);
        onLoadAllMessages().then((loadedMessages) => {
          setAllMessages(loadedMessages);
          setIsSearching(false);
        }).catch((error) => {
          console.error('Error loading all messages:', error);
          setIsSearching(false);
          // Fallback to current messages if loading fails
          setAllMessages(messages);
        });
      }
    }
  }, [isOpen, onLoadAllMessages, allMessages.length, messages.length, isSearching]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setCurrentResultIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    allMessages.forEach((message, index) => {
      if (message.text && message.text.toLowerCase().includes(query)) {
        results.push({ message, index });
      }
    });

    // Sort results by timestamp descending (newest first)
    results.sort((a, b) => b.message.timestamp.getTime() - a.message.timestamp.getTime());

    setSearchResults(results);
    setCurrentResultIndex(0);
  }, [searchQuery, allMessages]);

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all messages? This action cannot be undone.')) {
      onDeleteAll();
      setIsOpen(false);
    }
  };

  const handleSearchResultClick = async (result: SearchResult) => {
    console.log('Clicking on search result:', result.message.id);
    
    // Check if the message is already loaded in the current view
    const messageElement = document.querySelector(`[data-message-id="${result.message.id}"]`);
    
    if (messageElement) {
      console.log('Message already loaded, scrolling directly');
      onScrollToMessage(result.message.id);
      setIsOpen(false);
    } else {
      console.log('Message not loaded, loading messages until found');
      // Message is not loaded, need to load more messages until we find it
      if (onLoadMessagesUntil) {
        try {
          setIsOpen(false); // Close modal while loading
          const messageFound = await onLoadMessagesUntil(result.message.id);
          
          console.log('Message loading completed, found:', messageFound);
          
          if (messageFound) {
            // Wait longer for DOM updates after loading many messages
            setTimeout(() => {
              console.log('Attempting to scroll to message');
              const updatedMessageElement = document.querySelector(`[data-message-id="${result.message.id}"]`);
              if (updatedMessageElement) {
                console.log('Message element found, scrolling');
                onScrollToMessage(result.message.id);
              } else {
                console.log('Message element still not found in DOM');
                // Try again after a bit more time
                setTimeout(() => {
                  onScrollToMessage(result.message.id);
                }, 500);
              }
            }, 300);
          } else {
            console.log('Message not found, trying fallback scroll');
            // Try to scroll anyway in case there was an error in detection
            setTimeout(() => {
              onScrollToMessage(result.message.id);
            }, 300);
          }
        } catch (error) {
          console.error('Error loading messages:', error);
          setIsOpen(false);
        }
      } else {
        // Fallback to direct scroll attempt
        console.log('No loadMessagesUntil function, trying direct scroll');
        onScrollToMessage(result.message.id);
        setIsOpen(false);
      }
    }
  };

  const navigateResults = async (direction: 'up' | 'down') => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === 'up') {
      newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : searchResults.length - 1;
    } else {
      newIndex = currentResultIndex < searchResults.length - 1 ? currentResultIndex + 1 : 0;
    }
    
    setCurrentResultIndex(newIndex);
    if (searchResults[newIndex]) {
      // Use the same logic as clicking on a result
      await handleSearchResultClick(searchResults[newIndex]);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100">
          {part}
        </mark>
      ) : part
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentResultIndex(0);
  };

  const dropdown = isOpen ? (
    <div 
      className="fixed inset-0 z-[99999]" 
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 animate-slide-in"
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          zIndex: 99999,
          width: '420px',
          maxWidth: '90vw',
          maxHeight: '70vh',
          backgroundColor: 'white',
          borderColor: 'var(--primary-200)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider border-b"
             style={{ 
               color: 'var(--primary-600)',
               borderBottomColor: 'var(--primary-200)'
             }}>
          Message Actions
        </div>

        {/* Search Section */}
        <div className="p-3 border-b" style={{ borderBottomColor: 'var(--primary-200)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2"
               style={{ color: 'var(--primary-600)' }}>
            Search Messages
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} style={{ color: 'var(--primary-500)' }} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isSearching ? "Loading all messages..." : "Search in conversation..."}
              disabled={isSearching}
              className="block w-full pl-10 pr-10 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-all duration-200"
              style={{
                backgroundColor: 'var(--primary-50)',
                borderColor: 'var(--primary-300)',
                color: 'var(--primary-900)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-500)';
                e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--primary-300)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X size={16} 
                   style={{ color: 'var(--primary-500)' }}
                   onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-700)'}
                   onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary-500)'} />
              </button>
            )}
          </div>

          {/* Search Results Summary */}
          {searchQuery && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--primary-600)' }}>
                {isSearching
                  ? 'Loading messages...'
                  : searchResults.length > 0 
                    ? `${currentResultIndex + 1} of ${searchResults.length} results`
                    : `No results found (searched ${allMessages.length} messages)`
                }
              </span>
              {searchResults.length > 1 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => navigateResults('up')}
                    className="p-1 rounded transition-colors duration-200"
                    style={{ color: 'var(--primary-500)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                      e.currentTarget.style.color = 'var(--primary-700)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--primary-500)';
                    }}
                    title="Previous result"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => navigateResults('down')}
                    className="p-1 rounded transition-colors duration-200"
                    style={{ color: 'var(--primary-500)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                      e.currentTarget.style.color = 'var(--primary-700)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--primary-500)';
                    }}
                    title="Next result"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && !isSearching && searchResults.length > 0 && (
          <div className="max-h-60 overflow-y-auto border-t" style={{ borderTopColor: 'var(--primary-200)' }}>
            <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
                 style={{ color: 'var(--primary-600)' }}>
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((result, index) => (
              <button
                key={result.message.id}
                onClick={() => handleSearchResultClick(result)}
                className="w-full px-3 py-2 text-left transition-colors duration-200 border-l-4"
                style={{
                  borderLeftColor: index === currentResultIndex ? 'var(--primary-500)' : 'transparent',
                  backgroundColor: index === currentResultIndex ? 'var(--primary-100)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (index !== currentResultIndex) {
                    e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index === currentResultIndex ? 'var(--primary-100)' : 'transparent';
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{result.message.sender}</span>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-sm line-clamp-2 break-words" style={{ color: 'var(--primary-900)' }}>
                      {highlightText(result.message.text, searchQuery)}
                    </div>
                    <div className="text-xs mt-1 truncate" style={{ color: 'var(--primary-600)' }}>
                      {formatDistanceToNow(result.message.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {searchQuery && !isSearching && searchResults.length === 0 && (
          <div className="px-3 py-4 text-center border-t" style={{ borderTopColor: 'var(--primary-200)' }}>
            <div className="text-sm break-words" style={{ color: 'var(--primary-600)' }}>
              No messages found matching "<span className="font-medium">{searchQuery}</span>"
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--primary-500)' }}>
              Searched through {allMessages.length} messages
            </div>
          </div>
        )}

        {/* Delete All Section */}
        <div className="border-t" style={{ borderTopColor: 'var(--primary-200)' }}>
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
               style={{ color: 'var(--primary-600)' }}>
            Danger Zone
          </div>
          <button
            onClick={handleDeleteAll}
            className="w-full px-3 py-3 text-left transition-colors duration-200 flex items-center gap-3 rounded-lg"
            style={{ color: '#dc2626' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={16} />
            <div>
              <div className="text-sm font-medium">Delete All Messages</div>
              <div className="text-xs" style={{ color: '#ef4444' }}>
                This action cannot be undone
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 transition-colors duration-200 rounded-lg"
        style={{ color: 'var(--primary-600)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--primary-800)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--primary-600)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Message actions"
      >
        <MoreHorizontal size={20} />
      </button>
      
      {dropdown && createPortal(dropdown, document.body)}
    </>
  );
};

export default MessageActionsModal;
