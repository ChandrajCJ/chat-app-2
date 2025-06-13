import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { useUser } from '../contexts/UserContext';
import { Lock, Sparkles } from 'lucide-react';

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
    const firstInput = inputRefs[0].current;
    if (firstInput) {
      firstInput.focus();
      firstInput.click();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 safe-area-top safe-area-bottom relative">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
      <div className="absolute top-32 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-pink-400/25 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="w-full max-w-sm mx-auto">
        {/* Main container with glassmorphism */}
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-8">
            {/* Header section */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl glass-button flex items-center justify-center animate-glow">
                  <Lock className="w-10 h-10 text-white/90" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
              </div>
              
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white/95 mb-2 text-shadow">
                  Welcome Back
                </h1>
                <p className="text-white/70 text-sm font-medium">
                  Enter your PIN to continue
                </p>
              </div>
            </div>

            {/* PIN input section */}
            <div className="relative w-full">
              <div className="flex gap-4 justify-center">
                {pin.map((digit, index) => (
                  <div key={index} className="relative group">
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
                        w-16 h-16 text-2xl font-bold text-center text-white/95
                        glass-input rounded-2xl
                        transition-all duration-300 ease-out
                        focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/30
                        group-hover:border-white/20
                        ${error 
                          ? 'border-red-400/50 animate-shake bg-red-500/10' 
                          : 'border-white/10'
                        }
                        placeholder-white/30
                      `}
                      placeholder="•"
                    />
                    
                    {/* Animated dot indicator */}
                    <div className={`
                      absolute -bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
                      transition-all duration-300 ease-out
                      ${digit 
                        ? 'bg-gradient-to-r from-purple-400 to-pink-400 scale-100 opacity-100' 
                        : 'bg-white/20 scale-75 opacity-60'
                      }
                    `} />
                  </div>
                ))}
              </div>
              
              {/* Error message */}
              {error && (
                <div className="absolute -bottom-12 left-0 right-0 text-center">
                  <div className="glass-dark rounded-xl px-4 py-2 inline-block">
                    <p className="text-red-400 text-sm font-medium animate-fade-in">
                      Invalid PIN. Please try again.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Decorative elements */}
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="text-center mt-6">
          <p className="text-white/50 text-xs font-medium">
            Secure access • End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserSelection;