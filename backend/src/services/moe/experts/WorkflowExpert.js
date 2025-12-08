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
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[WorkflowExpert] Generating workflow: ${spec.name}...`);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents);

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
    const workflow = this.parseWorkflow(workflowText);

    console.log(`[WorkflowExpert] Generated workflow: ${workflow.name}`);
    return workflow;
  }

  /**
   * Generate multiple workflows in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, {})];

    console.log(`[WorkflowExpert] Generating ${specs.length} workflows in batch...`);

    // For many workflows, generate individually to ensure uniqueness
    if (specs.length > 5) {
      console.log(`[WorkflowExpert] Too many workflows for batch (${specs.length}), generating individually...`);
      const workflows = [];
      for (let i = 0; i < specs.length; i++) {
        console.log(`[WorkflowExpert] Generating workflow ${i + 1}/${specs.length}: ${specs[i].name}`);
        const wf = await this.generateSingle(specs[i], componentPlan, { workflows });
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
    const workflows = this.parseWorkflows(workflowsText);

    // Verify we got unique workflows - if not, regenerate individually
    if (this.haseDuplicateWorkflows(workflows)) {
      console.warn(`[WorkflowExpert] Detected duplicate workflows in batch, regenerating individually...`);
      const uniqueWorkflows = [];
      for (let i = 0; i < specs.length; i++) {
        console.log(`[WorkflowExpert] Regenerating workflow ${i + 1}/${specs.length}: ${specs[i].name}`);
        const wf = await this.generateSingle(specs[i], componentPlan, { workflows: uniqueWorkflows });
        uniqueWorkflows.push(wf);
      }
      return uniqueWorkflows;
    }

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

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    return `Generate a workflow for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}

Context:
- Application: ${componentPlan.overview.name}
- Domain: ${componentPlan.overview.category || 'General'}
${existingComponents.dataModels ? `- Existing data models: ${existingComponents.dataModels.map(dm => dm.name).join(', ')}` : ''}
${existingComponents.forms ? `- Existing forms: ${existingComponents.forms.map(f => f.name).join(', ')}` : ''}

CRITICAL Requirements:
- MUST include a startProcess node as the first node
- MUST include an endProcess node as the last node
- Include 3-10 nodes that accurately represent the workflow logic
- Create logical flow with proper connections between ALL nodes
- Each node MUST connect to the next via edges
- For decision nodes: ONE outgoing edge MUST have "isDefault": true

Node Types Available:
- startProcess: REQUIRED as first node
- task: General workflow task
- decision: Conditional branching with multiple paths (MUST have isDefault on one edge)
- form: User form interaction / data entry
- approval: Human approval step requiring user action
- humanTask: Manual human task requiring action
- api: External API call
- script: Script/code execution
- loop: Iterative processing
- parallel: Parallel execution gateway
- endProcess: REQUIRED as last node

Workflow Complexity Guidelines:
- Match complexity to the requirement - simple tasks = linear, complex logic = branching
- Use decision nodes when there are conditional paths (approval/rejection, validation pass/fail)
- Use approval/humanTask nodes for steps requiring human intervention
- Use loops when iterating over collections or retry logic
- Use parallel gateways for concurrent processing
- Create realistic business workflows that mirror actual process logic

Return ONLY valid JSON in this format:
{
  "id": "unique-id",
  "name": "${spec.name}",
  "description": "Brief description of what this workflow does",
  "nodes": [
    {
      "id": "start-1",
      "type": "startProcess",
      "label": "Start",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Start", "description": "Process start" }
    },
    {
      "id": "task-1",
      "type": "task",
      "label": "Task Name",
      "position": { "x": 250, "y": 100 },
      "data": { "label": "Task Name", "description": "What this task does" }
    },
    {
      "id": "end-1",
      "type": "endProcess",
      "label": "End",
      "position": { "x": 400, "y": 100 },
      "data": { "label": "End", "description": "Process complete" }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "start-1", "target": "task-1" },
    { "id": "edge-2", "source": "task-1", "target": "end-1" }
  ],
  "metadata": {
    "category": "automation|approval|data-processing|user-interaction",
    "complexity": "simple|medium|complex"
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan) {
    // Build detailed spec descriptions - let AI decide the flow
    const detailedSpecs = specs.map((s, index) => {
      return `
### Workflow ${index + 1}: "${s.name}"
- Purpose: ${s.purpose || 'Process automation'}
- Unique ID: wf_${index + 1}_${Date.now()}
- Description: ${s.description || s.purpose || 'Automated workflow for ' + s.name}`;
    }).join('\n');

    return `Generate ${specs.length} UNIQUE and DIFFERENT workflows for: ${componentPlan.overview.name}

## Workflows to Generate:
${detailedSpecs}

## CRITICAL Requirements:
1. ANALYZE each workflow's purpose and design the OPTIMAL flow to accomplish that task
2. Each workflow MUST be structurally different based on its unique requirements
3. Each workflow MUST have a unique ID (use the provided unique IDs)
4. MUST include startProcess as first node and endProcess as last node
5. Include appropriate nodes based on what the task actually requires
6. For decision nodes: ONE outgoing edge MUST have "isDefault": true
7. Think about: What steps are needed? What decisions must be made? Who needs to be involved?

## Node Types Available:
- startProcess: Process entry point
- task: General processing task
- decision: Conditional branching (REQUIRES isDefault on one edge)
- form: User data input/entry
- approval: Human approval required
- humanTask: Manual human action
- api: External system call
- script: Automated script/calculation
- loop: Iterative processing
- parallel: Parallel execution
- endProcess: Process completion

## Design Principles:
- Simple tasks need simple flows (3-5 nodes)
- Complex tasks need branching, decisions, error handling (6-12 nodes)
- Use decision nodes when outcomes can vary
- Use approval/humanTask when human judgment is needed
- Use api nodes for external integrations
- Use loop nodes for batch/repetitive operations

Return ONLY a valid JSON array with ${specs.length} workflows:
[
  {
    "id": "unique_id",
    "name": "WorkflowName",
    "description": "What this workflow accomplishes",
    "nodes": [/* nodes designed for THIS workflow's specific purpose */],
    "edges": [/* connections that make logical sense for the flow */],
    "metadata": { "category": "type", "complexity": "simple|medium|complex" }
  }
]

IMPORTANT:
- Let the PURPOSE drive the DESIGN - don't use templates
- Each workflow should be the optimal solution for its specific task
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
      nodes: [
        { id: 'start', type: 'start', label: 'Start', position: { x: 100, y: 100 }, data: { description: 'Start of workflow' } },
        { id: 'task1', type: 'task', label: 'Process', position: { x: 100, y: 200 }, data: { description: 'Main processing step' } },
        { id: 'end', type: 'end', label: 'End', position: { x: 100, y: 300 }, data: { description: 'End of workflow' } }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'task1', type: 'default' },
        { id: 'e2', source: 'task1', target: 'end', type: 'default' }
      ],
      metadata: { category: 'automation', complexity: 'simple', estimatedDuration: 'minutes' }
    };
  }
}

module.exports = WorkflowExpert;
