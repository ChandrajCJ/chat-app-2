import React from 'react';
import { User, UserStatuses } from '../types';
import { ArrowLeft, UserRound, Trash2, BarChart3 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { formatDistanceToNow } from 'date-fns';
import UsageDropdown from './UsageDropdown';

interface ChatHeaderProps {
  currentUser: User;
  userStatuses: UserStatuses;
  onDeleteAll: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ currentUser, userStatuses, onDeleteAll }) => {
  const { setUser } = useUser();
  const [showUsageDropdown, setShowUsageDropdown] = React.useState(false);
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

  const toggleUsageDropdown = () => {
    setShowUsageDropdown(!showUsageDropdown);
  };

  return (
    <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
      <div className="flex items-center">
        <button 
          onClick={handleBack}
          className="mr-2 sm:mr-3 p-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex items-center">
          <div className={`
            p-2 rounded-full mr-2 sm:mr-3 relative
            ${otherUser === '🐞' ? 'bg-violet-700' : 'bg-blue-700'}
          `}>
            <UserRound size={20} className="text-white" />
            <span className={`
              absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-800
              ${otherUserStatus.isOnline ? 'bg-green-500' : 'bg-gray-500'}
            `}></span>
          </div>
          <div>
            <h2 className="font-semibold text-xl sm:text-2xl">{otherUser}</h2>
            <p className="text-xs text-gray-400 line-clamp-1">
              {otherUserStatus.isOnline 
                ? 'Online'
                : `Last seen ${formatDistanceToNow(otherUserStatus.lastSeen, { addSuffix: true })}`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={toggleUsageDropdown}
            className={`
              p-2 transition-colors duration-200
              ${showUsageDropdown 
                ? 'text-violet-400 bg-violet-500/10' 
                : 'text-gray-400 hover:text-violet-400'
              }
            `}
            title="View Firestore usage"
          >
            <BarChart3 size={20} />
          </button>
          <UsageDropdown 
            isOpen={showUsageDropdown} 
            onToggle={() => setShowUsageDropdown(false)} 
          />
        </div>
        
        <button
          onClick={handleDeleteAll}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
          title="Delete all messages"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader