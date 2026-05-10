import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'gray' | 'dark' | 'sepia';

interface TestSettings {
  fontSizeIndex: number; // 0-4
  showTimer: boolean;
  splitScreen: boolean;
  nightModeAuto: boolean;
  nightStart: string; // "HH:MM"
  nightEnd: string;
  confirmAnswerOmission: boolean;
  highlighterColor: string; // hex
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  settings: TestSettings;
  updateSettings: (partial: Partial<TestSettings>) => void;
}

const DEFAULT_SETTINGS: TestSettings = {
  fontSizeIndex: 1,
  showTimer: true,
  splitScreen: false,
  nightModeAuto: false,
  nightStart: '18:00',
  nightEnd: '06:00',
  confirmAnswerOmission: true,
  highlighterColor: '#FDE047', // yellow
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light' || saved === 'gray' || saved === 'sepia') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [settings, setSettings] = useState<TestSettings>(() => {
    try {
      const raw = localStorage.getItem('test_settings');
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'theme-gray', 'theme-sepia', 'theme-light');
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'gray') root.classList.add('theme-gray');
    else if (theme === 'sepia') root.classList.add('theme-sepia');
    else root.classList.add('theme-light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('test_settings', JSON.stringify(settings));
  }, [settings]);

  // Night mode auto scheduling
  useEffect(() => {
    if (!settings.nightModeAuto) return;
    const check = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = settings.nightStart.split(':').map(Number);
      const [eh, em] = settings.nightEnd.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      const inNight = start < end
        ? minutes >= start && minutes < end
        : minutes >= start || minutes < end;
      setThemeState(inNight ? 'dark' : 'light');
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [settings.nightModeAuto, settings.nightStart, settings.nightEnd]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));

  const updateSettings = (partial: Partial<TestSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, settings, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
