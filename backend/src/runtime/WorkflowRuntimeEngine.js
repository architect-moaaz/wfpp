/**
 * Workflow Runtime Engine
 * Multi-agent system for executing workflows with LLM intelligence
 */

const WorkflowInstance = require('../models/WorkflowInstance');
const workflowDatabase = require('../database/WorkflowDatabase');
const ExecutionAgent = require('./agents/ExecutionAgent');
const tokenManager = require('./TokenManager');
const gatewayController = require('./GatewayController');
const stateManager = require('./StateManager');
const eventManager = require('./EventManager');
const retryManager = require('./RetryManager');
const timeoutManager = require('./TimeoutManager');
const performanceMonitor = require('./PerformanceMonitor');
const distributedLockManager = require('./DistributedLockManager');
const versionManager = require('./VersionManager');
const Anthropic = require('@anthropic-ai/sdk');

class WorkflowRuntimeEngine {
  constructor() {
    this.executionAgent = new ExecutionAgent();
    this.tokenManager = tokenManager;
    this.gatewayController = gatewayController;
    this.stateManager = stateManager;
    this.eventManager = eventManager;
    this.retryManager = retryManager;
    this.timeoutManager = timeoutManager;
    this.performanceMonitor = performanceMonitor;
    this.distributedLockManager = distributedLockManager;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
    this.runningInstances = new Map();

    // Initialize state manager
    this.stateManager.initialize();
  }

  /**
   * Start a new workflow instance
   * @param {Object} workflowDef - Workflow definition (can be null if using version)
   * @param {Object} inputData - Initial process data
   * @param {String} initiator - Who started the workflow
   * @param {Number} version - Optional version number to use (uses default if not specified)
   */
  async startWorkflow(workflowDef, inputData = {}, initiator = 'system', version = null) {
    console.log(`[Runtime] Starting workflow: ${workflowDef?.name || 'Unknown'}`);

    // Acquire distributed lock for workflow instance creation
    const lockKey = `workflow_start_${workflowDef?.id}`;

    return await this.distributedLockManager.executeWithLock(
      lockKey,
      async () => {
        // Get workflow definition from version if specified
        let actualWorkflowDef = workflowDef;
        let workflowVersion = null;

        if (version !== null && workflowDef?.id) {
          // Get specific version
          workflowVersion = versionManager.getVersion(workflowDef.id, version);
          if (!workflowVersion) {
            throw new Error(`Workflow version ${version} not found for workflow ${workflowDef.id}`);
          }
          actualWorkflowDef = workflowVersion.workflow;
          console.log(`[Runtime] Using workflow version ${version}`);
        } else if (workflowDef?.id) {
          // Try to get default version
          const defaultVersion = versionManager.getDefaultVersion(workflowDef.id);
          if (defaultVersion) {
            workflowVersion = defaultVersion;
            actualWorkflowDef = defaultVersion.workflow;
            console.log(`[Runtime] Using default workflow version ${defaultVersion.version}`);
          }
        }

        // Create instance
        const instance = new WorkflowInstance({
          workflowId: actualWorkflowDef.id,
          workflowName: actualWorkflowDef.name,
          status: 'RUNNING',
          processData: inputData,
          initiator
        });

        // Save to database
        await workflowDatabase.saveInstance(instance);
        await workflowDatabase.saveWorkflow(actualWorkflowDef);

        // Bind instance to version
        if (workflowVersion) {
          versionManager.bindInstanceToVersion(
            instance.id,
            actualWorkflowDef.id,
            workflowVersion.version
          );
          console.log(`[Runtime] Instance ${instance.id} bound to version ${workflowVersion.version}`);
        }

        // Start execution
        this.runningInstances.set(instance.id, instance);

        // Execute asynchronously
        setImmediate(() => this.executeWorkflow(instance.id, actualWorkflowDef));

        return instance.toJSON();
      },
      {
        metadata: {
          operation: 'start_workflow',
          workflowId: workflowDef?.id,
          workflowName: workflowDef?.name
        }
      }
    );
  }

