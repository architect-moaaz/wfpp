/**
 * Execution Agent
 * Executes workflow tasks based on their type
 */

const axios = require('axios');
const formDatabase = require('../../database/FormDatabase');
const Anthropic = require('@anthropic-ai/sdk');

class ExecutionAgent {
  constructor() {
    this.name = 'ExecutionAgent';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
  }

  /**
   * Execute a workflow node
   */
  async execute(node, instance, workflowDef) {
    console.log(`[ExecutionAgent] Executing ${node.type}: ${node.id}`);

    const nodeData = node.data || {};
    const result = {
      nodeId: node.id,
      type: node.type,
      status: 'COMPLETED',
      output: {},
      timestamp: new Date().toISOString()
    };

    try {
      switch (node.type) {
        case 'startProcess':
          result.output = await this.executeStartProcess(node, instance);
          break;

        case 'userTask':
          result.output = await this.executeUserTask(node, instance);
          result.status = 'WAITING'; // Wait for human input
          break;

        case 'scriptTask':
          result.output = await this.executeScriptTask(node, instance);
          break;

        case 'serviceTask':
        case 'dataProcess':
          result.output = await this.executeServiceTask(node, instance);
          break;

        case 'sendTask':
        case 'notification':
          result.output = await this.executeSendTask(node, instance);
          break;

        case 'businessRuleTask':
        case 'validation':
          result.output = await this.executeBusinessRuleTask(node, instance);
          break;

        case 'decision':
          result.output = await this.executeDecisionGateway(node, instance);
          break;

        case 'timerEvent':
          result.output = await this.executeTimerEvent(node, instance);
          result.status = 'WAITING';
          break;

        case 'llmTask':
          result.output = await this.executeLLMTask(node, instance);
          break;

        case 'endEvent':
          result.output = await this.executeEndEvent(node, instance);
          break;

        default:
          result.output = { message: `No handler for node type: ${node.type}` };
      }

      console.log(`[ExecutionAgent] ${node.id} completed with status: ${result.status}`);
      return result;

    } catch (error) {
      console.error(`[ExecutionAgent] Error executing ${node.id}:`, error);
      result.status = 'FAILED';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Execute start process node
   */
  async executeStartProcess(node, instance) {
    const taskData = node.data || {};

    // Try to fetch form metadata if formId is attached to start event
    let formMetadata = null;
    if (taskData.formId) {
      try {
        formMetadata = await formDatabase.getForm(taskData.formId);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form ${taskData.formId}:`, error);
      }
    } else if (taskData.formName) {
      try {
        formMetadata = await formDatabase.getFormByName(taskData.formName);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form by name ${taskData.formName}:`, error);
      }
    }

    return {
      message: 'Workflow started',
      initiator: instance.initiator,
      startTime: new Date().toISOString(),
      formMetadata: formMetadata // Include form metadata for workflow initiation
    };
  }

  /**
   * Execute user task - generates form and waits
   */
  async executeUserTask(node, instance) {
    const taskData = node.data || {};

    // Try to fetch form metadata if formId is attached
    let formMetadata = null;
    if (taskData.formId) {
      try {
        formMetadata = await formDatabase.getForm(taskData.formId);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form ${taskData.formId}:`, error);
      }
    } else if (taskData.formName) {
      try {
        formMetadata = await formDatabase.getFormByName(taskData.formName);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form by name ${taskData.formName}:`, error);
      }
    }

    return {
      taskId: `task_${Date.now()}`,
      taskName: taskData.label || taskData.taskName || 'User Task',
      assignedTo: taskData.assignedTo || 'unassigned',
      priority: taskData.priority || 'medium',
      instructions: taskData.instructions || taskData.description,
      formRequired: true,
      formMetadata: formMetadata, // Include form metadata for UI rendering
      fields: formMetadata?.fields || this.generateFormFields(taskData),
      status: 'PENDING'
    };
  }

  /**
   * Generate form fields for user task
   */
  generateFormFields(taskData) {
    // Can be enhanced with AI to generate dynamic forms
    return taskData.formFields || [
      { name: 'approved', type: 'boolean', label: 'Approved', required: true },
      { name: 'comments', type: 'text', label: 'Comments', required: false }
    ];
  }

  /**
   * Execute script task
   */
  async executeScriptTask(node, instance) {
    const taskData = node.data || {};
    const scriptType = taskData.scriptType || 'javascript';

    if (scriptType.toLowerCase() === 'javascript') {
      // Sandboxed execution (in production, use vm2 or workers)
      try {
        const script = taskData.script || 'return { executed: true };';
        const fn = new Function('processData', script);
        const result = fn(instance.processData);
        return result;
      } catch (error) {
        throw new Error(`Script execution failed: ${error.message}`);
      }
    }

    return { message: `Script task executed: ${taskData.label}` };
  }

  /**
   * Execute service task - calls external API
   */
  async executeServiceTask(node, instance) {
    const taskData = node.data || {};
    const apiConfig = taskData.apiConfig || {};

    if (apiConfig.url) {
      try {
        const response = await axios({
          method: apiConfig.method || 'POST',
          url: apiConfig.url,
          headers: apiConfig.headers || {},
          data: apiConfig.body || instance.processData,
          timeout: apiConfig.timeout || 5000
        });

        return {
          apiResponse: response.data,
          status: response.status
        };
      } catch (error) {
        throw new Error(`API call failed: ${error.message}`);
      }
    }

    return { message: `Service task executed: ${taskData.label}` };
  }

