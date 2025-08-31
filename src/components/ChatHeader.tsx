import React from 'react';
import { User, UserStatuses, Message } from '../types';
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
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  currentUser, 
  userStatuses, 
  messages, 
  onDeleteAll, 
  onScrollToMessage,
  onLoadAllMessages,
  onLoadMessagesUntil
}) => {
  const { setUser } = useUser();
  const otherUser = currentUser === '🐞' ? '🦎' : '🐞';
  const otherUserStatus = userStatuses[otherUser];
  
  const handleBack = () => {
    setUser(null as any);
  };



  return (
    <div className="backdrop-blur-md p-4 flex items-center justify-between border-b transition-colors duration-300"
         style={{
           backgroundColor: 'rgba(255, 255, 255, 0.9)',
           borderBottomColor: 'var(--primary-200)'
         }}>
      <div className="flex items-center">
        <button 
          onClick={handleBack}
          className="mr-2 sm:mr-3 p-2 transition-colors duration-200 rounded-lg hover:bg-white/50"
          style={{ color: 'var(--primary-600)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--primary-700)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--primary-600)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center">
          <div className="p-2 rounded-full mr-2 sm:mr-3 relative"
               style={{ backgroundColor: 'var(--primary-500)' }}>
            <UserRound size={20} style={{ color: 'var(--primary-text)' }} />
            <span className={`
              absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900
              ${otherUserStatus.isOnline ? 'bg-green-500' : 'bg-gray-400'}
            `}></span>
          </div>
          <div>
            <h2 className="font-semibold text-xl sm:text-2xl" style={{ color: 'var(--primary-800)' }}>{otherUser}</h2>
            <p className="text-xs line-clamp-1" style={{ color: 'var(--primary-600)' }}>
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
        />
      </div>
    </div>
  );
};

export default ChatHeader