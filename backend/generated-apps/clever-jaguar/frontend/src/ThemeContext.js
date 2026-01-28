import React, { createContext, useContext, useEffect, useState } from 'react';
import themeConfig from './theme.json';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(themeConfig);

  // Apply theme class and CSS variables on mount and theme change
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;

    // Apply dark mode class for Tailwind based on theme mode
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply custom CSS variables from theme
    const { colors, typography, spacing, borderRadius, shadows, layout } = theme;

    if (colors) {
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
    }

    if (typography?.fontFamily) {
      root.style.setProperty('--font-family', typography.fontFamily);
    }

    if (spacing) {
      Object.entries(spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
    }

    if (borderRadius) {
      Object.entries(borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value);
      });
    }

    if (shadows) {
      Object.entries(shadows).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value);
      });
    }

    // Apply layout variables (sidebar width, container max width, etc.)
    if (layout) {
      Object.entries(layout).forEach(([key, value]) => {
        // Convert camelCase to kebab-case for CSS variable names
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--layout-${cssKey}`, value);
      });
    }
  }, [theme]);

  const toggleDarkMode = () => {
    setTheme(prev => ({
      ...prev,
      mode: prev.mode === 'dark' ? 'light' : 'dark'
    }));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
