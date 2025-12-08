/**
 * WorkflowTrigger - Manages workflow triggers of all types
 *
 * Trigger Types:
 * - user_action: Manual start via UI button/action
 * - event: Triggered by events from other workflows
 * - schedule: Cron-based scheduled execution
 * - api: Triggered via REST API call
 * - direct_call: Called directly by another workflow (sub-workflow)
 */

const { v4: uuidv4 } = require('uuid');
const eventBus = require('./EventBus');

class WorkflowTrigger {
  constructor() {
    // Registered workflows and their triggers
    this.registeredWorkflows = new Map(); // workflowId -> workflow config

    // Active schedules
    this.schedules = new Map(); // workflowId -> intervalId

    // Workflow execution handler (set by WorkflowOrchestrator)
    this.executionHandler = null;
  }

  /**
   * Set the execution handler for starting workflows
   * @param {function} handler - (workflowId, input, context) => Promise<result>
   */
  setExecutionHandler(handler) {
    this.executionHandler = handler;
  }

  /**
   * Register a workflow with its triggers
   * @param {object} workflow - Workflow definition
   */
  registerWorkflow(workflow) {
    const workflowId = workflow.id;

    this.registeredWorkflows.set(workflowId, {
      id: workflowId,
      name: workflow.name,
      triggers: workflow.triggers || [],
      inputs: workflow.inputs || [],
      isSubWorkflow: workflow.isSubWorkflow || false
    });

    // Set up each trigger type
    workflow.triggers?.forEach(trigger => {
      this.setupTrigger(workflowId, trigger);
    });

    // If it's a sub-workflow, register for direct calls
    if (workflow.isSubWorkflow) {
      this.registerSubWorkflow(workflowId);
    }

    console.log(`[WorkflowTrigger] Registered workflow: ${workflowId}`, {
      triggers: workflow.triggers?.map(t => t.type) || []
    });
  }

  /**
   * Unregister a workflow
   * @param {string} workflowId - Workflow ID
   */
  unregisterWorkflow(workflowId) {
    const workflow = this.registeredWorkflows.get(workflowId);
    if (!workflow) return;

    // Clean up triggers
    workflow.triggers?.forEach(trigger => {
      this.cleanupTrigger(workflowId, trigger);
    });

    // Unregister from direct calls
    eventBus.unregisterFromDirectCalls(workflowId);

    // Unsubscribe from all events
    eventBus.unsubscribeAll(workflowId);

    this.registeredWorkflows.delete(workflowId);

    console.log(`[WorkflowTrigger] Unregistered workflow: ${workflowId}`);
  }

  /**
   * Set up a specific trigger
   */
  setupTrigger(workflowId, trigger) {
    switch (trigger.type) {
      case 'event':
        this.setupEventTrigger(workflowId, trigger);
        break;
      case 'schedule':
        this.setupScheduleTrigger(workflowId, trigger);
        break;
      case 'api':
        // API triggers are handled by routes, just register the endpoint
        this.registerApiEndpoint(workflowId, trigger);
        break;
      case 'user_action':
        // User action triggers are handled by UI, just store config
        break;
      case 'direct_call':
        // Already handled by registerSubWorkflow
        break;
      default:
        console.warn(`[WorkflowTrigger] Unknown trigger type: ${trigger.type}`);
    }
  }

  /**
   * Clean up a specific trigger
   */
  cleanupTrigger(workflowId, trigger) {
    switch (trigger.type) {
      case 'schedule':
        this.clearSchedule(workflowId);
        break;
      // Other triggers are cleaned up via unsubscribeAll or unregisterFromDirectCalls
    }
  }

  /**
   * Set up an event-based trigger
   */
  setupEventTrigger(workflowId, trigger) {
    const eventPattern = trigger.event; // e.g., "order.completed" or "order.*"

    eventBus.subscribe(eventPattern, workflowId, async (event) => {
      console.log(`[WorkflowTrigger] Event trigger fired for ${workflowId}`, {
        event: event.name,
        correlationId: event.metadata.correlationId
      });

      await this.startWorkflow(workflowId, event.payload, {
        triggeredBy: 'event',
        triggerEvent: event.name,
        correlationId: event.metadata.correlationId,
        sourceWorkflowId: event.metadata.sourceWorkflowId
      });
    });
  }

  /**
   * Set up a schedule-based trigger (cron)
   */
  setupScheduleTrigger(workflowId, trigger) {
    const cronExpression = trigger.cron;

    // Simple interval-based scheduling for now
    // In production, use node-cron or similar
    const interval = this.parseCronToInterval(cronExpression);

    if (interval) {
      const intervalId = setInterval(async () => {
        console.log(`[WorkflowTrigger] Schedule trigger fired for ${workflowId}`);

        await this.startWorkflow(workflowId, {}, {
          triggeredBy: 'schedule',
          scheduleCron: cronExpression,
          scheduledAt: new Date().toISOString()
        });
      }, interval);

      this.schedules.set(workflowId, intervalId);
    }
  }

