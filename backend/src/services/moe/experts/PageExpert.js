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
   * Generate a single page
   */
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[PageExpert] Generating page: ${spec.name}...`);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000, // Increased from 2000 to handle dashboard pages
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Check for truncation
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[PageExpert] Response truncated for ${spec.name}, retrying with stricter constraints...`);
      return await this.generateSimplifiedPage(spec, componentPlan, existingComponents);
    }

    const pageText = response.content[0].text;
    const page = this.parsePage(pageText);

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

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: simplifiedPrompt
      }]
    });

    const pageText = response.content[0].text;
    const page = this.parsePage(pageText);

    console.log(`[PageExpert] Generated simplified page: ${page.name}`);
    return page;
  }

  /**
   * Generate multiple pages in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, {})];

    console.log(`[PageExpert] Generating ${specs.length} pages in batch...`);

    const prompt = this.buildBatchPrompt(specs, componentPlan);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 5000, // Increased from 4000 to handle multiple pages
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const pagesText = response.content[0].text;
    const pages = this.parsePages(pagesText);

    console.log(`[PageExpert] Generated ${pages.length} pages`);
    return pages;
  }

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    // Extract available pages for navigation
    const otherPages = componentPlan.componentSpecs
      .filter(c => c.type === 'page' && c.name !== spec.name)
      .map(p => ({ name: p.name, route: `/${p.name.toLowerCase().replace(/\s+/g, '-')}` }));

    return `Generate a page for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}

Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Available data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}
${existingComponents.forms ? `- Available forms: ${existingComponents.forms.map(f => f.name).join(', ')}` : ''}
${existingComponents.workflows ? `- Available workflows: ${existingComponents.workflows.map(w => w.name).join(', ')}` : ''}
${otherPages.length > 0 ? `- Other pages in app: ${otherPages.map(p => p.name).join(', ')}` : ''}

CRITICAL Requirements:
1. Structure pages using SECTIONS (header, main, footer) with components inside sections
2. Add NAVIGATION connections to other pages using navigation.onAction and navigation.menu
3. Link forms using formRef in components
4. Include actual content in components (text, labels, data bindings)
5. Maximum 4-6 components total across all sections
6. Use appropriate page type (list, detail, form, dashboard, auth, confirmation)

Return ONLY valid JSON in this format:
{
  "id": "unique-id",
  "name": "${spec.name}",
  "title": "Page Title",
  "description": "Brief description",
  "route": "/${spec.name.toLowerCase().replace(/\s+/g, '-')}",
  "type": "list|detail|form|dashboard|auth|confirmation",
  "platform": "both",
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
      { "label": "Menu Item", "route": "/other-page" }
    ]
  },
  "layout": {
    "type": "single-column|two-column|grid|dashboard",
    "responsive": true,
    "spacing": "normal"
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan) {
    const specList = specs.map(s => `- ${s.name}: ${s.purpose}`).join('\n');
    const allPageNames = specs.map(s => s.name);

    return `Generate ${specs.length} pages for: ${componentPlan.overview.name}

Pages to generate:
${specList}

CRITICAL Requirements for EACH page:
1. Structure with SECTIONS (header, main) containing components
2. Add NAVIGATION to connect pages (navigation.onAction and navigation.menu)
3. Include actual content in components (not empty)
4. Link forms using formRef where applicable
5. Use appropriate page types (list, detail, form, dashboard, auth, confirmation)

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
      "menu": [{ "label": "Link", "route": "/other-page" }]
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

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PageExpert] Parse error:', error);
      console.error('[PageExpert] Text:', text.substring(0, 500));
      throw new Error(`Failed to parse page: ${error.message}`);
    }
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

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[PageExpert] Parse error:', error);
      console.error('[PageExpert] Text:', text.substring(0, 500));
      throw new Error(`Failed to parse pages: ${error.message}`);
    }
  }
}

module.exports = PageExpert;
