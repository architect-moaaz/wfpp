/**
 * Workflow Runtime Engine with Self-Healing
 * Executes workflow instances and manages workflow state with AI-powered error recovery
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WorkflowInstance = require('../models/WorkflowInstance');
const logger = require('../utils/logger');
const executionLogDB = require('../database/ExecutionLogDatabase');
const Anthropic = require('@anthropic-ai/sdk');

class RuntimeEngine {
  constructor() {
    this.workflows = [];
    this.instances = new Map();
    this.nodeExecutors = this.initializeNodeExecutors();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
  }

  async initialize() {
    try {
      // Load workflows
      const workflowsPath = path.join(__dirname, '../resources/workflows.json');
      const workflowsData = await fs.readFile(workflowsPath, 'utf8');
      this.workflows = JSON.parse(workflowsData);
      logger.info(`Loaded ${this.workflows.length} workflows`);
    } catch (error) {
      logger.error('Failed to load workflows:', error);
      throw error;
    }
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
   * Use AI to fix a broken script with historical learning
   */
  async fixScriptWithAI(originalScript, errorMessage, taskData, processData, workflowId) {
    if (!this.useLLM) {
      logger.info('[RuntimeEngine] AI not available for script recovery');
      return { script: null, method: null };
    }

    logger.info('[RuntimeEngine] Attempting AI-powered script recovery...');

    // Step 1: Check historical fixes for similar errors
    const similarFixes = executionLogDB.findSimilarFixes(errorMessage, originalScript, 3);

    if (similarFixes.length > 0) {
      logger.info(`[RuntimeEngine] Found ${similarFixes.length} similar historical fixes`);

      // Try the most successful fix first
      const bestFix = similarFixes[0];
      logger.info(`[RuntimeEngine] Using cached fix (success count: ${bestFix.successCount})`);

      return {
        script: bestFix.fixedScript,
        method: 'cached',
        reference: bestFix
      };
    }

    // Step 2: No historical fix found, use AI to generate new fix
    logger.info('[RuntimeEngine] No historical fix found, generating AI solution...');

    try {
      // Build prompt with historical context if available
      let historicalContext = '';
      if (similarFixes.length > 0) {
        historicalContext = '\n**Similar Past Errors and Fixes:**\n';
        similarFixes.forEach((fix, idx) => {
          historicalContext += `\nExample ${idx + 1}:\n`;
          historicalContext += `Error: ${fix.errorMessage}\n`;
          historicalContext += `Fix: ${fix.fixedScript}\n`;
        });
      }

      const prompt = `You are a script repair expert with access to historical fixes. A JavaScript script failed during execution and you need to fix it.

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
${historicalContext}

**Your Task:**
Fix the script to accomplish the original intent while:
1. Using ONLY the available helper functions (no undefined functions)
2. Working with the processData object
3. Returning a valid result
4. Avoiding the error that occurred
5. Learning from similar past fixes if provided

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
      logger.info('[RuntimeEngine] AI generated new fixed script');

      return {
        script: fixedScript,
        method: 'ai',
        reference: null
      };
    } catch (aiError) {
      logger.error('[RuntimeEngine] AI script recovery failed:', aiError.message);
      return { script: null, method: null };
    }
  }

  /**
   * Execute script task with self-healing and logging
   */
  async executeScriptTask(node, context) {
    const taskData = node.data || {};
    const scriptType = taskData.scriptType || 'javascript';
    const startTime = Date.now();
    const workflowId = context.workflowId || 'unknown';
    const instanceId = context.instanceId || 'unknown';

    if (scriptType.toLowerCase() === 'javascript') {
      const originalScript = taskData.script || 'return { executed: true };';
      const helpers = this.getHelperFunctions();
      let attemptCount = 0;
      let currentScript = originalScript;
      let fixMethod = null;
      let lastError = null;

      // Try up to 3 times: original, cached fix, then AI-generated fix
      while (attemptCount < 3) {
        attemptCount++;

        try {
          logger.info(`[RuntimeEngine] Script execution attempt ${attemptCount}`);

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

          const result = fn(context.data, helpers);
          const executionTime = Date.now() - startTime;

          // Log successful execution
          executionLogDB.logExecution({
            workflowId,
            instanceId,
            nodeId: node.id,
            nodeType: node.type,
            taskLabel: taskData.label,
            status: attemptCount > 1 ? 'fixed' : 'success',
            originalScript,
            fixedScript: attemptCount > 1 ? currentScript : null,
            fixMethod,
            executionTime,
            retryCount: attemptCount - 1
          });

          // If this was a successful fix, store it for future reference
          if (attemptCount > 1 && fixMethod) {
            executionLogDB.storeFix({
              errorType: lastError.name || 'Error',
              errorMessage: lastError.message,
              originalScript,
              fixedScript: currentScript,
              taskContext: {
                label: taskData.label,
                description: taskData.description
              }
            });

            logger.info(`[RuntimeEngine] ✓ ${fixMethod === 'cached' ? 'Cached' : 'AI'} fix executed successfully!`);
          }

          return result;
        } catch (error) {
          logger.error(`[RuntimeEngine] Script execution attempt ${attemptCount} failed:`, error.message);
          lastError = error;

          // If first attempt failed and AI/cache is available, try to fix it
          if (attemptCount === 1) {
            const fixResult = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              context.data,
              workflowId
            );

            if (fixResult.script) {
              currentScript = fixResult.script;
              fixMethod = fixResult.method;
              logger.info(`[RuntimeEngine] Retrying with ${fixMethod} fix...`);
              continue; // Try again with fixed script
            }
          }

          // If second attempt failed with cached fix, try AI generation
          if (attemptCount === 2 && fixMethod === 'cached') {
            logger.info('[RuntimeEngine] Cached fix failed, trying AI generation...');
            const fixResult = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              context.data,
              workflowId
            );

            if (fixResult.script && fixResult.method === 'ai') {
              currentScript = fixResult.script;
              fixMethod = 'ai';
              logger.info('[RuntimeEngine] Retrying with AI-generated fix...');
              continue; // Try again
            }
          }

          // Log failed execution
          const executionTime = Date.now() - startTime;
          executionLogDB.logExecution({
            workflowId,
            instanceId,
            nodeId: node.id,
            nodeType: node.type,
            taskLabel: taskData.label,
            status: 'failed',
            error: error.message,
            originalScript,
            fixedScript: attemptCount > 1 ? currentScript : null,
            fixMethod,
            executionTime,
            retryCount: attemptCount - 1
          });

          // If we've exhausted attempts, throw error
          throw new Error(`Script execution failed: ${error.message}`);
        }
      }
    }

    return { message: `Script task executed: ${taskData.label}` };
  }

  initializeNodeExecutors() {
    return {
      startEvent: async (node, context) => {
        logger.info(`Starting workflow: ${node.id}`);
        return { status: 'completed', data: context.input || {} };
      },

      endEvent: async (node, context) => {
        logger.info(`Ending workflow: ${node.id}`);
        return { status: 'completed', data: context.data };
      },

      userTask: async (node, context) => {
        logger.info(`User task: ${node.data?.label}`);
        // User tasks wait for external input
        return { status: 'waiting', data: context.data };
      },

      serviceTask: async (node, context) => {
        logger.info(`Service task: ${node.data?.label}`);
        // Execute service task logic
        const result = await this.executeServiceTask(node, context);
        return { status: 'completed', data: result };
      },

      scriptTask: async (node, context) => {
        logger.info(`Script task: ${node.data?.label}`);
        // Execute script with self-healing
        const result = await this.executeScriptTask(node, context);
        return { status: 'completed', data: result };
      },

      exclusiveGateway: async (node, context) => {
        logger.info(`Exclusive gateway: ${node.id}`);
        // Evaluate conditions and choose path
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      parallelGateway: async (node, context) => {
        logger.info(`Parallel gateway: ${node.id}`);
        return { status: 'completed', data: context.data };
      }
    };
  }

  async executeServiceTask(node, context) {
    // Implement service task execution
    const serviceType = node.data?.serviceType;

    switch (serviceType) {
      case 'http':
        return await this.executeHttpService(node.data, context);
      case 'database':
        return await this.executeDatabaseService(node.data, context);
      default:
        return context.data;
    }
  }

  async executeHttpService(config, context) {
    // HTTP service implementation
    return context.data;
  }

  async executeDatabaseService(config, context) {
    // Database service implementation
    return context.data;
  }

  async evaluateGateway(node, context) {
    // Evaluate gateway conditions
    return null;
  }

  async startWorkflow(workflowId, input = {}) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instance = new WorkflowInstance({
      workflowId,
      workflow,
      input
    });

    this.instances.set(instance.id, instance);
    logger.info(`Started workflow instance: ${instance.id}`);

    // Execute workflow
    await this.executeWorkflow(instance);

    return instance;
  }

  async executeWorkflow(instance) {
    const startNode = instance.workflow.nodes.find(n => n.type === 'startEvent');
    if (!startNode) {
      throw new Error('No start event found');
    }

    instance.status = 'running';
    await this.executeNode(instance, startNode.id);
  }

  async executeNode(instance, nodeId) {
    const node = instance.workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      logger.error(`Node not found: ${nodeId}`);
      return;
    }

    instance.currentNodeId = nodeId;

    const executor = this.nodeExecutors[node.type];
    if (!executor) {
      logger.error(`No executor for node type: ${node.type}`);
      return;
    }

    // Add workflow and instance IDs to context for logging
    const context = {
      data: instance.data,
      input: instance.input,
      workflowId: instance.workflowId,
      instanceId: instance.id
    };

    const result = await executor(node, context);

    if (result.status === 'completed') {
      instance.data = result.data;

      // Find next node
      const nextNodeId = result.nextNode || this.getNextNode(instance, nodeId);

      if (nextNodeId) {
        await this.executeNode(instance, nextNodeId);
      } else {
        // Workflow complete
        instance.status = 'completed';
        instance.completedAt = new Date();
        logger.info(`Workflow instance completed: ${instance.id}`);
      }
    } else if (result.status === 'waiting') {
      instance.status = 'waiting';
      logger.info(`Workflow instance waiting: ${instance.id}`);
    }
  }

  getNextNode(instance, currentNodeId) {
    const connections = instance.workflow.connections || instance.workflow.edges || [];
    const nextConnection = connections.find(c => c.source === currentNodeId);
    return nextConnection?.target;
  }

  async resumeWorkflow(instanceId, data) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.data = { ...instance.data, ...data };
    await this.executeNode(instance, instance.currentNodeId);
  }

  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  getAllInstances() {
    return Array.from(this.instances.values());
  }
}

module.exports = new RuntimeEngine();
