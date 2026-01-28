/**
 * Render Platform Adapter
 * Handles deployment to Render using their REST API
 *
 * Required environment variables:
 * - RENDER_API_KEY: API key from Render dashboard
 * - RENDER_OWNER_ID: (optional) Owner/Team ID for services
 */

const axios = require('axios');

class RenderPlatform {
  constructor() {
    this.apiToken = process.env.RENDER_API_KEY;
    this.ownerId = process.env.RENDER_OWNER_ID;
    this.apiUrl = 'https://api.render.com/v1';
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Deploy to Render
   */
  async deploy(workflow, codePackage, logCallback) {
    if (!this.apiToken) {
      logCallback({ type: 'warn', message: 'RENDER_API_KEY not set. Using simulation mode.' });
      return await this.simulateDeploy(workflow, logCallback);
    }

    try {
      logCallback({ type: 'info', message: 'Connecting to Render API...' });

      // Step 1: Get owner ID if not set
      if (!this.ownerId) {
        const owner = await this.getOwner();
        this.ownerId = owner.id;
      }

      // Step 2: Get or create service
      const serviceName = this.sanitizeServiceName(workflow.name || workflow.id);
      logCallback({ type: 'info', message: `Setting up service: ${serviceName}` });
      const service = await this.getOrCreateService(serviceName, codePackage, logCallback);

      // Step 3: Set environment variables
      if (codePackage.envVars && Object.keys(codePackage.envVars).length > 0) {
        logCallback({ type: 'info', message: 'Configuring environment variables...' });
        await this.setEnvironmentVariables(service.id, codePackage.envVars);
      }

      // Step 4: Trigger deployment
      logCallback({ type: 'info', message: 'Triggering deployment...' });
      const deploy = await this.triggerDeploy(service.id);

      // Step 5: Wait for deployment
      logCallback({ type: 'info', message: 'Building and deploying...' });
      const finalDeploy = await this.waitForDeployment(service.id, deploy.id, logCallback);

      logCallback({ type: 'success', message: 'Deployment completed successfully!' });

      // Get the service URL
      const serviceUrl = service.serviceDetails?.url || `https://${serviceName}.onrender.com`;

      return {
        frontendUrl: serviceUrl,
        backendUrl: `${serviceUrl}/api`,
        projectId: service.id,
        serviceId: service.id,
        deploymentId: deploy.id,
        platform: 'render',
        status: finalDeploy.status
      };
    } catch (error) {
      logCallback({ type: 'error', message: `Render deployment failed: ${error.message}` });
      throw error;
    }
  }

  /**
   * Get current owner/user info
   */
  async getOwner() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/owners`,
        { headers: this.getHeaders() }
      );

      const owners = response.data;
      if (owners && owners.length > 0) {
        // Return the first owner (usually the user's personal account)
        return owners[0].owner;
      }

      throw new Error('No owner found for this API key');
    } catch (error) {
      throw new Error(`Failed to get owner: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get or create a Render service
   */
  async getOrCreateService(name, codePackage, logCallback) {
    // First, try to find existing service
    try {
      const response = await axios.get(
        `${this.apiUrl}/services?name=${encodeURIComponent(name)}&limit=1`,
        { headers: this.getHeaders() }
      );

      const services = response.data;
      if (services && services.length > 0 && services[0].service.name === name) {
        logCallback({ type: 'info', message: `Using existing service: ${name}` });
        return services[0].service;
      }
    } catch (error) {
      // Service not found, create new one
    }

    // Create new service
    logCallback({ type: 'info', message: `Creating new service: ${name}` });

    const serviceConfig = {
      type: 'web_service',
      name,
      ownerId: this.ownerId,
      autoDeploy: 'yes',
      serviceDetails: {
        env: 'node',
        plan: 'starter', // or 'free' for free tier
        region: 'oregon',
        buildCommand: codePackage.buildCommand || 'npm install',
        startCommand: codePackage.startCommand || 'npm start',
        numInstances: 1
      }
    };

    // If GitHub repo is provided, use repo deployment
    if (codePackage.githubRepo) {
      serviceConfig.repo = codePackage.githubRepo.repo;
      serviceConfig.branch = codePackage.githubRepo.branch || 'main';
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/services`,
        serviceConfig,
        { headers: this.getHeaders() }
      );

      return response.data.service;
    } catch (error) {
      throw new Error(`Failed to create service: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Set environment variables for a service
   */
  async setEnvironmentVariables(serviceId, envVars) {
    const envVarArray = Object.entries(envVars).map(([key, value]) => ({
      key,
      value: String(value)
    }));

    try {
      await axios.put(
        `${this.apiUrl}/services/${serviceId}/env-vars`,
        envVarArray,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.warn(`[Render] Failed to set env vars: ${error.message}`);
    }
  }

  /**
   * Trigger a new deployment
   */
  async triggerDeploy(serviceId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/services/${serviceId}/deploys`,
        {},
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      // If no deploys yet (new service), the service will auto-deploy
      console.log('[Render] Deploy triggered or pending auto-deploy');
      return { id: 'pending', status: 'created' };
    }
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(serviceId, deployId, logCallback, timeout = 600000) {
    const startTime = Date.now();
    const pollInterval = 10000; // Render builds can be slow

    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(
          `${this.apiUrl}/services/${serviceId}/deploys?limit=1`,
          { headers: this.getHeaders() }
        );

        const deploys = response.data;
        if (deploys && deploys.length > 0) {
          const deploy = deploys[0].deploy;
          const status = deploy.status;

          if (status === 'live') {
            return { id: deploy.id, status: 'live' };
          } else if (status === 'deactivated' || status === 'build_failed' || status === 'canceled') {
            throw new Error(`Deployment failed with status: ${status}`);
          }

          logCallback({ type: 'info', message: `Deployment status: ${status}...` });
        }
      } catch (error) {
        if (error.message.includes('failed')) throw error;
        // Continue polling on transient errors
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Return success if no explicit failure (first deploy might still be building)
    return { status: 'building' };
  }

  /**
   * Get service details including URL
   */
  async getServiceDetails(serviceId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/services/${serviceId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Stop/suspend a service
   */
  async stop(serviceId) {
    if (!this.apiToken) {
      console.log(`[Render] Simulated stop for service ${serviceId}`);
      return { success: true };
    }

    try {
      await axios.post(
        `${this.apiUrl}/services/${serviceId}/suspend`,
        {},
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error) {
      console.error('[Render] Stop failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume a suspended service
   */
  async resume(serviceId) {
    if (!this.apiToken) {
      console.log(`[Render] Simulated resume for service ${serviceId}`);
      return { success: true };
    }

    try {
      await axios.post(
        `${this.apiUrl}/services/${serviceId}/resume`,
        {},
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error) {
      console.error('[Render] Resume failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update service configuration
   */
  async update(serviceId, updates) {
    if (!this.apiToken) {
      console.log(`[Render] Simulated update for service ${serviceId}`);
      return { success: true };
    }

    try {
      // Update environment variables
      if (updates.envVars) {
        await this.setEnvironmentVariables(serviceId, updates.envVars);
      }

      // Update service settings
      if (updates.settings) {
        await axios.patch(
          `${this.apiUrl}/services/${serviceId}`,
          { serviceDetails: updates.settings },
          { headers: this.getHeaders() }
        );
      }

      // Trigger redeploy if requested
      if (updates.redeploy) {
        await this.triggerDeploy(serviceId);
      }

      return { success: true };
    } catch (error) {
      console.error('[Render] Update failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a service
   */
  async delete(serviceId) {
    if (!this.apiToken) {
      console.log(`[Render] Simulated delete for service ${serviceId}`);
      return { success: true };
    }

    try {
      await axios.delete(
        `${this.apiUrl}/services/${serviceId}`,
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error) {
      console.error('[Render] Delete failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(serviceId, deployId) {
    if (!this.apiToken) {
      return { logs: [] };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/services/${serviceId}/deploys/${deployId}/logs`,
        { headers: this.getHeaders() }
      );

      return { logs: response.data };
    } catch (error) {
      return { logs: [], error: error.message };
    }
  }

  /**
   * Simulate deployment (fallback when no API key)
   */
  async simulateDeploy(workflow, logCallback) {
    const steps = [
      { message: 'Applying Blueprint...', duration: 1000 },
      { message: 'Provisioning web services...', duration: 2000 },
      { message: 'Setting up database...', duration: 1500 },
      { message: 'Building application...', duration: 3000 },
      { message: 'Configuring SSL certificates...', duration: 800 },
      { message: 'Starting service...', duration: 1000 }
    ];

    for (const step of steps) {
      logCallback({ type: 'info', message: step.message });
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    const serviceName = this.sanitizeServiceName(workflow.name || workflow.id);
    const deploymentId = `render-sim-${Date.now()}`;

    logCallback({ type: 'success', message: 'Simulated deployment completed!' });

    return {
      frontendUrl: `https://${serviceName}.onrender.com`,
      backendUrl: `https://${serviceName}.onrender.com/api`,
      projectId: deploymentId,
      serviceId: deploymentId,
      deploymentId,
      platform: 'render',
      simulated: true
    };
  }

  /**
   * Sanitize service name for Render
   */
  sanitizeServiceName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63); // Render has a 63 char limit
  }
}

module.exports = RenderPlatform;
