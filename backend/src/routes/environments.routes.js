/**
 * Environment Routes
 *
 * API endpoints for managing deployment environments
 */

const express = require('express');
const router = express.Router();
const EnvironmentService = require('../services/EnvironmentService');

// Middleware to get environment service instance
const getEnvironmentService = (req) => {
  if (!req.app.locals.environmentService) {
    req.app.locals.environmentService = new EnvironmentService(req.app.locals.db);
  }
  return req.app.locals.environmentService;
};

/**
 * GET /api/environments
 * Get all environments
 */
router.get('/', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environments = await service.getAll();
    res.json(environments);
  } catch (error) {
    console.error('Error fetching environments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/environments/:id
 * Get environment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environment = await service.getById(req.params.id);

    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    res.json(environment);
  } catch (error) {
    console.error('Error fetching environment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/environments/:id/stats
 * Get environment statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const stats = await service.getStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching environment stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/environments/:id/deployments
 * Get active deployments for an environment
 */
router.get('/:id/deployments', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const deployments = await service.getActiveDeployments(req.params.id);
    res.json(deployments);
  } catch (error) {
    console.error('Error fetching environment deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/environments/type/:type
 * Get environments by type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environments = await service.getByType(req.params.type);
    res.json(environments);
  } catch (error) {
    console.error('Error fetching environments by type:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/environments/default
 * Get default environment
 */
router.get('/default', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environment = await service.getDefault();

    if (!environment) {
      return res.status(404).json({ error: 'No default environment configured' });
    }

    res.json(environment);
  } catch (error) {
    console.error('Error fetching default environment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/environments
 * Create a new environment
 */
router.post('/', async (req, res) => {
  try {
    const service = getEnvironmentService(req);

    // Validate required fields
    if (!req.body.name || !req.body.type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Validate type
    const validTypes = ['local', 'development', 'staging', 'production', 'custom'];
    if (!validTypes.includes(req.body.type)) {
      return res.status(400).json({
        error: `Invalid environment type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const environment = await service.create(req.body);
    res.status(201).json(environment);
  } catch (error) {
    console.error('Error creating environment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/environments/:id
 * Update an environment
 */
router.put('/:id', async (req, res) => {
  try {
    const service = getEnvironmentService(req);

    // Check if environment exists
    const existing = await service.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const environment = await service.update(req.params.id, req.body);
    res.json(environment);
  } catch (error) {
    console.error('Error updating environment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/environments/:id/status
 * Update environment status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'maintenance', 'error'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const environment = await service.update(req.params.id, { status });
    res.json(environment);
  } catch (error) {
    console.error('Error updating environment status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/environments/:id/default
 * Set environment as default
 */
router.patch('/:id/default', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environment = await service.update(req.params.id, { is_default: true });
    res.json(environment);
  } catch (error) {
    console.error('Error setting default environment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/environments/:id/config
 * Update environment configuration
 */
router.put('/:id/config', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environment = await service.update(req.params.id, {
      config: req.body.config,
      env_vars: req.body.env_vars,
      resources: req.body.resources,
      auto_scaling: req.body.auto_scaling
    });
    res.json(environment);
  } catch (error) {
    console.error('Error updating environment config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/environments/:id
 * Delete an environment
 */
router.delete('/:id', async (req, res) => {
  try {
    const service = getEnvironmentService(req);

    // Check if environment exists
    const existing = await service.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // Prevent deletion of default environments
    if (existing.is_default) {
      return res.status(400).json({ error: 'Cannot delete the default environment' });
    }

    await service.delete(req.params.id);
    res.json({ success: true, message: 'Environment deleted' });
  } catch (error) {
    console.error('Error deleting environment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/environments/:id/validate
 * Validate environment configuration
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const service = getEnvironmentService(req);
    const environment = await service.getById(req.params.id);

    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const validation = service.validateConfig(environment.type, environment.config || {});
    res.json(validation);
  } catch (error) {
    console.error('Error validating environment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
