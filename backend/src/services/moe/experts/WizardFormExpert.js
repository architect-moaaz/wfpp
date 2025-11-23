/**
 * WizardFormExpert - Specialized in multi-step wizard forms
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');

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
      "steps": [
        {
          "id": "step_1",
          "title": "Step Title",
          "description": "Step description",
          "fields": [...],
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

Create wizard forms with:
1. Multiple logical steps (3-6 steps)
2. Progress indicator
3. Step-by-step navigation
4. Validation per step
5. Review & submit final step
6. Clear step titles and descriptions

Return ONLY valid JSON.`;

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
