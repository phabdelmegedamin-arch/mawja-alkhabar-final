import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0D1117',
          2:       '#161B22',
          3:       '#1C2128',
          4:       '#21262D',
        },
        b: {
          1: '#30363D',
          2: '#3D444D',
          3: '#484F58',
        },
        tx: {
          DEFAULT: '#E6EDF3',
          2:       '#8B949E',
          3:       '#484F58',
        },
        ac:  '#00E5FF',
        gr:  '#00D47A',
        rd:  '#FF3355',
        yl:  '#F0C93A',
        or:  '#FF7A1A',
        pu:  '#9B6EFF',
      },

      fontFamily: {
        sans:  ['Tajawal', 'Cairo', 'ui-sans-serif', 'system-ui'],
        mono:  ['IBM Plex Mono', 'JetBrains Mono', 'ui-monospace'],
        latin: ['Inter', 'ui-sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs:    ['0.7rem',   { lineHeight: '1rem'     }],
        sm:    ['0.78rem',  { lineHeight: '1.25rem'  }],
        base:  ['0.875rem', { lineHeight: '1.5rem'   }],
        lg:    ['1rem',     { lineHeight: '1.5rem'   }],
        xl:    ['1.125rem', { lineHeight: '1.75rem'  }],
      },

      borderRadius: {
        sm:    '6px',
        md:    '8px',
        lg:    '12px',
        xl:    '16px',
        '2xl': '20px',
      },

      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(48,54,61,0.6)',
        'panel':   '0 4px 16px rgba(0,0,0,0.5)',
        'glow':    '0 0 20px rgba(0,229,255,0.15)',
        'glow-gr': '0 0 20px rgba(0,212,122,0.15)',
        'glow-rd': '0 0 20px rgba(255,51,85,0.15)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1'   },
          '50%':      { opacity: '0.3' },
        },
        ticker: {
          from: { transform: 'translateX(0)'    },
          to:   { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-dot':'pulse-dot 1.5s ease-in-out infinite',
        'ticker':   'ticker 30s linear infinite',
        shimmer:    'shimmer 1.5s infinite linear',
      },

      gridTemplateColumns: {
        'analysis': 'repeat(3, 1fr)',
        'admin':    '220px 1fr',
        'cards':    'repeat(auto-fill, minmax(280px, 1fr))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
