/**
 * MobileFormExpert - Specialized in mobile-optimized forms
 */

const BaseAgent = require('../../agents/BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../../utils/form-components-knowledge-base');

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
      "layout": "single-column",
      "fields": [...],  // Mobile-friendly fields
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

Create mobile-first forms with:
1. Single-column layout
2. Large touch targets
3. Mobile-friendly components (dropdown, toggle, camera, location)
4. Minimal text input
5. Progressive disclosure
6. Device capability integration

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
        step: 'Mobile Forms Complete',
        content: `Generated ${result.forms?.length || 0} mobile-optimized form(s)`
      });
    }

    return result.forms || [];
  }
}

module.exports = MobileFormExpert;
