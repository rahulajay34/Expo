import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        sidebar: 'var(--sidebar)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        'card-bg': 'var(--card-bg)',
        'surface-1': 'var(--surface-1, var(--card-bg))',
        'surface-2': 'var(--surface-2, var(--card-bg))',
      },
      fontFamily: {
        sans: ['var(--font-custom)', 'var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
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
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0px) translateX(-12px)' },
          '50%': { transform: 'translateY(-6px) translateX(-12px)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0px) translateX(12px)' },
          '50%': { transform: 'translateY(-10px) translateX(12px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'float-slow': 'float-slow 3s ease-in-out infinite',
        'float-medium': 'float-medium 2.5s ease-in-out infinite 0.5s',
        'float-fast': 'float-fast 3.5s ease-in-out infinite 1s',
      },
    },
  },
  plugins: [],
};

export default config;