  /**
   * Main workflow execution loop
   */
  async executeWorkflow(instanceId, workflowDef) {
    // Start workflow performance monitoring
    const workflowPerfId = this.performanceMonitor.startOperation(`workflow_${instanceId}`, {
      instanceId,
      workflowId: workflowDef?.id
    });

    const workflowStartTime = Date.now();
    let workflow = null;

    try {
      const instance = await this.getInstance(instanceId);
      workflow = workflowDef || await workflowDatabase.getWorkflow(instance.workflowId);

      console.log(`[Runtime] Executing workflow ${instanceId}`);

      // Emit workflow started event
      eventManager.emitWorkflowStarted(instanceId, instance.workflowId, instance.workflowName);

      // Create initial snapshot
      await this.createSnapshot(instanceId, 'workflow_start');

      // Set workflow timeout (if configured)
      const workflowTimeout = workflow.data?.timeout || this.timeoutManager.defaultTimeouts.workflowExecution;
      const timeoutId = this.timeoutManager.startWorkflowTimeout(instanceId, workflowTimeout);

      // Find start node
      const startNode = workflow.nodes.find(n => n.type === 'startProcess');
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Create initial token
      const initialToken = this.tokenManager.createInitialToken(instance.id, startNode.id);

      // Execute from start with token-based execution
      await this.executeWithToken(startNode, initialToken, instance, workflow);

      // Clear workflow timeout
      this.timeoutManager.clearWorkflowTimeout(timeoutId);

    } catch (error) {
      console.error(`[Runtime] Workflow ${instanceId} failed:`, error);

      // End performance monitoring on error
      const perfMetrics = this.performanceMonitor.endOperation(workflowPerfId);
      const workflowDuration = Date.now() - workflowStartTime;

      // Record failed workflow execution
      const instance = await this.getInstance(instanceId);
      this.performanceMonitor.recordWorkflowExecution(instance.workflowId, instanceId, {
        duration: workflowDuration,
        status: 'FAILED',
        nodeCount: workflow?.nodes?.length || 0,
        error: error.message
      });

      await this.failInstance(instanceId, error.message);
    }
  }

