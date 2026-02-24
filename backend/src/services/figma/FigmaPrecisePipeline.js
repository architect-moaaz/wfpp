/**
 * FigmaPrecisePipeline
 *
 * Orchestrates the full pixel-perfect Figma-to-React pipeline:
 *   getRawFileData -> NodeTreeExtractor -> SemanticClassifier -> FigmaToCSS -> ReactRenderer
 *
 * No AI re-interpretation of visual properties. Deterministic conversion.
 */

const FigmaNodeTreeExtractor = require('./FigmaNodeTreeExtractor');
const SemanticClassifier = require('./SemanticClassifier');
const FigmaToCSS = require('./FigmaToCSS');
const FigmaReactRenderer = require('./FigmaReactRenderer');
const FigmaDirectClient = require('../FigmaDirectClient');

class FigmaPrecisePipeline {
  constructor(options = {}) {
    this.figmaClient = new FigmaDirectClient();
    this.extractor = new FigmaNodeTreeExtractor();
    this.classifier = new SemanticClassifier();
    this.cssConverter = new FigmaToCSS();
    this.renderer = new FigmaReactRenderer(options);
  }

  /**
   * Execute the full pipeline.
   * @param {string} figmaUrl - Figma file URL
   * @param {string} accessToken - Figma personal access token
   * @param {Object} options
   * @param {string} [options.targetNodeId] - Extract specific node only
   * @param {Object} [options.dataModels] - Existing data models for hybrid mode
   * @returns {Promise<Object>} { components, assets, pageConfigs, designSystem, rawNodeTree }
   */
  async execute(figmaUrl, accessToken, options = {}) {
    const token = accessToken || process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_API_KEY;
    if (!token) {
      throw new Error('Figma access token is required for precise extraction');
    }

    const { fileKey, nodeId } = this.figmaClient.parseUrl(figmaUrl);
    const targetNodeId = options.targetNodeId || nodeId;

    console.log('[FigmaPrecisePipeline] Starting precise extraction:', { fileKey, targetNodeId });

    // Step 1: Get raw, untruncated Figma data
    console.log('[FigmaPrecisePipeline] Step 1: Fetching raw file data...');
    const rawData = await this.figmaClient.getRawFileData(fileKey, token);

    // Step 2: Extract full node tree
    console.log('[FigmaPrecisePipeline] Step 2: Extracting node tree...');
    const nodeTree = this.extractor.extract(rawData.document, { targetNodeId });

    // Step 3: Classify semantics
    console.log('[FigmaPrecisePipeline] Step 3: Classifying semantics...');
    this.classifier.classify(nodeTree);

    // Step 4: Convert to CSS
    console.log('[FigmaPrecisePipeline] Step 4: Converting to CSS...');
    this.cssConverter.convertTree(nodeTree);

    // Step 4.5: Extract design system and Google Fonts URL (needed before rendering)
    const designSystem = this.extractDesignSystem(nodeTree);
    const googleFontsUrl = this.generateGoogleFontsUrl(designSystem);

    // Step 4.6: Build navigation graph from prototype flows
    const navigationGraph = this.buildNavigationGraph(nodeTree);

    // Step 4.7: Group responsive frame variants
    const responsiveGroups = this.groupFramesByBreakpoint(nodeTree);

    // Pass runtime options to renderer
    this.renderer.options.googleFontsUrl = googleFontsUrl;
    this.renderer.options.navigationGraph = navigationGraph;
    this.renderer.options.responsiveGroups = responsiveGroups;
    this.renderer.options.dataBindings = options.dataBindings || null;

    // Step 5: Render to React
    console.log('[FigmaPrecisePipeline] Step 5: Rendering React components...');
    const { components, assets, pageConfigs } = this.renderer.render(nodeTree);

    // Step 5.5: Inline small SVG content into rendered components
    const inlinedComponents = await this.inlineSVGContent(components, fileKey, token, assets);

    // Step 6: Collect asset download URLs
    console.log('[FigmaPrecisePipeline] Step 6: Resolving assets...');
    const resolvedAssets = await this.resolveAssets(fileKey, token, assets);

    // Step 5.7: Detect mobile frames and build mobileScreens
    const mobileScreens = this.detectMobileScreens(nodeTree);

    // Step 8: Extract responsive hints from top-level frames
    const responsiveHints = this.extractResponsiveHints(nodeTree);

    console.log('[FigmaPrecisePipeline] Complete:', {
      components: inlinedComponents.length,
      images: resolvedAssets.images.length,
      vectors: resolvedAssets.vectors.length,
      pages: pageConfigs.length,
      mobileScreens: mobileScreens.length,
    });

    return {
      components: inlinedComponents,
      assets: resolvedAssets,
      pageConfigs,
      designSystem,
      googleFontsUrl,
      navigationGraph,
      responsiveHints,
      mobileScreens,
      rawNodeTree: nodeTree,
      metadata: {
        fileName: rawData.name,
        fileKey,
        lastModified: rawData.lastModified,
        version: rawData.version,
        extractedAt: new Date().toISOString(),
        googleFontsUrl,
      },
    };
  }

  /**
   * Resolve asset URLs via Figma Images API.
   */
  async resolveAssets(fileKey, token, assets) {
    const result = {
      images: [],
      vectors: [],
    };

    // Resolve image fills
    if (assets.images.length > 0) {
      try {
        const imageRefs = [...new Set(assets.images.map(i => i.ref).filter(Boolean))];
        if (imageRefs.length > 0) {
          const imagesResponse = await this.figmaClient.getImages(
            fileKey, imageRefs.join(','), token, { format: 'png', scale: 2 }
          );
          if (imagesResponse?.images) {
            result.images = assets.images.map(img => ({
              ...img,
              url: imagesResponse.images[img.ref] || null,
              localPath: `assets/figma/${img.ref}.png`,
            }));
          }
        }
      } catch (err) {
        console.warn('[FigmaPrecisePipeline] Image resolution failed:', err.message);
        result.images = assets.images.map(img => ({
          ...img,
          url: null,
          localPath: `assets/figma/${img.ref}.png`,
        }));
      }
    }

    // Resolve vector exports
    if (assets.vectors.length > 0) {
      try {
        const nodeIds = [...new Set(assets.vectors.map(v => v.nodeId).filter(Boolean))];
        if (nodeIds.length > 0) {
          const vectorResponse = await this.figmaClient.getImages(
            fileKey, nodeIds.join(','), token, { format: 'svg', scale: 1 }
          );
          if (vectorResponse?.images) {
            result.vectors = assets.vectors.map(vec => ({
              ...vec,
              url: vectorResponse.images[vec.nodeId] || null,
              localPath: `assets/figma/${vec.nodeId}.svg`,
            }));
          }
        }
      } catch (err) {
        console.warn('[FigmaPrecisePipeline] Vector resolution failed:', err.message);
        result.vectors = assets.vectors.map(vec => ({
          ...vec,
          url: null,
          localPath: `assets/figma/${vec.nodeId}.svg`,
        }));
      }
    }

    return result;
  }

  /**
   * Extract a design system summary from the node tree for the color bridge.
   * Collects all unique colors, fonts, spacing values.
   */
  extractDesignSystem(pages) {
    const colors = new Map(); // hex -> { count, role }
    const fonts = new Map();  // family -> count
    const spacings = new Set();
    const radii = new Set();

    const walk = (node) => {
      // Colors from fills
      if (node.fills) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.color) {
            const hex = this.rgbToHex(fill.color);
            const entry = colors.get(hex) || { count: 0, roles: [] };
            entry.count++;
            colors.set(hex, entry);
          }
        }
      }

      // Fonts
      if (node.typography?.fontFamily) {
        fonts.set(node.typography.fontFamily, (fonts.get(node.typography.fontFamily) || 0) + 1);
      }

      // Spacing from auto-layout
      if (node.autoLayout) {
        if (node.autoLayout.gap > 0) spacings.add(node.autoLayout.gap);
        const p = node.autoLayout.padding;
        if (p.top > 0) spacings.add(p.top);
        if (p.right > 0) spacings.add(p.right);
        if (p.bottom > 0) spacings.add(p.bottom);
        if (p.left > 0) spacings.add(p.left);
      }

      // Border radii
      if (node.cornerRadius) {
        const cr = node.cornerRadius;
        if (cr.tl > 0) radii.add(cr.tl);
        if (cr.tr > 0) radii.add(cr.tr);
        if (cr.br > 0) radii.add(cr.br);
        if (cr.bl > 0) radii.add(cr.bl);
      }

      if (node.children) node.children.forEach(walk);
    };

    if (Array.isArray(pages)) {
      pages.forEach(walk);
    } else {
      walk(pages);
    }

    // Sort colors by frequency
    const sortedColors = [...colors.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([hex, data]) => ({ hex, count: data.count }));

    // Sort fonts by frequency
    const sortedFonts = [...fonts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([family, count]) => ({ family, count }));

    // Assign color roles heuristically
    const nonWhiteBlack = sortedColors.filter(c =>
      c.hex !== '#ffffff' && c.hex !== '#000000' && c.hex !== '#fefefe' && c.hex !== '#010101'
    );
    const whites = sortedColors.filter(c => c.hex === '#ffffff' || c.hex === '#fefefe');
    const blacks = sortedColors.filter(c => c.hex === '#000000' || c.hex === '#010101');

    return {
      colors: {
        primary: nonWhiteBlack[0]?.hex || '#1a73e8',
        secondary: nonWhiteBlack[1]?.hex || '#374151',
        accent: nonWhiteBlack[2]?.hex || null,
        background: whites.length > 0 ? whites[0].hex : '#ffffff',
        text: blacks.length > 0 ? blacks[0].hex : '#000000',
        all: sortedColors.slice(0, 20),
      },
      typography: {
        primaryFont: sortedFonts[0]?.family || 'Inter',
        secondaryFont: sortedFonts[1]?.family || null,
        allFonts: sortedFonts,
      },
      spacing: [...spacings].sort((a, b) => a - b),
      borderRadii: [...radii].sort((a, b) => a - b),
    };
  }

  /**
   * Extract responsive hints from top-level frame dimensions.
   * If multiple frames exist with different widths, treat them as breakpoint variants.
   */
  extractResponsiveHints(pages) {
    const frames = [];

    for (const page of (Array.isArray(pages) ? pages : [pages])) {
      const children = page.type === 'CANVAS' && page.children ? page.children : [page];
      for (const child of children) {
        if (child.bounds && child.bounds.width) {
          frames.push({
            name: child.name,
            width: child.bounds.width,
            height: child.bounds.height,
          });
        }
      }
    }

    // Group by approximate breakpoint
    const breakpoints = [];
    const sorted = frames.sort((a, b) => a.width - b.width);

    for (const frame of sorted) {
      const w = frame.width;
      let breakpoint = 'desktop';
      if (w <= 480) breakpoint = 'mobile';
      else if (w <= 768) breakpoint = 'tablet';
      else if (w <= 1024) breakpoint = 'laptop';

      breakpoints.push({
        name: frame.name,
        breakpoint,
        width: w,
        height: frame.height,
        mediaQuery: w <= 480 ? `@media (max-width: 480px)` :
                    w <= 768 ? `@media (max-width: 768px)` :
                    w <= 1024 ? `@media (max-width: 1024px)` :
                    null,
      });
    }

    return breakpoints;
  }

  /**
   * Build a navigation graph from prototype flow connections.
   * Maps node IDs to target routes based on transitionNodeID fields.
   */
  buildNavigationGraph(pages) {
    const graph = {};
    const frameIndex = new Map(); // frameId -> route

    // Index all top-level frames by ID and name -> route
    const allPages = Array.isArray(pages) ? pages : [pages];
    for (const page of allPages) {
      const frames = page.type === 'CANVAS' && page.children ? page.children : [page];
      for (const frame of frames) {
        const route = '/' + (frame.name || 'page')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        frameIndex.set(frame.id, route);
      }
    }

    // Walk tree to find all nodes with transitionNodeID
    const walk = (node) => {
      if (node.transitionNodeID && frameIndex.has(node.transitionNodeID)) {
        graph[node.id] = {
          targetRoute: frameIndex.get(node.transitionNodeID),
          targetNodeId: node.transitionNodeID,
          duration: node.transitionDuration,
          easing: node.transitionEasing,
        };
      }
      if (node.children) node.children.forEach(walk);
    };

    for (const page of allPages) {
      walk(page);
    }

    return graph;
  }

  /**
   * Group top-level frames by breakpoint for responsive rendering.
   * Frames with similar base names at different widths become a single responsive component.
   */
  groupFramesByBreakpoint(pages) {
    const allPages = Array.isArray(pages) ? pages : [pages];
    const frames = [];

    for (const page of allPages) {
      const children = page.type === 'CANVAS' && page.children ? page.children : [page];
      for (const child of children) {
        if (child.bounds && child.bounds.width) {
          frames.push(child);
        }
      }
    }

    // Classify each frame's breakpoint
    const classified = frames.map(frame => {
      const w = frame.bounds.width;
      let breakpoint = 'desktop';
      if (w <= 480) breakpoint = 'mobile';
      else if (w <= 768) breakpoint = 'tablet';
      else if (w <= 1024) breakpoint = 'laptop';

      // Normalize name: strip breakpoint suffixes
      const baseName = (frame.name || '')
        .replace(/[-_ ]*(mobile|tablet|desktop|responsive|phone|sm|md|lg|xl)[-_ ]*/gi, '')
        .trim() || frame.name;

      return { frame, breakpoint, baseName: baseName.toLowerCase() };
    });

    // Group by base name
    const groups = new Map();
    for (const item of classified) {
      if (!groups.has(item.baseName)) {
        groups.set(item.baseName, []);
      }
      groups.get(item.baseName).push(item);
    }

    // Only return groups with 2+ breakpoint variants
    const result = {};
    for (const [baseName, items] of groups) {
      const uniqueBreakpoints = new Set(items.map(i => i.breakpoint));
      if (uniqueBreakpoints.size >= 2) {
        result[baseName] = items.map(i => ({
          frame: i.frame,
          breakpoint: i.breakpoint,
          frameId: i.frame.id,
          frameName: i.frame.name,
        }));
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Inline small SVG content into rendered component files.
   * Fetches SVG content for vectors under 10KB and replaces <img> tags with inline SVG.
   */
  async inlineSVGContent(components, fileKey, token, assets) {
    if (!assets.vectors || assets.vectors.length === 0) return components;

    const nodeIds = [...new Set(assets.vectors.map(v => v.nodeId).filter(Boolean))];
    if (nodeIds.length === 0) return components;

    // Fetch SVG URLs
    let svgUrls = {};
    try {
      const vectorResponse = await this.figmaClient.getImages(
        fileKey, nodeIds.join(','), token, { format: 'svg', scale: 1 }
      );
      svgUrls = vectorResponse?.images || {};
    } catch (err) {
      console.warn('[FigmaPrecisePipeline] SVG URL fetch for inlining failed:', err.message);
      return components;
    }

    // Fetch actual SVG content for small vectors
    const svgContents = new Map();
    const https = require('https');
    const http = require('http');

    const fetchSVG = (url) => {
      return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 5000 }, (res) => {
          if (res.statusCode !== 200) { resolve(null); return; }
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            if (data.length <= 10240 && data.includes('<svg')) {
              resolve(data);
            } else {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
      });
    };

    // Fetch SVGs in parallel (limit to 10 concurrent)
    for (let i = 0; i < nodeIds.length; i += 10) {
      const batch = nodeIds.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(async (nodeId) => {
          const url = svgUrls[nodeId];
          if (!url) return null;
          const content = await fetchSVG(url);
          return content ? { nodeId, content } : null;
        })
      );
      for (const r of results) {
        if (r) svgContents.set(r.nodeId, r.content);
      }
    }

    if (svgContents.size === 0) return components;

    // Replace <img> tags with inline SVG in component content
    return components.map(comp => {
      let content = comp.content;
      for (const [nodeId, svgRaw] of svgContents) {
        const imgPattern = new RegExp(
          `<img\\s+src="/assets/figma/${nodeId.replace(/[:.]/g, '\\$&')}\\.svg"[^/]*/>`,
          'g'
        );
        if (imgPattern.test(content)) {
          const inlineSvg = this.sanitizeSVGForJSX(svgRaw);
          content = content.replace(imgPattern, inlineSvg);
        }
      }
      return { ...comp, content };
    });
  }

  /**
   * Sanitize raw SVG markup for use as inline JSX.
   */
  sanitizeSVGForJSX(svg) {
    let result = svg
      // Strip XML declaration
      .replace(/<\?xml[^?]*\?>\s*/g, '')
      // Strip DOCTYPE
      .replace(/<!DOCTYPE[^>]*>\s*/g, '')
      // Convert class= to className=
      .replace(/\bclass="/g, 'className="')
      .replace(/\bclass='/g, "className='")
      // Convert common SVG attributes to camelCase
      .replace(/stroke-width/g, 'strokeWidth')
      .replace(/stroke-linecap/g, 'strokeLinecap')
      .replace(/stroke-linejoin/g, 'strokeLinejoin')
      .replace(/stroke-dasharray/g, 'strokeDasharray')
      .replace(/stroke-dashoffset/g, 'strokeDashoffset')
      .replace(/stroke-miterlimit/g, 'strokeMiterlimit')
      .replace(/stroke-opacity/g, 'strokeOpacity')
      .replace(/fill-opacity/g, 'fillOpacity')
      .replace(/fill-rule/g, 'fillRule')
      .replace(/clip-rule/g, 'clipRule')
      .replace(/clip-path/g, 'clipPath')
      .replace(/font-size/g, 'fontSize')
      .replace(/font-family/g, 'fontFamily')
      .replace(/font-weight/g, 'fontWeight')
      .replace(/text-anchor/g, 'textAnchor')
      .replace(/text-decoration/g, 'textDecoration')
      .replace(/dominant-baseline/g, 'dominantBaseline')
      .replace(/alignment-baseline/g, 'alignmentBaseline')
      .replace(/color-interpolation/g, 'colorInterpolation')
      .replace(/color-interpolation-filters/g, 'colorInterpolationFilters')
      .replace(/flood-color/g, 'floodColor')
      .replace(/flood-opacity/g, 'floodOpacity')
      .replace(/stop-color/g, 'stopColor')
      .replace(/stop-opacity/g, 'stopOpacity')
      // Self-close tags that need it in JSX
      .replace(/<(circle|ellipse|line|path|polygon|polyline|rect|use|image)([^>]*[^/])>/g, '<$1$2 />')
      // Remove xmlns if present (React handles it)
      .replace(/\s+xmlns="[^"]*"/g, '');

    return result;
  }

  /**
   * Generate a Google Fonts URL from the design system's font families.
   * Filters out system fonts and builds a valid import URL.
   */
  generateGoogleFontsUrl(designSystem) {
    if (!designSystem?.typography?.allFonts || designSystem.typography.allFonts.length === 0) {
      return null;
    }

    const systemFonts = new Set([
      'arial', 'helvetica', 'helvetica neue', 'times new roman', 'times',
      'courier new', 'courier', 'verdana', 'georgia', 'palatino',
      'garamond', 'comic sans ms', 'impact', 'lucida console',
      'tahoma', 'trebuchet ms', 'system-ui', 'sans-serif', 'serif',
      'monospace', '-apple-system', 'blinkmacsystemfont', 'segoe ui',
      'roboto mono', 'sf pro', 'sf pro display', 'sf pro text',
    ]);

    const googleFonts = designSystem.typography.allFonts
      .map(f => f.family)
      .filter(family => !systemFonts.has(family.toLowerCase()));

    if (googleFonts.length === 0) return null;

    const families = googleFonts.map(family => {
      const encoded = family.replace(/\s+/g, '+');
      return `family=${encoded}:wght@300;400;500;600;700`;
    });

    return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
  }

  // ---------------------------------------------------------------------------
  // Mobile screen detection (bridge from NodeTreeExtractor format to layoutTree)
  // ---------------------------------------------------------------------------

  /**
   * Scan the extracted node tree for mobile-sized frames and produce mobileScreens
   * with the layoutTree format that FigmaToMobileConverter expects.
   * @param {Object|Object[]} pages - Node tree pages from FigmaNodeTreeExtractor
   * @returns {Object[]} mobileScreens array
   */
  detectMobileScreens(pages) {
    const mobileScreens = [];
    const allPages = Array.isArray(pages) ? pages : [pages];

    for (const page of allPages) {
      const children = page.type === 'CANVAS' && page.children ? page.children : [page];

      for (const frame of children) {
        if (!frame.bounds || !frame.bounds.width) continue;

        const w = frame.bounds.width;
        const h = frame.bounds.height;
        const ratio = h / w;
        const nameLower = (frame.name || '').toLowerCase();
        const hasMobileKeyword = /mobile|phone|iphone|android|app|screen|ios/i.test(nameLower);
        const isMobileWidth = w >= 310 && w <= 440;
        const isPortrait = ratio > 1.3;

        if ((isMobileWidth && isPortrait) || hasMobileKeyword) {
          const layoutTree = this.styledNodeToLayoutTree(frame, 0);
          const sanitizedName = (frame.name || 'screen')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');

          mobileScreens.push({
            id: `mobile_${sanitizedName}`,
            name: frame.name,
            title: frame.name,
            dimensions: {
              width: Math.round(w),
              height: Math.round(h),
            },
            platform: w >= 740 ? 'tablet' : 'mobile',
            layoutTree: layoutTree ? (Array.isArray(layoutTree) ? layoutTree : [layoutTree]) : [],
          });
        }
      }
    }

    if (mobileScreens.length > 0) {
      console.log(`[FigmaPrecisePipeline] Detected ${mobileScreens.length} mobile screen(s)`);
    }

    return mobileScreens;
  }

  /**
   * Bridge function: convert a FigmaStyledNode (from FigmaNodeTreeExtractor) into
   * the layoutTree format that FigmaToMobileConverter / FigmaDirectClient produce.
   *
   * Output format: { type, content?, variant?, label?, placeholder?, name?,
   *                   styling?, dimensions?, layout?, children? }
   *
   * @param {Object} node - FigmaStyledNode
   * @param {number} depth - Recursion depth
   * @returns {Object|null} layoutTree node
   */
  styledNodeToLayoutTree(node, depth) {
    if (!node || depth > 8) return null;
    if (node.visible === false) return null;

    const nodeName = (node.name || '').toLowerCase();

    // -- TEXT nodes --
    if (node.type === 'TEXT') {
      const fontSize = node.typography?.fontSize || 14;
      const variant = fontSize >= 24 ? 'h1' : fontSize >= 18 ? 'h2' : fontSize >= 16 ? 'h3' : 'body';
      const leaf = { type: 'text', content: node.characters || node.name, variant };
      const styling = {};
      if (node.typography?.fontSize) styling.fontSize = `${node.typography.fontSize}px`;
      if (node.typography?.fontWeight) styling.fontWeight = node.typography.fontWeight;
      if (node.typography?.fontFamily) styling.fontFamily = node.typography.fontFamily;
      if (node.typography?.letterSpacing) styling.letterSpacing = `${node.typography.letterSpacing}px`;
      if (node.typography?.lineHeight) styling.lineHeight = `${node.typography.lineHeight}px`;
      const textFill = node.fills?.[0];
      if (textFill?.type === 'SOLID' && textFill.color) {
        styling.color = this.rgbToHex(textFill.color);
      }
      if (Object.keys(styling).length > 0) leaf.styling = styling;
      return leaf;
    }

    // -- VECTOR / Icon nodes --
    if (node.type === 'VECTOR' || (nodeName.includes('icon') && node.type !== 'TEXT' && !node.children?.length)) {
      return { type: 'icon', name: node.name };
    }

    // -- Image fills --
    if (node.fills?.some(f => f.type === 'IMAGE')) {
      const imgNode = { type: 'image', name: node.name };
      if (node.bounds) {
        imgNode.dimensions = {
          width: Math.round(node.bounds.width || 0),
          height: Math.round(node.bounds.height || 0),
        };
      }
      const imgStyling = this._extractStyling(node);
      if (imgStyling) imgNode.styling = imgStyling;
      return imgNode;
    }

    // -- Button detection (name-based) --
    if (/button|btn|cta/.test(nodeName) && (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT')) {
      const btnText = this._getTextFromChildren(node);
      const leaf = { type: 'button', label: btnText || node.name };
      const btnStyling = this._extractStyling(node);
      if (btnStyling) leaf.styling = btnStyling;
      return leaf;
    }

    // -- Input detection (name-based) --
    if (/input|field|text-field|textfield|search|email|password|phone/.test(nodeName) &&
        (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT')) {
      const placeholder = this._getTextFromChildren(node) || node.name;
      const inputNode = { type: 'input', placeholder };
      const inputStyling = this._extractStyling(node);
      if (inputStyling) inputNode.styling = inputStyling;
      return inputNode;
    }

    // -- Checkbox detection --
    if (/checkbox|check-box|agree|terms|remember/.test(nodeName) &&
        (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'GROUP')) {
      return { type: 'checkbox', label: this._getTextFromChildren(node) || node.name };
    }

    // -- Toggle / Switch detection --
    if (/toggle|switch/.test(nodeName) &&
        (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'GROUP')) {
      return { type: 'switch', label: this._getTextFromChildren(node) || node.name };
    }

    // -- Dropdown / Select detection --
    if (/dropdown|select|picker|combo/.test(nodeName) &&
        (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT')) {
      return { type: 'select', placeholder: this._getTextFromChildren(node) || node.name };
    }

    // -- Divider detection --
    if (node.type === 'LINE' || (node.bounds && (node.bounds.height <= 2 || node.bounds.width <= 2)) ||
        /divider|separator|line/.test(nodeName)) {
      if (node.type === 'LINE' || node.type === 'RECTANGLE' || (node.bounds && node.bounds.height <= 2)) {
        return { type: 'divider' };
      }
    }

    // -- Container detection (FRAME/GROUP with children) --
    const isContainer = node.children && node.children.length > 0 &&
      (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' ||
       node.type === 'INSTANCE' || node.type === 'COMPONENT_SET' || node.type === 'SECTION' ||
       node.type === 'CANVAS');

    if (!isContainer) {
      // Card heuristic: frame with corner radius + shadow
      if (node.type === 'FRAME' && node.cornerRadius &&
          node.effects?.some(e => e.type === 'DROP_SHADOW')) {
        const cardNode = { type: 'card', name: node.name };
        const cardStyling = this._extractStyling(node);
        if (cardStyling) cardNode.styling = cardStyling;
        return cardNode;
      }
      return null;
    }

    // Recurse into children
    const children = [];
    for (const child of node.children) {
      const result = this.styledNodeToLayoutTree(child, depth + 1);
      if (result) {
        if (Array.isArray(result)) {
          children.push(...result);
        } else {
          children.push(result);
        }
      }
    }

    if (children.length === 0) return null;

    // Flatten single-child containers without meaningful auto-layout
    if (children.length === 1 && !node.autoLayout) {
      return children[0];
    }

    const container = {
      type: 'container',
      name: node.name,
      children,
    };

    // Build layout from autoLayout properties
    const layout = {};
    if (node.autoLayout) {
      if (node.autoLayout.direction) layout.direction = node.autoLayout.direction;
      if (node.autoLayout.gap) layout.gap = node.autoLayout.gap;
      const p = node.autoLayout.padding;
      if (p && (p.top || p.right || p.bottom || p.left)) {
        layout.padding = { top: p.top, right: p.right, bottom: p.bottom, left: p.left };
      }
    }
    if (Object.keys(layout).length > 0) {
      container.layout = layout;
    }

    // Include dimensions
    if (node.bounds) {
      container.dimensions = {
        width: Math.round(node.bounds.width || 0),
        height: Math.round(node.bounds.height || 0),
      };
    }

    // Attach visual styling
    const containerStyling = this._extractStyling(node);
    if (containerStyling) container.styling = containerStyling;

    return container;
  }

  /**
   * Extract visual styling from a FigmaStyledNode (fills, cornerRadius, effects).
   * @private
   */
  _extractStyling(node) {
    const styling = {};

    // Background color from fills
    const solidFill = node.fills?.find(f => f.type === 'SOLID' && f.color);
    if (solidFill) {
      styling.backgroundColor = this.rgbToHex(solidFill.color);
    }

    // Gradient fills
    const gradientFill = node.fills?.find(f =>
      f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL'
    );
    if (gradientFill && gradientFill.gradientStops?.length >= 2) {
      const stops = gradientFill.gradientStops;

      // Compute actual angle from gradientHandlePositions [start, end, ...]
      let angle = 180;
      const handles = gradientFill.gradientHandlePositions;
      if (handles && handles.length >= 2) {
        const dx = handles[1].x - handles[0].x;
        const dy = handles[1].y - handles[0].y;
        // CSS gradient angles: 0deg = bottom-to-top, 90deg = left-to-right
        angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
        if (angle < 0) angle += 360;
      }

      // Preserve all intermediate color stops
      const stopStrings = stops.map(s => {
        const hex = this.rgbToHex(s.color);
        const pos = Math.round(s.position * 100);
        return `${hex} ${pos}%`;
      });
      styling.background = `linear-gradient(${angle}deg, ${stopStrings.join(', ')})`;
    }

    // Corner radius
    if (node.cornerRadius) {
      const cr = node.cornerRadius;
      if (cr.tl === cr.tr && cr.tr === cr.br && cr.br === cr.bl && cr.tl > 0) {
        styling.borderRadius = cr.tl;
      } else if (cr.tl > 0 || cr.tr > 0 || cr.br > 0 || cr.bl > 0) {
        styling.borderRadius = `${cr.tl}px ${cr.tr}px ${cr.br}px ${cr.bl}px`;
      }
    }

    // Drop shadow
    const shadow = node.effects?.find(e => e.type === 'DROP_SHADOW' && e.visible !== false);
    if (shadow) {
      const sc = shadow.color || {};
      const ox = shadow.offset?.x || 0;
      const oy = shadow.offset?.y || 0;
      const radius = shadow.radius || 0;
      styling.boxShadow = `${ox}px ${oy}px ${radius}px rgba(${Math.round((sc.r || 0) * 255)},${Math.round((sc.g || 0) * 255)},${Math.round((sc.b || 0) * 255)},${(sc.a ?? 0.25).toFixed(2)})`;
    }

    // Stroke / border
    if (node.strokes?.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.type === 'SOLID' && stroke.color) {
        styling.borderColor = this.rgbToHex(stroke.color);
        styling.borderWidth = node.strokeWeight || 1;
      }
    }

    return Object.keys(styling).length > 0 ? styling : null;
  }

  /**
   * Recursively find and concatenate text from child TEXT nodes.
   * @private
   */
  _getTextFromChildren(node) {
    if (!node.children) return '';
    const texts = [];
    const walk = (n) => {
      if (n.type === 'TEXT' && n.characters) {
        texts.push(n.characters);
      }
      if (n.children) n.children.forEach(walk);
    };
    node.children.forEach(walk);
    return texts.join(' ').trim();
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  rgbToHex(color) {
    if (!color) return '#000000';
    const r = Math.round((color.r || 0) * 255);
    const g = Math.round((color.g || 0) * 255);
    const b = Math.round((color.b || 0) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

module.exports = FigmaPrecisePipeline;
