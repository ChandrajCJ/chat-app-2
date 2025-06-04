import React from 'react';
import { User, UserStatuses } from '../types';
import { ArrowLeft, UserRound, Trash2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { formatDistanceToNow } from 'date-fns';

interface ChatHeaderProps {
  currentUser: User;
  userStatuses: UserStatuses;
  onDeleteAll: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ currentUser, userStatuses, onDeleteAll }) => {
  const { setUser } = useUser();
  const otherUser = currentUser === '🐞' ? '🦎' : '🐞';
  const otherUserStatus = userStatuses[otherUser];
  
  const handleBack = () => {
    setUser(null as any);
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all messages? This action cannot be undone.')) {
      onDeleteAll();
    }
  };

  return (
    <div className="glass-panel px-4 py-3 sm:py-4 flex items-center justify-between border-b border-gray-700/50">
      <div className="flex items-center gap-3">
        <button 
          onClick={handleBack}
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center gap-3">
          <div className={`
            relative p-2 rounded-full
            ${otherUser === '🐞' ? 'bg-primary-600' : 'bg-accent-700'}
          `}>
            <UserRound size={20} className="text-white" />
            <span className={`
              absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full 
              border-2 border-gray-800
              ${otherUserStatus.isOnline ? 'bg-green-500' : 'bg-gray-500'}
            `} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{otherUser}</h2>
            <p className="text-xs text-gray-400 line-clamp-1">
              {otherUserStatus.isOnline 
                ? 'Online'
                : `Last seen ${formatDistanceToNow(otherUserStatus.lastSeen, { addSuffix: true })}`
              }
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleDeleteAll}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        title="Delete all messages"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

export default ChatHeader;