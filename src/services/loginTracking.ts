import { collection, addDoc, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User, LoginInfo } from '../types';

/**
 * Get device information from user agent
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  // Detect device type
  let device = 'Unknown Device';
  if (/iPhone/.test(ua)) {
    const match = ua.match(/iPhone\s?(\d+[,_]\d+)?/);
    device = match ? `iPhone` : 'iPhone';
  } else if (/iPad/.test(ua)) {
    device = 'iPad';
  } else if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) {
    device = 'MacBook';
  } else if (/Windows/.test(ua)) {
    device = 'Windows PC';
  } else if (/Android/.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+)/);
    device = match ? `Android Device` : 'Android Device';
  } else if (/Linux/.test(ua)) {
    device = 'Linux PC';
  }

  return device;
};

/**
 * Get browser information
 */
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';

  // Detect browser
  if (/Edg\//.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
  } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari';
  } else if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
  }

  return browser;
};

/**
 * Get operating system information
 */
const getOSInfo = () => {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';

  if (/Windows NT 10/.test(ua)) {
    os = 'Windows 10';
  } else if (/Windows NT 11/.test(ua)) {
    os = 'Windows 11';
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS X ([\d_]+)/.test(ua)) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      os = `macOS ${version}`;
    } else {
      os = 'macOS';
    }
  } else if (/iPhone OS ([\d_]+)/.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      os = `iOS ${version}`;
    } else {
      os = 'iOS';
    }
  } else if (/Android ([\d.]+)/.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  return os;
};

/**
 * Get location information based on timezone and language
 * Note: This is a basic implementation. For accurate location, you'd need an IP geolocation API
 */
const getLocationInfo = async () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language;
    
    // Basic location info from timezone and locale
    const location = {
      timezone,
      country: locale.split('-')[1] || 'Unknown',
    };

    // Try to fetch more accurate location from a free IP API
    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(1500), // 1.5 second timeout (reduced for faster login)
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          city: data.city,
          region: data.region,
          country: data.country_name,
          timezone: data.timezone,
        };
      }
    } catch (apiError) {
      console.warn('Could not fetch location from IP API:', apiError);
    }

    return location;
  } catch (error) {
    console.error('Error getting location info:', error);
    return {
      timezone: 'Unknown',
      country: 'Unknown',
    };
  }
};

/**
 * Track a login attempt
 */
export const trackLogin = async (
  user: User,
  loginMethod: 'pin' | 'biometric',
  success: boolean = true
): Promise<void> => {
  try {
    console.log('🔍 Starting login tracking for user:', user, 'method:', loginMethod);
    const device = getDeviceInfo();
    const browser = getBrowserInfo();
    const os = getOSInfo();
    const location = await getLocationInfo();

    const loginData = {
      user,
      timestamp: Timestamp.now(),
      device,
      browser,
      os,
      location,
      loginMethod,
      success,
    };

    console.log('📝 Login data prepared:', loginData);

    // Store in Firebase
    const docRef = await addDoc(collection(db, 'loginHistory'), loginData);
    
    console.log('✅ Login tracked successfully with ID:', docRef.id, loginData);
  } catch (error) {
    console.error('❌ Error tracking login:', error);
    console.error('Error details:', error);
    // Don't throw error - login tracking shouldn't block the login process
  }
};

/**
 * Get recent login history for a user
 */
export const getRecentLogins = async (
  user?: User,
  limitCount: number = 10
): Promise<LoginInfo[]> => {
  try {
    console.log('🔍 Fetching recent logins for user:', user, 'limit:', limitCount);
    const loginHistoryRef = collection(db, 'loginHistory');
    
    // Query without filter to avoid index requirement
    // We'll filter client-side instead
    const q = query(
      loginHistoryRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount * 2) // Get more to filter client-side
    );

    console.log('📊 Executing query...');
    const querySnapshot = await getDocs(q);
    console.log('📦 Query returned', querySnapshot.size, 'documents');
    
    const logins: LoginInfo[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📄 Document data:', doc.id, data);
      
      // Filter by user client-side if user is specified
      if (!user || data.user === user) {
        logins.push({
          id: doc.id,
          user: data.user,
          timestamp: data.timestamp.toDate(),
          device: data.device,
          browser: data.browser,
          os: data.os,
          location: data.location,
          ipAddress: data.ipAddress,
          loginMethod: data.loginMethod,
          success: data.success,
        });
      }
    });

    // Limit to requested count after filtering
    const limitedLogins = logins.slice(0, limitCount);
    
    console.log('✅ Returning', limitedLogins.length, 'login records');
    return limitedLogins;
  } catch (error) {
    console.error('❌ Error fetching recent logins:', error);
    console.error('Error name:', (error as any)?.name);
    console.error('Error message:', (error as any)?.message);
    console.error('Error code:', (error as any)?.code);
    return [];
  }
};

/**
 * Get all recent logins (both users)
 */
export const getAllRecentLogins = async (limitCount: number = 20): Promise<LoginInfo[]> => {
  return getRecentLogins(undefined, limitCount);
};

