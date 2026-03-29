import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        sidebar: '#F7F6F3',
        border: '#E8E8E8',
        'text-primary': '#37352F',
        'text-secondary': '#787774',
        accent: '#2383E2',
        success: '#3DAF4B',
        warning: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xl': ['24px', { lineHeight: '1.3' }],
        xl: ['20px', { lineHeight: '1.35' }],
        lg: ['16px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.6' }],
        xs: ['12px', { lineHeight: '1.5' }],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
