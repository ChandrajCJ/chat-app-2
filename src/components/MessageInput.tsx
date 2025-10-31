import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Mic, Square, Bold, Italic, Code, List, ListOrdered, Strikethrough, Quote } from 'lucide-react';
import { Message } from '../types';
import { wrapSelection, insertAtCursor } from '../utils/markdown';

interface MessageInputProps {
  onSendMessage: (text: string, replyTo?: Message) => void;
  onSendVoice: (blob: Blob) => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
  onTyping: (isTyping: boolean) => void;
  draft?: string;
  draftReplyTo?: Message['replyTo'];
  onSaveDraft?: (text: string, replyTo?: Message['replyTo']) => void;
  onClearDraft?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendVoice,
  replyingTo,
  onCancelReply,
  onTyping,
  draft,
  draftReplyTo,
  onSaveDraft,
  onClearDraft
}) => {
  const [message, setMessage] = useState(draft || '');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<number>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const streamRef = useRef<MediaStream | null>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const justSentMessageRef = useRef<boolean>(false);

  // Load draft on mount (but not if we just sent a message)
  useEffect(() => {
    if (draft && !justSentMessageRef.current) {
      setMessage(draft);
    }
    // Reset the flag after a short delay
    if (justSentMessageRef.current) {
      const timer = setTimeout(() => {
        justSentMessageRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [draft]);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim()) {
      // Clear any pending draft save before sending
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }

      // Mark that we just sent a message to prevent draft reload
      justSentMessageRef.current = true;

      onSendMessage(message, replyingTo);
      setMessage('');
      onTyping(false);
      onClearDraft?.(); // Clear draft on send

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const newMessage = textarea.value;
    setMessage(newMessage);

    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newMessage.trim()) {
      // Start typing indicator
      onTyping(true);

      // Clear typing status after 1.5 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    } else {
      // Clear typing immediately if input is empty
      onTyping(false);
    }

    // Auto-save draft after 1 second of inactivity (only if message has content)
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    // Only save draft if there's actual content
    if (newMessage.trim()) {
      draftSaveTimeoutRef.current = setTimeout(() => {
        onSaveDraft?.(newMessage, replyingTo);
      }, 1000);
    } else {
      // If message is empty, clear the draft
      onClearDraft?.();
    }
  };

  // Formatting toolbar handlers
  const handleBold = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = message.substring(start, end);

      const newText = message.substring(0, start) + '**' + selectedText + '**' + message.substring(end);
      setMessage(newText);

      // Use requestAnimationFrame for smooth cursor positioning
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, end + 2);
      });
    }
  };

  const handleItalic = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = message.substring(start, end);

      const newText = message.substring(0, start) + '*' + selectedText + '*' + message.substring(end);
      setMessage(newText);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 1, end + 1);
      });
    }
  };

  const handleStrikethrough = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = message.substring(start, end);

      const newText = message.substring(0, start) + '~~' + selectedText + '~~' + message.substring(end);
      setMessage(newText);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, end + 2);
      });
    }
  };

  const handleCode = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = message.substring(start, end);

      const newText = message.substring(0, start) + '`' + selectedText + '`' + message.substring(end);
      setMessage(newText);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 1, end + 1);
      });
    }
  };

  const handleQuote = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const lineStart = message.lastIndexOf('\n', start - 1) + 1;

      const newText = message.substring(0, lineStart) + '> ' + message.substring(lineStart);
      setMessage(newText);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  const handleUnorderedList = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const lineStart = message.lastIndexOf('\n', start - 1) + 1;

      const newText = message.substring(0, lineStart) + '- ' + message.substring(lineStart);
      setMessage(newText);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  const handleOrderedList = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const lineStart = message.lastIndexOf('\n', start - 1) + 1;

      const newText = message.substring(0, lineStart) + '1. ' + message.substring(lineStart);
      setMessage(newText);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 3, start + 3);
      });
    }
  };

  // Check if user is on mobile device
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On mobile: Enter adds new line, send button is required
    // On desktop: Enter sends, Shift+Enter adds new line
    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      handleSubmit(e);
    }
    // On mobile, Enter key will naturally add a new line (no preventDefault)
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm;codecs=opus' });
        onSendVoice(blob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        chunks.current = [];
        setRecordingTime(0);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);

      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to send voice messages');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50/90 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-300/50 dark:border-gray-800 p-3 sm:p-4 transition-colors duration-300">
      {replyingTo && (
        <div className="flex items-center justify-between bg-gray-200/60 dark:bg-gray-700/50 p-2 rounded mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 dark:text-gray-400 truncate">{replyingTo.sender}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-full">{replyingTo.text}</div>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-2 p-1 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 transition-colors duration-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 mb-2 px-2 py-1 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBold}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleItalic}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleStrikethrough}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCode}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Code"
        >
          <Code size={16} />
        </button>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleQuote}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Quote"
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUnorderedList}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOrderedList}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-100 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400/50 dark:focus:ring-violet-400 min-w-0 max-h-[150px] resize-none border border-gray-300/50 dark:border-gray-700 transition-colors duration-200 placeholder-gray-400 dark:placeholder-gray-500"
          disabled={isRecording}
          rows={1}
        />
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="text-error-500 animate-pulse text-sm font-medium">
              {formatTime(recordingTime)}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full p-2 bg-error-500 text-white hover:bg-error-600 transition-colors duration-200 shadow-lg"
            >
              <Square size={20} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="rounded-full p-2 bg-gray-300/60 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 shrink-0"
            >
              <Mic size={20} />
            </button>
            <button
              type="submit"
              className={`
                rounded-full p-2 text-white focus:outline-none shadow-lg
                transition-all duration-200 shrink-0
                ${message.trim()
                  ? 'bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500 transform hover:scale-105'
                  : 'bg-primary-300/60 dark:bg-primary-800 pointer-events-none'
                }
              `}
            >
              <Send size={20} />
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default MessageInput;