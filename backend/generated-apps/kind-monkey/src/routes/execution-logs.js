/**
 * Execution Logs Routes
 * API endpoints for viewing workflow execution history and learned fixes
 */

const express = require('express');
const router = express.Router();
const executionLogDB = require('../database/ExecutionLogDatabase');

/**
 * GET /api/execution-logs/statistics
 * Get overall execution statistics
 */
router.get('/statistics', (req, res) => {
  try {
    const { workflowId } = req.query;
    const stats = executionLogDB.getStatistics(workflowId);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/execution-logs/history
 * Get recent execution history
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 50, workflowId } = req.query;
    const history = executionLogDB.getRecentExecutions(parseInt(limit), workflowId);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/execution-logs/fixes
 * Get all learned fixes
 */
router.get('/fixes', (req, res) => {
  try {
    const fixes = executionLogDB.getAllFixes();

    res.json({
      success: true,
      fixes,
      count: fixes.length
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error getting fixes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/execution-logs/similar-fixes
 * Find similar fixes for a given error
 */
router.get('/similar-fixes', (req, res) => {
  try {
    const { errorMessage, script, limit = 5 } = req.query;

    if (!errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'errorMessage parameter is required'
      });
    }

    const similarFixes = executionLogDB.findSimilarFixes(
      errorMessage,
      script || '',
      parseInt(limit)
    );

    res.json({
      success: true,
      fixes: similarFixes,
      count: similarFixes.length
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error finding similar fixes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/execution-logs/clear-old
 * Clear old logs
 */
router.post('/clear-old', (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const result = executionLogDB.clearOldLogs(parseInt(daysToKeep));

    res.json({
      success: true,
      removed: result.removed,
      remaining: result.remaining
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error clearing old logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
