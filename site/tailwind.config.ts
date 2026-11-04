import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f5f5',
        surface: '#ffffff',
        fill: '#e9e8ea',
        track: '#d4d4d4',
        side: '#f2f2f4',
        'k-line': 'rgba(0, 0, 0, 0.08)',
        ink: {
          DEFAULT: '#000000',
          muted: 'rgba(0, 0, 0, 0.64)',
          dim: 'rgba(0, 0, 0, 0.44)',
          subtle: 'rgba(0, 0, 0, 0.28)',
        },
        sel: '#0a84ff',
        folder: '#5bb0ff',
        play: '#ffd23f',
        gold: {
          DEFAULT: '#FFAA00',
          soft: 'rgba(255, 170, 0, 0.15)',
        },
        dark: {
          surface: '#15161d',
          bg: '#0c0d12',
          border: 'rgba(255, 255, 255, 0.08)',
          card: '#1c1d25',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      boxShadow: {
        hairline: '0 0 0 1px rgba(0, 0, 0, 0.08)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        elevated: '0 12px 36px -4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        pill: '0 8px 24px -2px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        pill: '9999px',
        card: '18px',
      }
    },
  },
  plugins: [],
};

export default config;
