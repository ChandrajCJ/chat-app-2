import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorScheme = 'classic-calm' | 'cool-blue' | 'vibrant-violet' | 'muted-pastels' | 'minimal-dark';

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
    return saved || 'classic-calm';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorScheme', colorScheme);
    
    // Update document class for theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // Update document class for color scheme
    document.documentElement.classList.remove('classic-calm', 'cool-blue', 'vibrant-violet', 'muted-pastels', 'minimal-dark');
    document.documentElement.classList.add(colorScheme);
    
    // Update meta theme-color based on theme and color scheme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors = {
        'classic-calm': theme === 'dark' ? '#2C2C2C' : '#DCF8C6',
        'cool-blue': theme === 'dark' ? '#2E2E2E' : '#1E88E5',
        'vibrant-violet': theme === 'dark' ? '#1F8A85' : '#7C4DFF',
        'muted-pastels': theme === 'dark' ? '#4FC3F7' : '#FFECB3',
        'minimal-dark': theme === 'dark' ? '#4F545C' : '#5865F2'
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