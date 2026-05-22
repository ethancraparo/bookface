'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'grey' | 'light';

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Read from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bf-theme') as Theme | null;
    if (saved && ['dark', 'grey', 'light'].includes(saved)) {
      setTheme(saved);
    }
  }, []);

  // Apply to <html data-theme="..."> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bf-theme', theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
