/**
 * DesignExpert - UI/UX Design Analysis and Generation Expert
 *
 * Capabilities:
 * 1. Analyze Figma designs and extract component structure
 * 2. Analyze PDF design files (wireframes, mockups, UI specs)
 * 3. Generate optimal designs when no design is provided
 * 4. Output forms and pages based on design analysis
 */

const BaseAgent = require('../../agents/BaseAgent');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

class DesignExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Design Expert - UI/UX Design Analysis and Generation

## Specialization:
I analyze visual designs (Figma, PDF, images) and translate them into structured forms and pages.
When no design is provided, I generate optimal UI/UX designs based on best practices and the application domain.

## Design Sources I Handle:

### 1. **Figma Designs**
- Parse Figma file structure
- Extract components, frames, and layouts
- Identify form fields, buttons, navigation
- Maintain design system consistency

### 2. **PDF/Image Designs**
- Analyze wireframes and mockups
- Extract layout structure
- Identify UI components and their properties
- Understand information hierarchy

### 3. **Auto-Generated Designs**
- When no design is provided, create optimal layouts
- Follow modern UI/UX best practices
- Use industry-standard patterns for the domain
- Ensure accessibility and responsiveness

## Design Analysis Process:

### Step 1: Identify Design Elements
- **Forms**: Input fields, labels, validation rules
- **Pages**: Screens, layouts, navigation
- **Components**: Buttons, cards, tables, charts
- **Navigation**: Menus, tabs, breadcrumbs
- **Data Display**: Lists, grids, details views

### Step 2: Extract Component Properties
- **Input Fields**: Type, label, placeholder, validation
- **Buttons**: Label, action, style, placement
- **Layouts**: Grid, flex, responsive breakpoints
- **Colors**: Primary, secondary, accent colors
- **Typography**: Fonts, sizes, weights

### Step 3: Map to Data Models
- Connect form fields to data model fields
- Identify relationships between pages and data
- Create data bindings for dynamic content

## Output Format:

Return a JSON object with "forms" and "pages" arrays:

{
  "designAnalysis": {
    "source": "figma|pdf|auto-generated",
    "designSystem": {
      "colors": { "primary": "#hex", "secondary": "#hex" },
      "typography": { "headingFont": "Font", "bodyFont": "Font" },
      "spacing": { "unit": "8px", "scale": [8, 16, 24, 32, 48, 64] }
    },
    "theme": "light|dark|auto"
  },
  "forms": [
    {
      "id": "form_id",
      "name": "Form Name",
      "description": "Form purpose",
      "designReference": "figma-node-id or pdf-page-number",
      "layout": {
        "type": "single-column|two-column|grid|wizard",
        "columns": 1,
        "spacing": "comfortable|compact"
      },
      "fields": [
        {
          "id": "field_id",
          "name": "fieldName",
          "label": "Field Label",
          "type": "text|email|number|select|checkbox|radio|date|file|textarea",
          "placeholder": "Placeholder text",
          "required": true|false,
          "validation": {
            "rules": ["required", "email", "minLength:3"],
            "errorMessage": "Error message"
          },
          "styling": {
            "width": "full|half|third",
            "order": 1
          },
          "options": [] // For select, radio, checkbox
        }
      ],
      "actions": [
        {
          "type": "submit|cancel|reset",
          "label": "Button Label",
          "style": "primary|secondary|outline",
          "position": "left|center|right"
        }
      ],
      "validation": {
        "onSubmit": true,
        "onBlur": false,
        "realTime": false
      }
    }
  ],
  "pages": [
    {
      "id": "page_id",
      "name": "Page Name",
      "type": "list|detail|form|dashboard|auth|confirmation",
      "route": "/path",
      "platform": "web|mobile|both",
      "designReference": "figma-frame-id or pdf-page-number",
      "layout": {
        "type": "single|two-column|grid|dashboard",
        "responsive": true,
        "maxWidth": "1200px",
        "padding": "md"
      },
      "sections": [
        {
          "id": "section_id",
          "type": "header|main|sidebar|footer",
          "width": "full|constrained",
          "components": [
            {
              "type": "text|button|card|table|form|input|list|chart|image",
              "config": {
                "text": "Component content",
                "variant": "h1|h2|h3|p|caption",
                "align": "left|center|right"
              },
              "styling": {
                "margin": "md",
                "padding": "sm",
                "background": "#ffffff",
                "borderRadius": "8px"
              },
              "dataBinding": "model.query",
              "formRef": "form_id"
            }
          ]
        }
      ],
      "navigation": {
        "header": {
          "logo": true,
          "menu": [
            { "label": "Menu Item", "route": "/path", "icon": "icon-name" }
          ],
          "actions": [
            { "label": "Action", "action": "action-name" }
          ]
        },
        "footer": {
          "links": [],
          "copyright": true
        }
      },
      "styling": {
        "backgroundColor": "#ffffff",
        "textColor": "#000000",
        "spacing": "comfortable"
      }
    }
  ]
}

