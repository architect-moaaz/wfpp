/**
 * Retry Manager
 * Handles retry logic with configurable policies and backoff strategies
 */

class RetryManager {
  constructor() {
    // Retry tracking: instanceId -> nodeId -> retry data
    this.retries = new Map();

    // Default retry policies
    this.defaultPolicies = {
      maxRetries: 3,
      backoffStrategy: 'exponential', // exponential, linear, fixed
      initialDelay: 1000, // 1 second
      maxDelay: 60000, // 60 seconds
      backoffMultiplier: 2,
      jitter: true // Add randomness to prevent thundering herd
    };

    // Retry statistics
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      retriesByNode: new Map()
    };
  }

  /**
   * Check if operation should be retried
   */
  shouldRetry(instanceId, nodeId, error, customPolicy = {}) {
    const policy = { ...this.defaultPolicies, ...customPolicy };
    const retryData = this.getRetryData(instanceId, nodeId);

    // Check if max retries exceeded
    if (retryData.attemptCount >= policy.maxRetries) {
      console.log(`[RetryManager] Max retries (${policy.maxRetries}) exceeded for node ${nodeId}`);
      return false;
    }

    // Check if error is retryable
    if (policy.retryableErrors && Array.isArray(policy.retryableErrors)) {
      const isRetryable = policy.retryableErrors.some(retryableError => {
        if (typeof retryableError === 'string') {
          return error.message?.includes(retryableError);
        }
        if (retryableError instanceof RegExp) {
          return retryableError.test(error.message);
        }
        return false;
      });

      if (!isRetryable) {
        console.log(`[RetryManager] Error not retryable for node ${nodeId}: ${error.message}`);
        return false;
      }
    }

    // Check if error is non-retryable
    if (policy.nonRetryableErrors && Array.isArray(policy.nonRetryableErrors)) {
      const isNonRetryable = policy.nonRetryableErrors.some(nonRetryableError => {
        if (typeof nonRetryableError === 'string') {
          return error.message?.includes(nonRetryableError);
        }
        if (nonRetryableError instanceof RegExp) {
          return nonRetryableError.test(error.message);
        }
        return false;
      });

      if (isNonRetryable) {
        console.log(`[RetryManager] Error non-retryable for node ${nodeId}: ${error.message}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate delay before next retry
   */
  calculateDelay(instanceId, nodeId, policy = {}) {
    const config = { ...this.defaultPolicies, ...policy };
    const retryData = this.getRetryData(instanceId, nodeId);
    const attemptNumber = retryData.attemptCount;

    let delay;

    switch (config.backoffStrategy) {
      case 'exponential':
        delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber),
          config.maxDelay
        );
        break;

      case 'linear':
        delay = Math.min(
          config.initialDelay * (attemptNumber + 1),
          config.maxDelay
        );
        break;

      case 'fixed':
        delay = config.initialDelay;
        break;

      default:
        delay = config.initialDelay;
    }

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }

    return Math.floor(delay);
  }

  /**
   * Record retry attempt
   */
  recordRetry(instanceId, nodeId, error) {
    const retryData = this.getRetryData(instanceId, nodeId);

    retryData.attemptCount++;
    retryData.lastAttempt = new Date();
    retryData.errors.push({
      timestamp: new Date(),
      message: error.message,
      stack: error.stack
    });

    // Update statistics
    this.stats.totalRetries++;

    if (!this.stats.retriesByNode.has(nodeId)) {
      this.stats.retriesByNode.set(nodeId, 0);
    }
    this.stats.retriesByNode.set(nodeId, this.stats.retriesByNode.get(nodeId) + 1);

    console.log(`[RetryManager] Retry attempt ${retryData.attemptCount} for node ${nodeId} in instance ${instanceId}`);

    return retryData;
  }

  /**
   * Record successful retry
   */
  recordSuccess(instanceId, nodeId) {
    const retryData = this.getRetryData(instanceId, nodeId);

    if (retryData.attemptCount > 0) {
      retryData.succeeded = true;
      retryData.succeededAt = new Date();
      this.stats.successfulRetries++;

      console.log(`[RetryManager] Retry succeeded for node ${nodeId} after ${retryData.attemptCount} attempts`);
    }
  }

  /**
   * Record failed retry (max retries exceeded)
   */
  recordFailure(instanceId, nodeId) {
    const retryData = this.getRetryData(instanceId, nodeId);

    retryData.failed = true;
    retryData.failedAt = new Date();
    this.stats.failedRetries++;

    console.log(`[RetryManager] Retry failed for node ${nodeId} after ${retryData.attemptCount} attempts`);
  }

  /**
   * Get retry data for a node
   */
  getRetryData(instanceId, nodeId) {
    if (!this.retries.has(instanceId)) {
      this.retries.set(instanceId, new Map());
    }

    const instanceRetries = this.retries.get(instanceId);

    if (!instanceRetries.has(nodeId)) {
      instanceRetries.set(nodeId, {
        nodeId,
        instanceId,
        attemptCount: 0,
        errors: [],
        firstAttempt: new Date(),
        lastAttempt: null,
        succeeded: false,
        succeededAt: null,
        failed: false,
        failedAt: null
      });
    }

    return instanceRetries.get(nodeId);
  }

  /**
   * Get all retry data for an instance
   */
  getInstanceRetries(instanceId) {
    if (!this.retries.has(instanceId)) {
      return [];
    }

    const instanceRetries = this.retries.get(instanceId);
    return Array.from(instanceRetries.values());
  }

  /**
   * Clear retry data for a node
   */
  clearNodeRetries(instanceId, nodeId) {
    if (this.retries.has(instanceId)) {
      this.retries.get(instanceId).delete(nodeId);
    }
  }

  /**
   * Clear all retry data for an instance
   */
  clearInstanceRetries(instanceId) {
    this.retries.delete(instanceId);
    console.log(`[RetryManager] Cleared retry data for instance ${instanceId}`);
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(operation, context, policy = {}) {
    const { instanceId, nodeId } = context;
    const config = { ...this.defaultPolicies, ...policy };

    let lastError;

    while (true) {
      try {
        // Execute operation
        const result = await operation();

        // Record success if this was a retry
        this.recordSuccess(instanceId, nodeId);

        return {
          success: true,
          result,
          attempts: this.getRetryData(instanceId, nodeId).attemptCount + 1
        };

      } catch (error) {
        lastError = error;

        // Check if should retry
        if (!this.shouldRetry(instanceId, nodeId, error, config)) {
          this.recordFailure(instanceId, nodeId);
          throw error;
        }

        // Record retry attempt
        this.recordRetry(instanceId, nodeId, error);

        // Calculate delay
        const delay = this.calculateDelay(instanceId, nodeId, config);

        console.log(`[RetryManager] Retrying in ${delay}ms...`);

        // Wait before retry
        await this.sleep(delay);
      }
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   */
  getStats() {
    return {
      ...this.stats,
      retriesByNode: Object.fromEntries(this.stats.retriesByNode),
      instancesTracked: this.retries.size
    };
  }

  /**
   * Get retry statistics for an instance
   */
  getInstanceStats(instanceId) {
    const retries = this.getInstanceRetries(instanceId);

    return {
      totalNodes: retries.length,
      totalAttempts: retries.reduce((sum, r) => sum + r.attemptCount, 0),
      succeeded: retries.filter(r => r.succeeded).length,
      failed: retries.filter(r => r.failed).length,
      inProgress: retries.filter(r => !r.succeeded && !r.failed).length,
      retries
    };
  }

  /**
   * Export retry data
   */
  exportRetries(instanceId) {
    return {
      instanceId,
      retries: this.getInstanceRetries(instanceId),
      stats: this.getInstanceStats(instanceId)
    };
  }

  /**
   * Import retry data (for recovery)
   */
  importRetries(instanceId, retries) {
    if (!this.retries.has(instanceId)) {
      this.retries.set(instanceId, new Map());
    }

    const instanceRetries = this.retries.get(instanceId);

    retries.forEach(retryData => {
      instanceRetries.set(retryData.nodeId, retryData);
    });

    console.log(`[RetryManager] Imported ${retries.length} retry records for instance ${instanceId}`);
  }

  /**
   * Create retry policy from node configuration
   */
  createPolicyFromNode(node) {
    const nodeConfig = node.data?.retry || {};

    return {
      maxRetries: nodeConfig.maxRetries || this.defaultPolicies.maxRetries,
      backoffStrategy: nodeConfig.backoffStrategy || this.defaultPolicies.backoffStrategy,
      initialDelay: nodeConfig.initialDelay || this.defaultPolicies.initialDelay,
      maxDelay: nodeConfig.maxDelay || this.defaultPolicies.maxDelay,
      backoffMultiplier: nodeConfig.backoffMultiplier || this.defaultPolicies.backoffMultiplier,
      jitter: nodeConfig.jitter !== undefined ? nodeConfig.jitter : this.defaultPolicies.jitter,
      retryableErrors: nodeConfig.retryableErrors,
      nonRetryableErrors: nodeConfig.nonRetryableErrors
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      retriesByNode: new Map()
    };

    console.log('[RetryManager] Statistics reset');
  }
}

module.exports = new RetryManager();