  /**
   * Execute node with token (supports parallel execution)
   */
  async executeWithToken(node, token, instance, workflow) {
    console.log(`[Runtime] Executing node: ${node.id} (${node.type}) with token ${token.id}`);

    // Update current node
    instance.updateState({ currentNodeId: node.id });
    await this.saveState(instance);

    // Handle different node types
    try {
      // Check for gateway nodes
      if (this.isGatewayNode(node)) {
        await this.handleGateway(node, token, instance, workflow);
        return;
      }

      // Emit node started event
      eventManager.emitNodeStarted(instance.id, node.id, node.type);

      // Start performance monitoring
      const perfId = this.performanceMonitor.startOperation(`node_${node.id}`, {
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type
      });

      let execResult;
      const executionStartTime = Date.now();

      try {
        // Get retry and timeout policies from node configuration
        const retryPolicy = this.retryManager.createPolicyFromNode(node);
        const timeoutConfig = this.timeoutManager.createConfigFromNode(node);

        // Execute with timeout and retry logic
        const retryResult = await this.timeoutManager.executeWithTimeout(
          async () => {
            return await this.retryManager.executeWithRetry(
              async () => this.executionAgent.execute(node, instance, workflow),
              { instanceId: instance.id, nodeId: node.id },
              retryPolicy
            );
          },
          timeoutConfig.timeout,
          { instanceId: instance.id, nodeId: node.id, operationType: 'node' }
        );

        // Extract the actual result from the retry wrapper
        execResult = retryResult.result;

        // End performance monitoring
        const perfMetrics = this.performanceMonitor.endOperation(perfId);
        const executionDuration = Date.now() - executionStartTime;

        // Record node execution metrics
        this.performanceMonitor.recordNodeExecution(node.id, instance.id, {
          duration: executionDuration,
          status: execResult.status,
          nodeType: node.type
        });

      } catch (error) {
        // End performance monitoring on error
        const perfMetrics = this.performanceMonitor.endOperation(perfId);
        const executionDuration = Date.now() - executionStartTime;

        // Record failed node execution
        this.performanceMonitor.recordNodeExecution(node.id, instance.id, {
          duration: executionDuration,
          status: 'FAILED',
          nodeType: node.type,
          error: error.message
        });

        throw error;
      }

      // Add to execution history
      instance.addHistoryEntry({
        nodeId: node.id,
        nodeType: node.type,
        tokenId: token.id,
        action: 'EXECUTE',
        result: execResult
      });

      // Update token variables if needed
      if (execResult.output) {
        this.tokenManager.updateTokenVariables(instance.id, token.id, execResult.output);

        // Also update process data for backward compatibility
        instance.processData = {
          ...instance.processData,
          ...execResult.output
        };

        // Emit variable update event
        eventManager.emitVariableUpdate(instance.id, execResult.output, node.id);
      }

      // Save state checkpoint
      await this.saveState(instance);

      // Handle execution status
      console.log(`[Runtime] DEBUG: About to check status for ${node.id}, execResult.status = ${execResult.status}, type = ${typeof execResult.status}`);
      if (execResult.status === 'WAITING') {
        // Node is waiting (human task, timer, etc.)
        console.log(`[Runtime] Node ${node.id} is waiting for input`);
        instance.updateState({ status: 'PAUSED' });
        await this.saveState(instance);

        // Emit workflow paused event
        eventManager.emitWorkflowPaused(instance.id, `Waiting for ${node.type} at ${node.id}`);
        return;
      }

      if (execResult.status === 'FAILED') {
        // Emit node failed event
        eventManager.emitNodeFailed(instance.id, node.id, node.type, new Error(execResult.error));
        throw new Error(`Node ${node.id} failed: ${execResult.error}`);
      }

      // Emit node completed event
      eventManager.emitNodeCompleted(instance.id, node.id, node.type, execResult);

      // Move token to next node
      const nextNode = await this.determineNextNode(node, instance, workflow);

      if (nextNode) {
        // Move token
        this.tokenManager.moveToken(instance.id, token.id, nextNode.id);

        // Continue execution
        await this.executeWithToken(nextNode, token, instance, workflow);
      } else {
        // End of workflow path - complete token
        this.tokenManager.completeToken(instance.id, token.id);

        // Check if all tokens are complete
        await this.checkWorkflowCompletion(instance);
      }

    } catch (error) {
      console.error(`[Runtime] Node ${node.id} execution failed:`, error);
      this.tokenManager.completeToken(instance.id, token.id);
      throw error;
    }
  }

  /**
   * Handle gateway node execution
   */
  async handleGateway(gateway, token, instance, workflow) {
    const gatewayType = this.getGatewayType(gateway);

    console.log(`[Runtime] Processing ${gatewayType} gateway: ${gateway.id}`);

    let result;

    switch (gatewayType) {
      case 'parallel':
      case 'parallelGateway':
        result = await this.handleParallelGateway(gateway, token, instance, workflow);
        break;

      case 'inclusive':
      case 'inclusiveGateway':
        result = await this.handleInclusiveGateway(gateway, token, instance, workflow);
        break;

      case 'exclusive':
      case 'exclusiveGateway':
      case 'decision':
        result = await this.handleExclusiveGateway(gateway, token, instance, workflow);
        break;

      default:
        console.warn(`[Runtime] Unknown gateway type: ${gatewayType}, treating as exclusive`);
        result = await this.handleExclusiveGateway(gateway, token, instance, workflow);
    }

    // Emit gateway event
    const action = result.type === 'split' ? 'split' : (result.type === 'join' ? 'join' : 'evaluated');
    eventManager.emitGatewayEvent(instance.id, gateway.id, gatewayType, action, result);

    // Log gateway result
    instance.addHistoryEntry({
      nodeId: gateway.id,
      nodeType: gatewayType,
      tokenId: token.id,
      action: 'GATEWAY',
      result
    });

    await this.saveState(instance);
  }

