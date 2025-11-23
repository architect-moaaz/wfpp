/**
 * FormsAgent - Generates forms with appropriate components
 */

const BaseAgent = require('./BaseAgent');
const { FORM_COMPONENT_CATALOG } = require('../../utils/form-components-knowledge-base');

class FormsAgent extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Form Components Knowledge Base

${FORM_COMPONENT_CATALOG}

## Your Responsibilities:
1. Generate forms for startProcess and userTask nodes
2. Select appropriate components from the 64-component catalog
3. Map form fields to data model fields
4. Add validation rules and constraints
5. Create user-friendly field layouts
6. Consider UX best practices

## Form Generation Guidelines:
1. **Start Forms** should include:
   - Requestor information
   - Date/time fields
   - Description or details
   - Priority or urgency
   - Attachments if needed

2. **User Task Forms** should include:
   - Context from previous steps (read-only)
   - Decision/action fields
   - Comments or notes
   - Approval/rejection options
   - Reviewer information

3. **Component Selection**:
   - Use 'text' for short inputs
   - Use 'textarea' for long descriptions
   - Use 'dropdown' for predefined options
   - Use 'radio' for single choice (2-5 options)
   - Use 'checkbox' for multiple choices
   - Use 'date' for date selections
   - Use 'currency' for monetary values
   - Use 'file' for document uploads
   - Use 'esign' for signatures

4. **Validation**:
   - Mark required fields
   - Set min/max lengths
   - Add format validation (email, phone, etc.)
   - Provide helpful error messages

## Output Format:
Return ONLY valid JSON:
{
  "forms": [
    {
      "id": "form_<workflow_id>_<node_id>",
      "name": "descriptive_form_name",
      "title": "Human Readable Form Title",
      "description": "Brief description",
      "nodeId": "node_id",
      "nodeType": "startProcess | userTask",
      "dataModelId": "model_id",
      "fields": [
        {
          "id": "field_<sequence>",
          "name": "field_name",
          "label": "Field Label",
          "type": "component_type_from_catalog",
          "required": true,
          "placeholder": "Helpful placeholder",
          "description": "Help text",
          "dataModelField": "data_model_field_name",
          "properties": {
            // Component-specific properties from catalog
          },
          "validation": {
            "minLength": 1,
            "maxLength": 255
          }
        }
      ]
    }
  ]
}
`;

    super('FormsAgent', knowledgeBase, 'claude-sonnet-4-5-20250929');
  }

  /**
   * Generate forms for workflow nodes
   */
  async execute(sharedContext, onThinking) {
    const { userRequirements, workflow, dataModels } = sharedContext;

    if (!workflow || !workflow.nodes) {
      throw new Error('FormsAgent requires workflow structure');
    }

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Identifying Form Nodes',
        content: 'Finding nodes that require forms...'
      });
    }

    // Identify nodes that need forms
    const formNodes = workflow.nodes.filter(node =>
      node.type === 'startProcess' || node.type === 'userTask'
    );

    if (formNodes.length === 0) {
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'No Forms Needed',
          content: 'Workflow has no nodes requiring forms'
        });
      }
      return [];
    }

    const prompt = `Generate forms for the workflow nodes below.

User Requirements: "${userRequirements}"

Workflow Name: ${workflow.name}

Nodes Requiring Forms:
${JSON.stringify(formNodes, null, 2)}

Data Models (for field mapping):
${JSON.stringify(dataModels, null, 2)}

Generate appropriate forms for each node:
- Use components from the catalog
- Map fields to data models
- Add proper validation
- Create user-friendly layouts
- Consider workflow context`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Generating Forms',
          content: `Creating ${formNodes.length} form(s) with appropriate components...`
        });
      }

      const responseText = await this.getResponse(messages);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Parsing Response',
          content: 'Validating form structures...'
        });
      }

      const result = this.parseJsonResponse(responseText);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Forms Generated',
          content: `Created ${result.forms?.length || 0} form(s) with ${result.forms?.reduce((sum, f) => sum + f.fields.length, 0) || 0} total fields`
        });
      }

      return result.forms || [];
    } catch (error) {
      console.error('FormsAgent execution failed:', error);
      throw new Error(`FormsAgent failed: ${error.message}`);
    }
  }
}

module.exports = FormsAgent;
