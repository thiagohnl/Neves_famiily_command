/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Board home layout only (index.html loads them); the other tabs keep the system font
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Set per season on <html> by applySeasonPalette; fallbacks live in index.css
        season: {
          bg: 'var(--season-bg)',
          surface: 'var(--season-surface)',
          accent: 'var(--season-accent)',
          'accent-text': 'var(--season-accent-text)',
          button: 'var(--season-button)',
          gold: 'var(--season-gold)',
        },
      },
    },
  },
  plugins: [],
};
