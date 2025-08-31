import React, { useState, useRef, useEffect } from 'react';

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
      } else if (pinString === '1710') {
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
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 safe-area-top safe-area-bottom transition-colors duration-300"
         style={{
           background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50, var(--primary-100)) 100%)',
           color: 'var(--primary-900)'
         }}>
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2"
               style={{
                 backgroundColor: 'var(--primary-500)',
                 borderColor: 'var(--primary-600)'
               }}>
            <Lock className="w-8 h-8" style={{ color: 'var(--primary-text)' }} />
          </div>
          <h2 className="text-xl font-medium" style={{ color: 'var(--primary-700)' }}>Enter the PIN my love</h2>
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
                    rounded-2xl
                    transition-all duration-300
                    backdrop-blur-sm shadow-lg
                    focus:outline-none
                    ${error ? 'animate-shake' : ''}
                  `}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderWidth: '2px',
                    borderColor: error 
                      ? '#ef4444' 
                      : digit 
                        ? 'var(--primary-500)' 
                        : 'var(--primary-300)',
                    color: 'var(--primary-900)',
                    boxShadow: error 
                      ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
                      : digit 
                        ? '0 0 0 3px var(--primary-500, rgba(124, 58, 237, 0.1))' 
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                  }}
                  onBlur={(e) => {
                    if (!error) {
                      e.target.style.borderColor = digit ? 'var(--primary-500)' : 'var(--primary-300)';
                      e.target.style.boxShadow = digit 
                        ? '0 0 0 3px rgba(124, 58, 237, 0.1)' 
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                />
                <div className={`
                  absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
                  transition-all duration-300
                `} 
                style={{
                  backgroundColor: digit ? 'var(--primary-500)' : 'var(--primary-300)'
                }} />
              </div>
            ))}
          </div>
          
          {error && (
            <div className="absolute -bottom-8 left-0 right-0 text-center">

              <p className="text-sm animate-fade-in" style={{ color: '#ef4444' }}>
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