## Design Principles:

### For Forms:
- **Clear Labels**: Every field has a clear, descriptive label
- **Logical Grouping**: Related fields are grouped together
- **Visual Hierarchy**: Important fields are emphasized
- **Validation Feedback**: Clear, helpful error messages
- **Accessibility**: ARIA labels, keyboard navigation

### For Pages:
- **Information Hierarchy**: Most important content first
- **Consistent Navigation**: Same patterns across pages
- **Responsive Design**: Mobile-first approach
- **Loading States**: Feedback during data loading
- **Error States**: Graceful error handling

### Auto-Generation Guidelines (when no design provided):
- **E-commerce**: Product grids, cart, checkout forms
- **Dashboard**: Metric cards, charts, tables
- **CRUD Apps**: List, detail, create/edit forms
- **Auth**: Clean, centered login/register forms
- **Mobile**: Bottom navigation, card-based layouts

## Domain-Specific Patterns:

**Healthcare**: Clean, professional, high-contrast, large touch targets
**Finance**: Secure, professional, data-dense tables, charts
**E-commerce**: Visual-first, product images, quick actions
**Education**: Friendly, engaging, progress indicators
**Social**: Feed-based, media-rich, real-time updates

## Examples:

### Figma Analysis:
When given a Figma URL or file structure:
1. Identify all frames (pages)
2. Extract components from each frame
3. Map text fields, buttons, inputs to form fields
4. Create page structure with proper sections
5. Apply design system (colors, fonts, spacing)

### PDF Analysis:
When given a PDF design:
1. Analyze each page layout
2. Identify UI components (visual recognition)
3. Extract text labels and placeholders
4. Infer component types from visual cues
5. Map to structured forms and pages

### Auto-Generation:
When no design is provided:
1. Analyze application domain and requirements
2. Choose appropriate design pattern
3. Generate clean, modern layouts
4. Use industry best practices
5. Ensure accessibility and responsiveness
`;

    super('DesignExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(userRequirements, conversationHistory, onThinking, designInput = null) {
    // For backward compatibility, check if called with old signature
    let actualUserRequirements = userRequirements;
    let actualDesignInput = designInput;
    let actualOnThinking = onThinking;

    // If first param is an object with userRequirements, it's using old signature
    if (userRequirements && typeof userRequirements === 'object' && userRequirements.userRequirements) {
      const sharedContext = userRequirements;
      actualUserRequirements = sharedContext.userRequirements;
      actualDesignInput = sharedContext.designInput;
      actualOnThinking = conversationHistory; // Second param becomes onThinking in old signature
    }

    if (actualOnThinking) {
      actualOnThinking({
        agent: this.name,
        step: 'Analyzing Design Requirements',
        content: 'Determining design source and analyzing UI/UX needs...'
      });
    }

    // Determine design source
    const designSource = this.detectDesignSource(actualDesignInput);

    if (actualOnThinking) {
      actualOnThinking({
        agent: this.name,
        step: 'Design Source Detected',
        content: `Design source: ${designSource.type}${designSource.description ? ' - ' + designSource.description : ''}`
      });
    }

    let designAnalysisResult;

    // Process based on design source
    switch (designSource.type) {
      case 'figma':
        designAnalysisResult = await this.analyzeFigmaDesign(actualDesignInput, actualUserRequirements, null, actualOnThinking);
        break;
      case 'pdf':
        designAnalysisResult = await this.analyzePDFDesign(actualDesignInput, actualUserRequirements, null, actualOnThinking);
        break;
      case 'image':
        designAnalysisResult = await this.analyzeImageDesign(actualDesignInput, actualUserRequirements, null, actualOnThinking);
        break;
      case 'auto':
      default:
        designAnalysisResult = await this.generateOptimalDesign(actualUserRequirements, null, null, actualOnThinking);
        break;
    }

    if (actualOnThinking) {
      actualOnThinking({
        agent: this.name,
        step: 'Design Analysis Complete',
        content: `Generated ${designAnalysisResult.forms?.length || 0} forms and ${designAnalysisResult.pages?.length || 0} pages`
      });
    }

    return {
      forms: designAnalysisResult.forms || [],
      pages: designAnalysisResult.pages || [],
      designAnalysis: designAnalysisResult.designAnalysis || {},
      expertType: 'DesignExpert'
    };
  }

  detectDesignSource(designInput) {
    if (!designInput) {
      return { type: 'auto', description: 'No design provided, will auto-generate' };
    }

    if (typeof designInput === 'string') {
      // Check for Figma URL
      if (designInput.includes('figma.com')) {
        return { type: 'figma', description: 'Figma design URL detected', url: designInput };
      }

      // Check for PDF file path or URL
      if (designInput.toLowerCase().endsWith('.pdf') || designInput.includes('.pdf')) {
        return { type: 'pdf', description: 'PDF design file detected', path: designInput };
      }

      // Check for image file
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
      if (imageExtensions.some(ext => designInput.toLowerCase().includes(ext))) {
        return { type: 'image', description: 'Image design file detected', path: designInput };
      }
    }

    // Check for structured design input
    if (designInput.figmaUrl) {
      return { type: 'figma', description: 'Figma design data', url: designInput.figmaUrl };
    }

    if (designInput.pdfPath || designInput.pdfUrl) {
      return { type: 'pdf', description: 'PDF design data', path: designInput.pdfPath || designInput.pdfUrl };
    }

    if (designInput.imageData || designInput.imagePath) {
      return { type: 'image', description: 'Image design data', data: designInput };
    }

    return { type: 'auto', description: 'Design input not recognized, will auto-generate' };
  }

  async analyzeFigmaDesign(designInput, userRequirements, dataModels, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Figma Design',
        content: 'Extracting components and layouts from Figma...'
      });
    }

    // Build context
    const context = this.buildContext(userRequirements, dataModels);

    const prompt = `Analyze this Figma design and extract forms and pages:

