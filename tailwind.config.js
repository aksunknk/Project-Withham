/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./withham/templates/**/*.html",
    "./withham/static/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#f2800d',
        'secondary': '#9c7349',
        'background': '#f4ede7',
        'text': '#1c140d',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
} 