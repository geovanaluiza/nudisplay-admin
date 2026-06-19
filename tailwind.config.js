/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Northwest University brand tokens (locked palette)
        'nu-blue':       '#0068bb',
        'nu-alt':        '#148dcd',
        'nu-sky':        '#95c5ea',
        'nu-skylight':   '#b4d4f0',
        'nu-powder':     '#eaf4fb',
        'nu-navy':       '#034C87',
        'nu-midnight':   '#00263d',
        'nu-evergreen':  '#04505c',
        'nu-leaf':       '#44ba82',
        'nu-gold':       '#85754e',
        'nu-tour':       '#fbd945',
        'nu-amber':      '#ffbc2d',
        'nu-cloud':      '#f1f2f2',
        'nu-wisp':       '#f9f9f9',
      },
      fontFamily: {
        serif: ['"Times New Roman"', '"Times"', '"Tinos"', 'serif'],
        sans:  ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
                '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 12px 36px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'gold-glow': '0 0 0 1px rgba(251, 217, 69, 0.45), 0 8px 24px rgba(251, 217, 69, 0.18)',
      },
      backdropBlur: {
        'glass': '14px',
      },
      borderRadius: {
        'glass': '22px',
      },
      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
