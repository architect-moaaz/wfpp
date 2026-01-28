import React, { createContext, useContext, useEffect, useState } from 'react';
import themeConfig from './theme.json';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(themeConfig);

  // Apply CSS variables on mount and theme change
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;
    const { colors, typography, spacing, borderRadius, shadows, layout } = theme;

    // Apply dark mode class for Tailwind based on mode property
    if (theme.mode === 'dark' || theme.name === 'dark' || theme.name === 'darkElegance') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Colors
    if (colors) {
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-background', colors.background);
      root.style.setProperty('--color-card-bg', colors.cardBackground);
      root.style.setProperty('--color-card-border', colors.cardBorder);
      root.style.setProperty('--color-text', colors.text);
      root.style.setProperty('--color-text-secondary', colors.textSecondary);
      root.style.setProperty('--color-label', colors.labelText);
      root.style.setProperty('--color-border', colors.border);
      root.style.setProperty('--color-focus', colors.focus);
      root.style.setProperty('--color-info', colors.info);
      root.style.setProperty('--color-info-bg', colors.infoBackground);
      root.style.setProperty('--color-error', colors.error);
      root.style.setProperty('--color-success', colors.success);
      root.style.setProperty('--color-warning', colors.warning);
    }

    // Typography
    if (typography) {
      root.style.setProperty('--font-family', typography.fontFamily);
      root.style.setProperty('--font-size-page-title', typography.pageTitle?.size || '28px');
      root.style.setProperty('--font-size-section-header', typography.sectionHeader?.size || '16px');
      root.style.setProperty('--font-size-label', typography.fieldLabel?.size || '14px');
      root.style.setProperty('--font-size-input', typography.inputText?.size || '14px');
      root.style.setProperty('--font-size-helper', typography.helperText?.size || '13px');
      root.style.setProperty('--font-size-button', typography.buttonText?.size || '14px');
    }

    // Spacing
    if (spacing) {
      root.style.setProperty('--spacing-unit', spacing.unit);
      root.style.setProperty('--spacing-section', spacing.sectionPadding);
      root.style.setProperty('--spacing-field-gap', spacing.fieldGap);
      root.style.setProperty('--spacing-section-gap', spacing.sectionGap);
      root.style.setProperty('--container-max-width', spacing.containerMaxWidth);
      root.style.setProperty('--input-padding', spacing.inputPadding);
    }

    // Border Radius
    if (borderRadius) {
      root.style.setProperty('--radius-card', borderRadius.card);
      root.style.setProperty('--radius-input', borderRadius.input);
      root.style.setProperty('--radius-button', borderRadius.button);
    }

    // Shadows
    if (shadows) {
      root.style.setProperty('--shadow-card', shadows.card);
      root.style.setProperty('--shadow-card-hover', shadows.cardHover);
    }

    // Layout (sidebar width, container max width, etc.)
    if (layout) {
      root.style.setProperty('--layout-sidebar-width', layout.sidebarWidth || '256px');
      root.style.setProperty('--layout-container-max-width', layout.containerMaxWidth || '1200px');
      root.style.setProperty('--layout-content-padding', layout.contentPadding || '24px');
      root.style.setProperty('--layout-header-height', layout.headerHeight || '64px');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
