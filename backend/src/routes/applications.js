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
const SeedExpert = require('../services/moe/experts/SeedExpert');

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

    // Automatically generate the application scaffold
    const ApplicationGenerator = require('../generators/ApplicationGenerator');
    const generator = new ApplicationGenerator(application);
    const scaffoldResult = await generator.generate();

    console.log(`[Applications API] Auto-generated scaffold for ${application.name} with ${scaffoldResult.files.length} files`);

    res.status(201).json({
      success: true,
      application,
      scaffold: {
        path: scaffoldResult.path,
        files: scaffoldResult.files
      },
      message: 'Application created successfully with complete scaffold.'
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

// Update application theme
router.put('/:id/theme', async (req, res) => {
  try {
    const { theme } = req.body;

    if (!theme) {
      return res.status(400).json({
        success: false,
        error: 'Theme data is required'
      });
    }

    const application = await applicationService.updateApplication(
      req.params.id,
      { theme }
    );

    res.json({
      success: true,
      application,
      message: 'Theme updated successfully'
    });
  } catch (error) {
    console.error('[Applications API] Failed to update theme:', error);
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
      status: 'production'
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

    await applicationService.updateStatus(req.params.id, 'production');

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
    await applicationService.updateStatus(req.params.id, 'development');

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

// Open application (get URL)
router.get('/:id/open', async (req, res) => {
  try {
    const application = await applicationService.getApplication(req.params.id);

    // Check if app has deployment info
    if (application.deployment && application.deployment.url) {
      return res.json({
        success: true,
        url: application.deployment.url,
        port: application.deployment.port,
        status: application.status
      });
    }

    // If no deployment info, try to construct URL from name
    // Assume apps run on incrementing ports starting from 4000
    const sanitizedName = (application.name || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Default URL for generated apps (typically localhost:4000)
    const defaultUrl = `http://localhost:4000`;

    res.json({
      success: true,
      url: defaultUrl,
      message: 'Application URL (may need to be started first)',
      status: application.status || 'unknown',
      name: sanitizedName
    });
  } catch (error) {
    console.error('[Applications API] Failed to get application URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add workflow to application
router.post('/:id/workflows', async (req, res) => {
  try {
    const workflow = req.body;
    await applicationService.addWorkflow(
      req.params.id,
      workflow
    );

    // Return just the workflow, not the entire application
    res.json({
      success: true,
      workflow,
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
    const form = req.body;
    await applicationService.addForm(
      req.params.id,
      form
    );

    // Return just the form, not the entire application
    res.json({
      success: true,
      form,
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
    const page = req.body;
    await applicationService.addPage(
      req.params.id,
      page
    );

    // Return just the page, not the entire application
    res.json({
      success: true,
      page,
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
    const model = req.body;
    await applicationService.addDataModel(
      req.params.id,
      model
    );

    // Return just the model, not the entire application
    res.json({
      success: true,
      model,
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
    const mobileUI = req.body;
    await applicationService.addMobileUI(
      req.params.id,
      mobileUI
    );

    // Return just the mobileUI, not the entire application
    res.json({
      success: true,
      mobileUI,
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

// Generate and insert sample data
router.post('/:id/seed-data', async (req, res) => {
  try {
    const { recordsPerModel = 15 } = req.body;
    const application = await applicationService.getApplication(req.params.id);

    console.log(`[Applications API] Generating seed data for ${application.name}`);
    console.log(`[Applications API] Application has ${application.resources?.dataModels?.length || 0} data models`);

    const seedExpert = new SeedExpert();

    // Generate sample data
    const sampleData = await seedExpert.generateSampleData(application, {
      recordsPerModel,
      onProgress: (progress) => {
        console.log(`[SeedExpert] ${progress.step}: ${progress.content}`);
      }
    });

    if (sampleData.totalRecords === 0) {
      return res.json({
        success: true,
        message: 'No data models found, no data to seed',
        sampleData: { models: [], totalRecords: 0 }
      });
    }

    // Get the path to the generated application
    const path = require('path');
    const appPath = path.join(__dirname, '../../generated-apps', application.slug || application.name.toLowerCase().replace(/\s+/g, '-'));

    // Insert data into database
    const insertResult = await seedExpert.insertSampleData(appPath, sampleData, (progress) => {
      console.log(`[SeedExpert] ${progress.step}: ${progress.content}`);
    });

    res.json({
      success: true,
      message: `Successfully seeded ${insertResult.insertedCount} records`,
      sampleData: {
        models: sampleData.models.length,
        totalRecords: sampleData.totalRecords,
        insertedCount: insertResult.insertedCount
      }
    });

  } catch (error) {
    console.error('[Applications API] Failed to seed data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
