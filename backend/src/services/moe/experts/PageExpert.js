/**
 * Page Expert
 * Generates pages individually or in batches
 */

const Anthropic = require('@anthropic-ai/sdk');

class PageExpert {
  constructor() {
    this.name = 'PageExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Check if error is a network/connection error that should trigger retry
   */
  isNetworkError(error) {
    const networkErrorCodes = [
      'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
      'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN',
      'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ];
    const errorCode = error.code || error.cause?.code;
    if (errorCode && networkErrorCodes.includes(errorCode)) return true;
    if (error.name === 'APIConnectionError' ||
        error.message?.includes('Connection error') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) return true;
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute API call with network retry and exponential backoff
   */
  async executeWithNetworkRetry(apiCall, maxRetries = 3, baseDelayMs = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        if (this.isNetworkError(error)) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`[${this.name}] Network error on attempt ${attempt}/${maxRetries}: ${error.message}`);
          if (attempt < maxRetries) {
            console.log(`[${this.name}] Retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            console.error(`[${this.name}] All ${maxRetries} network retry attempts failed`);
          }
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate a single page
   */
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[PageExpert] Generating page: ${spec.name}...`);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    // Check for truncation
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[PageExpert] Response truncated for ${spec.name}, retrying with stricter constraints...`);
      return await this.generateSimplifiedPage(spec, componentPlan, existingComponents);
    }

    const pageText = response.content[0].text;
    const page = this.parsePage(pageText);

    // Preserve pageAssociation metadata for later linking by ComponentOrchestrator
    if (spec.pageAssociation) {
      page._pageAssociation = spec.pageAssociation;
      page._specName = spec.name; // Original spec name for matching
    }

    console.log(`[PageExpert] Generated page: ${page.name}`);
    return page;
  }

  /**
   * Generate a simplified page when main generation is truncated
   */
  async generateSimplifiedPage(spec, componentPlan, existingComponents) {
    console.log(`[PageExpert] Generating SIMPLIFIED page: ${spec.name}...`);

    const simplifiedPrompt = `Generate a MINIMAL page for: ${spec.name}

Purpose: ${spec.purpose}

STRICT CONSTRAINTS:
- MAX 3 components only across all sections
- Use minimal config
- Keep descriptions to 1 sentence
- Include basic navigation if applicable

Return ONLY valid JSON:
{
  "id": "page-id",
  "name": "${spec.name}",
  "title": "Page Title",
  "description": "One sentence",
  "route": "/${spec.name.toLowerCase().replace(/\s+/g, '-')}",
  "type": "list|detail|form|dashboard",
  "platform": "both",
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        {
          "type": "text",
          "config": {
            "text": "${spec.name}",
            "variant": "h1"
          }
        }
      ]
    },
    {
      "id": "main",
      "type": "main",
      "components": [
        {
          "type": "card|table|form",
          "config": {
            "title": "Content"
          }
        }
      ]
    }
  ],
  "navigation": {
    "onAction": {},
    "menu": []
  },
  "layout": {
    "type": "single-column",
    "responsive": true
  }
}`;

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: simplifiedPrompt
        }]
      });
    });

    const pageText = response.content[0].text;
    const page = this.parsePage(pageText);

    console.log(`[PageExpert] Generated simplified page: ${page.name}`);
    return page;
  }

  /**
   * Generate multiple pages in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan, existingComponents = {}) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, existingComponents)];

    console.log(`[PageExpert] Generating ${specs.length} pages in batch...`);

    const prompt = this.buildBatchPrompt(specs, componentPlan, existingComponents);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const pagesText = response.content[0].text;
    const pages = this.parsePages(pagesText);

    // Build spec map for matching back associations
    const specMap = new Map();
    specs.forEach(spec => {
      specMap.set(spec.name.toLowerCase(), spec);
      specMap.set(spec.name.toLowerCase().replace(/[^a-z0-9]/g, ''), spec);
    });

    // Attach _pageAssociation metadata to each generated page
    pages.forEach(page => {
      const normalizedName = page.name?.toLowerCase() || '';
      const normalizedNoSpecial = normalizedName.replace(/[^a-z0-9]/g, '');

      // Try to find matching spec
      let matchingSpec = specMap.get(normalizedName) || specMap.get(normalizedNoSpecial);

      // Fallback: fuzzy match
      if (!matchingSpec) {
        for (const [key, spec] of specMap.entries()) {
          if (normalizedName.includes(key) || key.includes(normalizedName)) {
            matchingSpec = spec;
            break;
          }
        }
      }

      if (matchingSpec && matchingSpec.pageAssociation) {
        page._pageAssociation = matchingSpec.pageAssociation;
        page._specName = matchingSpec.name;
      }
    });

    console.log(`[PageExpert] Generated ${pages.length} pages`);
    return pages;
  }

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    // Extract available pages for navigation
    const otherPages = componentPlan.componentSpecs
      .filter(c => c.type === 'page' && c.name !== spec.name)
      .map(p => ({ name: p.name, route: `/${p.name.toLowerCase().replace(/\s+/g, '-')}` }));

    // Extract design system if available
    const designSystem = componentPlan.designSystem;
    const designGuidelines = designSystem ? this.formatDesignGuidelines(designSystem) : '';

    // Extract page association context from spec (for plan-based linking)
    const pageAssociation = spec.pageAssociation || {};
    const associationContext = pageAssociation.forWorkflow || pageAssociation.pageType ? `
**PAGE ASSOCIATION CONTEXT**:
- For Workflow: ${pageAssociation.forWorkflow || 'N/A'}
- Page Type: ${pageAssociation.pageType || 'list'}
${pageAssociation.displaysForms && pageAssociation.displaysForms.length > 0 ? `- Displays Forms: ${pageAssociation.displaysForms.join(', ')}` : ''}
${pageAssociation.displaysDataModels && pageAssociation.displaysDataModels.length > 0 ? `- Displays Data Models: ${pageAssociation.displaysDataModels.join(', ')}` : ''}
${pageAssociation.navigationFlow ? `- Navigation Flow: Previous=${pageAssociation.navigationFlow.previousPage || 'None'}, Next=${pageAssociation.navigationFlow.nextPage || 'None'}` : ''}

IMPORTANT: Design this page specifically for its role in the application:
${pageAssociation.pageType === 'dashboard' ? '- This is a DASHBOARD page - show summary metrics, charts, and quick actions.' : ''}
${pageAssociation.pageType === 'list' ? '- This is a LIST page - display a table/list of items with search, filter, and CRUD actions.' : ''}
${pageAssociation.pageType === 'detail' ? '- This is a DETAIL page - show full details of a single item with edit/delete options.' : ''}
${pageAssociation.pageType === 'form' ? '- This is a FORM page - embed a form for data entry or editing.' : ''}
${pageAssociation.pageType === 'report' ? '- This is a REPORT page - display charts, analytics, and data summaries.' : ''}
` : '';

    return `Generate a page for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}
${associationContext}
Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Available data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}
${existingComponents.forms ? `- Available forms: ${existingComponents.forms.map(f => `${f.name} (ID: ${f.id})`).join(', ')}` : ''}
${existingComponents.workflows ? `- Available workflows: ${existingComponents.workflows.map(w => w.name).join(', ')}` : ''}
${otherPages.length > 0 ? `- Other pages in app: ${otherPages.map(p => p.name).join(', ')}` : ''}

