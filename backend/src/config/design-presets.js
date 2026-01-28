/**
 * Design Presets Configuration
 * Curated visual styles for generated applications
 */

const DESIGN_PRESETS = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean Apple-like design with generous whitespace and subtle shadows',
    preview: {
      primary: '#18181b',
      accent: '#f4f4f5',
      style: 'Clean lines, lots of breathing room'
    },
    cssVariables: {
      // Light mode
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '240 10% 3.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '240 10% 3.9%',
      '--primary': '240 5.9% 10%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '240 4.8% 95.9%',
      '--secondary-foreground': '240 5.9% 10%',
      '--muted': '240 4.8% 95.9%',
      '--muted-foreground': '240 3.8% 46.1%',
      '--accent': '240 4.8% 95.9%',
      '--accent-foreground': '240 5.9% 10%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '240 5.9% 90%',
      '--input': '240 5.9% 90%',
      '--ring': '240 5.9% 10%',
      '--radius': '0.5rem'
    },
    darkMode: {
      '--background': '240 10% 3.9%',
      '--foreground': '0 0% 98%',
      '--card': '240 10% 3.9%',
      '--card-foreground': '0 0% 98%',
      '--popover': '240 10% 3.9%',
      '--popover-foreground': '0 0% 98%',
      '--primary': '0 0% 98%',
      '--primary-foreground': '240 5.9% 10%',
      '--secondary': '240 3.7% 15.9%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '240 3.7% 15.9%',
      '--muted-foreground': '240 5% 64.9%',
      '--accent': '240 3.7% 15.9%',
      '--accent-foreground': '0 0% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '240 3.7% 15.9%',
      '--input': '240 3.7% 15.9%',
      '--ring': '240 4.9% 83.9%'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      card: 'sm',
      button: 'none'
    },
    animations: {
      duration: '200ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    spacing: {
      cardPadding: '1.5rem',
      sectionGap: '2rem',
      componentGap: '1rem'
    },
    typography: {
      headingWeight: '600',
      bodySize: '0.875rem',
      lineHeight: '1.5'
    }
  },

  gradient: {
    id: 'gradient',
    name: 'Gradient',
    description: 'Stripe-like depth with vibrant gradients and bold colors',
    preview: {
      primary: '#8b5cf6',
      accent: '#ec4899',
      style: 'Vibrant gradients, modern feel'
    },
    cssVariables: {
      '--background': '0 0% 100%',
      '--foreground': '224 71.4% 4.1%',
      '--card': '0 0% 100%',
      '--card-foreground': '224 71.4% 4.1%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '224 71.4% 4.1%',
      '--primary': '262.1 83.3% 57.8%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '220 14.3% 95.9%',
      '--secondary-foreground': '220.9 39.3% 11%',
      '--muted': '220 14.3% 95.9%',
      '--muted-foreground': '220 8.9% 46.1%',
      '--accent': '316 72.4% 57.6%',
      '--accent-foreground': '210 20% 98%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '220 13% 91%',
      '--input': '220 13% 91%',
      '--ring': '262.1 83.3% 57.8%',
      '--radius': '0.75rem'
    },
    darkMode: {
      '--background': '224 71.4% 4.1%',
      '--foreground': '210 20% 98%',
      '--card': '224 71.4% 4.1%',
      '--card-foreground': '210 20% 98%',
      '--popover': '224 71.4% 4.1%',
      '--popover-foreground': '210 20% 98%',
      '--primary': '263.4 70% 50.4%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '215 27.9% 16.9%',
      '--secondary-foreground': '210 20% 98%',
      '--muted': '215 27.9% 16.9%',
      '--muted-foreground': '217.9 10.6% 64.9%',
      '--accent': '316 72.4% 50%',
      '--accent-foreground': '210 20% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '215 27.9% 16.9%',
      '--input': '215 27.9% 16.9%',
      '--ring': '263.4 70% 50.4%'
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(316 65% 58%) 100%)',
      secondary: 'linear-gradient(135deg, hsl(220 70% 50%) 0%, hsl(262 83% 58%) 100%)',
      accent: 'linear-gradient(135deg, hsl(316 72% 58%) 0%, hsl(350 80% 60%) 100%)',
      background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(220 14% 96%) 100%)',
      hero: 'linear-gradient(135deg, hsl(262 83% 58% / 0.1) 0%, hsl(316 65% 58% / 0.1) 100%)'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(139 92 246 / 0.05)',
      DEFAULT: '0 1px 3px 0 rgb(139 92 246 / 0.1), 0 1px 2px -1px rgb(139 92 246 / 0.1)',
      md: '0 4px 6px -1px rgb(139 92 246 / 0.1), 0 2px 4px -2px rgb(139 92 246 / 0.1)',
      lg: '0 10px 15px -3px rgb(139 92 246 / 0.15), 0 4px 6px -4px rgb(139 92 246 / 0.1)',
      xl: '0 20px 25px -5px rgb(139 92 246 / 0.1), 0 8px 10px -6px rgb(139 92 246 / 0.1)',
      glow: '0 0 20px rgb(139 92 246 / 0.3)',
      card: 'lg',
      button: 'md'
    },
    animations: {
      duration: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    effects: {
      buttonGradient: true,
      cardGlow: true,
      hoverLift: true
    }
  },

  darkElegance: {
    id: 'darkElegance',
    name: 'Dark Elegance',
    description: 'Linear-like sophisticated dark theme with gold accents',
    preview: {
      primary: '#eab308',
      accent: '#0a0a0a',
      style: 'Sophisticated dark with gold'
    },
    mode: 'dark',
    cssVariables: {
      '--background': '0 0% 3.9%',
      '--foreground': '0 0% 98%',
      '--card': '0 0% 6%',
      '--card-foreground': '0 0% 98%',
      '--popover': '0 0% 6%',
      '--popover-foreground': '0 0% 98%',
      '--primary': '47.9 95.8% 53.1%',
      '--primary-foreground': '0 0% 3.9%',
      '--secondary': '0 0% 14.9%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '0 0% 14.9%',
      '--muted-foreground': '0 0% 63.9%',
      '--accent': '47.9 95.8% 53.1%',
      '--accent-foreground': '0 0% 3.9%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 14.9%',
      '--input': '0 0% 14.9%',
      '--ring': '47.9 95.8% 53.1%',
      '--radius': '0.5rem'
    },
    gradients: {
      gold: 'linear-gradient(135deg, hsl(48 96% 53%) 0%, hsl(36 100% 50%) 100%)',
      dark: 'linear-gradient(180deg, hsl(0 0% 6%) 0%, hsl(0 0% 3.9%) 100%)',
      subtle: 'linear-gradient(180deg, hsl(0 0% 9%) 0%, hsl(0 0% 6%) 100%)'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
      goldGlow: '0 0 20px rgb(234 179 8 / 0.2)',
      card: 'md',
      button: 'sm'
    },
    animations: {
      duration: '250ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    effects: {
      goldAccents: true,
      subtleGlow: true
    }
  },

  glassmorphism: {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effects with blur and transparency',
    preview: {
      primary: '#3b82f6',
      accent: 'rgba(255,255,255,0.7)',
      style: 'Frosted glass, blur effects'
    },
    cssVariables: {
      '--background': '210 40% 96.1%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100% / 0.7',
      '--card-foreground': '222.2 84% 4.9%',
      '--popover': '0 0% 100% / 0.9',
      '--popover-foreground': '222.2 84% 4.9%',
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 96.1% / 0.8',
      '--secondary-foreground': '222.2 47.4% 11.2%',
      '--muted': '210 40% 96.1% / 0.6',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--accent': '210 40% 96.1% / 0.8',
      '--accent-foreground': '222.2 47.4% 11.2%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '0 0% 100% / 0.2',
      '--input': '0 0% 100% / 0.3',
      '--ring': '221.2 83.2% 53.3%',
      '--radius': '1rem'
    },
    darkMode: {
      '--background': '222.2 84% 4.9%',
      '--foreground': '210 40% 98%',
      '--card': '0 0% 100% / 0.05',
      '--card-foreground': '210 40% 98%',
      '--popover': '0 0% 100% / 0.1',
      '--popover-foreground': '210 40% 98%',
      '--primary': '217.2 91.2% 59.8%',
      '--primary-foreground': '222.2 84% 4.9%',
      '--secondary': '0 0% 100% / 0.1',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '0 0% 100% / 0.05',
      '--muted-foreground': '215 20.2% 65.1%',
      '--accent': '0 0% 100% / 0.1',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '0 0% 100% / 0.1',
      '--input': '0 0% 100% / 0.1',
      '--ring': '217.2 91.2% 59.8%'
    },
    effects: {
      card: 'backdrop-blur-lg bg-white/70 border border-white/20',
      cardDark: 'backdrop-blur-lg bg-white/5 border border-white/10',
      button: 'backdrop-blur-sm bg-white/80',
      input: 'backdrop-blur-sm bg-white/50 border border-white/30'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      md: '0 8px 16px -4px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)',
      lg: '0 16px 32px -8px rgb(0 0 0 / 0.1), 0 8px 16px -8px rgb(0 0 0 / 0.05)',
      card: 'md',
      button: 'sm'
    },
    animations: {
      duration: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    blur: {
      sm: '4px',
      DEFAULT: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    },
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },

  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Bold, raw design with sharp edges and high contrast',
    preview: {
      primary: '#000000',
      accent: '#ff3e00',
      style: 'Bold borders, sharp edges'
    },
    cssVariables: {
      '--background': '0 0% 100%',
      '--foreground': '0 0% 0%',
      '--card': '0 0% 100%',
      '--card-foreground': '0 0% 0%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 0%',
      '--primary': '0 0% 0%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '0 0% 96%',
      '--secondary-foreground': '0 0% 0%',
      '--muted': '0 0% 96%',
      '--muted-foreground': '0 0% 40%',
      '--accent': '14 100% 50%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 100% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '0 0% 0%',
      '--input': '0 0% 0%',
      '--ring': '0 0% 0%',
      '--radius': '0'
    },
    darkMode: {
      '--background': '0 0% 0%',
      '--foreground': '0 0% 100%',
      '--card': '0 0% 5%',
      '--card-foreground': '0 0% 100%',
      '--popover': '0 0% 5%',
      '--popover-foreground': '0 0% 100%',
      '--primary': '0 0% 100%',
      '--primary-foreground': '0 0% 0%',
      '--secondary': '0 0% 15%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '0 0% 15%',
      '--muted-foreground': '0 0% 60%',
      '--accent': '14 100% 50%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 100% 50%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '0 0% 100%',
      '--input': '0 0% 100%',
      '--ring': '0 0% 100%'
    },
    borders: {
      width: '2px',
      style: 'solid',
      color: 'currentColor'
    },
    shadows: {
      offset: '4px 4px 0 0 currentColor',
      offsetHover: '6px 6px 0 0 currentColor',
      offsetActive: '2px 2px 0 0 currentColor',
      card: 'offset',
      button: 'offset'
    },
    animations: {
      duration: '100ms',
      easing: 'linear'
    },
    effects: {
      sharpCorners: true,
      boldBorders: true,
      offsetShadows: true,
      monoFont: true
    },
    typography: {
      headingWeight: '900',
      bodyWeight: '500',
      transform: 'uppercase'
    }
  },

  // Additional presets for variety
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm blue tones inspired by the sea',
    preview: {
      primary: '#0ea5e9',
      accent: '#06b6d4',
      style: 'Calm blues, wave-like'
    },
    cssVariables: {
      '--background': '200 50% 98%',
      '--foreground': '200 50% 10%',
      '--card': '0 0% 100%',
      '--card-foreground': '200 50% 10%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '200 50% 10%',
      '--primary': '199 89% 48%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '200 30% 94%',
      '--secondary-foreground': '200 50% 10%',
      '--muted': '200 30% 94%',
      '--muted-foreground': '200 20% 50%',
      '--accent': '187 92% 42%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '200 30% 88%',
      '--input': '200 30% 88%',
      '--ring': '199 89% 48%',
      '--radius': '0.75rem'
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(199 89% 48%) 0%, hsl(187 92% 42%) 100%)',
      background: 'linear-gradient(180deg, hsl(200 50% 98%) 0%, hsl(200 40% 94%) 100%)'
    },
    shadows: {
      card: 'md',
      button: 'sm'
    }
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural greens with earthy warmth',
    preview: {
      primary: '#22c55e',
      accent: '#84cc16',
      style: 'Natural greens, earthy'
    },
    cssVariables: {
      '--background': '120 20% 98%',
      '--foreground': '120 30% 10%',
      '--card': '0 0% 100%',
      '--card-foreground': '120 30% 10%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '120 30% 10%',
      '--primary': '142 71% 45%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '120 20% 94%',
      '--secondary-foreground': '120 30% 10%',
      '--muted': '120 20% 94%',
      '--muted-foreground': '120 15% 50%',
      '--accent': '84 81% 44%',
      '--accent-foreground': '0 0% 100%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '120 20% 88%',
      '--input': '120 20% 88%',
      '--ring': '142 71% 45%',
      '--radius': '0.5rem'
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(84 81% 44%) 100%)'
    }
  }
};

