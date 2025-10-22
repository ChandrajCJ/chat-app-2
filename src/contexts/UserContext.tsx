import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface UserContextType {
  currentUser: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  loginKey: number; // Add a login key to force fresh mounts
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginKey, setLoginKey] = useState(0);

  const setUser = (user: User | null) => {
    setCurrentUser(user);
    // Increment login key to force fresh mount
    if (user !== null) {
      setLoginKey(prev => prev + 1);
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    setCurrentUser(null);
    // Give React a moment to unmount components and clean up
    setTimeout(() => {
      console.log('🧹 Logout cleanup complete');
    }, 100);
  };

  return (
    <UserContext.Provider value={{ currentUser, setUser, logout, loginKey }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};