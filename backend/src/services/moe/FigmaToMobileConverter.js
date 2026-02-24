/**
 * FigmaToMobileConverter
 *
 * Directly converts Figma-extracted layout trees into React Native component
 * JSON, bypassing AI generation so the output faithfully mirrors the Figma
 * design's structure, hierarchy, and styling.
 *
 * Output format matches what ComponentRenderer (mobile) and
 * SimulatorComponentRenderer (web) expect:
 *   { type, props, style, children }
 * where `style` is a top-level field (not nested inside props).
 */

const { tokens } = require('../../config/design-tokens');

class FigmaToMobileConverter {

  /**
   * Convert an array of Figma mobile screens to the mobile-UI format
   * expected by ApplicationGenerator.
   *
   * @param {Object[]} figmaMobileScreens - screens from FigmaDirectClient.processFrame()
   * @param {Object|null} designSystem     - merged design system (colors, typography, etc.)
   * @returns {{ screens: Object[], navigation: Object }}
   */
  convert(figmaMobileScreens, designSystem) {
    const ds = this._resolveDesignSystem(designSystem);
    const screens = figmaMobileScreens
      .filter(s => s.layoutTree && s.layoutTree.length > 0)
      .map(s => this._convertScreen(s, ds));

    const navigation = this._inferNavigation(screens);

    return { screens, navigation };
  }

  // ---------------------------------------------------------------------------
  // Screen conversion
  // ---------------------------------------------------------------------------

  _convertScreen(screen, ds) {
    const name = this._toPascalCase(screen.name || screen.title || 'Screen');
    const components = (screen.layoutTree || [])
      .map(node => this._convertNode(node, ds))
      .filter(Boolean);
    const screenType = this._inferScreenType(screen.layoutTree);

    return {
      id: screen.id || `screen_${name.toLowerCase()}`,
      name,
      type: screenType,
      platform: 'cross-platform',
      framework: 'react-native',
      components: [{
        type: 'SafeAreaView',
        props: {},
        style: { flex: 1 },
        children: [{
          type: 'ScrollView',
          props: { contentContainerStyle: { padding: ds.spacing } },
          style: { flex: 1 },
          children: components
        }]
      }],
      navigation: { showHeader: true, headerTitle: screen.name || screen.title }
    };
  }

  // ---------------------------------------------------------------------------
  // Node -> RN component mapping
  // ---------------------------------------------------------------------------

  _convertNode(node, ds) {
    if (!node) return null;

    switch (node.type) {
      case 'container': return this._convertContainer(node, ds);
      case 'text':      return this._convertText(node, ds);
      case 'button':    return this._convertButton(node, ds);
      case 'input':     return this._convertInput(node, ds);
      case 'checkbox':  return this._convertCheckbox(node, ds);
      case 'switch':    return this._convertSwitch(node, ds);
      case 'select':    return this._convertSelect(node, ds);
      case 'icon':      return this._convertIcon(node, ds);
      case 'image':     return this._convertImage(node, ds);
      case 'card':      return this._convertCard(node, ds);
      case 'chart':     return this._convertChart(node, ds);
      case 'table':     return this._convertList(node, ds);
      case 'divider':   return this._convertDivider(node, ds);
      default:          return null;
    }
  }

  _convertContainer(node, ds) {
    const children = (node.children || [])
      .map(c => this._convertNode(c, ds))
      .filter(Boolean);

    if (children.length === 0) return null;

    const style = {};
    if (node.layout) {
      style.flexDirection = node.layout.direction === 'HORIZONTAL' ? 'row' : 'column';
      if (node.layout.gap) style.gap = node.layout.gap;
      if (node.layout.align) {
        style.justifyContent = this._mapAlign(node.layout.align);
      }
      if (node.layout.crossAlign) {
        style.alignItems = this._mapAlign(node.layout.crossAlign);
      }
      if (node.layout.padding) {
        const p = node.layout.padding;
        style.paddingTop = p.top || 0;
        style.paddingRight = p.right || 0;
        style.paddingBottom = p.bottom || 0;
        style.paddingLeft = p.left || 0;
      }
    }

    if (node.dimensions) {
      if (node.dimensions.width) style.width = node.dimensions.width;
      if (node.dimensions.height) style.height = node.dimensions.height;
    }

    this._applyStyling(style, node);

    return { type: 'View', props: {}, style, children };
  }