  /**
   * Handle Parallel Gateway (AND)
   */
  async handleParallelGateway(gateway, token, instance, workflow) {
    const incomingFlows = this.gatewayController.getIncomingFlows(gateway.id, workflow);

    // Determine if this is split or join
    const isSplit = incomingFlows.length === 1;

    if (isSplit) {
      // PARALLEL SPLIT
      const result = await this.gatewayController.processParallelGatewaySplit(
        gateway, token, workflow, instance
      );

      // Execute all child tokens in parallel
      const executionPromises = result.tokens.map((childToken, index) => {
        const nextNode = workflow.nodes.find(n => n.id === result.nextNodes[index]);
        return this.executeWithToken(nextNode, childToken, instance, workflow);
      });

      // Wait for all parallel paths to complete
      await Promise.all(executionPromises);

      return result;
    } else {
      // PARALLEL JOIN
      const result = await this.gatewayController.processParallelGatewayJoin(
        gateway, token, workflow, instance
      );

      if (result.type === 'wait') {
        // Not all tokens arrived yet - just return
        return result;
      }

      // All tokens arrived - continue with merged token
      const nextNode = workflow.nodes.find(n => n.id === result.nextNode);
      await this.executeWithToken(nextNode, result.token, instance, workflow);

      return result;
    }
  }

  /**
   * Handle Inclusive Gateway (OR)
   */
  async handleInclusiveGateway(gateway, token, instance, workflow) {
    const incomingFlows = this.gatewayController.getIncomingFlows(gateway.id, workflow);

    // Determine if this is split or join
    const isSplit = incomingFlows.length === 1;

    if (isSplit) {
      // INCLUSIVE SPLIT
      const result = await this.gatewayController.processInclusiveGatewaySplit(
        gateway, token, workflow, instance
      );

      // Execute all activated paths in parallel
      const executionPromises = result.tokens.map((childToken, index) => {
        const nextNode = workflow.nodes.find(n => n.id === result.nextNodes[index]);
        return this.executeWithToken(nextNode, childToken, instance, workflow);
      });

      await Promise.all(executionPromises);

      return result;
    } else {
      // INCLUSIVE JOIN
      const result = await this.gatewayController.processInclusiveGatewayJoin(
        gateway, token, workflow, instance
      );

      if (result.type === 'wait') {
        // Not all expected tokens arrived yet
        return result;
      }

      // All expected tokens arrived - continue
      const nextNode = workflow.nodes.find(n => n.id === result.nextNode);
      await this.executeWithToken(nextNode, result.token, instance, workflow);

      return result;
    }
  }

  /**
   * Handle Exclusive Gateway (XOR)
   */
  async handleExclusiveGateway(gateway, token, instance, workflow) {
    const result = await this.gatewayController.processExclusiveGateway(
      gateway, token, workflow, instance
    );

    // Continue execution on selected path
    const nextNode = workflow.nodes.find(n => n.id === result.nextNode);
    await this.executeWithToken(nextNode, result.token, instance, workflow);

    return result;
  }

  /**
   * Check if node is a gateway
   */
  isGatewayNode(node) {
    const gatewayTypes = [
      'gateway', 'decision',
      'parallelGateway', 'parallel',
      'inclusiveGateway', 'inclusive',
      'exclusiveGateway', 'exclusive'
    ];
    return gatewayTypes.includes(node.type);
  }

  /**
   * Get gateway type from node
   */
  getGatewayType(node) {
    // Check node data for explicit gateway type
    if (node.data?.gatewayType) {
      return node.data.gatewayType;
    }

    // Use node type directly
    return node.type;
  }

