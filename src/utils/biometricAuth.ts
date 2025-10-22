import { User } from '../types';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const SAVED_USER_KEY = 'biometric_saved_user';
const BIOMETRIC_MODE_KEY = 'biometric_mode'; // 'webauthn' or 'simple'
const CREDENTIAL_ID_KEY = 'biometric_credential_id';

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

    // Get the effective domain for RP ID
    // Use hostname, but handle localhost and IP addresses
    let rpId = window.location.hostname;
    // For localhost or IP addresses, we can't use subdomain, just use as-is
    if (rpId === 'localhost' || rpId === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(rpId)) {
      // Keep as is
    } else {
      // For regular domains, we could use the domain without subdomain
      // but for now, keep it simple and use the full hostname
    }

    console.log('Creating passkey with RP ID:', rpId);

    // Test the biometric authentication by creating a discoverable credential
    // This will prompt the user to authenticate with their fingerprint/face
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Create a unique user ID for this device and user combination
    const userId = crypto.getRandomValues(new Uint8Array(16));
    
    // Generate a unique name for this credential to avoid conflicts
    const credentialName = `user_${user}_${Date.now()}`;
    
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Chat App',
        id: rpId,
      },
      user: {
        id: userId,
        name: credentialName,
        displayName: `${user} on ${rpId}`,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,  // Make it discoverable
        residentKey: 'required',   // Require resident key (discoverable credential)
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
      // Exclude existing credentials to avoid conflicts
      excludeCredentials: [],
    };

    // This will trigger the biometric prompt
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    console.log('Credential created successfully:', credential.id);

    // Store the credential ID for this specific device/domain
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    
    // If we get here, biometric was successful
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    localStorage.setItem(SAVED_USER_KEY, user);
    localStorage.setItem(BIOMETRIC_MODE_KEY, 'webauthn');
    localStorage.setItem(CREDENTIAL_ID_KEY, credentialId);
    
    return true;
  } catch (error: any) {
    console.error('Error enabling biometric auth:', error);
    
    // User cancelled or biometric failed
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled');
    }
    
    // Invalid state error - might indicate no biometric hardware or not set up
    if (error.name === 'InvalidStateError') {
      throw new Error('A passkey already exists for this device. Try disabling and re-enabling.');
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
      console.log('Biometric not enabled in localStorage');
      return null;
    }

    // Get the saved user
    const savedUser = getSavedUser();
    if (!savedUser) {
      console.log('No saved user found');
      return null;
    }

    // Get the effective domain for RP ID
    let rpId = window.location.hostname;
    
    console.log('Authenticating with RP ID:', rpId);

    // Create a challenge for authentication
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Get the stored credential ID if available
    const storedCredentialId = localStorage.getItem(CREDENTIAL_ID_KEY);
    const allowCredentials: PublicKeyCredentialDescriptor[] = [];
    
    // If we have a stored credential ID, try to use it
    if (storedCredentialId) {
      try {
        const credentialIdBuffer = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));
        allowCredentials.push({
          id: credentialIdBuffer,
          type: 'public-key',
          transports: ['internal'],
        });
        console.log('Using stored credential ID');
      } catch (e) {
        console.warn('Failed to decode stored credential ID', e);
      }
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: rpId,
      // Use stored credentials if available, otherwise try discoverable credentials
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : [],
    };

    // This will trigger the biometric prompt
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    if (!credential) {
      throw new Error('No credential returned');
    }

    console.log('Authentication successful');

    // If we get here, biometric was successful
    return savedUser;
  } catch (error: any) {
    console.error('Error authenticating with biometric:', error);
    console.error('Error details:', { name: error.name, message: error.message });
    
    // User cancelled
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled');
    }
    
    // No credentials available - user needs to enable biometric first
    if (error.name === 'NotFoundError') {
      throw new Error('No passkeys found for this device. Please enable biometric in Settings (⚙️) after logging in with PIN.');
    }
    
    throw new Error('Biometric authentication failed. Try enabling biometric again in Settings.');
  }
};

/**
 * Disable biometric authentication
 * Removes stored user and biometric flag
 */
export const disableBiometricAuth = (): void => {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(SAVED_USER_KEY);
  localStorage.removeItem(BIOMETRIC_MODE_KEY);
  localStorage.removeItem(CREDENTIAL_ID_KEY);
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

