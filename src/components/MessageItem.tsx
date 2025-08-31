import React, { useState, useRef } from 'react';
import { Message, User, ReactionType } from '../types';
import { format } from 'date-fns';
import { CheckCheck, Check, Reply, Edit2, Trash2, Mic, Play, Pause, MoreVertical, SmilePlus } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, text: string) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: ReactionType) => void;
  onRemoveReaction: (messageId: string) => void;
  scrollToMessage?: (messageId: string) => void;
}

const REACTIONS: ReactionType[] = ['🖤', '👀', '😭', '🌚', '🤣', '👍'];

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  currentUser, 
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  scrollToMessage
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const isOwnMessage = message.sender === currentUser;
  const messageRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const handleVoicePlay = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!message.voiceUrl) return;

    if (!audio) {
      const newAudio = new Audio(message.voiceUrl);
      newAudio.onended = () => {
        setIsPlaying(false);
      };
      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onDelete(message.id);
    setShowMenu(false);
  };

  const handleReply = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onReply(message);
  };

  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
    setShowReactions(false);
  };

  const toggleReactions = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowReactions(!showReactions);
    setShowMenu(false);
  };

  const handleReaction = (emoji: ReactionType) => {
    if (message.reaction === emoji) {
      onRemoveReaction(message.id);
    } else {
      onReact(message.id, emoji);
    }
    setShowReactions(false);
  };

  const startEditing = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowMenu(false);
    // Focus the textarea after it's rendered
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        // Auto-resize the textarea
        editTextareaRef.current.style.height = 'auto';
        editTextareaRef.current.style.height = editTextareaRef.current.scrollHeight + 'px';
      }
    }, 0);
  };

  const handleEditTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setEditText(textarea.value);
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editText.trim()) {
        handleEdit();
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message.text); // Reset to original text
    }
  };

  const handleReplyClick = () => {
    if (message.replyTo && scrollToMessage) {
      scrollToMessage(message.replyTo.id);
    }
  };
  
  return (
    <div 
      ref={messageRef}
      className="group flex flex-col mb-4"
      onClick={() => {
        setShowMenu(false);
        setShowReactions(false);
      }}
      data-message-id={message.id}
    >
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div 
          className={`
            relative max-w-[85%] sm:max-w-[75%] px-3 py-2 sm:px-4 sm:py-2 rounded-2xl
            ${isOwnMessage 
              ? 'rounded-tr-none shadow-md border' 
              : 'rounded-tl-none shadow-md border'
            }
          `}
          style={{
            backgroundColor: isOwnMessage ? 'var(--primary-500)' : 'var(--secondary-500)',
            color: isOwnMessage ? 'var(--primary-text)' : 'var(--secondary-text)',
            borderColor: isOwnMessage ? 'var(--primary-500)' : 'var(--secondary-border)'
          }}
        >
          {message.replyTo && (
            <div 
              className="text-xs p-2 rounded mb-2 border-l-2 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderLeftColor: 'rgba(255, 255, 255, 0.4)',
                color: 'rgba(255, 255, 255, 0.9)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
              onClick={handleReplyClick}
            >
              <div className="truncate" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{message.replyTo.sender}</div>
              <div className="truncate max-w-full">{message.replyTo.text}</div>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium flex items-center gap-2">
              {message.edited && (
                <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>(edited)</span>
              )}
            </span>
            
            {message.voiceUrl ? (
              <button
                onClick={handleVoicePlay}
                className="flex items-center gap-2 mt-1 text-sm transition-colors"
                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <Mic size={16} />
                Voice Message
              </button>
            ) : isEditing ? (
              <div className="mt-1">
                <textarea
                  ref={editTextareaRef}
                  value={editText}
                  onChange={handleEditTextChange}
                  onKeyDown={handleEditKeyDown}
                  className="w-full text-white rounded px-2 py-1 text-sm resize-none min-h-[2.5rem] max-h-[200px] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                  placeholder="Edit your message..."
                  rows={1}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text);
                    }}
                    className="px-3 py-1 rounded text-sm text-white transition-colors"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={!editText.trim()}
                    className={`
                      px-3 py-1 rounded text-sm transition-colors
                      ${editText.trim() ? 'text-white cursor-pointer' : 'cursor-not-allowed'}
                    `}
                    style={{
                      backgroundColor: editText.trim() ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                      color: editText.trim() ? 'white' : 'rgba(255, 255, 255, 0.5)'
                    }}
                    onMouseEnter={(e) => {
                      if (editText.trim()) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editText.trim()) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 break-words whitespace-pre-wrap sm:text-base">{message.text}</p>
            )}

          
            <div className="flex items-center justify-end mt-1 space-x-1">
              {isOwnMessage && (
                <div className="relative">
                  <button
                    onClick={toggleMenu}
                    className="p-1 transition-colors duration-200 rounded"
                    style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showMenu && (
                    <div className="absolute bottom-full right-0 mb-1 rounded-lg shadow-xl py-1 min-w-[120px] z-10 border animate-slide-in"
                         style={{
                           backgroundColor: 'white',
                           borderColor: 'var(--primary-200)'
                         }}>
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm transition-colors rounded"
                        style={{ color: 'var(--primary-700)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                          e.currentTarget.style.color = 'var(--primary-800)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--primary-700)';
                        }}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm transition-colors rounded"
                        style={{ color: 'var(--primary-700)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                          e.currentTarget.style.color = 'var(--primary-800)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--primary-700)';
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={toggleReactions}
                  className="transition-colors duration-200 rounded p-1"
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
                >
                  <SmilePlus size={14} />
                </button>
                {showReactions && (
                  <div className={`
                    absolute bottom-full ${isOwnMessage ? 'right-0' : '-left-2'} mb-1
                    backdrop-blur-sm rounded-full shadow-xl py-1.5 px-2 flex gap-1.5 z-10
                    border max-w-[calc(100vw-2rem)] overflow-x-auto animate-slide-in
                    scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent
                  `}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: 'var(--primary-300)'
                  }}>
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className={`
                          text-base hover:scale-125 transition-transform duration-200 shrink-0
                          ${message.reaction === emoji ? 'opacity-50' : 'opacity-100'}
                        `}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleReply}
                className="transition-colors duration-200 rounded p-1"
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <Reply size={14} />
              </button>
              <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {format(message.timestamp, 'h:mm a')}
              </span>
              {isOwnMessage && (
                message.read ? (
                  <CheckCheck size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                ) : (
                  <Check size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                )
              )}
            </div>
            
            {message.reaction && typeof message.reaction === 'string' && (
              <div className="inline-flex relative top-5 -mt-3 items-center px-1.5 py-0.5 rounded-full text-sm w-fit border-2 shadow-md"
                   style={{
                     backgroundColor: 'white',
                     borderColor: 'var(--primary-200)'
                   }}>
                {message.reaction}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default MessageItem;