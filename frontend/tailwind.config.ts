import type { Config } from 'tailwindcss';

const config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme - TrebleAI music learning platform
        background: 'hsl(240 10% 8%)', // Deep dark navy
        foreground: 'hsl(0 0% 98%)', // Almost white
        card: 'hsl(240 10% 15%)', // Dark card background
        'card-foreground': 'hsl(0 0% 98%)',
        muted: 'hsl(240 10% 35%)', // Muted text
        'muted-foreground': 'hsl(0 0% 70%)',
        accent: 'hsl(270 100% 65%)', // Bright purple accent
        'accent-foreground': 'hsl(0 0% 98%)',
        primary: 'hsl(220 90% 56%)', // Vibrant blue
        'primary-foreground': 'hsl(0 0% 98%)',
        secondary: 'hsl(270 80% 60%)', // Purple
        'secondary-foreground': 'hsl(0 0% 98%)',
        destructive: 'hsl(0 84% 60%)',
        'destructive-foreground': 'hsl(0 0% 98%)',
        border: 'hsl(240 10% 25%)',
        input: 'hsl(240 10% 20%)',
        ring: 'hsl(270 100% 65%)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(220 90% 56%) 0%, hsl(270 100% 65%) 100%)',
        'gradient-dark': 'linear-gradient(135deg, hsl(240 10% 15%) 0%, hsl(270 30% 20%) 100%)',
        'glow-purple': 'radial-gradient(circle, hsl(270 100% 65% / 0.2) 0%, transparent 70%)',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px hsl(270 100% 65% / 0.3)',
        'glow-lg': '0 0 40px hsl(270 100% 65% / 0.4)',
      },
      backdropBlur: {
        glass: '10px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px hsl(270 100% 65% / 0.3)' },
          '50%': { boxShadow: '0 0 30px hsl(270 100% 65% / 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      borderRadius: {
        lg: 'calc(var(--radius, 12px))',
      },
    },
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;

export default config;
