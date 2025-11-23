/**
 * Timeout Manager
 * Handles timeout configuration and enforcement for workflow operations
 */

class TimeoutManager {
  constructor() {
    // Active timeouts: timeoutId -> timeout data
    this.activeTimeouts = new Map();

    // Timeout history: instanceId -> timeouts[]
    this.timeoutHistory = new Map();

    // Default timeout configuration
    this.defaultTimeouts = {
      nodeExecution: 300000, // 5 minutes
      workflowExecution: 3600000, // 1 hour
      gatewayEvaluation: 30000, // 30 seconds
      llmCall: 120000, // 2 minutes
      httpCall: 60000 // 1 minute
    };

    // Timeout statistics
    this.stats = {
      totalTimeouts: 0,
      timeoutsByType: new Map(),
      timeoutsByNode: new Map()
    };
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout(operation, timeoutMs, context = {}) {
    const { instanceId, nodeId, operationType = 'node' } = context;
    const timeoutId = this.generateTimeoutId();

    return new Promise(async (resolve, reject) => {
      let isResolved = false;
      let timeoutHandle;

      // Create timeout
      timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;

          const timeoutError = new Error(`Operation timed out after ${timeoutMs}ms`);
          timeoutError.code = 'TIMEOUT';
          timeoutError.timeoutMs = timeoutMs;
          timeoutError.context = context;

          // Record timeout
          this.recordTimeout(timeoutId, {
            instanceId,
            nodeId,
            operationType,
            timeoutMs,
            timestamp: new Date(),
            context
          });

          // Clear from active timeouts
          this.activeTimeouts.delete(timeoutId);

          reject(timeoutError);
        }
      }, timeoutMs);

      // Track active timeout
      this.activeTimeouts.set(timeoutId, {
        timeoutId,
        timeoutHandle,
        instanceId,
        nodeId,
        operationType,
        timeoutMs,
        startTime: new Date(),
        context
      });

      try {
        // Execute operation
        const result = await operation();

        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          this.activeTimeouts.delete(timeoutId);
          resolve(result);
        }
      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          this.activeTimeouts.delete(timeoutId);
          reject(error);
        }
      }
    });
  }

  /**
   * Start workflow timeout
   */
  startWorkflowTimeout(instanceId, timeoutMs) {
    const timeout = timeoutMs || this.defaultTimeouts.workflowExecution;

    const timeoutId = this.generateTimeoutId();

    const timeoutHandle = setTimeout(() => {
      this.recordTimeout(timeoutId, {
        instanceId,
        operationType: 'workflow',
        timeoutMs: timeout,
        timestamp: new Date()
      });

      // Emit timeout event (will be caught by runtime engine)
      console.log(`[TimeoutManager] Workflow ${instanceId} timed out after ${timeout}ms`);
    }, timeout);

    this.activeTimeouts.set(timeoutId, {
      timeoutId,
      timeoutHandle,
      instanceId,
      operationType: 'workflow',
      timeoutMs: timeout,
      startTime: new Date()
    });

    console.log(`[TimeoutManager] Workflow timeout set for ${instanceId}: ${timeout}ms`);

    return timeoutId;
  }

  /**
   * Clear workflow timeout
   */
  clearWorkflowTimeout(timeoutId) {
    const timeout = this.activeTimeouts.get(timeoutId);

    if (timeout) {
      clearTimeout(timeout.timeoutHandle);
      this.activeTimeouts.delete(timeoutId);
      console.log(`[TimeoutManager] Cleared workflow timeout ${timeoutId}`);
    }
  }

  /**
   * Clear all timeouts for an instance
   */
  clearInstanceTimeouts(instanceId) {
    let count = 0;

    for (const [timeoutId, timeout] of this.activeTimeouts.entries()) {
      if (timeout.instanceId === instanceId) {
        clearTimeout(timeout.timeoutHandle);
        this.activeTimeouts.delete(timeoutId);
        count++;
      }
    }

    console.log(`[TimeoutManager] Cleared ${count} timeouts for instance ${instanceId}`);
  }

  /**
   * Get timeout duration for operation type
   */
  getTimeout(operationType, customTimeout) {
    if (customTimeout) {
      return customTimeout;
    }

    return this.defaultTimeouts[operationType] || this.defaultTimeouts.nodeExecution;
  }

  /**
   * Get timeout from node configuration
   */
  getNodeTimeout(node) {
    const nodeConfig = node.data?.timeout;

    if (typeof nodeConfig === 'number') {
      return nodeConfig;
    }

    // Map node types to timeout categories
    const typeMapping = {
      gateway: 'gatewayEvaluation',
      decision: 'gatewayEvaluation',
      parallelGateway: 'gatewayEvaluation',
      inclusiveGateway: 'gatewayEvaluation',
      exclusiveGateway: 'gatewayEvaluation',
      llmTask: 'llmCall',
      apiCall: 'httpCall',
      httpRequest: 'httpCall'
    };

    const timeoutCategory = typeMapping[node.type] || 'nodeExecution';
    return this.defaultTimeouts[timeoutCategory];
  }

  /**
   * Record timeout occurrence
   */
  recordTimeout(timeoutId, data) {
    const { instanceId, nodeId, operationType } = data;

    // Add to history
    if (!this.timeoutHistory.has(instanceId)) {
      this.timeoutHistory.set(instanceId, []);
    }

    this.timeoutHistory.get(instanceId).push({
      timeoutId,
      ...data
    });

    // Update statistics
    this.stats.totalTimeouts++;

    if (!this.stats.timeoutsByType.has(operationType)) {
      this.stats.timeoutsByType.set(operationType, 0);
    }
    this.stats.timeoutsByType.set(
      operationType,
      this.stats.timeoutsByType.get(operationType) + 1
    );

    if (nodeId) {
      if (!this.stats.timeoutsByNode.has(nodeId)) {
        this.stats.timeoutsByNode.set(nodeId, 0);
      }
      this.stats.timeoutsByNode.set(
        nodeId,
        this.stats.timeoutsByNode.get(nodeId) + 1
      );
    }

    console.log(`[TimeoutManager] Timeout recorded: ${operationType} (${data.timeoutMs}ms)`);
  }

  /**
   * Generate unique timeout ID
   */
  generateTimeoutId() {
    return `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active timeouts for an instance
   */
  getActiveTimeouts(instanceId) {
    const timeouts = [];

    for (const [timeoutId, timeout] of this.activeTimeouts.entries()) {
      if (timeout.instanceId === instanceId) {
        timeouts.push({
          timeoutId,
          operationType: timeout.operationType,
          nodeId: timeout.nodeId,
          timeoutMs: timeout.timeoutMs,
          startTime: timeout.startTime,
          elapsed: Date.now() - timeout.startTime,
          remaining: timeout.timeoutMs - (Date.now() - timeout.startTime)
        });
      }
    }

    return timeouts;
  }

  /**
   * Get timeout history for an instance
   */
  getTimeoutHistory(instanceId) {
    return this.timeoutHistory.get(instanceId) || [];
  }

  /**
   * Clear timeout history for an instance
   */
  clearTimeoutHistory(instanceId) {
    this.timeoutHistory.delete(instanceId);
    console.log(`[TimeoutManager] Cleared timeout history for instance ${instanceId}`);
  }

  /**
   * Get timeout statistics
   */
  getStats() {
    return {
      ...this.stats,
      timeoutsByType: Object.fromEntries(this.stats.timeoutsByType),
      timeoutsByNode: Object.fromEntries(this.stats.timeoutsByNode),
      activeTimeouts: this.activeTimeouts.size,
      instancesTracked: this.timeoutHistory.size
    };
  }

  /**
   * Get timeout statistics for an instance
   */
  getInstanceStats(instanceId) {
    const history = this.getTimeoutHistory(instanceId);
    const active = this.getActiveTimeouts(instanceId);

    return {
      totalTimeouts: history.length,
      activeTimeouts: active.length,
      timeoutsByType: history.reduce((acc, t) => {
        acc[t.operationType] = (acc[t.operationType] || 0) + 1;
        return acc;
      }, {}),
      history,
      active
    };
  }

  /**
   * Update default timeouts
   */
  setDefaultTimeouts(timeouts) {
    this.defaultTimeouts = {
      ...this.defaultTimeouts,
      ...timeouts
    };

    console.log('[TimeoutManager] Default timeouts updated:', this.defaultTimeouts);
  }

  /**
   * Check if operation has timed out
   */
  hasTimedOut(timeoutId) {
    return !this.activeTimeouts.has(timeoutId);
  }

  /**
   * Get remaining time for timeout
   */
  getRemainingTime(timeoutId) {
    const timeout = this.activeTimeouts.get(timeoutId);

    if (!timeout) {
      return 0;
    }

    const elapsed = Date.now() - timeout.startTime;
    const remaining = timeout.timeoutMs - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * Extend timeout
   */
  extendTimeout(timeoutId, additionalMs) {
    const timeout = this.activeTimeouts.get(timeoutId);

    if (!timeout) {
      console.warn(`[TimeoutManager] Cannot extend timeout ${timeoutId}: not found`);
      return false;
    }

    // Clear existing timeout
    clearTimeout(timeout.timeoutHandle);

    // Calculate new timeout
    const remaining = this.getRemainingTime(timeoutId);
    const newTimeout = remaining + additionalMs;

    // Create new timeout
    const newHandle = setTimeout(() => {
      this.recordTimeout(timeoutId, {
        instanceId: timeout.instanceId,
        nodeId: timeout.nodeId,
        operationType: timeout.operationType,
        timeoutMs: timeout.timeoutMs + additionalMs,
        timestamp: new Date(),
        extended: true
      });

      this.activeTimeouts.delete(timeoutId);
    }, newTimeout);

    // Update timeout data
    timeout.timeoutHandle = newHandle;
    timeout.timeoutMs += additionalMs;

    console.log(`[TimeoutManager] Extended timeout ${timeoutId} by ${additionalMs}ms`);

    return true;
  }

  /**
   * Create timeout configuration from node
   */
  createConfigFromNode(node) {
    const timeout = this.getNodeTimeout(node);
    const nodeConfig = node.data?.timeout || {};

    return {
      timeout,
      enabled: nodeConfig.enabled !== false,
      retryOnTimeout: nodeConfig.retryOnTimeout || false,
      timeoutAction: nodeConfig.timeoutAction || 'fail' // fail, retry, skip
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalTimeouts: 0,
      timeoutsByType: new Map(),
      timeoutsByNode: new Map()
    };

    console.log('[TimeoutManager] Statistics reset');
  }

  /**
   * Export timeout data
   */
  exportTimeouts(instanceId) {
    return {
      instanceId,
      active: this.getActiveTimeouts(instanceId),
      history: this.getTimeoutHistory(instanceId),
      stats: this.getInstanceStats(instanceId)
    };
  }

  /**
   * Shutdown - clear all active timeouts
   */
  shutdown() {
    console.log(`[TimeoutManager] Shutting down - clearing ${this.activeTimeouts.size} active timeouts`);

    for (const [timeoutId, timeout] of this.activeTimeouts.entries()) {
      clearTimeout(timeout.timeoutHandle);
    }

    this.activeTimeouts.clear();
  }
}

module.exports = new TimeoutManager();
