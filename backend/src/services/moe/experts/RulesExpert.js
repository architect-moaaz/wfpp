/**
 * Rules Expert
 * Generates business rules for workflows individually or in batches
 * Rules are attached to specific workflow nodes for validation, decisions, etc.
 */

const Anthropic = require('@anthropic-ai/sdk');

class RulesExpert {
  constructor() {
    this.name = 'RulesExpert';
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
   * Generate rules for a specific workflow node
   */
  async generateSingle(spec, componentPlan, existingComponents) {
    console.log(`[RulesExpert] Generating rule: ${spec.name}...`);

    const prompt = this.buildSinglePrompt(spec, componentPlan, existingComponents);

    const response = await this.executeWithNetworkRetry(async () => {
      return await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
    });

    const ruleText = response.content[0].text;
    const rule = this.parseRule(ruleText);

    // Attach node_id if provided in spec
    if (spec.nodeId) {
      rule.node_id = spec.nodeId;
    }
    if (spec.workflowId) {
      rule.workflow_id = spec.workflowId;
    }

    console.log(`[RulesExpert] Generated rule: ${rule.name}`);
    return rule;
  }

  /**
   * Generate multiple rules in one call (for parallel strategy)
   */
  async generateBatch(specs, componentPlan, existingComponents = {}) {
    if (specs.length === 0) return [];
    if (specs.length === 1) return [await this.generateSingle(specs[0], componentPlan, existingComponents)];

    console.log(`[RulesExpert] Generating ${specs.length} rules in batch...`);

    const prompt = this.buildBatchPrompt(specs, componentPlan, existingComponents);

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

    const rulesText = response.content[0].text;
    const rules = this.parseRules(rulesText);

    // Attach node_id and workflow_id to each rule from specs
    rules.forEach((rule, index) => {
      if (specs[index]) {
        if (specs[index].nodeId) {
          rule.node_id = specs[index].nodeId;
        }
        if (specs[index].workflowId) {
          rule.workflow_id = specs[index].workflowId;
        }
      }
    });

    console.log(`[RulesExpert] Generated ${rules.length} rules`);
    return rules;
  }

  /**
   * Generate rules for an entire workflow
   * Analyzes workflow nodes and creates appropriate rules for each
   */
  async generateForWorkflow(workflow, dataModels = [], componentPlan) {
    console.log(`[RulesExpert] Generating rules for workflow: ${workflow.name}...`);

    // Identify nodes that need rules
    const nodesNeedingRules = workflow.nodes.filter(node => {
      const type = node.type;
      return type === 'userTask' ||
             type === 'startProcess' ||
             type === 'decision' ||
             type === 'validation' ||
             type === 'businessRuleTask' ||
             type === 'serviceTask';
    });

    if (nodesNeedingRules.length === 0) {
      console.log('[RulesExpert] No nodes require rules in this workflow');
      return [];
    }

    // Create specs for each node
    const ruleSpecs = nodesNeedingRules.map(node => ({
      name: `${node.data?.label || node.id} Rule`,
      purpose: this.determineRulePurpose(node),
      nodeId: node.id,
      workflowId: workflow.id,
      nodeType: node.type,
      nodeLabel: node.data?.label,
      nodeDescription: node.data?.description
    }));

    // Generate rules in batch
    return await this.generateBatch(ruleSpecs, componentPlan, {
      workflow,
      dataModels
    });
  }

  /**
   * Determine the purpose of a rule based on node type
   */
  determineRulePurpose(node) {
    switch (node.type) {
      case 'userTask':
      case 'startProcess':
        return 'Validate user input and ensure data quality';
      case 'decision':
        return 'Evaluate conditions to determine workflow path';
      case 'validation':
        return 'Validate data against business rules';
      case 'businessRuleTask':
        return 'Execute business logic and transformations';
      case 'serviceTask':
        return 'Validate service call parameters and responses';
      default:
        return 'Apply business rules';
    }
  }

  buildSinglePrompt(spec, componentPlan, existingComponents) {
    const { workflow, dataModels = [] } = existingComponents;

    return `Generate a business rule for: ${spec.name}

Purpose: ${spec.purpose}
${spec.description ? `Description: ${spec.description}` : ''}
${spec.nodeType ? `Node Type: ${spec.nodeType}` : ''}
${spec.nodeLabel ? `Node Label: ${spec.nodeLabel}` : ''}

Context:
- Application: ${componentPlan?.overview?.name || 'Business Application'}
- Domain: ${componentPlan?.overview?.category || 'General'}
${workflow ? `- Workflow: ${workflow.name}` : ''}
${dataModels.length > 0 ? `- Data models: ${dataModels.map(dm => dm.name).join(', ')}` : ''}

Requirements:
- Create a practical, realistic business rule for this ${spec.nodeType || 'workflow step'}
- Use simple conditions (1-3 conditions maximum)
- Include appropriate actions based on rule type
- Rule should be immediately usable in production

**IMPORTANT RULE TYPES:**
- validation: Check data validity (e.g., email format, required fields, value ranges)
- decision: Make routing decisions (e.g., approve if amount < $1000)
- transformation: Modify/calculate data (e.g., apply discount, calculate total)
- notification: Send alerts/emails (e.g., notify manager on high value)
- automation: Trigger automated actions (e.g., create tasks, update status)

**CONDITION OPERATORS:**
- equals, notEquals, contains, notContains
- greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
- in, notIn, startsWith, endsWith
- isNull, isNotNull

**ACTION TYPES:**
- setVariable: Set a workflow variable
- sendNotification: Send email/notification
- logMessage: Log information
- throwError: Stop workflow with error
- validateField: Mark field as valid/invalid
- executeScript: Run custom logic
- callWebhook: Call external API
- updateData: Modify data
- stopWorkflow: Halt execution

Return ONLY valid JSON in this format:
{
  "id": "rule_${Date.now()}",
  "name": "${spec.name}",
  "description": "Brief description of what this rule does",
  "type": "validation|decision|transformation|notification|automation",
  "priority": 0,
  "is_active": true,
  "conditions": {
    "all": [
      {
        "field": "fieldName",
        "operator": "greaterThan|equals|contains|etc",
        "value": "comparisonValue"
      }
    ]
  },
  "actions": {
    "actions": [
      {
        "type": "setVariable|sendNotification|logMessage|etc",
        "field": "targetField",
        "value": "newValue",
        "message": "Optional message for notifications/logs"
      }
    ]
  }
}`;
  }

  buildBatchPrompt(specs, componentPlan, existingComponents) {
    const { workflow, dataModels = [] } = existingComponents;
    const specList = specs.map(s =>
      `- ${s.name} (${s.nodeType || 'node'}): ${s.purpose}`
    ).join('\n');

    return `Generate ${specs.length} business rules for: ${componentPlan?.overview?.name || 'Business Application'}

Rules needed:
${specList}

Context:
${workflow ? `- Workflow: ${workflow.name}` : ''}
${dataModels.length > 0 ? `- Data models: ${dataModels.map(dm => dm.name).join(', ')}` : ''}

Requirements for EACH rule:
- Create practical, realistic business rules
- Use simple conditions (1-3 conditions maximum per rule)
- Include appropriate actions based on rule type
- Rules should be immediately usable in production

**IMPORTANT RULE TYPES:**
- validation: Check data validity
- decision: Make routing decisions
- transformation: Modify/calculate data
- notification: Send alerts/emails
- automation: Trigger automated actions

**CONDITION OPERATORS:**
equals, notEquals, contains, greaterThan, lessThan, in, isNull, etc.

**ACTION TYPES:**
setVariable, sendNotification, logMessage, throwError, validateField, executeScript, callWebhook, updateData, stopWorkflow

Return ONLY valid JSON array:
[
  {
    "id": "rule_unique_id",
    "name": "RuleName",
    "description": "Brief description",
    "type": "validation|decision|transformation|notification|automation",
    "priority": 0,
    "is_active": true,
    "conditions": {
      "all": [
        {
          "field": "fieldName",
          "operator": "greaterThan|equals|etc",
          "value": "comparisonValue"
        }
      ]
    },
    "actions": {
      "actions": [
        {
          "type": "setVariable|sendNotification|etc",
          "field": "targetField",
          "value": "newValue",
          "message": "Optional message"
        }
      ]
    }
  }
]`;
  }

  parseRule(text) {
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

      const rule = JSON.parse(jsonText);

      // Validate rule structure
      if (!rule.name) rule.name = 'GeneratedRule';
      if (!rule.type) rule.type = 'validation';
      if (!rule.conditions) rule.conditions = { all: [] };
      if (!rule.actions) rule.actions = { actions: [] };
      if (rule.priority === undefined) rule.priority = 0;
      if (rule.is_active === undefined) rule.is_active = true;

      return rule;
    } catch (error) {
      console.error('[RulesExpert] Parse error:', error);
      console.error('[RulesExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[RulesExpert] Returning fallback rule');
      return this.createFallbackRule();
    }
  }

