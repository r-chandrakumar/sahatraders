/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6faf0',
          100: '#ccf5e1',
          200: '#99ebc3',
          300: '#66e0a5',
          400: '#33d687',
          500: '#08cd57',
          600: '#07b84e',
          700: '#06a345',
          800: '#058e3c',
          900: '#047933',
          950: '#02401b',
        },
        secondary: {
          50: '#fdfdf6',
          100: '#fbfbed',
          200: '#f5f3d8',
          300: '#efebc3',
          400: '#e9e3ae',
          500: '#e5dc9b',
          600: '#d4c86c',
          700: '#c3b43d',
          800: '#9a8e30',
          900: '#716823',
          950: '#3d3813',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
