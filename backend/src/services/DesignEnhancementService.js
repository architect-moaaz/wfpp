/**
 * DesignEnhancementService
 * Two-phase generation: structure first, then design polish
 * Applies micro-interactions, loading states, and preset-specific styling
 */

const { DESIGN_PRESETS, getPresetEffects } = require('../config/design-presets');
const { SHADCN_COMPONENT_MAP, getMicroInteractions } = require('../config/shadcn-component-map');

class DesignEnhancementService {
  constructor() {
    this.enhancementLevels = {
      basic: {
        microInteractions: false,
        loadingStates: false,
        entranceAnimations: false,
        hoverEffects: true
      },
      standard: {
        microInteractions: true,
        loadingStates: true,
        entranceAnimations: false,
        hoverEffects: true
      },
      premium: {
        microInteractions: true,
        loadingStates: true,
        entranceAnimations: true,
        hoverEffects: true
      }
    };
  }

  /**
   * Enhance components with design polish
   * @param {Array} components - Array of component definitions
   * @param {string} presetId - Design preset ID
   * @param {string} level - Enhancement level: 'basic', 'standard', or 'premium'
   */
  async enhance(components, presetId = 'minimal', level = 'standard') {
    const enhancementConfig = this.enhancementLevels[level] || this.enhancementLevels.standard;
    const preset = DESIGN_PRESETS[presetId] || DESIGN_PRESETS.minimal;

    console.log(`[DesignEnhancementService] Enhancing ${components.length} components with preset '${presetId}' at level '${level}'`);

    const enhancedComponents = components.map(component =>
      this.enhanceComponent(component, preset, enhancementConfig)
    );

    return enhancedComponents;
  }

  /**
   * Enhance a single component
   */
  enhanceComponent(component, preset, config) {
    const enhanced = { ...component };

    // Get Shadcn mapping for this component type
    const shadcnMapping = SHADCN_COMPONENT_MAP[component.type];
    if (shadcnMapping) {
      enhanced.shadcn = shadcnMapping;
    }

    // Apply micro-interactions
    if (config.microInteractions) {
      enhanced.microInteractions = this.getMicroInteractionsForComponent(component.type, preset);
    }

    // Add hover effects
    if (config.hoverEffects) {
      enhanced.hoverClasses = this.getHoverEffects(component.type, preset);
    }

    // Add loading states for async components
    if (config.loadingStates && this.isAsyncComponent(component.type)) {
      enhanced.loadingState = this.getLoadingState(component.type);
    }

    // Add entrance animations
    if (config.entranceAnimations) {
      enhanced.entranceAnimation = this.getEntranceAnimation(component.type);
    }

    // Apply preset-specific styling
    enhanced.presetStyles = this.getPresetStyles(component.type, preset);

    // Process children recursively
    if (component.children && Array.isArray(component.children)) {
      enhanced.children = component.children.map(child =>
        this.enhanceComponent(child, preset, config)
      );
    }

    return enhanced;
  }

  /**
   * Get micro-interactions for a component type
   */
  getMicroInteractionsForComponent(componentType, preset) {
    const baseInteractions = {
      button: {
        press: 'active:scale-95 transition-transform duration-100',
        hover: 'hover:bg-primary/90 transition-colors duration-200',
        focus: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      },
      card: {
        hover: 'hover:shadow-lg transition-shadow duration-200',
        lift: 'hover:-translate-y-0.5 transition-transform duration-200'
      },
      input: {
        focus: 'focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200'
      },
      badge: {
        pop: 'animate-in zoom-in-75 duration-150'
      },
      avatar: {
        hover: 'hover:ring-2 hover:ring-primary transition-all duration-200'
      }
    };

    // Get component-specific from shadcn mapping
    const shadcnMapping = SHADCN_COMPONENT_MAP[componentType];
    if (shadcnMapping?.microInteractions) {
      return { ...baseInteractions[componentType], ...shadcnMapping.microInteractions };
    }

    return baseInteractions[componentType] || {};
  }

  /**
   * Get hover effects for component
   */
  getHoverEffects(componentType, preset) {
    const hoverEffects = {
      card: preset.effects?.cardGlow
        ? 'hover:shadow-lg hover:shadow-primary/20'
        : 'hover:shadow-lg',
      button: preset.effects?.buttonGradient
        ? 'hover:opacity-90'
        : 'hover:bg-primary/90',
      'stat-card': 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
      'list-item': 'hover:bg-accent transition-colors duration-150',
      link: 'hover:text-primary transition-colors duration-150',
      tab: 'hover:bg-muted transition-colors duration-150'
    };

    return hoverEffects[componentType] || '';
  }

  /**
   * Check if component loads data asynchronously
   */
  isAsyncComponent(componentType) {
    const asyncComponents = [
      'table', 'data-table', 'chart', 'chart-area', 'chart-bar', 'chart-line', 'chart-pie',
      'list', 'avatar-group', 'feed', 'carousel'
    ];
    return asyncComponents.includes(componentType);
  }

