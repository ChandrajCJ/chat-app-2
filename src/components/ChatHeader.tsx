import React from 'react';
import { User, UserStatuses } from '../types';
import { ArrowLeft, UserRound, Trash2, Wifi, WifiOff } from 'lucide-react';
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
    <div className="glass-dark border-b border-white/5 safe-area-top">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center flex-1 min-w-0">
          <button 
            onClick={handleBack}
            className="glass-button rounded-xl p-2.5 mr-3 text-white/80 hover:text-white hover:scale-105 transition-all duration-200 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center min-w-0 flex-1">
            <div className="relative mr-3 shrink-0">
              <div className={`
                glass-button rounded-2xl p-3 relative overflow-hidden
                ${otherUser === '🐞' 
                  ? 'bg-gradient-to-br from-purple-500/20 to-violet-600/20' 
                  : 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20'
                }
              `}>
                <UserRound size={24} className="text-white relative z-10" />
                
                {/* Online status indicator */}
                <div className={`
                  absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white/20
                  flex items-center justify-center
                  ${otherUserStatus.isOnline 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }
                `}>
                  {otherUserStatus.isOnline ? (
                    <Wifi size={8} className="text-white" />
                  ) : (
                    <WifiOff size={8} className="text-white/80" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-white/95 truncate">
                  {otherUser}
                </h2>
                {otherUserStatus.isTyping && (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${otherUserStatus.isOnline 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-gray-400'
                  }
                `}></div>
                <p className="text-xs text-white/60 font-medium truncate">
                  {otherUserStatus.isOnline 
                    ? (otherUserStatus.isTyping ? 'Typing...' : 'Online')
                    : `Last seen ${formatDistanceToNow(otherUserStatus.lastSeen, { addSuffix: true })}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleDeleteAll}
          className="glass-button rounded-xl p-2.5 text-white/60 hover:text-red-400 hover:scale-105 transition-all duration-200 active:scale-95 ml-2"
          title="Delete all messages"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;