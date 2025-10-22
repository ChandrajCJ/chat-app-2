import { User } from '../types';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const SAVED_USER_KEY = 'biometric_saved_user';

/**
 * Check if the browser supports biometric authentication
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    console.log('Checking biometric availability...');
    
    // Check if we're on a secure context (https or localhost)
    if (!window.isSecureContext) {
      console.warn('Not a secure context - WebAuthn requires HTTPS or localhost');
      return false;
    }
    
    // Check if PublicKeyCredential is available
    if (!window.PublicKeyCredential) {
      console.warn('PublicKeyCredential not available in this browser');
      return false;
    }

    // Check if platform authenticator (biometric) is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    console.log('Platform authenticator available:', available);
    return available;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Check if biometric authentication is enabled for this device
 */
export const isBiometricEnabled = (): boolean => {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
};

/**
 * Get the saved user associated with biometric auth
 */
export const getSavedUser = (): User | null => {
  const savedUser = localStorage.getItem(SAVED_USER_KEY);
  return savedUser as User | null;
};

/**
 * Enable biometric authentication for a user
 * This stores the user locally and marks biometric as enabled
 */
export const enableBiometricAuth = async (user: User): Promise<boolean> => {
  try {
    // First verify that biometric is available
    const available = await isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication not available on this device');
    }

    // Test the biometric authentication by creating a simple credential
    // This will prompt the user to authenticate with their fingerprint/face
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Chat App',
        id: window.location.hostname,
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: `user_${user}`,
        displayName: user,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    };

    // This will trigger the biometric prompt
    await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    // If we get here, biometric was successful
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    localStorage.setItem(SAVED_USER_KEY, user);
    
    return true;
  } catch (error: any) {
    console.error('Error enabling biometric auth:', error);
    
    // User cancelled or biometric failed
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled');
    }
    
    // Invalid state error - might indicate no biometric hardware or not set up
    if (error.name === 'InvalidStateError') {
      throw new Error('A passkey already exists or biometric is not properly configured');
    }
    
    // Not supported error
    if (error.name === 'NotSupportedError') {
      throw new Error('Your browser or device does not support biometric authentication');
    }
    
    throw new Error('Failed to enable biometric authentication. Make sure biometrics are set up in your device settings.');
  }
};

/**
 * Authenticate using biometrics
 * Returns the saved user if authentication is successful
 */
export const authenticateWithBiometric = async (): Promise<User | null> => {
  try {
    // Check if biometric is enabled
    if (!isBiometricEnabled()) {
      return null;
    }

    // Get the saved user
    const savedUser = getSavedUser();
    if (!savedUser) {
      return null;
    }

    // Create a challenge for authentication
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: window.location.hostname,
    };

    // This will trigger the biometric prompt
    await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    // If we get here, biometric was successful
    return savedUser;
  } catch (error: any) {
    console.error('Error authenticating with biometric:', error);
    
    // User cancelled
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled');
    }
    
    // No credentials available - user needs to enable biometric first
    if (error.name === 'NotFoundError') {
      throw new Error('No passkeys found. Please login with PIN and enable biometric in Settings first.');
    }
    
    throw new Error('Biometric authentication failed');
  }
};

/**
 * Disable biometric authentication
 * Removes stored user and biometric flag
 */
export const disableBiometricAuth = (): void => {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(SAVED_USER_KEY);
};

/**
 * Get a user-friendly name for the biometric type available
 */
export const getBiometricTypeName = (): string => {
  // This is a best guess based on platform
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'Touch ID';
  } else if (platform.includes('iphone') || platform.includes('ipad') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'Face ID or Touch ID';
  } else if (platform.includes('win')) {
    return 'Windows Hello';
  } else if (userAgent.includes('android')) {
    return 'Fingerprint';
  }
  
  return 'Biometric';
};

