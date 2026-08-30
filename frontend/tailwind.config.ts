import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All colors reference CSS custom properties so dark/light themes work via class toggle
        background:          'hsl(var(--background) / <alpha-value>)',
        foreground:          'hsl(var(--foreground) / <alpha-value>)',
        card:                'hsl(var(--card) / <alpha-value>)',
        'card-foreground':   'hsl(var(--card-foreground) / <alpha-value>)',
        muted:               'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground':  'hsl(var(--muted-foreground) / <alpha-value>)',
        accent:              'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        primary:             'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground':'hsl(var(--primary-foreground) / <alpha-value>)',
        secondary:           'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground':'hsl(var(--secondary-foreground) / <alpha-value>)',
        destructive:         'hsl(var(--destructive) / <alpha-value>)',
        'destructive-foreground':'hsl(var(--destructive-foreground) / <alpha-value>)',
        border:              'hsl(var(--border) / <alpha-value>)',
        input:               'hsl(var(--input) / <alpha-value>)',
        ring:                'hsl(var(--ring) / <alpha-value>)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(220 90% 56%) 0%, hsl(270 100% 65%) 100%)',
        'gradient-dark':    'linear-gradient(135deg, hsl(240 10% 15%) 0%, hsl(270 30% 20%) 100%)',
        'glow-purple':      'radial-gradient(circle, hsl(270 100% 65% / 0.2) 0%, transparent 70%)',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        glow:    '0 0 20px hsl(270 100% 65% / 0.3)',
        'glow-lg':'0 0 40px hsl(270 100% 65% / 0.4)',
      },
      backdropBlur: {
        glass: '10px',
      },
      animation: {
        'fade-in':   'fadeIn 0.5s ease-in-out',
        'slide-up':  'slideUp 0.5s ease-out',
        'glow-pulse':'glowPulse 2s ease-in-out infinite',
        'float':     'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glowPulse: { '0%, 100%': { boxShadow: '0 0 20px hsl(270 100% 65% / 0.3)' }, '50%': { boxShadow: '0 0 30px hsl(270 100% 65% / 0.6)' } },
        float:     { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      borderRadius: {
        lg: 'calc(var(--radius, 12px))',
      },
    },
  },
  plugins: [tailwindcssAnimate]
} satisfies Config;

export default config;
