'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/theme-context';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors focus:outline-none ${className ?? ''}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark'
        ? <Sun  className="w-[18px] h-[18px]" />
        : <Moon className="w-[18px] h-[18px]" />
      }
    </button>
  );
}
