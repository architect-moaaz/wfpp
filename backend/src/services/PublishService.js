const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const WorkflowCodeGenerator = require('./WorkflowCodeGenerator');
const VercelPlatform = require('./deployment-platforms/VercelPlatform');
const RailwayPlatform = require('./deployment-platforms/RailwayPlatform');
const RenderPlatform = require('./deployment-platforms/RenderPlatform');
const db = require('../config/database');

class PublishService extends EventEmitter {
  constructor() {
    super();
    this.deployments = new Map(); // In-memory cache (backed by database)
    this.logSubscribers = new Map();
    this.platforms = {
      vercel: new VercelPlatform(),
      railway: new RailwayPlatform(),
      render: new RenderPlatform()
    };

    // Default quotas (used as fallback when database unavailable)
    this.defaultQuotas = {
      free: { maxDeployments: 3, maxBuildsPerDay: 5 },
      pro: { maxDeployments: 10, maxBuildsPerDay: 20 },
      enterprise: { maxDeployments: 100, maxBuildsPerDay: 100 }
    };

    // Initialize database on startup
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for quotas and deployments
   */
  async initializeDatabase() {
    try {
      // Create user_quotas table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS k1.user_quotas (
          id SERIAL PRIMARY KEY,
          tier VARCHAR(50) NOT NULL UNIQUE,
          max_deployments INTEGER NOT NULL DEFAULT 3,
          max_builds_per_day INTEGER NOT NULL DEFAULT 5,
          max_storage_mb INTEGER NOT NULL DEFAULT 500,
          features JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create deployments table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS k1.deployments (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          workflow_id VARCHAR(255) NOT NULL,
          platform VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          frontend_url TEXT,
          backend_url TEXT,
          platform_project_id VARCHAR(255),
          platform_deployment_id VARCHAR(255),
          local_path TEXT,
          build_logs JSONB DEFAULT '[]',
          error_logs TEXT,
          environment_vars JSONB DEFAULT '{}',
          custom_domain VARCHAR(255),
          deployed_at TIMESTAMP,
          stopped_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create users table if it doesn't exist (for tier tracking)
      await db.query(`
        CREATE TABLE IF NOT EXISTS k1.users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          tier VARCHAR(50) NOT NULL DEFAULT 'free',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Insert default quota tiers if not exist
      await db.query(`
        INSERT INTO k1.user_quotas (tier, max_deployments, max_builds_per_day, max_storage_mb, features)
        VALUES
          ('free', 3, 5, 500, '{"ssl": true, "customDomain": false, "analytics": false}'),
          ('pro', 10, 20, 5000, '{"ssl": true, "customDomain": true, "analytics": true}'),
          ('enterprise', 100, 100, 50000, '{"ssl": true, "customDomain": true, "analytics": true, "sla": true}')
        ON CONFLICT (tier) DO NOTHING
      `);

      console.log('[PublishService] Database tables initialized');

      // Load existing deployments from database into cache
      await this.loadDeploymentsFromDatabase();
    } catch (error) {
      console.error('[PublishService] Database initialization failed:', error.message);
      // Continue with in-memory fallback
    }
  }

  /**
   * Load deployments from database into in-memory cache
   */
  async loadDeploymentsFromDatabase() {
    try {
      const result = await db.query(`
        SELECT * FROM k1.deployments
        WHERE status IN ('active', 'building', 'deploying', 'pending')
        ORDER BY created_at DESC
      `);

      for (const row of result.rows) {
        this.deployments.set(row.id, {
          id: row.id,
          userId: row.user_id,
          workflowId: row.workflow_id,
          platform: row.platform,
          status: row.status,
          frontendUrl: row.frontend_url,
          backendUrl: row.backend_url,
          platformProjectId: row.platform_project_id,
          platformDeploymentId: row.platform_deployment_id,
          localPath: row.local_path,
          buildLogs: row.build_logs || [],
          errorLogs: row.error_logs,
          environmentVars: row.environment_vars,
          customDomain: row.custom_domain,
          deployedAt: row.deployed_at,
          stoppedAt: row.stopped_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }

      console.log(`[PublishService] Loaded ${result.rows.length} deployments from database`);
    } catch (error) {
      console.error('[PublishService] Failed to load deployments from database:', error.message);
    }
  }

  /**
   * Get user quota from database
   * @param {string} userId - User ID
   * @returns {Object} Quota configuration for the user
   */
  async getUserQuota(userId) {
    try {
      // Get user's tier from database
      const userResult = await db.query(`
        SELECT tier FROM k1.users WHERE id = $1
      `, [userId]);

      const userTier = userResult.rows.length > 0 ? userResult.rows[0].tier : 'free';

      // Get quota for the tier
      const quotaResult = await db.query(`
        SELECT * FROM k1.user_quotas WHERE tier = $1
      `, [userTier]);

      if (quotaResult.rows.length > 0) {
        const row = quotaResult.rows[0];
        return {
          tier: row.tier,
          maxDeployments: row.max_deployments,
          maxBuildsPerDay: row.max_builds_per_day,
          maxStorageMb: row.max_storage_mb,
          features: row.features || {}
        };
      }

      // Fallback to default quotas
      return {
        tier: userTier,
        ...this.defaultQuotas[userTier] || this.defaultQuotas.free
      };
    } catch (error) {
      console.error('[PublishService] Error getting user quota:', error.message);
      // Fallback to default free tier
      return { tier: 'free', ...this.defaultQuotas.free };
    }
  }

  /**
   * Check if user can create more deployments
   */
  async checkUserQuota(userId) {
    try {
      const quota = await this.getUserQuota(userId);

      // Count active deployments from database
      const countResult = await db.query(`
        SELECT COUNT(*) as count FROM k1.deployments
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);

      const activeCount = parseInt(countResult.rows[0]?.count || 0);

      // Also check builds today
      const buildsResult = await db.query(`
        SELECT COUNT(*) as count FROM k1.deployments
        WHERE user_id = $1 AND created_at >= CURRENT_DATE
      `, [userId]);

      const buildsToday = parseInt(buildsResult.rows[0]?.count || 0);

      const canDeploy = activeCount < quota.maxDeployments && buildsToday < quota.maxBuildsPerDay;

      if (!canDeploy) {
        console.log(`[PublishService] User ${userId} quota exceeded: deployments=${activeCount}/${quota.maxDeployments}, buildsToday=${buildsToday}/${quota.maxBuildsPerDay}`);
      }

      return canDeploy;
    } catch (error) {
      console.error('[PublishService] Error checking user quota:', error.message);

      // Fallback to in-memory check
      const quota = this.defaultQuotas.free;
      const activeCount = Array.from(this.deployments.values()).filter(
        d => d.userId === userId && d.status === 'active'
      ).length;

      return activeCount < quota.maxDeployments;
    }
  }

  /**
   * Get detailed quota status for a user
   */
  async getQuotaStatus(userId) {
    try {
      const quota = await this.getUserQuota(userId);

      // Count active deployments
      const deploymentResult = await db.query(`
        SELECT COUNT(*) as count FROM k1.deployments
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);

      // Count builds today
      const buildsResult = await db.query(`
        SELECT COUNT(*) as count FROM k1.deployments
        WHERE user_id = $1 AND created_at >= CURRENT_DATE
      `, [userId]);

      const activeDeployments = parseInt(deploymentResult.rows[0]?.count || 0);
      const buildsToday = parseInt(buildsResult.rows[0]?.count || 0);

      return {
        tier: quota.tier,
        deployments: {
          used: activeDeployments,
          limit: quota.maxDeployments,
          remaining: Math.max(0, quota.maxDeployments - activeDeployments)
        },
        buildsToday: {
          used: buildsToday,
          limit: quota.maxBuildsPerDay,
          remaining: Math.max(0, quota.maxBuildsPerDay - buildsToday)
        },
        storage: {
          limit: quota.maxStorageMb
        },
        features: quota.features || {}
      };
    } catch (error) {
      console.error('[PublishService] Error getting quota status:', error.message);
      return {
        tier: 'free',
        deployments: { used: 0, limit: 3, remaining: 3 },
        buildsToday: { used: 0, limit: 5, remaining: 5 },
        features: {}
      };
    }
  }

  /**
   * Update user tier (admin function)
   */
  async updateUserTier(userId, newTier) {
    try {
      // Validate tier exists
      const tierResult = await db.query(`
        SELECT tier FROM k1.user_quotas WHERE tier = $1
      `, [newTier]);

      if (tierResult.rows.length === 0) {
        throw new Error(`Invalid tier: ${newTier}`);
      }

      // Update or insert user with new tier
      await db.query(`
        INSERT INTO k1.users (id, tier, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id) DO UPDATE SET tier = $2, updated_at = NOW()
      `, [userId, newTier]);

      console.log(`[PublishService] Updated user ${userId} to tier: ${newTier}`);
      return true;
    } catch (error) {
      console.error('[PublishService] Error updating user tier:', error.message);
      throw error;
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
   * Create deployment record (persists to database)
   */
  async createDeployment(data) {
    const deployment = {
      ...data,
      createdAt: new Date(),
      buildLogs: [],
      errorLogs: null
    };

    // Persist to database
    try {
      await db.query(`
        INSERT INTO k1.deployments (
          id, user_id, workflow_id, platform, status,
          environment_vars, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        data.id,
        data.userId,
        data.workflowId,
        data.platform,
        data.status || 'pending',
        JSON.stringify(data.environmentVars || {})
      ]);
    } catch (error) {
      console.error('[PublishService] Failed to persist deployment to database:', error.message);
      // Continue with in-memory only
    }

    // Also store in memory cache
    this.deployments.set(data.id, deployment);
    console.log(`[PublishService] Created deployment ${data.id}`);

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
   * Update deployment status (persists to database)
   */
  async updateDeploymentStatus(deploymentId, status, updates = {}) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      Object.assign(deployment, { status, ...updates, updatedAt: new Date() });
      this.deployments.set(deploymentId, deployment);

      // Persist to database
      try {
        const setClause = ['status = $2', 'updated_at = NOW()'];
        const values = [deploymentId, status];
        let paramIndex = 3;

        if (updates.frontendUrl) {
          setClause.push(`frontend_url = $${paramIndex++}`);
          values.push(updates.frontendUrl);
        }
        if (updates.backendUrl) {
          setClause.push(`backend_url = $${paramIndex++}`);
          values.push(updates.backendUrl);
        }
        if (updates.platformProjectId) {
          setClause.push(`platform_project_id = $${paramIndex++}`);
          values.push(updates.platformProjectId);
        }
        if (updates.platformDeploymentId) {
          setClause.push(`platform_deployment_id = $${paramIndex++}`);
          values.push(updates.platformDeploymentId);
        }
        if (updates.localPath) {
          setClause.push(`local_path = $${paramIndex++}`);
          values.push(updates.localPath);
        }
        if (updates.errorLogs) {
          setClause.push(`error_logs = $${paramIndex++}`);
          values.push(updates.errorLogs);
        }
        if (updates.deployedAt) {
          setClause.push(`deployed_at = $${paramIndex++}`);
          values.push(updates.deployedAt);
        }
        if (updates.stoppedAt) {
          setClause.push(`stopped_at = $${paramIndex++}`);
          values.push(updates.stoppedAt);
        }

        await db.query(`
          UPDATE k1.deployments
          SET ${setClause.join(', ')}
          WHERE id = $1
        `, values);
      } catch (error) {
        console.error('[PublishService] Failed to update deployment in database:', error.message);
      }
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