**Figma Design**: ${typeof designInput === 'string' ? designInput : JSON.stringify(designInput)}

**Application Context**:
${JSON.stringify(context, null, 2)}

**Task**:
1. Analyze the Figma design structure
2. Identify all forms (input fields, labels, buttons)
3. Identify all pages/screens (layouts, sections, navigation)
4. Extract design system (colors, fonts, spacing)
5. Map form fields to data models
6. Create structured output

**Guidelines**:
- Extract actual design elements from Figma
- Maintain design consistency
- Map to data models where possible
- Include all styling information
- Create proper field validation based on field types

Return ONLY valid JSON with the structure specified in your knowledge base.
Include both "forms" and "pages" arrays with complete component details.`;

    const messages = [{ role: 'user', content: prompt }];
    const responseText = await this.getResponse(messages);
    return this.parseJsonResponse(responseText);
  }

  async analyzePDFDesign(designInput, userRequirements, dataModels, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing PDF Design',
        content: 'Extracting UI components from PDF wireframes/mockups using vision analysis...'
      });
    }

    try {
      // Read PDF file and convert to base64
      const pdfData = await this.readPDFFile(designInput);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'PDF Loaded',
          content: `PDF file loaded successfully (${Math.round(pdfData.size / 1024)}KB). Analyzing with Claude Vision...`
        });
      }

      const context = this.buildContext(userRequirements, dataModels);

      const analysisPrompt = `Analyze this PDF design file and extract UI/UX components to generate forms and pages.

**Application Context**:
${JSON.stringify(context, null, 2)}

**Your Task**:
Carefully examine each page of this PDF design document (wireframes, mockups, or UI specifications) and:

1. **Identify All UI Components**:
   - Form input fields (text boxes, dropdowns, checkboxes, radio buttons, date pickers)
   - Buttons (submit, cancel, action buttons)
   - Tables and data grids
   - Navigation menus and breadcrumbs
   - Cards and content containers
   - Headers, footers, sidebars

2. **Extract Form Details**:
   - Field labels and placeholders
   - Field types (text, email, number, select, etc.)
   - Required fields (usually marked with * or "required")
   - Validation hints
   - Field groupings

3. **Extract Page Layouts**:
   - Page titles and headers
   - Section divisions
   - Component placement and hierarchy
   - Navigation structure
   - Responsive breakpoints (if shown)

