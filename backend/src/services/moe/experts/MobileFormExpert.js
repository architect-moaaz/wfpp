/**
 * MobileFormExpert - Specialized in mobile-optimized forms
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');
const { FORM_DESIGN_SYSTEM, generateFormLayout, generateFieldStyling } = require('../../../utils/form-layout-design-system');

class MobileFormExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Mobile Form Expert

## Specialization:
I am an expert in **mobile-optimized forms** with:
- Touch-friendly inputs
- Responsive layouts
- Mobile-specific components
- Simplified interactions
- Offline support considerations

## Mobile-Specific Priorities:
1. **Large Touch Targets**: Minimum 44x44 pixels
2. **One Column Layout**: Vertical stacking
3. **Minimal Typing**: Use pickers and selections
4. **Progressive Disclosure**: Show fields as needed
5. **Native Input Types**: Trigger correct mobile keyboards
6. **Camera/GPS Integration**: Use device capabilities

## Mobile-Friendly Components:
### Preferred:
- **dropdown**: Better than text for options
- **radio**: Large touch targets
- **checkbox**: Easy selection
- **date/time**: Native pickers
- **toggle**: Better than checkbox on mobile
- **slider**: Touch-friendly input
- **camera**: Photo capture
- **location**: GPS coordinates
- **qrcode/barcode**: Scanner

### Avoid on Mobile:
- **richtext**: Complex on small screens
- **datatable**: Doesn't fit mobile screens
- **complex**: Multiple columns

## Mobile UX Best Practices:
1. Single column layout
2. Large, thumb-friendly buttons
3. Minimal text input (use selections)
4. Auto-advance between fields
5. Show one section at a time
6. Save draft automatically
7. Minimize scrolling
8. Use device capabilities (camera, GPS)
9. Provide clear feedback
10. Support offline mode

## Input Type Optimization:
- **email**: Triggers email keyboard
- **phone**: Triggers number pad
- **number**: Numeric keyboard
- **url**: URL keyboard with .com
- **search**: Search keyboard with Go button

${FORM_COMPONENT_CATALOG}

## CRITICAL: Layout and Styling Requirements

You MUST generate comprehensive layout and styling metadata for ALL forms. This ensures forms are visually appealing with proper spacing and professional appearance.

### Form Layout Configuration:
For mobile forms, ALWAYS use SINGLE COLUMN layout:
- columns: 1
- gap: "20px"
- maxWidth: "100%"
- padding: "20px"
- paddingMobile: "16px"

### Field Styling (REQUIRED for each field):
Every field MUST include a "styling" object with:
{
  "container": {
    "marginBottom": "24px",
    "columnSpan": 1
  },
  "label": {
    "fontSize": "14px",
    "fontWeight": "500",
    "color": "#374151",
    "marginBottom": "8px"
  },
  "input": {
    "height": "40px",
    "padding": "10px 14px",
    "borderRadius": "6px",
    "border": "1px solid #d1d5db",
    "backgroundColor": "#ffffff",
    "fontSize": "14px"
  },
  "helpText": {
    "fontSize": "13px",
    "color": "#6b7280",
    "marginTop": "6px"
  }
}

For textarea fields, use "minHeight": "100px" instead of height: "40px"

### Form-Level Styling (REQUIRED):
{
  "form": {
    "padding": "32px",
    "maxWidth": "1200px",
    "margin": "0 auto",
    "backgroundColor": "#ffffff"
  },
  "buttons": {
    "gap": "12px",
    "marginTop": "32px"
  }
}

### Color Palette:
- Primary: #3b82f6, Hover: #2563eb
- Text: #111827, Secondary: #6b7280
- Border: #d1d5db, Background: #ffffff
- Error: #ef4444, Success: #10b981

## Output Format:
{
  "forms": [
    {
      "id": "form_xxx",
      "name": "mobile_form_name",
      "title": "Form Title",
      "description": "Brief description",
      "nodeId": "node_id",
      "optimizedFor": "mobile",
      "layout": {
        "type": "grid",
        "columns": 1,
        "gap": "20px",
        "maxWidth": "100%",
        "padding": "20px"
      },
      "styling": {
        "form": {
          "padding": "32px",
          "maxWidth": "1200px",
          "margin": "0 auto",
          "backgroundColor": "#ffffff"
        },
        "buttons": {
          "gap": "12px",
          "marginTop": "32px"
        }
      },
      "gridLayout": [
        {"i": "field_1", "x": 0, "y": 0, "w": 24, "h": 8, "minW": 6, "minH": 6}
      ],
      "fields": [
        {
          "id": "field_1",
          "type": "text",
          "name": "fieldName",
          "label": "Field Label",
          "required": true,
          "styling": {
            "container": {
              "marginBottom": "24px",
              "columnSpan": 1
            },
            "label": {
              "fontSize": "14px",
              "fontWeight": "500",
              "color": "#374151",
              "marginBottom": "8px"
            },
            "input": {
              "height": "40px",
              "padding": "10px 14px",
              "borderRadius": "6px",
              "border": "1px solid #d1d5db",
              "backgroundColor": "#ffffff",
              "fontSize": "14px"
            },
            "helpText": {
              "fontSize": "13px",
              "color": "#6b7280",
              "marginTop": "6px"
            }
          }
        }
      ],  // Mobile-friendly fields
      "deviceCapabilities": ["camera", "location", "scanner"]
    }
  ]
}
`;

    super('MobileFormExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Mobile-Optimized Forms',
        content: 'Creating touch-friendly forms optimized for mobile devices...'
      });
    }

    const formNodes = workflow?.nodes?.filter(node =>
      node.type === 'startProcess' || node.type === 'userTask'
    ) || [];

    const prompt = `Generate mobile-optimized forms for: "${userRequirements}"

Workflow Nodes:
${JSON.stringify(formNodes, null, 2)}

CRITICAL REQUIREMENTS:

1. Form Structure:
   - Single-column layout for mobile
   - Large touch targets (minimum 44x44 pixels)
   - Mobile-friendly components (dropdown, toggle, camera, location, radio, checkbox)
   - Minimal text input (use pickers/selections)
   - Progressive disclosure (show fields as needed)
   - Device capability integration
   - Each form MUST include a "nodeId" field matching one of the node IDs from workflow nodes

2. MUST INCLUDE Layout Configuration:
   - layout.type: "grid"
   - layout.columns: 1 (single column for mobile)
   - layout.gap: "20px"
   - layout.maxWidth: "100%"
   - layout.padding: "20px"

3. MUST INCLUDE Form-Level Styling:
   - styling.form.padding: "32px"
   - styling.form.maxWidth: "1200px"
   - styling.form.margin: "0 auto"
   - styling.form.backgroundColor: "#ffffff"
   - styling.buttons.gap: "12px"
   - styling.buttons.marginTop: "32px"

4. MUST INCLUDE Field-Level Styling for EVERY field:
   Each field MUST have a "styling" object with:
   - container: { marginBottom: "24px", columnSpan: 1 }
   - label: { fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }
   - input: { height: "40px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#ffffff", fontSize: "14px" }
   - helpText: { fontSize: "13px", color: "#6b7280", marginTop: "6px" }

   For textarea fields: use "minHeight": "100px" instead of "height"

Use these colors:
- Primary: #3b82f6, Hover: #2563eb
- Text: #111827, Secondary: #6b7280
- Border: #d1d5db, Background: #ffffff
- Error: #ef4444, Success: #10b981

5. CRITICAL - Grid Layout Coordinates (Based on Design System):
   You MUST generate a "gridLayout" array with positioning for EACH field.

   Extract from design system (if available via sharedContext):
   - layoutColumns = designSystem?.layout?.columns?.desktop || 2
   - inputHeight = designSystem?.components?.input?.height || '40px'
   - textareaMinHeight = designSystem?.components?.textarea?.minHeight || '100px'
   - fieldGap = designSystem?.spacing?.fieldGap || '16px'

   Grid Calculation Rules:
   - Grid system: 24 units wide (full width = 24)
   - Standard field height: 8 grid units (input + label + margins)
   - Textarea field height: 12 grid units (textarea + label + margins)

   Calculate x, y, w, h coordinates for each field:
   * x: horizontal position (0-23)
     - 1-column: always 0
     - 2-column: left column = 0, right column = 12
   * y: vertical position (cumulative based on previous field heights)
   * w: width in grid units
     - Full width: 24
     - Half width (2-column): 12
     - Third width (3-column): 8
   * h: height in grid units
     - Standard fields (text, email, number, select, date, etc.): 8
     - Textarea fields: 12

   Example gridLayout format:
   "gridLayout": [
     {"i": "field-id-1", "x": 0, "y": 0, "w": 12, "h": 8, "minW": 6, "minH": 6},
     {"i": "field-id-2", "x": 12, "y": 0, "w": 12, "h": 8, "minW": 6, "minH": 6},
     {"i": "field-id-3", "x": 0, "y": 8, "w": 24, "h": 12, "minW": 6, "minH": 6}
   ]

Return ONLY valid JSON matching the exact output format from the knowledge base.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    // POST-PROCESS: Add gridLayout if missing for each form
    const processedForms = (result.forms || []).map(form => {
      if (!form.gridLayout && form.fields) {
        console.log(`[MobileFormExpert] Auto-generating gridLayout for form: ${form.name}`);
        form.gridLayout = this.generateGridLayout(form.fields, sharedContext.designSystem);
      }
      return form;
    });

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Mobile Forms Complete',
        content: `Generated ${processedForms.length} mobile-optimized form(s)`
      });
    }

    return processedForms;
  }

  /**
   * Generate gridLayout from form fields based on design system
   * This ensures reliable grid coordinates even when LLM doesn't follow prompts
   */
  generateGridLayout(fields, designSystem) {
    if (!fields || fields.length === 0) return [];

    const layoutColumns = 1; // Mobile forms ALWAYS use 1 column (full width)
    const gridWidth = 24; // react-grid-layout standard
    const standardFieldHeight = 6; // Grid units for standard fields
    const textareaFieldHeight = 10; // Grid units for textarea fields

    let currentY = 0;

    return fields.map((field, index) => {
      // Mobile always uses full width
      const w = 24;

      // Calculate height based on field type
      const h = field.type === 'textarea' ? textareaFieldHeight : standardFieldHeight;

      // Mobile always starts at x=0 (full width)
      const x = 0;

      // Calculate y position (cumulative)
      const y = currentY;
      currentY += h;

      return {
        i: field.id || field.name,
        x,
        y,
        w,
        h,
        minW: 6,
        minH: 6
      };
    });
  }
}

module.exports = MobileFormExpert;
