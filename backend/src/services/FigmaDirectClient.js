/**
 * FigmaDirectClient - Direct Figma REST API Client
 *
 * Uses Figma's REST API directly instead of MCP for more reliable extraction.
 * This avoids the complexity of spawning a separate MCP server process.
 *
 * API Docs: https://www.figma.com/developers/api
 */
class FigmaDirectClient {
  constructor() {
    this.baseUrl = 'https://api.figma.com/v1';
    this.extractedAssets = [];
  }

  /**
   * Parse Figma URL to extract file key and node ID
   * @param {string} url - Figma URL
   * @returns {Object} { fileKey, nodeId, type }
   */
  parseUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid Figma URL');
    }

    const normalizedUrl = url.trim();

    // Match file/design URL pattern
    const urlMatch = normalizedUrl.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
    if (!urlMatch) {
      throw new Error(`Could not parse Figma URL: ${url}`);
    }

    const fileKey = urlMatch[2];

    // Extract node ID from URL if present (e.g., ?node-id=1-2 or ?node-id=567-2626)
    const nodeIdMatch = normalizedUrl.match(/node-id=([^&]+)/);
    let nodeId = null;
    if (nodeIdMatch) {
      // URL encodes ':' as '-', so convert back
      nodeId = decodeURIComponent(nodeIdMatch[1]).replace(/-/g, ':');
    }

    const type = normalizedUrl.includes('/proto/') ? 'prototype' : 'design';

    return { fileKey, nodeId, type };
  }

  /**
   * Make authenticated request to Figma API
   * @param {string} endpoint - API endpoint
   * @param {string} accessToken - Figma access token
   * @returns {Promise<Object>} API response
   */
  async apiRequest(endpoint, accessToken) {
    if (!accessToken) {
      throw new Error('Figma access token is required');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Figma-Token': accessToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 403) {
        throw new Error('Figma access denied - check your access token and file permissions');
      }
      if (response.status === 404) {
        throw new Error('Figma file not found - check the URL and ensure you have access');
      }
      throw new Error(`Figma API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get file metadata and structure
   * @param {string} fileKey - Figma file key
   * @param {string} accessToken - Figma access token
   * @returns {Promise<Object>} File data
   */
  async getFile(fileKey, accessToken) {
    console.log('[FigmaDirectClient] Fetching file:', fileKey);
    return this.apiRequest(`/files/${fileKey}`, accessToken);
  }

  /**
   * Get specific nodes from a file
   * @param {string} fileKey - Figma file key
   * @param {string} nodeIds - Comma-separated node IDs
   * @param {string} accessToken - Figma access token
   * @returns {Promise<Object>} Nodes data
   */
  async getNodes(fileKey, nodeIds, accessToken) {
    console.log('[FigmaDirectClient] Fetching nodes:', nodeIds);
    return this.apiRequest(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIds)}`, accessToken);
  }

  /**
   * Get file styles (colors, text styles, effects)
   * @param {string} fileKey - Figma file key
   * @param {string} accessToken - Figma access token
   * @returns {Promise<Object>} Styles data
   */
  async getStyles(fileKey, accessToken) {
    console.log('[FigmaDirectClient] Fetching styles');
    return this.apiRequest(`/files/${fileKey}/styles`, accessToken);
  }

  /**
   * Get file images (render frames as images)
   * @param {string} fileKey - Figma file key
   * @param {string} nodeIds - Comma-separated node IDs
   * @param {string} accessToken - Figma access token
   * @param {Object} options - Render options
   * @returns {Promise<Object>} Image URLs
   */
  async getImages(fileKey, nodeIds, accessToken, options = {}) {
    const params = new URLSearchParams({
      ids: nodeIds,
      format: options.format || 'png',
      scale: options.scale || 1
    });
    console.log('[FigmaDirectClient] Fetching images');
    return this.apiRequest(`/images/${fileKey}?${params}`, accessToken);
  }

  /**
   * Get the full, untruncated Figma file data with geometry paths.
   * Used by the precise pipeline -- no truncation, no averaging.
   * @param {string} fileKey - Figma file key
   * @param {string} accessToken - Figma access token
   * @returns {Promise<Object>} Complete Figma file data
   */
  async getRawFileData(fileKey, accessToken) {
    const token = accessToken || process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_API_KEY;
    console.log('[FigmaDirectClient] Fetching raw file data (untruncated):', fileKey);
    return this.apiRequest(`/files/${fileKey}?geometry=paths`, token);
  }

  /**
   * Extract colors from Figma file with gradient support
   * @param {Object} fileData - Figma file data
   * @returns {Object} Color tokens including gradients
   */
  extractColors(fileData) {
    const colors = {
      primary: '#1a73e8',
      secondary: '#374151',
      background: '#ffffff',
      cardBackground: '#ffffff',
      cardBorder: '#e5e7eb',
      text: '#1f2937',
      textSecondary: '#6b7280',
      labelText: '#374151',
      border: '#d1d5db',
      focus: '#1a73e8',
      info: '#3b82f6',
      infoBackground: '#eff6ff',
      error: '#dc2626',
      success: '#16a34a',
      warning: '#f59e0b'
    };

    const gradients = [];
    const colorFrequency = {};

    // Extract from document styles with name-based matching
    if (fileData.styles) {
      Object.entries(fileData.styles).forEach(([key, style]) => {
        if (style.styleType === 'FILL') {
          const name = ((style.name || '') + ' ' + (style.description || '')).toLowerCase();
          const color = this.findColorFromStyleKey(fileData, key);
          if (!color) return;

          if (name.includes('primary')) colors.primary = color;
          else if (name.includes('secondary')) colors.secondary = color;
          else if (name.includes('background') || name.includes('bg')) colors.background = color;
          else if (name.includes('surface') || name.includes('card')) colors.cardBackground = color;
          else if (name.includes('error') || name.includes('danger')) colors.error = color;
          else if (name.includes('success')) colors.success = color;
          else if (name.includes('warning')) colors.warning = color;
          else if (name.includes('info')) colors.info = color;
          else if (name.includes('text') && name.includes('secondary')) colors.textSecondary = color;
          else if (name.includes('text')) colors.text = color;
          else if (name.includes('border')) colors.border = color;
        }
      });
    }

    // Deep search through document for fills and gradients
    this.walkNodes(fileData.document, (node) => {
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach(fill => {
          if (fill.visible === false) return;
          if (fill.type === 'SOLID' && fill.color) {
            const hex = this.rgbToHex(fill.color);
            if (hex) {
              colorFrequency[hex] = (colorFrequency[hex] || 0) + 1;
            }
          } else if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') && fill.gradientStops) {
            const stops = fill.gradientStops.map(s => ({
              color: this.rgbToHex(s.color),
              position: Math.round(s.position * 100)
            }));
            const type = fill.type === 'GRADIENT_LINEAR' ? 'linear' : 'radial';
            let angle = 135;
            if (fill.gradientHandlePositions && fill.gradientHandlePositions.length >= 2) {
              const h = fill.gradientHandlePositions;
              angle = Math.round(Math.atan2(h[1].y - h[0].y, h[1].x - h[0].x) * 180 / Math.PI + 90);
            }
            const css = type === 'linear'
              ? `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
              : `radial-gradient(circle, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
            gradients.push({ type, angle, stops, css, nodeName: node.name });
          }
        });
      }
    });

    // Sort colors by frequency and apply to roles intelligently
    const sorted = Object.entries(colorFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex)
      .filter(hex => hex !== '#ffffff' && hex !== '#000000');

    if (sorted.length > 0 && colors.primary === '#1a73e8') colors.primary = sorted[0];
    if (sorted.length > 1 && colors.secondary === '#374151') colors.secondary = sorted[1];

    // Detect background from large frames
    const bgColors = [];
    this.walkNodes(fileData.document, (node) => {
      if (node.type === 'FRAME' && node.absoluteBoundingBox) {
        const area = (node.absoluteBoundingBox.width || 0) * (node.absoluteBoundingBox.height || 0);
        if (area > 100000 && node.backgroundColor) {
          bgColors.push({ color: this.rgbToHex(node.backgroundColor), area });
        }
      }
    });
    if (bgColors.length > 0) {
      bgColors.sort((a, b) => b.area - a.area);
      colors.background = bgColors[0].color || colors.background;
    }

    colors.gradients = gradients;

    return colors;
  }

  /**
   * Find color value from a style key by searching nodes that reference it
   */
  findColorFromStyleKey(fileData, styleKey) {
    let foundColor = null;
    this.walkNodes(fileData.document, (node) => {
      if (foundColor) return;
      if (node.styles) {
        const matchesKey = Object.values(node.styles).includes(styleKey);
        if (matchesKey && node.fills) {
          const solidFill = node.fills.find(f => f.type === 'SOLID' && f.color);
          if (solidFill) foundColor = this.rgbToHex(solidFill.color);
        }
      }
    });
    return foundColor;
  }

  /**
   * Extract typography from Figma file with actual sizes and weights
   * @param {Object} fileData - Figma file data
   * @returns {Object} Typography tokens
   */
  extractTypography(fileData) {
    const typography = {
      fontFamily: 'Inter, system-ui, sans-serif',
      pageTitle: { size: '24px', weight: 600, lineHeight: '1.2' },
      pageSubtitle: { size: '14px', weight: 400, lineHeight: '1.5' },
      sectionHeader: { size: '18px', weight: 600, lineHeight: '1.3' },
      sectionDescription: { size: '14px', weight: 400, lineHeight: '1.5' },
      fieldLabel: { size: '14px', weight: 500, lineHeight: '1.4' },
      inputText: { size: '14px', weight: 400, lineHeight: '1.5' },
      helperText: { size: '12px', weight: 400, lineHeight: '1.4' },
      buttonText: { size: '14px', weight: 500, lineHeight: '1' }
    };

    // Collect all text styles from the document
    const textStyles = [];
    const fontFamilyCount = {};

    this.walkNodes(fileData.document, (node) => {
      if (node.type === 'TEXT' && node.style) {
        const s = node.style;
        if (s.fontFamily) {
          fontFamilyCount[s.fontFamily] = (fontFamilyCount[s.fontFamily] || 0) + 1;
        }
        textStyles.push({
          family: s.fontFamily,
          size: s.fontSize,
          weight: s.fontWeight,
          lineHeight: s.lineHeightPx ? `${Math.round(s.lineHeightPx)}px` : (s.lineHeightPercent ? `${s.lineHeightPercent}%` : null),
          letterSpacing: s.letterSpacing,
          textCase: s.textCase,
          nodeName: (node.name || '').toLowerCase(),
          characters: (node.characters || '').substring(0, 50)
        });
      }
    });

    // Set primary font family from most used
    const topFont = Object.entries(fontFamilyCount).sort((a, b) => b[1] - a[1])[0];
    if (topFont) {
      typography.fontFamily = `${topFont[0]}, system-ui, sans-serif`;
    }

    // Also try styles map
    if (fileData.styles) {
      Object.values(fileData.styles).forEach(style => {
        if (style.styleType === 'TEXT' && style.fontFamily) {
          typography.fontFamily = `${style.fontFamily}, system-ui, sans-serif`;
        }
      });
    }

    // Map text styles to roles by size (largest = title, etc.)
    if (textStyles.length > 0) {
      const bySize = [...textStyles].filter(s => s.size).sort((a, b) => b.size - a.size);
      const uniqueSizes = [...new Set(bySize.map(s => s.size))];

      if (uniqueSizes[0]) {
        const style = bySize.find(s => s.size === uniqueSizes[0]);
        typography.pageTitle = { size: `${style.size}px`, weight: style.weight || 700, lineHeight: style.lineHeight || '1.2' };
      }
      if (uniqueSizes[1]) {
        const style = bySize.find(s => s.size === uniqueSizes[1]);
        typography.sectionHeader = { size: `${style.size}px`, weight: style.weight || 600, lineHeight: style.lineHeight || '1.3' };
      }
      if (uniqueSizes[2]) {
        const style = bySize.find(s => s.size === uniqueSizes[2]);
        typography.pageSubtitle = { size: `${style.size}px`, weight: style.weight || 400, lineHeight: style.lineHeight || '1.5' };
      }

      // Find label-like text (small, medium weight)
      const labelStyle = textStyles.find(s => s.nodeName.includes('label') || s.nodeName.includes('field'));
      if (labelStyle && labelStyle.size) {
        typography.fieldLabel = { size: `${labelStyle.size}px`, weight: labelStyle.weight || 500, lineHeight: labelStyle.lineHeight || '1.4' };
      }

      // Find button text
      const btnStyle = textStyles.find(s => s.nodeName.includes('button') || s.nodeName.includes('btn'));
      if (btnStyle && btnStyle.size) {
        typography.buttonText = { size: `${btnStyle.size}px`, weight: btnStyle.weight || 500, lineHeight: '1' };
      }
    }

    return typography;
  }

  /**
   * Extract components (forms, pages) from Figma file
   * @param {Object} fileData - Figma file data
   * @param {string} nodeId - Specific node to extract (optional)
   * @returns {Object} { forms, pages }
   */
  extractComponents(fileData, nodeId = null) {
    const forms = [];
    const pages = [];
    const mobileScreens = [];

    // If specific node requested, find and process it
    if (nodeId) {
      const targetNode = this.findNodeById(fileData.document, nodeId);
      if (targetNode) {
        const result = this.processFrame(targetNode);
        if (result.forms) forms.push(...result.forms);
        if (result.pages) pages.push(...result.pages);
        if (result.mobileScreens) mobileScreens.push(...result.mobileScreens);

        // Check if node-scoped extraction returned enough data
        if (forms.length === 0 && pages.length <= 1 && mobileScreens.length === 0) {
          console.log('[FigmaDirectClient] Node-scoped extraction too shallow (' + pages.length + ' pages, ' + forms.length + ' forms, ' + mobileScreens.length + ' mobile), widening to full document...');
          forms.length = 0;
          pages.length = 0;
          mobileScreens.length = 0;
          // Fall through to full-document extraction below
        } else {
          return { forms, pages, mobileScreens };
        }
      }
    }

    // Process all pages in document
    if (fileData.document && fileData.document.children) {
      fileData.document.children.forEach(page => {
        if (page.type === 'CANVAS') {
          // Each canvas is a page in Figma
          const pageData = {
            id: `page_${this.sanitizeId(page.name)}`,
            name: page.name,
            title: page.name,
            route: `/${this.sanitizeId(page.name)}`,
            sections: []
          };

          // Process frames within the page
          if (page.children) {
            page.children.forEach(frame => {
              if (frame.type === 'FRAME') {
                // Check if this frame is a form
                if (this.looksLikeForm(frame)) {
                  forms.push(this.extractFormFromFrame(frame));
                }

                // Classify frame as mobile or web
                if (this.isMobileFrame(frame)) {
                  const bbox = frame.absoluteBoundingBox || {};
                  const width = bbox.width || 0;
                  const layoutTree = this.extractMobileLayoutTree(frame);
                  mobileScreens.push({
                    id: `mobile_${this.sanitizeId(frame.name)}`,
                    name: frame.name,
                    title: frame.name,
                    dimensions: { width: Math.round(bbox.width || 0), height: Math.round(bbox.height || 0) },
                    platform: (width >= 740 && width <= 840) ? 'tablet' : 'mobile',
                    layoutTree: layoutTree ? (Array.isArray(layoutTree) ? layoutTree : [layoutTree]) : [],
                    components: this.extractComponentsFromFrame(frame)
                  });
                } else {
                  // Add as a section to the web page
                  pageData.sections.push({
                    id: `section_${this.sanitizeId(frame.name)}`,
                    title: frame.name,
                    type: 'content',
                    components: this.extractComponentsFromFrame(frame)
                  });
                }
              }
            });
          }

          if (pageData.sections.length > 0) {
            pages.push(pageData);
          }
        }
      });
    }

    if (mobileScreens.length > 0) {
      console.log(`[FigmaDirectClient] Detected ${mobileScreens.length} mobile screens`);
    }

    return { forms, pages, mobileScreens };
  }

  /**
   * Find a node by ID in the document tree
   */
  findNodeById(node, nodeId, depth = 0) {
    if (!node || depth > 20) return null;

    if (node.id === nodeId) return node;

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, nodeId, depth + 1);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Check if a frame looks like a form with enhanced detection
   */
  looksLikeForm(frame) {
    const name = (frame.name || '').toLowerCase();
    const formKeywords = ['form', 'login', 'signup', 'sign up', 'register', 'contact',
      'checkout', 'payment', 'subscribe', 'settings', 'profile', 'edit', 'create',
      'add new', 'modal', 'dialog', 'survey', 'feedback', 'application'];
    if (formKeywords.some(kw => name.includes(kw))) {
      return true;
    }

    // Check if frame contains input-like elements
    let inputCount = 0;
    let buttonCount = 0;
    this.walkNodes(frame, node => {
      const nodeName = (node.name || '').toLowerCase();
      if (nodeName.includes('input') || nodeName.includes('field') ||
          nodeName.includes('textbox') || nodeName.includes('text field') ||
          nodeName.includes('textarea') || nodeName.includes('dropdown') ||
          nodeName.includes('select') || nodeName.includes('picker') ||
          nodeName.includes('toggle') || nodeName.includes('switch') ||
          nodeName.includes('radio') || nodeName.includes('checkbox')) {
        inputCount++;
      }
      if (nodeName.includes('button') || nodeName.includes('submit') || nodeName.includes('save')) {
        buttonCount++;
      }
    });

    return inputCount >= 2 || (inputCount >= 1 && buttonCount >= 1);
  }

  /**
   * Extract form data from a frame
   */
  extractFormFromFrame(frame) {
    const form = {
      id: `form_${this.sanitizeId(frame.name)}`,
      name: frame.name,
      description: '',
      fields: [],
      actions: []
    };

    // Walk through frame to find inputs and buttons
    this.walkNodes(frame, node => {
      const nodeName = (node.name || '').toLowerCase();

      // Detect input fields
      if (nodeName.includes('input') || nodeName.includes('field') ||
          nodeName.includes('textbox') || node.type === 'TEXT' && this.looksLikeLabel(node)) {
        const fieldType = this.detectFieldType(node);
        form.fields.push({
          id: `field_${this.sanitizeId(node.name)}`,
          name: this.sanitizeId(node.name),
          type: fieldType,
          label: node.name,
          placeholder: '',
          required: false
        });
      }

      // Detect buttons
      if (nodeName.includes('button') || nodeName.includes('submit') ||
          nodeName.includes('send') || nodeName.includes('cancel')) {
        const isSubmit = nodeName.includes('submit') || nodeName.includes('send') ||
                         nodeName.includes('save') || nodeName.includes('create');
        form.actions.push({
          type: isSubmit ? 'submit' : 'cancel',
          label: node.name
        });
      }
    });

    // Ensure at least submit/cancel actions
    if (form.actions.length === 0) {
      form.actions = [
        { type: 'submit', label: 'Submit' },
        { type: 'cancel', label: 'Cancel' }
      ];
    }

    return form;
  }

  /**
   * Build a lightweight layout tree from a Figma frame, preserving
   * parent-child nesting, auto-layout direction/spacing/alignment,
   * and component classification. Used for mobile screen extraction
   * so LLM experts receive structural hierarchy instead of a flat list.
   *
   * @param {Object} node - Figma node to process
   * @param {number} depth - Current recursion depth (capped at 8)
   * @returns {Object|Object[]|null} Layout tree node(s) or null if pruned
   */
  extractMobileLayoutTree(node, depth = 0) {
    if (!node || depth > 8) return null;
    if (node.visible === false) return null;

    const nodeName = (node.name || '').toLowerCase();

    // -- Leaf detection (same heuristics as extractComponentsFromFrame) --

    if (node.type === 'TEXT') {
      const style = node.style || {};
      const variant = style.fontSize >= 24 ? 'h1' : style.fontSize >= 18 ? 'h2' : style.fontSize >= 16 ? 'h3' : 'body';
      const leaf = { type: 'text', content: node.characters || node.name, variant };
      const styling = {};
      if (style.fontSize) styling.fontSize = `${style.fontSize}px`;
      if (style.fontWeight) styling.fontWeight = style.fontWeight;
      const fill = node.fills?.[0];
      if (fill?.color) styling.color = this.rgbToHex(fill.color);
      if (Object.keys(styling).length > 0) leaf.styling = styling;
      return leaf;
    }

    if (node.type === 'VECTOR' || (nodeName.includes('icon') && node.type !== 'TEXT' && !node.children?.length)) {
      return { type: 'icon', name: node.name };
    }

    if ((node.type === 'RECTANGLE' || node.type === 'FRAME') && node.fills?.some(f => f.type === 'IMAGE')) {
      const imgNode = { type: 'image', name: node.name };
      if (node.absoluteBoundingBox) {
        imgNode.dimensions = {
          width: Math.round(node.absoluteBoundingBox.width || 0),
          height: Math.round(node.absoluteBoundingBox.height || 0)
        };
      }
      const imgStyling = this._extractVisualStyling(node);
      if (imgStyling) imgNode.styling = imgStyling;
      return imgNode;
    }

    if ((nodeName.includes('button') || nodeName.includes('btn') || nodeName.includes('cta')) &&
        (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT')) {
      const btnText = this.getTextFromChildren(node);
      const leaf = { type: 'button', label: btnText || node.name };
      const btnVisual = this._extractVisualStyling(node);
      if (btnVisual) {
        // Keep "background" key for backward compat, merge in borderRadius/shadow
        leaf.styling = { background: btnVisual.backgroundColor, ...btnVisual };
      } else {
        const bgFill = node.fills?.find(f => f.type === 'SOLID' && f.color);
        if (bgFill) leaf.styling = { background: this.rgbToHex(bgFill.color) };
      }
      return leaf;
    }

    if ((nodeName.includes('chart') || nodeName.includes('graph')) && !node.children?.length) {
      return { type: 'chart', name: node.name };
    }

    if ((nodeName.includes('table') || nodeName.includes('grid') || nodeName.includes('list')) && !node.children?.length) {
      return { type: 'table', name: node.name };
    }

    // -- Input / interactive element detection --

    // Divider: thin rectangle or name-based
    if (node.type === 'RECTANGLE' || node.type === 'LINE') {
      const bbox = node.absoluteBoundingBox;
      const isThin = bbox && (bbox.height <= 2 || bbox.width <= 2);
      if (isThin || nodeName.includes('divider') || nodeName.includes('separator') || nodeName.includes('line')) {
        const divNode = { type: 'divider' };
        const divVisual = this._extractVisualStyling(node);
        if (divVisual) divNode.styling = divVisual;
        return divNode;
      }
    }

    // Checkbox
    if (nodeName.includes('checkbox') || nodeName.includes('check-box') ||
        nodeName.includes('agree') || nodeName.includes('terms') || nodeName.includes('remember')) {
      if (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'GROUP') {
        const cbNode = { type: 'checkbox', label: this.getTextFromChildren(node) || node.name };
        const cbVisual = this._extractVisualStyling(node);
        if (cbVisual) cbNode.styling = cbVisual;
        return cbNode;
      }
    }

    // Toggle / Switch
    if (nodeName.includes('toggle') || nodeName.includes('switch')) {
      if (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'GROUP') {
        const swNode = { type: 'switch', label: this.getTextFromChildren(node) || node.name };
        const swVisual = this._extractVisualStyling(node);
        if (swVisual) swNode.styling = swVisual;
        return swNode;
      }
    }

    // Dropdown / Select / Picker
    if (nodeName.includes('dropdown') || nodeName.includes('select') || nodeName.includes('picker') || nodeName.includes('combo')) {
      if (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT') {
        const selNode = { type: 'select', placeholder: this.getTextFromChildren(node) || node.name };
        const selVisual = this._extractVisualStyling(node);
        if (selVisual) selNode.styling = selVisual;
        return selNode;
      }
    }

    // Input field: name-based or structural heuristic (FRAME with border + limited height + text child)
    if (nodeName.includes('input') || nodeName.includes('field') || nodeName.includes('text-field') ||
        nodeName.includes('textfield') || nodeName.includes('search') || nodeName.includes('email') ||
        nodeName.includes('password') || nodeName.includes('phone')) {
      if (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT') {
        const fieldType = this.detectFieldType(node);
        const placeholder = this.getTextFromChildren(node) || node.name;
        const inputNode = { type: 'input', placeholder, fieldType };
        const inputVisual = this._extractVisualStyling(node);
        if (inputVisual) inputNode.styling = inputVisual;
        return inputNode;
      }
    }

    // Structural heuristic: FRAME with border stroke, limited height, and a text child
    if ((node.type === 'FRAME' || node.type === 'INSTANCE') && node.strokes?.length > 0) {
      const bbox = node.absoluteBoundingBox;
      if (bbox && bbox.height >= 30 && bbox.height <= 60) {
        const textChild = node.children?.find(c => c.type === 'TEXT');
        if (textChild) {
          const textColor = textChild.fills?.[0]?.color;
          const isGray = textColor && (textColor.r > 0.5 && textColor.g > 0.5 && textColor.b > 0.5);
          const textContent = (textChild.characters || '').toLowerCase();
          const isPlaceholder = isGray || textContent.includes('enter') || textContent.includes('type') ||
                                textContent.includes('search') || textContent.includes('placeholder');
          if (isPlaceholder) {
            const fieldType = this.detectFieldType(node);
            return { type: 'input', placeholder: textChild.characters || node.name, fieldType };
          }
        }
      }
    }

    // -- Container detection (FRAME/GROUP/COMPONENT_SET with children) --

    const isContainer = node.children && node.children.length > 0 &&
      (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' ||
       node.type === 'INSTANCE' || node.type === 'COMPONENT_SET' || node.type === 'SECTION');

    if (!isContainer) {
      // Card heuristic
      if (node.type === 'FRAME' && node.cornerRadius > 0 && node.effects?.some(e => e.type === 'DROP_SHADOW')) {
        const cardNode = { type: 'card', name: node.name };
        const cardVisual = this._extractVisualStyling(node);
        if (cardVisual) cardNode.styling = cardVisual;
        return cardNode;
      }
      return null;
    }

    // Recurse into children
    const children = [];
    for (const child of node.children) {
      const result = this.extractMobileLayoutTree(child, depth + 1);
      if (result) {
        if (Array.isArray(result)) {
          children.push(...result);
        } else {
          children.push(result);
        }
      }
    }

    // Skip empty containers
    if (children.length === 0) return null;

    // Flatten: single child + no meaningful auto-layout -> return child directly
    const hasAutoLayout = !!node.layoutMode;
    if (children.length === 1 && !hasAutoLayout) {
      return children[0];
    }

    // Build container node with layout properties
    const container = {
      type: 'container',
      name: node.name,
      children
    };

    // Only include layout object if there are meaningful values
    const layout = {};
    if (node.layoutMode) layout.direction = node.layoutMode;
    if (node.itemSpacing) layout.gap = node.itemSpacing;
    if (node.primaryAxisAlignItems) layout.align = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems) layout.crossAlign = node.counterAxisAlignItems;

    const pt = node.paddingTop || 0;
    const pr = node.paddingRight || 0;
    const pb = node.paddingBottom || 0;
    const pl = node.paddingLeft || 0;
    if (pt || pr || pb || pl) {
      layout.padding = { top: pt, right: pr, bottom: pb, left: pl };
    }

    if (Object.keys(layout).length > 0) {
      container.layout = layout;
    }

    // Include dimensions when available
    if (node.absoluteBoundingBox) {
      container.dimensions = {
        width: Math.round(node.absoluteBoundingBox.width || 0),
        height: Math.round(node.absoluteBoundingBox.height || 0)
      };
    }

    // Attach visual styling (background, border radius, shadow, etc.)
    const containerVisual = this._extractVisualStyling(node);
    if (containerVisual) container.styling = containerVisual;

    return container;
  }

  /**
   * Extract components from a frame for page sections with richer detection
   */
  extractComponentsFromFrame(frame) {
    const components = [];

    this.walkNodes(frame, (node, depth) => {
      if (depth > 5) return;

      const nodeName = (node.name || '').toLowerCase();

      // Text content
      if (node.type === 'TEXT') {
        const style = node.style || {};
        const variant = style.fontSize >= 24 ? 'h1' : style.fontSize >= 18 ? 'h2' : style.fontSize >= 16 ? 'h3' : 'body';
        components.push({
          type: 'text',
          content: node.characters || node.name,
          variant,
          styling: {
            fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
            fontWeight: style.fontWeight,
            color: node.fills?.[0]?.color ? this.rgbToHex(node.fills[0].color) : undefined
          }
        });
      }

      // Buttons - detect by name or by component type
      if ((nodeName.includes('button') || nodeName.includes('btn') || nodeName.includes('cta')) &&
          (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT')) {
        const btnText = this.getTextFromChildren(node);
        const bgFill = node.fills?.find(f => f.type === 'SOLID' && f.color);
        components.push({
          type: 'button',
          label: btnText || node.name,
          styling: {
            background: bgFill ? this.rgbToHex(bgFill.color) : undefined,
            borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : undefined,
            padding: node.paddingLeft ? `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft}px` : undefined
          }
        });
      }

      // Images - detect IMAGE fills or image-named nodes
      if ((node.type === 'RECTANGLE' || node.type === 'FRAME') && node.fills?.some(f => f.type === 'IMAGE')) {
        const imageRef = node.fills.find(f => f.type === 'IMAGE')?.imageRef;
        components.push({
          type: 'image',
          name: node.name,
          imageRef,
          dimensions: node.absoluteBoundingBox ? {
            width: Math.round(node.absoluteBoundingBox.width),
            height: Math.round(node.absoluteBoundingBox.height)
          } : undefined
        });
        if (imageRef) {
          this.extractedAssets.push({ type: 'image', ref: imageRef, name: node.name });
        }
      }

      // Icons (vectors or small components with icon in name)
      if (node.type === 'VECTOR' || (nodeName.includes('icon') && node.type !== 'TEXT')) {
        components.push({
          type: 'icon',
          name: node.name,
          dimensions: node.absoluteBoundingBox ? {
            width: Math.round(node.absoluteBoundingBox.width),
            height: Math.round(node.absoluteBoundingBox.height)
          } : undefined
        });
      }

      // Cards - frames with corner radius and shadow
      if (node.type === 'FRAME' && !nodeName.includes('button') && node.cornerRadius > 0 && node.effects?.some(e => e.type === 'DROP_SHADOW')) {
        components.push({
          type: 'card',
          name: node.name,
          styling: {
            borderRadius: `${node.cornerRadius}px`,
            shadow: this.extractShadow(node.effects)
          }
        });
      }

      // Tables - detect by grid-like children arrangement
      if (nodeName.includes('table') || nodeName.includes('grid') || nodeName.includes('list')) {
        components.push({
          type: 'table',
          name: node.name
        });
      }

      // Charts
      if (nodeName.includes('chart') || nodeName.includes('graph') || nodeName.includes('analytics')) {
        components.push({
          type: 'chart',
          name: node.name,
          chartType: nodeName.includes('bar') ? 'bar' : nodeName.includes('line') ? 'line' : nodeName.includes('pie') ? 'pie' : 'bar'
        });
      }
    });

    return components;
  }

  /**
   * Get text content from a node's children
   */
  getTextFromChildren(node) {
    let text = '';
    this.walkNodes(node, (child) => {
      if (child.type === 'TEXT' && child.characters) {
        text = text || child.characters;
      }
    });
    return text;
  }

  /**
   * Extract CSS shadow from Figma effects
   */
  extractShadow(effects) {
    if (!effects) return null;
    const shadow = effects.find(e => e.type === 'DROP_SHADOW' && e.visible !== false);
    if (!shadow) return null;
    const { offset, radius, color } = shadow;
    const x = offset?.x || 0;
    const y = offset?.y || 0;
    const r = radius || 0;
    const a = color?.a || 0.1;
    const hex = color ? this.rgbToHex(color) : '#000000';
    return `${x}px ${y}px ${r}px rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a.toFixed(2)})`;
  }

  /**
   * Walk through all nodes in a tree
   */
  walkNodes(node, callback, depth = 0) {
    if (!node || depth > 15) return;

    callback(node, depth);

    if (node.children) {
      node.children.forEach(child => {
        this.walkNodes(child, callback, depth + 1);
      });
    }
  }

  /**
   * Check if a text node looks like a label
   */
  looksLikeLabel(node) {
    const text = (node.characters || node.name || '').toLowerCase();
    return text.includes(':') || text.endsWith('name') || text.endsWith('email') ||
           text.endsWith('phone') || text.endsWith('address') || text.endsWith('password');
  }

  /**
   * Detect field type from node with extended patterns
   */
  detectFieldType(node) {
    const name = (node.name || '').toLowerCase();
    const chars = (node.characters || '').toLowerCase();
    const combined = name + ' ' + chars;

    if (combined.includes('email') || combined.includes('e-mail')) return 'email';
    if (combined.includes('password') || combined.includes('passwd')) return 'password';
    if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile')) return 'tel';
    if (combined.includes('amount') || combined.includes('price') || combined.includes('cost') || combined.includes('quantity') || combined.includes('qty')) return 'number';
    if (combined.includes('date') || combined.includes('birthday') || combined.includes('dob')) return 'date';
    if (combined.includes('time') && combined.includes('date')) return 'datetime-local';
    if (combined.includes('textarea') || combined.includes('message') || combined.includes('description') || combined.includes('comment') || combined.includes('notes') || combined.includes('bio')) return 'textarea';
    if (combined.includes('checkbox') || combined.includes('agree') || combined.includes('accept') || combined.includes('terms') || combined.includes('remember')) return 'checkbox';
    if (combined.includes('toggle') || combined.includes('switch')) return 'switch';
    if (combined.includes('radio')) return 'radio';
    if (combined.includes('select') || combined.includes('dropdown') || combined.includes('choice') || combined.includes('country') || combined.includes('state') || combined.includes('category')) return 'select';
    if (combined.includes('file') || combined.includes('upload') || combined.includes('attach') || combined.includes('document')) return 'file';
    if (combined.includes('color') || combined.includes('colour')) return 'color';
    if (combined.includes('url') || combined.includes('website') || combined.includes('link')) return 'url';
    if (combined.includes('search')) return 'search';
    if (combined.includes('richtext') || combined.includes('rich text') || combined.includes('editor')) return 'richtext';
    if (combined.includes('number') || combined.includes('count') || combined.includes('age')) return 'number';

    return 'text';
  }

  /**
   * Detect whether a Figma frame represents a mobile screen
   * Uses aspect ratio, common mobile dimensions, and name-based keywords
   * @param {Object} frame - Figma FRAME node
   * @returns {boolean} true if the frame looks like a mobile screen
   */
  isMobileFrame(frame) {
    const bbox = frame.absoluteBoundingBox;
    if (!bbox) return false;
    const { width, height } = bbox;

    // Portrait aspect ratio (height > width, ratio > 1.3)
    const isPortrait = height > width && (height / width) > 1.3;

    // Common mobile widths: phones 310-440, tablets 740-840
    const isMobileWidth = (width >= 310 && width <= 440);
    const isTabletWidth = (width >= 740 && width <= 840);

    // Name-based detection
    const name = (frame.name || '').toLowerCase();
    const mobileKeywords = ['mobile', 'iphone', 'android', 'phone', 'app screen', 'screen', 'ios', 'tablet', 'ipad'];
    const hasKeyword = mobileKeywords.some(kw => name.includes(kw));

    return (isPortrait && (isMobileWidth || isTabletWidth)) || hasKeyword;
  }

  /**
   * Process a frame and extract forms/pages/mobileScreens.
   * Handles CANVAS nodes by iterating their children individually,
   * so each child frame gets its own mobile vs web classification.
   */
  processFrame(frame) {
    const forms = [];
    const pages = [];
    const mobileScreens = [];

    // CANVAS nodes contain child frames -- iterate them individually
    // so each screen gets classified on its own dimensions/name.
    if (frame.type === 'CANVAS' && frame.children) {
      const pageData = {
        id: `page_${this.sanitizeId(frame.name)}`,
        name: frame.name,
        title: frame.name,
        route: `/${this.sanitizeId(frame.name)}`,
        sections: []
      };

      frame.children.forEach(child => {
        if (child.type === 'FRAME') {
          if (this.looksLikeForm(child)) {
            forms.push(this.extractFormFromFrame(child));
          }

          if (this.isMobileFrame(child)) {
            const bbox = child.absoluteBoundingBox || {};
            const width = bbox.width || 0;
            const layoutTree = this.extractMobileLayoutTree(child);
            mobileScreens.push({
              id: `mobile_${this.sanitizeId(child.name)}`,
              name: child.name,
              title: child.name,
              dimensions: { width: Math.round(bbox.width || 0), height: Math.round(bbox.height || 0) },
              platform: (width >= 740 && width <= 840) ? 'tablet' : 'mobile',
              layoutTree: layoutTree ? (Array.isArray(layoutTree) ? layoutTree : [layoutTree]) : [],
              components: this.extractComponentsFromFrame(child)
            });
          } else {
            pageData.sections.push({
              id: `section_${this.sanitizeId(child.name)}`,
              title: child.name,
              type: 'content',
              components: this.extractComponentsFromFrame(child)
            });
          }
        }
      });

      if (pageData.sections.length > 0) {
        pages.push(pageData);
      }

      return { forms, pages, mobileScreens };
    }

    // Single FRAME node (non-CANVAS)
    if (this.looksLikeForm(frame)) {
      forms.push(this.extractFormFromFrame(frame));
    }

    if (this.isMobileFrame(frame)) {
      const bbox = frame.absoluteBoundingBox || {};
      const width = bbox.width || 0;
      const layoutTree = this.extractMobileLayoutTree(frame);
      mobileScreens.push({
        id: `mobile_${this.sanitizeId(frame.name)}`,
        name: frame.name,
        title: frame.name,
        dimensions: { width: Math.round(bbox.width || 0), height: Math.round(bbox.height || 0) },
        platform: (width >= 740 && width <= 840) ? 'tablet' : 'mobile',
        layoutTree: layoutTree ? (Array.isArray(layoutTree) ? layoutTree : [layoutTree]) : [],
        components: this.extractComponentsFromFrame(frame)
      });
    } else {
      pages.push({
        id: `page_${this.sanitizeId(frame.name)}`,
        name: frame.name,
        title: frame.name,
        route: `/${this.sanitizeId(frame.name)}`,
        sections: [{
          id: `section_main`,
          title: frame.name,
          type: 'content',
          components: this.extractComponentsFromFrame(frame)
        }]
      });
    }

    return { forms, pages, mobileScreens };
  }

  /**
   * Main extraction method
   * @param {string} figmaUrl - Figma file URL
   * @param {string} accessToken - Figma access token
   * @returns {Promise<Object>} Extracted design in DesignExpert format
   */
  async extractDesign(figmaUrl, accessToken = null) {
    const token = accessToken || process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_API_KEY;

    console.log('[FigmaDirectClient] Starting extraction:', {
      url: figmaUrl?.substring(0, 50) + '...',
      hasToken: !!token,
      tokenSource: accessToken ? 'user-provided' : (process.env.FIGMA_ACCESS_TOKEN ? 'FIGMA_ACCESS_TOKEN' : (process.env.FIGMA_API_KEY ? 'FIGMA_API_KEY' : 'none'))
    });

    if (!token) {
      throw new Error('Figma access token is required. Please provide your Figma Personal Access Token. You can create one at: https://www.figma.com/developers/api#access-tokens');
    }

    try {
      // Parse URL
      const { fileKey, nodeId } = this.parseUrl(figmaUrl);
      console.log('[FigmaDirectClient] Extracting design:', { fileKey, nodeId });

      // Reset extracted assets
      this.extractedAssets = [];

      // Fetch file data
      const fileData = await this.getFile(fileKey, token);
      console.log('[FigmaDirectClient] Got file data:', fileData.name);

      // Extract design tokens
      const colors = this.extractColors(fileData);
      const typography = this.extractTypography(fileData);
      const { forms, pages, mobileScreens } = this.extractComponents(fileData, nodeId);

      if (nodeId) {
        if (forms.length > 0 || pages.length > 1 || mobileScreens.length > 0) {
          console.log('[FigmaDirectClient] Node-scoped extraction returned sufficient data (' + pages.length + ' pages, ' + forms.length + ' forms, ' + mobileScreens.length + ' mobile)');
        } else {
          console.log('[FigmaDirectClient] Fell back to full-file extraction (' + pages.length + ' pages, ' + forms.length + ' forms, ' + mobileScreens.length + ' mobile)');
        }
      }

      // Extract spacing and border radius from actual components
      const spacing = this.extractSpacing(fileData);
      const borderRadius = this.extractBorderRadius(fileData);
      const shadows = this.extractShadows(fileData);

      // Export image assets if any were found
      let imageAssets = [];
      if (this.extractedAssets.length > 0) {
        try {
          const imageRefs = this.extractedAssets
            .filter(a => a.type === 'image' && a.ref)
            .map(a => a.ref);
          if (imageRefs.length > 0) {
            const uniqueRefs = [...new Set(imageRefs)];
            const nodeIds = uniqueRefs.join(',');
            const imagesResult = await this.getImages(fileKey, nodeIds, token, { format: 'png', scale: 2 });
            if (imagesResult?.images) {
              imageAssets = Object.entries(imagesResult.images).map(([id, url]) => ({
                ref: id,
                url,
                name: this.extractedAssets.find(a => a.ref === id)?.name || id
              }));
            }
          }
        } catch (imgErr) {
          console.warn('[FigmaDirectClient] Image export failed (non-critical):', imgErr.message);
        }
      }

      // Extract component variants/states
      const componentStates = this.extractComponentStates(fileData);

      // Build result
      const result = {
        designAnalysis: {
          source: 'figma-direct',
          figmaUrl,
          fileKey,
          nodeId,
          fileName: fileData.name,
          extractedAt: new Date().toISOString(),
          designSystem: {
            colors,
            typography,
            spacing,
            borderRadius,
            shadows,
            components: {
              input: {
                height: '40px',
                border: `1px solid ${colors.border}`,
                focusBorder: `2px solid ${colors.primary}`
              },
              button: {
                primary: {
                  background: colors.primary,
                  color: '#ffffff',
                  padding: '10px 20px'
                },
                secondary: {
                  background: 'transparent',
                  color: colors.secondary,
                  border: `1px solid ${colors.border}`,
                  padding: '10px 20px'
                }
              },
              card: {
                background: colors.cardBackground,
                border: `1px solid ${colors.cardBorder}`,
                padding: '24px'
              }
            },
            componentStates
          },
          imageAssets,
          gradients: colors.gradients || [],
          // Store raw Figma data for Claude analysis (truncated)
          rawFigmaData: JSON.stringify(fileData).substring(0, 50000)
        },
        forms,
        pages,
        mobileScreens
      };

      console.log('[FigmaDirectClient] Extraction complete:', {
        colors: Object.keys(colors).length,
        gradients: (colors.gradients || []).length,
        forms: forms.length,
        pages: pages.length,
        mobileScreens: mobileScreens.length,
        imageAssets: imageAssets.length,
        componentStates: Object.keys(componentStates).length
      });

      return result;
    } catch (error) {
      console.error('[FigmaDirectClient] Extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract spacing values from actual component measurements
   */
  extractSpacing(fileData) {
    const spacings = { paddings: [], gaps: [] };

    this.walkNodes(fileData.document, (node) => {
      if (node.type === 'FRAME' && node.layoutMode) {
        if (node.paddingLeft) spacings.paddings.push(node.paddingLeft);
        if (node.paddingTop) spacings.paddings.push(node.paddingTop);
        if (node.itemSpacing) spacings.gaps.push(node.itemSpacing);
      }
    });

    const avgPadding = spacings.paddings.length > 0
      ? Math.round(spacings.paddings.reduce((a, b) => a + b, 0) / spacings.paddings.length)
      : 24;
    const avgGap = spacings.gaps.length > 0
      ? Math.round(spacings.gaps.reduce((a, b) => a + b, 0) / spacings.gaps.length)
      : 16;

    return {
      unit: '8px',
      sectionPadding: `${avgPadding}px`,
      fieldGap: `${avgGap}px`,
      sectionGap: `${Math.max(avgGap * 2, 32)}px`,
      containerMaxWidth: '800px',
      containerPaddingTop: '32px',
      inputPadding: `${Math.max(Math.round(avgPadding / 2), 8)}px`
    };
  }

  /**
   * Extract border radius values from components
   */
  extractBorderRadius(fileData) {
    const radii = { cards: [], inputs: [], buttons: [] };

    this.walkNodes(fileData.document, (node) => {
      if (node.cornerRadius && node.cornerRadius > 0) {
        const name = (node.name || '').toLowerCase();
        if (name.includes('card') || (node.type === 'FRAME' && node.effects?.some(e => e.type === 'DROP_SHADOW'))) {
          radii.cards.push(node.cornerRadius);
        } else if (name.includes('input') || name.includes('field') || name.includes('text')) {
          radii.inputs.push(node.cornerRadius);
        } else if (name.includes('button') || name.includes('btn')) {
          radii.buttons.push(node.cornerRadius);
        }
      }
    });

    const avg = (arr, def) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : def;

    return {
      card: `${avg(radii.cards, 8)}px`,
      input: `${avg(radii.inputs, 6)}px`,
      button: `${avg(radii.buttons, 6)}px`,
      checkbox: '4px'
    };
  }

  /**
   * Extract shadow styles from components
   */
  extractShadows(fileData) {
    let cardShadow = '0 1px 3px rgba(0,0,0,0.1)';
    let focusShadow = '0 0 0 2px rgba(26,115,232,0.2)';

    this.walkNodes(fileData.document, (node) => {
      if (node.effects && node.type === 'FRAME') {
        const shadow = this.extractShadow(node.effects);
        if (shadow) {
          const name = (node.name || '').toLowerCase();
          if (name.includes('card') || name.includes('panel') || name.includes('container')) {
            cardShadow = shadow;
          }
        }
      }
    });

    return { card: cardShadow, focus: focusShadow };
  }

  /**
   * Extract component variant states (hover, active, disabled)
   */
  extractComponentStates(fileData) {
    const states = {};

    this.walkNodes(fileData.document, (node) => {
      if (node.type === 'COMPONENT_SET' && node.children) {
        const baseName = (node.name || '').toLowerCase().replace(/\s+/g, '-');
        states[baseName] = {};

        node.children.forEach(variant => {
          const variantName = (variant.name || '').toLowerCase();
          let state = 'default';
          if (variantName.includes('hover')) state = 'hover';
          else if (variantName.includes('active') || variantName.includes('pressed')) state = 'active';
          else if (variantName.includes('disabled')) state = 'disabled';
          else if (variantName.includes('focus')) state = 'focus';

          const bgFill = variant.fills?.find(f => f.type === 'SOLID');
          const borderStroke = variant.strokes?.[0];

          states[baseName][state] = {
            background: bgFill ? this.rgbToHex(bgFill.color) : undefined,
            borderColor: borderStroke?.color ? this.rgbToHex(borderStroke.color) : undefined,
            opacity: variant.opacity !== undefined ? variant.opacity : 1,
            cornerRadius: variant.cornerRadius ? `${variant.cornerRadius}px` : undefined
          };
        });
      }
    });

    return states;
  }

  /**
   * Extract visual styling properties from a Figma node.
   * Captures background color, border radius, borders, shadows, and opacity.
   * Returns null if no visual properties are found.
   */
  _extractVisualStyling(node) {
    if (!node) return null;
    const styling = {};

    // Background color from solid fills
    if (node.fills && Array.isArray(node.fills)) {
      const solidFill = node.fills.find(f => f.type === 'SOLID' && f.visible !== false && f.color);
      if (solidFill) {
        styling.backgroundColor = this.rgbToHex(solidFill.color);
      }
    }

    // Border radius
    if (node.cornerRadius && node.cornerRadius > 0) {
      styling.borderRadius = node.cornerRadius;
    }

    // Border from strokes
    if (node.strokes && Array.isArray(node.strokes)) {
      const solidStroke = node.strokes.find(f => f.type === 'SOLID' && f.visible !== false && f.color);
      if (solidStroke) {
        styling.borderColor = this.rgbToHex(solidStroke.color);
        if (node.strokeWeight) {
          styling.borderWidth = node.strokeWeight;
        }
      }
    }

    // Drop shadow from effects
    if (node.effects && Array.isArray(node.effects)) {
      const shadow = node.effects.find(e => e.type === 'DROP_SHADOW' && e.visible !== false);
      if (shadow) {
        if (shadow.color) {
          styling.shadowColor = this.rgbToHex(shadow.color);
          styling.shadowOpacity = shadow.color.a !== undefined ? shadow.color.a : 0.1;
        }
        if (shadow.offset) {
          styling.shadowOffsetX = shadow.offset.x || 0;
          styling.shadowOffsetY = shadow.offset.y || 0;
        }
        styling.shadowRadius = shadow.radius || 4;
      }
    }

    // Opacity
    if (node.opacity !== undefined && node.opacity < 1) {
      styling.opacity = node.opacity;
    }

    return Object.keys(styling).length > 0 ? styling : null;
  }

  // Utility methods

  /**
   * Convert RGB to hex
   */
  rgbToHex(color) {
    if (!color) return null;

    const r = Math.round((color.r || 0) * 255);
    const g = Math.round((color.g || 0) * 255);
    const b = Math.round((color.b || 0) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Sanitize string for use as ID
   */
  sanitizeId(name) {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }
}

module.exports = FigmaDirectClient;
