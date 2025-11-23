/**
 * SimpleFormExpert - Specialized in simple forms with basic components
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');

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
      "fields": [...]  // 3-7 fields
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

Create simple forms with:
1. 3-7 fields maximum
2. Basic components (text, textarea, dropdown, date)
3. Simple validation only
4. Clear, straightforward layout
5. One form per node

CRITICAL: Each form MUST include a "nodeId" field matching one of the node IDs from the workflow nodes above.

Example:
{
  "forms": [
    {
      "id": "form_001",
      "name": "leave_request_form",
      "title": "Leave Request Form",
      "description": "Submit your leave request",
      "nodeId": "node_1",  // MUST match a node ID from above
      "complexity": "simple",
      "fields": [
        {
          "id": "field_1",
          "name": "startDate",
          "label": "Start Date",
          "type": "date",
          "required": true
        }
      ]
    }
  ]
}

Return ONLY valid JSON with the forms array.`;

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
