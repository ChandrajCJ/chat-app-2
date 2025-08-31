import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Mic, Square } from 'lucide-react';
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
    <div className="backdrop-blur-md border-t p-3 sm:p-4 transition-colors duration-300"
         style={{
           backgroundColor: 'rgba(255, 255, 255, 0.9)',
           borderTopColor: 'var(--primary-200)'
         }}>
      {replyingTo && (
        <div className="flex items-center justify-between p-2 rounded mb-2 border"
             style={{
               backgroundColor: 'var(--primary-50)',
               borderColor: 'var(--primary-200)'
             }}>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate" style={{ color: 'var(--primary-600)' }}>{replyingTo.sender}</div>
            <div className="text-sm truncate max-w-full" style={{ color: 'var(--primary-800)' }}>{replyingTo.text}</div>
          </div>
          <button 
            onClick={onCancelReply}
            className="ml-2 p-1 shrink-0 transition-colors duration-200 rounded hover:bg-white/50"
            style={{ color: 'var(--primary-600)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-800)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary-600)'}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-2xl px-4 py-2 focus:outline-none min-w-0 max-h-[150px] resize-none border transition-all duration-200"
          style={{
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-900)',
            borderColor: 'var(--primary-300)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary-500)';
            e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--primary-300)';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          disabled={isRecording}
          rows={1}
        />
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-sm font-medium" style={{ color: '#ef4444' }}>
              {formatTime(recordingTime)}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full p-2 text-white transition-all duration-200 shadow-lg hover:scale-105"
              style={{ backgroundColor: '#ef4444' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            >
              <Square size={20} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="rounded-full p-2 transition-all duration-200 shrink-0 shadow-md hover:scale-105"
              style={{
                backgroundColor: 'var(--primary-200)',
                color: 'var(--primary-700)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-300)';
                e.currentTarget.style.color = 'var(--primary-800)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary-200)';
                e.currentTarget.style.color = 'var(--primary-700)';
              }}
            >
              <Mic size={20} />
            </button>
            <button
              type="submit"
              className={`
                rounded-full p-2 focus:outline-none shadow-lg
                transition-all duration-200 shrink-0
                ${message.trim() ? 'transform hover:scale-105' : 'pointer-events-none opacity-50'}
              `}
              style={{
                backgroundColor: 'var(--primary-500)',
                color: 'var(--primary-text)'
              }}
              onMouseEnter={(e) => {
                if (message.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--primary-600)';
                }
              }}
              onMouseLeave={(e) => {
                if (message.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--primary-500)';
                }
              }}
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