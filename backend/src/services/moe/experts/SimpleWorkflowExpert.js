/**
 * SimpleWorkflowExpert - Specialized in simple, linear workflows
 */

const BaseAgent = require('../../agents/BaseAgent');
const { workflowKnowledgeBase } = require('../../../utils/workflow-knowledge-base');

class SimpleWorkflowExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Simple Workflow Expert

## Specialization:
I am an expert in generating **simple, linear workflows** with:
- 2-5 nodes
- Single execution path (no branching)
- Sequential processing
- Basic start → tasks → end pattern

## Workflow Patterns I Excel At:
1. **Linear Request → Approval**
   Start → Submit Request → Manager Review → End

2. **Simple Data Collection**
   Start → Collect Data → Save → Notification → End

3. **Basic Notification Flow**
   Start → Trigger Event → Send Notification → End

## My Approach:
- Keep it simple and straightforward
- Minimize decision points
- Clear, linear flow
- Easy to understand and maintain

${JSON.stringify(workflowKnowledgeBase, null, 2)}

## Output Format:
{
  "id": "workflow_xxx",
  "name": "Simple Workflow Name",
  "complexity": "simple",
  "nodes": [...],
  "connections": [...]
}
`;

    super('SimpleWorkflowExpert', knowledgeBase, 'claude-haiku-4-5-20251001'); // Fast model for simple tasks
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Simple Workflow',
        content: 'Creating streamlined, linear workflow structure...'
      });
    }

    const prompt = `Generate a simple, linear workflow for: "${userRequirements}"

Keep it simple:
- 2-5 nodes maximum
- No branching or parallel paths
- Clear sequential flow
- Start → Tasks → End

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "id": "workflow_<timestamp>",
  "name": "Workflow Name",
  "complexity": "simple",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "Start Process",
        "trigger": "...",
        "description": "..."
      }
    },
    // ... more nodes
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    },
    // ... more connections linking ALL nodes in sequence
  ]
}

Ensure:
- Every node has complete data properties (label, description, etc.)
- connections array links ALL nodes in the flow
- Each connection has: id, source, target
- Sequential flow: node_1 → node_2 → node_3 → ...`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const workflow = this.parseJsonResponse(responseText);

    workflow.expertType = 'SimpleWorkflowExpert';
    workflow.complexity = 'simple';

    return workflow;
  }
}

module.exports = SimpleWorkflowExpert;