  parseRules(text) {
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

      const rules = JSON.parse(jsonText);

      // Validate each rule
      return rules.map(rule => {
        if (!rule.name) rule.name = 'GeneratedRule';
        if (!rule.type) rule.type = 'validation';
        if (!rule.conditions) rule.conditions = { all: [] };
        if (!rule.actions) rule.actions = { actions: [] };
        if (rule.priority === undefined) rule.priority = 0;
        if (rule.is_active === undefined) rule.is_active = true;
        return rule;
      });
    } catch (error) {
      console.error('[RulesExpert] Parse error:', error);
      console.error('[RulesExpert] Text:', text.substring(0, 500));
      // Return fallback instead of throwing
      console.warn('[RulesExpert] Returning fallback rules array');
      return [this.createFallbackRule()];
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
   * Create fallback rule when parsing fails
   */
  createFallbackRule() {
    return {
      id: `rule_fallback_${Date.now()}`,
      name: 'GeneratedRule',
      description: 'Auto-generated validation rule',
      type: 'validation',
      priority: 0,
      is_active: true,
      conditions: {
        all: [
          { field: 'data', operator: 'isNotNull', value: null }
        ]
      },
      actions: {
        actions: [
          { type: 'logMessage', message: 'Rule executed' }
        ]
      }
    };
  }
}

module.exports = RulesExpert;