  /**
   * Check if workflow is complete (all tokens done)
   */
  async checkWorkflowCompletion(instance) {
    const activeTokens = this.tokenManager.getActiveTokens(instance.id);

    if (activeTokens.length === 0) {
      // All tokens complete - workflow is done
      await this.completeInstance(instance);
    }
  }

  /**
   * Execute a single node (legacy method for backward compatibility)
   */
  async executeNode(node, instance, workflow) {
    console.log(`[Runtime] Executing node: ${node.id} (${node.type})`);

    // Update current node
    instance.updateState({ currentNodeId: node.id });
    await this.saveState(instance);

    // Execute node using ExecutionAgent
    const execResult = await this.executionAgent.execute(node, instance, workflow);

    // Add to execution history
    instance.addHistoryEntry({
      nodeId: node.id,
      nodeType: node.type,
      action: 'EXECUTE',
      result: execResult
    });

    // Update process data if needed
    if (execResult.output) {
      instance.processData = {
        ...instance.processData,
        ...execResult.output
      };
    }

    // Save state checkpoint
    await this.saveState(instance);

    // Handle execution status
    if (execResult.status === 'WAITING') {
      // Node is waiting (human task, timer, etc.)
      console.log(`[Runtime] Node ${node.id} is waiting for input`);
      instance.updateState({ status: 'PAUSED' });
      await this.saveState(instance);
      return;
    }

    if (execResult.status === 'FAILED') {
      throw new Error(`Node ${node.id} failed: ${execResult.error}`);
    }

    // Find next node
    const nextNode = await this.determineNextNode(node, instance, workflow);

    if (nextNode) {
      // Continue execution
      await this.executeNode(nextNode, instance, workflow);
    } else {
      // End of workflow
      await this.completeInstance(instance);
    }
  }

  /**
   * Determine next node using connections and LLM intelligence
   */
  async determineNextNode(currentNode, instance, workflow) {
    const connections = workflow.connections || workflow.edges || [];
    const outgoingConnections = connections.filter(c => c.source === currentNode.id);

    if (outgoingConnections.length === 0) {
      // No outgoing connections - end of workflow
      return null;
    }

    if (outgoingConnections.length === 1) {
      // Single connection - straightforward
      const nextNodeId = outgoingConnections[0].target;
      return workflow.nodes.find(n => n.id === nextNodeId);
    }

    // Multiple connections - decision point
    if (currentNode.type === 'decision') {
      const nextNodeId = await this.evaluateDecision(currentNode, instance, outgoingConnections, workflow);
      return workflow.nodes.find(n => n.id === nextNodeId);
    }

    // Default: take first connection
    const nextNodeId = outgoingConnections[0].target;
    return workflow.nodes.find(n => n.id === nextNodeId);
  }

  /**
   * Evaluate decision gateway using LLM intelligence
   */
  async evaluateDecision(decisionNode, instance, connections, workflow) {
    if (!this.useLLM) {
      // Fallback: take first path
      return connections[0].target;
    }

    try {
      // Use LLM to evaluate decision
      const prompt = this.buildDecisionPrompt(decisionNode, instance, connections, workflow);

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;

      // Extract decision from LLM response
      const decision = this.parseDecisionResponse(response, connections);
      console.log(`[Runtime] LLM Decision: ${decision}`);

      return decision;

    } catch (error) {
      console.error('[Runtime] LLM decision failed, using fallback:', error);
      return connections[0].target;
    }
  }

