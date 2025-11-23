/**
 * ApprovalWorkflowExpert - Specialized in approval workflows
 */

const BaseAgent = require('../../agents/BaseAgent');
const { workflowKnowledgeBase } = require('../../../utils/workflow-knowledge-base');

class ApprovalWorkflowExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Approval Workflow Expert

## Specialization:
I am an expert in **approval workflows** with deep knowledge of:
- Multi-level approvals (manager, director, VP, etc.)
- Approval delegation
- Rejection handling and re-submission
- Escalation paths
- Approval deadlines and reminders
- Parallel approvals (multiple approvers)
- Conditional routing based on amount/risk

## Approval Patterns I Excel At:

### 1. Single Approval
Start → Submit → Manager Approval → Decision → End

### 2. Multi-Level Approval
Start → Submit → L1 Approval → L2 Approval → L3 Approval → End

### 3. Parallel Approval (All must approve)
Start → Submit → [Manager + Finance + Legal] → Combine → End

### 4. Any Approver (First approval wins)
Start → Submit → [Manager A OR Manager B] → End

### 5. Amount-Based Routing
Start → Submit → Decision(Amount) → {
  < $1000: Auto-Approve
  $1000-$5000: Manager
  $5000-$10000: Director
  > $10000: VP + CFO
}

### 6. Rejection Handling
Approve → End
Reject → Notification → Resubmit → Approval (loop)

## Best Practices:
- Always include rejection path
- Add notifications at key points
- Include re-submission capability
- Set approval deadlines
- Log all approval decisions
- Support delegation

${JSON.stringify(workflowKnowledgeBase, null, 2)}

## Output Format:
{
  "id": "workflow_xxx",
  "name": "Approval Workflow Name",
  "complexity": "medium",
  "domain": "approval",
  "nodes": [...],
  "connections": [...],
  "approvalLevels": number,
  "escalationPath": boolean
}
`;

    super('ApprovalWorkflowExpert', knowledgeBase, 'claude-sonnet-4-20250514'); // Sonnet for approval logic
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Approval Workflow',
        content: 'Designing approval structure with decision logic and escalation paths...'
      });
    }

    const prompt = `Generate an approval workflow for: "${userRequirements}"

Include:
1. Submission node with form
2. Appropriate approval levels
3. Decision/branching logic
4. Rejection handling and re-submission
5. Notifications at key points
6. Approval deadlines (if applicable)

Consider:
- Who needs to approve?
- Are there approval thresholds?
- What happens on rejection?
- Any escalation paths?

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "id": "workflow_<timestamp>",
  "name": "Approval Workflow Name",
  "complexity": "medium",
  "domain": "approval",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "Submit Request",
        "trigger": "Form Submission",
        "description": "...",
        "formName": "..."
      }
    },
    // ... more nodes including userTask for approval, decision for approval/reject, notification, etc.
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    },
    // ... ALL connections including approval branches (approved/rejected paths)
  ],
  "approvalLevels": 1,
  "escalationPath": false
}

Ensure:
- Every node has complete data properties (label, description, assignedTo for userTask, etc.)
- connections array includes ALL paths (main flow + decision branches)
- Decision nodes have multiple outgoing connections for different outcomes
- Each connection has: id, source, target, and optionally: label, condition
- For decision nodes: One connection MUST have "isDefault": true as fallback path
- Conditions should reference actual form field names (e.g., processData.fieldName === "value")`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const workflow = this.parseJsonResponse(responseText);

    workflow.expertType = 'ApprovalWorkflowExpert';
    workflow.domain = 'approval';

    return workflow;
  }
}

module.exports = ApprovalWorkflowExpert;
