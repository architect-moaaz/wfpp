const PublishService = require('../../services/PublishService');
const WorkflowCodeGenerator = require('../../services/WorkflowCodeGenerator');
const { v4: uuidv4 } = require('uuid');

class PublishController {
  /**
   * Publish a workflow to a deployment platform
   */
  async publishWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { platform, environmentVars, customDomain } = req.body;
      const userId = req.user.id;

      console.log(`Publishing workflow ${workflowId} for user ${userId} to ${platform}`);

      // Validate user quota
      const canPublish = await PublishService.checkUserQuota(userId);
      if (!canPublish) {
        return res.status(429).json({
          error: 'Deployment quota exceeded',
          message: 'You have reached your maximum number of active deployments'
        });
      }

      // Get workflow definition
      const workflow = await PublishService.getWorkflow(workflowId, userId);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Validate workflow
      const validationResult = await WorkflowCodeGenerator.validateWorkflow(workflow);
      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Invalid workflow',
          details: validationResult.errors
        });
      }

      // Create deployment record
      const deploymentId = uuidv4();
      const deployment = await PublishService.createDeployment({
        id: deploymentId,
        workflowId,
        userId,
        platform: platform || 'vercel',
        status: 'building',
        environmentVars,
        customDomain
      });

      // Start deployment process asynchronously
      PublishService.startDeployment(deployment)
        .catch(error => {
          console.error(`Deployment ${deploymentId} failed:`, error);
        });

      // Return immediately with deployment ID
      res.status(202).json({
        deploymentId: deployment.id,
        status: 'building',
        message: 'Deployment started',
        streamUrl: `/api/deployments/${deploymentId}/stream`
      });
    } catch (error) {
      console.error('Error publishing workflow:', error);
      res.status(500).json({
        error: 'Failed to publish workflow',
        message: error.message
      });
    }
  }

  /**
   * Get all deployments for a workflow
   */
  async getWorkflowDeployments(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;

      const deployments = await PublishService.getWorkflowDeployments(
        workflowId,
        userId
      );

      res.json({ deployments });
    } catch (error) {
      console.error('Error fetching workflow deployments:', error);
      res.status(500).json({
        error: 'Failed to fetch deployments',
        message: error.message
      });
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(req, res) {
    try {
      const { deploymentId } = req.params;
      const userId = req.user.id;

      const deployment = await PublishService.getDeployment(deploymentId, userId);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      res.json({
        id: deployment.id,
        status: deployment.status,
        frontendUrl: deployment.frontendUrl,
        backendUrl: deployment.backendUrl,
        platform: deployment.platform,
        deployedAt: deployment.deployedAt,
        localPath: deployment.localPath,
        error: deployment.errorLogs
      });
    } catch (error) {
      console.error('Error fetching deployment status:', error);
      res.status(500).json({
        error: 'Failed to fetch deployment status',
        message: error.message
      });
    }
  }

  /**
   * Stream deployment logs using Server-Sent Events
   */
  async streamDeploymentLogs(req, res) {
    try {
      const { deploymentId } = req.params;
      const userId = req.user.id;

      // Verify deployment exists and user has access
      const deployment = await PublishService.getDeployment(deploymentId, userId);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', deploymentId })}\n\n`);

      // Subscribe to deployment logs
      const unsubscribe = PublishService.subscribeToLogs(deploymentId, (log) => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);

        // Close stream when deployment is complete or failed
        if (log.type === 'complete' || log.type === 'error') {
          setTimeout(() => {
            unsubscribe();
            res.end();
          }, 1000);
        }
      });

      // Handle client disconnect
      req.on('close', () => {
        unsubscribe();
        res.end();
      });
    } catch (error) {
      console.error('Error streaming deployment logs:', error);
      res.status(500).json({
        error: 'Failed to stream logs',
        message: error.message
      });
    }
  }

  /**
   * Stop a deployment
   */
  async stopDeployment(req, res) {
    try {
      const { deploymentId } = req.params;
      const userId = req.user.id;

      const deployment = await PublishService.getDeployment(deploymentId, userId);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      await PublishService.stopDeployment(deploymentId);

      res.json({
        message: 'Deployment stopped successfully',
        deploymentId
      });
    } catch (error) {
      console.error('Error stopping deployment:', error);
      res.status(500).json({
        error: 'Failed to stop deployment',
        message: error.message
      });
    }
  }

  /**
   * Get all deployments for a user
   */
  async getUserDeployments(req, res) {
    try {
      const userId = req.user.id;
      const { status, platform, limit = 50, offset = 0 } = req.query;

      const deployments = await PublishService.getUserDeployments(userId, {
        status,
        platform,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const total = await PublishService.countUserDeployments(userId, {
        status,
        platform
      });

      res.json({
        deployments,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching user deployments:', error);
      res.status(500).json({
        error: 'Failed to fetch deployments',
        message: error.message
      });
    }
  }

  /**
   * Update deployment settings
   */
  async updateDeployment(req, res) {
    try {
      const { deploymentId } = req.params;
      const userId = req.user.id;
      const { environmentVars, customDomain } = req.body;

      const deployment = await PublishService.getDeployment(deploymentId, userId);
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      const updated = await PublishService.updateDeployment(deploymentId, {
        environmentVars,
        customDomain
      });

      res.json({
        message: 'Deployment updated successfully',
        deployment: updated
      });
    } catch (error) {
      console.error('Error updating deployment:', error);
      res.status(500).json({
        error: 'Failed to update deployment',
        message: error.message
      });
    }
  }
}

module.exports = new PublishController();
