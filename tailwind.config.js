/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#090a0e',
        surface: {
          DEFAULT: '#12141c',
          elevated: '#191c27',
          hover: '#1e2230',
        },
        borderToken: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.05)',
          strong: 'rgba(255, 255, 255, 0.14)',
        },
        textToken: {
          primary: '#f3f4f6',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
        ink: {
          950: '#090a0e',
          900: '#0f1117',
          800: '#161922',
          700: '#1f2430',
          600: '#2a3040',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          pressed: '#4338ca',
          soft: '#818cf8',
          cyan: '#38bdf8',
        },
        mood: {
          joy: '#f59e0b',
          calm: '#38bdf8',
          love: '#f43f5e',
          sad: '#6366f1',
          awe: '#a855f7',
          neutral: '#9ca3af',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'glass-lg': '0 10px 30px -4px rgba(0, 0, 0, 0.6)',
        glow: 'none',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'accent-gradient': '#6366f1',
        'glass-sheen': 'transparent',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
