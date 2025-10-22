import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Fingerprint, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { User } from '../types';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  getBiometricTypeName,
  getSavedUser,
} from '../utils/biometricAuth';

interface BiometricSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const BiometricSettingsModal: React.FC<BiometricSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkBiometricStatus();
    }
  }, [isOpen]);

  const checkBiometricStatus = async () => {
    setCheckingAvailability(true);
    try {
      const available = await isBiometricAvailable();
      const enabled = isBiometricEnabled();
      console.log('Biometric check:', { available, enabled }); // Debug log
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
    } catch (err) {
      console.error('Error checking biometric status:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleEnableBiometric = async () => {
    console.log('Enable button clicked!'); // Debug log
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await enableBiometricAuth(currentUser);
      setBiometricEnabled(true);
      setSuccess(`${getBiometricTypeName()} authentication enabled successfully!`);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error enabling biometric:', err);
      setError(err.message || 'Failed to enable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometric = () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      disableBiometricAuth();
      setBiometricEnabled(false);
      setSuccess('Biometric authentication disabled successfully!');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error disabling biometric:', err);
      setError(err.message || 'Failed to disable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const savedUser = getSavedUser();
  const biometricTypeName = getBiometricTypeName();

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full overflow-y-auto animate-scale-in"
        style={{ 
          maxWidth: '28rem',
          maxHeight: '85vh',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-full">
              <Fingerprint className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {biometricTypeName} Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {checkingAvailability ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Checking device capabilities...
              </p>
            </div>
          ) : !biometricAvailable ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="p-3 bg-error-100 dark:bg-error-900 rounded-full">
                <AlertCircle className="w-8 h-8 text-error-600 dark:text-error-400" />
              </div>
              <p className="text-center text-gray-700 dark:text-gray-300 font-medium">
                {biometricTypeName} Not Available
              </p>
              <div className="text-sm text-center text-gray-500 dark:text-gray-400 space-y-2">
                <p>Your device doesn't support biometric authentication or it's not set up.</p>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-left space-y-1 mt-3">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Possible reasons:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>No fingerprint/Face ID hardware on this device</li>
                    <li>Biometric authentication not enabled in system settings</li>
                    <li>Browser doesn't support WebAuthn API</li>
                    <li>Not using HTTPS or localhost</li>
                  </ul>
                </div>
                <p className="pt-2">
                  Check your browser console for more details.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      biometricEnabled
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {biometricEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {biometricEnabled && savedUser && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Linked User
                    </span>
                    <span className="text-2xl">{savedUser}</span>
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  How it works
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>
                      When enabled, you can login using your {biometricTypeName.toLowerCase()}{' '}
                      instead of entering your PIN
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>
                      Your biometric data never leaves your device and is stored securely by your
                      operating system
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>
                      You can always use your PIN as a fallback if biometric authentication fails
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>This setting is device-specific and won't sync across devices</span>
                  </li>
                </ul>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-success-600 dark:text-success-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-success-700 dark:text-success-300">{success}</p>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                {biometricEnabled ? (
                  <button
                    onClick={handleDisableBiometric}
                    disabled={loading}
                    type="button"
                    className="w-full py-3 px-4 bg-error-500 hover:bg-error-600 disabled:bg-error-300 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      <>Disable {biometricTypeName}</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleEnableBiometric}
                    disabled={loading}
                    type="button"
                    className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5" />
                        Enable {biometricTypeName}
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BiometricSettingsModal;

