/**
 * AdvancedFormExpert - Specialized in complex forms with advanced components
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');

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
      "sections": [...],  // Multiple sections
      "fields": [...],    // 8+ fields
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

Create advanced forms with:
1. 8+ fields with complex interactions
2. Advanced components (file, esign, richtext, currency, etc.)
3. Complex validation and conditional logic
4. Multi-section organization
5. Calculated fields where appropriate

CRITICAL: Each form MUST include a "nodeId" field matching one of the node IDs from the workflow nodes above. This is essential for linking forms to workflow steps.

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
        step: 'Advanced Forms Complete',
        content: `Generated ${result.forms?.length || 0} advanced form(s)`
      });
    }

    return result.forms || [];
  }
}

module.exports = AdvancedFormExpert;
