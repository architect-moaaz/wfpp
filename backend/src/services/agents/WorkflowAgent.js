/**
 * WorkflowAgent - Generates workflow structure (nodes and connections)
 */

const BaseAgent = require('./BaseAgent');
const { workflowKnowledgeBase } = require('../../utils/workflow-knowledge-base');

class WorkflowAgent extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Workflow Components Knowledge Base

${JSON.stringify(workflowKnowledgeBase, null, 2)}

## Your Responsibilities:
1. Analyze user requirements to determine workflow type
2. Select appropriate workflow pattern (approval, sequential, parallel, etc.)
3. Create workflow nodes with proper types:
   - startProcess: Workflow initiation
   - endEvent: Workflow completion
   - userTask: Manual human tasks
   - scriptTask: Automated tasks (MUST include executable JavaScript in "script" field)
   - decision: Branching logic
   - notification: Send notifications
   - validation: Data validation
   - dataProcess: Data processing
4. Connect nodes with proper flow logic
5. Add conditions to decision nodes
6. Ensure BPMN compliance

## CRITICAL - Script Task Requirements:
For scriptTask nodes, you MUST include valid, executable JavaScript code in the "script" field:
- The script field must contain actual JavaScript code that can be executed
- Use 'processData' object to read and modify workflow data
- Example: "script": "processData.category = 'approved';\\nprocessData.timestamp = new Date().toISOString();"
- DO NOT use descriptions or pseudo-code - only valid JavaScript
- Common patterns:
  * Set values: processData.fieldName = 'value';
  * Read values: const value = processData.fieldName;
  * Conditionals: if (processData.amount > 1000) { processData.requiresApproval = true; }
  * Calculations: processData.total = processData.price * processData.quantity;
- Always end statements with semicolons
- Use \\n for line breaks in the JSON string

## Output Format:
Return ONLY valid JSON:
{
  "id": "workflow_<timestamp>",
  "name": "Descriptive Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Start",
        "description": "...",
        "requiresForm": true
      }
    }
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "type": "smoothstep",
      "label": "condition (optional)"
    }
  ]
}
`;

    super('WorkflowAgent', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  /**
   * Generate workflow structure
   */
  async execute(sharedContext, onThinking) {
    const { userRequirements, conversationHistory, existingWorkflow } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Analyzing Requirements',
        content: `Determining optimal workflow structure for: "${userRequirements}"`
      });
    }

    const prompt = existingWorkflow
      ? `Modify the existing workflow based on this request: "${userRequirements}"

Existing Workflow:
${JSON.stringify(existingWorkflow, null, 2)}

Apply the requested changes while maintaining workflow integrity.`
      : `Generate a workflow for: "${userRequirements}"

Consider:
- Workflow type and complexity
- Required steps and decision points
- User interactions vs automated tasks
- Error handling and notifications`;

    // Build messages with conversation history
    const messages = [];

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Generating Workflow',
          content: 'Creating workflow nodes and connections...'
        });
      }

      const responseText = await this.streamResponse(messages, (chunk) => {
        // Stream chunks for real-time display
      });

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Parsing Response',
          content: 'Converting AI response to workflow structure...'
        });
      }

      const workflow = this.parseJsonResponse(responseText);

      if (onThinking) {
        onThinking({
          agent: this.name,
          step: 'Workflow Generated',
          content: `Created workflow with ${workflow.nodes?.length || 0} nodes and ${workflow.connections?.length || 0} connections`
        });
      }

      return workflow;
    } catch (error) {
      console.error('WorkflowAgent execution failed:', error);
      throw new Error(`WorkflowAgent failed: ${error.message}`);
    }
  }
}

module.exports = WorkflowAgent;
