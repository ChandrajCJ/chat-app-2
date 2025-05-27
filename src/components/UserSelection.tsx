import React from 'react';
import { User } from '../types';
import { useUser } from '../contexts/UserContext';
import { UserRound } from 'lucide-react';

const UserSelection: React.FC = () => {
  const { setUser } = useUser();

  const handleSelectUser = (user: User) => {
    setUser(user);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-900 text-white p-4 safe-area-top safe-area-bottom">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">
        
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-md">
        <button
          onClick={() => handleSelectUser('🐞')}
          className="flex flex-col items-center bg-gray-800 hover:bg-gray-700 p-4 sm:p-6 rounded-xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="bg-purple-700 p-4 rounded-full mb-4">
            <UserRound size={28} className="text-white" />
          </div>
          <span className="text-2xl">🐞</span>
        </button>
        
        <button
          onClick={() => handleSelectUser('🦎')}
          className="flex flex-col items-center bg-gray-800 hover:bg-gray-700 p-4 sm:p-6 rounded-xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="bg-indigo-600 p-4 rounded-full mb-4">
            <UserRound size={28} className="text-white" />
          </div>
          <span className="text-2xl">🦎</span>
        </button>
      </div>
    </div>
  );
};

export default UserSelection