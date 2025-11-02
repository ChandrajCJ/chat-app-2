import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Fingerprint, AlertCircle, CheckCircle2, Loader2, MapPin, Monitor, Clock, Shield, Palette, Sun, Moon, Check, Sparkles, Lock, ChevronRight, ArrowLeft, Filter, User as UserIcon, Key, Smartphone, Laptop, Globe, ChevronDown, ChevronUp, Tablet } from 'lucide-react';
import { User, LoginInfo } from '../types';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  getBiometricTypeName,
  getSavedUser,
} from '../utils/biometricAuth';
import { getRecentLogins } from '../services/loginTracking';
import { useTheme } from '../contexts/ThemeContext';

interface BiometricSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

type SettingsView = 'main' | 'personalization' | 'security';

const BiometricSettingsModal: React.FC<BiometricSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { theme, colorScheme, toggleTheme, setColorScheme } = useTheme();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [recentLogins, setRecentLogins] = useState<LoginInfo[]>([]);
  const [loadingLogins, setLoadingLogins] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [userFilter, setUserFilter] = useState<User | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'pin' | 'biometric'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<'all' | 'mobile' | 'desktop' | 'laptop' | 'tablet'>('all');
  const [browserFilter, setBrowserFilter] = useState<'all' | string>('all');
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night' | 'custom'>('all');
  const [customTimeStart, setCustomTimeStart] = useState<string>('');
  const [customTimeEnd, setCustomTimeEnd] = useState<string>('');

  const colorSchemes = [
    { 
      name: 'electric-violet' as const, 
      label: 'Electric Violet', 
      colors: ['#7C3AED', '#3B82F6'],
      description: 'Purple & blue harmony'
    },
    { 
      name: 'ocean-mint' as const, 
      label: 'Ocean Mint', 
      colors: ['#0369A1', '#059669'],
      description: 'Deep ocean & fresh mint'
    },
    { 
      name: 'ruby-amethyst' as const, 
      label: 'Ruby Amethyst', 
      colors: ['#C51E3A', '#A855F7'],
      description: 'Passionate red & royal purple'
    },
    { 
      name: 'lilo-stitch' as const, 
      label: 'Lilo & Stitch', 
      colors: ['#2563EB', '#E8809A'],
      description: 'Stitch blue & Lilo pink'
    },
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentView('main'); // Reset to main view when opening
      checkBiometricStatus();
      loadRecentLogins();
    }
  }, [isOpen]);

  const loadRecentLogins = async () => {
    setLoadingLogins(true);
    try {
      console.log('Loading recent logins for all users');
      // Get logins for all users, not just current user
      const logins = await getRecentLogins(undefined, 50); // Increased limit to 50 for both users
      console.log('Loaded logins:', logins);
      setRecentLogins(logins);
    } catch (err) {
      console.error('Error loading recent logins:', err);
      console.error('Full error details:', err);
    } finally {
      setLoadingLogins(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    // Format: "Jan 2, 2025 at 3:45 PM"
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${dateStr} at ${timeStr}`;
  };

  const getDeviceType = (device: string): 'mobile' | 'desktop' | 'laptop' | 'tablet' => {
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('iphone') || deviceLower.includes('android')) return 'mobile';
    if (deviceLower.includes('ipad') || deviceLower.includes('tablet')) return 'tablet';
    if (deviceLower.includes('macbook') || deviceLower.includes('laptop')) return 'laptop';
    return 'desktop';
  };

  const getTimeOfDay = (date: Date): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'night';
  };

  const isTimeInRange = (date: Date, startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return true;
    
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;
    
    // Handle time range that crosses midnight
    if (endInMinutes < startInMinutes) {
      return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
    }
    
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  };

  const filterLogins = (logins: LoginInfo[]) => {
    let filtered = [...logins];
    const now = new Date();
    
    // Filter by date
    switch (dateFilter) {
      case 'today': {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(login => login.timestamp >= startOfToday);
        break;
      }
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(login => login.timestamp >= weekAgo);
        break;
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(login => login.timestamp >= monthAgo);
        break;
      }
      case 'custom': {
        if (customDateStart && customDateEnd) {
          const startDate = new Date(customDateStart);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customDateEnd);
          endDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(login => 
            login.timestamp >= startDate && login.timestamp <= endDate
          );
        } else if (customDateStart) {
          const startDate = new Date(customDateStart);
          startDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(login => login.timestamp >= startDate);
        } else if (customDateEnd) {
          const endDate = new Date(customDateEnd);
          endDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(login => login.timestamp <= endDate);
        }
        break;
      }
    }

    // Filter by user
    if (userFilter !== 'all') {
      filtered = filtered.filter(login => login.user === userFilter);
    }

    // Filter by login method
    if (methodFilter !== 'all') {
      filtered = filtered.filter(login => login.loginMethod === methodFilter);
    }

    // Filter by status
    if (statusFilter === 'success') {
      filtered = filtered.filter(login => login.success === true);
    } else if (statusFilter === 'failed') {
      filtered = filtered.filter(login => login.success === false);
    }

    // Filter by device type
    if (deviceTypeFilter !== 'all') {
      filtered = filtered.filter(login => getDeviceType(login.device) === deviceTypeFilter);
    }

    // Filter by browser
    if (browserFilter !== 'all') {
      filtered = filtered.filter(login => login.browser.toLowerCase().includes(browserFilter.toLowerCase()));
    }

    // Filter by time of day
    if (timeOfDayFilter === 'custom') {
      if (customTimeStart && customTimeEnd) {
        filtered = filtered.filter(login => isTimeInRange(login.timestamp, customTimeStart, customTimeEnd));
      }
    } else if (timeOfDayFilter !== 'all') {
      filtered = filtered.filter(login => getTimeOfDay(login.timestamp) === timeOfDayFilter);
    }

    return filtered;
  };

  // Get unique values for dynamic filters
  const getUniqueBrowsers = () => {
    const browsers = new Set<string>();
    recentLogins.forEach(login => {
      const browser = login.browser.split(' ')[0]; // Get browser name without version
      browsers.add(browser);
    });
    return Array.from(browsers).sort();
  };

  // Get device icon based on device string
  const getDeviceIcon = (device: string) => {
    const deviceLower = device.toLowerCase();
    
    // Mobile devices
    if (deviceLower.includes('iphone') || deviceLower.includes('android') || 
        deviceLower.includes('mobile') || deviceLower.includes('phone')) {
      return <Smartphone className="w-3 h-3 mt-0.5 flex-shrink-0" />;
    }
    
    // Tablets
    if (deviceLower.includes('ipad') || deviceLower.includes('tablet')) {
      return <Tablet className="w-3 h-3 mt-0.5 flex-shrink-0" />;
    }
    
    // Laptops
    if (deviceLower.includes('macbook') || deviceLower.includes('laptop') || 
        deviceLower.includes('notebook')) {
      return <Laptop className="w-3 h-3 mt-0.5 flex-shrink-0" />;
    }
    
    // Desktop (default)
    return <Monitor className="w-3 h-3 mt-0.5 flex-shrink-0" />;
  };

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

  const handleBack = () => {
    setCurrentView('main');
    setError('');
    setSuccess('');
  };

  const renderMainMenu = () => (
    <div className="p-6 space-y-3">
      {/* Personalization Category */}
      <button
        onClick={() => setCurrentView('personalization')}
        className="w-full bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl p-4 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-full">
            <Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Personalization & User Experience
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Themes, colors, and biometric settings
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>

      {/* Security Category */}
      <button
        onClick={() => setCurrentView('security')}
        className="w-full bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl p-4 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-full">
            <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Security & Account Management
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Recent logins and security monitoring
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>
    </div>
  );

  const renderPersonalizationView = () => (
    <div className="p-6 space-y-4">
      {/* Theme Mode */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Theme Mode
          </h4>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (theme === 'dark') toggleTheme();
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
              theme === 'light'
                ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-2 border-primary-300 dark:border-primary-700 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
            }`}
          >
            <Sun size={18} />
            <span className="text-sm font-medium">Light</span>
            {theme === 'light' && <Check size={16} />}
          </button>
          <button
            onClick={() => {
              if (theme === 'light') toggleTheme();
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-2 border-primary-300 dark:border-primary-700 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
            }`}
          >
            <Moon size={18} />
            <span className="text-sm font-medium">Dark</span>
            {theme === 'dark' && <Check size={16} />}
          </button>
        </div>
      </div>

      {/* Color Schemes */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Color Scheme
          </h4>
        </div>
        <div className="space-y-2">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.name}
              onClick={() => setColorScheme(scheme.name)}
              className={`w-full px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                colorScheme === scheme.name
                  ? 'bg-white dark:bg-gray-800 border-2 border-primary-300 dark:border-primary-700 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <div className="flex gap-1.5">
                {scheme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {scheme.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {scheme.description}
                </div>
              </div>
              {colorScheme === scheme.name && (
                <Check size={18} className="text-primary-600 dark:text-primary-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Biometrics */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Biometric Authentication
          </h4>
        </div>

        {checkingAvailability ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Checking device capabilities...
            </p>
          </div>
        ) : !biometricAvailable ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
            <div className="p-2 bg-error-100 dark:bg-error-900 rounded-full mb-1">
              <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {biometricTypeName} Not Available
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your device doesn't support biometric authentication
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
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
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Linked User
                </span>
                <span className="text-2xl">{savedUser}</span>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-3 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
                <p className="text-error-700 dark:text-error-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-3 flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-success-600 dark:text-success-400 flex-shrink-0 mt-0.5" />
                <p className="text-success-700 dark:text-success-300">{success}</p>
              </div>
            )}

            {/* Action Button */}
            {biometricEnabled ? (
              <button
                onClick={handleDisableBiometric}
                disabled={loading}
                type="button"
                className="w-full py-2.5 px-4 bg-error-500 hover:bg-error-600 disabled:bg-error-300 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
                className="w-full py-2.5 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    Enable {biometricTypeName}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderSecurityView = () => {
    const filteredLogins = filterLogins(recentLogins);
    const activeFiltersCount = [
      dateFilter !== 'all',
      userFilter !== 'all',
      methodFilter !== 'all',
      statusFilter !== 'all',
      deviceTypeFilter !== 'all',
      browserFilter !== 'all',
      timeOfDayFilter !== 'all'
    ].filter(Boolean).length;

    const uniqueBrowsers = getUniqueBrowsers();
    
    return (
      <div className="p-6">
        {/* Recent Logins */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Recent Logins
              </h4>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeFiltersCount > 0 || showFilters
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {activeFiltersCount > 0 ? `${activeFiltersCount} Filter${activeFiltersCount > 1 ? 's' : ''}` : 'Filters'}
              </span>
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Filters Section */}
          {showFilters && (
            <div className="space-y-3 mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-slide-in">
            {/* Date Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Date</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dateFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dateFilter === 'today'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dateFilter === 'week'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dateFilter === 'month'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    dateFilter === 'custom'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Custom Range
                </button>
              </div>
              {/* Custom Date Range Inputs */}
              {dateFilter === 'custom' && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From Date</label>
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To Date</label>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* User Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">User</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    userFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Users
                </button>
                <button
                  onClick={() => setUserFilter('🐞')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    userFilter === '🐞'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm">🐞</span>
                </button>
                <button
                  onClick={() => setUserFilter('🦎')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    userFilter === '🦎'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm">🦎</span>
                </button>
              </div>
            </div>

            {/* Method Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Login Method</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setMethodFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    methodFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Methods
                </button>
                <button
                  onClick={() => setMethodFilter('pin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    methodFilter === 'pin'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Key className="w-3 h-3" />
                  <span>PIN</span>
                </button>
                <button
                  onClick={() => setMethodFilter('biometric')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    methodFilter === 'biometric'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Fingerprint className="w-3 h-3" />
                  <span>Biometric</span>
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Status</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setStatusFilter('success')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    statusFilter === 'success'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Successful</span>
                </button>
                <button
                  onClick={() => setStatusFilter('failed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    statusFilter === 'failed'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Failed</span>
                </button>
              </div>
            </div>

            {/* Device Type Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Device Type</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setDeviceTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    deviceTypeFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Devices
                </button>
                <button
                  onClick={() => setDeviceTypeFilter('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    deviceTypeFilter === 'mobile'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile</span>
                </button>
                <button
                  onClick={() => setDeviceTypeFilter('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    deviceTypeFilter === 'desktop'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setDeviceTypeFilter('laptop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    deviceTypeFilter === 'laptop'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Laptop className="w-3 h-3" />
                  <span>Laptop</span>
                </button>
                <button
                  onClick={() => setDeviceTypeFilter('tablet')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    deviceTypeFilter === 'tablet'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Tablet className="w-3 h-3" />
                  <span>Tablet</span>
                </button>
              </div>
            </div>

            {/* Browser Filter */}
            {uniqueBrowsers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Browser</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setBrowserFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      browserFilter === 'all'
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Browsers
                  </button>
                  {uniqueBrowsers.map(browser => (
                    <button
                      key={browser}
                      onClick={() => setBrowserFilter(browser)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        browserFilter === browser
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {browser}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Time of Day Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Time of Day</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTimeOfDayFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeOfDayFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Hours
                </button>
                <button
                  onClick={() => setTimeOfDayFilter('morning')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeOfDayFilter === 'morning'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Morning (6am-12pm)
                </button>
                <button
                  onClick={() => setTimeOfDayFilter('afternoon')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeOfDayFilter === 'afternoon'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Afternoon (12pm-6pm)
                </button>
                <button
                  onClick={() => setTimeOfDayFilter('evening')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeOfDayFilter === 'evening'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Evening (6pm-12am)
                </button>
                <button
                  onClick={() => setTimeOfDayFilter('night')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeOfDayFilter === 'night'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Night (12am-6am)
                </button>
                <button
                  onClick={() => setTimeOfDayFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeOfDayFilter === 'custom'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Custom Time
                </button>
              </div>
              {/* Custom Time Range Inputs */}
              {timeOfDayFilter === 'custom' && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From Time</label>
                    <input
                      type="time"
                      value={customTimeStart}
                      onChange={(e) => setCustomTimeStart(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To Time</label>
                    <input
                      type="time"
                      value={customTimeEnd}
                      onChange={(e) => setCustomTimeEnd(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Clear All Filters Button */}
            {activeFiltersCount > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setDateFilter('all');
                    setCustomDateStart('');
                    setCustomDateEnd('');
                    setUserFilter('all');
                    setMethodFilter('all');
                    setStatusFilter('all');
                    setDeviceTypeFilter('all');
                    setBrowserFilter('all');
                    setTimeOfDayFilter('all');
                    setCustomTimeStart('');
                    setCustomTimeEnd('');
                  }}
                  className="w-full py-2 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
            </div>
          )}

          {loadingLogins ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loading login history...
              </p>
            </div>
          ) : filteredLogins.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {recentLogins.length === 0 
                  ? 'No login history available yet'
                  : activeFiltersCount > 0
                    ? 'No logins found matching the selected filters'
                    : 'No login history available yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredLogins.map((login) => (
              <div
                key={login.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2"
              >
                {/* Header: User and Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{login.user}</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {login.loginMethod === 'biometric' ? (
                        <span className="flex items-center gap-1">
                          <Fingerprint className="w-3 h-3" />
                          Biometric
                        </span>
                      ) : (
                        'PIN'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(login.timestamp)}
                  </div>
                </div>

                {/* Device and Browser Info */}
                <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  {getDeviceIcon(login.device)}
                  <div className="flex flex-wrap gap-1">
                    <span>{login.device}</span>
                    <span>•</span>
                    <span>{login.browser}</span>
                    <span>•</span>
                    <span>{login.os}</span>
                  </div>
                </div>

                {/* Location Info */}
                {login.location && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {login.location.city && <span>{login.location.city}</span>}
                      {login.location.city && login.location.region && <span>•</span>}
                      {login.location.region && <span>{login.location.region}</span>}
                      {(login.location.city || login.location.region) && login.location.country && <span>•</span>}
                      {login.location.country && <span>{login.location.country}</span>}
                    </div>
                  </div>
                )}

                {/* Success indicator */}
                {login.success && (
                  <div className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Successful</span>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-3xl z-10">
          {currentView !== 'main' ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          ) : (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-full">
                <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Settings
            </h2>
          </div>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        {currentView === 'main' && renderMainMenu()}
        {currentView === 'personalization' && renderPersonalizationView()}
        {currentView === 'security' && renderSecurityView()}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BiometricSettingsModal;

