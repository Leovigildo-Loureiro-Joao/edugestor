export default {
  darkMode:"class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'dark',
    'bg-white',
    'dark:bg-gray-800',
    'text-gray-900',
    'dark:text-white',
    'bg-gray-50',
    'dark:bg-gray-900',

    // Cores para bordas
    'border-red-500', 'border-blue-500', 'border-green-500', 'border-yellow-500', 'border-purple-500',
    // Cores para background
    'bg-red-50', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50',
    'dark:bg-red-900/30', 'dark:bg-blue-900/30', 'dark:bg-green-900/30', 'dark:bg-yellow-900/30', 'dark:bg-purple-900/30',
    // Cores para texto
    'text-red-600', 'text-blue-600', 'text-green-600', 'text-yellow-600', 'text-purple-600',
    'dark:text-red-400', 'dark:text-blue-400', 'dark:text-green-400', 'dark:text-yellow-400', 'dark:text-purple-400',
    // Sombras
    'shadow-red-500/20', 'shadow-blue-500/20', 'shadow-green-500/20', 'shadow-yellow-500/20', 'shadow-purple-500/20'
  ],
  
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce 1s infinite',
      }
      
    },
  },
  plugins: [],
}
