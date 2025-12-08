/**
 * MultiWorkflowOrchestrator - Manages execution of multiple workflows in an application
 *
 * Features:
 * - Register and manage multiple workflows
 * - Handle workflow connections (events, direct calls)
 * - Coordinate parallel and sequential execution
 * - Track workflow execution across the application
 */

const { v4: uuidv4 } = require('uuid');
const eventBus = require('./EventBus');
const messageStore = require('./MessageStore');
const workflowTrigger = require('./WorkflowTrigger');
const SubWorkflowNode = require('./nodes/SubWorkflowNode');

class MultiWorkflowOrchestrator {
  constructor() {
    this.applicationId = null;
    this.workflows = new Map(); // workflowId -> workflow definition
    this.connections = []; // Workflow connections
    this.executionInstances = new Map(); // executionId -> execution state
    this.isInitialized = false;

    // Set execution handler for workflow trigger
    workflowTrigger.setExecutionHandler(this.executeWorkflow.bind(this));
  }

  /**
   * Initialize orchestrator for an application
   * @param {string} applicationId - Application ID
   * @param {object[]} workflows - Array of workflow definitions
   * @param {object[]} connections - Workflow connections
   */
  async initialize(applicationId, workflows, connections = []) {
    console.log(`[MultiWorkflowOrchestrator] Initializing for application: ${applicationId}`);

    this.applicationId = applicationId;
    this.connections = connections;

    // Register all workflows
    for (const workflow of workflows) {
      await this.registerWorkflow(workflow);
    }

    // Set up connections
    this.setupConnections();

    this.isInitialized = true;

    console.log(`[MultiWorkflowOrchestrator] Initialized with ${this.workflows.size} workflows`);

    return {
      applicationId,
      workflowCount: this.workflows.size,
      connectionCount: this.connections.length
    };
  }

  /**
   * Register a workflow
   */
  async registerWorkflow(workflow) {
    const workflowId = workflow.id;

    // Enhance workflow with default triggers if not specified
    const enhancedWorkflow = {
      ...workflow,
      triggers: workflow.triggers || [{ type: 'user_action' }],
      inputs: workflow.inputs || [],
      outputs: workflow.outputs || [],
      isSubWorkflow: workflow.isSubWorkflow || false
    };

    this.workflows.set(workflowId, enhancedWorkflow);

    // Register with trigger system
    workflowTrigger.registerWorkflow(enhancedWorkflow);

    console.log(`[MultiWorkflowOrchestrator] Registered workflow: ${workflowId}`);
  }

  /**
   * Set up workflow connections
   */
  setupConnections() {
    for (const connection of this.connections) {
      const { source, target, via, event } = connection;

      if (via === 'event' && event) {
        // Set up event-based connection
        const sourceWorkflow = this.workflows.get(source);
        if (sourceWorkflow) {
          // Ensure source workflow emits the event
          if (!sourceWorkflow.events) {
            sourceWorkflow.events = { emits: [], listensTo: [] };
          }
          if (!sourceWorkflow.events.emits.includes(event)) {
            sourceWorkflow.events.emits.push(event);
          }
        }

        // Target workflow listens to the event
        const targetWorkflow = this.workflows.get(target);
        if (targetWorkflow) {
          // Add event trigger if not exists
          const hasEventTrigger = targetWorkflow.triggers?.some(
            t => t.type === 'event' && t.event === event
          );
          if (!hasEventTrigger) {
            targetWorkflow.triggers = targetWorkflow.triggers || [];
            targetWorkflow.triggers.push({ type: 'event', event });
            // Re-register to set up the new trigger
            workflowTrigger.registerWorkflow(targetWorkflow);
          }
        }
      }

      console.log(`[MultiWorkflowOrchestrator] Connection: ${source} -> ${target} via ${via}`);
    }
  }

  /**
   * Execute a workflow
   * @param {string} workflowId - Workflow ID
   * @param {object} input - Input data
   * @param {object} context - Execution context
   */
  async executeWorkflow(workflowId, input, context) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = context.executionId || uuidv4();
    const correlationId = context.correlationId || uuidv4();

    console.log(`[MultiWorkflowOrchestrator] Executing workflow: ${workflowId}`, {
      executionId,
      correlationId,
      triggeredBy: context.triggeredBy
    });

    // Create execution instance
    const execution = {
      id: executionId,
      workflowId,
      workflowName: workflow.name,
      correlationId,
      status: 'running',
      startedAt: new Date().toISOString(),
      context,
      variables: { ...input },
      currentNodeId: null,
      completedNodes: [],
      output: null,
      error: null
    };

