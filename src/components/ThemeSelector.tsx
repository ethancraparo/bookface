'use client';
import { useTheme, type Theme } from './ThemeProvider';

const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dark',
    label: 'Dark',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
      </svg>
    ),
  },
  {
    id: 'grey',
    label: 'Grey',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18V3z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 p-1 glass rounded-xl">
      {themes.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          title={label}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            theme === id
              ? 'bg-white/15 text-white'
              : 'text-white/35 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