/**
 * Get CSS custom properties string for a preset
 */
function getPresetCSS(presetId, isDark = false) {
  const preset = DESIGN_PRESETS[presetId];
  if (!preset) return '';

  const variables = isDark && preset.darkMode ? preset.darkMode : preset.cssVariables;

  return Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

/**
 * Get Tailwind theme extension for a preset
 */
function getTailwindTheme(presetId) {
  const preset = DESIGN_PRESETS[presetId];
  if (!preset) return {};

  return {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: preset.shadows || {},
      backgroundImage: preset.gradients || {},
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      }
    }
  };
}

/**
 * Get special effects classes for a preset
 */
function getPresetEffects(presetId, componentType) {
  const preset = DESIGN_PRESETS[presetId];
  if (!preset || !preset.effects) return '';

  return preset.effects[componentType] || '';
}

/**
 * Get all preset IDs
 */
function getPresetIds() {
  return Object.keys(DESIGN_PRESETS);
}

/**
 * Get preset metadata for UI display
 */
function getPresetList() {
  return Object.values(DESIGN_PRESETS).map(preset => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    preview: preset.preview
  }));
}

module.exports = {
  DESIGN_PRESETS,
  getPresetCSS,
  getTailwindTheme,
  getPresetEffects,
  getPresetIds,
  getPresetList
};
