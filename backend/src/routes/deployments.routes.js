/**
 * Deployment Routes
 *
 * API endpoints for managing application deployments
 */

const express = require('express');
const router = express.Router();
const DeploymentService = require('../services/DeploymentService');
const EnvironmentService = require('../services/EnvironmentService');
const UrlGeneratorService = require('../services/UrlGeneratorService');

// Middleware to get service instances
const getServices = (req) => {
  const db = req.app.locals.db;

  if (!req.app.locals.deploymentService) {
    req.app.locals.deploymentService = new DeploymentService(db);
  }
  if (!req.app.locals.environmentService) {
    req.app.locals.environmentService = new EnvironmentService(db);
  }
  if (!req.app.locals.urlGeneratorService) {
    req.app.locals.urlGeneratorService = new UrlGeneratorService();
  }

  return {
    deploymentService: req.app.locals.deploymentService,
    environmentService: req.app.locals.environmentService,
    urlGeneratorService: req.app.locals.urlGeneratorService
  };
};

/**
 * GET /api/deployments
 * Get all deployments with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const { application_id, environment_id, status, limit = 50 } = req.query;

    let deployments;

    if (application_id) {
      deployments = await deploymentService.getDeploymentsByApplication(application_id, parseInt(limit));
    } else if (environment_id) {
      deployments = await deploymentService.getDeploymentsByEnvironment(environment_id, parseInt(limit));
    } else {
      // Get all recent deployments
      const result = await req.app.locals.db.query(`
        SELECT d.*, a.name as application_name, e.name as environment_name, e.type as environment_type
        FROM k1.deployments d
        JOIN k1.applications a ON d.application_id = a.id
        JOIN k1.environments e ON d.environment_id = e.id
        ${status ? 'WHERE d.status = $1' : ''}
        ORDER BY d.started_at DESC
        LIMIT ${parseInt(limit)}
      `, status ? [status] : []);

      deployments = result.rows;
    }

    res.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/active
 * Get all active (running) deployments
 */
router.get('/active', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const deployments = await deploymentService.getAllActiveDeployments();
    res.json(deployments);
  } catch (error) {
    console.error('Error fetching active deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/:id
 * Get deployment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const deployment = await deploymentService.getDeploymentById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    res.json(deployment);
  } catch (error) {
    console.error('Error fetching deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/:id/logs
 * Get deployment logs
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const deployment = await deploymentService.getDeploymentById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    res.json(deployment.logs || []);
  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/:id/urls
 * Get deployment URLs
 */
router.get('/:id/urls', async (req, res) => {
  try {
    const { deploymentService, urlGeneratorService } = getServices(req);
    const deployment = await deploymentService.getDeploymentById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Validate URLs are reachable
    if (req.query.validate === 'true' && deployment.urls) {
      const validation = await urlGeneratorService.validateAllUrls(deployment.urls);
      return res.json({ urls: deployment.urls, validation });
    }

    res.json(deployment.urls || {});
  } catch (error) {
    console.error('Error fetching deployment URLs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/deployments
 * Create a new deployment (one-click deploy)
 */
router.post('/', async (req, res) => {
  try {
    const { deploymentService, environmentService } = getServices(req);
    const { application_id, environment_id, run_tests = true, deployed_by } = req.body;

    // Validate required fields
    if (!application_id || !environment_id) {
      return res.status(400).json({ error: 'application_id and environment_id are required' });
    }

    // Get application
    const appResult = await req.app.locals.db.query(
      'SELECT * FROM k1.applications WHERE id = $1',
      [application_id]
    );

    if (!appResult.rows[0]) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get environment
    const environment = await environmentService.getById(environment_id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // Check environment is active
    if (environment.status !== 'active') {
      return res.status(400).json({
        error: `Environment is not active. Current status: ${environment.status}`
      });
    }

    // Execute deployment
    const deployment = await deploymentService.executeDeployment(
      appResult.rows[0],
      environment,
      { runTests: run_tests, deployedBy: deployed_by }
    );

    res.status(201).json(deployment);
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/deployments/:id/rollback
 * Rollback to a previous deployment
 */
router.post('/:id/rollback', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const deployment = await deploymentService.rollback(req.params.id);
    res.json(deployment);
  } catch (error) {
    console.error('Error rolling back deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/deployments/:id/cancel
 * Cancel a running deployment
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const deployment = await deploymentService.cancelDeployment(req.params.id);
    res.json(deployment);
  } catch (error) {
    console.error('Error cancelling deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/deployments/:id/stop
 * Stop a running deployment
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const deployment = await deploymentService.getDeploymentById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const key = `${deployment.application_id}-${deployment.environment_id}`;
    const result = await deploymentService.stopByKey(key);

    // Update deployment status in database
    await req.app.locals.db.query(`
      UPDATE k1.deployments
      SET status = 'stopped', completed_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error stopping deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/deployments/:id/restart
 * Restart a deployment
 */
router.post('/:id/restart', async (req, res) => {
  try {
    const { deploymentService, environmentService } = getServices(req);
    const deployment = await deploymentService.getDeploymentById(req.params.id);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Get application and environment
    const appResult = await req.app.locals.db.query(
      'SELECT * FROM k1.applications WHERE id = $1',
      [deployment.application_id]
    );
    const environment = await environmentService.getById(deployment.environment_id);

    if (!appResult.rows[0] || !environment) {
      return res.status(404).json({ error: 'Application or environment not found' });
    }

    // Stop existing deployment
    const key = `${deployment.application_id}-${deployment.environment_id}`;
    await deploymentService.stopByKey(key);

    // Create new deployment
    const newDeployment = await deploymentService.executeDeployment(
      appResult.rows[0],
      environment,
      { runTests: false, deployedBy: 'restart' }
    );

    res.json(newDeployment);
  } catch (error) {
    console.error('Error restarting deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/running
 * Get list of all running application instances
 */
router.get('/running/list', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const running = deploymentService.listRunning();
    res.json(running);
  } catch (error) {
    console.error('Error listing running deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/deployments/stop-all
 * Stop all running deployments
 */
router.post('/stop-all', async (req, res) => {
  try {
    const { deploymentService } = getServices(req);
    const results = await deploymentService.stopAll();
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error stopping all deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/history/:applicationId
 * Get deployment history for an application
 */
router.get('/history/:applicationId', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await req.app.locals.db.query(`
      SELECT * FROM k1.deployment_history
      WHERE application_id = $1
      LIMIT $2
    `, [req.params.applicationId, parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deployment history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deployments/stats
 * Get deployment statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await req.app.locals.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status IN ('pending', 'deploying', 'building')) as in_progress,
        COUNT(*) as total,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_duration_seconds
      FROM k1.deployments
      WHERE started_at > NOW() - INTERVAL '30 days'
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching deployment stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
