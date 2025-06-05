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
      // Clean up media stream on unmount
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
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const newMessage = textarea.value;
    setMessage(newMessage);

    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';

    // Handle typing indicator
    if (newMessage.trim()) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
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
      
      const recorder = new MediaRecorder(stream);
      
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        onSendVoice(blob);
        
        // Clean up
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

      recorder.start();
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
    <div className="bg-gray-800 border-t border-gray-700 p-3 sm:p-4">
      {replyingTo && (
        <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 truncate">{replyingTo.sender}</div>
            <div className="text-sm truncate max-w-full">{replyingTo.text}</div>
          </div>
          <button 
            onClick={onCancelReply}
            className="ml-2 p-1 text-gray-400 hover:text-white shrink-0"
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
          className="flex-1 bg-gray-700 text-white rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-600 min-w-0 max-h-[150px] resize-none"
          disabled={isRecording}
          rows={1}
        />
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="text-red-500 animate-pulse text-sm">
              {formatTime(recordingTime)}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full p-2 bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
            >
              <Square size={20} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="rounded-full p-2 bg-gray-700 text-white hover:bg-gray-600 transition-colors duration-200 shrink-0"
            >
              <Mic size={20} />
            </button>
            <button
              type="submit"
              className={`
                rounded-full p-2 text-white focus:outline-none
                transition-all duration-200 shrink-0
                ${message.trim() 
                  ? 'bg-violet-700 hover:bg-violet-600 transform hover:scale-105' 
                  : 'bg-violet-700/50 pointer-events-none'
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