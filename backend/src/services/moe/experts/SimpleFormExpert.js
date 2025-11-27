/**
 * SimpleFormExpert - Specialized in simple forms with basic components
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');
const { FORM_DESIGN_SYSTEM, generateFormLayout, generateFieldStyling } = require('../../../utils/form-layout-design-system');

class SimpleFormExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Simple Form Expert

## Specialization:
I am an expert in **simple forms** with:
- 3-7 fields maximum
- Basic input types (text, textarea, dropdown, date)
- Simple validation (required, min/max length)
- Single-page forms
- No complex conditional logic

## Ideal Use Cases:
- Contact forms
- Feedback forms
- Simple request forms
- Basic data collection
- Quick submissions

## Component Preferences:
### Core Components (use frequently):
- **text**: Short text inputs (name, title, subject)
- **textarea**: Longer text (description, comments)
- **dropdown**: Selection from options
- **date**: Date selection
- **email**: Email addresses
- **phone**: Phone numbers

### Avoid in Simple Forms:
- Rich text editors
- File uploads
- Electronic signatures
- Complex repeaters
- Multi-step wizards
- Advanced data tables

## Best Practices for Simple Forms:
1. Keep field count low (3-7 fields)
2. Use clear, simple labels
3. Minimize required fields
4. Basic validation only
5. Single column layout
6. No nested sections
7. Straightforward field order

${FORM_COMPONENT_CATALOG}

## CRITICAL: Layout and Styling Requirements

You MUST generate comprehensive layout and styling metadata for ALL forms. This ensures forms are visually appealing with proper spacing and professional appearance.

### Form Layout Configuration:
For simple forms, use SINGLE COLUMN layout:
- columns: 1
- gap: "24px"
- maxWidth: "600px"
- padding: "32px"

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
      "name": "simple_form_name",
      "title": "Form Title",
      "description": "Brief description",
      "nodeId": "node_id",
      "complexity": "simple",
      "layout": {
        "type": "grid",
        "columns": 1,
        "gap": "24px",
        "maxWidth": "600px",
        "padding": "32px"
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
      ]
    }
  ]
}
`;

    super('SimpleFormExpert', knowledgeBase, 'claude-haiku-4-5-20251001'); // Fast Haiku for simple tasks
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Simple Forms',
        content: 'Creating straightforward forms with basic components...'
      });
    }

    const formNodes = workflow?.nodes?.filter(node =>
      node.type === 'startProcess' || node.type === 'userTask'
    ) || [];

    const prompt = `Generate simple forms for: "${userRequirements}"

Workflow Nodes Requiring Forms:
${JSON.stringify(formNodes, null, 2)}

CRITICAL REQUIREMENTS:

1. Form Structure:
   - 3-7 fields maximum
   - Basic components (text, textarea, dropdown, date)
   - Simple validation only
   - Clear, straightforward layout
   - One form per node
   - Each form MUST include a "nodeId" field matching one of the node IDs above

2. MUST INCLUDE Layout Configuration:
   - layout.type: "grid"
   - layout.columns: 1 (single column)
   - layout.gap: "24px"
   - layout.maxWidth: "600px"
   - layout.padding: "32px"

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

Return ONLY valid JSON matching the exact output format from the knowledge base.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const result = this.parseJsonResponse(responseText);

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Simple Forms Complete',
        content: `Generated ${result.forms?.length || 0} simple form(s)`
      });
    }

    return result.forms || [];
  }
}

module.exports = SimpleFormExpert;
