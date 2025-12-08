/**
 * Form Layout and Design System
 *
 * Comprehensive design system for generating visually appealing forms
 * Reference: Professional form builder UI with proper spacing, grid layouts, and styling
 *
 * This system should be used by all form experts (WizardFormExpert, SimpleFormExpert,
 * AdvancedFormExpert, MobileFormExpert) to ensure consistent, professional form layouts
 */

const FORM_DESIGN_SYSTEM = {
  // ============================================================================
  // GRID SYSTEM
  // ============================================================================
  grid: {
    // Standard grid configurations
    layouts: {
      singleColumn: {
        columns: 1,
        gap: '24px',
        maxWidth: '600px',
        description: 'Best for simple forms, mobile-first, or focused data entry'
      },
      twoColumn: {
        columns: 2,
        gap: '24px',
        columnGap: '32px',
        rowGap: '24px',
        description: 'Best for related fields like First Name/Last Name, City/State'
      },
      threeColumn: {
        columns: 3,
        gap: '20px',
        columnGap: '24px',
        rowGap: '20px',
        description: 'Best for compact forms with many short fields'
      },
      responsive: {
        mobile: { columns: 1, gap: '20px' },
        tablet: { columns: 2, gap: '24px' },
        desktop: { columns: 3, gap: '24px' },
        description: 'Responsive grid that adapts to screen size'
      }
    },

    // Field span rules
    fieldSpans: {
      fullWidth: { columnSpan: 'all', description: 'Full-width fields like text areas, descriptions' },
      half: { columnSpan: 2, description: 'Half-width in 2-column layouts' },
      third: { columnSpan: 1, description: 'One-third width in 3-column layouts' },
      twoThirds: { columnSpan: 2, description: 'Two-thirds width in 3-column layouts' }
    }
  },

  // ============================================================================
  // SPACING SYSTEM
  // ============================================================================
  spacing: {
    // Form-level spacing
    form: {
      padding: '32px',
      paddingMobile: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    },

    // Section spacing (for wizard steps or grouped fields)
    section: {
      marginBottom: '40px',
      padding: '24px',
      gap: '24px'
    },

    // Field spacing
    field: {
      marginBottom: '24px',
      labelMarginBottom: '8px',
      helpTextMarginTop: '6px',
      errorMarginTop: '6px'
    },

    // Field group spacing
    fieldGroup: {
      padding: '20px',
      marginBottom: '32px',
      gap: '20px',
      borderRadius: '8px'
    },

    // Button spacing
    buttons: {
      gap: '12px',
      marginTop: '32px',
      paddingVertical: '12px',
      paddingHorizontal: '24px'
    }
  },

  // ============================================================================
  // TYPOGRAPHY
  // ============================================================================
  typography: {
    // Form title
    formTitle: {
      fontSize: '24px',
      fontWeight: '600',
      lineHeight: '32px',
      marginBottom: '8px',
      color: '#111827'
    },

    // Form description
    formDescription: {
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '20px',
      marginBottom: '32px',
      color: '#6b7280'
    },

    // Section/Step titles
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      lineHeight: '24px',
      marginBottom: '16px',
      color: '#111827'
    },

    // Field labels
    label: {
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '20px',
      color: '#374151',
      display: 'block'
    },

    // Input text
    input: {
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '20px',
      color: '#111827'
    },

    // Help text
    helpText: {
      fontSize: '13px',
      fontWeight: '400',
      lineHeight: '18px',
      color: '#6b7280'
    },

    // Error text
    errorText: {
      fontSize: '13px',
      fontWeight: '500',
      lineHeight: '18px',
      color: '#ef4444'
    },

    // Required indicator
    required: {
      color: '#ef4444',
      fontSize: '14px'
    }
  },

  // ============================================================================
  // COLOR PALETTE
  // ============================================================================
  colors: {
    // Primary colors
    primary: {
      main: '#3b82f6',
      hover: '#2563eb',
      active: '#1d4ed8',
      light: '#dbeafe',
      lighter: '#eff6ff'
    },

    // Neutral colors
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },

    // Semantic colors
    success: {
      main: '#10b981',
      light: '#d1fae5',
      dark: '#065f46'
    },

    error: {
      main: '#ef4444',
      light: '#fee2e2',
      dark: '#991b1b'
    },

    warning: {
      main: '#f59e0b',
      light: '#fef3c7',
      dark: '#92400e'
    },

    info: {
      main: '#3b82f6',
      light: '#dbeafe',
      dark: '#1e40af'
    },

    // Background colors
    background: {
      page: '#f9fafb',
      form: '#ffffff',
      field: '#ffffff',
      fieldDisabled: '#f3f4f6',
      fieldHover: '#f9fafb'
    },

    // Border colors
    border: {
      default: '#d1d5db',
      focus: '#3b82f6',
      error: '#ef4444',
      disabled: '#e5e7eb'
    }
  },

  // ============================================================================
  // COMPONENT STYLES
  // ============================================================================
  components: {
    // Input fields (text, email, number, etc.)
    input: {
      height: '40px',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: '#d1d5db',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      transition: 'all 0.2s',
      focus: {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        outline: 'none'
      },
      error: {
        borderColor: '#ef4444',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)'
      },
      disabled: {
        backgroundColor: '#f3f4f6',
        color: '#9ca3af',
        cursor: 'not-allowed'
      }
    },

    // Textarea
    textarea: {
      minHeight: '100px',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: '#d1d5db',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      resize: 'vertical',
      transition: 'all 0.2s'
    },

    // Select/Dropdown
    select: {
      height: '40px',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: '#d1d5db',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      cursor: 'pointer'
    },

    // Checkbox
    checkbox: {
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      border: '2px solid',
      borderColor: '#d1d5db',
      cursor: 'pointer',
      marginRight: '10px'
    },

    // Radio button
    radio: {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      border: '2px solid',
      borderColor: '#d1d5db',
      cursor: 'pointer',
      marginRight: '10px'
    },

    // Button styles
    button: {
      primary: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        hover: {
          backgroundColor: '#2563eb',
          borderColor: '#2563eb'
        }
      },
      secondary: {
        backgroundColor: '#ffffff',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        hover: {
          backgroundColor: '#f9fafb',
          borderColor: '#9ca3af'
        }
      },
      outline: {
        backgroundColor: 'transparent',
        color: '#3b82f6',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
      }
    },

    // Field groups/sections
    fieldGroup: {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px'
    },

    // Divider
    divider: {
      height: '1px',
      backgroundColor: '#e5e7eb',
      margin: '32px 0'
    }
  },

  // ============================================================================
  // VALIDATION & ERROR STATES
  // ============================================================================
  validation: {
    errorField: {
      borderColor: '#ef4444',
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)'
    },
    successField: {
      borderColor: '#10b981',
      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
    },
    errorMessage: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '6px',
      fontSize: '13px',
      color: '#ef4444',
      fontWeight: '500'
    }
  },

  // ============================================================================
  // WIZARD-SPECIFIC STYLES
  // ============================================================================
  wizard: {
    // Step indicator
    stepIndicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '32px',
      padding: '16px 0',
      borderBottom: '1px solid #e5e7eb'
    },

    // Step item
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      active: {
        color: '#3b82f6',
        fontWeight: '600'
      },
      completed: {
        color: '#10b981'
      },
      pending: {
        color: '#9ca3af'
      }
    },

    // Step number badge
    stepBadge: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      active: {
        backgroundColor: '#3b82f6',
        color: '#ffffff'
      },
      completed: {
        backgroundColor: '#10b981',
        color: '#ffffff'
      },
      pending: {
        backgroundColor: '#e5e7eb',
        color: '#9ca3af'
      }
    },

    // Navigation buttons
    navigation: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: '1px solid #e5e7eb'
    }
  },

  // ============================================================================
  // RESPONSIVE BREAKPOINTS
  // ============================================================================
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px'
  },

  // ============================================================================
  // SHADOWS
  // ============================================================================
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },

  // ============================================================================
  // ANIMATIONS
  // ============================================================================
  animations: {
    transition: {
      fast: '0.15s',
      base: '0.2s',
      slow: '0.3s'
    },
    easing: {
      default: 'ease',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out'
    }
  }
};