  /**
   * Build prompt for LLM decision making
   */
  buildDecisionPrompt(decisionNode, instance, connections, workflow) {
    const nextNodes = connections.map(c => {
      const node = workflow.nodes.find(n => n.id === c.target);
      return {
        nodeId: c.target,
        label: node?.data?.label || c.target,
        description: node?.data?.description
      };
    });

    return `You are a workflow execution engine making a routing decision.

Decision Node: ${decisionNode.data?.label || decisionNode.id}
Condition: ${decisionNode.data?.condition || 'Not specified'}
Gateway Type: ${decisionNode.data?.gatewayType || 'exclusive'}

Current Process Data:
${JSON.stringify(instance.processData, null, 2)}

Available Paths:
${nextNodes.map((n, i) => `${i + 1}. ${n.label} (ID: ${n.nodeId})`).join('\n')}

Based on the process data and condition, which path should be taken?
Respond with ONLY the nodeId of the chosen path.`;
  }

  /**
   * Parse LLM decision response
   */
  parseDecisionResponse(response, connections) {
    // Look for node ID in response
    for (const conn of connections) {
      if (response.includes(conn.target)) {
        return conn.target;
      }
    }
    // Fallback to first connection
    return connections[0].target;
  }

  /**
   * Complete human task and continue workflow
   */
  async completeTask(instanceId, taskData) {
    const instance = await this.getInstance(instanceId);
    const workflow = await workflowDatabase.getWorkflow(instance.workflowId);

    console.log(`[Runtime] Completing task for instance: ${instanceId}`);

    // Merge task data into process data
    instance.processData = {
      ...instance.processData,
      ...taskData
    };

    instance.updateState({ status: 'RUNNING' });
    await this.saveState(instance);

    // Get current node and continue
    const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);
    const nextNode = await this.determineNextNode(currentNode, instance, workflow);

    if (nextNode) {
      await this.executeNode(nextNode, instance, workflow);
    } else {
      await this.completeInstance(instance);
    }

