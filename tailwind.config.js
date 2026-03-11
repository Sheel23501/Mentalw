/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
      },
      colors: {
        primary: {
          900: '#486102',
          800: '#5d7a13',
          700: '#729324',
          600: '#87ac35',
          500: '#9cc546',
          400: '#b1de57',
          300: '#c6f768',
          200: '#dbff79', 
          100: '#e6f8cc',
          50: '#f0f9e6',
        },
        secondary: {
          900: '#f07c51',
          800: '#f28d6a',
          700: '#f49e83',
          600: '#f6af9c',
          500: '#f8c0b5',
          400: '#fac1be',
          300: '#fcc2c7',
          200: '#fec3d0',
          100: '#ffe4e6',
          50: '#fff6f6',
        },
        tertiary: {
          900: '#f7d287',
          800: '#f8da9c',
          700: '#fae2b1',
          600: '#fbeac6',
          500: '#fcf2db',
          400: '#fdfae6',
          300: '#fefaf0',
          200: '#fffbe6',
          100: '#fffce6',
          50: '#fffdf0',
        },
        dark: {
          900: '#071d21',
          800: '#233a44',
          700: '#3e5767',
          600: '#59748a',
          500: '#7491ad',
          400: '#8faed0',
          300: '#aacbf3',
          200: '#c5e8ff',
          100: '#e0f5ff',
          50: '#f0f9fa',
        },
      },
    },
  },
  plugins: [],
}