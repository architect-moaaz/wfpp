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
    const taskData = node.data || {};
    const serviceType = taskData.serviceType;

    logger.info(`[RuntimeEngine] Executing service task: ${serviceType}`);

    switch (serviceType) {
      case 'http':
        return await this.executeHttpService(taskData, context);
      case 'database':
        return await this.executeDatabaseService(taskData, context);
      case 'email':
        return await this.executeEmailService(taskData, context);
      case 'transform':
        return await this.executeTransformService(taskData, context);
      default:
        logger.warn(`[RuntimeEngine] Unknown service type: ${serviceType}`);
        return context.data;
    }
  }

  async executeHttpService(config, context) {
    const axios = require('axios');

    const { url, method = 'GET', headers = {}, body, outputVariable } = config;

    // Interpolate variables in URL and body
    const interpolatedUrl = this.interpolateString(url, context.data);
    const interpolatedBody = body ? this.interpolateObject(body, context.data) : undefined;
    const interpolatedHeaders = this.interpolateObject(headers, context.data);

    try {
      logger.info(`[RuntimeEngine] HTTP ${method} ${interpolatedUrl}`);

      const response = await axios({
        method: method.toUpperCase(),
        url: interpolatedUrl,
        headers: interpolatedHeaders,
        data: interpolatedBody,
        timeout: config.timeout || 30000
      });

      // Store response in context
      const result = { ...context.data };
      if (outputVariable) {
        result[outputVariable] = response.data;
      }
      result._lastHttpResponse = {
        status: response.status,
        headers: response.headers,
        data: response.data
      };

      return result;
    } catch (error) {
      logger.error(`[RuntimeEngine] HTTP request failed: ${error.message}`);

      if (config.onError === 'continue') {
        return {
          ...context.data,
          _httpError: { message: error.message, code: error.code }
        };
      }
      throw error;
    }
  }

  async executeDatabaseService(config, context) {
    const database = require('../database');

    const { operation, table, query, data: recordData, outputVariable } = config;

    try {
      let result;

      switch (operation) {
        case 'select':
          const selectQuery = this.interpolateString(query || `SELECT * FROM ${table}`, context.data);
          result = await database.query(selectQuery);
          break;

        case 'insert':
          const insertData = this.interpolateObject(recordData, context.data);
          const columns = Object.keys(insertData);
          const values = Object.values(insertData);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          result = await database.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
          );
          break;

        case 'update':
          const updateData = this.interpolateObject(recordData, context.data);
          const whereClause = this.interpolateString(config.where, context.data);
          const setClause = Object.keys(updateData).map((k, i) => `${k} = $${i + 1}`).join(', ');
          result = await database.query(
            `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
            Object.values(updateData)
          );
          break;

        case 'delete':
          const deleteWhere = this.interpolateString(config.where, context.data);
          result = await database.query(`DELETE FROM ${table} WHERE ${deleteWhere}`);
          break;

        default:
          const customQuery = this.interpolateString(query, context.data);
          result = await database.query(customQuery);
      }

      const updatedData = { ...context.data };
      if (outputVariable) {
        updatedData[outputVariable] = result.rows;
      }
      updatedData._lastDbResult = result.rows;

      return updatedData;
    } catch (error) {
      logger.error(`[RuntimeEngine] Database operation failed: ${error.message}`);
      throw error;
    }
  }

  async executeEmailService(config, context) {
    const emailService = require('../services/EmailService');
    const { to, subject, body, template, variables } = config;

    // Interpolate email fields
    const emailData = {
      to: this.interpolateString(to, context.data),
      subject: this.interpolateString(subject, context.data),
      body: this.interpolateString(body, context.data),
      template,
      variables: { ...context.data, ...(variables || {}) }
    };

    logger.info(`[RuntimeEngine] Sending email to: ${emailData.to}`);

    // Use EmailService for actual delivery
    const result = await emailService.send(emailData);

    return {
      ...context.data,
      _lastEmail: {
        ...emailData,
        sentAt: new Date().toISOString(),
        success: result.success,
        emailId: result.emailId,
        provider: result.provider
      }
    };
  }

  async executeTransformService(config, context) {
    const { transformations } = config;

    let result = { ...context.data };

    if (Array.isArray(transformations)) {
      for (const transform of transformations) {
        const { type, source, target, expression } = transform;

        switch (type) {
          case 'copy':
            result[target] = this.getNestedValue(result, source);
            break;

          case 'calculate':
            result[target] = this.evaluateExpression(expression, result);
            break;

          case 'format':
            result[target] = this.interpolateString(expression, result);
            break;

          case 'map':
            const sourceArray = this.getNestedValue(result, source) || [];
            result[target] = sourceArray.map(item =>
              this.interpolateObject(transform.mapTemplate, { ...result, _item: item })
            );
            break;

          default:
            logger.warn(`[RuntimeEngine] Unknown transform type: ${type}`);
        }
      }
    }

    return result;
  }

  async evaluateGateway(node, context) {
    const { edges = [], nodes = [] } = context.workflow || this.workflows.find(w => w.id === context.workflowId) || {};

    // Find outgoing edges from this gateway
    const outgoing = edges.filter(e => e.source === node.id);

    if (outgoing.length === 0) {
      logger.warn(`[RuntimeEngine] Gateway ${node.id} has no outgoing edges`);
      return null;
    }

    // For exclusive gateway, evaluate conditions in order
    if (node.type === 'exclusiveGateway') {
      for (const edge of outgoing) {
        const condition = edge.data?.condition || edge.label;

        if (!condition || condition === 'default') {
          continue; // Skip default path for now
        }

        if (this.evaluateCondition(condition, context.data)) {
          logger.info(`[RuntimeEngine] Gateway condition matched: ${condition}`);
          return edge.target;
        }
      }

      // If no conditions matched, use default path
      const defaultEdge = outgoing.find(e =>
        !e.data?.condition || e.data?.condition === 'default' || e.label === 'default'
      );

      if (defaultEdge) {
        logger.info(`[RuntimeEngine] Using default gateway path`);
        return defaultEdge.target;
      }

      // Fallback to first edge
      return outgoing[0]?.target;
    }

    // For parallel gateway, return all targets (handled by workflow engine)
    if (node.type === 'parallelGateway') {
      return outgoing.map(e => e.target);
    }

    return outgoing[0]?.target;
  }

  evaluateCondition(condition, data) {
    try {
      // Replace {{var}} and ${var} with actual values
      let expr = condition
        .replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
          const value = this.getNestedValue(data, varName.trim());
          return JSON.stringify(value);
        })
        .replace(/\$\{([^}]+)\}/g, (match, varName) => {
          const value = this.getNestedValue(data, varName.trim());
          return JSON.stringify(value);
        });

      // Safe evaluation with data context
      const fn = new Function('data', `with(data) { return ${expr}; }`);
      return fn(data);
    } catch (error) {
      logger.error(`[RuntimeEngine] Condition evaluation failed: ${error.message}`);
      return false;
    }
  }

  // Helper: Interpolate string with {{var}} syntax
  interpolateString(str, data) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = this.getNestedValue(data, varName.trim());
      return value !== undefined ? value : match;
    });
  }

  // Helper: Interpolate object values
  interpolateObject(obj, data) {
    if (!obj || typeof obj !== 'object') return obj;

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateString(value, data);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value, data);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // Helper: Get nested value from object
  getNestedValue(obj, path) {
    if (!path || !obj) return undefined;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    return value;
  }

  // Helper: Evaluate simple expression
  evaluateExpression(expr, data) {
    try {
      const interpolated = this.interpolateString(expr, data);
      return new Function('data', `with(data) { return ${interpolated}; }`)(data);
    } catch (error) {
      logger.error(`[RuntimeEngine] Expression evaluation failed: ${error.message}`);
      return null;
    }
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

    // Store in memory for quick access during execution
    this.instances.set(instance.id, instance);

    // Persist to database
    await this.persistInstance(instance);

    logger.info(`Started workflow instance: ${instance.id}`);

    // Execute workflow
    await this.executeWorkflow(instance);

    // Build navigation info for the initial page
    let navigation = {
      initialPageId: null,
      currentTaskId: null,
      workflowComplete: instance.status === 'completed'
    };

    // Get the current node to extract navigation info
    if (instance.currentNodeId) {
      const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);
      if (currentNode) {
        navigation.initialPageId = currentNode.data?.pageId || currentNode.data?.displayPageId || null;
        navigation.currentTaskId = instance.status === 'waiting' ? instance.currentNodeId : null;
      }
    }

    // Attach navigation to instance for the API response
    instance.navigation = navigation;

    return instance;
  }

  async persistInstance(instance) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return; // Skip if database is disabled
      }

      await database.query(`
        INSERT INTO workflow_instances (id, workflow_id, status, input, data, current_node_id, created_at, updated_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          data = EXCLUDED.data,
          current_node_id = EXCLUDED.current_node_id,
          updated_at = NOW(),
          completed_at = EXCLUDED.completed_at
      `, [
        instance.id,
        instance.workflowId,
        instance.status,
        JSON.stringify(instance.input),
        JSON.stringify(instance.data),
        instance.currentNodeId,
        instance.createdAt,
        new Date(),
        instance.completedAt
      ]);
    } catch (error) {
      logger.error(`Failed to persist instance ${instance.id}:`, error.message);
      // Don't throw - allow workflow to continue even if persistence fails
    }
  }

  async loadInstanceFromDB(instanceId) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return null;
      }

      const result = await database.query(
        'SELECT * FROM workflow_instances WHERE id = $1',
        [instanceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const workflow = this.workflows.find(w => w.id === row.workflow_id);

      return new WorkflowInstance({
        id: row.id,
        workflowId: row.workflow_id,
        workflow: workflow,
        status: row.status,
        input: row.input,
        data: row.data,
        currentNodeId: row.current_node_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at
      });
    } catch (error) {
      logger.error(`Failed to load instance ${instanceId}:`, error.message);
      return null;
    }
  }

  async recordWorkflowHistory(instance, nodeId, action, data) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return;
      }

      await database.query(`
        INSERT INTO workflow_history (instance_id, node_id, action, data, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [instance.id, nodeId, action, JSON.stringify(data)]);
    } catch (error) {
      logger.error(`Failed to record history for ${instance.id}:`, error.message);
    }
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
    instance.updatedAt = new Date();

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
      instanceId: instance.id,
      workflow: instance.workflow
    };

    // Record node entry in history
    await this.recordWorkflowHistory(instance, nodeId, 'enter', { nodeType: node.type });

    try {
      const result = await executor(node, context);

      // Record node completion in history
      await this.recordWorkflowHistory(instance, nodeId, result.status, { data: result.data });

      if (result.status === 'completed') {
        instance.data = result.data;

        // Persist state after node completion
        await this.persistInstance(instance);

        // Find next node
        const nextNodeId = result.nextNode || this.getNextNode(instance, nodeId);

        if (nextNodeId) {
          await this.executeNode(instance, nextNodeId);
        } else {
          // Workflow complete
          instance.status = 'completed';
          instance.completedAt = new Date();
          await this.persistInstance(instance);
          logger.info(`Workflow instance completed: ${instance.id}`);
        }
      } else if (result.status === 'waiting') {
        instance.status = 'waiting';
        await this.persistInstance(instance);
        logger.info(`Workflow instance waiting: ${instance.id}`);
      }
    } catch (error) {
      // Record error in history
      await this.recordWorkflowHistory(instance, nodeId, 'error', { error: error.message });

      instance.status = 'failed';
      instance.data = { ...instance.data, _error: error.message };
      await this.persistInstance(instance);

      logger.error(`Workflow instance ${instance.id} failed at node ${nodeId}: ${error.message}`);
      throw error;
    }
  }

  getNextNode(instance, currentNodeId) {
    const connections = instance.workflow.connections || instance.workflow.edges || [];
    const nextConnection = connections.find(c => c.source === currentNodeId);
    return nextConnection?.target;
  }

  async resumeWorkflow(instanceId, data) {
    let instance = this.instances.get(instanceId);

    // Try to load from database if not in memory
    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.data = { ...instance.data, ...data };
    instance.updatedAt = new Date();

    // Persist updated state
    await this.persistInstance(instance);

    await this.executeNode(instance, instance.currentNodeId);
  }

  async completeTask(instanceId, taskData) {
    let instance = this.instances.get(instanceId);

    // Try to load from database if not in memory
    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    // Merge task data into instance data
    const { taskId, ...formData } = taskData;
    instance.data = { ...instance.data, ...formData };
    instance.updatedAt = new Date();

    // Record task completion
    await this.recordWorkflowHistory(instance, instance.currentNodeId, 'task_completed', { taskId, formData });

    // Persist updated state
    await this.persistInstance(instance);

    // Find the next node to execute
    const nextNodeId = this.getNextNode(instance, instance.currentNodeId);

    // Navigation info for the response
    let navigation = {
      workflowComplete: false,
      nextPageId: null,
      nextTaskId: null,
      currentNodeId: instance.currentNodeId
    };

    if (nextNodeId) {
      // Execute the next node
      await this.executeNode(instance, nextNodeId);

      // Get the current node after execution to determine navigation
      const currentNode = instance.workflow.nodes.find(n => n.id === instance.currentNodeId);
      if (currentNode) {
        // Extract navigation from node data
        navigation.nextPageId = currentNode.data?.pageId || currentNode.data?.displayPageId || null;
        navigation.nextTaskId = instance.status === 'waiting' ? instance.currentNodeId : null;
      }
    } else {
      // Workflow complete
      instance.status = 'completed';
      instance.completedAt = new Date();
      await this.persistInstance(instance);
      navigation.workflowComplete = true;
    }

    return {
      instance: instance,
      navigation: navigation
    };
  }

  async claimTask(instanceId, taskId, userId) {
    let instance = this.instances.get(instanceId);

    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    // Record task claim
    instance.data = { ...instance.data, _claimedBy: userId, _claimedAt: new Date() };
    instance.updatedAt = new Date();

    await this.recordWorkflowHistory(instance, taskId, 'task_claimed', { userId });
    await this.persistInstance(instance);

    return instance;
  }

  async getInstance(instanceId) {
    // Check memory first
    let instance = this.instances.get(instanceId);

    // Fallback to database
    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    return instance;
  }

  async getAllInstances(filters = {}) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return Array.from(this.instances.values());
      }

      let query = 'SELECT * FROM workflow_instances';
      const params = [];
      const conditions = [];

      if (filters.status) {
        params.push(filters.status);
        conditions.push(`status = $${params.length}`);
      }

      if (filters.workflowId) {
        params.push(filters.workflowId);
        conditions.push(`workflow_id = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        params.push(filters.limit);
        query += ` LIMIT $${params.length}`;
      }

      const result = await database.query(query, params);

      return result.rows.map(row => {
        const workflow = this.workflows.find(w => w.id === row.workflow_id);
        return new WorkflowInstance({
          id: row.id,
          workflowId: row.workflow_id,
          workflow: workflow,
          status: row.status,
          input: row.input,
          data: row.data,
          currentNodeId: row.current_node_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          completedAt: row.completed_at
        });
      });
    } catch (error) {
      logger.error('Failed to get all instances:', error.message);
      return Array.from(this.instances.values());
    }
  }

  async getInstancesByStatus(status) {
    return this.getAllInstances({ status });
  }

  async getInstancesByWorkflow(workflowId) {
    return this.getAllInstances({ workflowId });
  }
}

module.exports = new RuntimeEngine();
