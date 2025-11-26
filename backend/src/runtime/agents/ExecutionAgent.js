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
   * Get helper functions library for script execution
   */
  getHelperFunctions() {
    return {
      // Data manipulation
      updateField: (data, field, value) => {
        return { ...data, [field]: value };
      },
      getField: (data, field) => {
        return data[field];
      },
      mergeData: (data, newData) => {
        return { ...data, ...newData };
      },

      // Array operations
      addToArray: (data, field, item) => {
        const arr = data[field] || [];
        return { ...data, [field]: [...arr, item] };
      },
      filterArray: (data, field, predicate) => {
        const arr = data[field] || [];
        return { ...data, [field]: arr.filter(predicate) };
      },

      // Validation
      validateRequired: (data, fields) => {
        const missing = fields.filter(f => !data[f]);
        return { valid: missing.length === 0, missing };
      },

      // String operations
      formatString: (template, data) => {
        return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
      },

      // Date operations
      getCurrentDate: () => new Date().toISOString(),
      formatDate: (date) => new Date(date).toLocaleDateString(),

      // Logging
      log: (...args) => {
        console.log('[ScriptTask]', ...args);
      }
    };
  }

  /**
   * Use AI to fix a broken script
   */
  async fixScriptWithAI(originalScript, errorMessage, taskData, processData) {
    if (!this.useLLM) {
      console.log('[ExecutionAgent] AI not available for script recovery');
      return null;
    }

    console.log('[ExecutionAgent] Attempting AI-powered script recovery...');

    try {
      const prompt = `You are a script repair expert. A JavaScript script failed during execution and you need to fix it.

**Original Script:**
\`\`\`javascript
${originalScript}
\`\`\`

**Error:**
${errorMessage}

**Task Context:**
- Task Label: ${taskData.label || 'Unknown'}
- Task Description: ${taskData.description || 'No description'}

**Available Data:**
- processData: ${JSON.stringify(processData, null, 2)}

**Available Helper Functions:**
You can ONLY use these pre-defined functions:
- updateField(data, field, value) - Update a single field
- getField(data, field) - Get a field value
- mergeData(data, newData) - Merge objects
- addToArray(data, field, item) - Add item to array field
- filterArray(data, field, predicate) - Filter array field
- validateRequired(data, fields) - Validate required fields
- formatString(template, data) - Format string with placeholders
- getCurrentDate() - Get current ISO date
- formatDate(date) - Format date to locale string
- log(...args) - Log messages

**Your Task:**
Fix the script to accomplish the original intent while:
1. Using ONLY the available helper functions (no undefined functions)
2. Working with the processData object
3. Returning a valid result
4. Avoiding the error that occurred

**Return ONLY the fixed JavaScript code, nothing else. Do not include markdown code blocks or explanations.**`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const fixedScript = response.content[0].text.trim();
      console.log('[ExecutionAgent] AI generated fixed script:', fixedScript.substring(0, 200) + '...');

      return fixedScript;
    } catch (aiError) {
      console.error('[ExecutionAgent] AI script recovery failed:', aiError.message);
      return null;
    }
  }

  /**
   * Execute script task
   */
  async executeScriptTask(node, instance) {
    const taskData = node.data || {};
    const scriptType = taskData.scriptType || 'javascript';

    if (scriptType.toLowerCase() === 'javascript') {
      const originalScript = taskData.script || 'return { executed: true };';
      const helpers = this.getHelperFunctions();
      let attemptCount = 0;
      let currentScript = originalScript;

      // Try up to 2 times: original script, then AI-fixed script
      while (attemptCount < 2) {
        attemptCount++;

        try {
          console.log(`[ExecutionAgent] Script execution attempt ${attemptCount}`);

          // Create function with processData and helper functions
          const fn = new Function(
            'processData',
            'helpers',
            `
            // Destructure helpers for easy access
            const {
              updateField, getField, mergeData,
              addToArray, filterArray,
              validateRequired, formatString,
              getCurrentDate, formatDate,
              log
            } = helpers;

            // Execute user script
            ${currentScript}
            `
          );

          const result = fn(instance.processData, helpers);

          if (attemptCount > 1) {
            console.log('[ExecutionAgent] ✓ AI-fixed script executed successfully!');
          }

          return result;
        } catch (error) {
          console.error(`[ExecutionAgent] Script execution attempt ${attemptCount} failed:`, error.message);

          // If first attempt failed and AI is available, try to fix it
          if (attemptCount === 1 && this.useLLM) {
            const fixedScript = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              instance.processData
            );

            if (fixedScript) {
              currentScript = fixedScript;
              console.log('[ExecutionAgent] Retrying with AI-fixed script...');
              continue; // Try again with fixed script
            }
          }

          // If we've exhausted attempts or AI fix failed, throw error
          throw new Error(`Script execution failed: ${error.message}`);
        }
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
