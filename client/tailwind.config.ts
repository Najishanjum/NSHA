import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ─── NSHA Design System Colors ─── */
        'nsha-yellow': '#FFD21C',
        'nsha-yellow-soft': '#FFE28A',
        'nsha-surface': '#FAF8F3',
        'nsha-black': '#090909',
        'nsha-text': '#090909',
        'nsha-text-secondary': '#555555',
        'nsha-pink': '#FF3D83',
        'nsha-purple': '#7557F7',
        'nsha-green': '#35D04F',
        'nsha-lime': '#B7E83B',
        'nsha-border': '#090909',

        /* ─── Semantic aliases (backward compat) ─── */
        background: '#FAF8F3',
        foreground: '#090909',
        card: {
          DEFAULT: '#FAF8F3',
          foreground: '#090909',
        },
        primary: {
          DEFAULT: '#FFD21C',
          foreground: '#090909',
        },
        secondary: {
          DEFAULT: '#7557F7',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F0EDE6',
          foreground: '#555555',
        },
        accent: {
          DEFAULT: '#FF3D83',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        border: '#090909',
        input: '#FAF8F3',
        ring: '#FFD21C',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'nsha-card': '20px',
        'nsha-btn': '14px',
        'nsha-input': '14px',
        'nsha-badge': '10px',
        lg: '0.75rem',
        md: '0.625rem',
        sm: '0.5rem',
      },
      boxShadow: {
        'nsha': '7px 7px 0 #090909',
        'nsha-sm': '5px 5px 0 #090909',
        'nsha-hover': '9px 9px 0 #090909',
        'nsha-active': '0 0 0 #090909',
        'nsha-btn': '5px 5px 0 #090909',
        'nsha-btn-hover': '3px 3px 0 #090909',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
