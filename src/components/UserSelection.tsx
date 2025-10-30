import React, { useState, useRef, useEffect } from 'react';

import { useUser } from '../contexts/UserContext';
import { Lock, Fingerprint } from 'lucide-react';
import { 
  isBiometricAvailable, 
  isBiometricEnabled, 
  authenticateWithBiometric,
  getBiometricTypeName 
} from '../utils/biometricAuth';
import { trackLogin } from '../services/loginTracking';

const UserSelection: React.FC = () => {
  const { setUser } = useUser();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [autoPromptTriggered, setAutoPromptTriggered] = useState(false); // Track if auto-prompt already happened
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const validatePin = async (newPin: string[]) => {
    const pinString = newPin.join('');
    if (pinString.length === 4) {
      if (pinString === '1204') {
        setUser('🐞');
        // Track successful PIN login
        await trackLogin('🐞', 'pin', true);
      } else if (pinString === '1710') {
        setUser('🦎');
        // Track successful PIN login
        await trackLogin('🦎', 'pin', true);
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

  // Check if the device is mobile
  const isMobileDevice = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setBiometricError('');
    
    try {
      const user = await authenticateWithBiometric();
      if (user) {
        setUser(user);
        // Track successful biometric login
        await trackLogin(user, 'biometric', true);
      } else {
        setBiometricError('No user found. Please use PIN to login.');
      }
    } catch (error: any) {
      console.error('Biometric login error:', error);
      setBiometricError(error.message || 'Authentication failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  useEffect(() => {
    // Check biometric availability
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      const enabled = isBiometricEnabled();
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      
      // If biometric is enabled, don't show PIN input initially
      if (enabled && available) {
        setShowPinInput(false);
        // Automatically trigger biometric authentication on first load (only on mobile)
        if (!autoPromptTriggered && isMobileDevice()) {
          setAutoPromptTriggered(true);
          setTimeout(() => {
            handleBiometricLogin();
          }, 500); // Small delay to ensure UI is ready
        }
      } else {
        setShowPinInput(true);
        // Automatically focus on PIN input
        setTimeout(() => {
          const firstInput = inputRefs[0].current;
          if (firstInput) {
            firstInput.focus();
            firstInput.click();
          }
        }, 100);
      }
    };
    
    checkBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUsePinInstead = () => {
    setShowPinInput(true);
    setTimeout(() => {
      const firstInput = inputRefs[0].current;
      if (firstInput) {
        firstInput.focus();
        firstInput.click();
      }
    }, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-100 p-4 safe-area-top safe-area-bottom transition-colors duration-300">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        {/* Show biometric login if enabled and available */}
        {biometricEnabled && biometricAvailable && !showPinInput ? (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-primary-500 dark:text-primary-500" />
              </div>
              <h2 className="text-xl font-medium text-gray-600 dark:text-gray-200">
                {getBiometricTypeName()} Login
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Use your {getBiometricTypeName().toLowerCase()} to login
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 w-full">
              <button
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full py-4 px-6 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-medium shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {biometricLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    Authenticate
                  </>
                )}
              </button>

              {biometricError && (
                <p className="text-error-500/80 text-sm text-center animate-fade-in">
                  {biometricError}
                </p>
              )}

              <button
                onClick={handleUsePinInstead}
                className="text-sm text-primary-500 dark:text-primary-400 hover:underline"
              >
                Use PIN instead
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary-500 dark:text-primary-500" />
              </div>
              <h2 className="text-xl font-medium text-gray-600 dark:text-gray-200">Enter the PIN my love</h2>
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
                        bg-gray-50/90 dark:bg-gray-800/50 backdrop-blur-sm
                        rounded-2xl
                        transition-all duration-300
                        ${error 
                          ? 'border-2 border-error-500 animate-shake' 
                          : 'border-2 border-gray-300/60 dark:border-gray-700/50 group-hover:border-gray-400/60 dark:group-hover:border-gray-600/50 focus:border-primary-400 dark:focus:border-primary-400'
                        }
                        focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-500/20
                        text-gray-700 dark:text-gray-100 shadow-lg
                      `}
                    />
                    <div className={`
                      absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
                      transition-all duration-300
                      ${digit ? 'bg-primary-500 dark:bg-primary-500' : 'bg-gray-300/60 dark:bg-gray-700'}
                    `} />
                  </div>
                ))}
              </div>
              
              {error && (
                <div className="absolute -bottom-8 left-0 right-0 text-center">

                  <p className="text-error-500/80 text-sm animate-fade-in">
                    Invalid PIN
                  </p>
                </div>
              )}
            </div>

            {biometricEnabled && biometricAvailable && (
              <button
                onClick={() => setShowPinInput(false)}
                className="text-sm text-primary-500 dark:text-primary-400 hover:underline flex items-center gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                Use {getBiometricTypeName()} instead
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserSelection;