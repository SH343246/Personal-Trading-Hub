const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          25: '#fcfcfd',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        violet: { //remove??
          400: '#8b5cf6',
          500: '#7c3aed',
        },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(16,24,40,.05)',
        sm: '0 1px 3px rgba(16,24,40,.10), 0 1px 2px rgba(16,24,40,.06)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    plugin(({ addVariant }) => {
      addVariant('sidebar-expanded', '.sidebar-expanded &')
    }),
    require('daisyui'),
  ],

  daisyui: {
    themes: [
      {
        hub: {
          primary: '#3b82f6',
          secondary: '#22c55e',
          accent: '#a78bfa',
          neutral: '#1f2937',
          'base-100': '#f3f4f6',
          'base-200': '#eef0f3',
          'base-300': '#e5e7eb',
          info: '#38bdf8',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      'light',
    ],
    darkTheme: 'hub',
  },
}