  /**
   * Get loading state for async component
   */
  getLoadingState(componentType) {
    const loadingStates = {
      table: {
        skeleton: 'space-y-2',
        rows: 5,
        component: 'Skeleton',
        className: 'h-10 w-full'
      },
      'data-table': {
        skeleton: 'space-y-2',
        rows: 5,
        component: 'Skeleton',
        className: 'h-10 w-full'
      },
      chart: {
        skeleton: 'aspect-video',
        component: 'Skeleton',
        className: 'w-full h-full rounded-lg'
      },
      'chart-area': {
        skeleton: 'aspect-video',
        component: 'Skeleton',
        className: 'w-full h-[300px] rounded-lg'
      },
      'chart-bar': {
        skeleton: 'aspect-video',
        component: 'Skeleton',
        className: 'w-full h-[300px] rounded-lg'
      },
      'chart-line': {
        skeleton: 'aspect-video',
        component: 'Skeleton',
        className: 'w-full h-[300px] rounded-lg'
      },
      'chart-pie': {
        skeleton: 'aspect-square',
        component: 'Skeleton',
        className: 'w-full h-[300px] rounded-full'
      },
      list: {
        skeleton: 'space-y-3',
        rows: 4,
        component: 'Skeleton',
        className: 'h-16 w-full rounded-lg'
      },
      card: {
        skeleton: 'space-y-4',
        component: 'Skeleton',
        className: 'h-32 w-full rounded-lg'
      },
      avatar: {
        skeleton: '',
        component: 'Skeleton',
        className: 'h-10 w-10 rounded-full'
      },
      'avatar-group': {
        skeleton: 'flex -space-x-2',
        rows: 4,
        component: 'Skeleton',
        className: 'h-8 w-8 rounded-full'
      }
    };

    return loadingStates[componentType] || {
      skeleton: '',
      component: 'Skeleton',
      className: 'h-20 w-full'
    };
  }

  /**
   * Get entrance animation for component
   */
  getEntranceAnimation(componentType) {
    const animations = {
      card: 'animate-in fade-in-0 slide-in-from-bottom-4 duration-300',
      'stat-card': 'animate-in fade-in-0 zoom-in-95 duration-300',
      hero: 'animate-in fade-in-0 slide-in-from-bottom-8 duration-500',
      section: 'animate-in fade-in-0 duration-300',
      dialog: 'animate-in fade-in-0 zoom-in-95 duration-200',
      toast: 'animate-in slide-in-from-top-full duration-300',
      dropdown: 'animate-in fade-in-0 zoom-in-95 duration-150',
      sheet: 'animate-in slide-in-from-right duration-300',
      modal: 'animate-in fade-in-0 zoom-in-95 duration-200',
      page: 'animate-in fade-in-0 slide-in-from-bottom-4 duration-300'
    };

    return animations[componentType] || 'animate-in fade-in-0 duration-200';
  }

  /**
   * Get preset-specific styles
   */
  getPresetStyles(componentType, preset) {
    const styles = {};

    // Apply glassmorphism effects
    if (preset.id === 'glassmorphism') {
      if (componentType === 'card') {
        styles.className = preset.effects?.card || 'backdrop-blur-lg bg-white/70 border border-white/20';
      }
      if (componentType === 'button') {
        styles.className = preset.effects?.button || 'backdrop-blur-sm bg-white/80';
      }
    }

    // Apply brutalist effects
    if (preset.id === 'brutalist') {
      if (componentType === 'card' || componentType === 'button') {
        styles.shadow = preset.shadows?.offset || '4px 4px 0 0 currentColor';
        styles.borderWidth = preset.borders?.width || '2px';
      }
    }

    // Apply gradient effects
    if (preset.id === 'gradient' && preset.gradients) {
      if (componentType === 'button') {
        styles.backgroundImage = preset.gradients.primary;
      }
      if (componentType === 'hero') {
        styles.backgroundImage = preset.gradients.hero;
      }
    }

    // Apply dark elegance effects
    if (preset.id === 'darkElegance' && preset.gradients) {
      if (componentType === 'button') {
        styles.backgroundImage = preset.gradients.gold;
      }
    }

    return styles;
  }

  /**
   * Generate CSS for enhanced components
   */
  generateEnhancedCSS(components, preset) {
    let css = '';

    // Add keyframe animations
    css += `
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
`;

    // Add preset-specific CSS
    if (preset.id === 'glassmorphism') {
      css += `
.glass-card {
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
`;
    }

    if (preset.id === 'brutalist') {
      css += `
.brutalist-shadow {
  box-shadow: 4px 4px 0 0 currentColor;
}
.brutalist-shadow:hover {
  box-shadow: 6px 6px 0 0 currentColor;
}
.brutalist-shadow:active {
  box-shadow: 2px 2px 0 0 currentColor;
}
`;
    }

    return css;
  }

  /**
   * Apply enhancements to page definition
   */
  enhancePage(page, presetId = 'minimal', level = 'standard') {
    const config = this.enhancementLevels[level];
    const preset = DESIGN_PRESETS[presetId] || DESIGN_PRESETS.minimal;

    return {
      ...page,
      components: page.components?.map(c => this.enhanceComponent(c, preset, config)) || [],
      designEnhancements: {
        preset: presetId,
        level,
        entranceAnimation: config.entranceAnimations ? this.getEntranceAnimation('page') : null
      }
    };
  }

  /**
   * Apply enhancements to form definition
   */
  enhanceForm(form, presetId = 'minimal', level = 'standard') {
    const config = this.enhancementLevels[level];
    const preset = DESIGN_PRESETS[presetId] || DESIGN_PRESETS.minimal;

    return {
      ...form,
      fields: form.fields?.map(field => ({
        ...field,
        microInteractions: config.microInteractions ? this.getMicroInteractionsForComponent('input', preset) : null,
        loadingState: config.loadingStates ? this.getLoadingState('input') : null
      })) || [],
      designEnhancements: {
        preset: presetId,
        level
      }
    };
  }
}

module.exports = DesignEnhancementService;
