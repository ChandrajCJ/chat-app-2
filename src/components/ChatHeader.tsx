import React from 'react';
import { User, UserStatuses, Message, RecurrenceType, DayOfWeek, ScheduledMessage } from '../types';
import { ArrowLeft, UserRound } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import ColorSchemeSelector from './ColorSchemeSelector';
import MessageActionsModal from './MessageActionsModal';
import { formatDistanceToNow } from 'date-fns';

interface ChatHeaderProps {
  currentUser: User;
  userStatuses: UserStatuses;
  messages: Message[];
  onDeleteAll: () => void;
  onScrollToMessage: (messageId: string) => void;
  onLoadAllMessages?: () => Promise<Message[]>;
  onLoadMessagesUntil?: (messageId: string) => Promise<boolean>;
  onScheduleMessage?: (text: string, date: Date, time: string, recurrence: RecurrenceType, selectedDays?: DayOfWeek[]) => Promise<void>;
  onDeleteScheduledMessage?: (messageId: string) => Promise<void>;
  onToggleScheduledMessage?: (messageId: string, enabled: boolean) => Promise<void>;
  scheduledMessages?: ScheduledMessage[];
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  currentUser, 
  userStatuses, 
  messages, 
  onDeleteAll, 
  onScrollToMessage,
  onLoadAllMessages,
  onLoadMessagesUntil,
  onScheduleMessage,
  onDeleteScheduledMessage,
  onToggleScheduledMessage,
  scheduledMessages
}) => {
  const { setUser } = useUser();
  const otherUser = currentUser === '🐞' ? '🦎' : '🐞';
  const otherUserStatus = userStatuses[otherUser];
  
  const handleBack = () => {
    setUser(null as any);
  };



  return (
    <div className="bg-gray-50/90 dark:bg-gray-900/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-300/50 dark:border-gray-800 transition-colors duration-300">
      <div className="flex items-center">
        <button 
          onClick={handleBack}
          className="mr-2 sm:mr-3 p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center">
          <div className={`
            p-2 rounded-full mr-2 sm:mr-3 relative
            bg-gray-400 dark:bg-gray-600
          `}>
            <UserRound size={20} className="text-white" />
            <span className={`
              absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900
              ${otherUserStatus.isOnline ? 'bg-success-500' : 'bg-gray-400 dark:bg-gray-500'}
            `}></span>
          </div>
          <div>
            <h2 className="font-semibold text-xl sm:text-2xl text-gray-700 dark:text-gray-100">{otherUser}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-400 line-clamp-1">
              {otherUserStatus.isOnline 
                ? 'Online'
                : `Last seen ${formatDistanceToNow(otherUserStatus.lastSeen, { addSuffix: true })}`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ColorSchemeSelector />
        <MessageActionsModal 
          messages={messages}
          onDeleteAll={onDeleteAll}
          onScrollToMessage={onScrollToMessage}
          onLoadAllMessages={onLoadAllMessages}
          onLoadMessagesUntil={onLoadMessagesUntil}
          onScheduleMessage={onScheduleMessage}
          onDeleteScheduledMessage={onDeleteScheduledMessage}
          onToggleScheduledMessage={onToggleScheduledMessage}
          scheduledMessages={scheduledMessages}
        />
      </div>
    </div>
  );
};

export default ChatHeader