    return instance.toJSON();
  }

  /**
   * Recover failed instance
   */
  async recoverInstance(instanceId) {
    const instance = await this.getInstance(instanceId);
    const workflow = await workflowDatabase.getWorkflow(instance.workflowId);

    console.log(`[Runtime] Recovering instance: ${instanceId}`);

    if (instance.status !== 'FAILED') {
      throw new Error('Can only recover FAILED instances');
    }

    // Reset to running
    instance.updateState({ status: 'RUNNING', error: null });
    await this.saveState(instance);

    // Resume from last checkpoint (currentNodeId)
    const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);

    if (currentNode) {
      await this.executeNode(currentNode, instance, workflow);
    } else {
      throw new Error('Cannot find recovery point');
    }

    return instance.toJSON();
  }

  /**
   * Save instance state to database
   */
  async saveState(instance) {
    await workflowDatabase.saveInstance(instance);
  }

  /**
   * Get instance from memory or database
   */
  async getInstance(instanceId) {
    if (this.runningInstances.has(instanceId)) {
      return this.runningInstances.get(instanceId);
    }
    return await workflowDatabase.getInstance(instanceId);
  }

  /**
   * Complete workflow instance
   */
  async completeInstance(instance) {
    console.log(`[Runtime] Completing instance: ${instance.id}`);

    const startTime = new Date(instance.createdAt);
    const duration = new Date() - startTime;

    instance.complete();
    await this.saveState(instance);
    this.runningInstances.delete(instance.id);

    // Record workflow performance metrics
    const workflow = await workflowDatabase.getWorkflow(instance.workflowId);
    this.performanceMonitor.recordWorkflowExecution(instance.workflowId, instance.id, {
      duration,
      status: 'COMPLETED',
      nodeCount: workflow?.nodes?.length || 0
    });

    // Emit workflow completed event
    eventManager.emitWorkflowCompleted(instance.id, duration, instance.processData);

    // Unbind instance from version
    versionManager.unbindInstance(instance.id, 'COMPLETED');

    // Clean up tokens
    this.tokenManager.clearInstanceTokens(instance.id);
    this.gatewayController.clearInstanceState(instance.id);

    // Clear timeout data
    this.timeoutManager.clearInstanceTimeouts(instance.id);
    this.timeoutManager.clearTimeoutHistory(instance.id);

    // Clear retry data
    this.retryManager.clearInstanceRetries(instance.id);

    // Send completion notification
    await this.sendNotification(instance, 'COMPLETED');
  }

  /**
   * Fail workflow instance
   */
  async failInstance(instanceId, error) {
    const instance = await this.getInstance(instanceId);

    console.log(`[Runtime] Failing instance: ${instanceId}`);

    instance.fail(error);
    await this.saveState(instance);
    this.runningInstances.delete(instanceId);

    // Emit workflow failed event
    eventManager.emitWorkflowFailed(instanceId, new Error(error));

    // Unbind instance from version
    versionManager.unbindInstance(instanceId, 'FAILED');

    // Clean up tokens
    this.tokenManager.clearInstanceTokens(instanceId);
    this.gatewayController.clearInstanceState(instanceId);

    // Clear timeout data
    this.timeoutManager.clearInstanceTimeouts(instanceId);
    this.timeoutManager.clearTimeoutHistory(instanceId);

    // Clear retry data
    this.retryManager.clearInstanceRetries(instanceId);

    // Send failure notification
    await this.sendNotification(instance, 'FAILED');
  }

  /**
   * Send notification
   */
  async sendNotification(instance, eventType) {
    console.log(`[Runtime] Notification: ${eventType} for instance ${instance.id}`);
    // Implement actual notification logic (email, webhook, etc.)
    return {
      sent: true,
      eventType,
      instanceId: instance.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks() {
    const pausedInstances = await workflowDatabase.getInstancesByStatus('PAUSED');

    return pausedInstances.map(inst => {
      const lastHistory = inst.executionHistory[inst.executionHistory.length - 1];
      return {
        instanceId: inst.id,
        workflowName: inst.workflowName,
        taskData: lastHistory?.result?.output,
        currentNode: inst.currentNodeId,
        createdAt: inst.createdAt
      };
    });
  }

  /**
   * Get instance status
   */
  async getInstanceStatus(instanceId) {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      return null;
    }

    // Include token information
    const tokenStats = this.tokenManager.getTokenStats(instanceId);
    const activeTokens = this.tokenManager.getActiveTokens(instanceId);

    return {
      ...instance.toJSON(),
      tokens: {
        stats: tokenStats,
        active: activeTokens.map(t => ({
          id: t.id,
          position: t.position,
          status: t.status
        }))
      }
    };
  }

  /**
   * Get detailed token information for an instance
   */
  getInstanceTokens(instanceId) {
    return {
      tokens: this.tokenManager.getInstanceTokens(instanceId),
      stats: this.tokenManager.getTokenStats(instanceId),
      gatewayStates: this.gatewayController.exportStates(instanceId)
    };
  }

  /**
   * Capture complete workflow state
   */
  async captureState(instanceId) {
    const instance = await this.getInstance(instanceId);

    return {
      instance: instance ? instance.toJSON() : null,
      tokens: this.tokenManager.exportTokens(instanceId),
      gateways: this.gatewayController.exportStates(instanceId),
      timestamp: new Date()
    };
  }

  /**
   * Create a state snapshot
   */
  async createSnapshot(instanceId, reason = 'checkpoint') {
    const state = await this.captureState(instanceId);
    const instance = await this.getInstance(instanceId);

    const snapshot = await this.stateManager.createSnapshot(
      instanceId,
      state,
      {
        reason,
        currentNode: instance?.currentNodeId,
        status: instance?.status
      }
    );

    // Emit state snapshot event
    eventManager.emitStateEvent(instanceId, 'snapshot', {
      snapshotId: snapshot.id,
      reason,
      timestamp: snapshot.timestamp
    });

    return snapshot;
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollbackToSnapshot(snapshotId) {
    console.log(`[Runtime] Rolling back to snapshot ${snapshotId}`);

    // Get snapshot and restore state
    const rollbackResult = await this.stateManager.rollbackToSnapshot(snapshotId);
    const { instanceId, state } = rollbackResult;

    // Restore instance state
    const instance = await this.getInstance(instanceId);
    if (instance && state.instance) {
      Object.assign(instance, {
        status: state.instance.status,
        currentNodeId: state.instance.currentNodeId,
        processData: state.instance.processData,
        executionHistory: state.instance.executionHistory
      });

      await this.saveState(instance);
    }

    // Restore tokens
    if (state.tokens && state.tokens.length > 0) {
      this.tokenManager.importTokens(instanceId, state.tokens);
    } else {
      this.tokenManager.clearInstanceTokens(instanceId);
    }

    // Restore gateway states
    if (state.gateways) {
      this.gatewayController.importStates(instanceId, state.gateways);
    } else {
      this.gatewayController.clearInstanceState(instanceId);
    }

    console.log(`[Runtime] Rollback complete for instance ${instanceId}`);

    return {
      success: true,
      instanceId,
      snapshotId,
      restoredState: state
    };
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(instanceId, metadata = {}) {
    // Create pre-transaction snapshot
    await this.createSnapshot(instanceId, 'transaction_start');

    const transactionId = this.stateManager.beginTransaction(instanceId, metadata);

    // Emit transaction begin event
    eventManager.emitStateEvent(instanceId, 'transaction_begin', {
      transactionId,
      metadata
    });

    return transactionId;
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionId) {
    const transaction = this.stateManager.getTransaction(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Capture final state
    const finalState = await this.captureState(transaction.instanceId);

    // Commit transaction
    const snapshot = await this.stateManager.commitTransaction(transactionId, finalState);

    console.log(`[Runtime] Transaction ${transactionId} committed`);

    // Emit transaction commit event
    eventManager.emitStateEvent(transaction.instanceId, 'transaction_commit', {
      transactionId,
      snapshotId: snapshot.id,
      operationCount: transaction.operations.length
    });

    return {
      success: true,
      transactionId,
      snapshot: snapshot.id
    };
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId) {
    const transaction = this.stateManager.getTransaction(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    console.log(`[Runtime] Rolling back transaction ${transactionId}`);

    // Rollback using state manager
    const restoredState = await this.stateManager.rollbackTransaction(transactionId);

    if (restoredState) {
      // Apply restored state
      const instanceId = transaction.instanceId;
      const instance = await this.getInstance(instanceId);

      if (instance && restoredState.instance) {
        Object.assign(instance, {
          status: restoredState.instance.status,
          currentNodeId: restoredState.instance.currentNodeId,
          processData: restoredState.instance.processData,
          executionHistory: restoredState.instance.executionHistory
        });

        await this.saveState(instance);
      }

      // Restore tokens and gateways
      if (restoredState.tokens) {
        this.tokenManager.importTokens(instanceId, restoredState.tokens);
      }

      if (restoredState.gateways) {
        this.gatewayController.importStates(instanceId, restoredState.gateways);
      }
    }

    console.log(`[Runtime] Transaction ${transactionId} rolled back`);

    // Emit transaction rollback event
    eventManager.emitStateEvent(transaction.instanceId, 'transaction_rollback', {
      transactionId
    });

    return {
      success: true,
      transactionId,
      rolledBack: true
    };
  }

  /**
   * Get all snapshots for an instance
   */
  getInstanceSnapshots(instanceId) {
    return this.stateManager.exportSnapshots(instanceId);
  }

  /**
   * Get snapshot details
   */
  async getSnapshotDetails(snapshotId) {
    return await this.stateManager.getSnapshot(snapshotId);
  }

  /**
   * Get state management statistics
   */
  getStateStats(instanceId) {
    return this.stateManager.getStats(instanceId);
  }

  /**
   * Prune old snapshots
   */
  async pruneSnapshots(instanceId, keepCount = 10) {
    await this.stateManager.pruneSnapshots(instanceId, keepCount);
  }
}

module.exports = new WorkflowRuntimeEngine();
