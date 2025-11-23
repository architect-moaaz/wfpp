/**
 * Application API Routes
 *
 * Endpoints for managing applications
 */

const express = require('express');
const router = express.Router();
const applicationService = require('../services/ApplicationService');
const ApplicationGenerator = require('../generators/ApplicationGenerator');
const DeploymentService = require('../services/DeploymentService');

// Get all applications
router.get('/', async (req, res) => {
  try {
    const applications = await applicationService.getApplications();
    res.json({
      success: true,
      applications,
      count: applications.length
    });
  } catch (error) {
    console.error('[Applications API] Failed to get applications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single application
router.get('/:id', async (req, res) => {
  try {
    const application = await applicationService.getApplication(req.params.id);
    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('[Applications API] Failed to get application:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Create new application
router.post('/', async (req, res) => {
  try {
    const { name, description, domain, industry, resources, theme } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Application name is required'
      });
    }

    const application = await applicationService.createApplication({
      name,
      description,
      domain,
      industry,
      resources,
      theme
    });

    res.status(201).json({
      success: true,
      application,
      message: 'Application created successfully'
    });
  } catch (error) {
    console.error('[Applications API] Failed to create application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update application
router.put('/:id', async (req, res) => {
  try {
    const application = await applicationService.updateApplication(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      application,
      message: 'Application updated successfully'
    });
  } catch (error) {
    console.error('[Applications API] Failed to update application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    await applicationService.deleteApplication(req.params.id);
    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('[Applications API] Failed to delete application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate application scaffold
router.post('/:id/generate', async (req, res) => {
  try {
    const application = await applicationService.getApplication(req.params.id);
    const generator = new ApplicationGenerator(application);

    const result = await generator.generate();

    res.json({
      success: true,
      message: 'Application scaffold generated successfully',
      path: result.path,
      files: result.files
    });
  } catch (error) {
    console.error('[Applications API] Failed to generate application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Deploy application
router.post('/:id/deploy', async (req, res) => {
  try {
    const { type = 'standalone', port = 4000 } = req.body;
    const application = await applicationService.getApplication(req.params.id);

    const deploymentService = new DeploymentService();
    const result = await deploymentService.deploy(application, { type, port });

    // Update application deployment info
    await applicationService.updateApplication(req.params.id, {
      deployment: {
        type,
        path: result.path,
        url: result.url,
        port
      },
      status: 'deployed'
    });

    res.json({
      success: true,
      message: 'Application deployed successfully',
      deployment: result
    });
  } catch (error) {
    console.error('[Applications API] Failed to deploy application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start application
router.post('/:id/start', async (req, res) => {
  try {
    const application = await applicationService.getApplication(req.params.id);
    const deploymentService = new DeploymentService();

    const result = await deploymentService.start(application);

    await applicationService.updateStatus(req.params.id, 'running');

    res.json({
      success: true,
      message: 'Application started successfully',
      url: result.url,
      port: result.port,
      pid: result.pid
    });
  } catch (error) {
    console.error('[Applications API] Failed to start application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop application
router.post('/:id/stop', async (req, res) => {
  try {
    const application = await applicationService.getApplication(req.params.id);
    const deploymentService = new DeploymentService();

    await deploymentService.stop(application);
    await applicationService.updateStatus(req.params.id, 'stopped');

    res.json({
      success: true,
      message: 'Application stopped successfully'
    });
  } catch (error) {
    console.error('[Applications API] Failed to stop application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get application status
router.get('/:id/status', async (req, res) => {
  try {
    const application = await applicationService.getApplication(req.params.id);
    const deploymentService = new DeploymentService();

    const status = await deploymentService.getStatus(application);

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('[Applications API] Failed to get application status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add workflow to application
router.post('/:id/workflows', async (req, res) => {
  try {
    const application = await applicationService.addWorkflow(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      application,
      message: 'Workflow added to application'
    });
  } catch (error) {
    console.error('[Applications API] Failed to add workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add form to application
router.post('/:id/forms', async (req, res) => {
  try {
    const application = await applicationService.addForm(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      application,
      message: 'Form added to application'
    });
  } catch (error) {
    console.error('[Applications API] Failed to add form:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add page to application
router.post('/:id/pages', async (req, res) => {
  try {
    const application = await applicationService.addPage(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      application,
      message: 'Page added to application'
    });
  } catch (error) {
    console.error('[Applications API] Failed to add page:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add data model to application
router.post('/:id/models', async (req, res) => {
  try {
    const application = await applicationService.addDataModel(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      application,
      message: 'Data model added to application'
    });
  } catch (error) {
    console.error('[Applications API] Failed to add data model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add mobile UI to application
router.post('/:id/mobile-ui', async (req, res) => {
  try {
    const application = await applicationService.addMobileUI(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      application,
      message: 'Mobile UI added to application'
    });
  } catch (error) {
    console.error('[Applications API] Failed to add mobile UI:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
