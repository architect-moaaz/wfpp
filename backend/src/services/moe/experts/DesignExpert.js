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
const { FORM_TYPE_LAYOUTS, detectFormType } = require('../../../utils/smart-layout');
const { DESIGN_PRESETS, getPresetCSS, getTailwindTheme, getPresetEffects } = require('../../../config/design-presets');
const { getDesignSystem } = require('../../../config/design-tokens');

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
      "colors": {
        "primary": "#1a1a1a",
        "secondary": "#374151",
        "background": "#f5f5f5",
        "cardBackground": "#ffffff",
        "cardBorder": "#e8e8e8",
        "text": "#1a1a1a",
        "textSecondary": "#6b7280",
        "labelText": "#374151",
        "border": "#d1d5db",
        "focus": "#000000",
        "info": "#3b82f6",
        "infoBackground": "#f0f9ff",
        "error": "#ef4444",
        "success": "#10b981"
      },
      "typography": {
        "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        "pageTitle": { "size": "28px", "weight": 600, "color": "#1a1a1a" },
        "pageSubtitle": { "size": "15px", "weight": 400, "color": "#6b7280" },
        "sectionHeader": { "size": "16px", "weight": 600, "color": "#1a1a1a" },
        "sectionDescription": { "size": "14px", "weight": 400, "color": "#6b7280" },
        "fieldLabel": { "size": "14px", "weight": 500, "color": "#374151" },
        "inputText": { "size": "14px", "weight": 400, "color": "#1f2937" },
        "helperText": { "size": "13px", "weight": 400, "color": "#6b7280" },
        "buttonText": { "size": "14px", "weight": 500 }
      },
      "spacing": {
        "unit": "8px",
        "scale": [4, 8, 12, 16, 20, 24, 32, 48],
        "sectionPadding": "24px",
        "fieldGap": "16px",
        "sectionGap": "16px",
        "containerMaxWidth": "800px",
        "containerPaddingTop": "32px"
      },
      "borderRadius": {
        "card": "8px",
        "input": "6px",
        "button": "6px",
        "checkbox": "4px"
      },
      "shadows": {
        "card": "none",
        "focus": "none"
      },
      "components": {
        "input": {
          "height": "42px",
          "padding": "10px 12px",
          "border": "1px solid #d1d5db",
          "focusBorder": "1px solid #000000"
        },
        "button": {
          "primary": { "background": "#1a1a1a", "color": "#ffffff", "padding": "10px 24px" },
          "secondary": { "background": "#ffffff", "color": "#374151", "border": "1px solid #d1d5db", "padding": "10px 20px" },
          "text": { "background": "transparent", "color": "#374151" }
        },
        "card": {
          "background": "#ffffff",
          "border": "1px solid #e8e8e8",
          "padding": "24px"
        },
        "infoBox": {
          "background": "#f0f9ff",
          "borderLeft": "4px solid #3b82f6",
          "padding": "12px 16px",
          "textColor": "#1e40af"
        }
      },
      "layout": {
        "maxWidth": "800px",
        "columns": {
          "desktop": 2,
          "tablet": 1,
          "mobile": 1
        },
        "columnGap": "16px",
        "breakpoints": {
          "mobile": "< 768px",
          "tablet": "768px - 1024px",
          "desktop": "> 1024px"
        }
      }
    },
    "theme": "light"
  },
  "forms": [
    {
      "id": "form_id",
      "name": "Form Name",
      "description": "Form purpose",
      "designReference": "figma-node-id or pdf-page-number",
      "layout": {
        "type": "two-column",
        "columns": 2,
        "spacing": "comfortable",
        "maxWidth": "800px",
        "padding": "24px",
        "background": "#ffffff",
        "borderRadius": "8px",
        "shadow": "0 2px 8px rgba(0,0,0,0.08)",
        "responsive": {
          "mobile": { "columns": 1, "padding": "16px" }
        }
      },
      "sections": [
        {
          "id": "section_id",
          "title": "Section Title",
          "description": "Brief description of this section",
          "background": "#f9fafb",
          "padding": "20px",
          "borderRadius": "6px",
          "fields": ["field_id_1", "field_id_2"]
        }
      ],
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
            "width": "half",
            "order": 1,
            "labelStyle": {
              "fontSize": "14px",
              "fontWeight": 500,
              "color": "#374151",
              "marginBottom": "6px"
            },
            "inputStyle": {
              "fontSize": "14px",
              "fontWeight": 400,
              "color": "#1f2937",
              "border": "1px solid #d1d5db",
              "borderRadius": "6px",
              "padding": "10px 12px",
              "focusBorder": "2px solid #3b82f6",
              "focusShadow": "0 0 0 3px rgba(59, 130, 246, 0.1)"
            },
            "helperTextStyle": {
              "fontSize": "12px",
              "color": "#9ca3af",
              "marginTop": "4px"
            }
          },
          "options": [] // For select, radio, checkbox
        }
      ],
      "actions": [
        {
          "type": "cancel",
          "label": "Cancel",
          "style": "text",
          "position": "left",
          "styling": {
            "background": "transparent",
            "color": "#374151",
            "border": "none",
            "fontSize": "14px",
            "fontWeight": 500,
            "cursor": "pointer"
          }
        },
        {
          "type": "draft",
          "label": "Save Draft",
          "style": "secondary",
          "position": "right",
          "styling": {
            "background": "#ffffff",
            "color": "#374151",
            "border": "1px solid #d1d5db",
            "borderRadius": "6px",
            "padding": "10px 20px",
            "fontSize": "14px",
            "fontWeight": 500,
            "cursor": "pointer"
          }
        },
        {
          "type": "submit",
          "label": "Submit Request",
          "style": "primary",
          "position": "right",
          "styling": {
            "background": "#1a1a1a",
            "color": "#ffffff",
            "border": "none",
            "borderRadius": "6px",
            "padding": "10px 24px",
            "fontSize": "14px",
            "fontWeight": 500,
            "hoverBackground": "#000000",
            "cursor": "pointer"
          }
        }
      ],
      "actionGroup": {
        "alignment": "right",
        "gap": "12px",
        "marginTop": "24px"
      },
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
Use the **Reference Design Template** below as the EXACT foundation for all auto-generated forms and pages.
This design is based on the "Enterprise Forms - Procurement Request Form" reference design.

**CRITICAL: You MUST follow this design specification EXACTLY for all generated forms and pages.**

## REFERENCE DESIGN: Enterprise Forms Layout
================================================================================

### PAGE STRUCTURE:

