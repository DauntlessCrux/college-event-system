/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10172A',
        bg: '#F5F6FA',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#1B2A57',
          light: '#2F4380',
          dark: '#0F1B3D',
        },
        accent: {
          DEFAULT: '#F2A93B',
          dark: '#D9901F',
        },
        success: '#16A34A',
        danger: '#DC2626',
        muted: '#64748B',
        line: '#E2E5EE',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
