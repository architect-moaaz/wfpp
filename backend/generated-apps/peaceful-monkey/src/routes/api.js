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

module.exports = router;
