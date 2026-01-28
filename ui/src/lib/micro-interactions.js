/**
 * Micro-Interaction Library
 * Tailwind CSS classes for polished UI interactions
 */

export const MICRO_INTERACTIONS = {
  // Button interactions
  button: {
    press: 'active:scale-95 transition-transform duration-100',
    hover: 'hover:bg-primary/90 transition-colors duration-200',
    focus: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    loading: 'cursor-wait opacity-70',
    // Combined classes for common button states
    default: 'active:scale-95 transition-all duration-200 hover:bg-primary/90',
    outline: 'active:scale-95 transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
    ghost: 'active:scale-95 transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
    destructive: 'active:scale-95 transition-all duration-200 hover:bg-destructive/90'
  },

  // Card interactions
  card: {
    hover: 'hover:shadow-lg transition-shadow duration-200',
    hoverLift: 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200',
    hoverBorder: 'hover:border-primary/50 transition-colors duration-200',
    interactive: 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
    selected: 'ring-2 ring-primary shadow-lg'
  },

  // Input interactions
  input: {
    focus: 'focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200',
    error: 'border-destructive focus:ring-destructive/20',
    success: 'border-green-500 focus:ring-green-500/20',
    disabled: 'opacity-50 cursor-not-allowed'
  },

  // Loading states
  loading: {
    skeleton: 'animate-pulse bg-muted rounded',
    spinner: 'animate-spin',
    dots: 'animate-bounce',
    shimmer: 'animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent'
  },

  // Toast/notification animations
  toast: {
    enter: 'animate-in slide-in-from-top-full duration-300',
    exit: 'animate-out slide-out-to-right-full duration-200',
    shake: 'animate-shake'
  },

  // Page transitions
  page: {
    enter: 'animate-in fade-in-0 slide-in-from-bottom-4 duration-300',
    exit: 'animate-out fade-out-0 slide-out-to-top-4 duration-200',
    fadeIn: 'animate-in fade-in-0 duration-200',
    fadeOut: 'animate-out fade-out-0 duration-200'
  },

  // Modal/dialog animations
  modal: {
    overlay: 'animate-in fade-in-0 duration-200',
    overlayExit: 'animate-out fade-out-0 duration-200',
    content: 'animate-in fade-in-0 zoom-in-95 duration-200',
    contentExit: 'animate-out fade-out-0 zoom-out-95 duration-200',
    slideUp: 'animate-in slide-in-from-bottom-1/2 duration-300',
    slideDown: 'animate-out slide-out-to-bottom-1/2 duration-200'
  },

  // Dropdown animations
  dropdown: {
    enter: 'animate-in fade-in-0 zoom-in-95 duration-150',
    exit: 'animate-out fade-out-0 zoom-out-95 duration-100',
    slideDown: 'animate-in slide-in-from-top-2 duration-150'
  },

  // Accordion animations
  accordion: {
    open: 'animate-accordion-down',
    close: 'animate-accordion-up'
  },

  // List item interactions
  listItem: {
    hover: 'hover:bg-accent transition-colors duration-150',
    selected: 'bg-accent',
    drag: 'opacity-50 scale-105 shadow-lg'
  },

  // Icon interactions
  icon: {
    hover: 'hover:scale-110 transition-transform duration-150',
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce'
  },

  // Badge interactions
  badge: {
    pulse: 'animate-pulse',
    pop: 'animate-in zoom-in-75 duration-150'
  },

  // Progress animations
  progress: {
    indeterminate: 'animate-progress-indeterminate',
    fill: 'transition-all duration-500 ease-out'
  },

  // Switch/toggle animations
  toggle: {
    slide: 'transition-transform duration-200',
    checked: 'translate-x-5',
    unchecked: 'translate-x-0'
  },

  // Tab animations
  tab: {
    indicator: 'transition-all duration-200',
    content: 'animate-in fade-in-0 duration-200'
  },

  // Tooltip animations
  tooltip: {
    enter: 'animate-in fade-in-0 zoom-in-95 duration-100',
    exit: 'animate-out fade-out-0 zoom-out-95 duration-75'
  },

  // Form field animations
  field: {
    shake: 'animate-shake',
    success: 'animate-in zoom-in-95 duration-200'
  },

  // Avatar animations
  avatar: {
    hover: 'hover:ring-2 hover:ring-primary transition-all duration-200',
    online: 'ring-2 ring-green-500',
    offline: 'opacity-60'
  }
};

/**
 * Get micro-interaction classes for a component type
 */
export function getMicroInteraction(componentType, state = 'default') {
  const componentInteractions = MICRO_INTERACTIONS[componentType];
  if (!componentInteractions) return '';
  return componentInteractions[state] || componentInteractions.default || '';
}

/**
 * Combine multiple micro-interaction classes
 */
export function combineMicroInteractions(...interactions) {
  return interactions.filter(Boolean).join(' ');
}

/**
 * Get animation keyframes for custom animations
 */
export const CUSTOM_KEYFRAMES = {
  'accordion-down': {
    from: { height: '0' },
    to: { height: 'var(--radix-accordion-content-height)' }
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: '0' }
  },
  'shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
  },
  'shimmer': {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' }
  },
  'progress-indeterminate': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' }
  }
};

/**
 * Tailwind animation configuration to add to tailwind.config.js
 */
export const TAILWIND_ANIMATION_CONFIG = {
  animation: {
    'accordion-down': 'accordion-down 0.2s ease-out',
    'accordion-up': 'accordion-up 0.2s ease-out',
    'shake': 'shake 0.5s ease-in-out',
    'shimmer': 'shimmer 2s infinite linear',
    'progress-indeterminate': 'progress-indeterminate 1.5s infinite ease-in-out'
  },
  keyframes: CUSTOM_KEYFRAMES
};

export default MICRO_INTERACTIONS;
