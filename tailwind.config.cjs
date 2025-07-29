/** @type {import('tailwindcss').Config} */
const path = require('path');
module.exports = {
  content: [path.join(__dirname, './packages/renderer/src/**/*.{html,js,ejs,tsx,jsx,ts}')],
  tailwindcss: { preflight: false },
  theme: {
    extend: {},
  },
  plugins: [],
};
