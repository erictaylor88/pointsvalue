import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core palette — light mode defaults, dark overrides via CSS vars
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          'surface-elevated': 'var(--bg-surface-elevated)',
          subtle: 'var(--bg-subtle)',
          muted: 'var(--bg-muted)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
        },
        // Primary accent — indigo
        accent: {
          primary: '#4338CA',
          'primary-hover': '#3730A3',
          'primary-light': '#EEF2FF',
          'primary-subtle': '#C7D2FE',
        },
        // Deal quality semantic colors
        deal: {
          great: '#059669',
          'great-bg': '#ECFDF5',
          fair: '#D97706',
          'fair-bg': '#FFFBEB',
          below: '#64748B',
          'below-bg': '#F1F5F9',
          negative: '#DC2626',
          'negative-bg': '#FEF2F2',
        },
        // Airline program colors
        airline: {
          united: '#002244',
          aeroplan: '#00613B',
          delta: '#003A70',
          alaska: '#01426A',
          'virgin-atlantic': '#E01A22',
          'flying-blue': '#002F5F',
          emirates: '#D71921',
          singapore: '#F7C846',
          american: '#0078D2',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        heading: ['Satoshi', '"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display': ['40px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-sm': ['32px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'h1': ['28px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'h2': ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'h3': ['17px', { lineHeight: '1.4', letterSpacing: '0' }],
        'body': ['15px', { lineHeight: '1.6', letterSpacing: '0' }],
        'body-medium': ['15px', { lineHeight: '1.6', letterSpacing: '0' }],
        'label': ['13px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'overline': ['11px', { lineHeight: '1.3', letterSpacing: '0.08em' }],
        'data-hero': ['36px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'data': ['20px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'data-sm': ['15px', { lineHeight: '1.3', letterSpacing: '0' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'chip': '10px',
        'badge': '8px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.08)',
        'search': '0 4px 20px rgba(0,0,0,0.06)',
        'button-accent': '0 2px 8px rgba(67, 56, 202, 0.3)',
      },
      maxWidth: {
        'content': '1200px',
        'search': '880px',
        'prose': '680px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'decel': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
