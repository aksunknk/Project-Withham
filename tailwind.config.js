/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./withham/templates/**/*.html",
    "./withham/static/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        background: '#F4EDE7',
        text: '#2C3E50',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans JP"', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
} 