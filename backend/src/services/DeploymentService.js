/**
 * DeploymentService
 *
 * Handles deployment and execution of generated applications
 * with database persistence and multi-environment support
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const net = require('net');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class DeploymentService extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.runningApps = new Map(); // appId-envId -> { process, port, startedAt, logs }
    this.basePort = 4000;
    this.maxPort = 4100;
    this.frontendBasePort = 3500;
    this.frontendMaxPort = 3600;
    this.deploymentSteps = [
      { id: 'sync', name: 'Syncing Resources', weight: 5 },
      { id: 'validate', name: 'Validating Application', weight: 10 },
      { id: 'install', name: 'Installing Dependencies', weight: 20 },
      { id: 'test', name: 'Running Tests', weight: 15 },
      { id: 'build', name: 'Building Application', weight: 15 },
      { id: 'deploy', name: 'Deploying Application', weight: 15 },
      { id: 'start', name: 'Starting Application', weight: 10 },
      { id: 'health', name: 'Health Check', weight: 10 }
    ];
  }

  /**
   * Sync latest resources (forms, workflows, pages, etc.) to the generated app
   * This ensures the deployed app has the most up-to-date data
   *
   * Strategy: Read existing resource IDs from app, then fetch latest versions from main data files
   */
  async syncResources(application, appPath) {
    const resourcesDir = path.join(appPath, 'src/resources');

    // Ensure resources directory exists
    if (!fs.existsSync(resourcesDir)) {
      fs.mkdirSync(resourcesDir, { recursive: true });
    }

    const dataDir = path.join(__dirname, '../../data');

    try {
      // Step 1: Load existing resources from the app to get their IDs
      const [existingForms, existingWorkflows, existingPages, existingDataModels, existingRules] = await Promise.all([
        fsPromises.readFile(path.join(resourcesDir, 'forms.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(resourcesDir, 'workflows.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(resourcesDir, 'pages.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(resourcesDir, 'dataModels.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(resourcesDir, 'rules.json'), 'utf8').catch(() => '[]')
      ]);

      const existingFormIds = JSON.parse(existingForms).map(f => f.id);
      const existingWorkflowIds = JSON.parse(existingWorkflows).map(w => w.id);
      const existingPageIds = JSON.parse(existingPages).map(p => p.id);
      const existingDataModelIds = JSON.parse(existingDataModels).map(d => d.id);
      const existingRuleIds = JSON.parse(existingRules).map(r => r.id);

      // Step 2: Load all resources from main data files
      const [formsData, workflowsData, pagesData, dataModelsData, rulesData] = await Promise.all([
        fsPromises.readFile(path.join(dataDir, 'forms.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(dataDir, 'workflows.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(dataDir, 'pages.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(dataDir, 'datamodels.json'), 'utf8').catch(() => '[]'),
        fsPromises.readFile(path.join(dataDir, 'rules.json'), 'utf8').catch(() => '[]')
      ]);

      const allForms = JSON.parse(formsData);
      const allWorkflows = JSON.parse(workflowsData);
      const allPages = JSON.parse(pagesData);
      const allDataModels = JSON.parse(dataModelsData);
      const allRules = JSON.parse(rulesData);

      // Step 3: Find updated versions of resources
      // First try to filter by applicationId, fall back to matching existing IDs
      const appId = application.id;

      let updatedForms = allForms.filter(f => f.applicationId === appId);
      let updatedWorkflows = allWorkflows.filter(w => w.applicationId === appId);
      let updatedPages = allPages.filter(p => p.applicationId === appId);
      let updatedDataModels = allDataModels.filter(d => d.applicationId === appId);
      let updatedRules = allRules.filter(r => r.applicationId === appId);

      // If no resources found by applicationId, fall back to matching existing IDs
      if (updatedForms.length === 0 && existingFormIds.length > 0) {
        updatedForms = allForms.filter(f => existingFormIds.includes(f.id));
      }
      if (updatedWorkflows.length === 0 && existingWorkflowIds.length > 0) {
        updatedWorkflows = allWorkflows.filter(w => existingWorkflowIds.includes(w.id));
      }
      if (updatedPages.length === 0 && existingPageIds.length > 0) {
        updatedPages = allPages.filter(p => existingPageIds.includes(p.id));
      }
      if (updatedDataModels.length === 0 && existingDataModelIds.length > 0) {
        updatedDataModels = allDataModels.filter(d => existingDataModelIds.includes(d.id));
      }
      if (updatedRules.length === 0 && existingRuleIds.length > 0) {
        updatedRules = allRules.filter(r => existingRuleIds.includes(r.id));
      }

      // Step 4: Write synced resources (only if we found matches, otherwise keep existing)
      const writePromises = [];

      if (updatedForms.length > 0 || existingFormIds.length === 0) {
        writePromises.push(fsPromises.writeFile(
          path.join(resourcesDir, 'forms.json'),
          JSON.stringify(updatedForms.length > 0 ? updatedForms : JSON.parse(existingForms), null, 2)
        ));
      }

      if (updatedWorkflows.length > 0 || existingWorkflowIds.length === 0) {
        writePromises.push(fsPromises.writeFile(
          path.join(resourcesDir, 'workflows.json'),
          JSON.stringify(updatedWorkflows.length > 0 ? updatedWorkflows : JSON.parse(existingWorkflows), null, 2)
        ));
      }

      if (updatedPages.length > 0 || existingPageIds.length === 0) {
        writePromises.push(fsPromises.writeFile(
          path.join(resourcesDir, 'pages.json'),
          JSON.stringify(updatedPages.length > 0 ? updatedPages : JSON.parse(existingPages), null, 2)
        ));
      }

      if (updatedDataModels.length > 0 || existingDataModelIds.length === 0) {
        writePromises.push(fsPromises.writeFile(
          path.join(resourcesDir, 'dataModels.json'),
          JSON.stringify(updatedDataModels.length > 0 ? updatedDataModels : JSON.parse(existingDataModels), null, 2)
        ));
      }

      if (updatedRules.length > 0 || existingRuleIds.length === 0) {
        writePromises.push(fsPromises.writeFile(
          path.join(resourcesDir, 'rules.json'),
          JSON.stringify(updatedRules.length > 0 ? updatedRules : JSON.parse(existingRules), null, 2)
        ));
      }

      await Promise.all(writePromises);

      console.log(`[DeploymentService] Synced resources for ${application.name}: ${updatedForms.length}/${existingFormIds.length} forms, ${updatedWorkflows.length}/${existingWorkflowIds.length} workflows, ${updatedPages.length}/${existingPageIds.length} pages`);

      return {
        forms: updatedForms.length || existingFormIds.length,
        workflows: updatedWorkflows.length || existingWorkflowIds.length,
        pages: updatedPages.length || existingPageIds.length,
        dataModels: updatedDataModels.length || existingDataModelIds.length,
        rules: updatedRules.length || existingRuleIds.length
      };
    } catch (error) {
      console.error('[DeploymentService] Error syncing resources:', error);
      throw error;
    }
  }

  /**
   * Create a new deployment record
   */
  async createDeployment(applicationId, environmentId, version, deployedBy = null) {
    const id = `deploy-${uuidv4().slice(0, 8)}`;
    const steps = this.deploymentSteps.map(step => ({
      ...step,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      error: null
    }));

    const result = await this.db.query(`
      INSERT INTO k1.deployments (
        id, application_id, environment_id, version, status, progress,
        current_step, steps, deployed_by, started_at
      )
      VALUES ($1, $2, $3, $4, 'pending', 0, 'validate', $5, $6, NOW())
      RETURNING *
    `, [id, applicationId, environmentId, version, JSON.stringify(steps), deployedBy]);

    return result.rows[0];
  }

  /**
   * Update deployment progress
   */
  async updateDeploymentProgress(deploymentId, stepId, status, progress, error = null) {
    // Get current deployment
    const deployment = await this.getDeploymentById(deploymentId);
    if (!deployment) throw new Error('Deployment not found');

    // Update the step
    const steps = deployment.steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          status,
          startedAt: status === 'in_progress' ? new Date().toISOString() : step.startedAt,
          completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
          error
        };
      }
      return step;
    });

    // Calculate overall progress
    let completedWeight = 0;
    let currentStep = stepId;
    let overallStatus = 'deploying';

    for (const step of steps) {
      if (step.status === 'completed') {
        completedWeight += step.weight;
      } else if (step.status === 'failed') {
        overallStatus = 'failed';
        break;
      } else if (step.status === 'in_progress') {
        currentStep = step.id;
        break;
      }
    }

    if (completedWeight === 100) {
      overallStatus = 'completed';
    }

    const isFinished = overallStatus === 'completed' || overallStatus === 'failed';
    const result = await this.db.query(`
      UPDATE k1.deployments
      SET steps = $1, progress = $2, current_step = $3, status = $4,
          error_message = $5,
          completed_at = CASE WHEN $6 THEN NOW() ELSE completed_at END
      WHERE id = $7
      RETURNING *
    `, [JSON.stringify(steps), completedWeight, currentStep, overallStatus, error, isFinished, deploymentId]);

    // Emit progress event
    this.emit('deploymentProgress', {
      deploymentId,
      step: stepId,
      status,
      progress: completedWeight,
      error
    });

    return result.rows[0];
  }

  /**
   * Update deployment URLs
   */
  async updateDeploymentUrls(deploymentId, urls) {
    const result = await this.db.query(`
      UPDATE k1.deployments
      SET urls = $1::jsonb
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(urls), deploymentId]);

    return result.rows[0];
  }

  /**
   * Update deployment runtime info
   */
  async updateDeploymentRuntime(deploymentId, runtime) {
    const result = await this.db.query(`
      UPDATE k1.deployments
      SET runtime = $1::jsonb
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(runtime), deploymentId]);

    return result.rows[0];
  }

  /**
   * Add log entry to deployment
   */
  async addDeploymentLog(deploymentId, level, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    await this.db.query(`
      UPDATE k1.deployments
      SET logs = logs || $1::jsonb
      WHERE id = $2
    `, [JSON.stringify([logEntry]), deploymentId]);

    this.emit('deploymentLog', { deploymentId, ...logEntry });
  }

  /**
   * Get deployment by ID
   */
  async getDeploymentById(id) {
    const result = await this.db.query(
      'SELECT * FROM k1.deployments WHERE id = $1',
      [id]
    );
    const deployment = result.rows[0] || null;
    if (deployment) {
      // Ensure JSONB fields are parsed (some configurations may return strings)
      if (typeof deployment.urls === 'string') {
        try { deployment.urls = JSON.parse(deployment.urls); } catch (e) {}
      }
      if (typeof deployment.runtime === 'string') {
        try { deployment.runtime = JSON.parse(deployment.runtime); } catch (e) {}
      }
      if (typeof deployment.steps === 'string') {
        try { deployment.steps = JSON.parse(deployment.steps); } catch (e) {}
      }
      if (typeof deployment.logs === 'string') {
        try { deployment.logs = JSON.parse(deployment.logs); } catch (e) {}
      }
    }
    return deployment;
  }

  /**
   * Get deployments for an application
   */
  async getDeploymentsByApplication(applicationId, limit = 20) {
    const result = await this.db.query(`
      SELECT d.*, e.name as environment_name, e.type as environment_type
      FROM k1.deployments d
      JOIN k1.environments e ON d.environment_id = e.id
      WHERE d.application_id = $1
      ORDER BY d.started_at DESC
      LIMIT $2
    `, [applicationId, limit]);

    return result.rows;
  }

  /**
   * Get deployments for an environment
   */
  async getDeploymentsByEnvironment(environmentId, limit = 20) {
    const result = await this.db.query(`
      SELECT d.*, a.name as application_name
      FROM k1.deployments d
      JOIN k1.applications a ON d.application_id = a.id
      WHERE d.environment_id = $1
      ORDER BY d.started_at DESC
      LIMIT $2
    `, [environmentId, limit]);

    return result.rows;
  }

  /**
   * Get active deployment for app in environment
   */
  async getActiveDeployment(applicationId, environmentId) {
    const result = await this.db.query(`
      SELECT * FROM k1.deployments
      WHERE application_id = $1 AND environment_id = $2 AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [applicationId, environmentId]);

    return result.rows[0] || null;
  }

  /**
   * Get active deployment for a specific app+environment (running or in-progress)
   */
  async getActiveDeploymentForAppEnv(applicationId, environmentId) {
    const result = await this.db.query(`
      SELECT * FROM k1.deployments
      WHERE application_id = $1
        AND environment_id = $2
        AND status IN ('pending', 'deploying', 'in_progress', 'running', 'completed')
      ORDER BY started_at DESC
      LIMIT 1
    `, [applicationId, environmentId]);

    return result.rows[0] || null;
  }

  /**
   * Get all active deployments
   */
  async getAllActiveDeployments() {
    const result = await this.db.query(`
      SELECT d.*,
             a.name as application_name,
             e.name as environment_name,
             e.type as environment_type
      FROM k1.deployments d
      LEFT JOIN k1.applications a ON d.application_id = a.id
      LEFT JOIN k1.environments e ON d.environment_id = e.id
      WHERE d.status IN ('pending', 'deploying', 'in_progress', 'running')
      ORDER BY d.started_at DESC
    `);
    return result.rows;
  }

  /**
   * Execute full deployment workflow
   */
  async executeDeployment(application, environment, options = {}) {
    const { runTests = true, deployedBy = null } = options;
    const version = application.version || '1.0.0';

    // Stop any existing deployment for this app+environment combination
    const existingDeployment = await this.getActiveDeploymentForAppEnv(application.id, environment.id);
    if (existingDeployment) {
      console.log(`[DeploymentService] Stopping existing deployment ${existingDeployment.id} for ${application.name} in ${environment.name}`);

      // Stop the running processes
      const appKey = `${application.id}-${environment.id}`;
      await this.stopByKey(appKey);

      // Mark the old deployment as superseded
      await this.db.query(`
        UPDATE k1.deployments
        SET status = 'superseded', completed_at = NOW()
        WHERE id = $1
      `, [existingDeployment.id]);
    }

    // Create deployment record
    const deployment = await this.createDeployment(
      application.id,
      environment.id,
      version,
      deployedBy
    );

    try {
      const appPath = this.getAppPath(application);

      // Step 0: Sync Resources (ensures latest forms, workflows, etc. are deployed)
      await this.updateDeploymentProgress(deployment.id, 'sync', 'in_progress', 0);
      await this.addDeploymentLog(deployment.id, 'info', 'Syncing latest resources...');

      try {
        const syncResult = await this.syncResources(application, appPath);
        await this.addDeploymentLog(deployment.id, 'info',
          `Synced ${syncResult.forms} forms, ${syncResult.workflows} workflows, ${syncResult.pages} pages`);
      } catch (syncError) {
        await this.addDeploymentLog(deployment.id, 'warning', `Resource sync warning: ${syncError.message}`);
        // Continue with deployment even if sync fails (app may still have valid resources)
      }

      await this.updateDeploymentProgress(deployment.id, 'sync', 'completed', 5);

      // Step 1: Validate
      await this.updateDeploymentProgress(deployment.id, 'validate', 'in_progress', 5);
      await this.addDeploymentLog(deployment.id, 'info', 'Validating application...');

      if (!fs.existsSync(appPath)) {
        throw new Error(`Application directory not found: ${appPath}`);
      }

      const requiredFiles = ['package.json', 'src/server.js'];
      const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(appPath, f)));
      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }

      await this.updateDeploymentProgress(deployment.id, 'validate', 'completed', 15);
      await this.addDeploymentLog(deployment.id, 'info', 'Validation complete');

      // Step 2: Install dependencies
      await this.updateDeploymentProgress(deployment.id, 'install', 'in_progress', 15);
      await this.addDeploymentLog(deployment.id, 'info', 'Installing dependencies...');

      // Always run npm install to ensure dependencies are up-to-date
      // This handles cases where package.json was updated but node_modules is stale
      try {
        await this.installDependencies(appPath);
      } catch (installError) {
        console.error(`[DeploymentService] npm install failed: ${installError.message}`);
        await this.addDeploymentLog(deployment.id, 'warning', `Dependency install warning: ${installError.message}`);
        // Continue anyway if node_modules exists
        const nodeModulesPath = path.join(appPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          throw installError;
        }
      }

      await this.updateDeploymentProgress(deployment.id, 'install', 'completed', 30);
      await this.addDeploymentLog(deployment.id, 'info', 'Dependencies installed');

      // Step 3: Run tests (optional)
      if (runTests && environment.config?.require_tests) {
        await this.updateDeploymentProgress(deployment.id, 'test', 'in_progress', 30);
        await this.addDeploymentLog(deployment.id, 'info', 'Running tests...');

        const testResult = await this.runTests(appPath);
        if (!testResult.success) {
          throw new Error(`Tests failed: ${testResult.error}`);
        }

        await this.updateDeploymentProgress(deployment.id, 'test', 'completed', 45);
        await this.addDeploymentLog(deployment.id, 'info', `Tests passed: ${testResult.passed} passed, ${testResult.failed} failed`);
      } else {
        await this.updateDeploymentProgress(deployment.id, 'test', 'completed', 45);
        await this.addDeploymentLog(deployment.id, 'info', 'Tests skipped');
      }

      // Step 4: Build (skip for now - most Node.js apps don't need build)
      await this.updateDeploymentProgress(deployment.id, 'build', 'completed', 60);
      await this.addDeploymentLog(deployment.id, 'info', 'Build step completed');

      // Step 5: Deploy
      await this.updateDeploymentProgress(deployment.id, 'deploy', 'in_progress', 60);
      await this.addDeploymentLog(deployment.id, 'info', 'Deploying application...');

      // Apply environment-specific configuration
      if (environment.env_vars && Object.keys(environment.env_vars).length > 0) {
        await this.updateEnvFile(appPath, environment.env_vars);
      }

      await this.updateDeploymentProgress(deployment.id, 'deploy', 'completed', 80);

      // Step 6: Start
      await this.updateDeploymentProgress(deployment.id, 'start', 'in_progress', 80);
      await this.addDeploymentLog(deployment.id, 'info', 'Starting application...');

      const startResult = await this.startWithEnvironment(application, environment);

      await this.updateDeploymentProgress(deployment.id, 'start', 'completed', 90);
      await this.addDeploymentLog(deployment.id, 'info', `Backend started on port ${startResult.port}`);
      if (startResult.hasFrontend) {
        await this.addDeploymentLog(deployment.id, 'info', `Frontend started on port ${startResult.frontendPort}`);
      }

      // Step 7: Health check
      await this.updateDeploymentProgress(deployment.id, 'health', 'in_progress', 90);
      await this.addDeploymentLog(deployment.id, 'info', 'Running health check...');

      const isHealthy = await this.waitForAppReady(startResult.port, 30000);
      if (!isHealthy) {
        throw new Error('Health check failed - application not responding');
      }

      await this.updateDeploymentProgress(deployment.id, 'health', 'completed', 100);
      await this.addDeploymentLog(deployment.id, 'success', 'Deployment completed successfully');

      // Update URLs (include frontend URL if available)
      const urls = this.generateUrls(application, environment, startResult.port, startResult.frontendPort);
      await this.updateDeploymentUrls(deployment.id, urls);

      // Update runtime info
      await this.updateDeploymentRuntime(deployment.id, {
        pid: startResult.pid,
        frontendPid: startResult.frontendPid,
        port: startResult.port,
        frontendPort: startResult.frontendPort,
        start_time: new Date().toISOString()
      });

      return await this.getDeploymentById(deployment.id);

    } catch (error) {
      await this.addDeploymentLog(deployment.id, 'error', `Deployment failed: ${error.message}`);
      await this.db.query(`
        UPDATE k1.deployments
        SET status = 'failed', error_message = $1, completed_at = NOW()
        WHERE id = $2
      `, [error.message, deployment.id]);

      throw error;
    }
  }

  /**
   * Generate URLs for deployment
   */
  generateUrls(application, environment, backendPort, frontendPort = null) {
    const appSlug = application.slug || application.name?.toLowerCase().replace(/\s+/g, '-');

    if (environment.type === 'local') {
      return {
        frontend: frontendPort ? `http://localhost:${frontendPort}` : `http://localhost:${backendPort}`,
        backend: `http://localhost:${backendPort}/api`,
        api_docs: `http://localhost:${backendPort}/api/workflows`,
        health: `http://localhost:${backendPort}/api/health`
      };
    }

    const baseUrl = environment.base_url || `https://${appSlug}.${environment.host || 'app.workflowpp.io'}`;

    return {
      frontend: baseUrl,
      backend: `${baseUrl}/api`,
      api_docs: `${baseUrl}/api/docs`,
      health: `${baseUrl}/api/health`
    };
  }

  /**
   * Run tests for an application
   */
  async runTests(appPath) {
    return new Promise((resolve) => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));

      if (!packageJson.scripts?.test || packageJson.scripts.test === 'echo "Error: no test specified" && exit 1') {
        resolve({ success: true, passed: 0, failed: 0, skipped: true });
        return;
      }

      exec('npm test', {
        cwd: appPath,
        timeout: 300000,  // 5 minutes for tests
        maxBuffer: 10 * 1024 * 1024  // 10MB buffer for test output
      }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr || error.message, passed: 0, failed: 1 });
        } else {
          resolve({ success: true, passed: 1, failed: 0, output: stdout });
        }
      });
    });
  }

  /**
   * Start application with environment configuration
   */
  async startWithEnvironment(application, environment) {
    const appKey = `${application.id}-${environment.id}`;

    // Stop existing deployment for this app-env combo
    if (this.runningApps.has(appKey)) {
      await this.stopByKey(appKey);
    }

    const appPath = this.getAppPath(application);
    const backendPort = environment.port || await this.findAvailablePort();
    const frontendPath = path.join(appPath, 'frontend');
    const hasFrontend = fs.existsSync(frontendPath) && fs.existsSync(path.join(frontendPath, 'package.json'));

    // Always install frontend dependencies to ensure they're up-to-date
    if (hasFrontend) {
      try {
        console.log('[DeploymentService] Installing frontend dependencies...');
        await this.installDependencies(frontendPath);
        console.log('[DeploymentService] Frontend dependencies installed');
      } catch (installError) {
        console.error(`[DeploymentService] Frontend npm install failed: ${installError.message}`);
        const frontendNodeModules = path.join(frontendPath, 'node_modules');
        if (!fs.existsSync(frontendNodeModules)) {
          throw installError;
        }
      }
    }

    const env = {
      ...process.env,
      ...environment.env_vars,
      PORT: backendPort.toString(),
      NODE_ENV: environment.type === 'production' ? 'production' : 'development'
    };

    const logs = [];
    const maxLogs = 100;

    // Start backend only (not 'npm start' which runs concurrently with frontend)
    // Frontend will be started separately with its own port
    const appProcess = spawn('npm', ['run', 'backend'], {
      cwd: appPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    appProcess.stdout.on('data', (data) => {
      const line = data.toString().trim();
      console.log(`[${application.name}] ${line}`);
      logs.push({ type: 'stdout', message: line, timestamp: new Date() });
      if (logs.length > maxLogs) logs.shift();
    });

    appProcess.stderr.on('data', (data) => {
      const line = data.toString().trim();
      console.error(`[${application.name}] ERROR: ${line}`);
      logs.push({ type: 'stderr', message: line, timestamp: new Date() });
      if (logs.length > maxLogs) logs.shift();
    });

    appProcess.on('exit', (code, signal) => {
      console.log(`[DeploymentService] App ${application.name} backend exited with code ${code}`);
      this.runningApps.delete(appKey);
    });

    let frontendPort = null;
    let frontendProcess = null;

    // Start frontend if it exists
    if (hasFrontend) {
      frontendPort = await this.findAvailableFrontendPort();

      // Update frontend proxy to point to backend
      try {
        const pkgPath = path.join(frontendPath, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.proxy = `http://localhost:${backendPort}`;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        console.log(`[DeploymentService] Updated frontend proxy to http://localhost:${backendPort}`);
      } catch (err) {
        console.error(`[DeploymentService] Failed to update frontend proxy: ${err.message}`);
      }

      // Configure API URL for frontend (works in both dev and production)
      const frontendEnv = {
        ...process.env,
        PORT: frontendPort.toString(),
        REACT_APP_API_URL: `http://localhost:${backendPort}`,
        REACT_APP_BACKEND_PORT: backendPort.toString(),
        BROWSER: 'none', // Don't auto-open browser
        CI: 'true' // Prevent React from auto-selecting different port
      };

      console.log(`[DeploymentService] Starting frontend on port ${frontendPort}...`);

      frontendProcess = spawn('npm', ['start'], {
        cwd: frontendPath,
        env: frontendEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      frontendProcess.stdout.on('data', (data) => {
        const line = data.toString().trim();
        console.log(`[${application.name}-frontend] ${line}`);
        logs.push({ type: 'stdout', message: `[frontend] ${line}`, timestamp: new Date() });
        if (logs.length > maxLogs) logs.shift();
      });

      frontendProcess.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (!line.includes('Compiled') && !line.includes('webpack')) {
          console.error(`[${application.name}-frontend] ERROR: ${line}`);
        }
        logs.push({ type: 'stderr', message: `[frontend] ${line}`, timestamp: new Date() });
        if (logs.length > maxLogs) logs.shift();
      });

      frontendProcess.on('exit', (code, signal) => {
        console.log(`[DeploymentService] App ${application.name} frontend exited with code ${code}`);
      });

      // Wait for frontend to be ready
      const frontendReady = await this.waitForFrontendReady(frontendPort, 60000);
      if (!frontendReady) {
        console.warn(`[DeploymentService] Frontend on port ${frontendPort} may not be ready yet`);
      } else {
        console.log(`[DeploymentService] Frontend started and ready on port ${frontendPort}`);
      }
    }

    this.runningApps.set(appKey, {
      process: appProcess,
      frontendProcess,
      port: backendPort,
      frontendPort,
      startedAt: new Date(),
      logs,
      appPath,
      name: application.name,
      applicationId: application.id,
      environmentId: environment.id
    });

    return {
      port: backendPort,
      frontendPort,
      pid: appProcess.pid,
      frontendPid: frontendProcess?.pid,
      status: 'started',
      path: appPath,
      hasFrontend
    };
  }

  /**
   * Stop deployment by key
   */
  async stopByKey(key) {
    if (!this.runningApps.has(key)) return { status: 'not_running' };

    const info = this.runningApps.get(key);

    // Stop backend process
    if (info.process) {
      try {
        info.process.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!info.process.killed) {
          info.process.kill('SIGKILL');
        }
      } catch (e) {
        console.warn(`[DeploymentService] Error killing backend process:`, e.message);
      }
    }

    // Stop frontend process if exists
    if (info.frontendProcess) {
      try {
        info.frontendProcess.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!info.frontendProcess.killed) {
          info.frontendProcess.kill('SIGKILL');
        }
      } catch (e) {
        console.warn(`[DeploymentService] Error killing frontend process:`, e.message);
      }
    }

    this.runningApps.delete(key);
    return { status: 'stopped' };
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(deploymentId) {
    const deployment = await this.getDeploymentById(deploymentId);
    if (!deployment) throw new Error('Deployment not found');

    // Get the application and environment
    const appResult = await this.db.query('SELECT * FROM k1.applications WHERE id = $1', [deployment.application_id]);
    const envResult = await this.db.query('SELECT * FROM k1.environments WHERE id = $1', [deployment.environment_id]);

    if (!appResult.rows[0] || !envResult.rows[0]) {
      throw new Error('Application or environment not found');
    }

    // Execute a new deployment with the same version
    return this.executeDeployment(appResult.rows[0], envResult.rows[0], {
      runTests: false,
      deployedBy: 'rollback'
    });
  }

  /**
   * Cancel a running deployment
   */
  async cancelDeployment(deploymentId) {
    const deployment = await this.getDeploymentById(deploymentId);
    if (!deployment) throw new Error('Deployment not found');

    if (!['pending', 'validating', 'building', 'testing', 'deploying'].includes(deployment.status)) {
      throw new Error('Cannot cancel deployment in current state');
    }

    await this.db.query(`
      UPDATE k1.deployments
      SET status = 'cancelled', completed_at = NOW()
      WHERE id = $1
    `, [deploymentId]);

    await this.addDeploymentLog(deploymentId, 'warning', 'Deployment cancelled by user');

    return this.getDeploymentById(deploymentId);
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  /**
   * Find an available port starting from basePort
   */
  async findAvailablePort(startPort = null, maxPort = null) {
    const base = startPort || this.basePort;
    const max = maxPort || this.maxPort;
    for (let port = base; port <= max; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available ports in range ${base}-${max}`);
  }

  /**
   * Find an available frontend port
   */
  async findAvailableFrontendPort() {
    return this.findAvailablePort(this.frontendBasePort, this.frontendMaxPort);
  }

  /**
   * Get the app directory path
   */
  getAppPath(application) {
    // Support both slug-based names and ID-based directories
    // Convert underscores to hyphens and spaces to hyphens for directory lookup
    const name = application.name?.toLowerCase() || '';
    const slugWithHyphens = name.replace(/[\s_]+/g, '-');
    const slugWithUnderscores = name.replace(/[\s-]+/g, '_');
    const slug = application.slug || slugWithHyphens;

    const possiblePaths = [
      path.join(__dirname, '../../generated-apps', slug),
      path.join(__dirname, '../../generated-apps', slugWithHyphens),
      path.join(__dirname, '../../generated-apps', slugWithUnderscores),
      path.join(__dirname, '../../generated-apps', name),
      path.join(__dirname, '../../generated-apps', application.id)
    ];

    for (const appPath of possiblePaths) {
      if (fs.existsSync(appPath)) {
        return appPath;
      }
    }

    return possiblePaths[0]; // Return first path even if doesn't exist
  }

  /**
   * Deploy an application - validates, installs dependencies, and prepares for start
   * @param {Object} application - Application object with id, name, slug
   * @param {Object} config - Deployment configuration { type, port, env }
   * @returns {Object} Deployment info { path, url, port, type, status }
   */
  async deploy(application, config = {}) {
    console.log('[DeploymentService] Deploying:', application.name);

    const { type = 'standalone', port = null, env = {} } = config;
    const appPath = this.getAppPath(application);

    // Step 1: Verify application directory exists
    if (!fs.existsSync(appPath)) {
      throw new Error(`Application directory not found: ${appPath}. Please generate the application first.`);
    }

    // Step 2: Verify required files exist
    const requiredFiles = ['package.json', 'src/server.js'];
    const missingFiles = requiredFiles.filter(file =>
      !fs.existsSync(path.join(appPath, file))
    );

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files in application: ${missingFiles.join(', ')}`);
    }

    // Step 3: Verify resources directory
    const resourcesPath = path.join(appPath, 'src/resources');
    if (!fs.existsSync(resourcesPath)) {
      console.warn(`[DeploymentService] Resources directory not found: ${resourcesPath}`);
    }

    // Step 4: Install dependencies if needed
    const nodeModulesPath = path.join(appPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('[DeploymentService] Installing dependencies for:', application.name);
      try {
        await this.installDependencies(appPath);
      } catch (error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
      }
    }

    // Step 5: Update .env file if custom environment variables provided
    if (Object.keys(env).length > 0) {
      await this.updateEnvFile(appPath, env);
    }

    // Step 6: Find available port if not specified
    const assignedPort = port || await this.findAvailablePort();

    // Step 7: Validate the app can be started (check package.json has start script)
    const packageJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));
    if (!packageJson.scripts?.start) {
      throw new Error('Application package.json is missing a start script');
    }

    console.log(`[DeploymentService] Application ${application.name} ready for deployment`);

    return {
      path: appPath,
      url: `http://localhost:${assignedPort}`,
      port: assignedPort,
      type,
      status: 'ready',
      packageVersion: packageJson.version || '1.0.0',
      dependencies: Object.keys(packageJson.dependencies || {}).length
    };
  }

  /**
   * Update or create .env file with custom environment variables
   */
  async updateEnvFile(appPath, env) {
    const envPath = path.join(appPath, '.env');
    let existingEnv = '';

    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, 'utf8');
    }

    // Parse existing env
    const envVars = {};
    existingEnv.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1]] = match[2];
      }
    });

    // Merge new env vars
    Object.assign(envVars, env);

    // Write back
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, newEnvContent);
    console.log(`[DeploymentService] Updated .env file with ${Object.keys(env).length} variables`);
  }

  async start(application) {
    console.log('[DeploymentService] Starting:', application.name);

    const appId = application.id;

    // Check if already running
    if (this.runningApps.has(appId)) {
      console.log('[DeploymentService] Application already running:', appId);
      const info = this.runningApps.get(appId);

      // Verify process is still alive
      if (info.process && !info.process.killed) {
        try {
          process.kill(info.process.pid, 0); // Check if process exists
          return {
            url: `http://localhost:${info.port}`,
            frontendUrl: info.frontendPort ? `http://localhost:${info.frontendPort}` : null,
            port: info.port,
            frontendPort: info.frontendPort,
            pid: info.process.pid,
            status: 'already_running'
          };
        } catch (e) {
          // Process no longer exists, clean up
          this.runningApps.delete(appId);
        }
      }
    }

    const appPath = this.getAppPath(application);

    // Validate app exists
    if (!fs.existsSync(appPath)) {
      throw new Error(`Application directory not found: ${appPath}`);
    }

    const packageJsonPath = path.join(appPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in: ${appPath}`);
    }

    // Check if frontend exists
    const frontendPath = path.join(appPath, 'frontend');
    const hasFrontend = fs.existsSync(frontendPath) && fs.existsSync(path.join(frontendPath, 'package.json'));

    // Always install backend dependencies to ensure they're up-to-date
    try {
      console.log('[DeploymentService] Installing backend dependencies for:', application.name);
      await this.installDependencies(appPath);
    } catch (installError) {
      console.error(`[DeploymentService] Backend npm install failed: ${installError.message}`);
      const nodeModulesPath = path.join(appPath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        throw installError;
      }
    }

    // Always install frontend dependencies to ensure they're up-to-date
    if (hasFrontend) {
      try {
        console.log('[DeploymentService] Installing frontend dependencies for:', application.name);
        await this.installDependencies(frontendPath);
      } catch (installError) {
        console.error(`[DeploymentService] Frontend npm install failed: ${installError.message}`);
        const frontendNodeModules = path.join(frontendPath, 'node_modules');
        if (!fs.existsSync(frontendNodeModules)) {
          throw installError;
        }
      }
    }

    // Find available ports
    const backendPort = application.runtime?.port || await this.findAvailablePort();
    let frontendPort = null;

    const logs = [];
    const maxLogs = 100;

    // Start backend with 'npm run backend' instead of 'npm start' (which runs concurrently)
    const backendEnv = {
      ...process.env,
      PORT: backendPort.toString(),
      NODE_ENV: 'production'
    };

    console.log(`[DeploymentService] Starting backend at ${appPath} on port ${backendPort}`);

    const appProcess = spawn('npm', ['run', 'backend'], {
      cwd: appPath,
      env: backendEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Capture stdout
    appProcess.stdout.on('data', (data) => {
      const line = data.toString().trim();
      console.log(`[${application.name}] ${line}`);
      logs.push({ type: 'stdout', message: line, timestamp: new Date() });
      if (logs.length > maxLogs) logs.shift();
    });

    // Capture stderr
    appProcess.stderr.on('data', (data) => {
      const line = data.toString().trim();
      console.error(`[${application.name}] ERROR: ${line}`);
      logs.push({ type: 'stderr', message: line, timestamp: new Date() });
      if (logs.length > maxLogs) logs.shift();
    });

    // Handle process exit
    appProcess.on('exit', (code, signal) => {
      console.log(`[DeploymentService] App ${application.name} backend exited with code ${code}, signal ${signal}`);
      this.runningApps.delete(appId);
    });

    appProcess.on('error', (err) => {
      console.error(`[DeploymentService] Failed to start ${application.name}:`, err);
      this.runningApps.delete(appId);
    });

    let frontendProcess = null;

    // Start frontend separately if it exists
    if (hasFrontend) {
      frontendPort = await this.findAvailableFrontendPort();

      // Update frontend proxy to point to backend
      try {
        const pkgPath = path.join(frontendPath, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.proxy = `http://localhost:${backendPort}`;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        console.log(`[DeploymentService] Updated frontend proxy to http://localhost:${backendPort}`);
      } catch (err) {
        console.error(`[DeploymentService] Failed to update frontend proxy: ${err.message}`);
      }

      const frontendEnv = {
        ...process.env,
        PORT: frontendPort.toString(),
        REACT_APP_API_URL: `http://localhost:${backendPort}`,
        REACT_APP_BACKEND_PORT: backendPort.toString(),
        BROWSER: 'none',
        CI: 'true' // Prevent React from auto-selecting different port
      };

      console.log(`[DeploymentService] Starting frontend at ${frontendPath} on port ${frontendPort}`);

      frontendProcess = spawn('npm', ['start'], {
        cwd: frontendPath,
        env: frontendEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      frontendProcess.stdout.on('data', (data) => {
        const line = data.toString().trim();
        console.log(`[${application.name}-frontend] ${line}`);
        logs.push({ type: 'stdout', message: `[frontend] ${line}`, timestamp: new Date() });
        if (logs.length > maxLogs) logs.shift();
      });

      frontendProcess.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (!line.includes('Compiled') && !line.includes('webpack')) {
          console.error(`[${application.name}-frontend] ERROR: ${line}`);
        }
        logs.push({ type: 'stderr', message: `[frontend] ${line}`, timestamp: new Date() });
        if (logs.length > maxLogs) logs.shift();
      });

      frontendProcess.on('exit', (code, signal) => {
        console.log(`[DeploymentService] App ${application.name} frontend exited with code ${code}`);
      });

      // Wait for frontend to be ready
      const frontendReady = await this.waitForFrontendReady(frontendPort, 60000);
      if (!frontendReady) {
        console.warn(`[DeploymentService] Frontend on port ${frontendPort} may not be ready yet`);
      } else {
        console.log(`[DeploymentService] Frontend started and ready on port ${frontendPort}`);
      }
    }

    // Store running app info
    this.runningApps.set(appId, {
      process: appProcess,
      frontendProcess,
      port: backendPort,
      frontendPort,
      startedAt: new Date(),
      logs,
      appPath,
      name: application.name
    });

    // Wait for backend to be ready (check health endpoint)
    const isReady = await this.waitForAppReady(backendPort, 30000);

    if (!isReady) {
      console.warn(`[DeploymentService] App ${application.name} backend may not be fully ready`);
    }

    console.log(`[DeploymentService] Application ${application.name} started - Backend: ${backendPort}, Frontend: ${frontendPort || 'N/A'} (PID: ${appProcess.pid})`);

    return {
      url: `http://localhost:${backendPort}`,
      frontendUrl: frontendPort ? `http://localhost:${frontendPort}` : null,
      port: backendPort,
      frontendPort,
      pid: appProcess.pid,
      frontendPid: frontendProcess?.pid,
      status: 'started',
      path: appPath,
      hasFrontend
    };
  }

  /**
   * Install npm dependencies for an app
   */
  async installDependencies(appPath) {
    return new Promise((resolve, reject) => {
      // Don't use --production flag as React apps need devDependencies like react-scripts
      // Increased timeout to 10 minutes and maxBuffer to 50MB for large React apps with many dependencies
      exec('npm install', {
        cwd: appPath,
        timeout: 600000,  // 10 minutes
        maxBuffer: 50 * 1024 * 1024  // 50MB buffer for deprecation warnings and logs
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('[DeploymentService] npm install failed:', stderr);
          reject(error);
        } else {
          console.log('[DeploymentService] npm install completed for:', appPath);
          resolve();
        }
      });
    });
  }

  /**
   * Wait for the app to be ready by checking health endpoint
   */
  async waitForAppReady(port, timeout = 30000) {
    const startTime = Date.now();
    const checkInterval = 500;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/api/health`);
        if (response.ok) {
          return true;
        }
      } catch (e) {
        // App not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    return false;
  }

  /**
   * Wait for the frontend to be ready by checking if it returns HTML
   */
  async waitForFrontendReady(port, timeout = 60000) {
    const startTime = Date.now();
    const checkInterval = 1000;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/`);
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          // React dev server should return HTML
          if (contentType.includes('text/html')) {
            return true;
          }
        }
      } catch (e) {
        // Frontend not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    return false;
  }

  async stop(application) {
    console.log('[DeploymentService] Stopping:', application.name);

    const appId = application.id;

    if (!this.runningApps.has(appId)) {
      console.log('[DeploymentService] Application not running:', appId);
      return { status: 'not_running' };
    }

    const info = this.runningApps.get(appId);

    // Kill the process
    if (info.process) {
      try {
        // Send SIGTERM first for graceful shutdown
        info.process.kill('SIGTERM');

        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));

        // If still running, force kill
        if (!info.process.killed) {
          info.process.kill('SIGKILL');
        }

        console.log(`[DeploymentService] Killed process ${info.process.pid}`);
      } catch (e) {
        console.warn(`[DeploymentService] Error killing process:`, e.message);
      }
    }

    this.runningApps.delete(appId);
    console.log('[DeploymentService] Application stopped:', appId);

    return { status: 'stopped', pid: info.process?.pid };
  }

  async getStatus(application) {
    const appId = application.id;

    if (!this.runningApps.has(appId)) {
      return {
        status: 'stopped',
        uptime: 0
      };
    }

    const info = this.runningApps.get(appId);

    // Verify process is still alive
    let isAlive = false;
    if (info.process && info.process.pid) {
      try {
        process.kill(info.process.pid, 0);
        isAlive = true;
      } catch (e) {
        // Process no longer exists
        this.runningApps.delete(appId);
        return { status: 'stopped', uptime: 0 };
      }
    }

    const uptime = Date.now() - info.startedAt.getTime();

    return {
      status: isAlive ? 'running' : 'stopped',
      uptime,
      port: info.port,
      pid: info.process?.pid,
      url: `http://localhost:${info.port}`,
      logs: info.logs?.slice(-20) // Return last 20 log entries
    };
  }

  /**
   * Get logs for a running application
   */
  getLogs(application, limit = 50) {
    const appId = application.id;

    if (!this.runningApps.has(appId)) {
      return [];
    }

    const info = this.runningApps.get(appId);
    return info.logs?.slice(-limit) || [];
  }

  listRunning() {
    const running = [];
    for (const [appId, info] of this.runningApps.entries()) {
      // Verify process is still alive
      let isAlive = false;
      try {
        if (info.process?.pid) {
          process.kill(info.process.pid, 0);
          isAlive = true;
        }
      } catch (e) {
        this.runningApps.delete(appId);
        continue;
      }

      if (isAlive) {
        running.push({
          appId,
          name: info.name,
          port: info.port,
          pid: info.process.pid,
          uptime: Date.now() - info.startedAt.getTime(),
          url: `http://localhost:${info.port}`
        });
      }
    }
    return running;
  }

  /**
   * Stop all running applications
   */
  async stopAll() {
    const results = [];
    for (const [appId, info] of this.runningApps.entries()) {
      try {
        await this.stop({ id: appId, name: info.name });
        results.push({ appId, status: 'stopped' });
      } catch (e) {
        results.push({ appId, status: 'error', error: e.message });
      }
    }
    return results;
  }
}

module.exports = DeploymentService;
