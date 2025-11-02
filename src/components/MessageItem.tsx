import React, { useState, useRef, useEffect } from 'react';
import { Message, User, ReactionType } from '../types';
import { format } from 'date-fns';
import { CheckCheck, Check, Reply, CreditCard as Edit2, Trash2, Mic, Play, Pause, MoreVertical, SmilePlus, Plus, Info, History, Pin, PinOff } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, text: string) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: ReactionType) => void;
  onRemoveReaction: (messageId: string) => void;
  scrollToMessage?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

const REACTIONS: ReactionType[] = ['🖤', '👀', '😭', '🌚', '🤣'];

// Comprehensive emoji categories
const EMOJI_CATEGORIES = {
  'Most Used': [
    '😘', '👍', '💀', '🖕', '😤', '🥲', '🤤', '🤡', '🕺', '💃', '🫂'
  ],
  'Smileys & Emotion': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
    '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥',
    '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒',
    '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸',
    '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹',
    '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
    '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
    '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ],
  'People & Body': [
    '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞',
    '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '👊',
    '✊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
    '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️',
    '👅', '👄', '🫦', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '🧔‍♂️', '🧔‍♀️',
    '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '👱‍♀️',
    '👱‍♂️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅',
    '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️'
  ],
  'Animals & Nature': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷',
    '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆',
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜',
    '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
    '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆',
    '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂',
    '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛'
  ],
  'Food & Drink': [
    '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭',
    '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒',
    '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
    '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮',
    '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
    '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁'
  ],
  'Activities': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒',
    '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹',
    '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🏋️‍♂️', '🏋️‍♀️', '🤼', '🤼‍♂️',
    '🤼‍♀️', '🤸', '🤸‍♂️', '🤸‍♀️', '⛹️', '⛹️‍♂️', '⛹️‍♀️', '🤺', '🤾', '🤾‍♂️', '🤾‍♀️',
    '🏌️', '🏌️‍♂️', '🏌️‍♀️', '🏇', '🧘', '🧘‍♂️', '🧘‍♀️', '🏄', '🏄‍♂️', '🏄‍♀️', '🏊',
    '🏊‍♂️', '🏊‍♀️', '🤽', '🤽‍♂️', '🤽‍♀️', '🚣', '🚣‍♂️', '🚣‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️',
    '🚵', '🚵‍♂️', '🚵‍♀️', '🚴', '🚴‍♂️', '🚴‍♀️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️',
    '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🤹‍♂️', '🤹‍♀️', '🎭', '🩰', '🎨', '🎬', '🎤'
  ],
  'Objects': [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿',
    '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻',
    '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌',
    '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳',
    '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱'
  ],
  'Symbols': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯',
    '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑',
    '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️',
    '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑',
    '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳'
  ]
};

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  currentUser, 
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  scrollToMessage,
  onPin,
  onUnpin
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showExpandedPicker, setShowExpandedPicker] = useState(false);
  const [isCalculatingPosition, setIsCalculatingPosition] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Most Used');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const isOwnMessage = message.sender === currentUser;
  const [pickerPosition, setPickerPosition] = useState<{ right: boolean; hasSpace: boolean; centerAlign?: boolean } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Recalculate picker position on window resize if picker is open
  useEffect(() => {
    const handleResize = () => {
      if (showExpandedPicker && pickerPosition) {
        const newPosition = calculatePickerPosition();
        setPickerPosition(newPosition);
      }
    };

    if (showExpandedPicker && pickerPosition) {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [showExpandedPicker, pickerPosition, isOwnMessage]);

  const handleEdit = () => {
    if (editText.trim()) {
      if (editText !== message.text) {
        onEdit(message.id, editText);
      }
      setIsEditing(false);
      setShowMenu(false);
    }
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
    setShowExpandedPicker(false);
    setPickerPosition(null);
  };

  const toggleReactions = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowReactions(!showReactions);
    setShowMenu(false);
    setShowExpandedPicker(false);
    setPickerPosition(null);
  };

  const toggleExpandedPicker = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    if (!showExpandedPicker) {
      setIsCalculatingPosition(true);
      
      // Use setTimeout to ensure DOM is ready for position calculation
      setTimeout(() => {
        const position = calculatePickerPosition();
        setPickerPosition(position);
        setShowExpandedPicker(true);
        setIsCalculatingPosition(false);
      }, 0);
    } else {
      setShowExpandedPicker(false);
      setPickerPosition(null);
      setIsCalculatingPosition(false);
    }
    
    setShowReactions(false);
    setShowMenu(false);
  };

  const handleReaction = (emoji: ReactionType | string) => {
    if (message.reaction === emoji) {
      onRemoveReaction(message.id);
    } else {
      // Cast string emoji to ReactionType for the handler
      onReact(message.id, emoji as ReactionType);
    }
    setShowReactions(false);
    setShowExpandedPicker(false);
    setPickerPosition(null);
  };

  const handleCategorySelect = (category: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
  };

  // Calculate optimal position for expanded picker to prevent viewport overflow
  const calculatePickerPosition = (): { right: boolean; hasSpace: boolean; centerAlign?: boolean } => {
    if (!messageRef.current) {
      // Fallback to center alignment if ref is not available
      return {
        right: false,
        hasSpace: false,
        centerAlign: true
      };
    }

    const messageRect = messageRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const pickerWidth = 320; // 80 * 0.25rem = 320px
    const safeMargin = 16; // Margin for desktop positioning
    
    // For mobile screens and tablets, always use fixed center alignment
    if (viewportWidth < 768) {
      return {
        right: false,
        hasSpace: false,
        centerAlign: true
      };
    }
    
    // Desktop logic - calculate available space more conservatively  
    const spaceOnRight = Math.max(0, viewportWidth - messageRect.right - safeMargin);
    const spaceOnLeft = Math.max(0, messageRect.left - safeMargin);
    
    // Check if we have enough space for the picker on either side
    const canFitRight = spaceOnRight >= pickerWidth;
    const canFitLeft = spaceOnLeft >= pickerWidth;
    
    if (isOwnMessage) {
      // For own messages, prefer right alignment
      if (canFitRight) {
        return { right: true, hasSpace: true, centerAlign: false };
      } else if (canFitLeft) {
        return { right: false, hasSpace: true, centerAlign: false };
      } else {
        return { right: false, hasSpace: false, centerAlign: true };
      }
    } else {
      // For other user messages, prefer left alignment
      if (canFitLeft) {
        return { right: false, hasSpace: true, centerAlign: false };
      } else if (canFitRight) {
        return { right: true, hasSpace: true, centerAlign: false };
      } else {
        return { right: false, hasSpace: false, centerAlign: true };
      }
    }
  };

  const startEditing = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowMenu(false);
    // Focus the textarea after it's rendered and move cursor to end
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        // Move cursor to the end
        const length = editTextareaRef.current.value.length;
        editTextareaRef.current.setSelectionRange(length, length);
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

  const handleShowInfo = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowInfo(true);
    setShowMenu(false);
  };

  const handleCloseInfo = () => {
    setShowInfo(false);
  };

  const handleShowHistory = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowHistory(true);
    setShowMenu(false);
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
  };
  
  return (
    <div 
      ref={messageRef}
      className="group flex flex-col mb-4"
      onClick={() => {
        setShowMenu(false);
        setShowReactions(false);
        setShowExpandedPicker(false);
        setPickerPosition(null);
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
              className="text-xs bg-black/10 dark:bg-white/10 p-2 rounded mb-2 border-l-2 border-white/30 cursor-pointer hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
              onClick={handleReplyClick}
            >
              <div className="text-white/70 truncate">{message.replyTo.sender}</div>
              <div className="truncate max-w-full">{message.replyTo.text}</div>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium flex items-center gap-2">
              {message.edited && (
                <span className="text-xs text-white/70">(edited)</span>
              )}
            </span>
            
            {message.voiceUrl ? (
              <button
                onClick={handleVoicePlay}
                className="flex items-center gap-2 mt-1 text-sm hover:text-white/80 transition-colors"
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
                  className="w-full bg-black/20 dark:bg-white/20 text-white rounded px-2 py-1 text-sm resize-none min-h-[2.5rem] max-h-[200px] focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/50"
                  placeholder="Edit your message..."
                  rows={1}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text);
                    }}
                    className="px-3 py-1 rounded text-sm bg-black/20 hover:bg-black/30 text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={!editText.trim()}
                    className={`
                      px-3 py-1 rounded text-sm transition-colors
                      ${editText.trim()
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-black/10 text-white/50 cursor-not-allowed'
                      }
                    `}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <p className="break-words sm:text-base whitespace-pre-wrap">{message.text}</p>
              </div>
            )}


            <div className="flex items-center justify-end mt-1 space-x-1">
              {(isOwnMessage || (message.edited && message.editHistory && message.editHistory.length > 0)) && (
                <div className="relative">
                  <button
                    onClick={toggleMenu}
                    className="text-white/70 hover:text-white transition-colors duration-200 p-1"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {showMenu && (
                    <div className={`absolute bottom-full ${isOwnMessage ? 'right-0' : 'left-0'} mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1 min-w-[120px] z-10 border border-gray-200 dark:border-gray-700 animate-slide-in`}>
                      {isOwnMessage && (
                        <button
                          onClick={handleShowInfo}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                        >
                          <Info size={14} />
                          Info
                        </button>
                      )}
                      {message.edited && message.editHistory && message.editHistory.length > 0 && (
                        <button
                          onClick={handleShowHistory}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                        >
                          <History size={14} />
                          History
                        </button>
                      )}
                      {/* Pin/Unpin - Available to all users */}
                      {message.isPinned ? (
                        <button
                          onClick={() => {
                            onUnpin?.(message.id);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                        >
                          <PinOff size={14} />
                          Unpin
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onPin?.(message.id);
                            setShowMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                        >
                          <Pin size={14} />
                          Pin
                        </button>
                      )}
                      
                      {isOwnMessage && (
                        <>
                          <button
                            onClick={startEditing}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-gray-200/60 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={toggleReactions}
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  <SmilePlus size={14} />
                </button>
                {showReactions && (
                  <div className={`
                    absolute bottom-full ${isOwnMessage ? 'right-0' : '-left-2'} mb-1
                    bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-xl py-1.5 px-2 flex gap-1.5 z-10
                    border border-gray-300/50 dark:border-gray-700/50 max-w-[calc(100vw-2rem)] overflow-x-auto animate-slide-in
                    scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent
                  `}>
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
                    <button
                      onClick={toggleExpandedPicker}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:scale-125 transition-all duration-200 shrink-0 bg-gray-200/50 dark:bg-gray-700/50 rounded-full p-1"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
                
                {/* Mobile backdrop overlay */}
                {showExpandedPicker && pickerPosition && pickerPosition.centerAlign && !isCalculatingPosition && (
                  <div 
                    className="fixed inset-0 bg-black/20 z-10"
                    onClick={() => {
                      setShowExpandedPicker(false);
                      setPickerPosition(null);
                      setIsCalculatingPosition(false);
                    }}
                  />
                )}

                {/* Expanded Emoji Picker */}
                {showExpandedPicker && pickerPosition && !isCalculatingPosition && (
                  <div 
                    ref={pickerRef}
                    onClick={(e) => e.stopPropagation()}
                    className={`
                      overflow-hidden
                      bg-white dark:bg-gray-800 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-300/50 dark:border-gray-700/50
                      ${(() => {
                        if (pickerPosition.centerAlign) {
                          // For mobile/center alignment, use fixed positioning relative to viewport
                          return 'fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm z-30';
                        } else if (pickerPosition.hasSpace) {
                          // Desktop positioning relative to message
                          return `absolute bottom-full mb-1 w-80 z-20 ${pickerPosition.right ? 'right-0' : 'left-0'}`;
                        } else {
                          // Fallback to fixed positioning for edge cases
                          return 'fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm z-30';
                        }
                      })()}
                      animate-slide-in
                    `}
                  >
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      {Object.keys(EMOJI_CATEGORIES).map((category) => (
                        <button
                          key={category}
                          onClick={(e) => handleCategorySelect(category, e)}
                          className={`
                            px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-200 shrink-0
                            ${selectedCategory === category
                              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-white dark:bg-gray-800'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }
                          `}
                        >
                          {category.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    
                    {/* Emoji Grid */}
                    <div className="p-2 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className={`
                              text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1.5 transition-all duration-200 hover:scale-110
                              ${message.reaction === emoji ? 'bg-gray-200 dark:bg-gray-600 opacity-60' : ''}
                            `}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleReply}
                className="text-white/70 hover:text-white transition-colors duration-200"
              >
                <Reply size={14} />
              </button>
              <span className="text-xs text-white/70">
                {format(message.timestamp, 'h:mm a')}
              </span>
              {isOwnMessage && (
                message.read ? (
                  <CheckCheck size={14} className="text-blue-400" />
                ) : message.delivered ? (
                  <CheckCheck size={14} className="text-white/70" />
                ) : (
                  <Check size={14} className="text-white/70" />
                )
              )}
            </div>
            
            {message.reaction && typeof message.reaction === 'string' && (
              <div className="inline-flex relative top-5 -mt-3 items-center px-1.5 py-0.5 rounded-full text-sm w-fit bg-gray-50 dark:bg-gray-800 border-2 border-gray-200/60 dark:border-gray-900 shadow-md">
                {message.reaction}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Message Info Modal */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseInfo}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Message Info
              </h3>
              <button
                onClick={handleCloseInfo}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check size={18} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sent
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {format(message.timestamp, 'PPpp')}
                  </div>
                </div>
              </div>

              {message.delivered && (
                <div className="flex items-start gap-3">
                  <CheckCheck size={18} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Delivered
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {message.deliveredAt
                        ? format(message.deliveredAt, 'PPpp')
                        : format(message.timestamp, 'PPpp')}
                    </div>
                  </div>
                </div>
              )}

              {message.read && (
                <div className="flex items-start gap-3">
                  <CheckCheck size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Read
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {message.readAt
                        ? format(message.readAt, 'PPpp')
                        : message.deliveredAt
                        ? format(message.deliveredAt, 'PPpp')
                        : format(message.timestamp, 'PPpp')}
                    </div>
                  </div>
                </div>
              )}

              {!message.delivered && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Message not yet delivered
                </div>
              )}

              {message.delivered && !message.read && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Message not yet read
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseInfo}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message History Modal */}
      {showHistory && message.editHistory && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseHistory}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Message History
              </h3>
              <button
                onClick={handleCloseHistory}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Current version */}
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                    Current
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last edited: {message.editHistory.length > 0 ? format(message.editHistory[message.editHistory.length - 1].editedAt, 'PPpp') : 'Unknown'}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                  {message.text}
                </p>
              </div>

              {/* Previous versions in reverse chronological order */}
              {[...message.editHistory].reverse().map((history, index) => {
                const versionNumber = message.editHistory!.length - index;
                return (
                  <div key={index} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        Version {versionNumber}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(history.editedAt, 'PPpp')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      {history.text}
                    </p>
                  </div>
                );
              })}

              {/* Original message */}
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                    Original
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Sent: {format(message.timestamp, 'PPpp')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                  {message.editHistory.length > 0 ? message.editHistory[0].text : message.text}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseHistory}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem;