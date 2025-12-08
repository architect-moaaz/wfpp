const express = require('express');
const router = express.Router();
const PublishController = require('../controllers/PublishController');
const { authenticate } = require('../middleware/auth');
const { validatePublishRequest } = require('../middleware/validation');

// Publish a workflow
router.post(
  '/workflows/:workflowId/publish',
  authenticate,
  validatePublishRequest,
  PublishController.publishWorkflow
);

// Get all deployments for a workflow
router.get(
  '/workflows/:workflowId/deployments',
  authenticate,
  PublishController.getWorkflowDeployments
);

// Get deployment status
router.get(
  '/deployments/:deploymentId/status',
  authenticate,
  PublishController.getDeploymentStatus
);

// Stream deployment logs (SSE)
router.get(
  '/deployments/:deploymentId/stream',
  authenticate,
  PublishController.streamDeploymentLogs
);

// Stop a deployment
router.delete(
  '/deployments/:deploymentId',
  authenticate,
  PublishController.stopDeployment
);

// Get all deployments for a user
router.get(
  '/deployments',
  authenticate,
  PublishController.getUserDeployments
);

// Update deployment settings
router.patch(
  '/deployments/:deploymentId',
  authenticate,
  PublishController.updateDeployment
);

module.exports = router;