    this.executionInstances.set(executionId, execution);

    // Emit workflow started event
    eventBus.emit('workflow.started', {
      workflowId,
      executionId,
      correlationId
    }, {
      sourceWorkflowId: workflowId,
      correlationId
    });

    try {
      // Execute workflow nodes
      const result = await this.executeNodes(workflow, execution);

      // Update execution state
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      execution.output = result;

      // Emit workflow completed event
      eventBus.emit('workflow.completed', {
        workflowId,
        executionId,
        correlationId,
        output: result
      }, {
        sourceWorkflowId: workflowId,
        correlationId
      });

      // Emit any configured events
      if (workflow.events?.emits) {
        for (const eventName of workflow.events.emits) {
          eventBus.emit(eventName, {
            workflowId,
            executionId,
            output: result
          }, {
            sourceWorkflowId: workflowId,
            correlationId
          });
        }
      }

      console.log(`[MultiWorkflowOrchestrator] Workflow completed: ${workflowId}`, {
        executionId,
        duration: Date.now() - new Date(execution.startedAt).getTime()
      });

      return result;

    } catch (error) {
      // Update execution state
      execution.status = 'failed';
      execution.completedAt = new Date().toISOString();
      execution.error = error.message;

      // Emit workflow failed event
      eventBus.emit('workflow.failed', {
        workflowId,
        executionId,
        correlationId,
        error: error.message
      }, {
        sourceWorkflowId: workflowId,
        correlationId
      });

      console.error(`[MultiWorkflowOrchestrator] Workflow failed: ${workflowId}`, {
        executionId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute workflow nodes
   */
  async executeNodes(workflow, execution) {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    if (nodes.length === 0) {
      return { message: 'No nodes to execute' };
    }

    // Find start node
    let currentNode = nodes.find(n =>
      n.type === 'startProcess' || n.type === 'start'
    ) || nodes[0];

    const visited = new Set();
    let result = { ...execution.variables };

    while (currentNode && !visited.has(currentNode.id)) {
      visited.add(currentNode.id);
      execution.currentNodeId = currentNode.id;

      console.log(`[MultiWorkflowOrchestrator] Executing node: ${currentNode.id} (${currentNode.type})`);

      // Execute node based on type
      const nodeResult = await this.executeNode(currentNode, execution);

      // Merge result into variables
      if (nodeResult) {
        result = { ...result, ...nodeResult };
        execution.variables = result;
      }

      execution.completedNodes.push(currentNode.id);

      // Check if end node
      if (currentNode.type === 'endEvent' || currentNode.type === 'end') {
        break;
      }

      // Find next node
      const outgoingEdge = edges.find(e => e.source === currentNode.id);
      if (!outgoingEdge) {
        break;
      }

      // Handle decision nodes
      if (currentNode.type === 'decision') {
        const decisionResult = nodeResult?.decision || 'default';
        const conditionalEdge = edges.find(e =>
          e.source === currentNode.id &&
          (e.label === decisionResult || e.condition === decisionResult)
        );
        if (conditionalEdge) {
          currentNode = nodes.find(n => n.id === conditionalEdge.target);
        } else {
          currentNode = nodes.find(n => n.id === outgoingEdge.target);
        }
      } else {
        currentNode = nodes.find(n => n.id === outgoingEdge.target);
      }
    }

    return result;
  }

  /**
   * Execute a single node
   */
  async executeNode(node, execution) {
    const nodeType = node.type;
    const context = {
      workflowId: execution.workflowId,
      nodeId: node.id,
      correlationId: execution.correlationId,
      variables: execution.variables
    };

    switch (nodeType) {
      case 'startProcess':
      case 'start':
        // Start node - just pass through
        return null;

      case 'endEvent':
      case 'end':
        // End node - return final variables
        return execution.variables;

      case 'userTask':
        // User task - in real execution would wait for user input
        return this.executeUserTask(node, context);

      case 'serviceTask':
      case 'task':
        // Service/automated task
        return this.executeServiceTask(node, context);

      case 'decision':
        // Decision node - evaluate conditions
        return this.executeDecision(node, context);

      case 'subWorkflow':
        // Sub-workflow node
        const subWorkflowNode = SubWorkflowNode.fromNodeData(node);
        const result = await subWorkflowNode.execute(context);
        return result.output;

      case 'emitEvent':
        // Emit an event
        return this.executeEmitEvent(node, context);

      default:
        console.log(`[MultiWorkflowOrchestrator] Unknown node type: ${nodeType}`);
        return null;
    }
  }

  /**
   * Execute a user task node
   */
  async executeUserTask(node, context) {
    // In a real implementation, this would:
    // 1. Create a task assignment
    // 2. Wait for user to complete the task
    // 3. Return the user's input

    // For now, simulate completion with node data
    return {
      taskCompleted: true,
      taskId: node.id,
      taskName: node.data?.label || node.name
    };
  }

  /**
   * Execute a service task node
   */
  async executeServiceTask(node, context) {
    const config = node.data?.config || node.config || {};

    // Execute any configured script
    if (config.script) {
      try {
        // Safe evaluation (in production, use a sandbox)
        const scriptResult = await this.evaluateScript(config.script, context.variables);
        return scriptResult;
      } catch (error) {
        console.error(`[MultiWorkflowOrchestrator] Script execution failed: ${error.message}`);
      }
    }

    return {
      serviceExecuted: true,
      nodeId: node.id
    };
  }

  /**
   * Execute a decision node
   */
  async executeDecision(node, context) {
    const conditions = node.data?.conditions || [];
    const variables = context.variables;

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, variables);
      if (result) {
        return { decision: condition.outcome || 'yes' };
      }
    }

    return { decision: 'default' };
  }

  /**
   * Execute an emit event node
   */
  async executeEmitEvent(node, context) {
    const eventName = node.data?.eventName;
    const eventPayload = node.data?.payload || context.variables;

    if (eventName) {
      eventBus.emit(eventName, eventPayload, {
        sourceWorkflowId: context.workflowId,
        sourceNodeId: context.nodeId,
        correlationId: context.correlationId
      });
    }

    return { eventEmitted: eventName };
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition, variables) {
    const { field, operator, value } = condition;
    const fieldValue = variables[field];

    switch (operator) {
      case 'equals':
      case '==':
        return fieldValue == value;
      case 'notEquals':
      case '!=':
        return fieldValue != value;
      case 'greaterThan':
      case '>':
        return fieldValue > value;
      case 'lessThan':
      case '<':
        return fieldValue < value;
      case 'contains':
        return String(fieldValue).includes(value);
      case 'isNull':
        return fieldValue == null;
      case 'isNotNull':
        return fieldValue != null;
      default:
        return false;
    }
  }

  /**
   * Evaluate a script (simplified - in production use sandbox)
   */
  async evaluateScript(script, variables) {
    // Create a safe context with variables
    const context = { ...variables };

    // Very simple expression evaluation
    // In production, use vm2 or similar sandbox
    try {
      const fn = new Function(...Object.keys(context), `return ${script}`);
      return fn(...Object.values(context));
    } catch (error) {
      console.error(`[MultiWorkflowOrchestrator] Script error: ${error.message}`);
      return null;
    }
  }

  /**
   * Start a workflow by ID
   */
  async startWorkflow(workflowId, input = {}, options = {}) {
    return workflowTrigger.triggerManually(workflowId, input, options);
  }

  /**
   * Get execution status
   */
  getExecution(executionId) {
    return this.executionInstances.get(executionId);
  }

  /**
   * Get all executions for a workflow
   */
  getWorkflowExecutions(workflowId) {
    return Array.from(this.executionInstances.values())
      .filter(e => e.workflowId === workflowId);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions() {
    return Array.from(this.executionInstances.values())
      .filter(e => e.status === 'running');
  }

  /**
   * Get statistics
   */
  getStats() {
    const executions = Array.from(this.executionInstances.values());

    return {
      applicationId: this.applicationId,
      workflowCount: this.workflows.size,
      connectionCount: this.connections.length,
      executions: {
        total: executions.length,
        running: executions.filter(e => e.status === 'running').length,
        completed: executions.filter(e => e.status === 'completed').length,
        failed: executions.filter(e => e.status === 'failed').length
      },
      eventBus: eventBus.getStats(),
      messageStore: messageStore.getStats()
    };
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown() {
    console.log('[MultiWorkflowOrchestrator] Shutting down...');

    // Unregister all workflows
    for (const workflowId of this.workflows.keys()) {
      workflowTrigger.unregisterWorkflow(workflowId);
    }

    // Clear state
    this.workflows.clear();
    this.connections = [];
    this.executionInstances.clear();
    this.isInitialized = false;

    // Shutdown message store
    messageStore.shutdown();

    console.log('[MultiWorkflowOrchestrator] Shutdown complete');
  }
}

// Singleton instance
const multiWorkflowOrchestrator = new MultiWorkflowOrchestrator();

module.exports = multiWorkflowOrchestrator;
module.exports.MultiWorkflowOrchestrator = MultiWorkflowOrchestrator;
