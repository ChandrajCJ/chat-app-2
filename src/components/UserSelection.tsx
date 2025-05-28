import React, { useState } from 'react';
import { User } from '../types';
import { useUser } from '../contexts/UserContext';

const UserSelection: React.FC = () => {
  const { setUser } = useUser();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin === '1204') {
      setUser('🐞');
    } else if (pin === '6969') {
      setUser('🦎');
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-900 text-white p-4 safe-area-top safe-area-bottom">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-xs"
      >
        <div className="relative">
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            value={pin}
            onChange={handlePinChange}
            className={`
              w-full bg-gray-800 text-center text-2xl tracking-[1em] py-4 rounded-xl
              border-2 transition-all duration-300
              ${error 
                ? 'border-red-500 animate-shake' 
                : 'border-gray-700 hover:border-gray-600 focus:border-violet-600'
              }
              focus:outline-none
            `}
            placeholder="••••"
            autoFocus
          />
          {error && (
            <p className="absolute text-red-500 text-sm mt-2 text-center w-full">
              Invalid PIN
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default UserSelection;