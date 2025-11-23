/**
 * Production Feature Routes
 * API endpoints for performance metrics, retry stats, timeouts, and distributed locks
 */

const express = require('express');
const router = express.Router();
const performanceMonitor = require('../runtime/PerformanceMonitor');
const retryManager = require('../runtime/RetryManager');
const timeoutManager = require('../runtime/TimeoutManager');
const distributedLockManager = require('../runtime/DistributedLockManager');

// ============================================
// PERFORMANCE METRICS ENDPOINTS
// ============================================

/**
 * GET /api/production/metrics/system
 * Get system-wide performance metrics
 */
router.get('/metrics/system', (req, res) => {
  try {
    const metrics = performanceMonitor.getSystemMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/summary
 * Get performance summary
 */
router.get('/metrics/summary', (req, res) => {
  try {
    const summary = performanceMonitor.getSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/workflow/:workflowId
 * Get performance metrics for a specific workflow
 */
router.get('/metrics/workflow/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const metrics = performanceMonitor.getWorkflowMetrics(workflowId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Workflow metrics not found'
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/node/:nodeId
 * Get performance metrics for a specific node
 */
router.get('/metrics/node/:nodeId', (req, res) => {
  try {
    const { nodeId } = req.params;
    const metrics = performanceMonitor.getNodeMetrics(nodeId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Node metrics not found'
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/instance/:instanceId
 * Get performance metrics for a specific instance
 */
router.get('/metrics/instance/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    const metrics = performanceMonitor.getInstanceMetrics(instanceId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Instance metrics not found'
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/slowest-workflows
 * Get top slowest workflows
 */
router.get('/metrics/slowest-workflows', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const workflows = performanceMonitor.getSlowestWorkflows(limit);

    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/slowest-nodes
 * Get top slowest nodes
 */
router.get('/metrics/slowest-nodes', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const nodes = performanceMonitor.getSlowestNodes(limit);

    res.json({
      success: true,
      data: nodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/metrics/time-range
 * Get metrics for specific time range
 */
router.get('/metrics/time-range', (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime are required'
      });
    }

    const metrics = performanceMonitor.getMetricsForTimeRange(startTime, endTime);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/production/metrics/reset
 * Reset all performance metrics
 */
router.post('/metrics/reset', (req, res) => {
  try {
    performanceMonitor.reset();

    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/production/metrics/thresholds
 * Update performance thresholds
 */
router.put('/metrics/thresholds', (req, res) => {
  try {
    const thresholds = req.body;
    performanceMonitor.setThresholds(thresholds);

    res.json({
      success: true,
      message: 'Performance thresholds updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// RETRY MANAGER ENDPOINTS
// ============================================

/**
 * GET /api/production/retry/stats
 * Get retry statistics
 */
router.get('/retry/stats', (req, res) => {
  try {
    const stats = retryManager.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/retry/instance/:instanceId
 * Get retry data for an instance
 */
router.get('/retry/instance/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    const retries = retryManager.getInstanceRetries(instanceId);

    res.json({
      success: true,
      data: retries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/retry/instance/:instanceId/stats
 * Get retry statistics for an instance
 */
router.get('/retry/instance/:instanceId/stats', (req, res) => {
  try {
    const { instanceId } = req.params;
    const stats = retryManager.getInstanceStats(instanceId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/production/retry/instance/:instanceId
 * Clear retry data for an instance
 */
router.delete('/retry/instance/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    retryManager.clearInstanceRetries(instanceId);

    res.json({
      success: true,
      message: 'Retry data cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/production/retry/reset-stats
 * Reset retry statistics
 */
router.post('/retry/reset-stats', (req, res) => {
  try {
    retryManager.resetStats();

    res.json({
      success: true,
      message: 'Retry statistics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TIMEOUT MANAGER ENDPOINTS
// ============================================

/**
 * GET /api/production/timeout/stats
 * Get timeout statistics
 */
router.get('/timeout/stats', (req, res) => {
  try {
    const stats = timeoutManager.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/timeout/instance/:instanceId
 * Get timeout information for an instance
 */
router.get('/timeout/instance/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    const timeouts = timeoutManager.exportTimeouts(instanceId);

    res.json({
      success: true,
      data: timeouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/timeout/instance/:instanceId/active
 * Get active timeouts for an instance
 */
router.get('/timeout/instance/:instanceId/active', (req, res) => {
  try {
    const { instanceId } = req.params;
    const activeTimeouts = timeoutManager.getActiveTimeouts(instanceId);

    res.json({
      success: true,
      data: activeTimeouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/timeout/instance/:instanceId/history
 * Get timeout history for an instance
 */
router.get('/timeout/instance/:instanceId/history', (req, res) => {
  try {
    const { instanceId } = req.params;
    const history = timeoutManager.getTimeoutHistory(instanceId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/production/timeout/instance/:instanceId
 * Clear timeouts for an instance
 */
router.delete('/timeout/instance/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    timeoutManager.clearInstanceTimeouts(instanceId);
    timeoutManager.clearTimeoutHistory(instanceId);

    res.json({
      success: true,
      message: 'Timeouts cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/production/timeout/defaults
 * Update default timeouts
 */
router.put('/timeout/defaults', (req, res) => {
  try {
    const timeouts = req.body;
    timeoutManager.setDefaultTimeouts(timeouts);

    res.json({
      success: true,
      message: 'Default timeouts updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/production/timeout/reset-stats
 * Reset timeout statistics
 */
router.post('/timeout/reset-stats', (req, res) => {
  try {
    timeoutManager.resetStats();

    res.json({
      success: true,
      message: 'Timeout statistics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// DISTRIBUTED LOCK MANAGER ENDPOINTS
// ============================================

/**
 * GET /api/production/locks/stats
 * Get distributed lock statistics
 */
router.get('/locks/stats', (req, res) => {
  try {
    const stats = distributedLockManager.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/locks/active
 * Get active locks
 */
router.get('/locks/active', (req, res) => {
  try {
    const locks = distributedLockManager.getActiveLocks();
    res.json({
      success: true,
      data: locks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/production/locks/:lockKey
 * Get information about a specific lock
 */
router.get('/locks/:lockKey', async (req, res) => {
  try {
    const { lockKey } = req.params;
    const lockInfo = await distributedLockManager.getLockInfo(lockKey);

    res.json({
      success: true,
      data: lockInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/production/locks/cleanup
 * Clean up expired locks
 */
router.post('/locks/cleanup', async (req, res) => {
  try {
    const cleaned = await distributedLockManager.cleanupExpiredLocks();

    res.json({
      success: true,
      message: `Cleaned up ${cleaned} expired locks`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/production/locks/release-all
 * Release all locks held by this instance
 */
router.post('/locks/release-all', async (req, res) => {
  try {
    await distributedLockManager.releaseAllLocks();

    res.json({
      success: true,
      message: 'All locks released successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/production/locks/config
 * Update distributed lock configuration
 */
router.put('/locks/config', (req, res) => {
  try {
    const config = req.body;
    distributedLockManager.setConfig(config);

    res.json({
      success: true,
      message: 'Lock configuration updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
