'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise from what the anti-flash inline script already applied to <html>
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    setThemeState(current);
  }, []);

  const applyTheme = (next: Theme) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(next);
    try { localStorage.setItem('treble_theme', next); } catch {}
  };

  const setTheme = (t: Theme) => {
    applyTheme(t);
    setThemeState(t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
