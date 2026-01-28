/**
 * API Routes for Workflow Management
 */

const express = require('express');
const router = express.Router();
const runtimeEngine = require('../runtime/engine');
const logger = require('../utils/logger');

// Get all workflows
router.get('/workflows', (req, res) => {
  try {
    res.json({
      success: true,
      workflows: runtimeEngine.workflows
    });
  } catch (error) {
    logger.error('Failed to get workflows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow by ID
router.get('/workflows/:id', (req, res) => {
  try {
    const workflow = runtimeEngine.workflows.find(w => w.id === req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.json({ success: true, workflow });
  } catch (error) {
    logger.error('Failed to get workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start workflow instance
router.post('/workflows/:id/start', async (req, res) => {
  try {
    const instance = await runtimeEngine.startWorkflow(req.params.id, req.body);
    res.json({
      success: true,
      instance: {
        id: instance.id,
        workflowId: instance.workflowId,
        status: instance.status,
        data: instance.data
      },
      navigation: instance.navigation || {
        initialPageId: null,
        currentTaskId: null,
        workflowComplete: instance.status === 'completed'
      }
    });
  } catch (error) {
    logger.error('Failed to start workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow instance
router.get('/instances/:id', (req, res) => {
  try {
    const instance = runtimeEngine.getInstance(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    res.json({ success: true, instance });
  } catch (error) {
    logger.error('Failed to get instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resume workflow instance
router.post('/instances/:id/resume', async (req, res) => {
  try {
    await runtimeEngine.resumeWorkflow(req.params.id, req.body);
    const instance = runtimeEngine.getInstance(req.params.id);
    res.json({ success: true, instance });
  } catch (error) {
    logger.error('Failed to resume workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete task and continue workflow with navigation
router.post('/instances/:id/complete', async (req, res) => {
  try {
    const { taskId, ...formData } = req.body;
    const result = await runtimeEngine.completeTask(req.params.id, { taskId, ...formData });
    res.json({
      success: true,
      instance: result.instance,
      navigation: result.navigation || {
        workflowComplete: result.instance?.status === 'completed',
        nextPageId: null,
        nextTaskId: null
      }
    });
  } catch (error) {
    logger.error('Failed to complete task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim a task for the current user
router.post('/instances/:id/tasks/:taskId/claim', async (req, res) => {
  try {
    const { userId } = req.body;
    await runtimeEngine.claimTask(req.params.id, req.params.taskId, userId);
    const instance = runtimeEngine.getInstance(req.params.id);
    res.json({ success: true, instance });
  } catch (error) {
    logger.error('Failed to claim task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all instances
router.get('/instances', (req, res) => {
  try {
    const instances = runtimeEngine.getAllInstances();
    res.json({ success: true, instances });
  } catch (error) {
    logger.error('Failed to get instances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get resources (forms, pages, data models)
router.get('/resources/:type', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const filePath = path.join(__dirname, `../resources/${req.params.type}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (error) {
    logger.error('Failed to get resources:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DATA MODEL CRUD ROUTES
// ============================================================================

const database = require('../database');

// Helper to convert model name to table name
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// List all records for a model
router.get('/data/:model', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error(`Failed to list ${req.params.model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single record by ID
router.get('/data/:model/:id', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(`Failed to get ${req.params.model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new record
router.post('/data/:model', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const data = req.body;

    // Convert field names to snake_case
    const columns = Object.keys(data).map(toSnakeCase);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await database.query(sql, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(`Failed to create ${req.params.model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update record
router.put('/data/:model/:id', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const data = req.body;

    // Build SET clause
    const columns = Object.keys(data).map(toSnakeCase);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const sql = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`;
    const result = await database.query(sql, [...values, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(`Failed to update ${req.params.model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete record
router.delete('/data/:model/:id', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(`Failed to delete ${req.params.model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
