import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { useUser } from '../contexts/UserContext';
import { Lock } from 'lucide-react';

const UserSelection: React.FC = () => {
  const { setUser } = useUser();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const validatePin = (newPin: string[]) => {
    const pinString = newPin.join('');
    if (pinString.length === 4) {
      if (pinString === '1204') {
        setUser('🐞');
      } else if (pinString === '6969') {
        setUser('🦎');
      } else {
        setError(true);
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    }
  };

  const handleInput = (index: number, value: string) => {
    if (error) setError(false);
    
    if (/^\d*$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value.slice(-1);
      setPin(newPin);

      if (value && index < 3) {
        inputRefs[index + 1].current?.focus();
      }

      validatePin(newPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  useEffect(() => {
    // Automatically focus and show keyboard on mobile
    const firstInput = inputRefs[0].current;
    if (firstInput) {
      firstInput.focus();
      // This will trigger the keyboard on mobile devices
      firstInput.click();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-900 text-white p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-violet-600/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-violet-500" />
          </div>
          <h2 className="text-xl font-medium text-gray-200">Enter 4 digit pin</h2>
        </div>

        <div className="relative">
          <div className="flex gap-3 sm:gap-4">
            {pin.map((digit, index) => (
              <div
                key={index}
                className="relative group"
              >
                <input
                  ref={inputRefs[index]}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`
                    w-14 h-14 sm:w-16 sm:h-16 text-2xl text-center
                    bg-gray-800/50 backdrop-blur-sm
                    rounded-2xl
                    transition-all duration-300
                    ${error 
                      ? 'border-2 border-red-500/50 animate-shake' 
                      : 'border-2 border-gray-700/50 group-hover:border-gray-600/50 focus:border-violet-500/50'
                    }
                    focus:outline-none focus:ring-2 focus:ring-violet-500/20
                  `}
                />
                <div className={`
                  absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
                  transition-all duration-300
                  ${digit ? 'bg-violet-500' : 'bg-gray-700'}
                `} />
              </div>
            ))}
          </div>
          
          {error && (
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <p className="text-red-500 text-sm animate-fade-in">
                Invalid PIN
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSelection;