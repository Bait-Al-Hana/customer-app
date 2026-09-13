/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          magenta: '#E5178B',
          orange: '#F47C20',
          blue: '#2E63A6',
        },
        bah: {
          bg: '#FCF7FA',
          surface: '#FFFFFF',
          'surface-alt': '#F6EEF3',
          border: '#EBDCE5',
          text: '#1E1A1C',
          muted: '#6E6167',
          success: '#2E9E5B',
          danger: '#D6453B',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