// ============================================================================
// LAYOUT GENERATION HELPERS
// ============================================================================

/**
 * Generates layout configuration for a form based on field count and type
 */
function generateFormLayout(fields, formType = 'standard') {
  const fieldCount = fields.length;

  // Determine grid layout based on field count and type
  let gridLayout;

  if (formType === 'wizard') {
    // Wizard forms use single column for clarity
    gridLayout = FORM_DESIGN_SYSTEM.grid.layouts.singleColumn;
  } else if (fieldCount <= 5) {
    // Simple forms use single column
    gridLayout = FORM_DESIGN_SYSTEM.grid.layouts.singleColumn;
  } else if (fieldCount <= 12) {
    // Medium forms use two columns
    gridLayout = FORM_DESIGN_SYSTEM.grid.layouts.twoColumn;
  } else {
    // Complex forms use responsive layout
    gridLayout = FORM_DESIGN_SYSTEM.grid.layouts.responsive;
  }

  return {
    type: 'grid',
    columns: gridLayout.columns || gridLayout.desktop?.columns,
    gap: gridLayout.gap || gridLayout.desktop?.gap,
    columnGap: gridLayout.columnGap,
    rowGap: gridLayout.rowGap,
    maxWidth: gridLayout.maxWidth,
    responsive: gridLayout.mobile ? {
      mobile: gridLayout.mobile,
      tablet: gridLayout.tablet,
      desktop: gridLayout.desktop
    } : null
  };
}

