const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const WorkflowCodeGenerator = require('./WorkflowCodeGenerator');
const VercelPlatform = require('./deployment-platforms/VercelPlatform');
const RailwayPlatform = require('./deployment-platforms/RailwayPlatform');
const RenderPlatform = require('./deployment-platforms/RenderPlatform');

class PublishService extends EventEmitter {
  constructor() {
    super();
    this.deployments = new Map(); // In-memory storage (use DB in production)
    this.logSubscribers = new Map();
    this.platforms = {
      vercel: new VercelPlatform(),
      railway: new RailwayPlatform(),
      render: new RenderPlatform()
    };

    // User quotas (should come from database/user settings)
    this.quotas = {
      free: { maxDeployments: 3, maxBuildsPerDay: 5 },
      pro: { maxDeployments: 10, maxBuildsPerDay: 20 },
      enterprise: { maxDeployments: 100, maxBuildsPerDay: 100 }
    };
  }

  /**
   * Check if user can create more deployments
   */
  async checkUserQuota(userId) {
    try {
      // Get user's tier (mock - should query database)
      const userTier = 'free'; // Default tier
      const quota = this.quotas[userTier];

      // Count active deployments
      const activeCount = Array.from(this.deployments.values()).filter(
        d => d.userId === userId && d.status === 'active'
      ).length;

      return activeCount < quota.maxDeployments;
    } catch (error) {
      console.error('Error checking user quota:', error);
      return false;
    }
  }

  /**
   * Get workflow from database
   */
  async getWorkflow(workflowId, userId) {
    // Import workflow controller to get actual workflows
    const workflowController = require('../controllers/workflow.controller');
    const workflows = workflowController.getWorkflows ? workflowController.getWorkflows() : [];

    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Transform to expected format
    return {
      id: workflow.id,
      userId,
      name: workflow.name,
      localPath: workflow.localPath,
      definition: {
        nodes: workflow.nodes || [],
        edges: workflow.connections || []
      }
    };
  }

  /**
   * Create deployment record
   */
  async createDeployment(data) {
    const deployment = {
      ...data,
      createdAt: new Date(),
      buildLogs: [],
      errorLogs: null
    };

    this.deployments.set(data.id, deployment);
    console.log(`Created deployment ${data.id}`);

    return deployment;
  }

