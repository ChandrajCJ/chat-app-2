/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Enhanced gray scale for better theming
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#9aa0a6',
          500: '#5f6368',
          600: '#3c4043',
          700: '#202124',
          800: '#1a1a1a',
          900: '#0d1117',
          950: '#010409',
        },
        // Primary color schemes
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
        },
        secondary: {
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
          700: 'var(--secondary-700)',
          800: 'var(--secondary-800)',
          900: 'var(--secondary-900)',
          950: 'var(--secondary-950)',
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        slideIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
    function({ addBase }) {
      addBase({
        ':root': {
          // Classic Calm - Default
          '--primary-500': '#DCF8C6',
          '--primary-text': '#000000',
          '--secondary-500': '#FFFFFF',
          '--secondary-border': '#E0E0E0',
          '--secondary-text': '#000000',
        },
        '.dark': {
          '--secondary-500': '#2C2C2C',
          '--secondary-border': '#555555',
          '--secondary-text': '#FFFFFF',
        },
        '.classic-calm': {
          '--primary-500': '#DCF8C6',
          '--primary-text': '#000000',
          '--secondary-500': '#FFFFFF',
          '--secondary-border': '#E0E0E0',
          '--secondary-text': '#000000',
        },
        '.dark.classic-calm': {
          '--secondary-500': '#2C2C2C',
          '--secondary-border': '#555555',
          '--secondary-text': '#FFFFFF',
        },
        '.cool-blue': {
          '--primary-500': '#1E88E5',
          '--primary-text': '#FFFFFF',
          '--secondary-500': '#F1F3F4',
          '--secondary-border': '#E0E0E0',
          '--secondary-text': '#000000',
        },
        '.dark.cool-blue': {
          '--secondary-500': '#2E2E2E',
          '--secondary-border': '#555555',
          '--secondary-text': '#FFFFFF',
        },
        '.vibrant-violet': {
          '--primary-500': '#7C4DFF',
          '--primary-text': '#FFFFFF',
          '--secondary-500': '#26A69A',
          '--secondary-border': '#26A69A',
          '--secondary-text': '#FFFFFF',
        },
        '.dark.vibrant-violet': {
          '--secondary-500': '#1F8A85',
          '--secondary-border': '#1F8A85',
          '--secondary-text': '#FFFFFF',
        },
        '.muted-pastels': {
          '--primary-500': '#FFECB3',
          '--primary-text': '#000000',
          '--secondary-500': '#B3E5FC',
          '--secondary-border': '#B3E5FC',
          '--secondary-text': '#000000',
        },
        '.dark.muted-pastels': {
          '--primary-500': '#FFB74D',
          '--primary-text': '#000000',
          '--secondary-500': '#4FC3F7',
          '--secondary-border': '#4FC3F7',
          '--secondary-text': '#000000',
        },
        '.minimal-dark': {
          '--primary-500': '#5865F2',
          '--primary-text': '#FFFFFF',
          '--secondary-500': '#E3E5E8',
          '--secondary-border': '#E0E0E0',
          '--secondary-text': '#000000',
        },
        '.dark.minimal-dark': {
          '--secondary-500': '#4F545C',
          '--secondary-border': '#555555',
          '--secondary-text': '#FFFFFF',
        },
      });
    },
  ],
};