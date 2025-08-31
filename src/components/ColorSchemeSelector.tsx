import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Check, Sun, Moon } from 'lucide-react';

const ColorSchemeSelector: React.FC = () => {
  const { theme, colorScheme, toggleTheme, setColorScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  const colorSchemes = [
    { 
      name: 'electric-violet', 
      label: 'Electric Violet', 
      colors: ['#7C3AED', '#3B82F6'],
      description: 'Purple & blue harmony'
    },
    { 
      name: 'ocean-mint', 
      label: 'Ocean Mint', 
      colors: ['#0369A1', '#059669'],
      description: 'Deep ocean & fresh mint'
    },
    { 
      name: 'ruby-amethyst', 
      label: 'Ruby Amethyst', 
      colors: ['#C51E3A', '#A855F7'],
      description: 'Passionate red & royal purple'
    },
    { 
      name: 'lilo-stitch', 
      label: 'Lilo & Stitch', 
      colors: ['#2563EB', '#E8809A'],
      description: 'Stitch blue & Lilo pink'
    },
  ] as const;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  const handleSchemeChange = (scheme: typeof colorScheme) => {
    setColorScheme(scheme);
    setIsOpen(false);
  };

  const dropdown = isOpen ? (
    <div 
      className="fixed inset-0 z-[99999]" 
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[320px] animate-slide-in"
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          zIndex: 99999
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
          Appearance Settings
        </div>
        
        {/* Theme Toggle Section */}
        <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Theme
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (theme === 'dark') toggleTheme();
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-200 dark:border-primary-700'
                  : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <Sun size={16} />
              <span className="text-sm font-medium">Light</span>
              {theme === 'light' && <Check size={14} className="text-primary-600 dark:text-primary-400" />}
            </button>
            <button
              onClick={() => {
                if (theme === 'light') toggleTheme();
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-200 dark:border-primary-700'
                  : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
              }`}
            >
              <Moon size={16} />
              <span className="text-sm font-medium">Dark</span>
              {theme === 'dark' && <Check size={14} className="text-primary-600 dark:text-primary-400" />}
            </button>
          </div>
        </div>
        
        {/* Color Schemes Section */}
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Color Schemes
          </div>
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.name}
              onClick={() => handleSchemeChange(scheme.name)}
              className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 flex items-center gap-3"
            >
              <div className="flex gap-1">
                {scheme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {scheme.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {scheme.description}
                </div>
              </div>
              {colorScheme === scheme.name && (
                <Check size={16} className="text-primary-600 dark:text-primary-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
        title="Appearance settings"
      >
        <Palette size={20} />
      </button>
      
      {dropdown && createPortal(dropdown, document.body)}
    </>
  );
};

export default ColorSchemeSelector;