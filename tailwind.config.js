/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['Heebo', 'Frank Ruhl Libre', 'serif'],
        serif: ['Frank Ruhl Libre', 'serif'],
      },
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          500: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#1e2a5e',
        },
        cream: {
          50:  '#fefdf8',
          100: '#fdf8ed',
          200: '#faf0d7',
          300: '#f3e0b5',
        },
      },
    },
  },
  plugins: [],
}
