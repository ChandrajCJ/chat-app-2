import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorScheme = 'electric-violet' | 'ocean-mint';

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
    return saved || 'electric-violet';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorScheme', colorScheme);
    
    // Update document class for theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // Update document class for color scheme
    document.documentElement.classList.remove('electric-violet', 'ocean-mint');
    document.documentElement.classList.add(colorScheme);
    
    // Update meta theme-color based on theme and color scheme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors = {
        'electric-violet': theme === 'dark' ? '#1E1B4B' : '#7C3AED',
        'ocean-mint': theme === 'dark' ? '#0C4A6E' : '#0369A1'
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