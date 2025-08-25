import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Check } from 'lucide-react';

const ColorSchemeSelector: React.FC = () => {
  const { colorScheme, setColorScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  const colorSchemes = [
    { 
      name: 'classic-calm', 
      label: 'Classic Calm', 
      colors: ['#3A4A6B', '#2F3A4F'],
      description: 'WhatsApp-style green & white'
    },
    { 
      name: 'cool-blue', 
      label: 'Cool Blue & Gray', 
      colors: ['#3C5A4C', '#2E3F35'],
      description: 'Professional blue & gray'
    },
    { 
      name: 'vibrant-violet', 
      label: 'Vibrant Violet & Teal', 
      colors: ['#7C4DFF', '#26A69A'],
      description: 'Bold violet & teal contrast'
    },
    { 
      name: 'muted-pastels', 
      label: 'Muted Pastels', 
      colors: ['#FFECB3', '#B3E5FC'],
      description: 'Soft amber & blue pastels'
    },
    { 
      name: 'minimal-dark', 
      label: 'Minimal Dark-Neutral', 
      colors: ['#5865F2', '#E3E5E8'],
      description: 'Discord-style purple & gray'
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
        className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[280px] animate-slide-in"
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          zIndex: 99999
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
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
              <Check size={16} className="text-green-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
        title="Change color scheme"
      >
        <Palette size={20} />
      </button>
      
      {dropdown && createPortal(dropdown, document.body)}
    </>
  );
};

export default ColorSchemeSelector;