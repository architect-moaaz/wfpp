/**
 * Style Parser - Converts JSON styles to React Native StyleSheet format
 */

// Map of CSS-like properties to React Native equivalents
const PROPERTY_MAP = {
  'background-color': 'backgroundColor',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-align': 'textAlign',
  'border-radius': 'borderRadius',
  'border-width': 'borderWidth',
  'border-color': 'borderColor',
  'margin-top': 'marginTop',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  'margin-right': 'marginRight',
  'padding-top': 'paddingTop',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  'padding-right': 'paddingRight',
  'flex-direction': 'flexDirection',
  'justify-content': 'justifyContent',
  'align-items': 'alignItems',
  'box-shadow': null, // Not directly supported, needs conversion
};

// Convert pixel values to numbers
const parseValue = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;

  // Handle pixel values
  if (value.endsWith('px')) {
    return parseInt(value, 10);
  }

  // Handle percentage (keep as string for RN)
  if (value.endsWith('%')) {
    return value;
  }

  // Handle numeric strings
  if (!isNaN(value)) {
    return parseFloat(value);
  }

  return value;
};

// Convert kebab-case to camelCase
const toCamelCase = (str) => {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Parse JSON style object to React Native compatible styles
 */
export const parseStyle = (jsonStyle = {}) => {
  if (!jsonStyle || typeof jsonStyle !== 'object') {
    return {};
  }

  const rnStyle = {};

  Object.entries(jsonStyle).forEach(([key, value]) => {
    // Check if we have a mapped property
    const mappedKey = PROPERTY_MAP[key];

    if (mappedKey === null) {
      // Property not supported, skip
      return;
    }

    // Use mapped key or convert to camelCase
    const rnKey = mappedKey || toCamelCase(key);

    // Parse the value
    rnStyle[rnKey] = parseValue(value);
  });

  return rnStyle;
};

/**
 * Merge multiple style objects
 */
export const mergeStyles = (...styles) => {
  return styles.reduce((acc, style) => {
    if (style) {
      return { ...acc, ...style };
    }
    return acc;
  }, {});
};

/**
 * Create spacing object from layout config
 */
export const parseLayout = (layout = {}) => {
  const result = {};

  if (layout.padding !== undefined) {
    result.padding = parseValue(layout.padding);
  }
  if (layout.margin !== undefined) {
    result.margin = parseValue(layout.margin);
  }
  if (layout.gap !== undefined) {
    result.gap = parseValue(layout.gap);
  }

  return result;
};

export default {
  parseStyle,
  mergeStyles,
  parseLayout,
};
