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

const REACTIONS: ReactionType[] = ['🖤', '👀', '😭', '🌚', '🤣', '👍', '🙃'];

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
              ? 'bg-violet-700 text-white rounded-tr-none' 
              : 'bg-blue-700 text-white rounded-tl-none'
            }
          `}
        >
          {message.replyTo && (
            <div 
              className="text-xs bg-gray-700/50 p-2 rounded mb-2 border-l-2 border-gray-500 cursor-pointer hover:bg-gray-700/70 transition-colors"
              onClick={handleReplyClick}
            >
              <div className="text-gray-400 truncate">{message.replyTo.sender}</div>
              <div className="truncate max-w-full">{message.replyTo.text}</div>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium flex items-center gap-2">
              {message.edited && (
                <span className="text-xs text-gray-300">(edited)</span>
              )}
            </span>
            
            {message.voiceUrl ? (
              <button
                onClick={handleVoicePlay}
                className="flex items-center gap-2 mt-1 text-sm hover:text-violet-300"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <Mic size={16} />
                Voice Message
              </button>
            ) : isEditing ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editText.trim()) handleEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  autoFocus
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleEdit}
                    disabled={!editText.trim()}
                    className={`
                      px-3 py-1 rounded text-sm
                      ${editText.trim()
                        ? 'bg-violet-600 hover:bg-violet-500 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }
                    `}
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
                    className="text-gray-300 hover:text-white transition-colors duration-200 p-1"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showMenu && (
                    <div className="absolute bottom-full right-0 mb-1 bg-gray-800 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 text-gray-300 hover:text-white"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 text-gray-300 hover:text-white"
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
                  className="text-gray-300 hover:text-violet-300 transition-colors duration-200"
                >
                  <SmilePlus size={14} />
                </button>
                {showReactions && (
                  <div className={`
                    absolute bottom-full ${isOwnMessage ? '-right-2' : '-left-2'} mb-1
                    bg-gray-800/95 backdrop-blur-sm rounded-full shadow-lg py-1.5 px-2 flex gap-1.5 z-10
                    border border-gray-700/50
                  `}>
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className={`
                          text-base hover:scale-125 transition-transform duration-200
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
                className="text-gray-300 hover:text-violet-300 transition-colors duration-200"
              >
                <Reply size={14} />
              </button>
              <span className="text-xs text-gray-300">
                {format(message.timestamp, 'h:mm a')}
              </span>
              {isOwnMessage && (
                message.read ? (
                  <CheckCheck size={14} className="text-violet-300" />
                ) : (
                  <Check size={14} className="text-gray-300" />
                )
              )}
            </div>
            
            {message.reaction && typeof message.reaction === 'string' && (
              <div className="inline-flex relative top-5 -mt-3 items-center px-1.5 py-0.5 rounded-full text-sm w-fit bg-[#262626] border-2 border-[black]">
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