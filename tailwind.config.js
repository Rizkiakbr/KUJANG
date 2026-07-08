/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0D2E5C',
          dark:    '#081D3A',
          light:   '#185FA5',
        },
        teal: {
          DEFAULT: '#1D9E75',
          light:   '#6DD9BC',
          dark:    '#065F46',
        },
        gold: {
          DEFAULT: '#EF9F27',
          dark:    '#92400E',
        },
        danger: {
          DEFAULT: '#E24B4A',
          dark:    '#991B1B',
        },
        kblue: {
          DEFAULT: '#185FA5',
          light:   '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Arial', 'sans-serif'],
        mono: ['"Courier New"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.12)',
        panel:  '0 0 40px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
