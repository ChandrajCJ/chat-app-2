import React, { useState, useRef } from 'react';
import { Message, User, ReactionType } from '../types';
import { format } from 'date-fns';
import { CheckCheck, Check, Reply, Edit2, Trash2, Mic, Play, Pause, MoreVertical, SmilePlus, Sparkles } from 'lucide-react';

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
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  const handleReply = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onReply(message);
    setShowMenu(false);
    setShowReactions(false);
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
  };

  const handleReplyClick = () => {
    if (message.replyTo && scrollToMessage) {
      scrollToMessage(message.replyTo.id);
    }
  };

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (messageRef.current && !messageRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };

    if (showMenu || showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu, showReactions]);
  
  return (
    <div 
      ref={messageRef}
      className={`group flex flex-col animate-fade-in relative ${
        showMenu || showReactions ? 'z-50' : 'z-10'
      }`}
      data-message-id={message.id}
    >
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className={`
          relative max-w-[85%] sm:max-w-[75%] transition-all duration-300 hover:scale-[1.02]
          ${isOwnMessage ? 'ml-auto' : 'mr-auto'}
        `}>
          {/* Message bubble */}
          <div className={`
            glass-message rounded-3xl px-4 py-3 shadow-lg relative
            ${isOwnMessage 
              ? 'rounded-tr-lg bg-gradient-to-br from-purple-500/20 to-violet-600/20 border-purple-400/20' 
              : 'rounded-tl-lg bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-400/20'
            }
            ${message.reaction ? 'mb-2' : ''}
          `}>
            {/* Reply indicator */}
            {message.replyTo && (
              <div 
                className="glass-dark rounded-2xl p-3 mb-3 border-l-4 border-white/20 cursor-pointer hover:bg-white/5 transition-colors group/reply"
                onClick={handleReplyClick}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Reply size={12} className="text-white/60" />
                  <span className="text-xs font-medium text-white/70">{message.replyTo.sender}</span>
                </div>
                <p className="text-sm text-white/80 truncate">{message.replyTo.text}</p>
              </div>
            )}

            {/* Message content */}
            <div className="flex flex-col">
              {message.edited && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={12} className="text-white/50" />
                  <span className="text-xs text-white/50 font-medium">edited</span>
                </div>
              )}
              
              {message.voiceUrl ? (
                <button
                  onClick={handleVoicePlay}
                  className="flex items-center gap-3 py-2 px-3 glass-button rounded-2xl hover:scale-105 transition-all duration-200 group/voice"
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isPlaying 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                      : 'bg-gradient-to-r from-purple-500 to-violet-600'
                    }
                  `}>
                    {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic size={16} className="text-white/80" />
                    <span className="text-sm font-medium text-white/90">Voice Message</span>
                  </div>
                </button>
              ) : isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full glass-input rounded-2xl px-3 py-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && editText.trim()) {
                        e.preventDefault();
                        handleEdit();
                      }
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="glass-button rounded-xl px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={!editText.trim()}
                      className={`
                        rounded-xl px-3 py-1.5 text-sm font-medium transition-all
                        ${editText.trim()
                          ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:scale-105'
                          : 'glass-button text-white/40 cursor-not-allowed'
                        }
                      `}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-white/95 break-words whitespace-pre-wrap leading-relaxed">
                  {message.text}
                </p>
              )}

              {/* Message footer */}
              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleReply}
                    className="glass-button rounded-full p-1.5 text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
                    title="Reply"
                  >
                    <Reply size={14} />
                  </button>
                  
                  <button
                    onClick={toggleReactions}
                    className="glass-button rounded-full p-1.5 text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
                    title="Add reaction"
                  >
                    <SmilePlus size={14} />
                  </button>
                  
                  {isOwnMessage && (
                    <button
                      onClick={toggleMenu}
                      className="glass-button rounded-full p-1.5 text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
                      title="More options"
                    >
                      <MoreVertical size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 font-medium">
                    {format(message.timestamp, 'h:mm a')}
                  </span>
                  {isOwnMessage && (
                    <div className="flex items-center">
                      {message.read ? (
                        <CheckCheck size={14} className="text-green-400" />
                      ) : (
                        <Check size={14} className="text-white/60" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reaction */}
          {message.reaction && (
            <div className="flex justify-end mt-1">
              <div className="glass-dark rounded-full px-3 py-1 border border-white/10">
                <span className="text-lg">{message.reaction}</span>
              </div>
            </div>
          )}

          {/* Menu dropdown - Fixed positioning and z-index */}
          {showMenu && (
            <div className={`
              fixed z-[100] mt-2 min-w-[140px]
              glass-dark rounded-2xl shadow-2xl py-2 border border-white/10
              animate-fade-in
            `}
            style={{
              top: messageRef.current ? 
                messageRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: isOwnMessage ? 
                (messageRef.current ? messageRef.current.getBoundingClientRect().right - 140 : 0) :
                (messageRef.current ? messageRef.current.getBoundingClientRect().left : 0)
            }}>
              <button
                onClick={startEditing}
                className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Edit2 size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-white/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}

          {/* Reactions picker - Fixed positioning and z-index */}
          {showReactions && (
            <div className={`
              fixed z-[100] mt-2
              glass-dark rounded-2xl shadow-2xl p-3 border border-white/10
              animate-fade-in
            `}
            style={{
              top: messageRef.current ? 
                messageRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: isOwnMessage ? 
                (messageRef.current ? messageRef.current.getBoundingClientRect().right - 200 : 0) :
                (messageRef.current ? messageRef.current.getBoundingClientRect().left : 0)
            }}>
              <div className="flex gap-2">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`
                      w-10 h-10 rounded-xl flex items-center justify-center text-lg
                      transition-all duration-200 hover:scale-125
                      ${message.reaction === emoji 
                        ? 'bg-white/20 scale-110' 
                        : 'hover:bg-white/10'
                      }
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;