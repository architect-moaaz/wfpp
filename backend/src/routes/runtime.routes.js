/**
 * Workflow Runtime API Routes
 * Endpoints for executing and managing workflow instances
 */

const express = require('express');
const router = express.Router();
const runtimeEngine = require('../runtime/WorkflowRuntimeEngine');
const workflowDatabase = require('../database/WorkflowDatabase');
const eventManager = require('../runtime/EventManager');

/**
 * POST /api/runtime/start
 * Start a new workflow instance
 */
router.post('/start', async (req, res) => {
  try {
    const { workflowDef, inputData, initiator } = req.body;

    if (!workflowDef || !workflowDef.nodes) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow definition'
      });
    }

    const instance = await runtimeEngine.startWorkflow(workflowDef, inputData || {}, initiator || 'system');

    res.status(200).json({
      success: true,
      instance
    });

  } catch (error) {
    console.error('[Runtime API] Start workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/complete-task/:instanceId
 * Complete a human task and continue workflow
 */
router.post('/complete-task/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const taskData = req.body;

    const instance = await runtimeEngine.completeTask(instanceId, taskData);

    res.status(200).json({
      success: true,
      instance
    });

  } catch (error) {
    console.error('[Runtime API] Complete task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/instance/:id
 * Get workflow instance status
 */
router.get('/instance/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await runtimeEngine.getInstanceStatus(id);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    res.status(200).json({
      success: true,
      instance
    });

  } catch (error) {
    console.error('[Runtime API] Get instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/recover/:id
 * Recover a failed workflow instance
 */
router.post('/recover/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await runtimeEngine.recoverInstance(id);

    res.status(200).json({
      success: true,
      instance
    });

  } catch (error) {
    console.error('[Runtime API] Recover instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/tasks
 * Get all pending tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await runtimeEngine.getPendingTasks();

    res.status(200).json({
      success: true,
      tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('[Runtime API] Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/instances
 * Get all instances (optionally filter by status)
 */
router.get('/instances', async (req, res) => {
  try {
    const { status } = req.query;

    let instances;
    if (status) {
      instances = await workflowDatabase.getInstancesByStatus(status);
    } else {
      instances = await workflowDatabase.loadInstances();
    }

    res.status(200).json({
      success: true,
      instances,
      count: instances.length
    });

  } catch (error) {
    console.error('[Runtime API] Get instances error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/instance/:id/tokens
 * Get detailed token information for an instance
 */
router.get('/instance/:id/tokens', async (req, res) => {
  try {
    const { id } = req.params;

    const tokenInfo = runtimeEngine.getInstanceTokens(id);

    res.status(200).json({
      success: true,
      instanceId: id,
      ...tokenInfo
    });

  } catch (error) {
    console.error('[Runtime API] Get instance tokens error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/instance/:id/snapshot
 * Create a state snapshot for an instance
 */
router.post('/instance/:id/snapshot', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const snapshot = await runtimeEngine.createSnapshot(id, reason || 'manual');

    res.status(200).json({
      success: true,
      snapshot: {
        id: snapshot.id,
        instanceId: snapshot.instanceId,
        timestamp: snapshot.timestamp,
        metadata: snapshot.metadata
      }
    });

  } catch (error) {
    console.error('[Runtime API] Create snapshot error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/instance/:id/snapshots
 * Get all snapshots for an instance
 */
router.get('/instance/:id/snapshots', async (req, res) => {
  try {
    const { id } = req.params;

    const snapshots = runtimeEngine.getInstanceSnapshots(id);

    res.status(200).json({
      success: true,
      instanceId: id,
      snapshots,
      count: snapshots.length
    });

  } catch (error) {
    console.error('[Runtime API] Get snapshots error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/snapshot/:snapshotId
 * Get details of a specific snapshot
 */
router.get('/snapshot/:snapshotId', async (req, res) => {
  try {
    const { snapshotId } = req.params;

    const snapshot = await runtimeEngine.getSnapshotDetails(snapshotId);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Snapshot not found'
      });
    }

    res.status(200).json({
      success: true,
      snapshot
    });

  } catch (error) {
    console.error('[Runtime API] Get snapshot details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/snapshot/:snapshotId/rollback
 * Rollback to a specific snapshot
 */
router.post('/snapshot/:snapshotId/rollback', async (req, res) => {
  try {
    const { snapshotId } = req.params;

    const result = await runtimeEngine.rollbackToSnapshot(snapshotId);

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[Runtime API] Rollback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/instance/:id/transaction/begin
 * Begin a transaction
 */
router.post('/instance/:id/transaction/begin', async (req, res) => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    const transactionId = await runtimeEngine.beginTransaction(id, metadata || {});

    res.status(200).json({
      success: true,
      transactionId,
      instanceId: id
    });

  } catch (error) {
    console.error('[Runtime API] Begin transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/transaction/:transactionId/commit
 * Commit a transaction
 */
router.post('/transaction/:transactionId/commit', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await runtimeEngine.commitTransaction(transactionId);

    res.status(200).json(result);

  } catch (error) {
    console.error('[Runtime API] Commit transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/runtime/transaction/:transactionId/rollback
 * Rollback a transaction
 */
router.post('/transaction/:transactionId/rollback', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await runtimeEngine.rollbackTransaction(transactionId);

    res.status(200).json(result);

  } catch (error) {
    console.error('[Runtime API] Rollback transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/instance/:id/state/stats
 * Get state management statistics
 */
router.get('/instance/:id/state/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const stats = runtimeEngine.getStateStats(id);

    res.status(200).json({
      success: true,
      instanceId: id,
      stats
    });

  } catch (error) {
    console.error('[Runtime API] Get state stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/events/history/:instanceId
 * Get event history for a workflow instance
 */
router.get('/events/history/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    const { type, since, until, limit } = req.query;

    const options = {};
    if (type) options.type = type;
    if (since) options.since = new Date(since);
    if (until) options.until = new Date(until);
    if (limit) options.limit = parseInt(limit);

    const history = eventManager.getHistory(instanceId, options);

    res.status(200).json({
      success: true,
      instanceId,
      events: history,
      count: history.length
    });

  } catch (error) {
    console.error('[Runtime API] Get event history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/events/stats
 * Get global event statistics
 */
router.get('/events/stats', (req, res) => {
  try {
    const stats = eventManager.getStats();

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[Runtime API] Get event stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/runtime/events/history/:instanceId
 * Clear event history for an instance
 */
router.delete('/events/history/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;

    eventManager.clearHistory(instanceId);

    res.status(200).json({
      success: true,
      instanceId,
      message: 'Event history cleared'
    });

  } catch (error) {
    console.error('[Runtime API] Clear event history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/runtime/health
 * Runtime engine health check
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Workflow Runtime Engine is running',
    features: {
      llm: !!process.env.ANTHROPIC_API_KEY,
      database: 'file-based',
      agents: ['Execution', 'State', 'Validation', 'Notification', 'Recovery'],
      gateways: ['Parallel (AND)', 'Inclusive (OR)', 'Exclusive (XOR)'],
      tokens: true,
      stateManagement: {
        snapshots: true,
        transactions: true,
        rollback: true
      },
      realTimeEvents: {
        websocket: true,
        eventHistory: true,
        eventBroadcasting: true
      }
    }
  });
});

module.exports = router;
