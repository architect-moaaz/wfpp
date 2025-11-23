/**
 * ComplexWorkflowExpert - Specialized in complex workflows with branching and parallel paths
 */

const BaseAgent = require('../../agents/BaseAgent');
const { workflowKnowledgeBase } = require('../../../utils/workflow-knowledge-base');

class ComplexWorkflowExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Complex Workflow Expert

## Specialization:
I am an expert in generating **complex workflows** with:
- 10+ nodes
- Multiple branching paths (decision nodes)
- Parallel execution paths
- Sub-workflows and nested processes
- Error handling and compensation
- Complex routing logic
- Event-driven triggers

## Workflow Patterns I Excel At:

### 1. Multi-Path Decision Workflows
Start → Gather Data → Decision → {
  Path A: Complex Processing → Result A
  Path B: Alternative Processing → Result B
  Path C: Fallback → Result C
} → Merge → End

### 2. Parallel Processing
Start → Split → [Process A, Process B, Process C] → Join → End

### 3. Sub-Workflow Integration
Main: Start → Task 1 → Call Sub-Workflow → Task 2 → End
Sub: Start → Sub-Tasks → Return

### 4. Event-Driven Complex Flow
Start → Wait for Event → Timer → Decision → {
  Timeout: Escalate
  Success: Continue
  Error: Compensate
} → End

### 5. Nested Loops with Conditions
Start → Loop {
  Process Item → Decision {
    Continue: Next Iteration
    Break: Exit Loop
    Error: Handle Error
  }
} → End

## Best Practices:
- Use clear naming for decision branches
- Add error handling at key points
- Include timeout mechanisms
- Document complex routing logic
- Use parallel gateways for independent paths
- Add compensation/rollback for failures
- Keep nesting depth reasonable (max 3 levels)

## Advanced Features:
- **Parallel Gateways**: AND splits and joins
- **Exclusive Gateways**: OR decisions based on conditions
- **Event-Based Gateways**: Wait for multiple possible events
- **Compensation**: Rollback/undo mechanisms
- **Escalation**: Timeout handling and escalation paths
- **Sub-Processes**: Reusable workflow components

${JSON.stringify(workflowKnowledgeBase, null, 2)}

## Output Format:
{
  "id": "workflow_xxx",
  "name": "Complex Workflow Name",
  "complexity": "complex",
  "domain": "...",
  "nodes": [...],  // 10+ nodes
  "connections": [...],
  "parallelPaths": number,
  "decisionPoints": number,
  "errorHandlers": number,
  "subWorkflows": [...]
}
`;

    super('ComplexWorkflowExpert', knowledgeBase, 'claude-sonnet-4-20250514'); // Sonnet for complex logic
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Complex Workflow',
        content: 'Designing sophisticated workflow with branching, parallel paths, and error handling...'
      });
    }

    const prompt = `Generate a complex workflow for: "${userRequirements}"

Include:
1. 10+ nodes with clear structure
2. Multiple decision points with branching logic
3. Parallel execution paths where appropriate
4. Error handling and compensation
5. Clear connection flow
6. Proper start and end events

Consider:
- What are the main decision points?
- Which tasks can run in parallel?
- Where is error handling needed?
- Are there timeout scenarios?
- Should there be escalation paths?

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "id": "workflow_<timestamp>",
  "name": "Complex Workflow Name",
  "complexity": "complex",
  "domain": "...",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "...",
        "trigger": "...",
        "description": "..."
      }
    },
    // ... 10+ nodes with decision, parallel, error handling nodes
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    },
    // ... ALL connections including decision branches, parallel paths, error paths
  ],
  "parallelPaths": 0,
  "decisionPoints": 0,
  "errorHandlers": 0
}

Ensure:
- 10+ nodes minimum
- Every node has complete data properties
- connections array includes ALL flow paths (main, branches, parallel, error)
- Decision nodes have multiple outgoing connections
- For exclusive decision nodes: One connection MUST have "isDefault": true as fallback path
- Conditions should reference actual form field names (e.g., processData.fieldName === "value")
- Parallel decision nodes connect to multiple tasks that then merge
- Each connection has: id, source, target, and optionally: label, condition, isDefault
- Make it sophisticated but maintainable`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const workflow = this.parseJsonResponse(responseText);

    workflow.expertType = 'ComplexWorkflowExpert';
    workflow.complexity = 'complex';

    return workflow;
  }
}

module.exports = ComplexWorkflowExpert;
