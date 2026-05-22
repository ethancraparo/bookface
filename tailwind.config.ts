import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds — driven by CSS variables (theme-aware)
        base:     'rgb(var(--bg))',
        surface:  'rgb(var(--bg-surface))',
        elevated: 'rgb(var(--bg-elevated))',
        // white = foreground color, switches dark↔light automatically
        // All text-white/XX and bg-white/XX variants inherit the theme
        white:    'rgb(var(--fg) / <alpha-value>)',
        // Borders
        border: 'rgb(var(--fg) / 0.12)',
        // Text
        'text-primary':   'rgb(var(--fg))',
        'text-muted':     '#98989f',
        'text-dim':       '#48484a',
        // Accents — Apple system palette
        green: {
          DEFAULT: '#30d158',
          dim:     '#25a244',
          glow:    '#30d15820',
        },
        blue: {
          DEFAULT: '#f5f5f7',
          dim:     '#98989f',
          glow:    'rgba(255,255,255,0.08)',
        },
        cyan: {
          DEFAULT: '#32ade6',
          dim:     '#1e8cbf',
        },
        purple: {
          DEFAULT: '#bf5af2',
          dim:     '#9d3ed4',
        },
        danger: '#ff453a',
        yellow: {
          DEFAULT: '#ffd60a',
          500: '#ffd60a',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        blink:        'blink 1s step-end infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        spin:         'spin 1.2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0)   scale(1)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%':       { opacity: '1' },
        },
      },
      boxShadow: {
        'glass':      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-lg':   '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)',
        'green-glow': '0 0 30px rgba(48,209,88,0.25)',
        'blue-glow':  '0 0 30px rgba(255,255,255,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
