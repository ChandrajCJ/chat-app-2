import React from 'react';
import { User, UserStatuses } from '../types';
import { ArrowLeft, UserRound, Trash2, Sun, Moon } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import ColorSchemeSelector from './ColorSchemeSelector';
import { formatDistanceToNow } from 'date-fns';

interface ChatHeaderProps {
  currentUser: User;
  userStatuses: UserStatuses;
  onDeleteAll: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ currentUser, userStatuses, onDeleteAll }) => {
  const { setUser } = useUser();
  const { theme, toggleTheme } = useTheme();
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
            ${otherUser === '🐞' ? 'bg-primary-500 dark:bg-primary-600' : 'bg-secondary-500 dark:bg-secondary-600'}
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
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={handleDeleteAll}
          className="p-2 text-gray-400 dark:text-gray-400 hover:text-error-500 transition-colors duration-200"
          title="Delete all messages"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader