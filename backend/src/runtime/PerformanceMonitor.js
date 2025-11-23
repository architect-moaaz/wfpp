/**
 * Performance Monitor
 * Tracks and analyzes performance metrics for workflow execution
 */

class PerformanceMonitor {
  constructor() {
    // Performance metrics storage
    this.metrics = {
      workflows: new Map(), // workflowId -> metrics
      nodes: new Map(), // nodeId -> metrics
      instances: new Map() // instanceId -> metrics
    };

    // Real-time metrics tracking
    this.activeOperations = new Map(); // operationId -> start time

    // Aggregated metrics
    this.aggregated = {
      workflowExecutionTimes: [],
      nodeExecutionTimes: [],
      throughput: {
        workflowsCompleted: 0,
        workflowsFailed: 0,
        nodesExecuted: 0,
        startTime: new Date()
      }
    };

    // Performance thresholds for alerts
    this.thresholds = {
      nodeExecution: 30000, // 30 seconds
      workflowExecution: 600000, // 10 minutes
      memoryUsageMB: 1000 // 1GB
    };

    // Time window for percentile calculations (default: last 1000 samples)
    this.maxSamples = 1000;
  }

  /**
   * Start tracking an operation
   */
  startOperation(operationId, context = {}) {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      context
    });

    return operationId;
  }

  /**
   * End tracking an operation
   */
  endOperation(operationId) {
    const operation = this.activeOperations.get(operationId);

    if (!operation) {
      console.warn(`[PerformanceMonitor] Operation ${operationId} not found`);
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - operation.startTime;

    const metrics = {
      operationId,
      duration,
      startTime: operation.startTime,
      endTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - operation.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - operation.startMemory.heapTotal,
        rss: endMemory.rss - operation.startMemory.rss
      },
      context: operation.context
    };

    this.activeOperations.delete(operationId);

    return metrics;
  }

  /**
   * Record workflow execution metrics
   */
  recordWorkflowExecution(workflowId, instanceId, metrics) {
    const { duration, status, nodeCount, error } = metrics;

    // Store instance metrics
    this.metrics.instances.set(instanceId, {
      workflowId,
      duration,
      status,
      nodeCount,
      timestamp: new Date(),
      error
    });

    // Aggregate workflow metrics
    if (!this.metrics.workflows.has(workflowId)) {
      this.metrics.workflows.set(workflowId, {
        workflowId,
        executions: [],
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      });
    }

    const workflowMetrics = this.metrics.workflows.get(workflowId);
    workflowMetrics.executions.push({ duration, status, timestamp: new Date() });
    workflowMetrics.totalExecutions++;

    if (status === 'COMPLETED') {
      workflowMetrics.successfulExecutions++;
      this.aggregated.throughput.workflowsCompleted++;
    } else if (status === 'FAILED') {
      workflowMetrics.failedExecutions++;
      this.aggregated.throughput.workflowsFailed++;
    }

    // Update duration statistics
    workflowMetrics.minDuration = Math.min(workflowMetrics.minDuration, duration);
    workflowMetrics.maxDuration = Math.max(workflowMetrics.maxDuration, duration);
    workflowMetrics.avgDuration =
      workflowMetrics.executions.reduce((sum, e) => sum + e.duration, 0) /
      workflowMetrics.executions.length;

    // Trim to max samples
    if (workflowMetrics.executions.length > this.maxSamples) {
      workflowMetrics.executions.shift();
    }

    // Add to aggregated metrics
    this.aggregated.workflowExecutionTimes.push(duration);
    if (this.aggregated.workflowExecutionTimes.length > this.maxSamples) {
      this.aggregated.workflowExecutionTimes.shift();
    }

    console.log(`[PerformanceMonitor] Workflow ${workflowId} execution recorded: ${duration}ms (${status})`);
  }

  /**
   * Record node execution metrics
   */
  recordNodeExecution(nodeId, instanceId, metrics) {
    const { duration, status, nodeType, error } = metrics;

    // Aggregate node metrics
    if (!this.metrics.nodes.has(nodeId)) {
      this.metrics.nodes.set(nodeId, {
        nodeId,
        nodeType,
        executions: [],
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      });
    }

    const nodeMetrics = this.metrics.nodes.get(nodeId);
    nodeMetrics.executions.push({ duration, status, instanceId, timestamp: new Date() });
    nodeMetrics.totalExecutions++;

    if (status === 'COMPLETED') {
      nodeMetrics.successfulExecutions++;
      this.aggregated.throughput.nodesExecuted++;
    } else if (status === 'FAILED') {
      nodeMetrics.failedExecutions++;
    }

    // Update duration statistics
    nodeMetrics.minDuration = Math.min(nodeMetrics.minDuration, duration);
    nodeMetrics.maxDuration = Math.max(nodeMetrics.maxDuration, duration);
    nodeMetrics.avgDuration =
      nodeMetrics.executions.reduce((sum, e) => sum + e.duration, 0) /
      nodeMetrics.executions.length;

    // Trim to max samples
    if (nodeMetrics.executions.length > this.maxSamples) {
      nodeMetrics.executions.shift();
    }

    // Add to aggregated metrics
    this.aggregated.nodeExecutionTimes.push(duration);
    if (this.aggregated.nodeExecutionTimes.length > this.maxSamples) {
      this.aggregated.nodeExecutionTimes.shift();
    }

    // Check performance thresholds
    if (duration > this.thresholds.nodeExecution) {
      console.warn(`[PerformanceMonitor] Node ${nodeId} execution exceeded threshold: ${duration}ms > ${this.thresholds.nodeExecution}ms`);
    }
  }

  /**
   * Calculate percentile from array of values
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * Get workflow performance metrics
   */
  getWorkflowMetrics(workflowId) {
    const metrics = this.metrics.workflows.get(workflowId);

    if (!metrics) {
      return null;
    }

    const durations = metrics.executions.map(e => e.duration);

    return {
      ...metrics,
      percentiles: {
        p50: this.calculatePercentile(durations, 50),
        p75: this.calculatePercentile(durations, 75),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99)
      },
      successRate: metrics.totalExecutions > 0
        ? (metrics.successfulExecutions / metrics.totalExecutions) * 100
        : 0
    };
  }

  /**
   * Get node performance metrics
   */
  getNodeMetrics(nodeId) {
    const metrics = this.metrics.nodes.get(nodeId);

    if (!metrics) {
      return null;
    }

    const durations = metrics.executions.map(e => e.duration);

    return {
      ...metrics,
      percentiles: {
        p50: this.calculatePercentile(durations, 50),
        p75: this.calculatePercentile(durations, 75),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99)
      },
      successRate: metrics.totalExecutions > 0
        ? (metrics.successfulExecutions / metrics.totalExecutions) * 100
        : 0
    };
  }

  /**
   * Get instance performance metrics
   */
  getInstanceMetrics(instanceId) {
    return this.metrics.instances.get(instanceId);
  }

  /**
   * Get system-wide performance metrics
   */
  getSystemMetrics() {
    const uptime = Date.now() - this.aggregated.throughput.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);

    const workflowDurations = this.aggregated.workflowExecutionTimes;
    const nodeDurations = this.aggregated.nodeExecutionTimes;

    return {
      uptime: uptime,
      uptimeHours: uptimeHours,
      throughput: {
        workflowsPerHour: uptimeHours > 0 ? this.aggregated.throughput.workflowsCompleted / uptimeHours : 0,
        nodesPerSecond: uptime > 0 ? (this.aggregated.throughput.nodesExecuted / uptime) * 1000 : 0,
        totalWorkflowsCompleted: this.aggregated.throughput.workflowsCompleted,
        totalWorkflowsFailed: this.aggregated.throughput.workflowsFailed,
        totalNodesExecuted: this.aggregated.throughput.nodesExecuted
      },
      workflows: {
        avgDuration: workflowDurations.length > 0
          ? workflowDurations.reduce((a, b) => a + b, 0) / workflowDurations.length
          : 0,
        p50: this.calculatePercentile(workflowDurations, 50),
        p95: this.calculatePercentile(workflowDurations, 95),
        p99: this.calculatePercentile(workflowDurations, 99),
        totalTracked: this.metrics.workflows.size
      },
      nodes: {
        avgDuration: nodeDurations.length > 0
          ? nodeDurations.reduce((a, b) => a + b, 0) / nodeDurations.length
          : 0,
        p50: this.calculatePercentile(nodeDurations, 50),
        p95: this.calculatePercentile(nodeDurations, 95),
        p99: this.calculatePercentile(nodeDurations, 99),
        totalTracked: this.metrics.nodes.size
      },
      memory: process.memoryUsage(),
      activeOperations: this.activeOperations.size
    };
  }

  /**
   * Get top slowest workflows
   */
  getSlowestWorkflows(limit = 10) {
    const workflows = Array.from(this.metrics.workflows.values())
      .map(w => ({
        workflowId: w.workflowId,
        avgDuration: w.avgDuration,
        maxDuration: w.maxDuration,
        executions: w.totalExecutions
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);

    return workflows;
  }

  /**
   * Get top slowest nodes
   */
  getSlowestNodes(limit = 10) {
    const nodes = Array.from(this.metrics.nodes.values())
      .map(n => ({
        nodeId: n.nodeId,
        nodeType: n.nodeType,
        avgDuration: n.avgDuration,
        maxDuration: n.maxDuration,
        executions: n.totalExecutions
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);

    return nodes;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const systemMetrics = this.getSystemMetrics();

    return {
      system: systemMetrics,
      slowestWorkflows: this.getSlowestWorkflows(5),
      slowestNodes: this.getSlowestNodes(5),
      thresholds: this.thresholds
    };
  }

  /**
   * Clear metrics for an instance
   */
  clearInstanceMetrics(instanceId) {
    this.metrics.instances.delete(instanceId);
    console.log(`[PerformanceMonitor] Cleared metrics for instance ${instanceId}`);
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      workflows: new Map(),
      nodes: new Map(),
      instances: new Map()
    };

    this.activeOperations.clear();

    this.aggregated = {
      workflowExecutionTimes: [],
      nodeExecutionTimes: [],
      throughput: {
        workflowsCompleted: 0,
        workflowsFailed: 0,
        nodesExecuted: 0,
        startTime: new Date()
      }
    };

    console.log('[PerformanceMonitor] All metrics reset');
  }

  /**
   * Set performance thresholds
   */
  setThresholds(thresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds
    };

    console.log('[PerformanceMonitor] Thresholds updated:', this.thresholds);
  }

  /**
   * Export metrics
   */
  exportMetrics() {
    return {
      workflows: Object.fromEntries(this.metrics.workflows),
      nodes: Object.fromEntries(this.metrics.nodes),
      instances: Object.fromEntries(this.metrics.instances),
      aggregated: this.aggregated,
      system: this.getSystemMetrics()
    };
  }

  /**
   * Get metrics for specific time range
   */
  getMetricsForTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const instances = Array.from(this.metrics.instances.values())
      .filter(i => i.timestamp >= start && i.timestamp <= end);

    const workflowExecutions = [];
    const nodeExecutions = [];

    this.metrics.workflows.forEach(workflow => {
      const executions = workflow.executions.filter(
        e => e.timestamp >= start && e.timestamp <= end
      );
      if (executions.length > 0) {
        workflowExecutions.push(...executions);
      }
    });

    this.metrics.nodes.forEach(node => {
      const executions = node.executions.filter(
        e => e.timestamp >= start && e.timestamp <= end
      );
      if (executions.length > 0) {
        nodeExecutions.push(...executions);
      }
    });

    return {
      instances: instances.length,
      workflows: workflowExecutions.length,
      nodes: nodeExecutions.length,
      avgWorkflowDuration: workflowExecutions.length > 0
        ? workflowExecutions.reduce((sum, e) => sum + e.duration, 0) / workflowExecutions.length
        : 0,
      avgNodeDuration: nodeExecutions.length > 0
        ? nodeExecutions.reduce((sum, e) => sum + e.duration, 0) / nodeExecutions.length
        : 0
    };
  }
}

module.exports = new PerformanceMonitor();