${designGuidelines}

CRITICAL Requirements:
1. **POPULATE FORMS ARRAY**: Add relevant form IDs to the "forms" array based on page purpose (e.g., list pages get create forms, detail pages get edit forms)
2. **ADD NAVIGATION**: Include navigation.menu with links to other pages in the app
3. Structure pages using SECTIONS (header, main, footer) with components inside sections
4. Link forms using formRef in components if needed
5. Include actual content in components (text, labels, data bindings)
6. Maximum 4-6 components total across all sections
7. Use appropriate page type (list, detail, form, dashboard, auth, confirmation)
${designSystem ? '8. CRITICAL: Apply the design system specifications above to ALL styling properties' : ''}

Return ONLY valid JSON in this format:
{
  "id": "unique-id",
  "name": "${spec.name}",
  "title": "Page Title",
  "description": "Brief description",
  "route": "/${spec.name.toLowerCase().replace(/\s+/g, '-')}",
  "type": "list|detail|form|dashboard|auth|confirmation",
  "platform": "both",
  "forms": ["relevant-form-id-1", "relevant-form-id-2"],
  "sections": [
    {
      "id": "header",
      "type": "header",
      "components": [
        {
          "type": "text",
          "config": {
            "text": "Page Title",
            "variant": "h1"
          }
        }
      ]
    },
    {
      "id": "main",
      "type": "main",
      "components": [
        {
          "type": "card|table|form|button|list",
          "config": {
            "title": "Component Title"
          },
          "dataBinding": "modelName.query",
          "formRef": "form-id-if-applicable"
        }
      ]
    }
  ],
  "navigation": {
    "onAction": {
      "submit": { "type": "navigate", "target": "/target-page-route" },
      "view": { "type": "navigate", "target": "/details-page" }
    },
    "menu": [
      { "label": "Other Page", "route": "/other-page" },
      { "label": "Dashboard", "route": "/dashboard" }
    ]
  },
  "layout": {
    "type": "single-column|two-column|grid|dashboard",
    "responsive": true,
    "spacing": "normal"
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan, existingComponents = {}) {
    // Build detailed spec list with association context
    const specList = specs.map(s => {
      const assoc = s.pageAssociation || {};
      let specInfo = `- ${s.name}: ${s.purpose}`;
      if (assoc.forWorkflow) {
        specInfo += `\n    For Workflow: ${assoc.forWorkflow}`;
      }
      if (assoc.pageType) {
        specInfo += `\n    Page Type: ${assoc.pageType}`;
      }
      if (assoc.displaysForms && assoc.displaysForms.length > 0) {
        specInfo += `\n    Displays Forms: ${assoc.displaysForms.join(', ')}`;
      }
      if (assoc.displaysDataModels && assoc.displaysDataModels.length > 0) {
        specInfo += `\n    Displays Data Models: ${assoc.displaysDataModels.join(', ')}`;
      }
      if (assoc.navigationFlow) {
        specInfo += `\n    Nav Flow: Prev=${assoc.navigationFlow.previousPage || 'None'}, Next=${assoc.navigationFlow.nextPage || 'None'}`;
      }
      return specInfo;
    }).join('\n');

    const allPageNames = specs.map(s => s.name);

    // Extract design system if available
    const designSystem = componentPlan.designSystem;
    const designGuidelines = designSystem ? this.formatDesignGuidelines(designSystem) : '';

    return `Generate ${specs.length} pages for: ${componentPlan.overview.name}

Pages to generate (with their workflow/form associations):
${specList}

${designGuidelines}

Context:
${existingComponents.forms ? `- Available forms: ${existingComponents.forms.map(f => `${f.name} (ID: ${f.id})`).join(', ')}` : '- No forms available yet'}
${existingComponents.dataModels ? `- Available data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}

CRITICAL Requirements for EACH page:
1. **POPULATE FORMS ARRAY**: Add relevant form IDs to the "forms" array (list pages get create forms, detail pages get edit forms)
2. **ADD NAVIGATION MENU**: Include navigation.menu with links to ALL other pages in the app
3. Structure with SECTIONS (header, main) containing components
4. Include actual content in components (not empty)
5. Link forms using formRef where applicable
6. Use appropriate page types (list, detail, form, dashboard, auth, confirmation)
${designSystem ? '7. CRITICAL: Apply the design system specifications above to ALL styling properties' : ''}

Available pages for navigation: ${allPageNames.join(', ')}

Return ONLY valid JSON array:
[
  {
    "id": "unique-id",
    "name": "PageName",
    "title": "Page Title",
    "description": "Brief description",
    "route": "/page-name",
    "type": "list|detail|form|dashboard|auth|confirmation",
    "platform": "both",
    "forms": ["form-id-1", "form-id-2"],
    "sections": [
      {
        "id": "header",
        "type": "header",
        "components": [{ "type": "text", "config": { "text": "Title", "variant": "h1" } }]
      },
      {
        "id": "main",
        "type": "main",
        "components": [{ "type": "card|table|form", "config": { "title": "Content" }, "dataBinding": "model.query" }]
      }
    ],
    "navigation": {
      "onAction": {
        "action": { "type": "navigate", "target": "/other-page" }
      },
      "menu": [
        { "label": "Page 1", "route": "/page-1" },
        { "label": "Page 2", "route": "/page-2" }
      ]
    },
    "layout": {
      "type": "single-column|grid|dashboard",
      "responsive": true,
      "spacing": "normal"
    }
  }
]`;
  }

  parsePage(text) {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON object
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Try to repair common JSON issues
      jsonText = this.repairJSON(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PageExpert] Parse error:', error);
      console.error('[PageExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[PageExpert] Returning fallback page');
      return this.createFallbackPage();
    }
  }

  /**
   * Create fallback page when parsing fails
   */
  createFallbackPage() {
    return {
      id: `page_fallback_${Date.now()}`,
      name: 'GeneratedPage',
      title: 'Generated Page',
      description: 'Auto-generated page',
      route: '/generated-page',
      type: 'list',
      platform: 'both',
      forms: [],
      sections: [
        {
          id: 'header',
          type: 'header',
          components: [{ type: 'text', config: { text: 'Generated Page', variant: 'h1' } }]
        },
        {
          id: 'main',
          type: 'main',
          components: [{ type: 'card', config: { title: 'Content' } }]
        }
      ],
      navigation: { onAction: {}, menu: [] },
      layout: { type: 'single-column', responsive: true, spacing: 'normal' }
    };
  }

  parsePages(text) {
    try {
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON array
      if (!jsonText.startsWith('[')) {
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Attempt to repair common JSON issues
      jsonText = this.repairJSON(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PageExpert] Parse error:', error);

      // Enhanced error logging with context
      if (error.message.includes('position')) {
        const posMatch = error.message.match(/position (\d+)/);
        if (posMatch) {
          const position = parseInt(posMatch[1]);
          const start = Math.max(0, position - 200);
          const end = Math.min(text.length, position + 200);
          const context = text.substring(start, end);

          console.error('[PageExpert] Error context (200 chars before/after):');
          console.error(context);
          console.error('[PageExpert] Error position marker:', ' '.repeat(Math.min(200, position - start)) + '^');
        }
      }

      console.error('[PageExpert] Full response length:', text.length);
      console.error('[PageExpert] First 1000 chars:', text.substring(0, 1000));
      console.error('[PageExpert] Last 1000 chars:', text.substring(Math.max(0, text.length - 1000)));

      // Return fallback instead of throwing
      console.warn('[PageExpert] Returning fallback pages array');
      return [this.createFallbackPage()];
    }
  }

  /**
   * Attempt to repair common JSON formatting issues
   */
  repairJSON(jsonText) {
    let repaired = jsonText;

    // Remove trailing commas before closing brackets/braces
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');

    // Fix missing commas between array elements
    repaired = repaired.replace(/\}(\s*)\{/g, '},$1{');

    // Fix missing commas between object properties (common when truncated)
    repaired = repaired.replace(/"(\s*)"(\w+)":/g, '",$1"$2":');

    // Remove any text after the final closing bracket
    const lastBracket = repaired.lastIndexOf(']');
    if (lastBracket !== -1 && lastBracket < repaired.length - 1) {
      const afterBracket = repaired.substring(lastBracket + 1).trim();
      if (afterBracket && !afterBracket.match(/^[\s\n]*$/)) {
        console.warn('[PageExpert] Removing text after final bracket:', afterBracket.substring(0, 100));
        repaired = repaired.substring(0, lastBracket + 1);
      }
    }

    // Fix truncated JSON by closing unclosed arrays/objects
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    if (openBraces > closeBraces) {
      console.warn(`[PageExpert] Closing ${openBraces - closeBraces} unclosed braces`);
      repaired += '}'.repeat(openBraces - closeBraces);
    }

    if (openBrackets > closeBrackets) {
      console.warn(`[PageExpert] Closing ${openBrackets - closeBrackets} unclosed brackets`);
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }

    return repaired;
  }

  /**
   * Format design system into prompt-friendly text
   */
  formatDesignGuidelines(designSystem) {
    if (!designSystem) return '';

    let guidelines = '**DESIGN SYSTEM - APPLY TO ALL PAGES**:\n\n';

    // Colors
    if (designSystem.colors) {
      guidelines += '**Colors**:\n';
      if (designSystem.colors.primary) guidelines += `- Primary: ${designSystem.colors.primary}\n`;
      if (designSystem.colors.secondary) guidelines += `- Secondary: ${designSystem.colors.secondary}\n`;
      if (designSystem.colors.background) guidelines += `- Background: ${designSystem.colors.background}\n`;
      if (designSystem.colors.text) guidelines += `- Text: ${designSystem.colors.text}\n`;
      if (designSystem.colors.border) guidelines += `- Border: ${designSystem.colors.border}\n`;
      guidelines += '\n';
    }

    // Typography
    if (designSystem.typography) {
      guidelines += '**Typography**:\n';
      if (designSystem.typography.fontFamily) guidelines += `- Font: ${designSystem.typography.fontFamily}\n`;
      if (designSystem.typography.fontSize) {
        guidelines += `- Base size: ${designSystem.typography.fontSize.base}\n`;
        guidelines += `- Heading sizes: H1=${designSystem.typography.fontSize.h1 || '24px'}, H2=${designSystem.typography.fontSize.h2 || '20px'}\n`;
        guidelines += `- Label size: ${designSystem.typography.fontSize.label}\n`;
      }
      if (designSystem.typography.fontWeight) {
        guidelines += `- Title weight: ${designSystem.typography.fontWeight.title || '600'}\n`;
        guidelines += `- Label weight: ${designSystem.typography.fontWeight.label}\n`;
      }
      guidelines += '\n';
    }

    // Spacing
    if (designSystem.spacing) {
      guidelines += '**Spacing**:\n';
      if (designSystem.spacing.container) guidelines += `- Container padding: ${designSystem.spacing.container}\n`;
      if (designSystem.spacing.sectionGap) guidelines += `- Section gap: ${designSystem.spacing.sectionGap}\n`;
      if (designSystem.spacing.componentGap) guidelines += `- Component gap: ${designSystem.spacing.componentGap || '16px'}\n`;
      guidelines += '\n';
    }

    // Components (Cards)
    if (designSystem.components?.card) {
      const card = designSystem.components.card;
      guidelines += '**Cards**:\n';
      if (card.borderRadius) guidelines += `- Border radius: ${card.borderRadius}\n`;
      if (card.shadow) guidelines += `- Shadow: ${card.shadow}\n`;
      if (card.padding) guidelines += `- Padding: ${card.padding}\n`;
      guidelines += '\n';
    }

    // Components (Buttons)
    if (designSystem.components?.button) {
      const button = designSystem.components.button;
      guidelines += '**Buttons**:\n';
      if (button.primary) {
        guidelines += `- Primary: bg=${button.primary.background}, color=${button.primary.color}, padding=${button.primary.padding}\n`;
      }
      if (button.secondary) {
        guidelines += `- Secondary: bg=${button.secondary.background}, color=${button.secondary.color}, border=${button.secondary.border}\n`;
      }
      guidelines += '\n';
    }

    // Layout
    if (designSystem.layout) {
      guidelines += '**Layout**:\n';
      if (designSystem.layout.maxWidth) guidelines += `- Max width: ${designSystem.layout.maxWidth}\n`;
      if (designSystem.layout.columns) {
        guidelines += `- Desktop columns: ${designSystem.layout.columns.desktop}\n`;
        guidelines += `- Mobile columns: ${designSystem.layout.columns.mobile}\n`;
      }
      guidelines += '\n';
    }

    return guidelines;
  }
}

module.exports = PageExpert;