  /**
   * Save generated code to disk
   */
  async saveCodeToDisk(workflow, codePackage) {
    // Create app name from workflow name (lowercase, replace spaces with hyphens)
    const appName = (workflow.name || 'workflow-app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const baseDir = path.join(__dirname, '../../generated-apps', appName);

    // Create directory structure
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(path.join(baseDir, 'frontend'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'backend'), { recursive: true });

    // Save frontend files
    for (const [filePath, content] of Object.entries(codePackage.frontend)) {
      const fullPath = path.join(baseDir, 'frontend', filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // Save backend files
    for (const [filePath, content] of Object.entries(codePackage.backend)) {
      const fullPath = path.join(baseDir, 'backend', filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // Save config files
    for (const [filePath, content] of Object.entries(codePackage.config)) {
      const fullPath = path.join(baseDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    console.log(`Generated code saved to: ${baseDir}`);
    return baseDir;
  }

  /**
   * Start deployment process
   */
  async startDeployment(deployment) {
    const { id, workflowId, userId, platform } = deployment;

    try {
      this.emitLog(id, { type: 'info', message: 'Starting deployment process...' });

      // Step 1: Get workflow
      this.emitLog(id, { type: 'info', message: 'Fetching workflow definition...' });
      const workflow = await this.getWorkflow(workflowId, userId);

      // Check if app code was already generated
      if (!workflow.localPath) {
        throw new Error('Workflow app code not found. Please save the workflow first to generate the app code.');
      }

      const localPath = workflow.localPath;
      this.emitLog(id, { type: 'info', message: `Using pre-generated app at: ${localPath}` });
      this.updateDeploymentStatus(id, 'building', { localPath });

      // Step 2: Deploy to platform
      this.emitLog(id, { type: 'info', message: `Deploying to ${platform}...` });
      this.updateDeploymentStatus(id, 'deploying');

      const platformService = this.platforms[platform];
      if (!platformService) {
        throw new Error(`Unknown platform: ${platform}`);
      }

      // Generate code package for deployment (platforms need this format)
      this.emitLog(id, { type: 'info', message: 'Preparing code for deployment...' });
      const codePackage = await WorkflowCodeGenerator.generate(workflow);

      const result = await platformService.deploy(workflow, codePackage, (log) => {
        this.emitLog(id, log);
      });

      // Step 3: Update deployment with URLs
      this.updateDeploymentStatus(id, 'active', {
        frontendUrl: result.frontendUrl,
        backendUrl: result.backendUrl,
        platformProjectId: result.projectId,
        platformDeploymentId: result.deploymentId,
        deployedAt: new Date()
      });

      this.emitLog(id, {
        type: 'complete',
        message: 'Deployment completed successfully!',
        frontendUrl: result.frontendUrl,
        backendUrl: result.backendUrl
      });

      console.log(`Deployment ${id} completed successfully`);
    } catch (error) {
      console.error(`Deployment ${id} failed:`, error);

      this.updateDeploymentStatus(id, 'failed', {
        errorLogs: error.message
      });

      this.emitLog(id, {
        type: 'error',
        message: `Deployment failed: ${error.message}`
      });
    }
  }

  /**
   * Update deployment status
   */
  updateDeploymentStatus(deploymentId, status, updates = {}) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      Object.assign(deployment, { status, ...updates, updatedAt: new Date() });
      this.deployments.set(deploymentId, deployment);
    }
  }

  /**
   * Emit log for deployment
   */
  emitLog(deploymentId, log) {
    const logEntry = {
      ...log,
      timestamp: new Date().toISOString(),
      deploymentId
    };

    // Add to deployment logs
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.buildLogs.push(logEntry);
    }

    // Notify subscribers
    const subscribers = this.logSubscribers.get(deploymentId) || [];
    subscribers.forEach(callback => callback(logEntry));
  }

  /**
   * Subscribe to deployment logs
   */
  subscribeToLogs(deploymentId, callback) {
    if (!this.logSubscribers.has(deploymentId)) {
      this.logSubscribers.set(deploymentId, []);
    }

    const subscribers = this.logSubscribers.get(deploymentId);
    subscribers.push(callback);

    // Send existing logs
    const deployment = this.deployments.get(deploymentId);
    if (deployment && deployment.buildLogs) {
      deployment.buildLogs.forEach(log => callback(log));
    }

    // Return unsubscribe function
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get deployment
   */
  async getDeployment(deploymentId, userId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment || deployment.userId !== userId) {
      return null;
    }
    return deployment;
  }

  /**
   * Get all deployments for a workflow
   */
  async getWorkflowDeployments(workflowId, userId) {
    return Array.from(this.deployments.values()).filter(
      d => d.workflowId === workflowId && d.userId === userId
    );
  }

  /**
   * Get all deployments for a user
   */
  async getUserDeployments(userId, filters = {}) {
    let deployments = Array.from(this.deployments.values()).filter(
      d => d.userId === userId
    );

    // Apply filters
    if (filters.status) {
      deployments = deployments.filter(d => d.status === filters.status);
    }
    if (filters.platform) {
      deployments = deployments.filter(d => d.platform === filters.platform);
    }

    // Apply pagination
    const start = filters.offset || 0;
    const end = start + (filters.limit || 50);

    return deployments.slice(start, end);
  }

  /**
   * Count user deployments
   */
  async countUserDeployments(userId, filters = {}) {
    let deployments = Array.from(this.deployments.values()).filter(
      d => d.userId === userId
    );

    if (filters.status) {
      deployments = deployments.filter(d => d.status === filters.status);
    }
    if (filters.platform) {
      deployments = deployments.filter(d => d.platform === filters.platform);
    }

    return deployments.length;
  }

  /**
   * Stop deployment
   */
  async stopDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const platformService = this.platforms[deployment.platform];
    if (platformService) {
      await platformService.stop(deployment.platformProjectId);
    }

    this.updateDeploymentStatus(deploymentId, 'stopped', {
      stoppedAt: new Date()
    });

    this.emitLog(deploymentId, {
      type: 'info',
      message: 'Deployment stopped'
    });

    console.log(`Deployment ${deploymentId} stopped`);
  }

  /**
   * Update deployment
   */
  async updateDeployment(deploymentId, updates) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    Object.assign(deployment, updates, { updatedAt: new Date() });
    this.deployments.set(deploymentId, deployment);

    // If environment vars or domain changed, trigger redeployment
    if (updates.environmentVars || updates.customDomain) {
      const platformService = this.platforms[deployment.platform];
      if (platformService && platformService.update) {
        await platformService.update(deployment.platformProjectId, updates);
      }
    }

    return deployment;
  }
}

module.exports = new PublishService();
