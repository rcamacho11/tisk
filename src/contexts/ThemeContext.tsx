import { createContext, ReactNode, useContext, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setIsDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  const colorScheme: ColorScheme = override ?? systemScheme ?? 'light';

  const setIsDark = (dark: boolean) => {
    setOverride(dark ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ColorScheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return ctx.colorScheme;
}

export function useAppThemeControl() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppThemeControl must be used inside AppThemeProvider');
  return ctx;
}
