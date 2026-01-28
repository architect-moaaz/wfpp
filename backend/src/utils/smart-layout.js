/**
 * Smart Layout System
 * Intelligently determines optimal grid layouts based on form type, field types, and count
 */

// Field type categories for layout decisions
const FIELD_CATEGORIES = {
  // Short fields - work well side by side (2-column or 4-column)
  short: ['text', 'email', 'number', 'tel', 'phone', 'date', 'time', 'select', 'dropdown'],

  // Medium fields - typically half width
  medium: ['password', 'url', 'search', 'currency', 'slider'],

  // Wide fields - should span full width
  wide: ['textarea', 'richtext', 'editor', 'description', 'notes', 'comments'],

  // Full width fields - always full width
  fullWidth: ['file', 'image', 'signature', 'esign', 'dataGrid', 'table', 'section', 'divider'],

  // Compact fields - can fit more per row
  compact: ['checkbox', 'radio', 'toggle', 'rating', 'boolean'],

  // Special layout fields
  special: ['address', 'addressblock', 'geolocation', 'card', 'wizard', 'tab']
};

// Field pairing rules - fields that should be placed together horizontally
const FIELD_PAIRS = [
  ['firstName', 'lastName'],
  ['first_name', 'last_name'],
  ['givenName', 'familyName'],
  ['city', 'state'],
  ['state', 'zip'],
  ['state', 'zipCode'],
  ['state', 'postalCode'],
  ['startDate', 'endDate'],
  ['start_date', 'end_date'],
  ['fromDate', 'toDate'],
  ['min', 'max'],
  ['minValue', 'maxValue'],
  ['email', 'phone'],
  ['email', 'phoneNumber'],
  ['password', 'confirmPassword'],
  ['password', 'confirm_password'],
  ['country', 'region'],
  ['price', 'quantity'],
  ['width', 'height']
];

// Auto-detected sections based on field name patterns
const FIELD_SECTIONS = {
  personal: {
    title: 'Personal Information',
    icon: 'user',
    patterns: ['firstName', 'lastName', 'first_name', 'last_name', 'name', 'fullName', 'email', 'phone', 'dob', 'dateOfBirth', 'age', 'gender']
  },
  address: {
    title: 'Address',
    icon: 'map-pin',
    patterns: ['street', 'address', 'city', 'state', 'zip', 'zipCode', 'postalCode', 'country', 'region', 'apartment', 'suite']
  },
  account: {
    title: 'Account Details',
    icon: 'lock',
    patterns: ['username', 'password', 'confirmPassword', 'confirm_password', 'email', 'role']
  },
  dates: {
    title: 'Dates',
    icon: 'calendar',
    patterns: ['startDate', 'endDate', 'start_date', 'end_date', 'fromDate', 'toDate', 'createdAt', 'updatedAt', 'dueDate', 'deadline']
  },
  payment: {
    title: 'Payment Information',
    icon: 'credit-card',
    patterns: ['cardNumber', 'card_number', 'expiry', 'expiryDate', 'cvv', 'cvc', 'billingAddress', 'amount', 'price']
  },
  details: {
    title: 'Details',
    icon: 'file-text',
    patterns: ['description', 'notes', 'comments', 'message', 'reason', 'summary']
  }
};

/**
 * Check if two fields should be paired together
 */
