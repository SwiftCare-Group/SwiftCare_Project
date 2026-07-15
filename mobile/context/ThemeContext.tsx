import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../constants/colors';

const THEME_STORAGE_KEY = 'swiftcareTheme';

export type ThemeMode = 'light' | 'dark';

type AppColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;

  headerDark: string;
  headerGradientStart: string;
  headerGradientEnd: string;

  white: string;
  black: string;

  textPrimary: string;
  textSecondary: string;
  textDisabled: string;

  border: string;
  borderStrong: string;

  background: string;
  surface: string;
  surfaceSecondary: string;

  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;

  severityMild: string;
  severityMildBg: string;
  severityModerate: string;
  severityModerateBg: string;
  severitySevere: string;
  severitySevereBg: string;
  severityCritical: string;
  severityCriticalBg: string;

  tierFree: string;
  tierFreeBg: string;
  tierPremium: string;
  tierPremiumBg: string;
};

type ThemeContextType = {
  theme: ThemeMode;
  isDarkMode: boolean;
  colors: AppColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme =
        await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);

      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        newTheme
      );
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme =
      theme === 'light' ? 'dark' : 'light';

    await setTheme(newTheme);
  };

  const colors = useMemo<AppColors>(() => {
    if (theme === 'dark') {
      return {
        ...Colors,

        background: Colors.dark.background,
        surface: Colors.dark.surface,
        surfaceSecondary: Colors.dark.surfaceSecondary,
        textPrimary: Colors.dark.textPrimary,
        textSecondary: Colors.dark.textSecondary,
        border: Colors.dark.border,
        borderStrong: Colors.dark.borderStrong,
      };
    }

    return Colors;
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === 'dark',
      colors,
      setTheme,
      toggleTheme,
    }),
    [theme, colors]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider'
    );
  }

  return context;
}