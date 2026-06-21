/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        lg: "2rem",
      },
    },
    extend: {
      fontFamily: {
        display: ['Oswald', 'Noto Sans SC', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#FF6B1A',
          'orange-hover': '#FF823A',
          'orange-dark': '#E05A0F',
          steel: '#1A1D23',
          'steel-light': '#242832',
          'steel-lighter': '#2F3440',
          gray: '#8A8F98',
        },
        status: {
          safe: '#10B981',
          'safe-dark': '#059669',
          warning: '#F59E0B',
          'warning-dark': '#D97706',
          danger: '#EF4444',
          'danger-dark': '#DC2626',
          info: '#3B82F6',
          'info-dark': '#2563EB',
        },
      },
      boxShadow: {
        'industrial': '0 2px 0 0 rgba(0,0,0,0.15), 0 4px 12px -2px rgba(0,0,0,0.25)',
        'industrial-lg': '0 4px 0 0 rgba(0,0,0,0.15), 0 8px 24px -4px rgba(0,0,0,0.3)',
        'glow-orange': '0 0 20px rgba(255,107,26,0.35)',
        'glow-green': '0 0 20px rgba(16,185,129,0.35)',
        'glow-red': '0 0 20px rgba(239,68,68,0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'number-pop': 'number-pop 0.6s ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'number-pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