function shouldPairFields(field1Name, field2Name) {
  const name1 = (field1Name || '').toLowerCase();
  const name2 = (field2Name || '').toLowerCase();

  for (const [a, b] of FIELD_PAIRS) {
    if ((name1.includes(a.toLowerCase()) && name2.includes(b.toLowerCase())) ||
        (name1.includes(b.toLowerCase()) && name2.includes(a.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

/**
 * Detect sections from field names
 */
function detectFieldSections(fields) {
  if (!fields || fields.length === 0) return [];

  const sections = [];
  const assignedFields = new Set();

  // Check each section pattern
  for (const [sectionId, sectionDef] of Object.entries(FIELD_SECTIONS)) {
    const matchingFields = fields.filter(field => {
      const fieldName = (field.name || field.fieldName || '').toLowerCase();
      return sectionDef.patterns.some(pattern => fieldName.includes(pattern.toLowerCase()));
    });

    if (matchingFields.length > 0) {
      sections.push({
        id: sectionId,
        title: sectionDef.title,
        icon: sectionDef.icon,
        fieldIds: matchingFields.map(f => f.id || f.name || f.fieldName)
      });
      matchingFields.forEach(f => assignedFields.add(f.id || f.name || f.fieldName));
    }
  }

  // Add remaining fields to an "Other" section if there are any
  const remainingFields = fields.filter(f => !assignedFields.has(f.id || f.name || f.fieldName));
  if (remainingFields.length > 0 && sections.length > 0) {
    sections.push({
      id: 'other',
      title: 'Additional Information',
      icon: 'info',
      fieldIds: remainingFields.map(f => f.id || f.name || f.fieldName)
    });
  }

  return sections;
}

/**
 * Reorder fields to pair related fields together
 */
function reorderFieldsForPairing(fields) {
  if (!fields || fields.length <= 1) return fields;

  const reordered = [];
  const used = new Set();

  for (let i = 0; i < fields.length; i++) {
    if (used.has(i)) continue;

    const currentField = fields[i];
    const currentName = currentField.name || currentField.fieldName || '';
    reordered.push(currentField);
    used.add(i);

    // Look for a field to pair with
    for (let j = i + 1; j < fields.length; j++) {
      if (used.has(j)) continue;

      const nextField = fields[j];
      const nextName = nextField.name || nextField.fieldName || '';

      if (shouldPairFields(currentName, nextName)) {
        reordered.push(nextField);
        used.add(j);
        break;
      }
    }
  }

  return reordered;
}

// Form type patterns for smart layout selection
const FORM_TYPE_LAYOUTS = {
  // Registration/Signup forms - typically 2-column for personal info
  registration: { columns: 2, pattern: 'paired' },
  signup: { columns: 2, pattern: 'paired' },

  // Login forms - single column, centered
  login: { columns: 1, pattern: 'stacked' },
  auth: { columns: 1, pattern: 'stacked' },

  // Contact forms - 2-column for name/email, full width for message
  contact: { columns: 2, pattern: 'mixed' },
  feedback: { columns: 2, pattern: 'mixed' },

  // Profile/Settings forms - 2-column
  profile: { columns: 2, pattern: 'paired' },
  settings: { columns: 2, pattern: 'paired' },
  preferences: { columns: 2, pattern: 'paired' },

  // Order/Checkout forms - 2-column for billing/shipping
  order: { columns: 2, pattern: 'sectioned' },
  checkout: { columns: 2, pattern: 'sectioned' },
  payment: { columns: 2, pattern: 'paired' },

  // Application/Request forms - 2-column with sections
  application: { columns: 2, pattern: 'sectioned' },
  request: { columns: 2, pattern: 'sectioned' },
  procurement: { columns: 2, pattern: 'sectioned' },

  // Search/Filter forms - can be 4-column for compact filters
  search: { columns: 4, pattern: 'compact' },
  filter: { columns: 4, pattern: 'compact' },

  // Survey forms - single column for clarity
  survey: { columns: 1, pattern: 'stacked' },
  questionnaire: { columns: 1, pattern: 'stacked' },

  // Data entry forms - 2 or 4 column based on field count
  dataEntry: { columns: 2, pattern: 'grid' },
  crud: { columns: 2, pattern: 'grid' },

  // Approval/Review forms - 2-column
  approval: { columns: 2, pattern: 'mixed' },
  review: { columns: 2, pattern: 'mixed' },

  // Default
  default: { columns: 2, pattern: 'smart' }
};

/**
 * Detect form type from form name, purpose, or description
 */
function detectFormType(formSpec) {
  const searchText = [
    formSpec.name || '',
    formSpec.purpose || '',
    formSpec.description || '',
    formSpec.title || ''
  ].join(' ').toLowerCase();

  // Check each form type pattern
  for (const [formType, layout] of Object.entries(FORM_TYPE_LAYOUTS)) {
    if (formType !== 'default' && searchText.includes(formType)) {
      return { type: formType, ...layout };
    }
  }

  // Additional keyword matching
  if (searchText.includes('sign up') || searchText.includes('create account')) {
    return { type: 'registration', ...FORM_TYPE_LAYOUTS.registration };
  }
  if (searchText.includes('log in') || searchText.includes('sign in')) {
    return { type: 'login', ...FORM_TYPE_LAYOUTS.login };
  }
  if (searchText.includes('inquir') || searchText.includes('support')) {
    return { type: 'contact', ...FORM_TYPE_LAYOUTS.contact };
  }

  return { type: 'default', ...FORM_TYPE_LAYOUTS.default };
}

/**
 * Get field category
 */
function getFieldCategory(fieldType) {
  const type = (fieldType || 'text').toLowerCase();

  for (const [category, types] of Object.entries(FIELD_CATEGORIES)) {
    if (types.includes(type)) {
      return category;
    }
  }

  return 'short'; // Default to short fields
}

/**
 * Determine optimal column count based on fields
 */
function determineOptimalColumns(fields, baseColumns = 2) {
  if (!fields || fields.length === 0) return 1;

  const fieldCount = fields.length;
  const categories = fields.map(f => getFieldCategory(f.type));

  // Count field types
  const wideCount = categories.filter(c => c === 'wide' || c === 'fullWidth').length;
  const shortCount = categories.filter(c => c === 'short' || c === 'compact').length;
  const specialCount = categories.filter(c => c === 'special').length;

  // If mostly wide/full width fields, use single column
  if (wideCount > fieldCount * 0.5) {
    return 1;
  }

  // If very few fields (1-3), single column looks cleaner
  if (fieldCount <= 3) {
    return 1;
  }

  // If 4-6 short fields, 2-column works well
  if (fieldCount <= 6 && shortCount >= fieldCount * 0.6) {
    return 2;
  }

  // If many short/compact fields (8+), consider 4-column for filters
  if (fieldCount >= 8 && shortCount >= fieldCount * 0.8) {
    return Math.min(baseColumns, 4);
  }

  // If has special fields like address blocks, use 2-column
  if (specialCount > 0) {
    return 2;
  }

  return baseColumns;
}

/**
 * Generate smart grid layout for fields
 */
function generateSmartGridLayout(fields, formSpec = {}, designSystem = {}) {
  if (!fields || fields.length === 0) return [];

  // Detect form type and get base layout
  const formTypeInfo = detectFormType(formSpec);
  const baseColumns = designSystem?.layout?.columns?.desktop || formTypeInfo.columns || 2;

  // Determine optimal columns based on actual fields
  const optimalColumns = determineOptimalColumns(fields, baseColumns);

  console.log(`[SmartLayout] Form type: ${formTypeInfo.type}, Base columns: ${baseColumns}, Optimal: ${optimalColumns}`);

  // Grid constants
  const GRID_WIDTH = 24;
  const STANDARD_HEIGHT = 8;
  const TEXTAREA_HEIGHT = 12;
  const COMPACT_HEIGHT = 6;

  // Calculate column width
  const columnWidth = Math.floor(GRID_WIDTH / optimalColumns);

  // Track current position
  let currentRow = 0;
  let currentCol = 0;
  let rowMaxHeight = 0;

  const gridLayout = [];

  // Process each field
  fields.forEach((field, index) => {
    const category = getFieldCategory(field.type);
    const fieldType = (field.type || 'text').toLowerCase();

    // Determine field dimensions
    let width, height;

    switch (category) {
      case 'wide':
      case 'fullWidth':
        // Full width, taller
        width = GRID_WIDTH;
        height = fieldType === 'textarea' || fieldType === 'richtext' ? TEXTAREA_HEIGHT : STANDARD_HEIGHT;
        break;

      case 'compact':
        // Can be narrower
        width = optimalColumns >= 4 ? columnWidth : columnWidth;
        height = COMPACT_HEIGHT;
        break;

      case 'special':
        // Special handling for complex fields
        width = GRID_WIDTH; // Full width for complex fields
        height = fieldType === 'address' || fieldType === 'addressblock' ? TEXTAREA_HEIGHT : STANDARD_HEIGHT;
        break;

      case 'short':
      case 'medium':
      default:
        // Standard column width
        width = columnWidth;
        height = STANDARD_HEIGHT;
        break;
    }

    // Check if field should start on new row
    const needsNewRow =
      category === 'wide' ||
      category === 'fullWidth' ||
      category === 'special' ||
      (currentCol + width > GRID_WIDTH);

    if (needsNewRow && currentCol > 0) {
      // Move to next row
      currentRow += rowMaxHeight;
      currentCol = 0;
      rowMaxHeight = 0;
    }

    // For full-width fields, ensure we're at column 0
    if (width === GRID_WIDTH && currentCol > 0) {
      currentRow += rowMaxHeight;
      currentCol = 0;
      rowMaxHeight = 0;
    }

    // Create layout item
    const layoutItem = {
      i: field.id || field.name || `field_${index}`,
      x: currentCol,
      y: currentRow,
      w: width,
      h: height,
      minW: Math.min(6, width),
      minH: Math.min(6, height)
    };

    gridLayout.push(layoutItem);

    // Update position tracking
    currentCol += width;
    rowMaxHeight = Math.max(rowMaxHeight, height);

    // If we've filled the row, move to next
    if (currentCol >= GRID_WIDTH) {
      currentRow += rowMaxHeight;
      currentCol = 0;
      rowMaxHeight = 0;
    }
  });

  return gridLayout;
}

/**
 * Determine layout type string based on columns
 */
function getLayoutType(columns) {
  switch (columns) {
    case 1: return 'single-column';
    case 2: return 'two-column';
    case 3: return 'three-column';
    case 4: return 'four-column';
    default: return 'grid';
  }
}

/**
 * Group fields into logical sections based on field names/types
 */
function groupFieldsIntoSections(fields, formSpec = {}) {
  if (!fields || fields.length <= 4) {
    // Too few fields for sections
    return null;
  }

  const sections = [];
  let currentSection = { id: 'section_main', title: 'Information', fieldIds: [] };

  // Common section patterns
  const sectionPatterns = {
    personal: ['name', 'first', 'last', 'email', 'phone', 'dob', 'birth', 'gender', 'title'],
    contact: ['email', 'phone', 'address', 'city', 'state', 'zip', 'country', 'street'],
    account: ['username', 'password', 'confirm', 'email'],
    payment: ['card', 'cvv', 'expiry', 'billing', 'payment'],
    shipping: ['shipping', 'delivery', 'address', 'recipient'],
    details: ['description', 'notes', 'comments', 'details', 'message'],
    preferences: ['preference', 'setting', 'option', 'notify', 'subscribe']
  };

  // Analyze fields and group
  fields.forEach((field, index) => {
    const fieldNameLower = (field.name || field.label || '').toLowerCase();

    // Check if this field suggests a new section
    for (const [sectionName, patterns] of Object.entries(sectionPatterns)) {
      if (patterns.some(p => fieldNameLower.includes(p))) {
        // Check if we should start a new section
        if (currentSection.fieldIds.length > 0 &&
            !currentSection.title.toLowerCase().includes(sectionName)) {
          // Save current section and start new one
          if (currentSection.fieldIds.length > 0) {
            sections.push(currentSection);
          }
          currentSection = {
            id: `section_${sectionName}`,
            title: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
            fieldIds: []
          };
        }
        break;
      }
    }

    currentSection.fieldIds.push(field.id || field.name);
  });

  // Add last section
  if (currentSection.fieldIds.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 1 ? sections : null;
}

/**
 * Main function to generate complete smart layout for a form
 */
function generateSmartFormLayout(formSpec, fields, designSystem = {}) {
  // Reorder fields to pair related fields together (e.g., firstName + lastName)
  const pairedFields = reorderFieldsForPairing(fields);

  // Generate grid layout with paired fields
  const gridLayout = generateSmartGridLayout(pairedFields, formSpec, designSystem);

  // Determine optimal columns
  const formTypeInfo = detectFormType(formSpec);
  const optimalColumns = determineOptimalColumns(pairedFields, formTypeInfo.columns);

  // Generate sections - try auto-detection first, fall back to legacy grouping
  let sections = detectFieldSections(pairedFields);
  if (sections.length === 0) {
    sections = groupFieldsIntoSections(pairedFields, formSpec);
  }

  console.log(`[SmartLayout] Applied field pairing: ${fields.length} fields -> ${pairedFields.length} paired, ${sections.length} sections detected`);

  return {
    gridLayout,
    layout: {
      type: getLayoutType(optimalColumns),
      columns: optimalColumns,
      sections: sections || []
    },
    formType: formTypeInfo.type,
    designRecommendations: {
      columns: optimalColumns,
      pattern: formTypeInfo.pattern,
      hasSections: sections && sections.length > 0,
      fieldPairingApplied: true
    }
  };
}

module.exports = {
  generateSmartGridLayout,
  generateSmartFormLayout,
  detectFormType,
  getFieldCategory,
  determineOptimalColumns,
  getLayoutType,
  groupFieldsIntoSections,
  // New modern layout utilities
  shouldPairFields,
  detectFieldSections,
  reorderFieldsForPairing,
  FIELD_CATEGORIES,
  FORM_TYPE_LAYOUTS,
  FIELD_PAIRS,
  FIELD_SECTIONS
};
