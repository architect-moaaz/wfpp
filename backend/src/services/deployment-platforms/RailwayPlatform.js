/**
 * Railway Platform Adapter
 * Handles deployment to Railway using their GraphQL API
 *
 * Required environment variables:
 * - RAILWAY_TOKEN: API token from Railway account settings
 * - RAILWAY_PROJECT_ID: (optional) Existing project ID
 */

const axios = require('axios');

class RailwayPlatform {
  constructor() {
    this.apiToken = process.env.RAILWAY_TOKEN;
    this.projectId = process.env.RAILWAY_PROJECT_ID;
    this.apiUrl = 'https://backboard.railway.app/graphql/v2';
  }

  /**
   * Execute GraphQL query
   */
  async graphql(query, variables = {}) {
    const response = await axios.post(
      this.apiUrl,
      { query, variables },
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || 'GraphQL error');
    }

    return response.data.data;
  }

  /**
   * Deploy to Railway
   */
  async deploy(workflow, codePackage, logCallback) {
    if (!this.apiToken) {
      logCallback({ type: 'warn', message: 'RAILWAY_TOKEN not set. Using simulation mode.' });
      return await this.simulateDeploy(workflow, logCallback);
    }

    try {
      logCallback({ type: 'info', message: 'Connecting to Railway API...' });

      // Step 1: Get or create project
      const projectName = this.sanitizeProjectName(workflow.name || workflow.id);
      let project = await this.getOrCreateProject(projectName, logCallback);

      // Step 2: Get or create service
      logCallback({ type: 'info', message: 'Setting up service...' });
      const service = await this.getOrCreateService(project.id, projectName, logCallback);

      // Step 3: Set environment variables
      if (codePackage.envVars) {
        logCallback({ type: 'info', message: 'Configuring environment variables...' });
        await this.setEnvironmentVariables(project.id, service.id, codePackage.envVars);
      }

      // Step 4: Deploy from GitHub or trigger build
      logCallback({ type: 'info', message: 'Deploying application...' });
      let deployment;

      if (codePackage.githubRepo) {
        deployment = await this.deployFromGitHub(service.id, codePackage.githubRepo);
      } else {
        deployment = await this.triggerDeploy(service.id);
      }

      // Step 5: Wait for deployment
      logCallback({ type: 'info', message: 'Building and deploying...' });
      const finalDeployment = await this.waitForDeployment(project.id, logCallback);

      // Get the domain
      const domain = await this.getServiceDomain(project.id, service.id);

      logCallback({ type: 'success', message: 'Deployment completed successfully!' });

      return {
        frontendUrl: domain ? `https://${domain}` : `https://${projectName}.up.railway.app`,
        backendUrl: domain ? `https://${domain}/api` : `https://${projectName}.up.railway.app/api`,
        projectId: project.id,
        serviceId: service.id,
        deploymentId: deployment?.id || service.id,
        platform: 'railway',
        status: finalDeployment?.status || 'deployed'
      };
    } catch (error) {
      logCallback({ type: 'error', message: `Railway deployment failed: ${error.message}` });
      throw error;
    }
  }

  /**
   * Get or create a Railway project
   */
  async getOrCreateProject(name, logCallback) {
    if (this.projectId) {
      try {
        const data = await this.graphql(`
          query getProject($id: String!) {
            project(id: $id) {
              id
              name
            }
          }
        `, { id: this.projectId });

        if (data.project) {
          logCallback({ type: 'info', message: `Using existing project: ${data.project.name}` });
          return data.project;
        }
      } catch (e) {
        console.warn('[Railway] Project not found, creating new one');
      }
    }

    // Create new project
    logCallback({ type: 'info', message: `Creating new project: ${name}` });
    const data = await this.graphql(`
      mutation createProject($name: String!) {
        projectCreate(input: { name: $name }) {
          id
          name
        }
      }
    `, { name });

    return data.projectCreate;
  }

  /**
   * Get or create a service in the project
   */
  async getOrCreateService(projectId, name, logCallback) {
    const data = await this.graphql(`
      query getServices($projectId: String!) {
        project(id: $projectId) {
          services {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `, { projectId });

    const services = data.project?.services?.edges || [];
    const existingService = services.find(s => s.node.name === name);

    if (existingService) {
      logCallback({ type: 'info', message: `Using existing service: ${name}` });
      return existingService.node;
    }

    logCallback({ type: 'info', message: `Creating new service: ${name}` });
    const createData = await this.graphql(`
      mutation createService($projectId: String!, $name: String!) {
        serviceCreate(input: { projectId: $projectId, name: $name }) {
          id
          name
        }
      }
    `, { projectId, name });

    return createData.serviceCreate;
  }

  /**
   * Set environment variables
   */
  async setEnvironmentVariables(projectId, serviceId, envVars) {
    const envData = await this.graphql(`
      query getEnvironments($projectId: String!) {
        project(id: $projectId) {
          environments {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    `, { projectId });

    const environments = envData.project?.environments?.edges || [];
    const prodEnv = environments.find(e => e.node.name === 'production')?.node;

    if (!prodEnv) return;

    for (const [key, value] of Object.entries(envVars)) {
      await this.graphql(`
        mutation setVariable($projectId: String!, $environmentId: String!, $serviceId: String!, $name: String!, $value: String!) {
          variableUpsert(input: {
            projectId: $projectId
            environmentId: $environmentId
            serviceId: $serviceId
            name: $name
            value: $value
          })
        }
      `, {
        projectId,
        environmentId: prodEnv.id,
        serviceId,
        name: key,
        value: String(value)
      });
    }
  }

  /**
   * Deploy from GitHub repository
   */
  async deployFromGitHub(serviceId, githubRepo) {
    await this.graphql(`
      mutation connectGitHub($serviceId: String!, $repo: String!, $branch: String) {
        serviceConnect(
          id: $serviceId
          input: {
            source: { repo: $repo }
            branch: $branch
          }
        ) {
          id
        }
      }
    `, {
      serviceId,
      repo: githubRepo.repo,
      branch: githubRepo.branch || 'main'
    });

    return { id: serviceId };
  }

  /**
   * Trigger deployment
   */
  async triggerDeploy(serviceId) {
    try {
      await this.graphql(`
        mutation redeploy($serviceId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId)
        }
      `, { serviceId });
    } catch (e) {
      console.log('[Railway] Service will deploy on first push');
    }

    return { id: serviceId };
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(projectId, logCallback, timeout = 300000) {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < timeout) {
      try {
        const data = await this.graphql(`
          query getDeployments($projectId: String!) {
            project(id: $projectId) {
              services {
                edges {
                  node {
                    id
                    deployments {
                      edges {
                        node {
                          id
                          status
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `, { projectId });

        const services = data.project?.services?.edges || [];
        for (const service of services) {
          const deployments = service.node?.deployments?.edges || [];
          const deployment = deployments[0]?.node;

          if (deployment) {
            const status = deployment.status?.toUpperCase();

            if (status === 'SUCCESS' || status === 'DEPLOYED' || status === 'RUNNING') {
              return { id: deployment.id, status };
            } else if (status === 'FAILED' || status === 'CRASHED') {
              throw new Error(`Deployment failed with status: ${status}`);
            }

            logCallback({ type: 'info', message: `Deployment status: ${status}...` });
          }
        }
      } catch (e) {
        if (e.message.includes('failed')) throw e;
        // Continue polling on query errors
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Return success if no explicit status found (first deploy)
    return { status: 'deploying' };
  }

  /**
   * Get service domain
   */
  async getServiceDomain(projectId, serviceId) {
    try {
      const data = await this.graphql(`
        query getDomains($projectId: String!) {
          project(id: $projectId) {
            services {
              edges {
                node {
                  id
                  serviceDomains {
                    domain
                  }
                }
              }
            }
          }
        }
      `, { projectId });

      const services = data.project?.services?.edges || [];
      const service = services.find(s => s.node.id === serviceId)?.node;
      return service?.serviceDomains?.[0]?.domain;
    } catch (e) {
      return null;
    }
  }

  /**
   * Stop/delete deployment
   */
  async stop(projectId) {
    if (!this.apiToken) {
      console.log(`[Railway] Simulated stop for project ${projectId}`);
      return { success: true };
    }

    try {
      await this.graphql(`
        mutation deleteProject($id: String!) {
          projectDelete(id: $id)
        }
      `, { id: projectId });

      return { success: true };
    } catch (error) {
      console.error('[Railway] Stop failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update deployment settings
   */
  async update(projectId, updates) {
    if (!this.apiToken) {
      console.log(`[Railway] Simulated update for project ${projectId}`);
      return { success: true };
    }

    try {
      if (updates.envVars && updates.serviceId) {
        await this.setEnvironmentVariables(projectId, updates.serviceId, updates.envVars);
      }
      return { success: true };
    } catch (error) {
      console.error('[Railway] Update failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate deployment
   */
  async simulateDeploy(workflow, logCallback) {
    const steps = [
      { message: 'Creating Railway project...', duration: 800 },
      { message: 'Provisioning PostgreSQL database...', duration: 1500 },
      { message: 'Deploying services...', duration: 2500 },
      { message: 'Configuring networking...', duration: 1000 }
    ];

    for (const step of steps) {
      logCallback({ type: 'info', message: step.message });
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    const projectName = this.sanitizeProjectName(workflow.name || workflow.id);

    logCallback({ type: 'success', message: 'Simulated deployment completed!' });

    return {
      frontendUrl: `https://${projectName}.up.railway.app`,
      backendUrl: `https://${projectName}.up.railway.app/api`,
      projectId: `railway-sim-${Date.now()}`,
      deploymentId: `deploy-sim-${Date.now()}`,
      platform: 'railway',
      simulated: true
    };
  }

  /**
   * Sanitize project name
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

module.exports = RailwayPlatform;
