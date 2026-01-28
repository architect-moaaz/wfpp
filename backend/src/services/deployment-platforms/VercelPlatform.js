/**
 * Vercel Platform Adapter
 * Handles deployment to Vercel serverless platform using official API
 *
 * Required environment variables:
 * - VERCEL_TOKEN: API token from Vercel account settings
 * - VERCEL_TEAM_ID: (optional) Team ID for team deployments
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class VercelPlatform {
  constructor() {
    this.apiToken = process.env.VERCEL_TOKEN;
    this.teamId = process.env.VERCEL_TEAM_ID;
    this.apiUrl = 'https://api.vercel.com';
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
   * Get query params for team
   */
  getTeamQuery() {
    return this.teamId ? `?teamId=${this.teamId}` : '';
  }

  /**
   * Deploy to Vercel
   * @param {Object} workflow - Workflow definition
   * @param {Object} codePackage - Code package with files
   * @param {Function} logCallback - Callback for logging progress
   */
  async deploy(workflow, codePackage, logCallback) {
    if (!this.apiToken) {
      logCallback({ type: 'warn', message: 'VERCEL_TOKEN not set. Using simulation mode.' });
      return await this.simulateDeploy(workflow, logCallback);
    }

    try {
      logCallback({ type: 'info', message: 'Connecting to Vercel API...' });

      // Step 1: Create project if it doesn't exist
      const projectName = this.sanitizeProjectName(workflow.name || workflow.id);
      let project = await this.getOrCreateProject(projectName, logCallback);

      // Step 2: Prepare files for deployment
      logCallback({ type: 'info', message: 'Preparing files for deployment...' });
      const files = await this.prepareFiles(codePackage);

      // Step 3: Create deployment
      logCallback({ type: 'info', message: 'Creating deployment...' });
      const deployment = await this.createDeployment(project.id, files, {
        name: projectName,
        env: codePackage.envVars || {},
        buildCommand: codePackage.buildCommand || 'npm run build',
        outputDirectory: codePackage.outputDir || '.next'
      });

      // Step 4: Wait for deployment to complete
      logCallback({ type: 'info', message: 'Building and deploying...' });
      const finalDeployment = await this.waitForDeployment(deployment.id, logCallback);

      logCallback({ type: 'success', message: 'Deployment completed successfully!' });

      return {
        frontendUrl: `https://${finalDeployment.url}`,
        backendUrl: `https://${finalDeployment.url}/api`,
        projectId: project.id,
        deploymentId: deployment.id,
        platform: 'vercel',
        status: finalDeployment.readyState,
        createdAt: finalDeployment.createdAt
      };
    } catch (error) {
      logCallback({ type: 'error', message: `Vercel deployment failed: ${error.message}` });
      throw error;
    }
  }

  /**
   * Get or create a Vercel project
   */
  async getOrCreateProject(name, logCallback) {
    try {
      // Try to get existing project
      const response = await axios.get(
        `${this.apiUrl}/v9/projects/${name}${this.getTeamQuery()}`,
        { headers: this.getHeaders() }
      );
      logCallback({ type: 'info', message: `Using existing project: ${name}` });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Create new project
        logCallback({ type: 'info', message: `Creating new project: ${name}` });
        const response = await axios.post(
          `${this.apiUrl}/v10/projects${this.getTeamQuery()}`,
          {
            name,
            framework: 'nextjs',
            gitRepository: null
          },
          { headers: this.getHeaders() }
        );
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Prepare files for Vercel deployment format
   */
  async prepareFiles(codePackage) {
    const files = [];

    // If codePackage has a path, read files from directory
    if (codePackage.path && typeof codePackage.path === 'string') {
      const filesToUpload = await this.readDirectoryRecursive(codePackage.path);
      for (const filePath of filesToUpload) {
        const relativePath = path.relative(codePackage.path, filePath);
        const content = await fs.readFile(filePath);
        files.push({
          file: relativePath.replace(/\\/g, '/'),
          data: content.toString('base64'),
          encoding: 'base64'
        });
      }
    }

    // If codePackage has files array
    if (codePackage.files && Array.isArray(codePackage.files)) {
      for (const file of codePackage.files) {
        files.push({
          file: file.path,
          data: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
      }
    }

    return files;
  }

  /**
   * Read directory recursively
   */
  async readDirectoryRecursive(dir, fileList = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules and hidden files
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.readDirectoryRecursive(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }

    return fileList;
  }

  /**
   * Create a deployment
   */
  async createDeployment(projectId, files, options) {
    const response = await axios.post(
      `${this.apiUrl}/v13/deployments${this.getTeamQuery()}`,
      {
        name: options.name,
        files,
        project: projectId,
        target: 'production',
        projectSettings: {
          buildCommand: options.buildCommand,
          outputDirectory: options.outputDirectory,
          framework: 'nextjs'
        }
      },
      { headers: this.getHeaders() }
    );

    return response.data;
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(deploymentId, logCallback, timeout = 300000) {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < timeout) {
      const response = await axios.get(
        `${this.apiUrl}/v13/deployments/${deploymentId}${this.getTeamQuery()}`,
        { headers: this.getHeaders() }
      );

      const deployment = response.data;
      const state = deployment.readyState;

      if (state === 'READY') {
        return deployment;
      } else if (state === 'ERROR' || state === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${state}`);
      }

      logCallback({ type: 'info', message: `Deployment status: ${state}...` });
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Deployment timed out');
  }

  /**
   * Stop/delete deployment
   */
  async stop(projectId) {
    if (!this.apiToken) {
      console.log(`[Vercel] Simulated stop for project ${projectId}`);
      return { success: true };
    }

    try {
      await axios.delete(
        `${this.apiUrl}/v9/projects/${projectId}${this.getTeamQuery()}`,
        { headers: this.getHeaders() }
      );
      return { success: true };
    } catch (error) {
      console.error('[Vercel] Stop failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update deployment settings (environment variables)
   */
  async update(projectId, updates) {
    if (!this.apiToken) {
      console.log(`[Vercel] Simulated update for project ${projectId}`);
      return { success: true };
    }

    try {
      // Update environment variables
      if (updates.envVars) {
        for (const [key, value] of Object.entries(updates.envVars)) {
          await axios.post(
            `${this.apiUrl}/v10/projects/${projectId}/env${this.getTeamQuery()}`,
            {
              key,
              value,
              target: ['production', 'preview', 'development'],
              type: 'encrypted'
            },
            { headers: this.getHeaders() }
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[Vercel] Update failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(deploymentId) {
    if (!this.apiToken) {
      return { logs: [] };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/v2/deployments/${deploymentId}/events${this.getTeamQuery()}`,
        { headers: this.getHeaders() }
      );
      return { logs: response.data };
    } catch (error) {
      return { logs: [], error: error.message };
    }
  }

  /**
   * Simulate deployment (fallback when no API token)
   */
  async simulateDeploy(workflow, logCallback) {
    const steps = [
      { message: 'Uploading files...', duration: 1000 },
      { message: 'Installing dependencies...', duration: 2000 },
      { message: 'Building application...', duration: 3000 },
      { message: 'Deploying to edge network...', duration: 1000 }
    ];

    for (const step of steps) {
      logCallback({ type: 'info', message: step.message });
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    const deploymentId = `vercel-sim-${Date.now()}`;
    const projectName = this.sanitizeProjectName(workflow.name || workflow.id);

    logCallback({ type: 'success', message: 'Simulated deployment completed!' });

    return {
      frontendUrl: `https://${projectName}.vercel.app`,
      backendUrl: `https://${projectName}.vercel.app/api`,
      projectId: projectName,
      deploymentId,
      platform: 'vercel',
      simulated: true
    };
  }

  /**
   * Sanitize project name for Vercel
   */
  sanitizeProjectName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}

module.exports = VercelPlatform;