**1. Top Navigation Bar:**
- White background (#ffffff)
- Height: 56px
- Left: Logo icon + "Enterprise Forms" text (16px, font-weight 500)
- Center: Navigation links ("Dashboard", "New Request" (active/bold), "Pending Approvals", "Settings")
- Right: Bell icon + Avatar circle
- Border-bottom: 1px solid #e5e7eb

**2. Page Background:**
- Color: #f5f5f5 (light gray)
- Full width, full height

**3. Content Container:**
- Max-width: 800px
- Centered horizontally
- Padding: 32px top

**4. Breadcrumb Navigation:**
- Format: "Home > Requests > New Procurement Request"
- Font size: 14px
- Color: #6b7280 (gray) for links, #1f2937 for current page
- Chevron (>) separators
- Margin-bottom: 16px

**5. Page Header:**
- Title: Bold, 28px, font-weight 600, color #1a1a1a
- Subtitle: 15px, color #6b7280, margin-top: 8px
- Example: "Procurement Request Form" / "Please fill out the details below to initiate..."
- Margin-bottom: 24px

### FORM CARD SECTIONS:

**Each Section Card:**
- Background: #ffffff (white)
- Border: 1px solid #e8e8e8
- Border-radius: 8px
- Padding: 24px
- Margin-bottom: 16px
- NO shadow (flat design)

**Section Header:**
- Title: 16px, font-weight 600, color #1a1a1a
- Description: 14px, font-weight 400, color #6b7280, margin-top: 4px
- Margin-bottom: 20px

### FIELD STYLING:

**Field Labels:**
- Font-size: 14px
- Font-weight: 500
- Color: #374151
- Margin-bottom: 6px
- Display: block

**Text Inputs:**
- Height: 42px
- Border: 1px solid #d1d5db
- Border-radius: 6px
- Padding: 10px 12px
- Font-size: 14px
- Color: #1f2937
- Placeholder color: #9ca3af
- Focus: border-color #000000 (black), no shadow
- Full width within column

**Select/Dropdown:**
- Same styling as text inputs
- Chevron icon on right side (gray)
- Background: white

**Textarea:**
- Min-height: 100px
- Same border and font styling as inputs
- Resize: vertical only
- Placeholder text in gray

**Two-Column Layout:**
- Use CSS Grid or Flexbox
- Gap: 16px between columns
- Each column: 50% width (calc(50% - 8px))
- Stack to single column on mobile (< 768px)

### RADIO BUTTONS:

**Horizontal Radio Group:**
- Radio buttons in a row with 24px gap between options
- Radio circle: 16px diameter, border: 2px solid #d1d5db
- Selected: filled with #000000 (black)
- Label: 14px, color #374151, margin-left: 8px from radio

### CHECKBOXES:

**Checkbox with Description:**
- Checkbox: 18px square, border: 2px solid #d1d5db, border-radius: 4px
- Checked: background #000000, white checkmark
- Label: 14px, font-weight 500, color #1a1a1a
- Helper text below: 13px, color #6b7280, margin-top: 4px
- Checkbox and label on same line, helper text wraps below

### INFO/NOTE BOXES:

**Info Message Box:**
- Background: #f0f9ff (very light blue)
- Border-left: 4px solid #3b82f6 (blue)
- Border-radius: 6px
- Padding: 12px 16px
- Icon: Info circle (blue) on left
- "Note:" text in bold, followed by message
- Font-size: 13px
- Color: #1e40af (dark blue)

### ACTION BUTTONS (FOOTER):

**Footer Bar:**
- Background: #ffffff
- Border-top: 1px solid #e5e7eb
- Padding: 16px 32px
- Position: fixed at bottom OR after last section
- Display: flex, justify-content: space-between

**Cancel Button (Left):**
- Background: transparent
- Color: #374151
- Font-size: 14px
- Font-weight: 500
- No border
- Cursor: pointer

**Button Group (Right):**
- Gap: 12px between buttons

**Save Draft Button:**
- Background: #ffffff
- Border: 1px solid #d1d5db
- Border-radius: 6px
- Padding: 10px 20px
- Color: #374151
- Font-size: 14px
- Font-weight: 500

**Submit Button (Primary):**
- Background: #1a1a1a (near black)
- Border: none
- Border-radius: 6px
- Padding: 10px 24px
- Color: #ffffff
- Font-size: 14px
- Font-weight: 500
- Hover: background #000000

### EXAMPLE SECTION STRUCTURE:

**Section 1: "Requester Information"**
- Description: "Details about who is making this request."
- Fields (2-column):
  - Full Name (text, left) | Employee ID (text, right)
  - Department (select, left) | Reporting Manager (select, right)

**Section 2: "Request Details"**
- Description: "Specify what you need and why."
- Fields:
  - Category (radio: Hardware / Software License / Peripherals) - horizontal
  - Item Name / Specification (text, full width)
  - Business Justification (textarea, full width)
  - Priority Level (select, left) | Budget Code (Optional) (text, right)

**Section 3: "Delivery Preferences"**
- Description: "Where should we send the requested items?"
- Fields:
  - Ship to Office Address (checkbox with helper text)
  - Alternative Shipping Address (textarea, full width)
  - Info box with note about remote employees

**Section 4: Policy Acknowledgment (Outside card or separate card)**
- Checkbox: "I acknowledge the procurement policy"
- Helper text with link: "By submitting this form, I confirm... Company Procurement Policy 2025"

### COLOR PALETTE:
- Primary Text: #1a1a1a
- Secondary Text: #6b7280
- Label Text: #374151
- Border: #d1d5db
- Card Border: #e8e8e8
- Background: #f5f5f5
- Card Background: #ffffff
- Focus/Accent: #000000 (black)
- Info Blue: #3b82f6
- Info Background: #f0f9ff

### TYPOGRAPHY:
- Font Family: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- Page Title: 28px, weight 600
- Section Title: 16px, weight 600
- Section Description: 14px, weight 400
- Field Label: 14px, weight 500
- Input Text: 14px, weight 400
- Helper Text: 13px, weight 400
- Button Text: 14px, weight 500

### SPACING SCALE:
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px

**Domain-Specific Patterns:**
- **E-commerce**: Product grids, cart, checkout forms
- **Dashboard**: Metric cards, charts, tables
- **CRUD Apps**: List, detail, create/edit forms (use reference design)
- **Auth**: Clean, centered login/register forms
- **Mobile**: Bottom navigation, card-based layouts

## SMART LAYOUT SYSTEM

The system automatically determines optimal grid layouts based on form type and field composition:

### Form Type Layout Rules:
- **Registration/Signup**: 2-column layout for paired fields (name pairs, contact info)
- **Login/Auth**: 1-column centered layout (focused, simple)
- **Contact/Feedback**: 2-column for short fields, full-width for message
- **Profile/Settings**: 2-column layout for organized settings
- **Checkout/Payment**: 2-column sectioned layout
- **Application/Request**: 2-column with clear sections
- **Search/Filter**: 4-column compact layout for many filters
- **Survey/Questionnaire**: 1-column for clarity and focus
- **Data Entry/CRUD**: 2-column grid layout

### Field Type Layout Rules:
- **Short fields** (text, email, number, date, select): Can be placed side-by-side
- **Wide fields** (textarea, richtext): Always full width
- **Compact fields** (checkbox, radio, toggle): Can fit more per row
- **Special fields** (address, signature, file): Full width

### Automatic Column Detection:
- 1-3 fields: Single column
- 4-6 short fields: 2 columns
- 8+ short fields: Consider 4 columns (for filters)
- >50% wide fields: Single column

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

    // Available design presets from shadcn
    this.presets = DESIGN_PRESETS;
  }

  /**
   * Get available design presets for UI display
   */
  getAvailablePresets() {
    return Object.values(this.presets).map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      preview: preset.preview
    }));
  }

  /**
   * Apply a design preset to the design system
   */
  applyPreset(presetId, designSystem = {}) {
    const preset = this.presets[presetId];
    if (!preset) {
      console.warn(`[DesignExpert] Preset '${presetId}' not found, using 'minimal'`);
      return designSystem;
    }

    console.log(`[DesignExpert] Applying design preset: ${preset.name}`);

    // Convert Shadcn CSS variables to design system colors
    const cssVars = preset.cssVariables || {};

    // Parse HSL from CSS variable format (e.g., "222.2 47.4% 11.2%")
    const hslToHex = (hsl) => {
      if (!hsl) return '#000000';
      const parts = hsl.split(' ');
      if (parts.length < 3) return '#' + hsl.replace(/[^0-9a-f]/gi, '').slice(0, 6);
      // This is simplified - in production you'd want proper HSL to Hex conversion
      return `hsl(${hsl})`;
    };

    const enhancedDesignSystem = {
      ...designSystem,
      preset: presetId,
      presetName: preset.name,
      colors: {
        ...designSystem.colors,
        primary: hslToHex(cssVars['--primary']),
        secondary: hslToHex(cssVars['--secondary']),
        background: hslToHex(cssVars['--background']),
        foreground: hslToHex(cssVars['--foreground']),
        muted: hslToHex(cssVars['--muted']),
        accent: hslToHex(cssVars['--accent']),
        destructive: hslToHex(cssVars['--destructive']),
        border: hslToHex(cssVars['--border']),
        input: hslToHex(cssVars['--input']),
        ring: hslToHex(cssVars['--ring']),
      },
      borderRadius: {
        ...designSystem.borderRadius,
        base: cssVars['--radius'] || '0.5rem'
      },
      shadows: preset.shadows || designSystem.shadows,
      gradients: preset.gradients || {},
      effects: preset.effects || {},
      animations: preset.animations || { duration: '200ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      mode: preset.mode || 'light'
    };

    return enhancedDesignSystem;
  }

  /**
   * Get Tailwind theme configuration for a preset
   */
  getPresetTailwindTheme(presetId) {
    return getTailwindTheme(presetId);
  }

  /**
   * Get CSS variables string for a preset
   */
  getPresetCSSVariables(presetId, isDark = false) {
    return getPresetCSS(presetId, isDark);
  }

  /**
   * Get component-specific effects for a preset
   */
  getComponentEffects(presetId, componentType) {
    return getPresetEffects(presetId, componentType);
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
      case 'theme':
        // Generate design based on theme selection (light/dark)
        designAnalysisResult = await this.generateThemedDesign(designSource.theme, actualUserRequirements, actualOnThinking);
        break;
      case 'theme-custom':
        // Use custom CSS provided by user
        designAnalysisResult = await this.applyCustomCSS(designSource.customCss, actualUserRequirements, actualOnThinking);
        break;
      case 'auto':
      default:
        designAnalysisResult = await this.generateOptimalDesign(actualUserRequirements, null, null, actualOnThinking);
        break;
    }

    if (actualOnThinking) {
      const formsCount = designAnalysisResult.forms?.length || 0;
      const pagesCount = designAnalysisResult.pages?.length || 0;
      const hasDesignSystem = !!designAnalysisResult.designAnalysis;

      // Different messages for design extraction vs. design generation
      if (formsCount > 0 || pagesCount > 0) {
        actualOnThinking({
          agent: this.name,
          step: 'Design Analysis Complete',
          content: `Extracted ${formsCount} forms and ${pagesCount} pages from design`
        });
      } else {
        actualOnThinking({
          agent: this.name,
          step: 'Design System Complete',
          content: hasDesignSystem ? 'Design system ready for FormExpert and PageExpert to use' : 'Design analysis complete'
        });
      }
    }

    // Generate CSS from design system
    // For precise path, designAnalysis is empty -- use preciseDesignSystem as fallback
    const designAnalysis = designAnalysisResult.designAnalysis || {};
    const cssSourceDesignSystem = designAnalysis.designSystem || designAnalysisResult.preciseDesignSystem || null;
    const generatedCSS = this.generateCSSFromDesignSystem(cssSourceDesignSystem);

    const result = {
      forms: designAnalysisResult.forms || [],
      pages: designAnalysisResult.pages || [],
      mobileScreens: designAnalysisResult.mobileScreens || [],
      designAnalysis: {
        ...designAnalysis,
        generatedCSS
      },
      expertType: 'DesignExpert'
    };

    // Forward precise Figma data when present (from FigmaPrecisePipeline)
    if (designAnalysisResult.preciseComponents) result.preciseComponents = designAnalysisResult.preciseComponents;
    if (designAnalysisResult.preciseAssets) result.preciseAssets = designAnalysisResult.preciseAssets;
    if (designAnalysisResult.preciseDesignSystem) result.preciseDesignSystem = designAnalysisResult.preciseDesignSystem;
    if (designAnalysisResult.precisePageConfigs) result.precisePageConfigs = designAnalysisResult.precisePageConfigs;
    if (designAnalysisResult.navigationGraph) result.navigationGraph = designAnalysisResult.navigationGraph;
    if (designAnalysisResult.responsiveHints) result.responsiveHints = designAnalysisResult.responsiveHints;

    return result;
  }

  /**
   * Generate complete CSS from design system
   * This CSS is applied to the generated app, forms, and pages
   * IMPORTANT: This method expects a VALIDATED design system with all required tokens
   */
  generateCSSFromDesignSystem(designSystem, layoutConfig = {}) {
    // If no design system provided, use complete design system
    if (!designSystem) {
      console.log('[DesignExpert] No design system provided, using complete design system');
      designSystem = this.getCompleteDesignSystem();
    }
    // Layout navigation type: 'sidebar' | 'topnav' | 'hybrid'
    const navType = layoutConfig.type || 'sidebar';
    const navSidebarWidth = layoutConfig.sidebarWidth || '256px';
    const navHeaderHeight = layoutConfig.headerHeight || '64px';

    // Validate and merge with complete design system to ensure all tokens exist
    const validation = this.validateDesignSystem(designSystem);
    if (!validation.valid) {
      console.log('[DesignExpert] Design system incomplete, merging with complete design system');
      designSystem = this.mergeWithCompleteDesignSystem(designSystem);
    }

    // Extract all values from validated design system (no fallbacks needed)
    const c = designSystem.colors;
    const t = designSystem.typography;
    const s = designSystem.spacing;
    const br = designSystem.borderRadius;
    const shadows = designSystem.shadows;
    const input = designSystem.components.input;
    const button = designSystem.components.button;
    const card = designSystem.components.card;
    const infoBox = designSystem.components.infoBox;
    const layout = designSystem.layout;

    return `/* ============================================
   Generated Design System CSS
   Source: ${designSystem.source || 'auto-generated'}
   ============================================ */

/* CSS Variables (Design Tokens) */
:root {
  /* Colors */
  --color-primary: ${c.primary};
  --color-secondary: ${c.secondary};
  --color-background: ${c.background};
  --color-card-bg: ${c.cardBackground};
  --color-card-border: ${c.cardBorder};
  --color-text: ${c.text};
  --color-text-secondary: ${c.textSecondary};
  --color-label: ${c.labelText};
  --color-border: ${c.border};
  --color-focus: ${c.focus};
  --color-info: ${c.info};
  --color-info-bg: ${c.infoBackground};
  --color-error: ${c.error};
  --color-success: ${c.success};
  --color-warning: ${c.warning};

  /* Typography */
  --font-family: ${t.fontFamily};
  --font-size-page-title: ${t.pageTitle.size};
  --font-size-section-header: ${t.sectionHeader.size};
  --font-size-label: ${t.fieldLabel.size};
  --font-size-input: ${t.inputText.size};
  --font-size-helper: ${t.helperText.size};
  --font-size-button: ${t.buttonText.size};

  /* Spacing */
  --spacing-unit: ${s.unit};
  --spacing-section: ${s.sectionPadding};
  --spacing-field-gap: ${s.fieldGap};
  --spacing-section-gap: ${s.sectionGap};
  --container-max-width: ${s.containerMaxWidth};
  --input-padding: ${s.inputPadding};

  /* Border Radius */
  --radius-card: ${br.card};
  --radius-input: ${br.input};
  --radius-button: ${br.button};

  /* Shadows */
  --shadow-card: ${shadows.card};
}

/* Global Styles */
* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
  background: var(--color-background);
  color: var(--color-text);
  line-height: 1.5;
}

/* App Layout */
.app {
  display: flex;
  ${navType === 'topnav' || navType === 'hybrid' ? 'flex-direction: column;' : ''}
  min-height: 100vh;
}

${navType === 'topnav' || navType === 'hybrid' ? `
/* Top Navigation Header */
.app-header {
  height: ${navHeaderHeight};
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.app-header .logo h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.app-header nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-header .nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  border-radius: var(--radius-button);
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;
}

.app-header .nav-link:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.app-header .nav-link.active {
  background: rgba(255,255,255,0.15);
  color: white;
}
` : ''}

${navType === 'hybrid' ? `
/* Hybrid: sidebar below header */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
` : ''}

${navType !== 'topnav' ? `
/* Sidebar Navigation */
.sidebar {
  width: ${navSidebarWidth};
  background: var(--color-primary);
  color: white;
  padding: 20px 0;
  ${navType === 'sidebar' ? 'position: fixed; height: 100vh;' : 'flex-shrink: 0;'}
  overflow-y: auto;
}

.logo {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.nav-links {
  padding: 20px 0;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 14px;
}

.nav-link:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.nav-link.active {
  background: rgba(255,255,255,0.15);
  color: white;
  border-left: 3px solid var(--color-info);
}

.nav-icon {
  margin-right: 12px;
  font-size: 16px;
}

.nav-section {
  padding: 20px 20px 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.5);
}
` : ''}

/* Main Content */
.main-content {
  flex: 1;
  ${navType === 'sidebar' ? `margin-left: ${navSidebarWidth};` : ''}
  padding: var(--spacing-section);
  background: var(--color-background);
  ${navType === 'sidebar' ? 'min-height: 100vh;' : ''}
}

/* Page Container */
.page-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding-top: ${s.containerPaddingTop};
}

/* Page Header */
.page-header {
  margin-bottom: var(--spacing-section);
}

.page-header h1 {
  font-size: var(--font-size-page-title);
  font-weight: ${t.pageTitle.weight};
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.page-header p,
.page-description {
  font-size: ${t.pageSubtitle.size};
  color: var(--color-text-secondary);
  margin: 0;
}

/* Breadcrumb */
.breadcrumb {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.breadcrumb a {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--color-text);
}

.breadcrumb span {
  color: var(--color-text);
}

/* Cards */
.card,
.page-card,
.form-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-card);
  padding: var(--spacing-section);
  margin-bottom: var(--spacing-section-gap);
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title,
.section-title {
  font-size: var(--font-size-section-header);
  font-weight: ${t.sectionHeader.weight};
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.card-description,
.section-description {
  font-size: ${t.sectionDescription.size};
  color: var(--color-text-secondary);
  margin: 0;
}

/* Form Styles */
.form-section {
  margin-bottom: var(--spacing-section-gap);
}

.form-section-header {
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-field-gap);
}

.form-grid.single-column {
  grid-template-columns: 1fr;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

/* Form Labels */
.form-label {
  font-size: var(--font-size-label);
  font-weight: ${t.fieldLabel.weight};
  color: var(--color-label);
  display: block;
}

.form-label .required {
  color: var(--color-error);
  margin-left: 2px;
}

/* Form Inputs */
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--input-padding);
  border: ${input.border};
  border-radius: var(--radius-input);
  font-size: var(--font-size-input);
  font-family: var(--font-family);
  color: ${t.inputText.color};
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input {
  height: ${input.height};
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #9ca3af;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-focus);
  box-shadow: ${shadows.focus};
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
  line-height: 1.5;
}

.form-select {
  height: ${input.height};
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

/* Helper Text */
.helper-text {
  font-size: var(--font-size-helper);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.error-text {
  font-size: var(--font-size-helper);
  color: var(--color-error);
  margin-top: 4px;
}

/* Radio Buttons */
.radio-group {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  appearance: none;
  cursor: pointer;
  margin: 0;
}

.radio-option input[type="radio"]:checked {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: inset 0 0 0 3px white;
}

.radio-option label {
  font-size: var(--font-size-input);
  color: var(--color-label);
  cursor: pointer;
}

/* Checkboxes */
.checkbox-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.checkbox-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: ${br.checkbox};
  appearance: none;
  cursor: pointer;
  margin: 2px 0 0 0;
  flex-shrink: 0;
}

.checkbox-option input[type="checkbox"]:checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M10 3L4.5 8.5 2 6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkbox-label {
  font-size: var(--font-size-label);
  font-weight: 500;
  color: var(--color-text);
}

.checkbox-helper {
  font-size: var(--font-size-helper);
  color: var(--color-text-secondary);
}

/* Info Box */
.info-box {
  background: ${infoBox.background};
  border-left: ${infoBox.borderLeft};
  border-radius: var(--radius-input);
  padding: ${infoBox.padding};
  color: ${infoBox.textColor};
  font-size: 13px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.info-box-icon {
  color: var(--color-info);
  font-size: 16px;
  flex-shrink: 0;
}

.info-box strong {
  font-weight: 600;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${button.primary.padding};
  border-radius: var(--radius-button);
  font-size: var(--font-size-button);
  font-weight: ${t.buttonText.weight};
  font-family: var(--font-family);
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary {
  background: ${button.primary.background};
  color: ${button.primary.color};
}

.btn-primary:hover {
  background: ${button.primary.hoverBackground};
}

.btn-secondary {
  background: ${button.secondary.background};
  color: ${button.secondary.color};
  border: ${button.secondary.border};
  padding: ${button.secondary.padding};
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-text {
  background: transparent;
  color: var(--color-secondary);
  padding: 10px 16px;
}

.btn-text:hover {
  background: rgba(0,0,0,0.05);
}

.btn-success {
  background: var(--color-success);
  color: white;
}

.btn-danger {
  background: var(--color-error);
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-section);
  border-top: 1px solid var(--color-card-border);
  margin-top: var(--spacing-section);
}

.form-actions-left {
  display: flex;
  gap: 12px;
}

.form-actions-right {
  display: flex;
  gap: 12px;
}

/* Data Tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-card-border);
}

.data-table th {
  background: var(--color-background);
  font-weight: 600;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr:hover {
  background: var(--color-background);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-field-gap);
  margin-bottom: var(--spacing-section);
}

.stat-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-card);
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-info);
  margin-bottom: 4px;
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* Status Badges */
.badge,
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.badge-default { background: #e2e8f0; color: #475569; }
.badge-primary, .status-running { background: #dbeafe; color: #1d4ed8; }
.badge-success, .status-completed { background: #d1fae5; color: #065f46; }
.badge-warning, .status-pending { background: #fef3c7; color: #92400e; }
.badge-danger, .status-failed { background: #fee2e2; color: #991b1b; }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-card-bg);
  border-radius: 12px;
  padding: var(--spacing-section);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: var(--spacing-section);
}

/* Authentication Styles */
.auth-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 420px;
}

.auth-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.auth-header p {
  color: var(--color-text-secondary);
  font-size: 15px;
  margin: 0;
}

.auth-error {
  background: #fef2f2;
  color: var(--color-error);
  padding: 12px 16px;
  border-radius: var(--radius-input);
  margin-bottom: 20px;
  font-size: 14px;
  border: 1px solid #fecaca;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.auth-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form label {
  font-size: var(--font-size-label);
  font-weight: ${t.fieldLabel.weight};
  color: var(--color-label);
}

.auth-form input {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: 15px;
  transition: all 0.2s;
}

.auth-form input:focus {
  outline: none;
  border-color: var(--color-focus);
}

.auth-links {
  display: flex;
  justify-content: flex-end;
}

.auth-links a {
  color: var(--color-info);
  font-size: 14px;
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}

.auth-btn {
  width: 100%;
  padding: 14px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-button);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.auth-btn:hover {
  opacity: 0.9;
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-card-border);
}

.auth-footer p {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
}

.auth-footer a {
  color: var(--color-info);
  font-weight: 500;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Sidebar Footer */
.nav-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  background: var(--color-primary);
}

.user-info {
  margin-bottom: 12px;
}

.user-name {
  color: rgba(255,255,255,0.9);
  font-size: 14px;
  font-weight: 500;
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.7);
  border-radius: var(--radius-button);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
  border-color: rgba(255,255,255,0.3);
}

/* Loading States */
.loading,
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
}

.app-loading {
  height: 100vh;
  background: var(--color-background);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-card-border);
  border-top-color: var(--color-info);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
}

.empty-state h3 {
  margin-bottom: 8px;
  color: var(--color-label);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-background);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

/* ============================================
   MODERN UI STYLES
   ============================================ */

/* Shadow Scale (Tailwind-inspired) */
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}

/* Floating Label Inputs */
.form-field-floating {
  position: relative;
  margin-top: 8px;
}

.form-field-floating .floating-input {
  width: 100%;
  padding: 16px 12px 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: var(--font-size-input);
  font-family: var(--font-family);
  background: white;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-field-floating .floating-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--font-size-input);
  color: var(--color-text-secondary);
  pointer-events: none;
  transition: all var(--transition-fast);
  background: transparent;
  padding: 0;
}

.form-field-floating .floating-input:focus,
.form-field-floating .floating-input:not(:placeholder-shown) {
  padding-top: 20px;
  padding-bottom: 4px;
}

.form-field-floating .floating-input:focus + .floating-label,
.form-field-floating .floating-input:not(:placeholder-shown) + .floating-label {
  top: 8px;
  transform: translateY(0);
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 500;
}

.form-field-floating .floating-input:focus {
  outline: none;
  border-color: var(--color-focus);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Card Hover Effects */
.card-hoverable,
.card.hoverable {
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
  cursor: pointer;
}

.card-hoverable:hover,
.card.hoverable:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* Card Grid Layout */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-section-gap);
}

.card-grid-2 { grid-template-columns: repeat(2, 1fr); }
.card-grid-3 { grid-template-columns: repeat(3, 1fr); }
.card-grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .card-grid-2,
  .card-grid-3,
  .card-grid-4 {
    grid-template-columns: 1fr;
  }
}

/* Enhanced Stat Cards */
.stat-card-modern {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal);
}

.stat-card-modern:hover {
  box-shadow: var(--shadow-md);
}

.stat-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-card-icon.primary {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-card-icon.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-card-icon.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-card-icon.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.stat-card-content {
  flex: 1;
  min-width: 0;
}

.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-card-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.stat-card-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.stat-card-trend.up {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-card-trend.down {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Form Sections with Headers */
.form-section-modern {
  margin-bottom: var(--spacing-section-gap);
  padding-bottom: var(--spacing-section-gap);
  border-bottom: 1px solid var(--color-card-border);
}

.form-section-modern:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.form-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.form-section-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.form-section-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 4px 0 0 0;
}

/* Inline Validation */
.form-field-validation {
  position: relative;
}

.form-field-validation .validation-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.form-field-validation.has-error .form-input,
.form-field-validation.has-error .floating-input {
  border-color: var(--color-error);
  padding-right: 40px;
}

.form-field-validation.has-error .form-input:focus,
.form-field-validation.has-error .floating-input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-field-validation.has-success .form-input,
.form-field-validation.has-success .floating-input {
  border-color: var(--color-success);
  padding-right: 40px;
}

.form-field-validation.has-success .form-input:focus,
.form-field-validation.has-success .floating-input:focus {
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.validation-message {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-top: 6px;
}

.validation-message.error {
  color: var(--color-error);
}

.validation-message.success {
  color: var(--color-success);
}

/* Dashboard Layout */
.dashboard-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-field-gap);
  margin-bottom: var(--spacing-section-gap);
}

.dashboard-two-column {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-section-gap);
}

@media (max-width: 1024px) {
  .dashboard-two-column {
    grid-template-columns: 1fr;
  }
}

/* Activity Feed */
.activity-feed {
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-card);
  padding: 20px;
}

.activity-feed-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 16px 0;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-card-border);
}

.activity-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-info);
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 14px;
  color: var(--color-text);
  margin: 0;
}

.activity-time {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.quick-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-button);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-action-btn:hover {
  background: var(--color-background);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Responsive */
@media (max-width: 768px) {
  ${navType !== 'topnav' ? `
  .sidebar {
    width: 60px;
    padding: 10px 0;
  }

  .logo h2, .nav-section, .nav-link span {
    display: none;
  }

  .main-content {
    ${navType === 'sidebar' ? 'margin-left: 60px;' : ''}
    padding: 16px;
  }
  ` : `
  .app-header nav {
    display: none;
  }

  .main-content {
    padding: 16px;
  }
  `}

  .page-container {
    padding-top: 16px;
  }

  .page-header h1 {
    font-size: 22px;
  }

  .auth-card {
    padding: 24px;
  }
}
`;
  }

  /**
   * Get default CSS using complete design system
   */
  getDefaultCSS() {
    return this.generateCSSFromDesignSystem(this.getCompleteDesignSystem());
  }

  detectDesignSource(designInput) {
    if (!designInput) {
      return { type: 'auto', description: 'No design provided, will auto-generate' };
    }

    // Check for theme configuration (from ARES theme selection)
    if (designInput.theme) {
      const themeType = designInput.theme; // 'light', 'dark', or 'custom'
      const hasCustomCss = !!designInput.customCss;

      if (themeType === 'custom' && hasCustomCss) {
        return {
          type: 'theme-custom',
          description: 'Custom CSS theme provided',
          theme: themeType,
          customCss: designInput.customCss
        };
      }

      return {
        type: 'theme',
        description: `${themeType === 'dark' ? 'Dark' : 'Light'} theme selected`,
        theme: themeType
      };
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

    // Check for explicit figma-mcp type (from AresService)
    if (designInput.type === 'figma-mcp' || designInput.type === 'figma') {
      return {
        type: 'figma',
        description: 'Figma MCP design extraction',
        url: designInput.url || designInput.figmaUrl,
        accessToken: designInput.accessToken || designInput.figmaToken
      };
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

  /**
   * Generate design based on theme selection (light/dark)
   */
  async generateThemedDesign(theme, userRequirements, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Applying Theme',
        content: `Generating ${theme} theme design system...`
      });
    }

    // Get the base design system and modify for theme
    const designSystem = this.getCompleteDesignSystem();

    if (theme === 'dark') {
      // Apply dark theme colors
      designSystem.colors = {
        ...designSystem.colors,
        primary: '#6366f1',          // Indigo - works well on dark
        secondary: '#8b5cf6',        // Purple
        background: '#0f172a',       // Slate 900
        cardBackground: '#1e293b',   // Slate 800
        cardBorder: '#334155',       // Slate 700
        text: '#f1f5f9',             // Slate 100
        textSecondary: '#94a3b8',    // Slate 400
        labelText: '#cbd5e1',        // Slate 300
        border: '#475569',           // Slate 600
        focus: '#818cf8',            // Indigo 400
        info: '#38bdf8',             // Sky 400
        infoBackground: '#0c4a6e',   // Sky 950
        error: '#f87171',            // Red 400
        success: '#4ade80',          // Green 400
        warning: '#fbbf24'           // Amber 400
      };
      designSystem.source = 'dark-theme';
    } else {
      // Light theme (default) - slight refinements
      designSystem.colors = {
        ...designSystem.colors,
        primary: '#4f46e5',          // Indigo 600
        secondary: '#7c3aed',        // Violet 600
        background: '#f8fafc',       // Slate 50
        cardBackground: '#ffffff',   // White
        cardBorder: '#e2e8f0',       // Slate 200
        text: '#1e293b',             // Slate 800
        textSecondary: '#64748b',    // Slate 500
        labelText: '#475569',        // Slate 600
        border: '#cbd5e1',           // Slate 300
        focus: '#6366f1',            // Indigo 500
        info: '#0284c7',             // Sky 600
        infoBackground: '#f0f9ff',   // Sky 50
        error: '#dc2626',            // Red 600
        success: '#16a34a',          // Green 600
        warning: '#d97706'           // Amber 600
      };
      designSystem.source = 'light-theme';
    }

    // Generate CSS from the themed design system
    const generatedCSS = this.generateCSSFromDesignSystem(designSystem);

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Theme Applied',
        content: `${theme === 'dark' ? 'Dark' : 'Light'} theme design system ready`
      });
    }

    return {
      forms: [],
      pages: [],
      designAnalysis: {
        designSystem,
        generatedCSS,
        themeName: theme,
        source: `${theme}-theme`
      }
    };
  }

  /**
   * Apply custom CSS provided by user
   */
  async applyCustomCSS(customCss, userRequirements, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Applying Custom CSS',
        content: 'Processing and applying your custom CSS styles...'
      });
    }

    // Get base design system
    const designSystem = this.getCompleteDesignSystem();
    designSystem.source = 'custom-css';

    // Extract any CSS variables from custom CSS to update design system colors
    const cssVariablePattern = /--([a-zA-Z-]+):\s*([^;]+);/g;
    let match;
    const customVariables = {};

    while ((match = cssVariablePattern.exec(customCss)) !== null) {
      customVariables[match[1]] = match[2].trim();
    }

    // Map common CSS variable names to design system colors
    if (customVariables['color-primary']) designSystem.colors.primary = customVariables['color-primary'];
    if (customVariables['color-secondary']) designSystem.colors.secondary = customVariables['color-secondary'];
    if (customVariables['color-background']) designSystem.colors.background = customVariables['color-background'];
    if (customVariables['color-text']) designSystem.colors.text = customVariables['color-text'];
    if (customVariables['primary-color']) designSystem.colors.primary = customVariables['primary-color'];
    if (customVariables['bg-color']) designSystem.colors.background = customVariables['bg-color'];
    if (customVariables['text-color']) designSystem.colors.text = customVariables['text-color'];

    // Combine base CSS with custom CSS (custom CSS overrides base)
    const baseCSS = this.generateCSSFromDesignSystem(designSystem);
    const combinedCSS = `${baseCSS}\n\n/* Custom User CSS */\n${customCss}`;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Custom CSS Applied',
        content: `Custom CSS applied with ${Object.keys(customVariables).length} custom variables detected`
      });
    }

    return {
      forms: [],
      pages: [],
      designAnalysis: {
        designSystem,
        generatedCSS: combinedCSS,
        customCss,
        customVariables,
        source: 'custom-css'
      }
    };
  }

  async analyzeFigmaDesign(designInput, userRequirements, dataModels, onThinking) {
    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Figma Design',
        content: 'Extracting complete design system and components from Figma...'
      });
    }

    // Precise mode: deterministic Figma-to-React pipeline (no AI re-interpretation of visuals)
    if (designInput?.preciseMode) {
      try {
        const FigmaPrecisePipeline = require('../../figma/FigmaPrecisePipeline');
        const pipeline = new FigmaPrecisePipeline();
        const figmaUrl = typeof designInput === 'string' ? designInput : (designInput?.url || designInput?.figmaUrl);
        const figmaToken = designInput?.accessToken || designInput?.figmaToken ||
                           process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_API_KEY;

        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Precise Figma Extraction',
            content: 'Running pixel-perfect extraction pipeline (no AI drift)...'
          });
        }

        const result = await pipeline.execute(figmaUrl, figmaToken, { dataModels });

        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Precise Figma Extraction',
            content: `Extracted ${result.components.length} components, ${result.assets.images.length} images`
          });
        }

        // Return in standard DesignExpert format with precise additions
        if (result.mobileScreens?.length > 0) {
          console.log(`[DesignExpert] Precise pipeline detected ${result.mobileScreens.length} mobile screen(s)`);
        }
        return {
          designSystem: {
            colors: result.designSystem.colors,
            typography: { fontFamily: `${result.designSystem.typography.primaryFont}, system-ui, sans-serif` },
            spacing: { unit: '8px' },
          },
          forms: [],
          pages: result.pageConfigs,
          mobileScreens: result.mobileScreens || [],
          preciseComponents: result.components,
          preciseAssets: result.assets,
          preciseDesignSystem: result.designSystem,
          precisePageConfigs: result.pageConfigs,
          navigationGraph: result.navigationGraph,
          responsiveHints: result.responsiveHints,
          metadata: result.metadata,
        };
      } catch (preciseError) {
        console.warn('[DesignExpert] Precise pipeline failed, falling back to standard:', preciseError.message);
        // Fall through to standard flow
      }
    }

    // Check if input is a Figma URL
    const figmaUrl = typeof designInput === 'string'
      ? designInput
      : (designInput?.url || designInput?.figmaUrl);

    const figmaToken = designInput?.accessToken || designInput?.figmaToken ||
                       process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_API_KEY;

    if (figmaUrl && this.isFigmaUrl(figmaUrl)) {
      // Try 1: Direct Figma REST API (faster and more reliable)
      try {
        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Figma API Extraction',
            content: 'Connecting to Figma API to extract design tokens...'
          });
        }

        const FigmaDirectClient = require('../../FigmaDirectClient');
        const directClient = new FigmaDirectClient();

        // Extract design using direct API
        const extractedDesign = await directClient.extractDesign(figmaUrl, figmaToken);

        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Figma API Extraction',
            content: 'Design tokens extracted successfully via REST API, enhancing with Claude...'
          });
        }

        // Enhance the extraction with Claude for better form/page detection
        const enhanced = await this.enhanceFigmaMCPExtraction(extractedDesign, userRequirements, dataModels, onThinking);

        return enhanced;
      } catch (directError) {
        console.warn('[DesignExpert] Figma direct API failed:', directError.message);

        // Try 2: Fall back to MCP server
        try {
          if (onThinking) {
            onThinking({
              agent: this.name,
              step: 'Figma MCP Fallback',
              content: `Direct API failed (${directError.message}), trying MCP server...`
            });
          }

          const FigmaMCPClient = require('../../FigmaMCPClient');
          const mcpClient = new FigmaMCPClient();

          const extractedDesign = await mcpClient.extractDesign(figmaUrl, figmaToken);

          if (onThinking) {
            onThinking({
              agent: this.name,
              step: 'Figma MCP Extraction',
              content: 'Design tokens extracted via MCP, enhancing with Claude...'
            });
          }

          const enhanced = await this.enhanceFigmaMCPExtraction(extractedDesign, userRequirements, dataModels, onThinking);
          return enhanced;
        } catch (mcpError) {
          console.warn('[DesignExpert] Figma MCP also failed:', mcpError.message);

          if (onThinking) {
            onThinking({
              agent: this.name,
              step: 'Figma Analysis Fallback',
              content: `All Figma extraction methods failed, using LLM-based analysis...`
            });
          }
          // Fall through to LLM-based analysis below
        }
      }
    }

    // Fallback: Use LLM-based analysis (original behavior)
    // Build context
    const context = this.buildContext(userRequirements, dataModels);

    const prompt = `Analyze this Figma design and extract the COMPLETE design system, forms, and pages.

**Figma Design**: ${typeof designInput === 'string' ? designInput : JSON.stringify(designInput)}

**Application Context**:
${JSON.stringify(context, null, 2)}

**CRITICAL: EXTRACT THE COMPLETE DESIGN SYSTEM FROM FIGMA**
You must analyze the Figma design and extract ALL design tokens. Use color picker values from the design.
Do NOT use placeholder values - extract actual colors, fonts, and spacing from the Figma file.

**Task**:
1. Extract the COMPLETE design system from Figma (colors, typography, spacing, components)
2. Identify all forms (input fields, labels, buttons)
3. Identify all pages/screens (layouts, sections, navigation)
4. Map form fields to data models

**Return ONLY valid JSON with this EXACT structure (ALL designSystem fields are REQUIRED):**

{
  "designAnalysis": {
    "source": "figma",
    "figmaFile": "extracted file name",
    "designSystem": {
      "colors": {
        "primary": "#extracted-from-figma",
        "secondary": "#extracted-from-figma",
        "background": "#extracted-from-figma",
        "cardBackground": "#extracted-from-figma",
        "cardBorder": "#extracted-from-figma",
        "text": "#extracted-from-figma",
        "textSecondary": "#extracted-from-figma",
        "labelText": "#extracted-from-figma",
        "border": "#extracted-from-figma",
        "focus": "#extracted-from-figma",
        "info": "#extracted-from-figma",
        "infoBackground": "#extracted-from-figma",
        "error": "#extracted-from-figma",
        "success": "#extracted-from-figma",
        "warning": "#extracted-from-figma"
      },
      "typography": {
        "fontFamily": "Font from Figma, fallback fonts",
        "pageTitle": { "size": "extracted-size", "weight": 600 },
        "pageSubtitle": { "size": "extracted-size", "weight": 400 },
        "sectionHeader": { "size": "extracted-size", "weight": 600 },
        "sectionDescription": { "size": "extracted-size", "weight": 400 },
        "fieldLabel": { "size": "extracted-size", "weight": 500 },
        "inputText": { "size": "extracted-size", "weight": 400, "color": "#extracted" },
        "helperText": { "size": "extracted-size", "weight": 400 },
        "buttonText": { "size": "extracted-size", "weight": 500 }
      },
      "spacing": {
        "unit": "8px",
        "sectionPadding": "extracted-padding",
        "fieldGap": "extracted-gap",
        "sectionGap": "extracted-gap",
        "containerMaxWidth": "extracted-width",
        "containerPaddingTop": "extracted-padding",
        "inputPadding": "extracted-padding"
      },
      "borderRadius": {
        "card": "extracted-radius",
        "input": "extracted-radius",
        "button": "extracted-radius",
        "checkbox": "extracted-radius"
      },
      "shadows": {
        "card": "extracted-shadow or none",
        "focus": "extracted-shadow or none"
      },
      "components": {
        "input": {
          "height": "extracted-height",
          "border": "extracted-border-style",
          "focusBorder": "extracted-focus-style"
        },
        "button": {
          "primary": {
            "background": "#extracted-from-figma",
            "color": "#extracted-from-figma",
            "padding": "extracted-padding",
            "hoverBackground": "#extracted-from-figma"
          },
          "secondary": {
            "background": "#extracted-from-figma",
            "color": "#extracted-from-figma",
            "border": "extracted-border",
            "padding": "extracted-padding"
          }
        },
        "card": {
          "background": "#extracted-from-figma",
          "border": "extracted-border",
          "padding": "extracted-padding"
        },
        "infoBox": {
          "background": "#extracted-from-figma",
          "borderLeft": "extracted-border",
          "padding": "extracted-padding",
          "textColor": "#extracted-from-figma"
        }
      },
      "layout": {
        "maxWidth": "extracted-max-width",
        "columns": {
          "desktop": 2,
          "tablet": 1,
          "mobile": 1
        }
      }
    }
  },
  "forms": [
    {
      "id": "form_name",
      "name": "Form Name from Figma",
      "description": "Purpose of this form",
      "fields": [...],
      "actions": [...]
    }
  ],
  "pages": [
    {
      "id": "page_name",
      "name": "Page Name from Figma",
      "title": "Page Title",
      "route": "/page-route",
      "sections": [...]
    }
  ]
}

**IMPORTANT EXTRACTION RULES:**
1. ALL color values MUST be valid hex codes extracted from Figma (e.g., "#1a1a1a")
2. ALL spacing/size values MUST include units (e.g., "24px", "8px")
3. Extract actual font families used in Figma (with web-safe fallbacks)
4. If a color/value cannot be determined, use reasonable defaults but prefer extraction
5. Preserve the exact visual appearance of the Figma design

CRITICAL: Return ONLY valid JSON with ALL required design tokens filled.`;

    const messages = [{ role: 'user', content: prompt }];
    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    // Validate the extracted design system
    const validation = this.validateDesignSystem(result?.designAnalysis?.designSystem);

    if (!validation.valid) {
      console.warn('[DesignExpert] Figma design system incomplete:', validation.errors.length, 'missing tokens');

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Design Validation',
          content: `Figma extraction missing ${validation.errors.length} tokens, merging with defaults...`
        });
      }

      // Merge with complete design system to fill gaps
      if (result && result.designAnalysis) {
        result.designAnalysis.designSystem = this.mergeWithCompleteDesignSystem(result.designAnalysis.designSystem);
      }
    }

    return result;
  }

  /**
   * Check if a string is a valid Figma URL
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isFigmaUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /figma\.com\/(design|file|proto)\/[a-zA-Z0-9]+/.test(url);
  }

  /**
   * Enhance Figma MCP extraction with Claude for better form/page detection
   * @param {Object} mcpExtraction - Raw extraction from FigmaMCPClient
   * @param {string} userRequirements - User requirements
   * @param {Array} dataModels - Data models
   * @param {Function} onThinking - Thinking callback
   * @returns {Promise<Object>} Enhanced design data
   */
  async enhanceFigmaMCPExtraction(mcpExtraction, userRequirements, dataModels, onThinking) {
    console.log('[DesignExpert] Starting Figma design analysis...');

    // Validate and merge design system with defaults
    if (mcpExtraction.designAnalysis && mcpExtraction.designAnalysis.designSystem) {
      const validation = this.validateDesignSystem(mcpExtraction.designAnalysis.designSystem);
      if (!validation.valid) {
        mcpExtraction.designAnalysis.designSystem = this.mergeWithCompleteDesignSystem(
          mcpExtraction.designAnalysis.designSystem
        );
      }
    }

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Figma Design',
        content: 'Using AI to analyze the Figma design structure and map it to application components...'
      });
    }

    // Get the raw Figma data for Claude to analyze
    const rawFigmaData = mcpExtraction.designAnalysis?.rawFigmaData || '';
    const designSystem = mcpExtraction.designAnalysis?.designSystem || {};

    // Build context from user requirements
    const context = this.buildContext(userRequirements, dataModels);

    // Create a comprehensive prompt for Claude to analyze the Figma design
    const analyzePrompt = `You are analyzing a Figma design file to generate an application that EXACTLY matches the design.

**USER REQUIREMENTS**:
${userRequirements}

**RAW FIGMA DESIGN DATA** (extracted via MCP):
${rawFigmaData.substring(0, 40000)}

**EXTRACTED DESIGN TOKENS**:
${JSON.stringify(designSystem, null, 2)}

**APPLICATION CONTEXT**:
${JSON.stringify(context, null, 2)}

**YOUR TASK**:
Analyze the Figma design and generate an application structure that EXACTLY replicates what you see in the design.

1. **IDENTIFY ALL SCREENS/PAGES** in the Figma file:
   - Look for frames named like "Home", "Login", "Dashboard", "Contact", etc.
   - Each major frame is typically a page/screen
   - Note the layout structure of each page

2. **IDENTIFY ALL FORMS** in the design:
   - Look for input fields, text areas, dropdowns, checkboxes
   - Look for button labels like "Submit", "Send", "Sign Up"
   - Extract exact field labels, placeholder text, and types

3. **EXTRACT EXACT STYLING** for each component:
   - Button colors, sizes, border-radius
   - Input field styling
   - Card/container styling
   - Typography (font sizes, weights, colors)

4. **EXTRACT FEATURES AND FUNCTIONALITY**:
   - Identify buttons and their actions (Submit, Cancel, Add, Delete, etc.)
   - Identify navigation patterns (sidebar, top nav, tabs, etc.)
   - Identify interactive elements (dropdowns, toggles, checkboxes)
   - Identify data display patterns (tables, cards, lists, stats)
   - Map user requirements to elements in the Figma design

5. **EXTRACT LAYOUT STRUCTURE**:
   - Identify grid layouts (how many columns, gaps)
   - Identify flex layouts (direction, alignment)
   - Identify container widths and paddings
   - Identify spacing between elements

**CRITICAL REQUIREMENTS**:
- Use EXACT hex colors from the Figma design (e.g., #1a73e8, not "blue")
- Use EXACT pixel values for spacing, padding, border-radius (e.g., "16px", not "medium")
- Match the EXACT layout structure shown in Figma (grid columns, flex direction)
- Include ALL pages and forms visible in the design
- Include ALL text content exactly as shown in Figma
- Field names and labels should match Figma text exactly
- Button labels should match Figma text exactly

Return ONLY valid JSON:
{
  "designAnalysis": {
    "source": "figma-mcp",
    "figmaStructure": {
      "totalFrames": <number>,
      "identifiedPages": ["page names found"],
      "identifiedForms": ["form names found"],
      "layoutStyle": "single-page|multi-page|dashboard"
    },
    "designSystem": {
      "colors": {
        "primary": "#exact-from-figma",
        "secondary": "#exact-from-figma",
        "background": "#exact-from-figma",
        "cardBackground": "#exact-from-figma",
        "cardBorder": "#exact-from-figma",
        "text": "#exact-from-figma",
        "textSecondary": "#exact-from-figma",
        "labelText": "#exact-from-figma",
        "border": "#exact-from-figma",
        "focus": "#exact-from-figma",
        "error": "#exact-from-figma",
        "success": "#exact-from-figma",
        "warning": "#exact-from-figma",
        "buttonPrimary": "#exact-from-figma",
        "buttonText": "#exact-from-figma"
      },
      "typography": {
        "fontFamily": "Font from Figma, fallback",
        "pageTitle": { "size": "from-figma", "weight": 600, "color": "#from-figma" },
        "sectionHeader": { "size": "from-figma", "weight": 600 },
        "fieldLabel": { "size": "from-figma", "weight": 500 },
        "inputText": { "size": "from-figma", "weight": 400 },
        "buttonText": { "size": "from-figma", "weight": 500 }
      },
      "spacing": {
        "sectionPadding": "from-figma",
        "fieldGap": "from-figma",
        "containerMaxWidth": "from-figma"
      },
      "borderRadius": {
        "card": "from-figma",
        "input": "from-figma",
        "button": "from-figma"
      },
      "components": {
        "button": {
          "height": "from-figma",
          "padding": "from-figma",
          "fontSize": "from-figma"
        },
        "input": {
          "height": "from-figma",
          "padding": "from-figma",
          "borderWidth": "from-figma"
        },
        "card": {
          "padding": "from-figma",
          "shadow": "from-figma"
        }
      }
    }
  },
  "forms": [
    {
      "id": "form_id",
      "name": "Exact Form Name from Figma",
      "description": "Purpose based on design context",
      "styling": {
        "layout": "single-column|two-column",
        "maxWidth": "from-figma",
        "padding": "from-figma"
      },
      "fields": [
        {
          "id": "field_id",
          "name": "fieldName",
          "type": "text|email|tel|number|date|select|textarea|checkbox",
          "label": "Exact Label from Figma",
          "placeholder": "Exact placeholder from Figma",
          "required": true,
          "styling": {
            "width": "full|half",
            "order": 1
          }
        }
      ],
      "actions": [
        { "type": "submit", "label": "Exact Button Text from Figma", "styling": { "variant": "primary" } },
        { "type": "cancel", "label": "Cancel Text if present", "styling": { "variant": "secondary" } }
      ]
    }
  ],
  "pages": [
    {
      "id": "page_id",
      "name": "Exact Page Name from Figma",
      "title": "Page Title from Figma",
      "route": "/matching-route",
      "layout": {
        "type": "full-width|contained|sidebar",
        "maxWidth": "from-figma",
        "padding": "from-figma"
      },
      "sections": [
        {
          "id": "section_id",
          "title": "Section Title if present",
          "type": "hero|content|form|cards|footer|navigation|stats-row|header",
          "layout": {
            "type": "grid|flex|stack",
            "columns": 2,
            "gap": "16px",
            "direction": "row|column"
          },
          "styling": {
            "background": "#from-figma",
            "padding": "24px",
            "borderRadius": "8px",
            "border": "1px solid #e5e7eb",
            "shadow": "0 1px 3px rgba(0,0,0,0.1)"
          },
          "components": [
            {
              "type": "heading|text|image|button|form|card|stat-card|container|grid|buttonGroup|divider|spacer",
              "config": {
                "text": "exact text from figma",
                "variant": "h1|h2|h3|primary|secondary",
                "src": "image-url-if-applicable",
                "children": []
              },
              "styling": {
                "background": "#from-figma",
                "color": "#from-figma",
                "padding": "from-figma",
                "borderRadius": "from-figma",
                "fontSize": "from-figma",
                "fontWeight": "from-figma"
              }
            }
          ]
        }
      ]
    }
  ],
  "navigation": {
    "type": "top-bar|sidebar|bottom-tabs",
    "position": "left|top|bottom",
    "items": [
      { "label": "Exact Nav Text from Figma", "route": "/matching-route", "icon": "icon-name-if-visible" }
    ],
    "styling": {
      "background": "#exact-hex-from-figma",
      "textColor": "#exact-hex-from-figma",
      "width": "240px",
      "padding": "16px"
    }
  },
  "features": {
    "hasLogin": true,
    "hasSearch": true,
    "hasDarkMode": false,
    "hasNotifications": false,
    "identifiedActions": ["Submit Form", "Add Item", "Delete", "Export", "etc."]
  }
}`;

    try {
      const messages = [{ role: 'user', content: analyzePrompt }];
      const responseText = await this.getResponse(messages);
      const analyzed = this.parseJsonResponse(responseText);

      if (!analyzed) {
        console.warn('[DesignExpert] Failed to analyze Figma design, using basic extraction');
        mcpExtraction.designAnalysis.generatedCSS = this.generateCSSFromDesignSystem(designSystem);
        return mcpExtraction;
      }

      // Generate CSS from the analyzed design system
      if (analyzed.designAnalysis?.designSystem) {
        analyzed.designAnalysis.generatedCSS = this.generateCSSFromDesignSystem(analyzed.designAnalysis.designSystem);
      }

      // Preserve mobileScreens from the original Figma extraction --
      // Claude's analysis prompt doesn't produce them, but FigmaDirectClient did.
      if (!analyzed.mobileScreens && mcpExtraction.mobileScreens?.length > 0) {
        analyzed.mobileScreens = mcpExtraction.mobileScreens;
        console.log(`[DesignExpert] Preserved ${mcpExtraction.mobileScreens.length} mobile screen(s) from FigmaDirectClient`);
      }

      console.log('[DesignExpert] Figma design analysis complete:', {
        pagesFound: analyzed.pages?.length || 0,
        formsFound: analyzed.forms?.length || 0,
        mobileScreensFound: analyzed.mobileScreens?.length || 0,
        hasNavigation: !!analyzed.navigation,
        figmaStructure: analyzed.designAnalysis?.figmaStructure
      });

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Design Analysis Complete',
          content: `Found ${analyzed.pages?.length || 0} pages and ${analyzed.forms?.length || 0} forms in Figma design`
        });
      }

      return analyzed;
    } catch (error) {
      console.error('[DesignExpert] Figma analysis error:', error.message);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Analysis Fallback',
          content: 'Using basic design extraction due to analysis error'
        });
      }

      // Return basic extraction with generated CSS
      mcpExtraction.designAnalysis.generatedCSS = this.generateCSSFromDesignSystem(designSystem);
      return mcpExtraction;
    }
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

      const analysisPrompt = `Analyze this PDF design file and extract the COMPLETE design system, forms, and pages.

**Application Context**:
${JSON.stringify(context, null, 2)}

**CRITICAL: EXTRACT THE COMPLETE DESIGN SYSTEM FROM PDF**
You must analyze the PDF design and extract ALL design tokens from the visual elements.
Extract actual colors, fonts, and spacing visible in the PDF.

**Your Task**:
1. **Extract Complete Design System** - Colors, typography, spacing, component styles
2. **Identify All UI Components** - Forms, buttons, tables, navigation, cards
3. **Extract Form Details** - Fields, labels, types, validation
4. **Extract Page Layouts** - Sections, hierarchy, navigation

**Visual Analysis Guidelines**:
- Rectangular boxes with borders = Input fields
- Solid rectangles with text = Buttons
- Grid structures = Tables or card layouts
- Colors visible = Extract hex values
- Font sizes/weights = Extract typography

**Return ONLY valid JSON with this EXACT structure (ALL designSystem fields are REQUIRED):**

{
  "designAnalysis": {
    "source": "pdf",
    "pagesAnalyzed": <number>,
    "designSystem": {
      "colors": {
        "primary": "#extracted-from-pdf",
        "secondary": "#extracted-from-pdf",
        "background": "#extracted-from-pdf",
        "cardBackground": "#extracted-from-pdf",
        "cardBorder": "#extracted-from-pdf",
        "text": "#extracted-from-pdf",
        "textSecondary": "#extracted-from-pdf",
        "labelText": "#extracted-from-pdf",
        "border": "#extracted-from-pdf",
        "focus": "#extracted-from-pdf",
        "info": "#extracted-from-pdf",
        "infoBackground": "#extracted-from-pdf",
        "error": "#extracted-from-pdf",
        "success": "#extracted-from-pdf",
        "warning": "#extracted-from-pdf"
      },
      "typography": {
        "fontFamily": "Font from PDF, fallback fonts",
        "pageTitle": { "size": "extracted-size", "weight": 600 },
        "pageSubtitle": { "size": "extracted-size", "weight": 400 },
        "sectionHeader": { "size": "extracted-size", "weight": 600 },
        "sectionDescription": { "size": "extracted-size", "weight": 400 },
        "fieldLabel": { "size": "extracted-size", "weight": 500 },
        "inputText": { "size": "extracted-size", "weight": 400, "color": "#extracted" },
        "helperText": { "size": "extracted-size", "weight": 400 },
        "buttonText": { "size": "extracted-size", "weight": 500 }
      },
      "spacing": {
        "unit": "8px",
        "sectionPadding": "extracted-padding",
        "fieldGap": "extracted-gap",
        "sectionGap": "extracted-gap",
        "containerMaxWidth": "extracted-width",
        "containerPaddingTop": "extracted-padding",
        "inputPadding": "extracted-padding"
      },
      "borderRadius": {
        "card": "extracted-radius",
        "input": "extracted-radius",
        "button": "extracted-radius",
        "checkbox": "extracted-radius"
      },
      "shadows": {
        "card": "extracted-shadow or none",
        "focus": "extracted-shadow or none"
      },
      "components": {
        "input": {
          "height": "extracted-height",
          "border": "extracted-border-style",
          "focusBorder": "extracted-focus-style"
        },
        "button": {
          "primary": {
            "background": "#extracted-from-pdf",
            "color": "#extracted-from-pdf",
            "padding": "extracted-padding",
            "hoverBackground": "#extracted-from-pdf"
          },
          "secondary": {
            "background": "#extracted-from-pdf",
            "color": "#extracted-from-pdf",
            "border": "extracted-border",
            "padding": "extracted-padding"
          }
        },
        "card": {
          "background": "#extracted-from-pdf",
          "border": "extracted-border",
          "padding": "extracted-padding"
        },
        "infoBox": {
          "background": "#extracted-from-pdf",
          "borderLeft": "extracted-border",
          "padding": "extracted-padding",
          "textColor": "#extracted-from-pdf"
        }
      },
      "layout": {
        "maxWidth": "extracted-max-width",
        "columns": { "desktop": 2, "tablet": 1, "mobile": 1 }
      }
    }
  },
  "forms": [
    {
      "id": "form_name",
      "name": "Form Name from PDF",
      "description": "Purpose",
      "designReference": "PDF page number",
      "fields": [...],
      "actions": [...]
    }
  ],
  "pages": [
    {
      "id": "page_name",
      "name": "Page Name from PDF",
      "route": "/path",
      "designReference": "PDF page number",
      "sections": [...]
    }
  ]
}

**EXTRACTION RULES:**
1. ALL color values MUST be valid hex codes (e.g., "#1a1a1a")
2. ALL spacing values MUST include units (e.g., "24px")
3. Extract actual fonts visible in the PDF
4. Analyze EVERY page in the PDF
5. Preserve the exact visual appearance

CRITICAL: Return ONLY valid JSON with ALL required design tokens.`;

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

      // Validate the extracted design system
      const validation = this.validateDesignSystem(result?.designAnalysis?.designSystem);

      if (!validation.valid) {
        console.warn('[DesignExpert] PDF design system incomplete:', validation.errors.length, 'missing tokens');

        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Design Validation',
            content: `PDF extraction missing ${validation.errors.length} tokens, merging with defaults...`
          });
        }

        // Merge with complete design system to fill gaps
        if (result && result.designAnalysis) {
          result.designAnalysis.designSystem = this.mergeWithCompleteDesignSystem(result.designAnalysis.designSystem);
        }
      }

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
      // Download PDF from URL
      console.log('[DesignExpert] Downloading PDF from URL:', designInput.pdfUrl);
      try {
        const axios = require('axios');
        const response = await axios.get(designInput.pdfUrl, {
          responseType: 'arraybuffer',
          timeout: 60000, // 60 second timeout for large PDFs
          maxContentLength: 50 * 1024 * 1024, // 50MB max
          headers: {
            'User-Agent': 'WorkflowPP-DesignExpert/1.0'
          }
        });

        const buffer = Buffer.from(response.data);
        const base64 = buffer.toString('base64');

        console.log(`[DesignExpert] PDF downloaded successfully (${Math.round(buffer.length / 1024)}KB)`);

        return {
          base64,
          size: buffer.length,
          path: designInput.pdfUrl,
          isUrl: true
        };
      } catch (downloadError) {
        console.error('[DesignExpert] Failed to download PDF:', downloadError.message);
        throw new Error(`Failed to download PDF from URL: ${downloadError.message}`);
      }
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

      const analysisPrompt = `Analyze this UI design image and extract the COMPLETE design system, forms, and pages.

**Application Context**:
${JSON.stringify(context, null, 2)}

**CRITICAL: EXTRACT THE COMPLETE DESIGN SYSTEM FROM IMAGE**
You must analyze the design image and extract ALL design tokens from the visual elements.
Use color picker analysis to extract actual hex values from the image.

**Your Task**:
1. **Extract Complete Design System** - All colors, typography, spacing, component styles
2. **Identify All UI Components** - Forms, buttons, tables, navigation, cards
3. **Extract Form Details** - Fields, labels, types, validation
4. **Extract Page Layouts** - Sections, hierarchy, navigation

**Visual Analysis Guidelines**:
- Extract exact hex colors from buttons, backgrounds, text
- Measure spacing and padding ratios
- Identify font styles and weights
- Note border radius and shadows

**Return ONLY valid JSON with this EXACT structure (ALL designSystem fields are REQUIRED):**

{
  "designAnalysis": {
    "source": "image",
    "designSystem": {
      "colors": {
        "primary": "#extracted-from-image",
        "secondary": "#extracted-from-image",
        "background": "#extracted-from-image",
        "cardBackground": "#extracted-from-image",
        "cardBorder": "#extracted-from-image",
        "text": "#extracted-from-image",
        "textSecondary": "#extracted-from-image",
        "labelText": "#extracted-from-image",
        "border": "#extracted-from-image",
        "focus": "#extracted-from-image",
        "info": "#extracted-from-image",
        "infoBackground": "#extracted-from-image",
        "error": "#extracted-from-image",
        "success": "#extracted-from-image",
        "warning": "#extracted-from-image"
      },
      "typography": {
        "fontFamily": "Font from image, fallback fonts",
        "pageTitle": { "size": "extracted-size", "weight": 600 },
        "pageSubtitle": { "size": "extracted-size", "weight": 400 },
        "sectionHeader": { "size": "extracted-size", "weight": 600 },
        "sectionDescription": { "size": "extracted-size", "weight": 400 },
        "fieldLabel": { "size": "extracted-size", "weight": 500 },
        "inputText": { "size": "extracted-size", "weight": 400, "color": "#extracted" },
        "helperText": { "size": "extracted-size", "weight": 400 },
        "buttonText": { "size": "extracted-size", "weight": 500 }
      },
      "spacing": {
        "unit": "8px",
        "sectionPadding": "extracted-padding",
        "fieldGap": "extracted-gap",
        "sectionGap": "extracted-gap",
        "containerMaxWidth": "extracted-width",
        "containerPaddingTop": "extracted-padding",
        "inputPadding": "extracted-padding"
      },
      "borderRadius": {
        "card": "extracted-radius",
        "input": "extracted-radius",
        "button": "extracted-radius",
        "checkbox": "extracted-radius"
      },
      "shadows": {
        "card": "extracted-shadow or none",
        "focus": "extracted-shadow or none"
      },
      "components": {
        "input": {
          "height": "extracted-height",
          "border": "extracted-border-style",
          "focusBorder": "extracted-focus-style"
        },
        "button": {
          "primary": {
            "background": "#extracted-from-image",
            "color": "#extracted-from-image",
            "padding": "extracted-padding",
            "hoverBackground": "#extracted-from-image"
          },
          "secondary": {
            "background": "#extracted-from-image",
            "color": "#extracted-from-image",
            "border": "extracted-border",
            "padding": "extracted-padding"
          }
        },
        "card": {
          "background": "#extracted-from-image",
          "border": "extracted-border",
          "padding": "extracted-padding"
        },
        "infoBox": {
          "background": "#extracted-from-image",
          "borderLeft": "extracted-border",
          "padding": "extracted-padding",
          "textColor": "#extracted-from-image"
        }
      },
      "layout": {
        "maxWidth": "extracted-max-width",
        "columns": { "desktop": 2, "tablet": 1, "mobile": 1 }
      }
    }
  },
  "forms": [...],
  "pages": [...]
}

**EXTRACTION RULES:**
1. ALL color values MUST be valid hex codes (e.g., "#1a1a1a")
2. ALL spacing values MUST include units (e.g., "24px")
3. Preserve the exact visual appearance from the image

CRITICAL: Return ONLY valid JSON with ALL required design tokens.`;

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

      // Validate the extracted design system
      const validation = this.validateDesignSystem(result?.designAnalysis?.designSystem);

      if (!validation.valid) {
        console.warn('[DesignExpert] Image design system incomplete:', validation.errors.length, 'missing tokens');

        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Design Validation',
            content: `Image extraction missing ${validation.errors.length} tokens, merging with defaults...`
          });
        }

        // Merge with complete design system to fill gaps
        if (result && result.designAnalysis) {
          result.designAnalysis.designSystem = this.mergeWithCompleteDesignSystem(result.designAnalysis.designSystem);
        }
      }

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
        step: 'Generating Design System',
        content: 'Creating complete design system with all required tokens...'
      });
    }

    const context = this.buildContext(userRequirements, dataModels, workflow);

    const prompt = `**Your Role**: You are a world-class UX Designer combining three expertise areas:

## Design Thinker
You approach every design challenge using the Design Thinking methodology:
- **Empathize**: Deeply understand user needs, pain points, and contexts from the requirements
- **Define**: Identify the core problem and user goals the interface must solve
- **Ideate**: Consider multiple design approaches before selecting the optimal solution
- **Prototype**: Create design tokens that enable rapid, consistent UI development
- **Test-Ready**: Ensure the design system supports iterative improvements

## Apple Human Interface Guidelines Expert
You embody Apple's design philosophy:
- **Clarity**: Text is legible, icons are precise, adornments are subtle and appropriate
- **Deference**: Fluid motion and crisp interface help users focus on content
- **Depth**: Visual layers and realistic motion convey hierarchy and facilitate understanding
- **Direct Manipulation**: Immediate feedback and intuitive gestures
- **Consistency**: Familiar UI elements, clear icons, minimal decoration, focus on function

## Google Material Design Expert
You implement Google's Material Design principles:
- **Material as Metaphor**: Surfaces and edges provide visual cues grounded in reality
- **Bold, Graphic, Intentional**: Typography, grids, space, and color create hierarchy and meaning
- **Motion Provides Meaning**: Transitions are meaningful, efficient, and coherent
- **Adaptive Design**: Single underlying design system across platforms and screen sizes
- **Elevation & Shadows**: Purposeful shadow usage to indicate component hierarchy

---

## Your Task
Generate a COMPLETE UI/UX design system for this application.

**User Requirements**: "${userRequirements}"

**Application Context**:
${JSON.stringify(context, null, 2)}

---

## Design Approach Guidelines

**Before generating tokens, mentally evaluate:**
1. What is the primary user goal? (efficiency, creativity, trust, delight?)
2. What emotional response should the UI evoke? (professional, friendly, premium, playful?)
3. What domain conventions exist? (healthcare = calming blues/greens, finance = trust/stability, creative = bold/expressive)
4. What accessibility requirements apply? (contrast ratios, touch targets, readability)

**Apply these principles:**
- Use purposeful color psychology aligned with the domain
- Ensure WCAG 2.1 AA contrast compliance (4.5:1 for text, 3:1 for UI elements)
- Design for thumb-friendly touch targets (minimum 44px)
- Create visual hierarchy through typography scale and weight
- Use consistent spacing rhythm (8px grid system)
- Apply shadows meaningfully to indicate elevation and focus

---

**Important**: Generate ONLY the design system. Do NOT generate forms or pages.

**CRITICAL: ALL TOKENS ARE REQUIRED**
You MUST provide EVERY single design token listed below. Missing tokens will cause the application to fail.
Do NOT use placeholder values like "#hex" - provide actual hex color values.

Return ONLY valid JSON with this EXACT structure (ALL fields are REQUIRED):

{
  "designAnalysis": {
    "source": "auto-generated",
    "domain": "identified domain from requirements",
    "designPhilosophy": {
      "primaryGoal": "What the UI primarily helps users achieve",
      "emotionalTone": "The feeling the design should evoke",
      "designInfluence": "Apple HIG | Material Design | Hybrid - with rationale"
    },
    "designSystem": {
      "colors": {
        "primary": "#hex - main brand/action color",
        "secondary": "#hex - supporting color",
        "accent": "#hex - highlight/emphasis color",
        "background": "#hex - page background",
        "surface": "#hex - elevated surface background",
        "cardBackground": "#hex - card/container background",
        "cardBorder": "#hex - card border color",
        "text": "#hex - primary text color",
        "textSecondary": "#hex - secondary/muted text",
        "textOnPrimary": "#hex - text on primary color",
        "labelText": "#hex - form label color",
        "placeholder": "#hex - input placeholder color",
        "border": "#hex - default border color",
        "borderFocus": "#hex - focused element border",
        "divider": "#hex - divider/separator lines",
        "disabled": "#hex - disabled state color",
        "disabledBackground": "#hex - disabled background",
        "info": "#hex - informational accent",
        "infoBackground": "#hex - info message background",
        "error": "#hex - error state color",
        "errorBackground": "#hex - error message background",
        "success": "#hex - success state color",
        "successBackground": "#hex - success message background",
        "warning": "#hex - warning state color",
        "warningBackground": "#hex - warning message background",
        "overlay": "rgba(0,0,0,0.5) - modal/overlay backdrop"
      },
      "typography": {
        "fontFamily": "System font stack appropriate for the domain",
        "fontFamilyMono": "Monospace font stack for code/data",
        "pageTitle": { "size": "28px", "weight": 600, "lineHeight": 1.2, "letterSpacing": "-0.02em" },
        "pageSubtitle": { "size": "16px", "weight": 400, "lineHeight": 1.5, "letterSpacing": "0" },
        "sectionHeader": { "size": "18px", "weight": 600, "lineHeight": 1.3, "letterSpacing": "-0.01em" },
        "sectionDescription": { "size": "14px", "weight": 400, "lineHeight": 1.5, "letterSpacing": "0" },
        "fieldLabel": { "size": "14px", "weight": 500, "lineHeight": 1.4, "letterSpacing": "0" },
        "inputText": { "size": "16px", "weight": 400, "lineHeight": 1.5, "color": "#hex" },
        "helperText": { "size": "13px", "weight": 400, "lineHeight": 1.4, "letterSpacing": "0" },
        "buttonText": { "size": "14px", "weight": 600, "lineHeight": 1, "letterSpacing": "0.02em" },
        "caption": { "size": "12px", "weight": 400, "lineHeight": 1.4, "letterSpacing": "0.01em" },
        "overline": { "size": "11px", "weight": 600, "lineHeight": 1.4, "letterSpacing": "0.08em", "textTransform": "uppercase" }
      },
      "spacing": {
        "unit": "8px",
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "xxl": "48px",
        "sectionPadding": "24px",
        "fieldGap": "16px",
        "sectionGap": "24px",
        "containerMaxWidth": "800px",
        "containerPaddingX": "24px",
        "containerPaddingTop": "32px",
        "inputPadding": "12px 16px"
      },
      "borderRadius": {
        "none": "0",
        "sm": "4px",
        "md": "8px",
        "lg": "12px",
        "xl": "16px",
        "full": "9999px",
        "card": "12px",
        "input": "8px",
        "button": "8px",
        "checkbox": "4px",
        "avatar": "50%"
      },
      "shadows": {
        "none": "none",
        "sm": "0 1px 2px rgba(0,0,0,0.05)",
        "md": "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        "lg": "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
        "xl": "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
        "card": "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "cardHover": "0 10px 20px rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.08)",
        "focus": "0 0 0 3px rgba(primary, 0.3)",
        "input": "0 1px 2px rgba(0,0,0,0.05)",
        "button": "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
      },
      "transitions": {
        "fast": "150ms ease",
        "normal": "250ms ease",
        "slow": "400ms ease",
        "spring": "500ms cubic-bezier(0.34, 1.56, 0.64, 1)"
      },
      "components": {
        "input": {
          "height": "48px",
          "minHeight": "48px",
          "border": "1px solid #borderColor",
          "focusBorder": "2px solid #primary",
          "hoverBorder": "1px solid #borderHover",
          "errorBorder": "1px solid #error",
          "background": "#ffffff",
          "disabledBackground": "#disabledBackground"
        },
        "button": {
          "minHeight": "44px",
          "primary": {
            "background": "#primary",
            "color": "#textOnPrimary",
            "padding": "12px 24px",
            "hoverBackground": "#primaryHover",
            "activeBackground": "#primaryActive",
            "shadow": "0 1px 3px rgba(0,0,0,0.12)"
          },
          "secondary": {
            "background": "transparent",
            "color": "#primary",
            "border": "1px solid #primary",
            "padding": "12px 24px",
            "hoverBackground": "rgba(primary, 0.08)"
          },
          "ghost": {
            "background": "transparent",
            "color": "#text",
            "padding": "12px 24px",
            "hoverBackground": "rgba(0,0,0,0.05)"
          }
        },
        "card": {
          "background": "#cardBackground",
          "border": "1px solid #cardBorder",
          "padding": "24px",
          "hoverTransform": "translateY(-2px)",
          "hoverShadow": "shadow.cardHover"
        },
        "infoBox": {
          "background": "#infoBackground",
          "borderLeft": "4px solid #info",
          "padding": "16px",
          "borderRadius": "0 8px 8px 0",
          "textColor": "#info"
        },
        "modal": {
          "background": "#surface",
          "borderRadius": "16px",
          "padding": "24px",
          "shadow": "shadow.xl",
          "overlayBackground": "overlay"
        },
        "tooltip": {
          "background": "#1a1a1a",
          "color": "#ffffff",
          "padding": "8px 12px",
          "borderRadius": "6px",
          "fontSize": "13px"
        }
      },
      "layout": {
        "maxWidth": "800px",
        "containerPadding": "24px",
        "columns": {
          "desktop": 2,
          "tablet": 1,
          "mobile": 1
        },
        "breakpoints": {
          "mobile": "0px",
          "tablet": "768px",
          "desktop": "1024px",
          "wide": "1440px"
        },
        "gridGap": "24px"
      },
      "accessibility": {
        "focusRingWidth": "3px",
        "focusRingOffset": "2px",
        "focusRingColor": "rgba(primary, 0.5)",
        "minTouchTarget": "44px",
        "reducedMotion": "prefers-reduced-motion: reduce"
      }
    }
  }
}

---

**VALIDATION RULES:**
1. ALL color values MUST be valid hex codes (e.g., "#1a1a1a", NOT "#hex" or "primaryColor")
2. ALL spacing/size values MUST include units (e.g., "24px", "8px", NOT just numbers)
3. ALL font weights MUST be numbers (e.g., 600, NOT "bold")
4. ALL rgba values must be valid CSS (e.g., "rgba(0,0,0,0.5)")
5. DO NOT omit any fields - every field shown above is REQUIRED
6. Customize colors/values based on the application domain and user requirements
7. Ensure color contrast meets WCAG 2.1 AA standards

**DESIGN QUALITY CHECKLIST:**
- Colors reflect the domain's emotional tone (e.g., healthcare = calming, fintech = trustworthy)
- Typography creates clear visual hierarchy
- Spacing follows consistent rhythm (8px grid)
- Touch targets meet minimum 44px requirement
- Focus states are clearly visible for accessibility
- Shadows indicate meaningful elevation differences
- Transitions feel natural and purposeful

CRITICAL: Return ONLY the designAnalysis object with ALL required fields filled with actual values.`;

    const messages = [{ role: 'user', content: prompt }];
    const responseText = await this.getResponse(messages);
    let result = this.parseJsonResponse(responseText);

    // Validate the design system has all required tokens
    const validation = this.validateDesignSystem(result?.designAnalysis?.designSystem);

    if (!validation.valid) {
      console.warn('[DesignExpert] Design system validation failed:', validation.errors);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Design Validation',
          content: `AI response missing ${validation.errors.length} required tokens, applying complete design system...`
        });
      }

      // Merge AI response with complete defaults to fill missing values
      result = {
        designAnalysis: {
          source: result?.designAnalysis?.source || 'auto-generated',
          domain: result?.designAnalysis?.domain || 'general',
          designSystem: this.mergeWithCompleteDesignSystem(result?.designAnalysis?.designSystem)
        }
      };
    }

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Design System Complete',
        content: 'Complete design system with all tokens ready for CSS generation'
      });
    }

    return result;
  }

  /**
   * Get complete design system with all required tokens
   * This is the authoritative source of all design tokens
   */
  getCompleteDesignSystem() {
    return getDesignSystem('light');
  }

  /**
   * Validate design system has all required tokens
   * Returns { valid: boolean, errors: string[] }
   */
  validateDesignSystem(designSystem) {
    const errors = [];

    if (!designSystem) {
      return { valid: false, errors: ['designSystem is missing'] };
    }

    // Required color tokens
    const requiredColors = [
      'primary', 'secondary', 'background', 'cardBackground', 'cardBorder',
      'text', 'textSecondary', 'labelText', 'border', 'focus',
      'info', 'infoBackground', 'error', 'success', 'warning'
    ];

    if (!designSystem.colors) {
      errors.push('colors object is missing');
    } else {
      requiredColors.forEach(color => {
        if (!designSystem.colors[color]) {
          errors.push(`colors.${color} is missing`);
        } else if (!this.isValidHexColor(designSystem.colors[color])) {
          errors.push(`colors.${color} is not a valid hex color: ${designSystem.colors[color]}`);
        }
      });
    }

    // Required typography tokens
    const requiredTypography = [
      'fontFamily', 'pageTitle', 'pageSubtitle', 'sectionHeader',
      'sectionDescription', 'fieldLabel', 'inputText', 'helperText', 'buttonText'
    ];

    if (!designSystem.typography) {
      errors.push('typography object is missing');
    } else {
      requiredTypography.forEach(token => {
        if (!designSystem.typography[token]) {
          errors.push(`typography.${token} is missing`);
        }
      });
    }

    // Required spacing tokens
    const requiredSpacing = [
      'unit', 'sectionPadding', 'fieldGap', 'sectionGap',
      'containerMaxWidth', 'containerPaddingTop', 'inputPadding'
    ];

    if (!designSystem.spacing) {
      errors.push('spacing object is missing');
    } else {
      requiredSpacing.forEach(token => {
        if (!designSystem.spacing[token]) {
          errors.push(`spacing.${token} is missing`);
        }
      });
    }

    // Required borderRadius tokens
    const requiredBorderRadius = ['card', 'input', 'button', 'checkbox'];

    if (!designSystem.borderRadius) {
      errors.push('borderRadius object is missing');
    } else {
      requiredBorderRadius.forEach(token => {
        if (!designSystem.borderRadius[token]) {
          errors.push(`borderRadius.${token} is missing`);
        }
      });
    }

    // Required shadows tokens
    if (!designSystem.shadows) {
      errors.push('shadows object is missing');
    } else {
      if (designSystem.shadows.card === undefined) errors.push('shadows.card is missing');
      if (designSystem.shadows.focus === undefined) errors.push('shadows.focus is missing');
    }

    // Required components
    if (!designSystem.components) {
      errors.push('components object is missing');
    } else {
      if (!designSystem.components.input) errors.push('components.input is missing');
      if (!designSystem.components.button) errors.push('components.button is missing');
      if (!designSystem.components.button?.primary) errors.push('components.button.primary is missing');
      if (!designSystem.components.button?.secondary) errors.push('components.button.secondary is missing');
      if (!designSystem.components.card) errors.push('components.card is missing');
      if (!designSystem.components.infoBox) errors.push('components.infoBox is missing');
    }

    // Required layout tokens
    if (!designSystem.layout) {
      errors.push('layout object is missing');
    } else {
      if (!designSystem.layout.maxWidth) errors.push('layout.maxWidth is missing');
      if (!designSystem.layout.columns) errors.push('layout.columns is missing');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid hex color
   */
  isValidHexColor(color) {
    if (!color || typeof color !== 'string') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Deep merge AI-provided design system with complete defaults
   * AI values take precedence, missing values filled from defaults
   */
  mergeWithCompleteDesignSystem(aiDesignSystem) {
    const complete = this.getCompleteDesignSystem();

    if (!aiDesignSystem) {
      return complete;
    }

    // Deep merge function
    const deepMerge = (target, source) => {
      const result = { ...target };

      for (const key in source) {
        if (source[key] !== null && source[key] !== undefined) {
          if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
          } else {
            result[key] = source[key];
          }
        }
      }

      return result;
    };

    return deepMerge(complete, aiDesignSystem);
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

  /**
   * Generate theme and layout structure using LLM - fully AI-driven
   * LLM will analyze the app context to detect industry, application type, and generate optimal theme
   * @param {Object} options - Generation options
   * @param {Object} options.appContext - Full application context (name, description, dataModels, pages, workflows, forms)
   * @param {string} options.preferredMode - 'light' or 'dark'
   * @param {Function} onThinking - Callback for progress updates
   * @returns {Object} Generated theme, layout, detected industry, and application type
   */
  async generateIndustryTheme(options = {}, onThinking) {
    const {
      appContext = {},
      preferredMode = 'light'
    } = options;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Application',
        content: `Analyzing ${appContext.name || 'application'} to detect industry and generate optimal theme...`
      });
    }

    const prompt = `You are an expert UI/UX designer specializing in enterprise application design. Analyze the following application and:
1. DETECT the industry this application belongs to
2. DETECT the application type/category
3. GENERATE an optimal theme and layout configuration

**Application Context:**
- Name: ${appContext.name || 'Untitled App'}
- Description: ${appContext.description || 'No description provided'}
- Data Models: ${JSON.stringify(appContext.dataModels || [], null, 2)}
- Pages: ${JSON.stringify(appContext.pages || [], null, 2)}
- Workflows: ${JSON.stringify(appContext.workflows || [], null, 2)}
- Forms: ${JSON.stringify(appContext.forms || [], null, 2)}
- Preferred Color Mode: ${preferredMode}

**Your Task:**
1. Analyze the app name, description, data models, pages, workflows to DETECT:
   - Industry (e.g., finance, healthcare, sales, engineering, ecommerce, education, legal, manufacturing, hr, logistics, general)
   - Application Type (e.g., dashboard, portal, crm, workflow-app, data-entry, analytics, admin-panel, inventory, booking)

2. Based on detected industry and type, GENERATE optimal:
   - Color palette (appropriate for the industry - e.g., blue/green for finance, teal for healthcare)
   - Typography (professional fonts, monospace for data-heavy industries)
   - Layout structure (sidebar width, container width, data density)
   - Page templates (optimal layouts for dashboard, list, detail, form pages)

**Industry Design Patterns:**
- Finance: Trust/security feel, data-dense, blue/green/navy tones, monospace for numbers, wider sidebars
- Healthcare: Calm/clean, accessible, teal/blue tones, high contrast, WCAG compliant
- Sales/CRM: Energetic, conversion-focused, purple/violet accents, pipeline visualizations
- Engineering: Technical, efficient, dark-mode friendly, monospace fonts, wider containers
- E-commerce: Product-focused, vibrant, orange/amber accents, card-heavy layouts
- HR: Professional, warm, organized, purple/blue tones, clear hierarchy
- Logistics: Industrial, status-focused, orange/blue tones, data tables

**Generate a JSON response with this EXACT structure:**
{
  "detectedIndustry": "the industry you detected from analyzing the app",
  "detectedApplicationType": "the application type you detected",
  "industryConfidence": "high|medium|low",
  "analysisNotes": "brief explanation of why you detected this industry/type",
  "theme": {
    "name": "descriptive-theme-name based on industry and mode",
    "mode": "${preferredMode}",
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "cardBackground": "#hex",
      "cardBorder": "#hex",
      "text": "#hex",
      "textSecondary": "#hex",
      "textMuted": "#hex",
      "border": "#hex",
      "input": "#hex",
      "inputBorder": "#hex",
      "focus": "#hex",
      "error": "#hex",
      "success": "#hex",
      "warning": "#hex",
      "info": "#hex"
    },
    "typography": {
      "fontFamily": "appropriate font stack",
      "headingFontFamily": "heading font stack",
      "monoFontFamily": "monospace font stack",
      "baseFontSize": "14px or 16px",
      "headingWeight": "600 or 700",
      "bodyWeight": "400",
      "lineHeight": "1.5 or 1.6"
    },
    "borderRadius": {
      "none": "0",
      "sm": "value",
      "base": "value",
      "md": "value",
      "lg": "value",
      "xl": "value",
      "full": "9999px"
    },
    "shadows": {
      "sm": "shadow css",
      "base": "shadow css",
      "md": "shadow css",
      "lg": "shadow css",
      "card": "shadow css",
      "cardHover": "shadow css"
    },
    "spacing": {
      "unit": "4px or 8px",
      "pagePadding": "value",
      "cardPadding": "value",
      "sectionGap": "value",
      "fieldGap": "value"
    }
  },
  "layout": {
    "type": "sidebar|topnav|hybrid",
    "sidebarWidth": "value in px",
    "sidebarPosition": "left|right",
    "sidebarCollapsible": true|false,
    "sidebarCollapsedWidth": "value in px",
    "containerMaxWidth": "value in px or full",
    "contentPadding": "value",
    "headerHeight": "value",
    "emphasis": "data-density|visual-hierarchy|whitespace|compact",
    "gridColumns": 12,
    "defaultCardLayout": "grid|list|table",
    "recommendedComponents": ["array of shadcn component names"],
    "pageTemplates": {
      "dashboard": {
        "sections": ["array of section types"],
        "columns": 12,
        "metricsPerRow": 3|4|5
      },
      "list": {
        "style": "table|cards|hybrid",
        "pagination": "numbered|infinite|load-more",
        "filtersPosition": "top|sidebar|modal"
      },
      "detail": {
        "layout": "single-column|two-column|tabbed",
        "actionsPosition": "top|bottom|sticky"
      },
      "form": {
        "layout": "single-column|two-column|wizard",
        "labelPosition": "top|left|floating",
        "submitPosition": "bottom|sticky"
      }
    }
  },
  "designRationale": "Detailed explanation of your design choices based on the detected industry and application type"
}

Return ONLY valid JSON. No markdown, no explanation outside JSON.`;

    try {
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0]?.text || '{}';

      // Parse JSON from response (handle potential markdown wrapping)
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonStr = content.replace(/```\n?/g, '');
      }

      const result = JSON.parse(jsonStr.trim());

      // Extract LLM-detected values
      const detectedIndustry = result.detectedIndustry || 'general';
      const detectedApplicationType = result.detectedApplicationType || 'dashboard';

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Theme Generated',
          content: `Detected: ${detectedIndustry} / ${detectedApplicationType}. Generated ${result.theme?.name || 'custom'} theme.`
        });
      }

      console.log(`[DesignExpert] LLM Analysis - Industry: ${detectedIndustry}, Type: ${detectedApplicationType}, Confidence: ${result.industryConfidence || 'unknown'}`);
      console.log(`[DesignExpert] Analysis Notes: ${result.analysisNotes || 'none'}`);

      // Return fully LLM-generated result with defaults as fallback
      return {
        // LLM-detected metadata
        detectedIndustry,
        detectedApplicationType,
        industryConfidence: result.industryConfidence || 'medium',
        analysisNotes: result.analysisNotes || '',

        // Theme with LLM values merged over defaults
        theme: {
          name: result.theme?.name || `${detectedIndustry}-${preferredMode}`,
          mode: result.theme?.mode || preferredMode,
          industry: detectedIndustry,
          applicationType: detectedApplicationType,
          colors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#f59e0b',
            background: preferredMode === 'dark' ? '#0f172a' : '#ffffff',
            cardBackground: preferredMode === 'dark' ? '#1e293b' : '#ffffff',
            cardBorder: preferredMode === 'dark' ? '#334155' : '#e2e8f0',
            text: preferredMode === 'dark' ? '#f1f5f9' : '#0f172a',
            textSecondary: preferredMode === 'dark' ? '#94a3b8' : '#64748b',
            textMuted: preferredMode === 'dark' ? '#64748b' : '#9ca3af',
            border: preferredMode === 'dark' ? '#334155' : '#e2e8f0',
            input: preferredMode === 'dark' ? '#1e293b' : '#ffffff',
            inputBorder: preferredMode === 'dark' ? '#475569' : '#d1d5db',
            focus: '#6366f1',
            error: '#ef4444',
            success: '#22c55e',
            warning: '#f59e0b',
            info: '#3b82f6',
            ...result.theme?.colors
          },
          typography: {
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            headingFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            monoFontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            baseFontSize: '14px',
            headingWeight: '600',
            bodyWeight: '400',
            lineHeight: '1.5',
            ...result.theme?.typography
          },
          borderRadius: {
            none: '0',
            sm: '0.125rem',
            base: '0.375rem',
            md: '0.5rem',
            lg: '0.75rem',
            xl: '1rem',
            full: '9999px',
            ...result.theme?.borderRadius
          },
          shadows: {
            sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            card: '0 1px 3px rgba(0,0,0,0.1)',
            cardHover: '0 4px 12px rgba(0,0,0,0.15)',
            ...result.theme?.shadows
          },
          spacing: {
            unit: '8px',
            pagePadding: '24px',
            cardPadding: '20px',
            sectionGap: '24px',
            fieldGap: '16px',
            ...result.theme?.spacing
          }
        },

        // Layout with LLM values merged over defaults
        layout: {
          type: 'sidebar',
          sidebarWidth: '256px',
          sidebarPosition: 'left',
          sidebarCollapsible: true,
          sidebarCollapsedWidth: '64px',
          containerMaxWidth: '1200px',
          contentPadding: '24px',
          headerHeight: '64px',
          emphasis: 'balanced',
          gridColumns: 12,
          defaultCardLayout: 'grid',
          recommendedComponents: ['Card', 'Table', 'Button', 'Input', 'Select', 'Badge'],
          pageTemplates: {
            dashboard: { sections: ['metrics', 'charts', 'activity'], columns: 12, metricsPerRow: 4 },
            list: { style: 'table', pagination: 'numbered', filtersPosition: 'top' },
            detail: { layout: 'two-column', actionsPosition: 'top' },
            form: { layout: 'single-column', labelPosition: 'top', submitPosition: 'bottom' }
          },
          ...result.layout
        },

        designRationale: result.designRationale || `AI-generated theme for ${detectedIndustry} ${detectedApplicationType}`
      };

    } catch (error) {
      console.error('[DesignExpert] Error generating industry theme:', error.message);

      // Return sensible defaults on error
      return this.getDefaultTheme(preferredMode);
    }
  }

  /**
   * Get default theme when LLM fails - minimal fallback
   */
  getDefaultTheme(mode = 'light') {
    const isDark = mode === 'dark';

    return {
      detectedIndustry: 'general',
      detectedApplicationType: 'dashboard',
      industryConfidence: 'low',
      analysisNotes: 'LLM unavailable - using default theme',

      theme: {
        name: `default-${mode}`,
        mode,
        industry: 'general',
        applicationType: 'dashboard',
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: isDark ? '#0f172a' : '#ffffff',
          cardBackground: isDark ? '#1e293b' : '#ffffff',
          cardBorder: isDark ? '#334155' : '#e2e8f0',
          text: isDark ? '#f1f5f9' : '#0f172a',
          textSecondary: isDark ? '#94a3b8' : '#64748b',
          textMuted: isDark ? '#64748b' : '#9ca3af',
          border: isDark ? '#334155' : '#e2e8f0',
          input: isDark ? '#1e293b' : '#ffffff',
          inputBorder: isDark ? '#475569' : '#d1d5db',
          focus: '#6366f1',
          error: '#ef4444',
          success: '#22c55e',
          warning: '#f59e0b',
          info: '#3b82f6'
        },
        typography: {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          headingFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          monoFontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          baseFontSize: '14px',
          headingWeight: '600',
          bodyWeight: '400',
          lineHeight: '1.5'
        },
        borderRadius: {
          none: '0',
          sm: '0.125rem',
          base: '0.375rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem',
          full: '9999px'
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          card: '0 1px 3px rgba(0,0,0,0.1)',
          cardHover: '0 4px 12px rgba(0,0,0,0.15)'
        },
        spacing: {
          unit: '8px',
          pagePadding: '24px',
          cardPadding: '20px',
          sectionGap: '24px',
          fieldGap: '16px'
        }
      },
      layout: {
        type: 'sidebar',
        sidebarWidth: '256px',
        sidebarPosition: 'left',
        sidebarCollapsible: true,
        sidebarCollapsedWidth: '64px',
        containerMaxWidth: '1200px',
        contentPadding: '24px',
        headerHeight: '64px',
        emphasis: 'balanced',
        gridColumns: 12,
        defaultCardLayout: 'grid',
        recommendedComponents: ['Card', 'Table', 'Button', 'Input', 'Select', 'Badge'],
        pageTemplates: {
          dashboard: { sections: ['metrics', 'charts', 'activity'], columns: 12, metricsPerRow: 4 },
          list: { style: 'table', pagination: 'numbered', filtersPosition: 'top' },
          detail: { layout: 'two-column', actionsPosition: 'top' },
          form: { layout: 'single-column', labelPosition: 'top', submitPosition: 'bottom' }
        }
      },
      designRationale: 'Default theme - LLM analysis was unavailable'
    };
  }
}

module.exports = DesignExpert;