  _convertText(node, ds) {
    const style = {};

    switch (node.variant) {
      case 'h1':
        style.fontSize = ds.fontSizes.h1;
        style.fontWeight = String(ds.fontWeights.bold);
        style.color = ds.colors.text;
        break;
      case 'h2':
        style.fontSize = ds.fontSizes.h2;
        style.fontWeight = String(ds.fontWeights.semibold);
        style.color = ds.colors.text;
        break;
      case 'h3':
        style.fontSize = ds.fontSizes.h3;
        style.fontWeight = String(ds.fontWeights.semibold);
        style.color = ds.colors.text;
        break;
      default:
        style.fontSize = ds.fontSizes.body;
        style.fontWeight = String(ds.fontWeights.normal);
        style.color = ds.colors.textSecondary;
    }

    // Override with Figma-extracted styling when available
    if (node.styling) {
      if (node.styling.color) style.color = node.styling.color;
      if (node.styling.fontSize) style.fontSize = parseInt(node.styling.fontSize, 10);
      if (node.styling.fontWeight) style.fontWeight = String(node.styling.fontWeight);
      if (node.styling.fontFamily) style.fontFamily = node.styling.fontFamily;
      if (node.styling.letterSpacing) style.letterSpacing = parseFloat(node.styling.letterSpacing);
      if (node.styling.lineHeight) style.lineHeight = parseInt(node.styling.lineHeight, 10);
      if (node.styling.textAlign) style.textAlign = node.styling.textAlign;
    }

    return {
      type: 'Text',
      props: { text: node.content || '' },
      style
    };
  }

  _convertButton(node, ds) {
    const bg = node.styling?.backgroundColor || node.styling?.background || ds.colors.primary;
    const padV = node.layout?.padding?.top || (node.styling?.paddingTop ? parseInt(node.styling.paddingTop, 10) : null) || 12;
    const padH = node.layout?.padding?.left || (node.styling?.paddingLeft ? parseInt(node.styling.paddingLeft, 10) : null) || 24;
    const style = {
      backgroundColor: bg,
      borderColor: bg,
      paddingVertical: padV,
      paddingHorizontal: padH,
      borderRadius: ds.borderRadius,
      alignItems: 'center'
    };
    this._applyStyling(style, node);
    return {
      type: 'Button',
      props: { title: node.label || 'Button', primary: true },
      style
    };
  }

  _convertInput(node, ds) {
    const props = {
      placeholder: node.placeholder || '',
      name: (node.placeholder || '').toLowerCase().replace(/[^a-z0-9]/g, '_'),
      label: node.placeholder || ''
    };

    if (node.fieldType === 'password') {
      props.secureTextEntry = true;
    }
    if (node.fieldType === 'email') {
      props.keyboardType = 'email-address';
    }
    if (node.fieldType === 'number') {
      props.keyboardType = 'numeric';
    }
    if (node.fieldType === 'tel') {
      props.keyboardType = 'phone-pad';
    }

    const inputPad = node.layout?.padding?.top || (node.styling?.paddingTop ? parseInt(node.styling.paddingTop, 10) : null) || 12;
    const style = {
      borderWidth: 1,
      borderColor: ds.colors.border,
      borderRadius: ds.borderRadius,
      padding: inputPad,
      fontSize: ds.fontSizes.body,
      color: ds.colors.text,
      backgroundColor: ds.colors.card
    };
    this._applyStyling(style, node);
    return { type: 'TextInput', props, style };
  }

