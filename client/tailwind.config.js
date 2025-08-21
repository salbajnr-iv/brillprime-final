
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brill-primary': '#4682b4',
        'brill-secondary': '#0b1a51',
        'brill-active': '#010e42',
        'brill-text': '#131313',
        'brill-text-light': '#6b7280',
        'brill-white': '#ffffff',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
