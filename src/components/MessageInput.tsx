import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Mic, Square, Paperclip } from 'lucide-react';
import { Message } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string, replyTo?: Message) => void;
  onSendVoice: (blob: Blob) => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
  onTyping: (isTyping: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  onSendVoice,
  replyingTo,
  onCancelReply,
  onTyping
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<number>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const streamRef = useRef<MediaStream | null>(null);

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim()) {
      onSendMessage(message, replyingTo);
      setMessage('');
      onTyping(false);
      
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
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newMessage.trim()) {
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    } else {
      onTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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

      recorder.start(1000);
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
    <div className="glass-dark border-t border-white/5 safe-area-bottom">
      <div className="p-4">
        {/* Reply indicator */}
        {replyingTo && (
          <div className="glass rounded-2xl p-3 mb-3 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                  <span className="text-xs font-medium text-white/70">Replying to {replyingTo.sender}</span>
                </div>
                <p className="text-sm text-white/80 truncate">{replyingTo.text}</p>
              </div>
              <button 
                onClick={onCancelReply}
                className="glass-button rounded-full p-1.5 ml-3 text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full glass-input rounded-3xl px-4 py-3 pr-12 text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/30 transition-all duration-200"
              disabled={isRecording}
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* Attachment button */}
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 glass-button rounded-full p-2 text-white/60 hover:text-white hover:scale-110 transition-all duration-200"
            >
              <Paperclip size={16} />
            </button>
          </div>

          {/* Recording controls */}
          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="glass-dark rounded-2xl px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-white/90">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="glass-button rounded-full p-3 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:scale-110 transition-all duration-200 shadow-lg"
              >
                <Square size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Voice message button */}
              <button
                type="button"
                onClick={startRecording}
                className="glass-button rounded-full p-3 text-white/80 hover:text-white hover:scale-110 transition-all duration-200"
              >
                <Mic size={20} />
              </button>
              
              {/* Send button */}
              <button
                type="submit"
                disabled={!message.trim()}
                className={`
                  rounded-full p-3 transition-all duration-200 shadow-lg
                  ${message.trim() 
                    ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:scale-110 hover:shadow-purple-500/25' 
                    : 'glass-button text-white/40 cursor-not-allowed'
                  }
                `}
              >
                <Send size={20} />
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MessageInput;