/**
 * Determines field span based on field type and configuration
 */
function getFieldSpan(field, layoutColumns) {
  const { type, wide, fullWidth } = field;

  // Full width fields
  if (fullWidth || type === 'textarea' || type === 'richtext' || type === 'description') {
    return FORM_DESIGN_SYSTEM.grid.fieldSpans.fullWidth;
  }

  // Wide fields
  if (wide) {
    return layoutColumns === 3
      ? FORM_DESIGN_SYSTEM.grid.fieldSpans.twoThirds
      : FORM_DESIGN_SYSTEM.grid.fieldSpans.half;
  }

  // Default: single column span
  return { columnSpan: 1 };
}

/**
 * Generates complete styling configuration for a field
 */
function generateFieldStyling(field) {
  const baseStyles = FORM_DESIGN_SYSTEM.components;
  const spacing = FORM_DESIGN_SYSTEM.spacing.field;

  const componentStyle = baseStyles[field.type] || baseStyles.input;

  return {
    container: {
      marginBottom: spacing.marginBottom,
      ...getFieldSpan(field)
    },
    label: {
      ...FORM_DESIGN_SYSTEM.typography.label,
      marginBottom: spacing.labelMarginBottom
    },
    input: componentStyle,
    helpText: {
      ...FORM_DESIGN_SYSTEM.typography.helpText,
      marginTop: spacing.helpTextMarginTop
    },
    error: {
      ...FORM_DESIGN_SYSTEM.typography.errorText,
      marginTop: spacing.errorMarginTop
    }
  };
}

/**
 * Generates wizard step indicator configuration
 */
function generateWizardStepIndicator(stepCount) {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb',
    stepBadge: FORM_DESIGN_SYSTEM.wizard.stepBadge,
    stepStyle: FORM_DESIGN_SYSTEM.wizard.step
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FORM_DESIGN_SYSTEM,
  generateFormLayout,
  getFieldSpan,
  generateFieldStyling,
  generateWizardStepIndicator
};
