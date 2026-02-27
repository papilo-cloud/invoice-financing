/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      colors: {
        // Binance-inspired color palette
        primary: {
          50: '#fef9e7',
          100: '#fdf2c8',
          200: '#fbe58a',
          300: '#f9d44c',
          400: '#f7c520',
          500: '#F0B90B',
          600: '#d49d08',
          700: '#b07a09',
          800: '#8f5f0f',
          900: '#784e10',
        },
        accent: {
          50: '#fef9e7',
          100: '#fdf2c8',
          200: '#fbe58a',
          300: '#f9d44c',
          400: '#f7c520',
          500: '#FCD535',
          600: '#e0b91d',
          700: '#c39a13',
          800: '#9d7914',
          900: '#806217',
        },
        dark: {
          50: '#f6f6f7',
          100: '#e1e3e5',
          200: '#c3c6cc',
          300: '#9ea3ad',
          400: '#767c8b',
          500: '#5e6370',
          600: '#4a4d58',
          700: '#3d3f47',
          800: '#2B2F36', 
          900: '#1E2329',
          950: '#0B0E11', 
        },
      },
      backgroundImage: {
        'none': 'none',
      },
    },
  },
  plugins: [],
}