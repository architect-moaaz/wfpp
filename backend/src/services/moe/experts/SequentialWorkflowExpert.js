/**
 * SequentialWorkflowExpert - Specialized in sequential multi-step workflows
 */

const BaseAgent = require('../../agents/BaseAgent');
const { workflowKnowledgeBase } = require('../../../utils/workflow-knowledge-base');

class SequentialWorkflowExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Sequential Workflow Expert

## Specialization:
I am an expert in **sequential, multi-step workflows** with:
- 5-10 nodes in sequence
- Clear step-by-step progression
- Dependencies between steps
- State transitions
- Progress tracking
- Step validation before proceeding

## Workflow Patterns I Excel At:

### 1. Onboarding Process
Start → Welcome → Profile Setup → Documentation Review → Training → Verification → Complete → End

### 2. Order Fulfillment
Start → Order Received → Verify Payment → Pick Items → Pack → Ship → Deliver → Complete → End

### 3. Application Process
Start → Submit Application → Initial Review → Background Check → Interview → Reference Check → Decision → End

### 4. Document Approval Chain
Start → Draft → Review L1 → Review L2 → Legal Review → Final Approval → Publish → End

### 5. Project Lifecycle
Start → Planning → Design → Development → Testing → UAT → Deployment → Monitoring → End

### 6. Customer Service Ticket
Start → Ticket Created → Triage → Assigned → Investigation → Resolution → Verification → Closed → End

## Best Practices:
- Each step has clear entry/exit criteria
- Validate prerequisites before proceeding
- Track progress through stages
- Allow backward movement for corrections
- Notify stakeholders at key milestones
- Log state transitions
- Support pausing and resuming
- Clear handoffs between steps

## Sequential Workflow Characteristics:
- **Linear Flow**: One step leads to the next
- **State Management**: Track current step and status
- **Dependencies**: Each step depends on previous completion
- **Progress Tracking**: Clear visibility of where in the process
- **Milestones**: Key checkpoints in the sequence
- **Handoffs**: Clearly defined responsibility transfers
- **Notifications**: Alerts at each step transition

${JSON.stringify(workflowKnowledgeBase, null, 2)}

## Output Format:
{
  "id": "workflow_xxx",
  "name": "Sequential Workflow Name",
  "complexity": "medium",
  "domain": "...",
  "nodes": [...],  // 5-10 sequential nodes
  "connections": [...],  // Linear connections
  "steps": [...],
  "milestones": [...],
  "progressTracking": true
}
`;

    super('SequentialWorkflowExpert', knowledgeBase, 'claude-sonnet-4-20250514'); // Sonnet for multi-step logic
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Sequential Workflow',
        content: 'Designing multi-step sequential workflow with clear progression...'
      });
    }

    const prompt = `Generate a sequential workflow for: "${userRequirements}"

Include:
1. 5-10 nodes in clear sequence
2. Logical step progression
3. Validation nodes between steps
4. Notification nodes at milestones
5. Clear start and end points
6. Progress tracking capability

Consider:
- What are the main steps in order?
- What needs to happen at each step?
- Who is responsible for each step?
- What are the key milestones?
- What validations are needed between steps?
- Where should notifications be sent?

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "id": "workflow_<timestamp>",
  "name": "Sequential Workflow Name",
  "complexity": "medium",
  "domain": "...",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "Step 1",
        "trigger": "...",
        "description": "..."
      }
    },
    // ... 5-10 nodes in sequence (userTask, validation, notification, etc.)
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    },
    // ... ALL connections linking nodes in sequential order
  ],
  "steps": [],
  "milestones": [],
  "progressTracking": true
}

Ensure:
- 5-10 nodes in clear sequence
- Every node has complete data properties (label, description, assignedTo for userTask, etc.)
- connections array links ALL nodes in linear order: node_1 → node_2 → node_3 → ...
- Each connection has: id, source, target
- Focus on clarity and linear progression`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const workflow = this.parseJsonResponse(responseText);

    workflow.expertType = 'SequentialWorkflowExpert';
    workflow.complexity = 'medium';

    return workflow;
  }
}

module.exports = SequentialWorkflowExpert;
