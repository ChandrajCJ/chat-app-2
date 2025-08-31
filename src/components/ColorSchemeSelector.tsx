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
          zIndex: 99999,
          backgroundColor: 'white',
          borderColor: 'var(--primary-200)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider border-b"
             style={{ 
               color: 'var(--primary-600)',
               borderBottomColor: 'var(--primary-200)'
             }}>
          Appearance Settings
        </div>
        
        {/* Theme Toggle Section */}
        <div className="px-3 py-3 border-b" style={{ borderBottomColor: 'var(--primary-200)' }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-2"
               style={{ color: 'var(--primary-600)' }}>
            Theme
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (theme === 'dark') toggleTheme();
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                theme === 'light'
                  ? 'border-2'
                  : 'border-2 border-transparent'
              }`}
              style={{
                backgroundColor: theme === 'light' ? 'var(--primary-100)' : 'var(--primary-50)',
                color: theme === 'light' ? 'var(--primary-700)' : 'var(--primary-600)',
                borderColor: theme === 'light' ? 'var(--primary-300)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (theme !== 'light') {
                  e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                  e.currentTarget.style.color = 'var(--primary-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== 'light') {
                  e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                  e.currentTarget.style.color = 'var(--primary-600)';
                }
              }}
            >
              <Sun size={16} />
              <span className="text-sm font-medium">Light</span>
              {theme === 'light' && <Check size={14} style={{ color: 'var(--primary-600)' }} />}
            </button>
            <button
              onClick={() => {
                if (theme === 'light') toggleTheme();
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                theme === 'dark'
                  ? 'border-2'
                  : 'border-2 border-transparent'
              }`}
              style={{
                backgroundColor: theme === 'dark' ? 'var(--primary-100)' : 'var(--primary-50)',
                color: theme === 'dark' ? 'var(--primary-700)' : 'var(--primary-600)',
                borderColor: theme === 'dark' ? 'var(--primary-300)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (theme !== 'dark') {
                  e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                  e.currentTarget.style.color = 'var(--primary-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== 'dark') {
                  e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                  e.currentTarget.style.color = 'var(--primary-600)';
                }
              }}
            >
              <Moon size={16} />
              <span className="text-sm font-medium">Dark</span>
              {theme === 'dark' && <Check size={14} style={{ color: 'var(--primary-600)' }} />}
            </button>
          </div>
        </div>
        
        {/* Color Schemes Section */}
        <div className="px-3 py-2">
          <div className="text-xs font-medium uppercase tracking-wider mb-2"
               style={{ color: 'var(--primary-600)' }}>
            Color Schemes
          </div>
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.name}
              onClick={() => handleSchemeChange(scheme.name)}
              className="w-full px-3 py-3 text-left transition-colors duration-200 flex items-center gap-3 rounded-lg"
              style={{
                backgroundColor: colorScheme === scheme.name ? 'var(--primary-100)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (colorScheme !== scheme.name) {
                  e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colorScheme === scheme.name ? 'var(--primary-100)' : 'transparent';
              }}
            >
              <div className="flex gap-1">
                {scheme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border"
                    style={{ 
                      backgroundColor: color,
                      borderColor: 'var(--primary-300)'
                    }}
                  />
                ))}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: 'var(--primary-800)' }}>
                  {scheme.label}
                </div>
                <div className="text-xs" style={{ color: 'var(--primary-600)' }}>
                  {scheme.description}
                </div>
              </div>
              {colorScheme === scheme.name && (
                <Check size={16} style={{ color: 'var(--primary-600)' }} />
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
        className="p-2 transition-colors duration-200 rounded-lg"
        style={{ color: 'var(--primary-600)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--primary-800)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--primary-600)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Appearance settings"
      >
        <Palette size={20} />
      </button>
      
      {dropdown && createPortal(dropdown, document.body)}
    </>
  );
};

export default ColorSchemeSelector;