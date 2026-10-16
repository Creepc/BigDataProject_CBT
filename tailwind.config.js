/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR Variable', 'Pretendard Variable', 'system-ui', 'sans-serif'],
        display: ['Noto Sans KR Variable', 'Pretendard Variable', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#17212b',
        paper: '#f6f4ef',
        cobalt: '#3159d8',
        mint: '#31b58b',
        amber: '#ee9d35',
      },
      boxShadow: {
        soft: '0 18px 55px -28px rgba(22, 33, 43, 0.28)',
      },
      keyframes: {
        enter: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { enter: 'enter .28s ease-out both' },
    },
  },
  plugins: [],
}