  /**
   * Parse cron expression to milliseconds interval (simplified)
   * In production, use a proper cron parser
   */
  parseCronToInterval(cron) {
    // Simple patterns for demo
    const patterns = {
      '* * * * *': 60000, // Every minute
      '*/5 * * * *': 300000, // Every 5 minutes
      '*/15 * * * *': 900000, // Every 15 minutes
      '0 * * * *': 3600000, // Every hour
      '0 */2 * * *': 7200000, // Every 2 hours
      '0 0 * * *': 86400000, // Daily at midnight
      '0 9 * * MON': 604800000 // Weekly on Monday 9am
    };

    return patterns[cron] || null;
  }

  /**
   * Clear a scheduled trigger
   */
  clearSchedule(workflowId) {
    const intervalId = this.schedules.get(workflowId);
    if (intervalId) {
      clearInterval(intervalId);
      this.schedules.delete(workflowId);
    }
  }

  /**
   * Register API endpoint (for documentation/routing)
   */
  registerApiEndpoint(workflowId, trigger) {
    // Store API endpoint configuration
    // The actual route handling is done in workflow routes
    console.log(`[WorkflowTrigger] API endpoint registered: ${trigger.endpoint || `/api/workflows/${workflowId}/start`}`);
  }

  /**
   * Register a sub-workflow for direct calls
   */
  registerSubWorkflow(workflowId) {
    eventBus.registerForDirectCalls(workflowId, async (input, context) => {
      console.log(`[WorkflowTrigger] Direct call to sub-workflow: ${workflowId}`);

      const result = await this.startWorkflow(workflowId, input, {
        triggeredBy: 'direct_call',
        ...context
      });

      return result;
    });
  }

  /**
   * Start a workflow execution
   * @param {string} workflowId - Workflow ID
   * @param {object} input - Input data
   * @param {object} context - Trigger context
   * @returns {Promise<object>} - Execution result
   */
  async startWorkflow(workflowId, input, context) {
    if (!this.executionHandler) {
      throw new Error('No execution handler set. Call setExecutionHandler first.');
    }

    const workflow = this.registeredWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = uuidv4();
    const executionContext = {
      executionId,
      workflowId,
      workflowName: workflow.name,
      correlationId: context.correlationId || uuidv4(),
      triggeredBy: context.triggeredBy,
      triggeredAt: new Date().toISOString(),
      ...context
    };

    console.log(`[WorkflowTrigger] Starting workflow execution`, {
      workflowId,
      executionId,
      triggeredBy: context.triggeredBy
    });

    try {
      const result = await this.executionHandler(workflowId, input, executionContext);
      return result;
    } catch (error) {
      console.error(`[WorkflowTrigger] Workflow execution failed`, {
        workflowId,
        executionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Manually trigger a workflow (user action)
   * @param {string} workflowId - Workflow ID
   * @param {object} input - Input data
   * @param {object} userContext - User context
   */
  async triggerManually(workflowId, input, userContext = {}) {
    return this.startWorkflow(workflowId, input, {
      triggeredBy: 'user_action',
      userId: userContext.userId,
      userName: userContext.userName
    });
  }

  /**
   * Trigger via API
   * @param {string} workflowId - Workflow ID
   * @param {object} input - Input data
   * @param {object} requestContext - API request context
   */
  async triggerViaApi(workflowId, input, requestContext = {}) {
    return this.startWorkflow(workflowId, input, {
      triggeredBy: 'api',
      requestId: requestContext.requestId,
      clientIp: requestContext.clientIp,
      userAgent: requestContext.userAgent
    });
  }

  /**
   * Call a sub-workflow directly
   * @param {string} workflowId - Sub-workflow ID
   * @param {object} input - Input data
   * @param {object} parentContext - Parent workflow context
   */
  async callSubWorkflow(workflowId, input, parentContext) {
    return eventBus.callWorkflow(workflowId, input, {
      sourceWorkflowId: parentContext.workflowId,
      sourceNodeId: parentContext.nodeId,
      correlationId: parentContext.correlationId
    });
  }

  /**
   * Get all registered workflows
   */
  getRegisteredWorkflows() {
    return Array.from(this.registeredWorkflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId) {
    return this.registeredWorkflows.get(workflowId);
  }

  /**
   * Check if workflow can be triggered by a specific type
   */
  canTrigger(workflowId, triggerType) {
    const workflow = this.registeredWorkflows.get(workflowId);
    if (!workflow) return false;

    return workflow.triggers.some(t => t.type === triggerType);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      registeredWorkflows: this.registeredWorkflows.size,
      activeSchedules: this.schedules.size,
      subWorkflows: Array.from(this.registeredWorkflows.values())
        .filter(w => w.isSubWorkflow).length
    };
  }

  /**
   * Clear all (for testing)
   */
  clear() {
    // Clear all schedules
    for (const [workflowId] of this.schedules) {
      this.clearSchedule(workflowId);
    }

    // Unregister all workflows
    for (const workflowId of this.registeredWorkflows.keys()) {
      this.unregisterWorkflow(workflowId);
    }
  }
}

// Singleton instance
const workflowTrigger = new WorkflowTrigger();

module.exports = workflowTrigger;
module.exports.WorkflowTrigger = WorkflowTrigger;