  /**
   * Execute send task - sends notification
   */
  async executeSendTask(node, instance) {
    const taskData = node.data || {};

    return {
      notificationSent: true,
      channel: taskData.channel || 'email',
      recipient: taskData.recipient || instance.initiator,
      subject: taskData.subject || 'Workflow Notification',
      message: taskData.message || taskData.description
    };
  }

  /**
   * Execute business rule task
   */
  async executeBusinessRuleTask(node, instance) {
    const taskData = node.data || {};
    const rules = taskData.rules || [];

    const validationResults = rules.map(rule => ({
      rule: rule.name || rule,
      passed: true // Simplified - should evaluate actual rules
    }));

    return {
      validationPassed: validationResults.every(r => r.passed),
      results: validationResults
    };
  }

  /**
   * Execute decision gateway
   */
  async executeDecisionGateway(node, instance) {
    const taskData = node.data || {};
    const gatewayType = taskData.gatewayType || 'exclusive';

    return {
      gatewayType,
      decision: 'approved', // Simplified - should evaluate conditions
      condition: taskData.condition
    };
  }

  /**
   * Execute timer event
   */
  async executeTimerEvent(node, instance) {
    const taskData = node.data || {};

    return {
      timerSet: true,
      duration: taskData.duration || '1h',
      waitUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Execute LLM task - uses AI to perform intelligent tasks
   */
  async executeLLMTask(node, instance) {
    const taskData = node.data || {};

    if (!this.useLLM) {
      console.warn('[ExecutionAgent] LLM not configured, returning mock result');
      return {
        llmExecuted: false,
        message: 'LLM task skipped - API key not configured',
        mockResult: 'This is a mock LLM response'
      };
    }

    try {
      // Get the prompt template and substitute variables
      const promptTemplate = taskData.prompt || 'Analyze the following data: ${JSON.stringify(processData)}';
      const prompt = this.substituteVariables(promptTemplate, instance.processData);

      console.log(`[ExecutionAgent] Executing LLM task with model: ${taskData.model || 'claude-sonnet-4-5-20250929'}`);

      // Call Anthropic API
      const response = await this.anthropic.messages.create({
        model: taskData.model || 'claude-sonnet-4-5-20250929',
        max_tokens: taskData.maxTokens || 1000,
        temperature: taskData.temperature !== undefined ? taskData.temperature : 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const llmResult = response.content[0].text;

      // Store result in output variable or default location
      const outputVariable = taskData.outputVariable || 'llmResult';
      const output = {
        llmExecuted: true,
        model: taskData.model || 'claude-sonnet-4-5-20250929',
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };

      // Add the LLM result to the output under the specified variable name
      output[outputVariable] = llmResult;

      console.log(`[ExecutionAgent] LLM task completed, result stored in: ${outputVariable}`);
      return output;

    } catch (error) {
      console.error('[ExecutionAgent] LLM task failed:', error);
      throw new Error(`LLM task failed: ${error.message}`);
    }
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
  }

  /**
   * Convert string to snake_case
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Find property in object with flexible naming
   * Tries: original, camelCase, snake_case, lowercase
   */
  findProperty(obj, key) {
    if (obj === null || obj === undefined) return undefined;

    // Try direct match first
    if (key in obj) return obj[key];

    // Try camelCase version
    const camelKey = this.toCamelCase(key);
    if (camelKey !== key && camelKey in obj) return obj[camelKey];

    // Try snake_case version
    const snakeKey = this.toSnakeCase(key);
    if (snakeKey !== key && snakeKey in obj) return obj[snakeKey];

    // Try lowercase
    const lowerKey = key.toLowerCase();
    if (lowerKey !== key && lowerKey in obj) return obj[lowerKey];

    // Case-insensitive search as last resort
    const objKeys = Object.keys(obj);
    const matchingKey = objKeys.find(k => k.toLowerCase() === lowerKey);
    if (matchingKey) return obj[matchingKey];

    return undefined;
  }

  /**
   * Substitute variables in a template string
   * Replaces ${variableName} with values from processData
   * Supports multiple naming conventions: camelCase, snake_case, kebab-case
   */
  substituteVariables(template, processData) {
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      try {
        // Support nested paths like ${processData.user.name}
        const pathParts = path.split('.');

        let value = { processData };

        for (const key of pathParts) {
          if (key === 'processData') {
            value = processData;
          } else {
            // Use flexible property lookup
            value = this.findProperty(value, key);

            if (value === undefined) {
              // Property not found, log warning and return original
              console.warn(`[ExecutionAgent] Variable not found: ${path}, tried variations of key: ${key}`);
              return match;
            }
          }
        }

        // Handle different types of values
        if (value === null) return 'null';
        if (value === undefined) return match;
        if (typeof value === 'object') return JSON.stringify(value);

        return String(value);

      } catch (error) {
        console.error(`[ExecutionAgent] Error substituting variable ${path}:`, error);
        return match;
      }
    });
  }

  /**
   * Execute end event
   */
  async executeEndEvent(node, instance) {
    const taskData = node.data || {};

    return {
      message: 'Workflow completed',
      result: taskData.result || 'Success',
      endTime: new Date().toISOString()
    };
  }
}

module.exports = ExecutionAgent;
