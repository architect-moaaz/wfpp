import React, { createContext, useContext } from 'react';

// Default design system based on "Enterprise Forms - Procurement Request Form" reference
const DEFAULT_DESIGN_SYSTEM = {
  colors: {
    primary: '#1a1a1a',
    secondary: '#374151',
    background: '#f5f5f5',
    cardBackground: '#ffffff',
    cardBorder: '#e8e8e8',
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    labelText: '#374151',
    inputText: '#1f2937',
    border: '#d1d5db',
    focus: '#000000',
    placeholder: '#9ca3af',
    info: '#3b82f6',
    infoBackground: '#f0f9ff',
    error: '#ef4444',
    success: '#10b981'
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    pageTitle: { size: '28px', weight: 600 },
    sectionHeader: { size: '16px', weight: 600 },
    sectionDescription: { size: '14px', weight: 400 },
    fieldLabel: { size: '14px', weight: 500 },
    inputText: { size: '14px', weight: 400 },
    helperText: { size: '13px', weight: 400 },
    buttonText: { size: '14px', weight: 500 }
  },
  spacing: {
    unit: '8px',
    sectionPadding: '24px',
    fieldGap: '16px',
    sectionGap: '16px',
    containerPadding: '32px'
  },
  borderRadius: {
    card: '8px',
    input: '6px',
    button: '6px',
    checkbox: '4px'
  },
  components: {
    input: {
      height: '42px',
      padding: '10px 12px'
    },
    button: {
      primary: { padding: '10px 24px' },
      secondary: { padding: '10px 20px' }
    },
    card: {
      padding: '24px'
    }
  },
  layout: {
    maxWidth: '800px'
  }
};

const DesignSystemContext = createContext(DEFAULT_DESIGN_SYSTEM);

export const useDesignSystem = () => useContext(DesignSystemContext);

export const DesignSystemProvider = ({ designSystem, children }) => {
  // Merge provided design system with defaults
  const mergedDesignSystem = designSystem
    ? mergeDeep(DEFAULT_DESIGN_SYSTEM, designSystem)
    : DEFAULT_DESIGN_SYSTEM;

  return (
    <DesignSystemContext.Provider value={mergedDesignSystem}>
      {children}
    </DesignSystemContext.Provider>
  );
};

// Deep merge utility
function mergeDeep(target, source) {
  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object') {
        output[key] = mergeDeep(target[key], source[key]);
      } else {
        output[key] = { ...source[key] };
      }
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

