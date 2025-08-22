import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorScheme = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'indigo';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) return saved;
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('colorScheme') as ColorScheme;
    return saved || 'violet';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorScheme', colorScheme);
    
    // Update document class for theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // Update document class for color scheme
    document.documentElement.classList.remove('violet', 'blue', 'emerald', 'rose', 'amber', 'indigo');
    document.documentElement.classList.add(colorScheme);
    
    // Update meta theme-color based on theme and color scheme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors = {
        violet: theme === 'dark' ? '#1e1b4b' : '#f4f3ff',
        blue: theme === 'dark' ? '#1e3a8a' : '#eff6ff',
        emerald: theme === 'dark' ? '#064e3b' : '#ecfdf5',
        rose: theme === 'dark' ? '#881337' : '#fff1f2',
        amber: theme === 'dark' ? '#92400e' : '#fffbeb',
        indigo: theme === 'dark' ? '#312e81' : '#eef2ff'
      };
      metaThemeColor.setAttribute('content', colors[colorScheme]);
    }
  }, [theme, colorScheme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, toggleTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};