  _convertCheckbox(node, ds) {
    const style = { marginVertical: 8 };
    this._applyStyling(style, node);
    return { type: 'Checkbox', props: { label: node.label || '' }, style };
  }

  _convertSwitch(node, ds) {
    const style = { marginVertical: 8 };
    this._applyStyling(style, node);
    return {
      type: 'Switch',
      props: { label: node.label || '', trackColor: { true: ds.colors.primary, false: ds.colors.border } },
      style
    };
  }

  _convertSelect(node, ds) {
    const style = {
      borderWidth: 1,
      borderColor: ds.colors.border,
      borderRadius: ds.borderRadius,
      padding: 12,
      backgroundColor: ds.colors.card
    };
    this._applyStyling(style, node);
    return { type: 'Picker', props: { placeholder: node.placeholder || 'Select...' }, style };
  }

  _convertIcon(node, ds) {
    const name = (node.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const size = node.dimensions?.width || 24;
    const color = node.styling?.color || ds.colors.text;

    // Map common Figma icon names to Ionicons equivalents
    const ioniconsMap = {
      home: 'home-outline', house: 'home-outline',
      search: 'search-outline', magnify: 'search-outline',
      settings: 'settings-outline', gear: 'settings-outline', cog: 'settings-outline',
      user: 'person-outline', person: 'person-outline', profile: 'person-outline', account: 'person-outline',
      bell: 'notifications-outline', notification: 'notifications-outline', alert: 'notifications-outline',
      heart: 'heart-outline', like: 'heart-outline', favorite: 'heart-outline',
      star: 'star-outline',
      cart: 'cart-outline', shoppingcart: 'cart-outline', bag: 'bag-outline',
      menu: 'menu-outline', hamburger: 'menu-outline',
      close: 'close-outline', x: 'close-outline',
      back: 'arrow-back-outline', arrowleft: 'arrow-back-outline', chevronleft: 'chevron-back-outline',
      forward: 'arrow-forward-outline', arrowright: 'arrow-forward-outline', chevronright: 'chevron-forward-outline',
      plus: 'add-outline', add: 'add-outline',
      minus: 'remove-outline',
      check: 'checkmark-outline', checkmark: 'checkmark-outline',
      edit: 'create-outline', pencil: 'create-outline',
      delete: 'trash-outline', trash: 'trash-outline',
      share: 'share-outline',
      download: 'download-outline',
      upload: 'cloud-upload-outline',
      camera: 'camera-outline',
      image: 'image-outline', photo: 'image-outline',
      mail: 'mail-outline', email: 'mail-outline', envelope: 'mail-outline',
      phone: 'call-outline', call: 'call-outline',
      location: 'location-outline', map: 'map-outline', pin: 'location-outline',
      calendar: 'calendar-outline', date: 'calendar-outline',
      clock: 'time-outline', time: 'time-outline',
      lock: 'lock-closed-outline', password: 'lock-closed-outline',
      eye: 'eye-outline', show: 'eye-outline',
      eyeoff: 'eye-off-outline', hide: 'eye-off-outline',
      filter: 'filter-outline',
      sort: 'swap-vertical-outline',
      refresh: 'refresh-outline',
      info: 'information-circle-outline',
      warning: 'warning-outline',
      error: 'alert-circle-outline',
    };

    const matched = ioniconsMap[name];
    if (matched) {
      return {
        type: 'icon',
        props: { name: matched, library: 'Ionicons', size, color },
        style: {}
      };
    }

    // Fallback: render as a generic placeholder
    return {
      type: 'icon',
      props: { name: 'ellipse-outline', library: 'Ionicons', size, color, accessibilityLabel: node.name || 'icon' },
      style: {}
    };
  }

  _convertImage(node, ds) {
    const style = { borderRadius: ds.borderRadius };
    if (node.dimensions) {
      style.width = node.dimensions.width;
      style.height = node.dimensions.height;
    } else {
      style.width = '100%';
      style.height = 200;
    }
    this._applyStyling(style, node);
    const imageUri = node.assetUrl || node.styling?.imageUrl || null;
    return {
      type: 'Image',
      props: {
        source: imageUri ? { uri: imageUri } : undefined,
        accessibilityLabel: node.name || 'image'
      },
      style
    };
  }

  _convertCard(node, ds) {
    const children = (node.children || [])
      .map(c => this._convertNode(c, ds))
      .filter(Boolean);

    const style = {
      backgroundColor: ds.colors.card,
      borderRadius: ds.borderRadius,
      padding: ds.spacing,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 12
    };
    this._applyStyling(style, node);

    return {
      type: 'Card',
      props: {},
      style,
      children: children.length > 0 ? children : undefined
    };
  }

  _convertChart(node, ds) {
    return {
      type: 'View',
      props: { accessibilityLabel: node.name || 'chart' },
      style: {
        height: 200,
        backgroundColor: ds.colors.card,
        borderRadius: ds.borderRadius,
        padding: ds.spacing,
        justifyContent: 'center',
        alignItems: 'center'
      },
      children: [{
        type: 'Text',
        props: { text: node.name || 'Chart' },
        style: { color: ds.colors.textSecondary, fontSize: ds.fontSizes.body }
      }]
    };
  }

  _convertList(node, ds) {
    return {
      type: 'FlatList',
      props: { data: [], accessibilityLabel: node.name || 'list' },
      style: { flex: 1 }
    };
  }

  _convertDivider(node, ds) {
    const style = { height: 1, backgroundColor: ds.colors.border, marginVertical: 8 };
    this._applyStyling(style, node);
    return { type: 'Divider', props: {}, style };
  }

  // ---------------------------------------------------------------------------
  // Navigation inference
  // ---------------------------------------------------------------------------

  _inferNavigation(screens) {
    const screenNames = screens.map(s => s.name);

    if (screens.length >= 4) {
      return { type: 'tab', screens: screenNames };
    }

    return { type: 'stack', screens: screenNames };
  }

  // ---------------------------------------------------------------------------
  // Screen type inference
  // ---------------------------------------------------------------------------

  _inferScreenType(layoutTree) {
    if (!layoutTree || layoutTree.length === 0) return 'detail';

    const types = this._collectTypes(layoutTree);

    const hasInputs = types.includes('input') || types.includes('checkbox') ||
                      types.includes('switch') || types.includes('select');
    const hasLists = types.includes('table');
    const hasCharts = types.includes('chart');

    if (hasInputs && !hasLists) return 'form';
    if (hasLists && !hasInputs) return 'list';
    if (hasCharts) return 'dashboard';
    return 'detail';
  }

  _collectTypes(nodes) {
    const types = [];
    for (const node of nodes) {
      if (node.type) types.push(node.type);
      if (node.children) types.push(...this._collectTypes(node.children));
    }
    return types;
  }

  // ---------------------------------------------------------------------------
  // Design system resolution
  // ---------------------------------------------------------------------------

  _resolveDesignSystem(designSystem) {
    const lightColors = tokens.colors.light;

    const colors = {
      primary: designSystem?.colors?.primary || lightColors.primary,
      text: designSystem?.colors?.text || lightColors.foreground,
      textSecondary: designSystem?.colors?.textSecondary || lightColors.mutedForeground,
      background: designSystem?.colors?.background || lightColors.background,
      card: designSystem?.colors?.cardBackground || lightColors.card,
      border: designSystem?.colors?.border || lightColors.border,
    };

    const fontSizes = {
      h1: parseInt(designSystem?.typography?.fontSize?.h1 || tokens.typography.fontSize['3xl'], 10),
      h2: parseInt(designSystem?.typography?.fontSize?.h2 || tokens.typography.fontSize['2xl'], 10),
      h3: parseInt(designSystem?.typography?.fontSize?.h3 || tokens.typography.fontSize.xl, 10),
      body: parseInt(designSystem?.typography?.fontSize?.base || tokens.typography.fontSize.base, 10),
    };

    const fontWeights = {
      bold: designSystem?.typography?.fontWeight?.title || tokens.typography.fontWeight.bold,
      semibold: designSystem?.typography?.fontWeight?.label || tokens.typography.fontWeight.semibold,
      normal: designSystem?.typography?.fontWeight?.input || tokens.typography.fontWeight.normal,
    };

    const spacing = parseInt(designSystem?.spacing?.container || tokens.spacing.base, 10);
    const borderRadius = parseInt(designSystem?.borderRadius?.input || tokens.borderRadius.md, 10);

    return { colors, fontSizes, fontWeights, spacing, borderRadius };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Merge Figma-extracted visual styling into a RN style object.
   * Called at the end of each _convert* method so Figma values
   * override design-system defaults when present.
   */
  _applyStyling(style, node) {
    if (!node || !node.styling) return;
    const s = node.styling;
    if (s.backgroundColor) style.backgroundColor = s.backgroundColor;

    // Gradient background passthrough (ComponentRenderer parses CSS gradients)
    if (s.background && typeof s.background === 'string' && s.background.includes('gradient')) {
      style.background = s.background;
    }

    // Border radius: number or compound string ("8px 8px 0px 0px" -> per-corner)
    if (s.borderRadius !== undefined) {
      if (typeof s.borderRadius === 'string' && s.borderRadius.includes(' ')) {
        const parts = s.borderRadius.split(/\s+/).map(v => parseInt(v, 10) || 0);
        if (parts.length === 4) {
          style.borderTopLeftRadius = parts[0];
          style.borderTopRightRadius = parts[1];
          style.borderBottomRightRadius = parts[2];
          style.borderBottomLeftRadius = parts[3];
        } else {
          style.borderRadius = parts[0] || 0;
        }
      } else {
        style.borderRadius = s.borderRadius;
      }
    }

    if (s.borderColor) {
      style.borderColor = s.borderColor;
      style.borderWidth = s.borderWidth || 1;
    }

    // CSS boxShadow string parsing ("0px 2px 8px rgba(...)")
    if (s.boxShadow && typeof s.boxShadow === 'string') {
      const match = s.boxShadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+(rgba?\([^)]+\))/);
      if (match) {
        style.shadowOffset = { width: parseFloat(match[1]), height: parseFloat(match[2]) };
        style.shadowRadius = parseFloat(match[3]);
        style.shadowColor = match[4];
        style.shadowOpacity = 1; // opacity is embedded in rgba
        style.elevation = Math.max(1, Math.round(parseFloat(match[3]) / 2));
      }
    } else if (s.shadowColor) {
      style.shadowColor = s.shadowColor;
      style.shadowOffset = { width: s.shadowOffsetX || 0, height: s.shadowOffsetY || 0 };
      style.shadowOpacity = s.shadowOpacity || 0.1;
      style.shadowRadius = s.shadowRadius || 4;
      style.elevation = 2;
    }

    // Padding from styling
    if (s.paddingTop !== undefined) style.paddingTop = parseInt(s.paddingTop, 10) || 0;
    if (s.paddingRight !== undefined) style.paddingRight = parseInt(s.paddingRight, 10) || 0;
    if (s.paddingBottom !== undefined) style.paddingBottom = parseInt(s.paddingBottom, 10) || 0;
    if (s.paddingLeft !== undefined) style.paddingLeft = parseInt(s.paddingLeft, 10) || 0;

    // Dimensions from styling
    if (s.width !== undefined) style.width = typeof s.width === 'string' ? parseInt(s.width, 10) : s.width;
    if (s.height !== undefined) style.height = typeof s.height === 'string' ? parseInt(s.height, 10) : s.height;

    if (s.opacity !== undefined && s.opacity < 1) style.opacity = s.opacity;
  }

  _mapAlign(figmaAlign) {
    const mapping = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between',
    };
    return mapping[figmaAlign] || 'flex-start';
  }
}

module.exports = FigmaToMobileConverter;