// Generate CSS variables from design system
export const generateCSSVariables = (designSystem) => {
  const ds = designSystem || DEFAULT_DESIGN_SYSTEM;

  return {
    // Colors
    '--ds-color-primary': ds.colors?.primary || DEFAULT_DESIGN_SYSTEM.colors.primary,
    '--ds-color-secondary': ds.colors?.secondary || DEFAULT_DESIGN_SYSTEM.colors.secondary,
    '--ds-color-background': ds.colors?.background || DEFAULT_DESIGN_SYSTEM.colors.background,
    '--ds-color-card-bg': ds.colors?.cardBackground || DEFAULT_DESIGN_SYSTEM.colors.cardBackground,
    '--ds-color-card-border': ds.colors?.cardBorder || DEFAULT_DESIGN_SYSTEM.colors.cardBorder,
    '--ds-color-text': ds.colors?.text || DEFAULT_DESIGN_SYSTEM.colors.text,
    '--ds-color-text-secondary': ds.colors?.textSecondary || DEFAULT_DESIGN_SYSTEM.colors.textSecondary,
    '--ds-color-label': ds.colors?.labelText || DEFAULT_DESIGN_SYSTEM.colors.labelText,
    '--ds-color-input-text': ds.colors?.inputText || DEFAULT_DESIGN_SYSTEM.colors.inputText,
    '--ds-color-border': ds.colors?.border || DEFAULT_DESIGN_SYSTEM.colors.border,
    '--ds-color-focus': ds.colors?.focus || DEFAULT_DESIGN_SYSTEM.colors.focus,
    '--ds-color-placeholder': ds.colors?.placeholder || DEFAULT_DESIGN_SYSTEM.colors.placeholder,
    '--ds-color-info': ds.colors?.info || DEFAULT_DESIGN_SYSTEM.colors.info,
    '--ds-color-info-bg': ds.colors?.infoBackground || DEFAULT_DESIGN_SYSTEM.colors.infoBackground,
    '--ds-color-error': ds.colors?.error || DEFAULT_DESIGN_SYSTEM.colors.error,
    '--ds-color-success': ds.colors?.success || DEFAULT_DESIGN_SYSTEM.colors.success,

    // Typography
    '--ds-font-family': ds.typography?.fontFamily || DEFAULT_DESIGN_SYSTEM.typography.fontFamily,
    '--ds-font-size-title': ds.typography?.pageTitle?.size || DEFAULT_DESIGN_SYSTEM.typography.pageTitle.size,
    '--ds-font-weight-title': ds.typography?.pageTitle?.weight || DEFAULT_DESIGN_SYSTEM.typography.pageTitle.weight,
    '--ds-font-size-section': ds.typography?.sectionHeader?.size || DEFAULT_DESIGN_SYSTEM.typography.sectionHeader.size,
    '--ds-font-weight-section': ds.typography?.sectionHeader?.weight || DEFAULT_DESIGN_SYSTEM.typography.sectionHeader.weight,
    '--ds-font-size-label': ds.typography?.fieldLabel?.size || DEFAULT_DESIGN_SYSTEM.typography.fieldLabel.size,
    '--ds-font-weight-label': ds.typography?.fieldLabel?.weight || DEFAULT_DESIGN_SYSTEM.typography.fieldLabel.weight,
    '--ds-font-size-input': ds.typography?.inputText?.size || DEFAULT_DESIGN_SYSTEM.typography.inputText.size,
    '--ds-font-size-helper': ds.typography?.helperText?.size || DEFAULT_DESIGN_SYSTEM.typography.helperText.size,
    '--ds-font-size-button': ds.typography?.buttonText?.size || DEFAULT_DESIGN_SYSTEM.typography.buttonText.size,
    '--ds-font-weight-button': ds.typography?.buttonText?.weight || DEFAULT_DESIGN_SYSTEM.typography.buttonText.weight,

    // Spacing
    '--ds-spacing-unit': ds.spacing?.unit || DEFAULT_DESIGN_SYSTEM.spacing.unit,
    '--ds-spacing-section': ds.spacing?.sectionPadding || DEFAULT_DESIGN_SYSTEM.spacing.sectionPadding,
    '--ds-spacing-field-gap': ds.spacing?.fieldGap || DEFAULT_DESIGN_SYSTEM.spacing.fieldGap,
    '--ds-spacing-container': ds.spacing?.containerPadding || DEFAULT_DESIGN_SYSTEM.spacing.containerPadding,

    // Border Radius
    '--ds-radius-card': ds.borderRadius?.card || DEFAULT_DESIGN_SYSTEM.borderRadius.card,
    '--ds-radius-input': ds.borderRadius?.input || DEFAULT_DESIGN_SYSTEM.borderRadius.input,
    '--ds-radius-button': ds.borderRadius?.button || DEFAULT_DESIGN_SYSTEM.borderRadius.button,
    '--ds-radius-checkbox': ds.borderRadius?.checkbox || DEFAULT_DESIGN_SYSTEM.borderRadius.checkbox,

    // Components
    '--ds-input-height': ds.components?.input?.height || DEFAULT_DESIGN_SYSTEM.components.input.height,
    '--ds-input-padding': ds.components?.input?.padding || DEFAULT_DESIGN_SYSTEM.components.input.padding,
    '--ds-card-padding': ds.components?.card?.padding || DEFAULT_DESIGN_SYSTEM.components.card.padding,
    '--ds-btn-primary-padding': ds.components?.button?.primary?.padding || DEFAULT_DESIGN_SYSTEM.components.button.primary.padding,
    '--ds-btn-secondary-padding': ds.components?.button?.secondary?.padding || DEFAULT_DESIGN_SYSTEM.components.button.secondary.padding,

    // Layout
    '--ds-layout-max-width': ds.layout?.maxWidth || DEFAULT_DESIGN_SYSTEM.layout.maxWidth
  };
};

export { DEFAULT_DESIGN_SYSTEM };
export default DesignSystemContext;
