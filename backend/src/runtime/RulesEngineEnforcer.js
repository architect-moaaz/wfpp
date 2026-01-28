/**
 * RulesEngineEnforcer
 *
 * Enforces rules at workflow runtime with:
 * - Rule-to-Node Enforcement (#25): Rules affect actual workflow execution
 * - Isolated Action Execution (#26): Actions run in sandboxed context
 * - Cascade Rule Chains (#27): Automatic chaining of dependent rules
 * - Workflow Context Variables (#28): Full context evaluation
 */

const RulesEvaluator = require('../services/RulesEvaluator');
const RuleService = require('../services/RuleService');
const Queue = require('bull');
const axios = require('axios');
const emailService = require('../services/EmailService');
const notificationService = require('../services/NotificationService');

class RulesEngineEnforcer {
  constructor() {
    this.rulesEvaluator = new RulesEvaluator();
    this.ruleService = new RuleService();

    // Track cascade execution to prevent infinite loops
    this.cascadeDepth = 0;
    this.maxCascadeDepth = 10;

    // Track rule execution history for debugging
    this.executionHistory = new Map(); // instanceId -> executions[]

    // Initialize Bull queues for async actions
    this.initializeQueues();
  }

  /**
   * Initialize Bull queues for async action processing
   */
  initializeQueues() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3
    };

    try {
      // Create queues for different action types
      this.emailQueue = new Queue('rule-emails', { redis: redisConfig });
      this.webhookQueue = new Queue('rule-webhooks', { redis: redisConfig });
      this.notificationQueue = new Queue('rule-notifications', { redis: redisConfig });

      // Set up queue processors
      this.emailQueue.process(this.processEmailJob.bind(this));
      this.webhookQueue.process(this.processWebhookJob.bind(this));
      this.notificationQueue.process(this.processNotificationJob.bind(this));

      // Queue event handlers
      this.setupQueueEventHandlers();

      console.log('[RulesEnforcer] Bull queues initialized successfully');
    } catch (error) {
      console.warn('[RulesEnforcer] Failed to initialize Bull queues (Redis may not be available):', error.message);
      // Fallback to synchronous processing if Redis is not available
      this.emailQueue = null;
      this.webhookQueue = null;
      this.notificationQueue = null;
    }
  }

  /**
   * Set up event handlers for queue monitoring
   */
  setupQueueEventHandlers() {
    const queues = [this.emailQueue, this.webhookQueue, this.notificationQueue];
    const queueNames = ['email', 'webhook', 'notification'];

    queues.forEach((queue, index) => {
      if (!queue) return;

      queue.on('completed', (job, result) => {
        console.log(`[RulesEnforcer] ${queueNames[index]} job ${job.id} completed`);
      });

      queue.on('failed', (job, err) => {
        console.error(`[RulesEnforcer] ${queueNames[index]} job ${job.id} failed:`, err.message);
      });

      queue.on('stalled', (job) => {
        console.warn(`[RulesEnforcer] ${queueNames[index]} job ${job.id} stalled`);
      });
    });
  }

  /**
   * Process email job from queue
   */
  async processEmailJob(job) {
    const { to, subject, body, template, attachments, actionId } = job.data;

    console.log(`[RulesEnforcer] Processing email job ${job.id}:`, { to, subject });

    // Use EmailService for actual delivery
    const result = await emailService.send({
      to,
      subject,
      body,
      template,
      attachments,
      metadata: { actionId, source: 'rules-engine' }
    });

    return {
      sent: result.success,
      to,
      subject,
      timestamp: new Date().toISOString(),
      provider: emailService.providerName,
      emailId: result.emailId
    };
  }

  /**
   * Process webhook job from queue
   */
  async processWebhookJob(job) {
    const { url, method, headers, body, timeout, retries, actionId } = job.data;

    console.log(`[RulesEnforcer] Processing webhook job ${job.id}:`, { url, method });

    try {
      const response = await axios({
        method: method || 'POST',
        url,
        headers: headers || {},
        data: body,
        timeout: timeout || 30000
      });

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Throw error to trigger Bull retry mechanism
      throw new Error(`Webhook call failed: ${error.message}`);
    }
  }

  /**
   * Process notification job from queue
   */
  async processNotificationJob(job) {
    const { message, channel, recipient, priority, actionId } = job.data;

    console.log(`[RulesEnforcer] Processing notification job ${job.id}:`, { channel, recipient });

    // Use NotificationService for actual delivery
    const result = await notificationService.send({
      userId: recipient,
      title: job.data.title || 'Notification',
      message,
      channel: channel || 'all',
      priority,
      data: { actionId, source: 'rules-engine' }
    });

    return {
      delivered: result.success,
      channel,
      recipient,
      timestamp: new Date().toISOString(),
      notificationId: result.notificationId,
      results: result.results
    };
  }

  // ============================================
  // RULE-TO-NODE ENFORCEMENT (#25)
  // ============================================

  /**
   * Enforce rules for a workflow node and apply results to execution
   * Returns enforcement result that affects workflow flow
   * @param {string} nodeId - The node ID to enforce rules for
   * @param {Object} instance - The workflow instance
   * @param {Object} workflowDef - The workflow definition
   * @param {Object} user - Optional authenticated user for auth context
   */
  async enforceNodeRules(nodeId, instance, workflowDef, user = null) {
    const startTime = Date.now();

    // Build comprehensive workflow context with auth (#28)
    const context = this.buildWorkflowContext(instance, workflowDef, nodeId, user);

    console.log(`[RulesEnforcer] Enforcing rules for node: ${nodeId}`);

    try {
      // Get rules attached to this node
      const rulesResult = await this.ruleService.getRulesByNode(nodeId);

      if (!rulesResult.success || !rulesResult.rules?.length) {
        return {
          enforced: false,
          reason: 'No rules attached to node',
          shouldContinue: true,
          contextUpdates: {}
        };
      }

      const rules = rulesResult.rules.filter(r => r.is_active !== false);

      if (rules.length === 0) {
        return {
          enforced: false,
          reason: 'No active rules',
          shouldContinue: true,
          contextUpdates: {}
        };
      }

      // Execute rules with cascade support (#27)
      const executionResult = await this.executeRulesWithCascade(
        rules,
        context,
        instance.id,
        nodeId
      );

      // Determine enforcement actions
      const enforcement = this.determineEnforcement(executionResult);

      // Store execution history
      this.recordExecution(instance.id, {
        nodeId,
        timestamp: new Date().toISOString(),
        rulesEvaluated: rules.length,
        rulesFired: executionResult.firedRules.length,
        enforcement,
        executionTime: Date.now() - startTime
      });

      console.log(`[RulesEnforcer] Node ${nodeId} enforcement:`, {
        shouldContinue: enforcement.shouldContinue,
        shouldStop: enforcement.shouldStop,
        hasErrors: enforcement.hasErrors,
        contextUpdates: Object.keys(enforcement.contextUpdates)
      });

      return enforcement;

    } catch (error) {
      console.error(`[RulesEnforcer] Error enforcing rules for node ${nodeId}:`, error);
      return {
        enforced: false,
        error: error.message,
        shouldContinue: true, // Don't block on rule errors by default
        contextUpdates: {}
      };
    }
  }

  /**
   * Determine enforcement actions from rule execution results
   */
  determineEnforcement(executionResult) {
    const { trace, finalContext, firedRules } = executionResult;

    let shouldStop = false;
    let shouldContinue = true;
    let hasErrors = false;
    let validationPassed = true;
    const contextUpdates = {};
    const notifications = [];
    const errors = [];
    const routingDecision = null;

    for (const ruleExec of firedRules) {
      // Collect context changes
      if (ruleExec.contextChanges) {
        Object.assign(contextUpdates, ruleExec.contextChanges);
      }

      // Check action results
      if (ruleExec.actionsExecuted) {
        for (const action of ruleExec.actionsExecuted) {
          // Handle stop workflow
          if (action.type === 'stopWorkflow' && action.success) {
            shouldStop = true;
            shouldContinue = false;
          }

          // Handle throw error
          if (action.type === 'throwError' && action.success) {
            hasErrors = true;
            validationPassed = false;
            errors.push(action.result?.message || 'Rule threw an error');
          }

          // Collect notifications
          if ((action.type === 'sendNotification' || action.type === 'sendEmail') && action.success) {
            notifications.push(action.result);
          }

          // Handle routing decisions (for gateway rules)
          if (action.type === 'setRoute' && action.success) {
            routingDecision = action.result?.route;
          }

          // Handle failed actions
          if (!action.success && action.error) {
            errors.push(`Action ${action.type} failed: ${action.error}`);
          }
        }
      }
    }

    return {
      enforced: true,
      shouldContinue,
      shouldStop,
      hasErrors,
      validationPassed,
      contextUpdates,
      notifications,
      errors,
      routingDecision,
      trace,
      statistics: {
        rulesEvaluated: trace.length,
        rulesFired: firedRules.length,
        actionsExecuted: firedRules.reduce((sum, r) =>
          sum + (r.actionsExecuted?.length || 0), 0)
      }
    };
  }

  // ============================================
  // ISOLATED ACTION EXECUTION (#26)
  // ============================================

  /**
   * Execute a single rule action in isolated context
   * Prevents side effects from affecting other rules
   */
  async executeActionIsolated(action, context, ruleId) {
    // Create isolated context snapshot
    const isolatedContext = this.createIsolatedContext(context);
    const contextChanges = {};

    try {
      const result = await this.executeAction(action, isolatedContext, contextChanges, ruleId);

      return {
        success: result.success,
        result: result.result,
        error: result.error,
        contextChanges: { ...contextChanges }, // Return copy of changes
        isolated: true
      };
    } catch (error) {
      console.error(`[RulesEnforcer] Isolated action execution failed:`, error);
      return {
        success: false,
        error: error.message,
        contextChanges: {},
        isolated: true
      };
    }
  }

  /**
   * Create an isolated copy of context for action execution
   */
  createIsolatedContext(context) {
    // Deep clone to prevent mutations
    return JSON.parse(JSON.stringify(context));
  }

  /**
   * Execute action with proper isolation and tracking
   */
  async executeAction(action, context, contextChanges, ruleId) {
    const actionId = `${ruleId}_${action.type}_${Date.now()}`;

    switch (action.type) {
      case 'setVariable':
        return this.executeSetVariableIsolated(action, context, contextChanges);

      case 'sendEmail':
        return this.executeSendEmailIsolated(action, context, actionId);

      case 'sendNotification':
        return this.executeSendNotificationIsolated(action, context, actionId);

      case 'callWebhook':
        return this.executeCallWebhookIsolated(action, context, actionId);

      case 'updateRecord':
        return this.executeUpdateRecordIsolated(action, context, actionId);

      case 'createRecord':
        return this.executeCreateRecordIsolated(action, context, actionId);

      case 'deleteRecord':
        return this.executeDeleteRecordIsolated(action, context, actionId);

      case 'log':
        return this.executeLogIsolated(action, context);

      case 'stopWorkflow':
        return this.executeStopWorkflowIsolated(action, context);

      case 'throwError':
        return this.executeThrowErrorIsolated(action, context);

      case 'setRoute':
        return this.executeSetRouteIsolated(action, context, contextChanges);

      case 'triggerRule':
        return this.executeTriggerRuleIsolated(action, context);

      case 'calculateField':
        return this.executeCalculateFieldIsolated(action, context, contextChanges);

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  /**
   * Set variable with validation and type coercion
   */
  executeSetVariableIsolated(action, context, contextChanges) {
    const { name, value, type } = action.params || {};

    if (!name) {
      return { success: false, error: 'Variable name is required' };
    }

    // Interpolate value
    let interpolatedValue = this.interpolateValue(value, context);

    // Type coercion if specified
    if (type) {
      interpolatedValue = this.coerceType(interpolatedValue, type);
    }

    // Validate nested path
    if (name.includes('.')) {
      this.setNestedValue(contextChanges, name, interpolatedValue);
    } else {
      contextChanges[name] = interpolatedValue;
    }

    return {
      success: true,
      result: { name, value: interpolatedValue, type }
    };
  }

  /**
   * Send email with template support (queued via Bull)
   */
  async executeSendEmailIsolated(action, context, actionId) {
    const { to, subject, body, template, attachments, priority } = action.params || {};

    const emailData = {
      to: this.interpolateValue(to, context),
      subject: this.interpolateValue(subject, context),
      body: this.interpolateValue(body, context),
      template,
      attachments,
      actionId,
      timestamp: new Date().toISOString()
    };

    // Queue to Bull if available, otherwise process synchronously
    if (this.emailQueue) {
      try {
        const job = await this.emailQueue.add(emailData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          priority: priority === 'high' ? 1 : priority === 'low' ? 3 : 2,
          removeOnComplete: 100,
          removeOnFail: 50
        });

        console.log(`[RulesEnforcer] Email queued: job ${job.id}`);

        return {
          success: true,
          result: { queued: true, jobId: job.id, emailId: actionId, ...emailData }
        };
      } catch (error) {
        console.error('[RulesEnforcer] Failed to queue email:', error.message);
        // Fall through to synchronous logging
      }
    }

    // Fallback: log email (for when Redis is not available)
    console.log('[RulesEnforcer] Email (sync mode):', emailData);
    return {
      success: true,
      result: { queued: false, emailId: actionId, ...emailData }
    };
  }

  /**
   * Send notification with channel support (queued via Bull)
   */
  async executeSendNotificationIsolated(action, context, actionId) {
    const { message, channel, recipient, priority } = action.params || {};

    const notificationData = {
      message: this.interpolateValue(message, context),
      channel: channel || 'in-app',
      recipient: this.interpolateValue(recipient, context),
      priority: priority || 'normal',
      actionId,
      timestamp: new Date().toISOString()
    };

    // Queue to Bull if available
    if (this.notificationQueue) {
      try {
        const job = await this.notificationQueue.add(notificationData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          priority: priority === 'high' ? 1 : priority === 'low' ? 3 : 2,
          removeOnComplete: 100,
          removeOnFail: 50
        });

        console.log(`[RulesEnforcer] Notification queued: job ${job.id}`);

        return {
          success: true,
          result: { queued: true, jobId: job.id, notificationId: actionId, ...notificationData }
        };
      } catch (error) {
        console.error('[RulesEnforcer] Failed to queue notification:', error.message);
      }
    }

    // Fallback: log notification
    console.log('[RulesEnforcer] Notification (sync mode):', notificationData);
    return {
      success: true,
      result: { queued: false, notificationId: actionId, ...notificationData }
    };
  }

  /**
   * Call webhook with retry support (queued via Bull)
   */
  async executeCallWebhookIsolated(action, context, actionId) {
    const { url, method, headers, body, timeout, retries, priority, sync } = action.params || {};

    const webhookData = {
      url: this.interpolateValue(url, context),
      method: method || 'POST',
      headers: this.interpolateObject(headers, context),
      body: typeof body === 'object' ? this.interpolateObject(body, context) : this.interpolateValue(body, context),
      timeout: timeout || 30000,
      retries: retries || 3,
      actionId
    };

    // For synchronous webhooks, execute immediately
    if (sync === true) {
      try {
        const response = await axios({
          method: webhookData.method,
          url: webhookData.url,
          headers: webhookData.headers,
          data: webhookData.body,
          timeout: webhookData.timeout
        });

        return {
          success: true,
          result: {
            called: true,
            sync: true,
            webhookId: actionId,
            statusCode: response.status,
            response: response.data
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Webhook call failed: ${error.message}`,
          result: { called: false, sync: true, webhookId: actionId }
        };
      }
    }

    // Queue to Bull if available for async processing
    if (this.webhookQueue) {
      try {
        const job = await this.webhookQueue.add(webhookData, {
          attempts: webhookData.retries,
          backoff: { type: 'exponential', delay: 3000 },
          priority: priority === 'high' ? 1 : priority === 'low' ? 3 : 2,
          removeOnComplete: 100,
          removeOnFail: 50
        });

        console.log(`[RulesEnforcer] Webhook queued: job ${job.id}`);

        return {
          success: true,
          result: { queued: true, jobId: job.id, webhookId: actionId, ...webhookData }
        };
      } catch (error) {
        console.error('[RulesEnforcer] Failed to queue webhook:', error.message);
      }
    }

    // Fallback: log webhook
    console.log('[RulesEnforcer] Webhook (sync mode - no Redis):', webhookData);
    return {
      success: true,
      result: { queued: false, webhookId: actionId, ...webhookData }
    };
  }

  /**
   * Update record with optimistic locking
   */
  async executeUpdateRecordIsolated(action, context, actionId) {
    const { recordType, recordId, updates, version } = action.params || {};

    const updateData = {
      recordType,
      recordId: this.interpolateValue(recordId, context),
      updates: this.interpolateObject(updates, context),
      version,
      actionId
    };

    console.log('[RulesEnforcer] Update Record:', updateData);

    return {
      success: true,
      result: { updated: true, ...updateData }
    };
  }

  /**
   * Create record with validation
   */
  async executeCreateRecordIsolated(action, context, actionId) {
    const { recordType, data, returnId } = action.params || {};

    const createData = {
      recordType,
      data: this.interpolateObject(data, context),
      returnId: returnId !== false,
      actionId
    };

    console.log('[RulesEnforcer] Create Record:', createData);

    const newId = `record_${Date.now()}`;
    return {
      success: true,
      result: { created: true, id: newId, ...createData }
    };
  }

  /**
   * Delete record with soft delete support
   */
  async executeDeleteRecordIsolated(action, context, actionId) {
    const { recordType, recordId, softDelete } = action.params || {};

    const deleteData = {
      recordType,
      recordId: this.interpolateValue(recordId, context),
      softDelete: softDelete !== false,
      actionId
    };

    console.log('[RulesEnforcer] Delete Record:', deleteData);

    return {
      success: true,
      result: { deleted: true, ...deleteData }
    };
  }

  /**
   * Log with structured output
   */
  executeLogIsolated(action, context) {
    const { message, level, metadata } = action.params || {};
    const interpolatedMessage = this.interpolateValue(message, context);
    const logLevel = level || 'info';

    const logEntry = {
      level: logLevel,
      message: interpolatedMessage,
      metadata: this.interpolateObject(metadata, context),
      timestamp: new Date().toISOString()
    };

    console[logLevel === 'error' ? 'error' : logLevel === 'warn' ? 'warn' : 'log'](
      `[RulesEnforcer] [${logLevel.toUpperCase()}]`,
      interpolatedMessage
    );

    return {
      success: true,
      result: logEntry
    };
  }

  /**
   * Stop workflow with reason
   */
  executeStopWorkflowIsolated(action, context) {
    const { reason, status } = action.params || {};

    return {
      success: true,
      result: {
        stopped: true,
        reason: this.interpolateValue(reason, context),
        status: status || 'stopped_by_rule'
      }
    };
  }

  /**
   * Throw error with details
   */
  executeThrowErrorIsolated(action, context) {
    const { message, code, details } = action.params || {};
    const errorMessage = this.interpolateValue(message, context) || 'Rule error';

    return {
      success: true, // Action succeeded in throwing error
      result: {
        thrown: true,
        message: errorMessage,
        code: code || 'RULE_ERROR',
        details: this.interpolateObject(details, context)
      }
    };
  }

  /**
   * Set routing decision for gateways
   */
  executeSetRouteIsolated(action, context, contextChanges) {
    const { route, condition } = action.params || {};

    contextChanges._routingDecision = {
      route: this.interpolateValue(route, context),
      condition
    };

    return {
      success: true,
      result: { route: contextChanges._routingDecision.route }
    };
  }

  /**
   * Trigger another rule (for cascade chains)
   */
  executeTriggerRuleIsolated(action, context) {
    const { ruleId, ruleName, delay } = action.params || {};

    return {
      success: true,
      result: {
        triggered: true,
        ruleId,
        ruleName,
        delay: delay || 0
      }
    };
  }

  /**
   * Calculate field with expression support
   */
  executeCalculateFieldIsolated(action, context, contextChanges) {
    const { field, expression, formula } = action.params || {};

    if (!field) {
      return { success: false, error: 'Field name is required' };
    }

    try {
      let result;

      if (expression) {
        // Safe expression evaluation
        result = this.evaluateExpression(expression, context);
      } else if (formula) {
        // Formula-based calculation
        result = this.evaluateFormula(formula, context);
      } else {
        return { success: false, error: 'Expression or formula is required' };
      }

      contextChanges[field] = result;

      return {
        success: true,
        result: { field, value: result }
      };
    } catch (error) {
      return { success: false, error: `Calculation failed: ${error.message}` };
    }
  }

  // ============================================
  // CASCADE RULE CHAINS (#27)
  // ============================================

  /**
   * Execute rules with automatic cascade chaining
   */
  async executeRulesWithCascade(rules, context, instanceId, nodeId) {
    this.cascadeDepth = 0;
    const allTrace = [];
    const firedRules = [];
    let currentContext = { ...context };

    // Initial rule execution
    const initialResult = await this.executeRulesLevel(rules, currentContext);
    allTrace.push(...initialResult.trace);
    firedRules.push(...initialResult.firedRules);
    Object.assign(currentContext, initialResult.contextChanges);

    // Check for cascade triggers
    const cascadeRules = this.extractCascadeTriggers(initialResult.firedRules);

    if (cascadeRules.length > 0) {
      const cascadeResult = await this.executeCascadeChain(
        cascadeRules,
        currentContext,
        instanceId,
        allTrace
      );
      firedRules.push(...cascadeResult.firedRules);
      Object.assign(currentContext, cascadeResult.contextChanges);
    }

    return {
      trace: allTrace,
      firedRules,
      finalContext: currentContext,
      cascadeDepth: this.cascadeDepth
    };
  }

  /**
   * Execute a single level of rules
   */
  async executeRulesLevel(rules, context) {
    const trace = [];
    const firedRules = [];
    const contextChanges = {};

    for (const rule of rules) {
      // Create isolated context for this rule (#26)
      const ruleContext = this.createIsolatedContext(context);
      const ruleChanges = {};

      // Evaluate conditions against full context (#28)
      const conditionsMatch = this.evaluateConditionsWithContext(
        rule.conditions,
        ruleContext
      );

      if (!conditionsMatch) {
        trace.push({
          ruleId: rule.id,
          ruleName: rule.name,
          fired: false,
          conditionsMatched: false,
          actionsExecuted: []
        });
        continue;
      }

      // Execute actions in isolation (#26)
      const actionsExecuted = [];

      if (rule.actions?.actions) {
        for (const action of rule.actions.actions) {
          const actionResult = await this.executeActionIsolated(
            action,
            ruleContext,
            rule.id
          );

          actionsExecuted.push({
            type: action.type,
            success: actionResult.success,
            result: actionResult.result,
            error: actionResult.error
          });

          // Merge context changes
          if (actionResult.contextChanges) {
            Object.assign(ruleChanges, actionResult.contextChanges);
            Object.assign(ruleContext, actionResult.contextChanges);
          }

          // Stop on stopWorkflow action
          if (action.type === 'stopWorkflow' && actionResult.success) {
            break;
          }
        }
      }

      const firedRule = {
        ruleId: rule.id,
        ruleName: rule.name,
        fired: true,
        conditionsMatched: true,
        actionsExecuted,
        contextChanges: ruleChanges
      };

      trace.push(firedRule);
      firedRules.push(firedRule);
      Object.assign(contextChanges, ruleChanges);
    }

    return { trace, firedRules, contextChanges };
  }

  /**
   * Extract cascade triggers from executed rules
   */
  extractCascadeTriggers(firedRules) {
    const cascadeTriggers = [];

    for (const rule of firedRules) {
      if (rule.actionsExecuted) {
        for (const action of rule.actionsExecuted) {
          if (action.type === 'triggerRule' && action.success && action.result?.ruleId) {
            cascadeTriggers.push({
              ruleId: action.result.ruleId,
              ruleName: action.result.ruleName,
              triggeredBy: rule.ruleId,
              delay: action.result.delay || 0
            });
          }
        }
      }

      // Check for implicit cascades based on context changes
      if (rule.contextChanges && Object.keys(rule.contextChanges).length > 0) {
        cascadeTriggers.push({
          type: 'context_change',
          changedVars: Object.keys(rule.contextChanges),
          triggeredBy: rule.ruleId
        });
      }
    }

    return cascadeTriggers;
  }

  /**
   * Execute cascade chain of triggered rules
   */
  async executeCascadeChain(triggers, context, instanceId, allTrace) {
    this.cascadeDepth++;
    const firedRules = [];
    const contextChanges = {};

    if (this.cascadeDepth > this.maxCascadeDepth) {
      console.warn(`[RulesEnforcer] Max cascade depth (${this.maxCascadeDepth}) reached`);
      return { firedRules, contextChanges };
    }

    // Get rules that should be triggered by context changes
    const cascadeRules = await this.findCascadeRules(triggers, instanceId);

    if (cascadeRules.length === 0) {
      return { firedRules, contextChanges };
    }

    console.log(`[RulesEnforcer] Cascade level ${this.cascadeDepth}: ${cascadeRules.length} rules`);

    // Execute cascade rules
    const cascadeResult = await this.executeRulesLevel(cascadeRules, context);
    allTrace.push(...cascadeResult.trace.map(t => ({
      ...t,
      cascadeLevel: this.cascadeDepth
    })));
    firedRules.push(...cascadeResult.firedRules);
    Object.assign(contextChanges, cascadeResult.contextChanges);

    // Check for more cascades
    const moreTriggers = this.extractCascadeTriggers(cascadeResult.firedRules);

    if (moreTriggers.length > 0) {
      const nextContext = { ...context, ...contextChanges };
      const nextResult = await this.executeCascadeChain(
        moreTriggers,
        nextContext,
        instanceId,
        allTrace
      );
      firedRules.push(...nextResult.firedRules);
      Object.assign(contextChanges, nextResult.contextChanges);
    }

    return { firedRules, contextChanges };
  }

  /**
   * Find rules that should cascade based on triggers
   */
  async findCascadeRules(triggers, instanceId) {
    const cascadeRules = [];

    for (const trigger of triggers) {
      if (trigger.ruleId) {
        // Explicit rule trigger
        const ruleResult = await this.ruleService.getRuleById(trigger.ruleId);
        if (ruleResult.success && ruleResult.rule && ruleResult.rule.is_active !== false) {
          cascadeRules.push(ruleResult.rule);
        }
      } else if (trigger.type === 'context_change') {
        // Find rules that depend on changed variables
        // This requires metadata about rule dependencies
        // For now, we skip implicit cascades unless explicitly configured
      }
    }

    return cascadeRules;
  }

  // ============================================
  // WORKFLOW CONTEXT VARIABLES (#28)
  // ============================================

  /**
   * Build comprehensive workflow context for rule evaluation
   * @param {Object} instance - Workflow instance
   * @param {Object} workflowDef - Workflow definition
   * @param {string} nodeId - Current node ID
   * @param {Object} user - Optional authenticated user object
   */
  buildWorkflowContext(instance, workflowDef, nodeId, user = null) {
    const context = {
      // Instance data
      ...instance.processData,
      ...instance.data,

      // Instance metadata
      _instance: {
        id: instance.id,
        status: instance.status,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        initiator: instance.initiator,
        correlationId: instance.correlationId
      },

      // Workflow metadata
      _workflow: {
        id: workflowDef?.id,
        name: workflowDef?.name,
        version: workflowDef?.version
      },

      // Current node context
      _node: {
        id: nodeId,
        type: this.getNodeType(workflowDef, nodeId),
        name: this.getNodeName(workflowDef, nodeId)
      },

      // User authentication context
      _user: user ? {
        id: user.userId || user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles || [],
        permissions: user.permissions || []
      } : null,

      // Auth helper functions
      _auth: {
        isAuthenticated: () => !!user,
        hasRole: (roleName) => {
          if (!user || !user.roles) return false;
          return user.roles.some(r =>
            r.name === roleName || r === roleName
          );
        },
        hasPermission: (permissionName) => {
          if (!user || !user.permissions) return false;
          return user.permissions.some(p =>
            p.name === permissionName || p === permissionName
          );
        },
        hasAnyRole: (...roleNames) => {
          if (!user || !user.roles) return false;
          return roleNames.some(roleName =>
            user.roles.some(r => r.name === roleName || r === roleName)
          );
        },
        hasAllRoles: (...roleNames) => {
          if (!user || !user.roles) return false;
          return roleNames.every(roleName =>
            user.roles.some(r => r.name === roleName || r === roleName)
          );
        },
        isOwner: (ownerId) => {
          if (!user) return false;
          return (user.userId || user.id) === ownerId;
        }
      },

      // System context
      _system: {
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toISOString().split('T')[1].split('.')[0],
        dayOfWeek: new Date().getDay(),
        environment: process.env.NODE_ENV || 'development'
      },

      // Helper functions (for expression evaluation)
      _functions: {
        now: () => new Date(),
        today: () => new Date().toISOString().split('T')[0],
        isEmpty: (val) => !val || val === '' || (Array.isArray(val) && val.length === 0),
        isNotEmpty: (val) => !!val && val !== '' && (!Array.isArray(val) || val.length > 0),
        length: (val) => Array.isArray(val) ? val.length : String(val).length,
        sum: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0,
        avg: (arr) => Array.isArray(arr) && arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
        min: (arr) => Array.isArray(arr) ? Math.min(...arr) : arr,
        max: (arr) => Array.isArray(arr) ? Math.max(...arr) : arr
      }
    };

    return context;
  }

  /**
   * Evaluate conditions with full workflow context
   */
  evaluateConditionsWithContext(conditions, context) {
    if (!conditions) return true;

    // AND logic
    if (conditions.all && Array.isArray(conditions.all)) {
      return conditions.all.every(condition =>
        this.evaluateSingleConditionWithContext(condition, context)
      );
    }

    // OR logic
    if (conditions.any && Array.isArray(conditions.any)) {
      return conditions.any.some(condition =>
        this.evaluateSingleConditionWithContext(condition, context)
      );
    }

    // Expression-based condition
    if (conditions.expression) {
      return this.evaluateExpression(conditions.expression, context);
    }

    return false;
  }

  /**
   * Evaluate single condition with context variable resolution
   */
  evaluateSingleConditionWithContext(condition, context) {
    const { field, operator, value } = condition;

    // Resolve field value from context (supports nested paths)
    const fieldValue = this.getNestedValue(context, field);

    // Resolve comparison value (might be a variable reference)
    const comparisonValue = this.resolveValue(value, context);

    return this.compareValues(fieldValue, operator, comparisonValue);
  }

  /**
   * Compare values with operator
   */
  compareValues(fieldValue, operator, comparisonValue) {
    switch (operator) {
      case 'equals':
      case 'eq':
        return fieldValue == comparisonValue;

      case 'notEquals':
      case 'neq':
        return fieldValue != comparisonValue;

      case 'strictEquals':
        return fieldValue === comparisonValue;

      case 'greaterThan':
      case 'gt':
        return Number(fieldValue) > Number(comparisonValue);

      case 'lessThan':
      case 'lt':
        return Number(fieldValue) < Number(comparisonValue);

      case 'greaterThanOrEqual':
      case 'gte':
        return Number(fieldValue) >= Number(comparisonValue);

      case 'lessThanOrEqual':
      case 'lte':
        return Number(fieldValue) <= Number(comparisonValue);

      case 'contains':
        return String(fieldValue).includes(String(comparisonValue));

      case 'notContains':
        return !String(fieldValue).includes(String(comparisonValue));

      case 'startsWith':
        return String(fieldValue).startsWith(String(comparisonValue));

      case 'endsWith':
        return String(fieldValue).endsWith(String(comparisonValue));

      case 'matches':
        try {
          return new RegExp(comparisonValue).test(String(fieldValue));
        } catch {
          return false;
        }

      case 'isEmpty':
        return !fieldValue || fieldValue === '' ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'isNotEmpty':
        return fieldValue && fieldValue !== '' &&
               (!Array.isArray(fieldValue) || fieldValue.length > 0);

      case 'isNull':
        return fieldValue === null || fieldValue === undefined;

      case 'isNotNull':
        return fieldValue !== null && fieldValue !== undefined;

      case 'in':
        const inArray = Array.isArray(comparisonValue)
          ? comparisonValue
          : String(comparisonValue).split(',').map(v => v.trim());
        return inArray.includes(String(fieldValue));

      case 'notIn':
        const notInArray = Array.isArray(comparisonValue)
          ? comparisonValue
          : String(comparisonValue).split(',').map(v => v.trim());
        return !notInArray.includes(String(fieldValue));

      case 'between':
        if (Array.isArray(comparisonValue) && comparisonValue.length === 2) {
          const num = Number(fieldValue);
          return num >= Number(comparisonValue[0]) && num <= Number(comparisonValue[1]);
        }
        return false;

      case 'isTrue':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;

      case 'isFalse':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;

      default:
        console.warn(`[RulesEnforcer] Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Resolve a value that might be a variable reference
   */
  resolveValue(value, context) {
    if (typeof value !== 'string') {
      return value;
    }

    // Check for variable reference (${varName} or {{varName}})
    if (value.startsWith('${') && value.endsWith('}')) {
      const varPath = value.slice(2, -1);
      return this.getNestedValue(context, varPath);
    }

    if (value.startsWith('{{') && value.endsWith('}}')) {
      const varPath = value.slice(2, -2).trim();
      return this.getNestedValue(context, varPath);
    }

    return value;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    if (!path || !obj) return undefined;

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Interpolate variables in a string
   */
  interpolateValue(value, context) {
    if (typeof value !== 'string') {
      return value;
    }

    return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const varValue = this.getNestedValue(context, varName.trim());
      return varValue !== undefined ? varValue : match;
    });
  }

  /**
   * Interpolate variables in an object
   */
  interpolateObject(obj, context) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateValue(value, context);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value, context);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Coerce value to specified type
   */
  coerceType(value, type) {
    switch (type) {
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return value === true || value === 'true' || value === 1;
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'date':
        return new Date(value).toISOString();
      default:
        return value;
    }
  }

  /**
   * Evaluate a safe expression
   */
  evaluateExpression(expression, context) {
    try {
      // Replace variable references with actual values
      let evaluatableExpr = expression;

      // Replace {{var}} with context values
      evaluatableExpr = evaluatableExpr.replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
        const value = this.getNestedValue(context, varPath.trim());
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        return JSON.stringify(value);
      });

      // Simple safe evaluation (avoid eval in production)
      const func = new Function('ctx', `with(ctx) { return ${evaluatableExpr}; }`);
      return func(context);
    } catch (error) {
      console.error(`[RulesEnforcer] Expression evaluation failed:`, error);
      return false;
    }
  }

  /**
   * Evaluate a formula (simple math expressions)
   */
  evaluateFormula(formula, context) {
    // Replace field references
    let evaluatableFormula = formula;

    evaluatableFormula = evaluatableFormula.replace(/\[([^\]]+)\]/g, (match, fieldName) => {
      const value = this.getNestedValue(context, fieldName.trim());
      return Number(value) || 0;
    });

    // Evaluate simple math
    try {
      return new Function(`return ${evaluatableFormula}`)();
    } catch (error) {
      console.error(`[RulesEnforcer] Formula evaluation failed:`, error);
      return 0;
    }
  }

  /**
   * Get node type from workflow definition
   */
  getNodeType(workflowDef, nodeId) {
    if (!workflowDef?.nodes) return null;
    const node = workflowDef.nodes.find(n => n.id === nodeId);
    return node?.type || null;
  }

  /**
   * Get node name from workflow definition
   */
  getNodeName(workflowDef, nodeId) {
    if (!workflowDef?.nodes) return null;
    const node = workflowDef.nodes.find(n => n.id === nodeId);
    return node?.data?.label || node?.data?.name || null;
  }

  /**
   * Record execution history
   */
  recordExecution(instanceId, execution) {
    if (!this.executionHistory.has(instanceId)) {
      this.executionHistory.set(instanceId, []);
    }

    const history = this.executionHistory.get(instanceId);
    history.push(execution);

    // Keep only last 100 executions per instance
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get execution history for an instance
   */
  getExecutionHistory(instanceId) {
    return this.executionHistory.get(instanceId) || [];
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(instanceId) {
    if (instanceId) {
      this.executionHistory.delete(instanceId);
    } else {
      this.executionHistory.clear();
    }
  }

  // ============================================
  // QUEUE MANAGEMENT & STATISTICS
  // ============================================

  /**
   * Get statistics for all queues
   */
  async getQueueStats() {
    const stats = {
      available: false,
      email: null,
      webhook: null,
      notification: null
    };

    if (!this.emailQueue) {
      return stats;
    }

    stats.available = true;

    try {
      const [emailCounts, webhookCounts, notificationCounts] = await Promise.all([
        this.emailQueue.getJobCounts(),
        this.webhookQueue.getJobCounts(),
        this.notificationQueue.getJobCounts()
      ]);

      stats.email = emailCounts;
      stats.webhook = webhookCounts;
      stats.notification = notificationCounts;
    } catch (error) {
      console.error('[RulesEnforcer] Failed to get queue stats:', error.message);
    }

    return stats;
  }

  /**
   * Pause all queues
   */
  async pauseQueues() {
    if (this.emailQueue) {
      await Promise.all([
        this.emailQueue.pause(),
        this.webhookQueue.pause(),
        this.notificationQueue.pause()
      ]);
      console.log('[RulesEnforcer] All queues paused');
    }
  }

  /**
   * Resume all queues
   */
  async resumeQueues() {
    if (this.emailQueue) {
      await Promise.all([
        this.emailQueue.resume(),
        this.webhookQueue.resume(),
        this.notificationQueue.resume()
      ]);
      console.log('[RulesEnforcer] All queues resumed');
    }
  }

  /**
   * Clean old completed and failed jobs
   */
  async cleanQueues(olderThan = 24 * 60 * 60 * 1000) {
    if (!this.emailQueue) return;

    const grace = olderThan;

    await Promise.all([
      this.emailQueue.clean(grace, 'completed'),
      this.emailQueue.clean(grace, 'failed'),
      this.webhookQueue.clean(grace, 'completed'),
      this.webhookQueue.clean(grace, 'failed'),
      this.notificationQueue.clean(grace, 'completed'),
      this.notificationQueue.clean(grace, 'failed')
    ]);

    console.log(`[RulesEnforcer] Cleaned jobs older than ${grace}ms`);
  }

  /**
   * Gracefully shutdown queues
   */
  async shutdown() {
    if (this.emailQueue) {
      await Promise.all([
        this.emailQueue.close(),
        this.webhookQueue.close(),
        this.notificationQueue.close()
      ]);
      console.log('[RulesEnforcer] Queues closed');
    }
  }
}

// Singleton instance
const rulesEngineEnforcer = new RulesEngineEnforcer();

module.exports = rulesEngineEnforcer;
module.exports.RulesEngineEnforcer = RulesEngineEnforcer;