4. **Infer Design System**:
   - Primary and secondary colors
   - Typography (if visible)
   - Spacing and padding
   - Button styles
   - Input field styles

5. **Map to Data Models**:
   - Connect form fields to data model fields
   - Identify relationships between pages and data

**Visual Analysis Guidelines**:
- Rectangular boxes with borders = Input fields
- Solid rectangles with text = Buttons
- Grid structures = Tables or card layouts
- Horizontal/vertical bars = Navigation menus
- Grouped elements = Form sections or related components
- Asterisks (*) or "required" text = Required fields
- Icons or symbols = Action buttons or status indicators

**Output Requirements**:
Return ONLY valid JSON with this exact structure:

{
  "designAnalysis": {
    "source": "pdf",
    "pagesAnalyzed": <number>,
    "designSystem": {
      "colors": { "primary": "#hex", "secondary": "#hex" },
      "typography": { "headingFont": "FontName", "bodyFont": "FontName" },
      "spacing": { "unit": "8px" }
    }
  },
  "forms": [
    {
      "id": "form_<name>",
      "name": "Form Name from PDF",
      "description": "Purpose of this form",
      "designReference": "PDF page number",
      "layout": { "type": "single-column|two-column|grid", "columns": 1 },
      "fields": [
        {
          "id": "field_<name>",
          "name": "fieldName",
          "label": "Label from PDF",
          "type": "text|email|number|select|checkbox|radio|date|textarea",
          "placeholder": "Placeholder text if visible",
          "required": true|false,
          "validation": { "rules": [], "errorMessage": "" },
          "styling": { "width": "full|half|third", "order": 1 }
        }
      ],
      "actions": [
        { "type": "submit|cancel", "label": "Button text from PDF", "style": "primary|secondary" }
      ]
    }
  ],
  "pages": [
    {
      "id": "page_<name>",
      "name": "Page Name from PDF",
      "type": "list|detail|form|dashboard",
      "route": "/path",
      "designReference": "PDF page number",
      "sections": [
        {
          "id": "section_<name>",
          "type": "header|main|sidebar|footer",
          "components": [
            {
              "type": "text|button|card|table|form|input",
              "config": { "text": "Content", "variant": "h1|p" }
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT:
- Analyze EVERY page in the PDF
- Extract ALL visible forms and fields
- Be thorough and detailed
- If uncertain about a field type, use "text" as default
- Include all buttons and actions you see`;

      // Use Claude's vision API with PDF support
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfData.base64
              }
            },
            {
              type: 'text',
              text: analysisPrompt
            }
          ]
        }],
        system: this.buildSystemPrompt()
      });

      const responseText = response.content[0].text;

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'PDF Analysis Complete',
          content: 'Successfully analyzed PDF design. Extracting forms and pages...'
        });
      }

      const result = this.parseJsonResponse(responseText);

      // Ensure all data models have forms
      result.forms = this.ensureFormsForDataModels(result.forms || [], dataModels);

      return result;

    } catch (error) {
      console.error('[DesignExpert] PDF analysis failed:', error);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'PDF Analysis Error',
          content: `Failed to analyze PDF: ${error.message}. Falling back to auto-generation...`
        });
      }

      // Fallback to auto-generation
      return await this.generateOptimalDesign(userRequirements, dataModels, null, onThinking);
    }
  }

  /**
   * Read PDF file and convert to base64
   */
  async readPDFFile(designInput) {
    // Check if base64 data was already provided by MoEOrchestrator
    if (this.base64Data) {
      console.log('[DesignExpert] Using provided base64 PDF data');
      return {
        base64: this.base64Data,
        size: this.base64Data.length,
        path: typeof designInput === 'string' ? designInput : 'uploaded-file.pdf'
      };
    }

    let pdfPath;

    // Determine PDF path
    if (typeof designInput === 'string') {
      pdfPath = designInput;
    } else if (designInput.pdfPath) {
      pdfPath = designInput.pdfPath;
    } else if (designInput.pdfUrl) {
      throw new Error('PDF URLs not yet supported. Please provide a local file path.');
    } else {
      throw new Error('Invalid PDF input');
    }

    // Check if path is absolute or relative
    if (!path.isAbsolute(pdfPath)) {
      pdfPath = path.resolve(process.cwd(), pdfPath);
    }

    // Read file
    const buffer = await fs.readFile(pdfPath);
    const base64 = buffer.toString('base64');

    return {
      base64,
      size: buffer.length,
      path: pdfPath
    };
  }

  async analyzeImageDesign(designInput, userRequirements, dataModels, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Image Design',
        content: 'Extracting UI components from design images using vision analysis...'
      });
    }

    try {
      // Read image file and convert to base64
      const imageData = await this.readImageFile(designInput);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Image Loaded',
          content: `Image loaded successfully (${Math.round(imageData.size / 1024)}KB). Analyzing with Claude Vision...`
        });
      }

      const context = this.buildContext(userRequirements, dataModels);

      const analysisPrompt = `Analyze this UI design image and extract UI/UX components to generate forms and pages.

**Application Context**:
${JSON.stringify(context, null, 2)}

**Your Task**:
Carefully examine this design image (screenshot, mockup, or wireframe) and:

1. **Identify All UI Components**:
   - Form fields, inputs, dropdowns
   - Buttons and actions
   - Tables, lists, grids
   - Navigation elements
   - Cards and containers
   - Text and headings

2. **Extract Design Details**:
   - Colors and color scheme
   - Typography and font styles
   - Spacing and layout
   - Component styles
   - Icons and graphics

3. **Map to Structure**:
   - Forms with all fields
   - Pages with sections
   - Navigation patterns
   - Data bindings

**Visual Analysis Guidelines**:
- Input fields: boxes with borders, placeholder text
- Buttons: solid rectangles with labels
- Navigation: menus, tabs, breadcrumbs
- Forms: grouped input fields with labels
- Tables: grid structures with headers
- Required fields: marked with * or "required"

Return ONLY valid JSON with the same structure as PDF analysis.`;

      // Determine media type
      const mediaType = this.getImageMediaType(imageData.path);

      // Use Claude's vision API with image support
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageData.base64
              }
            },
            {
              type: 'text',
              text: analysisPrompt
            }
          ]
        }],
        system: this.buildSystemPrompt()
      });

      const responseText = response.content[0].text;

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Image Analysis Complete',
          content: 'Successfully analyzed design image. Extracting forms and pages...'
        });
      }

      const result = this.parseJsonResponse(responseText);

      // Ensure all data models have forms
      result.forms = this.ensureFormsForDataModels(result.forms || [], dataModels);

      return result;

    } catch (error) {
      console.error('[DesignExpert] Image analysis failed:', error);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Image Analysis Error',
          content: `Failed to analyze image: ${error.message}. Falling back to auto-generation...`
        });
      }

      // Fallback to auto-generation
      return await this.generateOptimalDesign(userRequirements, dataModels, null, onThinking);
    }
  }

  /**
   * Read image file and convert to base64
   */
  async readImageFile(designInput) {
    // Check if base64 data was already provided by MoEOrchestrator
    if (this.base64Data) {
      console.log('[DesignExpert] Using provided base64 image data');
      return {
        base64: this.base64Data,
        size: this.base64Data.length,
        path: typeof designInput === 'string' ? designInput : 'uploaded-image.png'
      };
    }

    let imagePath;

    // Determine image path
    if (typeof designInput === 'string') {
      imagePath = designInput;
    } else if (designInput.imagePath) {
      imagePath = designInput.imagePath;
    } else if (designInput.imageData) {
      // Already base64 encoded
      return {
        base64: designInput.imageData,
        size: designInput.imageData.length,
        path: 'inline-data'
      };
    } else {
      throw new Error('Invalid image input');
    }

    // Check if path is absolute or relative
    if (!path.isAbsolute(imagePath)) {
      imagePath = path.resolve(process.cwd(), imagePath);
    }

    // Read file
    const buffer = await fs.readFile(imagePath);
    const base64 = buffer.toString('base64');

    return {
      base64,
      size: buffer.length,
      path: imagePath
    };
  }

  /**
   * Get media type from file path
   */
  getImageMediaType(filePath) {
    // Use provided MIME type if available (from uploaded file)
    if (this.mimeType) {
      console.log('[DesignExpert] Using provided MIME type:', this.mimeType);
      return this.mimeType;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mediaTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mediaTypes[ext] || 'image/png';
  }

  async generateOptimalDesign(userRequirements, dataModels, workflow, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Optimal Design',
        content: 'Creating UI/UX design based on best practices...'
      });
    }

    const context = this.buildContext(userRequirements, dataModels, workflow);

    const prompt = `Generate an optimal UI/UX design for this application:

**User Requirements**: "${userRequirements}"

**Application Context**:
${JSON.stringify(context, null, 2)}

**Task**:
Since no design was provided, create an optimal design from scratch:

1. **Analyze Domain**: Understand the application type (e-commerce, dashboard, CRUD, etc.)
2. **Choose Patterns**: Select appropriate UI patterns for the domain
3. **Design Forms**: Create forms for all data models
   - Include all fields from data models
   - Add proper validation rules
   - Use appropriate input types
   - Group related fields
   - Include submit/cancel actions

4. **Design Pages**: Create pages for the application
   - List pages for each entity
   - Detail pages for viewing entities
   - Create/Edit pages with forms
   - Dashboard page if appropriate
   - Authentication pages if needed

5. **Apply Design System**:
   - Choose modern, professional colors
   - Use clean, readable typography
   - Apply consistent spacing
   - Ensure accessibility

6. **Make it Responsive**:
   - Mobile-first approach
   - Responsive layouts
   - Touch-friendly controls

**Design Guidelines**:
- Follow modern UI/UX best practices
- Use industry-standard patterns
- Ensure accessibility (WCAG 2.1 AA)
- Create intuitive navigation
- Include proper error states
- Add loading states
- Use appropriate visual hierarchy

**Critical Requirements**:
1. Generate forms for ALL data models
2. Each form must have ALL fields from its data model
3. Create complete CRUD pages (list, detail, create, edit)
4. Include proper navigation between pages
5. Add a dashboard/home page
6. Include authentication pages if workflows require it

Return ONLY valid JSON with the complete structure.
Include detailed "forms" and "pages" arrays with full component specifications.`;

    const messages = [{ role: 'user', content: prompt }];
    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    // Ensure all data models have forms
    result.forms = this.ensureFormsForDataModels(result.forms || [], dataModels);

    return result;
  }

  buildContext(userRequirements, dataModels, workflow) {
    return {
      userRequirements,
      dataModels: (dataModels || []).map(dm => ({
        name: dm.name,
        fields: (dm.fields || []).map(f => ({
          name: f.name,
          type: f.type,
          required: f.required
        }))
      })),
      workflow: workflow ? {
        name: workflow.name,
        nodes: workflow.nodes?.length || 0,
        complexity: workflow.complexity
      } : null
    };
  }

  ensureFormsForDataModels(existingForms, dataModels) {
    if (!dataModels || dataModels.length === 0) {
      return existingForms;
    }

    const forms = [...existingForms];
    const formsByModel = new Map(existingForms.map(f => [f.dataModelRef || f.name.toLowerCase(), f]));

    // Create forms for data models that don't have one
    for (const model of dataModels) {
      const modelKey = model.name.toLowerCase();
      if (!formsByModel.has(modelKey) && !formsByModel.has(model.id)) {
        const newForm = {
          id: `form_${model.name.toLowerCase()}_create`,
          name: `Create ${model.name}`,
          description: `Form to create a new ${model.name}`,
          dataModelRef: model.id || model.name,
          layout: { type: 'single-column', columns: 1, spacing: 'comfortable' },
          fields: (model.fields || []).map((field, index) => ({
            id: `field_${field.name}`,
            name: field.name,
            label: this.formatFieldLabel(field.name),
            type: this.mapFieldType(field.type),
            required: field.required || false,
            placeholder: `Enter ${this.formatFieldLabel(field.name).toLowerCase()}`,
            validation: {
              rules: field.required ? ['required'] : [],
              errorMessage: `${this.formatFieldLabel(field.name)} is required`
            },
            styling: { width: 'full', order: index + 1 }
          })),
          actions: [
            { type: 'submit', label: 'Create', style: 'primary', position: 'right' },
            { type: 'cancel', label: 'Cancel', style: 'secondary', position: 'right' }
          ],
          validation: { onSubmit: true, onBlur: true, realTime: false }
        };
        forms.push(newForm);
      }
    }

    return forms;
  }

  formatFieldLabel(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  mapFieldType(dataType) {
    const typeMap = {
      'string': 'text',
      'text': 'textarea',
      'integer': 'number',
      'number': 'number',
      'boolean': 'checkbox',
      'date': 'date',
      'datetime': 'datetime-local',
      'email': 'email',
      'url': 'url',
      'phone': 'tel',
      'password': 'password'
    };

    return typeMap[dataType?.toLowerCase()] || 'text';
  }
}

module.exports = DesignExpert;
