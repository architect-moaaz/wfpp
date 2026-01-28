/**
 * Workflow Expert
 * Generates workflows individually or in batches
 */

const Anthropic = require('@anthropic-ai/sdk');

class WorkflowExpert {
  constructor() {
    this.name = 'WorkflowExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.organizationContext = null;
  }

  /**
   * Set organization context for task assignment
   * @param {Object} orgContext - Organization details (roles, groups, departments, positions)
   */
  setOrganizationContext(orgContext) {
    this.organizationContext = orgContext;
    if (orgContext) {
      console.log(`[WorkflowExpert] Organization context set: ${orgContext.roles?.length || 0} roles, ${orgContext.groups?.length || 0} groups`);
    }
  }

  /**
   * Format organization context for AI prompts
   */
  formatOrganizationContext() {
    if (!this.organizationContext) {
      return this.getNoOrgContextInstructions();
    }

    const { roles, groups, departments, positions } = this.organizationContext;
    let context = `
## ORGANIZATION CONTEXT (Use for Human Task Assignments)
You have access to the following organizational data. Use it to intelligently assign Human Tasks.

`;

    if (roles && roles.length > 0) {
      context += `### Available Roles:
${roles.map(r => `- "${r.name}" (${r.description || 'No description'})`).join('\n')}

`;
    }

    if (groups && groups.length > 0) {
      context += `### Available Groups:
${groups.map(g => `- "${g.name}" (${g.description || g.memberCount + ' members' || 'Team group'})`).join('\n')}

`;
    }

    if (departments && departments.length > 0) {
      context += `### Departments:
${departments.map(d => `- "${d.name}" ${d.headPosition ? '(has department head)' : ''}`).join('\n')}

`;
    }

    context += `### Assignment Guidelines:
- For approval tasks: Use assignmentType "manager" or "role" with appropriate role
- For team tasks: Use assignmentType "group" with relevant group name
- For specific expertise: Use assignmentType "role" with the specialist role
- For data entry by requester: Use assignmentType "expression" with "processData.initiator"
- For open tasks anyone can do: Use assignmentType "unassigned" with openToAll: true

`;

    return context;
  }

  /**
   * Instructions when no organization context is available
   */
  getNoOrgContextInstructions() {
    return `
## TASK ASSIGNMENT (No Organization Data Available)
Since no organization data is available, use these fallback patterns:

### Assignment Strategy:
- First task (entry point): Use assignmentType "unassigned" with openToAll: true and captureInitiator: true
- Follow-up tasks by same person: Use assignmentType "expression" with assigneeExpression "processData.initiator"
- Approval tasks: Use assignmentType "role" with placeholder role like "Approver" or "Manager"
- Review tasks: Use assignmentType "role" with placeholder role like "Reviewer"

### Example Node Data:
{
  "type": "userTask",
  "data": {
    "label": "Submit Request",
    "assignmentType": "unassigned",
    "openToAll": true,
    "captureInitiator": true
  }
}

{
  "type": "userTask",
  "data": {
    "label": "Provide Additional Info",
    "assignmentType": "expression",
    "assigneeExpression": "processData.initiator"
  }
}

`;
  }

