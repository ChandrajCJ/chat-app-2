import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Check } from 'lucide-react';

const ColorSchemeSelector: React.FC = () => {
  const { colorScheme, setColorScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const colorSchemes = [
    { 
      name: 'violet', 
      label: 'Violet', 
      colors: ['#8b5cf6', '#3b82f6'],
      description: 'Classic purple & blue'
    },
    { 
      name: 'blue', 
      label: 'Blue', 
      colors: ['#3b82f6', '#0ea5e9'],
      description: 'Ocean blues'
    },
    { 
      name: 'emerald', 
      label: 'Emerald', 
      colors: ['#10b981', '#22c55e'],
      description: 'Fresh greens'
    },
    { 
      name: 'rose', 
      label: 'Rose', 
      colors: ['#f43f5e', '#ec4899'],
      description: 'Warm pinks'
    },
    { 
      name: 'amber', 
      label: 'Amber', 
      colors: ['#f59e0b', '#eab308'],
      description: 'Golden yellows'
    },
    { 
      name: 'indigo', 
      label: 'Indigo', 
      colors: ['#6366f1', '#64748b'],
      description: 'Deep indigo & slate'
    },
  ] as const;

  const handleSchemeChange = (scheme: typeof colorScheme) => {
    setColorScheme(scheme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-200"
        title="Change color scheme"
      >
        <Palette size={20} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[240px] z-20 animate-slide-in">
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
                  <Check size={16} className="text-primary-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ColorSchemeSelector;