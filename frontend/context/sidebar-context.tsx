'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserSettings {
  practiceInstructions: string;
  theoryInstructions: string;
}

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    practiceInstructions: '',
    theoryInstructions: '',
  });

  // Load persisted state from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('treble_sidebar_collapsed') === 'true') setCollapsedState(true);
      setSettings({
        practiceInstructions: localStorage.getItem('treble_practice_instructions') || '',
        theoryInstructions: localStorage.getItem('treble_theory_instructions') || '',
      });
    } catch {}
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try { localStorage.setItem('treble_sidebar_collapsed', String(v)); } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState(prev => {
      const next = !prev;
      try { localStorage.setItem('treble_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        if (patch.practiceInstructions !== undefined) localStorage.setItem('treble_practice_instructions', patch.practiceInstructions);
        if (patch.theoryInstructions !== undefined) localStorage.setItem('treble_theory_instructions', patch.theoryInstructions);
      } catch {}
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed, settings, updateSettings }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