  /**
   * Check if error is a network/connection error that should trigger retry
   */
  isNetworkError(error) {
    const networkErrorCodes = [
      'ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
      'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN',
      'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ];
    const errorCode = error.code || error.cause?.code;
    if (errorCode && networkErrorCodes.includes(errorCode)) return true;
    if (error.name === 'APIConnectionError' ||
        error.message?.includes('Connection error') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) return true;
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute API call with network retry and exponential backoff
   */
  async executeWithNetworkRetry(apiCall, maxRetries = 3, baseDelayMs = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        if (this.isNetworkError(error)) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`[${this.name}] Network error on attempt ${attempt}/${maxRetries}: ${error.message}`);
          if (attempt < maxRetries) {
            console.log(`[${this.name}] Retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            console.error(`[${this.name}] All ${maxRetries} network retry attempts failed`);
          }
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate a single workflow
   */
  async generateSingle(spec, componentPlan, existingComponents, workflowConnections = []) {
    console.log(`[WorkflowExpert] Generating workflow: ${spec.name}...`);

    // Find sub-workflows this workflow should call based on connections
    const subWorkflowCalls = workflowConnections
      .filter(conn => conn.source === spec.name && conn.via === 'direct_call')
      .map(conn => conn.target);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents, subWorkflowCalls);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const workflowText = response.content[0].text;
    let workflow = this.parseWorkflow(workflowText);

    // Post-process to ensure subWorkflow nodes have targetWorkflow set
    workflow = this.linkSubWorkflowNodes(workflow, spec.name, workflowConnections);

    console.log(`[WorkflowExpert] Generated workflow: ${workflow.name}`);
    return workflow;
  }

  /**
   * Generate multiple workflows in one call (for parallel strategy)
   * @param {Array} specs - Workflow specifications
   * @param {Object} componentPlan - Full component plan including workflowConnections
   */
  async generateBatch(specs, componentPlan) {
    if (specs.length === 0) return [];

    // Extract workflow connections from component plan
    const workflowConnections = componentPlan.workflowConnections || [];

    if (specs.length === 1) {
      return [await this.generateSingle(specs[0], componentPlan, {}, workflowConnections)];
    }

    console.log(`[WorkflowExpert] Generating ${specs.length} workflows in batch...`);
    if (workflowConnections.length > 0) {
      console.log(`[WorkflowExpert] Found ${workflowConnections.length} workflow connections to process`);
    }

    // For many workflows, generate individually to ensure uniqueness
    if (specs.length > 5) {
      console.log(`[WorkflowExpert] Too many workflows for batch (${specs.length}), generating individually...`);
      const workflows = [];
      for (let i = 0; i < specs.length; i++) {
        console.log(`[WorkflowExpert] Generating workflow ${i + 1}/${specs.length}: ${specs[i].name}`);
        const wf = await this.generateSingle(specs[i], componentPlan, { workflows }, workflowConnections);
        workflows.push(wf);
      }
      return workflows;
    }

    const prompt = this.buildBatchPrompt(specs, componentPlan);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 12000, // Increased for multiple workflows
        temperature: 0.6, // Increased from 0.3 to encourage diversity
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const workflowsText = response.content[0].text;
    let workflows = this.parseWorkflows(workflowsText);

    // Verify we got unique workflows - if not, regenerate individually
    if (this.haseDuplicateWorkflows(workflows)) {
      console.warn(`[WorkflowExpert] Detected duplicate workflows in batch, regenerating individually...`);
      const uniqueWorkflows = [];
      for (let i = 0; i < specs.length; i++) {
        console.log(`[WorkflowExpert] Regenerating workflow ${i + 1}/${specs.length}: ${specs[i].name}`);
        const wf = await this.generateSingle(specs[i], componentPlan, { workflows: uniqueWorkflows }, workflowConnections);
        uniqueWorkflows.push(wf);
      }
      return uniqueWorkflows;
    }

    // Post-process all workflows to link subWorkflow nodes
    workflows = workflows.map((wf, index) => {
      const specName = specs[index]?.name || wf.name;
      return this.linkSubWorkflowNodes(wf, specName, workflowConnections);
    });

    console.log(`[WorkflowExpert] Generated ${workflows.length} unique workflows`);
    return workflows;
  }

  /**
   * Check if workflows array has duplicates (same structure/node types)
   */
  haseDuplicateWorkflows(workflows) {
    if (!workflows || workflows.length < 2) return false;

    const signatures = workflows.map(wf => {
      if (!wf.nodes) return 'empty';
      // Create a signature from node types in order
      const nodeTypes = wf.nodes.map(n => n.type).sort().join(',');
      return nodeTypes;
    });

    const uniqueSignatures = new Set(signatures);
    const hasDuplicates = uniqueSignatures.size < signatures.length;

    if (hasDuplicates) {
      console.log(`[WorkflowExpert] Workflow signatures: ${signatures.join(' | ')}`);
      console.log(`[WorkflowExpert] Unique: ${uniqueSignatures.size}, Total: ${signatures.length}`);
    }

    return hasDuplicates;
  }

  /**
   * Link subWorkflow nodes to their target workflows based on connections
   * Also sets up input/output mapping hints
   */
  linkSubWorkflowNodes(workflow, workflowName, workflowConnections) {
    if (!workflow || !workflow.nodes || workflowConnections.length === 0) {
      return workflow;
    }

    // Find what sub-workflows this workflow should call
    const subWorkflowCalls = workflowConnections
      .filter(conn => conn.source === workflowName && conn.via === 'direct_call')
      .map(conn => conn.target);

    if (subWorkflowCalls.length === 0) {
      return workflow;
    }

    console.log(`[WorkflowExpert] Linking subWorkflow nodes for "${workflowName}" -> ${subWorkflowCalls.join(', ')}`);

    // Find all subWorkflow nodes and assign targets
    let subWorkflowIndex = 0;
    workflow.nodes = workflow.nodes.map(node => {
      if (node.type === 'subWorkflow') {
        // Assign target workflow - use node label matching or sequential assignment
        let targetWorkflow = null;

        // Try to match by label first
        const nodeLabel = (node.label || node.data?.label || '').toLowerCase();
        targetWorkflow = subWorkflowCalls.find(target =>
          nodeLabel.includes(target.toLowerCase()) ||
          target.toLowerCase().includes(nodeLabel.replace(/\s+/g, ''))
        );

        // If no match, assign sequentially
        if (!targetWorkflow && subWorkflowIndex < subWorkflowCalls.length) {
          targetWorkflow = subWorkflowCalls[subWorkflowIndex];
          subWorkflowIndex++;
        }

        if (targetWorkflow) {
          node.data = node.data || {};
          node.data.targetWorkflow = targetWorkflow;
          node.data.async = false; // Default to synchronous

          // Add basic input/output mapping hints
          node.data.inputMapping = node.data.inputMapping || '';
          node.data.outputMapping = node.data.outputMapping || '';

          console.log(`[WorkflowExpert] Linked subWorkflow node "${node.id}" -> "${targetWorkflow}"`);
        }
      }
      return node;
    });

    // Store which sub-workflows this workflow calls
    workflow.callsSubWorkflows = subWorkflowCalls;

    return workflow;
  }

  buildSinglePrompt(spec, componentPlan, existingComponents, subWorkflowCalls = []) {
    // Build sub-workflow requirement section if needed
    let subWorkflowSection = '';
    if (subWorkflowCalls.length > 0) {
      subWorkflowSection = `
SUB-WORKFLOW CALLS REQUIRED:
This workflow MUST include subWorkflow nodes to call these workflows:
${subWorkflowCalls.map(sw => `- "${sw}" - Use a subWorkflow node type to call this workflow`).join('\n')}

When creating subWorkflow nodes:
- Use type: "subWorkflow"
- Set a descriptive label indicating which workflow is being called
- Position them appropriately in the flow
`;
    }

    // Get organization context for task assignment
    const orgContext = this.formatOrganizationContext();

    return `Generate a workflow for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}
${subWorkflowSection}

Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Existing data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}
${existingComponents.forms ? `- Existing forms: ${existingComponents.forms.map(f => f.name).join(', ')}` : ''}

${orgContext}

CRITICAL Requirements:
- MUST include a startProcess node as the first node
- MUST include an endProcess node as the last node
- Include 3-10 nodes that accurately represent the workflow logic
- Create logical flow with proper connections between ALL nodes
- Each node MUST connect to the next via edges
- For decision nodes: ONE outgoing edge MUST have "isDefault": true
- ALL userTask nodes MUST include assignment information (assignmentType + related fields)

Node Types Available (USE THESE EXACT TYPES):
- startProcess: REQUIRED as first node - workflow trigger/entry point
- endEvent: REQUIRED as last node - workflow completion
- userTask: Human task requiring user interaction (forms, approvals, reviews) - MUST include assignment
- scriptTask: Automated script/code execution
- timerEvent: Time-based delays or scheduled triggers
- decision: Conditional branching with multiple paths (MUST have isDefault on one edge)
- validation: Data validation step - checks data integrity/business rules
- notification: Send notifications (email, SMS, push)
- dataProcess: Data transformation/processing operations
- llmTask: AI/LLM-powered task (text generation, analysis, classification)
- subWorkflow: Call another workflow as a sub-process
- restApi: External REST API call - integrations with external systems

## HUMAN TASK ASSIGNMENT (CRITICAL):
Every userTask node MUST include assignment information in its data object:

Assignment Types:
- "unassigned" + openToAll: true - Anyone can complete (use for first task to capture initiator)
- "user" + assignee - Specific user (use process variable like "processData.initiator")
- "role" + assigneeRole - Any user with that role can complete directly
- "group" + assigneeGroup + escalationTimeout - Group members notified, first to claim completes
- "manager" - Assigned to workflow initiator's manager
- "expression" + assigneeExpression - Dynamic assignment from process data

userTask Node Example:
{
  "id": "userTask-1",
  "type": "userTask",
  "label": "Manager Approval",
  "position": { "x": 250, "y": 100 },
  "data": {
    "label": "Manager Approval",
    "description": "Manager reviews and approves the request",
    "assignmentType": "manager",
    "priority": "high",
    "dueDuration": "24h"
  }
}

Group Task Example:
{
  "id": "userTask-2",
  "type": "userTask",
  "label": "Finance Review",
  "position": { "x": 400, "y": 100 },
  "data": {
    "label": "Finance Review",
    "description": "Finance team reviews the expense",
    "assignmentType": "group",
    "assigneeGroup": "Finance Team",
    "escalationTimeout": "24h",
    "priority": "medium"
  }
}

Workflow Complexity Guidelines:
- Match complexity to the requirement - simple tasks = linear, complex logic = branching
- Use decision nodes when there are conditional paths (approval/rejection, validation pass/fail)
- Use userTask for ANY step requiring human intervention (approvals, reviews, data entry)
- Use validation when data needs to be checked against rules
- Use notification to inform users of status changes
- Use restApi for external system integrations
- Use llmTask when AI processing is needed (classification, generation, analysis)
- Use timerEvent for delays, scheduling, or timeout handling
- Use subWorkflow to break complex processes into manageable sub-processes
- Create realistic business workflows that mirror actual process logic

INPUT VARIABLES:
Define the required input data for this workflow to execute. Think about:
- What data is needed to START this workflow?
- What information must the user/system provide?
- What are the required vs optional inputs?

Return ONLY valid JSON in this format:
{
  "id": "unique-id",
  "name": "${spec.name}",
  "description": "Brief description of what this workflow does",
  "inputVariables": [
    {
      "id": "var_1",
      "name": "variableName",
      "type": "string|number|boolean|date|object|array",
      "required": true,
      "defaultValue": "",
      "description": "What this variable is for"
    }
  ],
  "nodes": [
    {
      "id": "start-1",
      "type": "startProcess",
      "label": "Start",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Start", "description": "Process start" }
    },
    {
      "id": "userTask-1",
      "type": "userTask",
      "label": "Submit Request",
      "position": { "x": 250, "y": 100 },
      "data": {
        "label": "Submit Request",
        "description": "User submits initial request",
        "assignmentType": "unassigned",
        "openToAll": true,
        "captureInitiator": true
      }
    },
    {
      "id": "userTask-2",
      "type": "userTask",
      "label": "Review Request",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "Review Request",
        "description": "Manager reviews the submitted request",
        "assignmentType": "manager",
        "priority": "high"
      }
    },
    {
      "id": "end-1",
      "type": "endEvent",
      "label": "End",
      "position": { "x": 550, "y": 100 },
      "data": { "label": "End", "description": "Process complete" }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "start-1", "target": "userTask-1" },
    { "id": "edge-2", "source": "userTask-1", "target": "userTask-2" },
    { "id": "edge-3", "source": "userTask-2", "target": "end-1" }
  ],
  "metadata": {
    "category": "automation|approval|data-processing|user-interaction",
    "complexity": "simple|medium|complex"
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan) {
    const workflowConnections = componentPlan.workflowConnections || [];

    // Get organization context for task assignment
    const orgContext = this.formatOrganizationContext();

    // Build detailed spec descriptions with sub-workflow requirements
    const detailedSpecs = specs.map((s, index) => {
      // Find sub-workflows this workflow should call
      const subWorkflowCalls = workflowConnections
        .filter(conn => conn.source === s.name && conn.via === 'direct_call')
        .map(conn => conn.target);

      let subWorkflowNote = '';
      if (subWorkflowCalls.length > 0) {
        subWorkflowNote = `\n- MUST CALL sub-workflows: ${subWorkflowCalls.join(', ')} (use subWorkflow node type)`;
      }

      return `
### Workflow ${index + 1}: "${s.name}"
- Purpose: ${s.purpose || 'Process automation'}
- Unique ID: wf_${index + 1}_${Date.now()}
- Description: ${s.description || s.purpose || 'Automated workflow for ' + s.name}${subWorkflowNote}`;
    }).join('\n');

    // Build workflow connections section
    let connectionsSection = '';
    if (workflowConnections.length > 0) {
      connectionsSection = `
## WORKFLOW CONNECTIONS:
These workflows need to communicate with each other:
${workflowConnections.map(conn => {
  if (conn.via === 'direct_call') {
    return `- "${conn.source}" CALLS "${conn.target}" directly (use subWorkflow node)`;
  } else if (conn.via === 'event') {
    return `- "${conn.source}" triggers "${conn.target}" via event "${conn.event}"`;
  }
  return `- "${conn.source}" -> "${conn.target}" via ${conn.via}`;
}).join('\n')}

When a workflow calls another via direct_call, include a subWorkflow node type in the calling workflow.
`;
    }

    return `Generate ${specs.length} UNIQUE and DIFFERENT workflows for: ${componentPlan.overview.name}

## Workflows to Generate:
${detailedSpecs}
${connectionsSection}
${orgContext}

## CRITICAL Requirements:
1. ANALYZE each workflow's purpose and design the OPTIMAL flow to accomplish that task
2. Each workflow MUST be structurally different based on its unique requirements
3. Each workflow MUST have a unique ID (use the provided unique IDs)
4. MUST include startProcess as first node and endProcess as last node
5. Include appropriate nodes based on what the task actually requires
6. For decision nodes: ONE outgoing edge MUST have "isDefault": true
7. ALL userTask nodes MUST include assignment information (assignmentType + related fields)
8. Think about: What steps are needed? What decisions must be made? Who needs to be involved?

## Node Types Available (USE THESE EXACT TYPES):
- startProcess: Process entry point - REQUIRED first node
- endEvent: Process completion - REQUIRED last node
- userTask: Human task requiring user interaction (forms, approvals, reviews, data entry) - MUST include assignment
- scriptTask: Automated script/code execution
- timerEvent: Time-based delays or scheduled triggers
- decision: Conditional branching (REQUIRES isDefault on one edge)
- validation: Data validation - checks data integrity/business rules
- notification: Send notifications (email, SMS, push)
- dataProcess: Data transformation/processing operations
- llmTask: AI/LLM-powered task (text generation, analysis, classification)
- subWorkflow: Call another workflow as a sub-process
- restApi: External REST API call - integrations with external systems

## HUMAN TASK ASSIGNMENT (CRITICAL):
Every userTask node MUST include assignment information in its data object:

Assignment Types:
- "unassigned" + openToAll: true - Anyone can complete (use for first task to capture initiator)
- "user" + assignee - Specific user (use process variable like "processData.initiator")
- "role" + assigneeRole - Any user with that role can complete directly
- "group" + assigneeGroup + escalationTimeout - Group members notified, first to claim completes
- "manager" - Assigned to workflow initiator's manager
- "expression" + assigneeExpression - Dynamic assignment from process data

Example userTask with assignment:
{
  "type": "userTask",
  "data": {
    "label": "Manager Approval",
    "assignmentType": "manager",
    "priority": "high",
    "dueDuration": "24h"
  }
}

## Design Principles:
- Simple tasks need simple flows (3-5 nodes)
- Complex tasks need branching, decisions, error handling (6-12 nodes)
- Use decision nodes when outcomes can vary (approval/rejection, pass/fail)
- Use userTask when human judgment or interaction is needed
- Use restApi for external system integrations
- Use llmTask when AI processing adds value (classification, generation)
- Use notification to inform users of status changes or outcomes
- Use validation to verify data before processing
- Use timerEvent for delays or scheduled operations

## Input Variables:
Each workflow MUST define its required input variables - the data needed to START the workflow.
Think: What information must be provided when this workflow is triggered?

Return ONLY a valid JSON array with ${specs.length} workflows:
[
  {
    "id": "unique_id",
    "name": "WorkflowName",
    "description": "What this workflow accomplishes",
    "inputVariables": [
      { "id": "var_1", "name": "variableName", "type": "string", "required": true, "defaultValue": "", "description": "Purpose of this variable" }
    ],
    "nodes": [/* nodes with proper assignment for userTasks */],
    "edges": [/* connections that make logical sense for the flow */],
    "metadata": { "category": "type", "complexity": "simple|medium|complex" }
  }
]

IMPORTANT:
- Let the PURPOSE drive the DESIGN - don't use templates
- Each workflow should be the optimal solution for its specific task
- ALL userTask nodes MUST have assignmentType and related fields
- Do NOT generate duplicate structures`;
  }

  parseWorkflow(text) {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON object
      if (!jsonText.startsWith('{')) {
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Try to repair common JSON issues
      jsonText = this.repairJson(jsonText);

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[WorkflowExpert] Parse error:', error);
      console.error('[WorkflowExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[WorkflowExpert] Returning fallback workflow');
      return this.createFallbackWorkflow();
    }
  }

  parseWorkflows(text) {
    try {
      let jsonText = text.trim();
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Find JSON array
      if (!jsonText.startsWith('[')) {
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonText = jsonMatch[0];
      }

      // Try to repair common JSON issues
      jsonText = this.repairJson(jsonText);
      // Balance array brackets
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        jsonText += ']'.repeat(openBrackets - closeBrackets);
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[WorkflowExpert] Parse error:', error);
      console.error('[WorkflowExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[WorkflowExpert] Returning fallback workflows array');
      return [this.createFallbackWorkflow()];
    }
  }

  /**
   * Repair common JSON issues
   */
  repairJson(jsonStr) {
    let repaired = jsonStr;
    // Remove trailing commas
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
    // Fix missing commas between objects
    repaired = repaired.replace(/\}(\s*)\{/g, '},$1{');
    // Balance brackets
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }
    return repaired;
  }

  /**
   * Create fallback workflow when parsing fails
   */
  createFallbackWorkflow() {
    return {
      id: `wf_fallback_${Date.now()}`,
      name: 'GeneratedWorkflow',
      description: 'Auto-generated workflow',
      inputVariables: [],
      nodes: [
        { id: 'start', type: 'startProcess', label: 'Start', position: { x: 100, y: 100 }, data: { label: 'Start', description: 'Start of workflow' } },
        { id: 'userTask1', type: 'userTask', label: 'Process Request', position: { x: 100, y: 200 }, data: { label: 'Process Request', description: 'Main processing step' } },
        { id: 'end', type: 'endEvent', label: 'End', position: { x: 100, y: 300 }, data: { label: 'End', description: 'End of workflow' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'userTask1', type: 'default' },
        { id: 'e2', source: 'userTask1', target: 'end', type: 'default' }
      ],
      metadata: { category: 'automation', complexity: 'simple', estimatedDuration: 'minutes' }
    };
  }
}

module.exports = WorkflowExpert;
