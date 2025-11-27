/**
 * AdvancedFormExpert - Specialized in complex forms with advanced components
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');
const { FORM_DESIGN_SYSTEM, generateFormLayout, generateFieldStyling } = require('../../../utils/form-layout-design-system');

class AdvancedFormExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Advanced Form Expert

## Specialization:
I am an expert in **advanced forms** with:
- 8+ fields with complex interactions
- Advanced components (file upload, e-signature, rich text, data table)
- Complex validation rules
- Conditional logic and dynamic fields
- Multi-section layouts
- Repeating field groups

## Ideal Use Cases:
- Financial applications
- Legal documents
- Compliance forms
- Enterprise data collection
- Complex approval workflows
- Forms with calculations

## Advanced Component Usage:
### Financial:
- **currency**: Monetary values with precision
- **accounting**: Accounting-specific formatting
- **number**: Numeric calculations

### Documents:
- **file**: Document uploads
- **esign**: Electronic signatures
- **richtext**: Formatted text content
- **pdf**: PDF previews

### Data:
- **datatable**: Tabular data entry
- **repeater**: Repeating field groups
- **lookup**: Database lookups
- **json**: Structured data input

### Advanced Inputs:
- **timer**: Time tracking
- **location**: GPS coordinates
- **map**: Geographic selection
- **qrcode/barcode**: Scanning

## Best Practices for Advanced Forms:
1. Group related fields into sections
2. Use tabs or accordions for organization
3. Implement field dependencies
4. Add inline calculations
5. Provide detailed validation feedback
6. Support save as draft
7. Include progress indicators
8. Add help text and tooltips

${FORM_COMPONENT_CATALOG}

## CRITICAL: Layout and Styling Requirements

You MUST generate comprehensive layout and styling metadata for ALL forms. This ensures forms are visually appealing with proper spacing and professional appearance.

### Form Layout Configuration:
For advanced forms, use TWO-COLUMN layout for better space utilization:
- columns: 2
- gap: "24px"
- columnGap: "32px"
- rowGap: "24px"
- maxWidth: "1200px"
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
      "name": "advanced_form_name",
      "title": "Form Title",
      "description": "Brief description",
      "nodeId": "node_id",
      "complexity": "advanced",
      "layout": {
        "type": "grid",
        "columns": 2,
        "columnGap": "32px",
        "rowGap": "24px",
        "maxWidth": "1200px",
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
      "sections": [...],  // Multiple sections
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
      ],    // 8+ fields
      "conditionalLogic": [...],
      "calculations": [...]
    }
  ]
}
`;

    super('AdvancedFormExpert', knowledgeBase, 'claude-sonnet-4-20250514'); // Sonnet for complex logic
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Advanced Forms',
        content: 'Creating sophisticated forms with advanced components and validation...'
      });
    }

    const formNodes = workflow?.nodes?.filter(node =>
      node.type === 'startProcess' || node.type === 'userTask'
    ) || [];

    const prompt = `Generate advanced forms for: "${userRequirements}"

Workflow Nodes Requiring Forms:
${JSON.stringify(formNodes, null, 2)}

CRITICAL REQUIREMENTS:

1. Form Structure:
   - 8+ fields with complex interactions
   - Advanced components (file, esign, richtext, currency, etc.)
   - Complex validation and conditional logic
   - Multi-section organization
   - Calculated fields where appropriate
   - Each form MUST include a "nodeId" field matching one of the node IDs from workflow nodes

2. MUST INCLUDE Layout Configuration:
   - layout.type: "grid"
   - layout.columns: 2 (two-column for advanced forms)
   - layout.columnGap: "32px"
   - layout.rowGap: "24px"
   - layout.maxWidth: "1200px"
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
        step: 'Advanced Forms Complete',
        content: `Generated ${result.forms?.length || 0} advanced form(s)`
      });
    }

    return result.forms || [];
  }
}

module.exports = AdvancedFormExpert;
