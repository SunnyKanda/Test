/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#242435',
        },
        accent: {
          DEFAULT: '#6d5dfc',
          hover: '#8577fd',
          dim: '#4a3db8',
        },
      },
    },
  },
  plugins: [],
};
