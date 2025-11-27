/**
 * WizardFormExpert - Specialized in multi-step wizard forms
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');
const { FORM_DESIGN_SYSTEM, generateFormLayout, generateFieldStyling, generateWizardStepIndicator } = require('../../../utils/form-layout-design-system');

class WizardFormExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Wizard Form Expert

## Specialization:
I am an expert in **multi-step wizard forms** with:
- Multiple logical steps/pages
- Progress indicators
- Step validation
- Navigation (previous/next)
- Review and submit step
- Save and resume capability

## Ideal Use Cases:
- Onboarding processes
- Complex registration forms
- Multi-page applications
- Checkout flows
- Setup wizards
- Guided data entry

## Wizard Design Principles:
1. **Logical Grouping**: Group related fields into steps
2. **Progress Visibility**: Show steps and current position
3. **Step Independence**: Each step should be conceptually distinct
4. **Validation Per Step**: Validate before advancing
5. **Easy Navigation**: Previous/Next buttons, breadcrumbs
6. **Review Step**: Summary before final submission
7. **Save Draft**: Allow resuming later

## Step Organization Patterns:

### Registration Wizard:
- Step 1: Personal Information
- Step 2: Account Details
- Step 3: Preferences
- Step 4: Review & Submit

### Approval Request:
- Step 1: Basic Information
- Step 2: Details & Documentation
- Step 3: Justification
- Step 4: Attachments
- Step 5: Review & Submit

### Onboarding:
- Step 1: Welcome & Instructions
- Step 2: Profile Setup
- Step 3: Preferences
- Step 4: Training/Orientation
- Step 5: Acknowledgments

## Wizard-Specific Features:
- Progress bar or stepper
- Step labels and descriptions
- Previous/Next/Submit buttons
- Step validation before proceeding
- Review screen before submission
- Edit capability from review
- Save as draft at any step

${FORM_COMPONENT_CATALOG}

## CRITICAL: Layout and Styling Requirements

You MUST generate comprehensive layout and styling metadata for ALL forms. This ensures forms are visually appealing with proper spacing and professional appearance.

### Form Layout Configuration:
For wizard forms, use SINGLE COLUMN layout for clarity and focus:
- columns: 1
- gap: "24px"
- maxWidth: "600px"
- padding: "32px"

### Step Layout:
Each step should include:
- padding: "24px"
- marginBottom: "40px"
- gap between fields: "24px"

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

For textarea fields, override input.height to "minHeight": "100px"
For full-width fields (textarea, description), set container.columnSpan to "all"

### Form-Level Styling (REQUIRED):
{
  "form": {
    "padding": "32px",
    "maxWidth": "1200px",
    "margin": "0 auto",
    "backgroundColor": "#ffffff"
  },
  "section": {
    "marginBottom": "40px",
    "padding": "24px",
    "gap": "24px"
  },
  "buttons": {
    "gap": "12px",
    "marginTop": "32px"
  }
}

### Color Palette (use these colors):
- Primary: #3b82f6
- Primary Hover: #2563eb
- Text Primary: #111827
- Text Secondary: #6b7280
- Border: #d1d5db
- Background: #ffffff
- Background Page: #f9fafb
- Error: #ef4444
- Success: #10b981

## Output Format:
{
  "forms": [
    {
      "id": "form_xxx",
      "name": "wizard_form_name",
      "title": "Wizard Title",
      "description": "Brief description",
      "nodeId": "node_id",
      "formType": "wizard",
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
        "section": {
          "marginBottom": "40px",
          "padding": "24px",
          "gap": "24px"
        },
        "buttons": {
          "gap": "12px",
          "marginTop": "32px"
        }
      },
      "steps": [
        {
          "id": "step_1",
          "title": "Step Title",
          "description": "Step description",
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
          ],
          "validation": {...}
        }
      ],
      "navigation": {
        "showProgress": true,
        "allowPrevious": true,
        "saveDraft": true
      }
    }
  ]
}
`;

    super('WizardFormExpert', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Wizard Forms',
        content: 'Creating multi-step wizard forms with progress tracking...'
      });
    }

    const formNodes = workflow?.nodes?.filter(node =>
      node.type === 'startProcess' || node.type === 'userTask'
    ) || [];

    const prompt = `Generate multi-step wizard forms for: "${userRequirements}"

Workflow Nodes:
${JSON.stringify(formNodes, null, 2)}

CRITICAL REQUIREMENTS:

1. Form Structure:
   - Multiple logical steps (3-6 steps)
   - Progress indicator
   - Step-by-step navigation
   - Validation per step
   - Review & submit final step
   - Clear step titles and descriptions

2. MUST INCLUDE Layout Configuration:
   - layout.type: "grid"
   - layout.columns: 1 (single column for wizard clarity)
   - layout.gap: "24px"
   - layout.maxWidth: "600px"
   - layout.padding: "32px"

3. MUST INCLUDE Form-Level Styling:
   - styling.form.padding: "32px"
   - styling.form.maxWidth: "1200px"
   - styling.form.margin: "0 auto"
   - styling.form.backgroundColor: "#ffffff"
   - styling.section with marginBottom, padding, gap
   - styling.buttons with gap and marginTop

4. MUST INCLUDE Field-Level Styling for EVERY field:
   Each field MUST have a "styling" object with:
   - container: { marginBottom: "24px", columnSpan: 1 }
   - label: { fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }
   - input: { height: "40px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#ffffff", fontSize: "14px" }
   - helpText: { fontSize: "13px", color: "#6b7280", marginTop: "6px" }

   For textarea fields: use "minHeight": "100px" instead of "height"
   For full-width fields: set container.columnSpan to "all"

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
        step: 'Wizard Forms Complete',
        content: `Generated ${result.forms?.length || 0} wizard form(s)`
      });
    }

    return result.forms || [];
  }
}

module.exports = WizardFormExpert;
