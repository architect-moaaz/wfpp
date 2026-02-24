/**
 * ApplicationGenerator
 *
 * Generates complete standalone application from application definition
 * Includes: Runtime engine, APIs, DB initialization, configuration, resources
 */

const fs = require('fs').promises;
const path = require('path');
const ShadcnComponentGenerator = require('./ShadcnComponentGenerator');
const UICodeGenerator = require('./UICodeGenerator');
const DesignExpert = require('../services/moe/experts/DesignExpert');
const { mergeWithTheme, LIGHT_COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, LAYOUT, COMPONENTS, TRANSITION, STATUS_COLORS } = require('../config/design-tokens');

class ApplicationGenerator {
  constructor(application) {
    this.application = application;

    // Create app folder name from application name (lowercase, replace spaces with hyphens)
    const appName = (application.name || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    this.outputPath = path.join(__dirname, '../../generated-apps', appName);
  }

  /**
   * Get application context for LLM analysis
   */
  getApplicationContext() {
    const resources = this.application.resources || {};
    return {
      name: this.application.name || 'Untitled App',
      description: this.application.description || '',
      dataModels: (resources.dataModels || this.application.dataModels || []).map(d => ({
        name: d.name,
        fields: (d.fields || []).map(f => f.name || f).slice(0, 10)
      })),
      pages: (resources.pages || this.application.pages || []).map(p => ({
        name: p.name,
        route: p.route,
        sections: (p.sections || []).length
      })),
      workflows: (resources.workflows || this.application.workflows || []).map(w => ({
        name: w.name,
        nodeCount: (w.nodes || []).length
      })),
      forms: (resources.forms || this.application.forms || []).map(f => ({
        name: f.name,
        fieldCount: (f.fields || []).length
      }))
    };
  }

  async generate() {
    console.log('[ApplicationGenerator] Generating complete application for:', this.application.name);

    try {
      // Create directory structure
      await this.createDirectoryStructure();

      const files = [];

      // 1. Generate package.json with all dependencies
      files.push(await this.generatePackageJson());

      // 2. Generate all resource JSON files
      files.push(await this.generateResources());

      // 3. Generate runtime engine
      files.push(await this.generateRuntimeEngine());

      // 4. Generate API routes
      files.push(await this.generateAPIRoutes());

      // 5. Generate server.js
      files.push(await this.generateServer());

      // 6. Generate configuration files
      files.push(await this.generateEnvFile());
      files.push(await this.generateConfigFile());

      // 7. Generate database initialization
      files.push(await this.generateDatabaseInit());

      // 8. Generate models
      files.push(await this.generateModels());

      // 9. Generate ExecutionLogDatabase for self-healing
      files.push(await this.generateExecutionLogDatabase());

      // 10. Generate execution logs API routes
      files.push(await this.generateExecutionLogsRoutes());

      // 11. Generate utility files
      files.push(await this.generateUtils());

      // 12. Generate README
      files.push(await this.generateReadme());

      // 13. Generate .gitignore
      files.push(await this.generateGitignore());

      // 14. Generate services (Email, Notification)
      files.push(...await this.generateServices());

      // 15. Generate SSR (Server-Side Rendering) modules
      files.push(...await this.generateSSR());

      // 16. Generate React Frontend
      files.push(...await this.generateFrontend());

      console.log(`[ApplicationGenerator] Generated ${files.length} files at ${this.outputPath}`);

      return {
        path: this.outputPath,
        files
      };
    } catch (error) {
      console.error('[ApplicationGenerator] Failed to generate:', error);
      throw error;
    }
  }

  async createDirectoryStructure() {
    const dirs = [
      this.outputPath,
      // Backend
      path.join(this.outputPath, 'src'),
      path.join(this.outputPath, 'src/resources'),
      path.join(this.outputPath, 'src/runtime'),
      path.join(this.outputPath, 'src/routes'),
      path.join(this.outputPath, 'src/models'),
      path.join(this.outputPath, 'src/database'),
      path.join(this.outputPath, 'src/utils'),
      path.join(this.outputPath, 'src/config'),
      path.join(this.outputPath, 'src/services'),
      path.join(this.outputPath, 'data'),
      path.join(this.outputPath, 'logs'),
      // Frontend
      path.join(this.outputPath, 'frontend'),
      path.join(this.outputPath, 'frontend/src'),
      path.join(this.outputPath, 'frontend/src/components'),
      path.join(this.outputPath, 'frontend/src/pages'),
      path.join(this.outputPath, 'frontend/src/api'),
      path.join(this.outputPath, 'frontend/public')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async generatePackageJson() {
    const packageName = (this.application.name || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const packageJson = {
      name: packageName,
      version: this.application.version || '1.0.0',
      description: this.application.description,
      main: 'src/server.js',
      scripts: {
        start: 'concurrently "npm run backend" "npm run frontend"',
        backend: 'node src/server.js',
        'backend:dev': 'nodemon src/server.js',
        frontend: 'cd frontend && npm start',
        'frontend:build': 'cd frontend && npm run build',
        'install:all': 'npm install && cd frontend && npm install',
        dev: 'concurrently "npm run backend:dev" "npm run frontend"',
        'db:init': 'node src/database/init.js',
        'db:migrate': 'node src/database/migrate.js'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        'body-parser': '^1.20.2',
        dotenv: '^16.0.3',
        pg: '^8.11.0',
        'pg-hstore': '^2.3.4',
        uuid: '^9.0.0',
        axios: '^1.4.0',
        'node-cron': '^3.0.2',
        kafkajs: '^2.2.4',
        ioredis: '^5.3.2',
        winston: '^3.9.0',
        bull: '^4.12.0',
        nodemailer: '^6.9.0',
        '@anthropic-ai/sdk': '^0.71.0',
        // Auth / OAuth / SSO
        'passport': '^0.7.0',
        'passport-local': '^1.0.0',
        'passport-google-oauth20': '^2.0.0',
        'passport-github2': '^0.1.12',
        'express-session': '^1.17.3',
        'jsonwebtoken': '^9.0.2',
        'bcryptjs': '^2.4.3',
        // Real-time
        'socket.io': '^4.7.4',
        // PDF
        'pdfkit': '^0.13.0',
        // File management
        'multer': '^1.4.5-lts.1',
        // i18n
        'i18next': '^23.7.0',
        'i18next-fs-backend': '^2.3.0',
        'i18next-http-middleware': '^3.5.0'
      },
      optionalDependencies: {
        '@sendgrid/mail': '^8.1.0',
        '@aws-sdk/client-ses': '^3.400.0',
        'firebase-admin': '^12.0.0',
        'pusher': '^5.2.0',
        '@aws-sdk/client-s3': '^3.400.0',
        'passport-azure-ad': '^4.3.5',
        'stripe': '^14.0.0'
      },
      devDependencies: {
        nodemon: '^2.0.22',
        concurrently: '^8.2.0'
      }
    };

    const filePath = path.join(this.outputPath, 'package.json');
    await fs.writeFile(filePath, JSON.stringify(packageJson, null, 2));
    return 'package.json';
  }

  async generateResources() {
    const resourcesDir = path.join(this.outputPath, 'src/resources');
    const resources = this.application.resources || {};

    // Workflows
    await fs.writeFile(
      path.join(resourcesDir, 'workflows.json'),
      JSON.stringify(resources.workflows || [], null, 2)
    );

    // Data Models
    await fs.writeFile(
      path.join(resourcesDir, 'dataModels.json'),
      JSON.stringify(resources.dataModels || [], null, 2)
    );

    // Forms - Load from file-based storage to get complete data including wizard steps
    // PostgreSQL schema doesn't have 'steps' column, so we load directly from forms.json
    const formsFromFile = await this.loadFormsFromFileStorage(resources.forms || []);
    await fs.writeFile(
      path.join(resourcesDir, 'forms.json'),
      JSON.stringify(formsFromFile, null, 2)
    );

    // Pages
    await fs.writeFile(
      path.join(resourcesDir, 'pages.json'),
      JSON.stringify(resources.pages || [], null, 2)
    );

    // Rules
    await fs.writeFile(
      path.join(resourcesDir, 'rules.json'),
      JSON.stringify(resources.rules || [], null, 2)
    );

    // Mobile UI
    if (resources.mobileUI) {
      await fs.writeFile(
        path.join(resourcesDir, 'mobileUI.json'),
        JSON.stringify(resources.mobileUI, null, 2)
      );
    }

    return 'resources';
  }

  /**
   * Load forms from file-based storage to get complete data
   * This ensures wizard forms get their 'steps' data which isn't stored in PostgreSQL
   */
  async loadFormsFromFileStorage(formsFromDB) {
    try {
      const formsFilePath = path.join(__dirname, '../../data/forms.json');
      const formsFileContent = await fs.readFile(formsFilePath, 'utf8');
      const allForms = JSON.parse(formsFileContent);

      // Get form IDs from the database
      const formIds = formsFromDB.map(f => f.id);

      // Find matching forms from file storage
      const matchedForms = allForms.filter(f => formIds.includes(f.id));

      // If we found matches in file storage, use those (they have complete data)
      // Otherwise fall back to database forms
      return matchedForms.length > 0 ? matchedForms : formsFromDB;
    } catch (error) {
      console.error('[ApplicationGenerator] Error loading forms from file storage:', error);
      // Fall back to database forms if file read fails
      return formsFromDB;
    }
  }

  async generateRuntimeEngine() {
    const runtimeEngine = `/**
 * Workflow Runtime Engine with Self-Healing
 * Executes workflow instances and manages workflow state with AI-powered error recovery
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WorkflowInstance = require('../models/WorkflowInstance');
const logger = require('../utils/logger');
const executionLogDB = require('../database/ExecutionLogDatabase');
const Anthropic = require('@anthropic-ai/sdk');

class RuntimeEngine {
  constructor() {
    this.workflows = [];
    this.instances = new Map();
    this.nodeExecutors = this.initializeNodeExecutors();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
  }

  async initialize() {
    try {
      // Load workflows
      const workflowsPath = path.join(__dirname, '../resources/workflows.json');
      const workflowsData = await fs.readFile(workflowsPath, 'utf8');
      this.workflows = JSON.parse(workflowsData);
      logger.info(\`Loaded \${this.workflows.length} workflows\`);

      // Load rules and attach to validation nodes
      try {
        const rulesPath = path.join(__dirname, '../resources/rules.json');
        const rulesData = await fs.readFile(rulesPath, 'utf8');
        this.rules = JSON.parse(rulesData);
        logger.info(\`Loaded \${this.rules.length} rules\`);

        // Attach rules to matching validation nodes
        for (const workflow of this.workflows) {
          if (!workflow.nodes) continue;
          for (const node of workflow.nodes) {
            if (node.type === 'validation' && !node.data?.rules?.length) {
              const matchingRules = this.rules.filter(r =>
                r.workflowId === workflow.id || r.nodeId === node.id
              );
              if (matchingRules.length > 0) {
                node.data = node.data || {};
                node.data.rules = matchingRules;
              }
            }
          }
        }
      } catch (rulesError) {
        logger.warn('No rules.json found, validation nodes will use inline rules only');
        this.rules = [];
      }

      // Set up scheduled workflows (timerStartEvent)
      this.setupScheduledWorkflows();
    } catch (error) {
      logger.error('Failed to load workflows:', error);
      throw error;
    }
  }

  setupScheduledWorkflows() {
    this.scheduledJobs = [];

    for (const workflow of this.workflows) {
      if (!workflow.nodes) continue;

      // Timer start events - cron scheduling
      const timerStart = workflow.nodes.find(n => n.type === 'timerStartEvent');
      if (timerStart && timerStart.data?.schedule) {
        try {
          const cron = require('node-cron');
          const schedule = timerStart.data.schedule;
          if (cron.validate(schedule)) {
            const job = cron.schedule(schedule, () => {
              logger.info(\`[Scheduler] Triggering workflow "\${workflow.name}" on schedule: \${schedule}\`);
              this.startWorkflow(workflow.id, { triggeredBy: 'timer', schedule }).catch(err => {
                logger.error(\`[Scheduler] Failed to trigger "\${workflow.name}":\`, err);
              });
            }, { timezone: timerStart.data.timezone || 'UTC' });
            this.scheduledJobs.push(job);
            logger.info(\`[Scheduler] Registered cron for "\${workflow.name}": \${schedule}\`);
          } else {
            logger.warn(\`[Scheduler] Invalid cron expression for "\${workflow.name}": \${schedule}\`);
          }
        } catch (cronError) {
          logger.warn('node-cron not available, timer scheduling disabled');
        }
      }

      // Conditional start events - periodic polling
      const condStart = workflow.nodes.find(n => n.type === 'conditionalStartEvent');
      if (condStart && condStart.data?.condition) {
        const intervalMs = this.parseInterval(condStart.data.pollIntervalValue, condStart.data.pollIntervalUnit) || 60000;
        const timer = setInterval(async () => {
          try {
            const conditionMet = this.evaluateCondition(condStart.data.condition, {});
            if (conditionMet) {
              logger.info(\`[Scheduler] Condition met for "\${workflow.name}", triggering workflow\`);
              await this.startWorkflow(workflow.id, { triggeredBy: 'condition', condition: condStart.data.condition });
            }
          } catch (err) {
            logger.error(\`[Scheduler] Condition check failed for "\${workflow.name}":\`, err.message);
          }
        }, intervalMs);
        this.scheduledJobs.push({ stop: () => clearInterval(timer) });
        logger.info(\`[Scheduler] Registered condition poll for "\${workflow.name}" every \${intervalMs}ms\`);
      }

      // Message start events - log webhook path for external systems
      const msgStart = workflow.nodes.find(n => n.type === 'messageStartEvent');
      if (msgStart) {
        const webhookPath = msgStart.data?.webhookPath || \`/webhook/\${workflow.id}\`;
        logger.info(\`[Scheduler] Workflow "\${workflow.name}" can be triggered via POST /api/workflows/\${workflow.id}/start or webhook: \${webhookPath}\`);
      }

      // Signal start events - log signal name for event bus
      const sigStart = workflow.nodes.find(n => n.type === 'signalStartEvent');
      if (sigStart && sigStart.data?.signalName) {
        logger.info(\`[Scheduler] Workflow "\${workflow.name}" listens for signal: \${sigStart.data.signalName}\`);
      }
    }
  }

  parseInterval(value, unit) {
    if (!value) return null;
    const num = parseInt(value);
    if (isNaN(num)) return null;
    const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000 };
    return num * (multipliers[unit] || 60000);
  }

  /**
   * Get helper functions library for script execution
   */
  getHelperFunctions() {
    return {
      // Data manipulation
      updateField: (data, field, value) => {
        return { ...data, [field]: value };
      },
      getField: (data, field) => {
        return data[field];
      },
      mergeData: (data, newData) => {
        return { ...data, ...newData };
      },

      // Array operations
      addToArray: (data, field, item) => {
        const arr = data[field] || [];
        return { ...data, [field]: [...arr, item] };
      },
      filterArray: (data, field, predicate) => {
        const arr = data[field] || [];
        return { ...data, [field]: arr.filter(predicate) };
      },

      // Validation
      validateRequired: (data, fields) => {
        const missing = fields.filter(f => !data[f]);
        return { valid: missing.length === 0, missing };
      },

      // String operations
      formatString: (template, data) => {
        return template.replace(/\\{(\\w+)\\}/g, (_, key) => data[key] || '');
      },

      // Date operations
      getCurrentDate: () => new Date().toISOString(),
      formatDate: (date) => new Date(date).toLocaleDateString(),

      // Logging
      log: (...args) => {
        console.log('[ScriptTask]', ...args);
      }
    };
  }

  /**
   * Use AI to fix a broken script with historical learning
   */
  async fixScriptWithAI(originalScript, errorMessage, taskData, processData, workflowId) {
    if (!this.useLLM) {
      logger.info('[RuntimeEngine] AI not available for script recovery');
      return { script: null, method: null };
    }

    logger.info('[RuntimeEngine] Attempting AI-powered script recovery...');

    // Step 1: Check historical fixes for similar errors
    const similarFixes = executionLogDB.findSimilarFixes(errorMessage, originalScript, 3);

    if (similarFixes.length > 0) {
      logger.info(\`[RuntimeEngine] Found \${similarFixes.length} similar historical fixes\`);

      // Try the most successful fix first
      const bestFix = similarFixes[0];
      logger.info(\`[RuntimeEngine] Using cached fix (success count: \${bestFix.successCount})\`);

      return {
        script: bestFix.fixedScript,
        method: 'cached',
        reference: bestFix
      };
    }

    // Step 2: No historical fix found, use AI to generate new fix
    logger.info('[RuntimeEngine] No historical fix found, generating AI solution...');

    try {
      // Build prompt with historical context if available
      let historicalContext = '';
      if (similarFixes.length > 0) {
        historicalContext = '\\n**Similar Past Errors and Fixes:**\\n';
        similarFixes.forEach((fix, idx) => {
          historicalContext += \`\\nExample \${idx + 1}:\\n\`;
          historicalContext += \`Error: \${fix.errorMessage}\\n\`;
          historicalContext += \`Fix: \${fix.fixedScript}\\n\`;
        });
      }

      const prompt = \`You are a script repair expert with access to historical fixes. A JavaScript script failed during execution and you need to fix it.

**Original Script:**
\\\`\\\`\\\`javascript
\${originalScript}
\\\`\\\`\\\`

**Error:**
\${errorMessage}

**Task Context:**
- Task Label: \${taskData.label || 'Unknown'}
- Task Description: \${taskData.description || 'No description'}

**Available Data:**
- processData: \${JSON.stringify(processData, null, 2)}

**Available Helper Functions:**
You can ONLY use these pre-defined functions:
- updateField(data, field, value) - Update a single field
- getField(data, field) - Get a field value
- mergeData(data, newData) - Merge objects
- addToArray(data, field, item) - Add item to array field
- filterArray(data, field, predicate) - Filter array field
- validateRequired(data, fields) - Validate required fields
- formatString(template, data) - Format string with placeholders
- getCurrentDate() - Get current ISO date
- formatDate(date) - Format date to locale string
- log(...args) - Log messages
\${historicalContext}

**Your Task:**
Fix the script to accomplish the original intent while:
1. Using ONLY the available helper functions (no undefined functions)
2. Working with the processData object
3. Returning a valid result
4. Avoiding the error that occurred
5. Learning from similar past fixes if provided

**Return ONLY the fixed JavaScript code, nothing else. Do not include markdown code blocks or explanations.**\`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const fixedScript = response.content[0].text.trim();
      logger.info('[RuntimeEngine] AI generated new fixed script');

      return {
        script: fixedScript,
        method: 'ai',
        reference: null
      };
    } catch (aiError) {
      logger.error('[RuntimeEngine] AI script recovery failed:', aiError.message);
      return { script: null, method: null };
    }
  }

  /**
   * Execute script task with self-healing and logging
   */
  async executeScriptTask(node, context) {
    const taskData = node.data || {};
    const scriptType = taskData.scriptType || 'javascript';
    const startTime = Date.now();
    const workflowId = context.workflowId || 'unknown';
    const instanceId = context.instanceId || 'unknown';

    if (scriptType.toLowerCase() === 'javascript') {
      const originalScript = taskData.script || 'return { executed: true };';
      const helpers = this.getHelperFunctions();
      let attemptCount = 0;
      let currentScript = originalScript;
      let fixMethod = null;
      let lastError = null;

      // Try up to 3 times: original, cached fix, then AI-generated fix
      while (attemptCount < 3) {
        attemptCount++;

        try {
          logger.info(\`[RuntimeEngine] Script execution attempt \${attemptCount}\`);

          // Create function with processData and helper functions
          const fn = new Function(
            'processData',
            'helpers',
            \`
            // Destructure helpers for easy access
            const {
              updateField, getField, mergeData,
              addToArray, filterArray,
              validateRequired, formatString,
              getCurrentDate, formatDate,
              log
            } = helpers;

            // Execute user script
            \${currentScript}
            \`
          );

          const result = fn(context.data, helpers);
          const executionTime = Date.now() - startTime;

          // Log successful execution
          executionLogDB.logExecution({
            workflowId,
            instanceId,
            nodeId: node.id,
            nodeType: node.type,
            taskLabel: taskData.label,
            status: attemptCount > 1 ? 'fixed' : 'success',
            originalScript,
            fixedScript: attemptCount > 1 ? currentScript : null,
            fixMethod,
            executionTime,
            retryCount: attemptCount - 1
          });

          // If this was a successful fix, store it for future reference
          if (attemptCount > 1 && fixMethod) {
            executionLogDB.storeFix({
              errorType: lastError.name || 'Error',
              errorMessage: lastError.message,
              originalScript,
              fixedScript: currentScript,
              taskContext: {
                label: taskData.label,
                description: taskData.description
              }
            });

            logger.info(\`[RuntimeEngine] ✓ \${fixMethod === 'cached' ? 'Cached' : 'AI'} fix executed successfully!\`);
          }

          return result;
        } catch (error) {
          logger.error(\`[RuntimeEngine] Script execution attempt \${attemptCount} failed:\`, error.message);
          lastError = error;

          // If first attempt failed and AI/cache is available, try to fix it
          if (attemptCount === 1) {
            const fixResult = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              context.data,
              workflowId
            );

            if (fixResult.script) {
              currentScript = fixResult.script;
              fixMethod = fixResult.method;
              logger.info(\`[RuntimeEngine] Retrying with \${fixMethod} fix...\`);
              continue; // Try again with fixed script
            }
          }

          // If second attempt failed with cached fix, try AI generation
          if (attemptCount === 2 && fixMethod === 'cached') {
            logger.info('[RuntimeEngine] Cached fix failed, trying AI generation...');
            const fixResult = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              context.data,
              workflowId
            );

            if (fixResult.script && fixResult.method === 'ai') {
              currentScript = fixResult.script;
              fixMethod = 'ai';
              logger.info('[RuntimeEngine] Retrying with AI-generated fix...');
              continue; // Try again
            }
          }

          // Log failed execution
          const executionTime = Date.now() - startTime;
          executionLogDB.logExecution({
            workflowId,
            instanceId,
            nodeId: node.id,
            nodeType: node.type,
            taskLabel: taskData.label,
            status: 'failed',
            error: error.message,
            originalScript,
            fixedScript: attemptCount > 1 ? currentScript : null,
            fixMethod,
            executionTime,
            retryCount: attemptCount - 1
          });

          // If we've exhausted attempts, throw error
          throw new Error(\`Script execution failed: \${error.message}\`);
        }
      }
    }

    return { message: \`Script task executed: \${taskData.label}\` };
  }

  initializeNodeExecutors() {
    return {
      startEvent: async (node, context) => {
        logger.info(\`Starting workflow: \${node.id}\`);
        return { status: 'completed', data: context.input || {} };
      },

      endEvent: async (node, context) => {
        logger.info(\`Ending workflow: \${node.id}\`);
        return { status: 'completed', data: context.data };
      },

      userTask: async (node, context) => {
        logger.info(\`User task: \${node.data?.label}\`);
        // User tasks wait for external input
        return { status: 'waiting', data: context.data };
      },

      serviceTask: async (node, context) => {
        logger.info(\`Service task: \${node.data?.label}\`);
        // Execute service task logic
        const result = await this.executeServiceTask(node, context);
        return { status: 'completed', data: result };
      },

      scriptTask: async (node, context) => {
        logger.info(\`Script task: \${node.data?.label}\`);
        // Execute script with self-healing
        const result = await this.executeScriptTask(node, context);
        return { status: 'completed', data: result };
      },

      exclusiveGateway: async (node, context) => {
        logger.info(\`Exclusive gateway: \${node.id}\`);
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      // Platform UI creates decision nodes (alias for exclusiveGateway)
      decision: async (node, context) => {
        logger.info(\`Decision gateway: \${node.id}\`);
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      parallelGateway: async (node, context) => {
        logger.info(\`Parallel gateway: \${node.id}\`);
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      // REST API call node
      restApi: async (node, context) => {
        logger.info(\`REST API call: \${node.data?.label}\`);
        const taskData = node.data || {};
        const headers = taskData.headers ? (typeof taskData.headers === 'string' ? JSON.parse(taskData.headers) : taskData.headers) : {};

        // Handle authentication
        if (taskData.authType === 'bearer' && taskData.authToken) {
          headers['Authorization'] = \`Bearer \${this.interpolateString(taskData.authToken, context.data)}\`;
        } else if (taskData.authType === 'basic' && taskData.authUsername) {
          const credentials = Buffer.from(
            \`\${this.interpolateString(taskData.authUsername, context.data)}:\${this.interpolateString(taskData.authPassword || '', context.data)}\`
          ).toString('base64');
          headers['Authorization'] = \`Basic \${credentials}\`;
        } else if (taskData.authType === 'apiKey' && taskData.apiKeyHeader && taskData.apiKeyValue) {
          headers[taskData.apiKeyHeader] = this.interpolateString(taskData.apiKeyValue, context.data);
        }

        // Handle query params
        let url = taskData.url || '';
        if (taskData.queryParams) {
          try {
            const params = typeof taskData.queryParams === 'string' ? JSON.parse(taskData.queryParams) : taskData.queryParams;
            const qs = Object.entries(params)
              .map(([k, v]) => \`\${encodeURIComponent(k)}=\${encodeURIComponent(this.interpolateString(String(v), context.data))}\`)
              .join('&');
            if (qs) url += (url.includes('?') ? '&' : '?') + qs;
          } catch (e) {}
        }

        const result = await this.executeHttpService({
          url,
          method: taskData.method || 'GET',
          headers,
          body: taskData.body ? (typeof taskData.body === 'string' ? JSON.parse(taskData.body) : taskData.body) : undefined,
          outputVariable: taskData.outputVariable,
          timeout: taskData.timeout || 30000,
          onError: taskData.errorHandling || 'throw'
        }, context);
        return { status: 'completed', data: result };
      },

      // LLM / AI task node
      llmTask: async (node, context) => {
        logger.info(\`LLM task: \${node.data?.label}\`);
        const taskData = node.data || {};
        const prompt = this.interpolateString(taskData.prompt || '', context.data);
        const outputVariable = taskData.outputVariable || 'llmResult';

        try {
          // Use fetch to call the Claude API or configured LLM endpoint
          const model = taskData.model || 'claude-sonnet-4-5-20250514';
          const temperature = parseFloat(taskData.temperature) || 0.7;
          const maxTokens = parseInt(taskData.maxTokens) || 1024;

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            logger.warn('[RuntimeEngine] No ANTHROPIC_API_KEY set, storing prompt as result');
            return {
              status: 'completed',
              data: { ...context.data, [outputVariable]: \`[LLM not configured] Prompt: \${prompt}\` }
            };
          }

          const response = await require('axios').post('https://api.anthropic.com/v1/messages', {
            model,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
          }, {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            timeout: 60000
          });

          const llmResponse = response.data?.content?.[0]?.text || '';
          logger.info(\`[RuntimeEngine] LLM response received (\${llmResponse.length} chars)\`);

          return {
            status: 'completed',
            data: { ...context.data, [outputVariable]: llmResponse }
          };
        } catch (error) {
          logger.error(\`[RuntimeEngine] LLM task failed: \${error.message}\`);
          if (taskData.onError === 'continue') {
            return {
              status: 'completed',
              data: { ...context.data, [outputVariable]: null, _llmError: error.message }
            };
          }
          throw error;
        }
      },

      // Sub-workflow invocation
      subWorkflow: async (node, context) => {
        logger.info(\`Sub-workflow: \${node.data?.label}\`);
        const taskData = node.data || {};
        const targetWorkflowId = taskData.targetWorkflow;
        const isAsync = taskData.executionMode === 'async';

        if (!targetWorkflowId) {
          throw new Error(\`Sub-workflow node \${node.id} has no target workflow configured\`);
        }

        // Build input from mapping
        const subInput = {};
        if (taskData.inputMapping) {
          const mappings = typeof taskData.inputMapping === 'string'
            ? taskData.inputMapping.split('\\n').filter(Boolean)
            : Object.entries(taskData.inputMapping);

          for (const mapping of mappings) {
            if (typeof mapping === 'string') {
              const [target, source] = mapping.split(':').map(s => s.trim());
              if (target && source) {
                subInput[target] = this.getNestedValue(context.data, source) ?? source;
              }
            } else {
              subInput[mapping[0]] = this.getNestedValue(context.data, mapping[1]) ?? mapping[1];
            }
          }
        }

        if (isAsync) {
          // Fire and forget
          this.startWorkflow(targetWorkflowId, { ...context.data, ...subInput }).catch(err => {
            logger.error(\`[RuntimeEngine] Async sub-workflow failed: \${err.message}\`);
          });
          return { status: 'completed', data: context.data };
        }

        // Synchronous execution
        const subInstance = await this.startWorkflow(targetWorkflowId, { ...context.data, ...subInput });

        // Map output back
        const result = { ...context.data };
        if (taskData.outputMapping) {
          const mappings = typeof taskData.outputMapping === 'string'
            ? taskData.outputMapping.split('\\n').filter(Boolean)
            : Object.entries(taskData.outputMapping);

          for (const mapping of mappings) {
            if (typeof mapping === 'string') {
              const [target, source] = mapping.split(':').map(s => s.trim());
              if (target && source) {
                result[target] = this.getNestedValue(subInstance.data, source);
              }
            } else {
              result[mapping[0]] = this.getNestedValue(subInstance.data, mapping[1]);
            }
          }
        }
        result._subWorkflowResult = subInstance.data;

        return { status: 'completed', data: result };
      },

      // Data process node (CRUD operations)
      dataProcess: async (node, context) => {
        logger.info(\`Data process: \${node.data?.label}\`);
        const taskData = node.data || {};
        const operation = taskData.operation || 'read';
        const table = taskData.targetTable || taskData.dataModel;
        const outputVariable = taskData.outputVariable || '_dataResult';

        if (!table && operation !== 'transform') {
          throw new Error(\`Data process node \${node.id}: no target table specified\`);
        }

        const result = await this.executeDatabaseService({
          operation: operation === 'create' ? 'insert' : operation === 'read' ? 'select' : operation,
          table,
          query: taskData.queryFilter ? \`SELECT * FROM \${table} WHERE \${this.interpolateString(taskData.queryFilter, context.data)}\` : undefined,
          data: taskData.fieldMapping ? this.parseFieldMapping(taskData.fieldMapping, context.data) : undefined,
          where: taskData.whereCondition ? this.interpolateString(taskData.whereCondition, context.data) : undefined,
          outputVariable
        }, context);

        return { status: 'completed', data: result };
      },

      // Validation node (rule enforcement)
      validation: async (node, context) => {
        logger.info(\`Validation: \${node.data?.label}\`);
        const taskData = node.data || {};
        const rules = taskData.rules || [];
        const evaluationMode = taskData.evaluationMode || 'all';
        const onFailure = taskData.onFailure || 'block';
        const stopOnFirst = taskData.stopOnFirstFailure !== false;

        const validationResults = [];
        let passedCount = 0;
        let failedCount = 0;

        for (const rule of rules) {
          if (rule.condition) {
            const passed = this.evaluateCondition(rule.condition, context.data);
            const errorMsg = taskData.errorMessage
              ? taskData.errorMessage.replace('{rule.name}', rule.name || rule.id).replace('{rule.message}', rule.errorMessage || '')
              : (rule.errorMessage || \`Validation failed: \${rule.name}\`);
            validationResults.push({
              rule: rule.name || rule.id,
              passed,
              message: passed ? 'Passed' : errorMsg
            });
            if (passed) passedCount++;
            else failedCount++;
            if (!passed && stopOnFirst && evaluationMode === 'all') break;
          }
        }

        // Determine overall pass/fail based on evaluation mode
        let allPassed;
        if (evaluationMode === 'any') {
          allPassed = passedCount > 0 || rules.length === 0;
        } else if (evaluationMode === 'none') {
          allPassed = failedCount === rules.length || rules.length === 0;
        } else {
          allPassed = failedCount === 0;
        }

        const result = {
          ...context.data,
          _validationResults: validationResults,
          _validationPassed: allPassed,
          _evaluationMode: evaluationMode
        };

        if (!allPassed && onFailure === 'block') {
          return { status: 'failed', data: result, error: 'Validation failed' };
        }

        return { status: 'completed', data: result };
      },

      // Notification node
      notification: async (node, context) => {
        logger.info(\`Notification: \${node.data?.label}\`);
        const taskData = node.data || {};
        const channel = taskData.channel || 'email';

        const notification = {
          channel,
          recipient: this.interpolateString(taskData.recipient || '', context.data),
          subject: this.interpolateString(taskData.subject || '', context.data),
          body: this.interpolateString(taskData.message || taskData.messageBody || '', context.data),
          cc: taskData.cc ? this.interpolateString(taskData.cc, context.data) : undefined,
          webhookUrl: taskData.webhookUrl || undefined
        };

        logger.info(\`[RuntimeEngine] Sending \${channel} notification to: \${notification.recipient}\`);

        if (channel === 'email') {
          try {
            const emailService = require('../services/EmailService');
            await emailService.send({
              to: notification.recipient,
              subject: notification.subject,
              body: notification.body,
              cc: notification.cc
            });
          } catch (err) {
            logger.warn(\`[RuntimeEngine] Email send failed (non-blocking): \${err.message}\`);
          }
        } else if (channel === 'webhook' && notification.webhookUrl) {
          try {
            await require('axios').post(notification.webhookUrl, {
              recipient: notification.recipient,
              subject: notification.subject,
              body: notification.body,
              timestamp: new Date().toISOString()
            }, { timeout: 10000 });
          } catch (err) {
            logger.warn(\`[RuntimeEngine] Webhook notification failed (non-blocking): \${err.message}\`);
          }
        }

        return {
          status: 'completed',
          data: {
            ...context.data,
            _lastNotification: {
              ...notification,
              sentAt: new Date().toISOString()
            }
          }
        };
      },

      // Timer event (intermediate wait)
      timerEvent: async (node, context) => {
        logger.info(\`Timer event: \${node.data?.label}\`);
        const taskData = node.data || {};
        const timerType = taskData.timerType || 'duration';

        let waitMs = 0;

        if (timerType === 'duration') {
          const value = parseInt(taskData.durationValue) || 0;
          const unit = taskData.durationUnit || 'minutes';
          const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
          waitMs = value * (multipliers[unit] || 60000);
        } else if (timerType === 'date' && taskData.targetDate) {
          const target = new Date(taskData.targetDate);
          waitMs = Math.max(0, target.getTime() - Date.now());
        }

        if (waitMs > 0 && waitMs <= 300000) {
          // Inline wait for short durations (<=5 minutes)
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else if (waitMs > 300000) {
          // For long timers, schedule a delayed resume and pause the workflow
          const resumeAt = new Date(Date.now() + waitMs);
          logger.info(\`[RuntimeEngine] Timer scheduled for \${resumeAt.toISOString()}, pausing workflow\`);

          // Store timer metadata for resume
          context.data._timerResumeAt = resumeAt.toISOString();
          context.data._timerNodeId = node.id;

          // Schedule the resume using setTimeout (capped at max safe setTimeout ~24.8 days)
          const safeDelay = Math.min(waitMs, 2147483647);
          setTimeout(async () => {
            try {
              const instance = this.instances.get(context.instanceId);
              if (instance && instance.status === 'waiting') {
                logger.info(\`[RuntimeEngine] Timer fired, resuming workflow \${context.instanceId}\`);
                instance.status = 'running';
                instance.data._timerCompleted = new Date().toISOString();
                delete instance.data._timerResumeAt;
                const nextNodeId = this.getNextNode(instance, node.id);
                if (nextNodeId) {
                  await this.executeNode(instance, nextNodeId);
                }
              }
            } catch (err) {
              logger.error(\`[RuntimeEngine] Timer resume failed: \${err.message}\`);
            }
          }, safeDelay);

          return {
            status: 'waiting',
            data: {
              ...context.data,
              _timerScheduled: true,
              _timerResumeAt: resumeAt.toISOString(),
              _timerDuration: waitMs
            }
          };
        }

        return {
          status: 'completed',
          data: {
            ...context.data,
            _timerCompleted: new Date().toISOString(),
            _timerDuration: waitMs
          }
        };
      },

      // Intermediate event (message catch, signal catch, timer boundary)
      intermediateEvent: async (node, context) => {
        logger.info(\`Intermediate event: \${node.data?.label || node.id}\`);
        const taskData = node.data || {};
        const eventType = taskData.eventType || 'message';

        if (eventType === 'timer') {
          const durationMs = this.parseDurationMs(taskData.duration || '1h');
          if (durationMs > 0 && durationMs <= 300000) {
            await new Promise(resolve => setTimeout(resolve, durationMs));
          } else if (durationMs > 300000) {
            // Schedule delayed resume for long intermediate timers
            const resumeAt = new Date(Date.now() + durationMs);
            logger.info(\`[RuntimeEngine] Intermediate timer scheduled for \${resumeAt.toISOString()}\`);
            context.data._timerResumeAt = resumeAt.toISOString();
            const safeDelay = Math.min(durationMs, 2147483647);
            setTimeout(async () => {
              try {
                const instance = this.instances.get(context.instanceId);
                if (instance && instance.status === 'waiting') {
                  instance.status = 'running';
                  delete instance.data._timerResumeAt;
                  const nextNodeId = this.getNextNode(instance, node.id);
                  if (nextNodeId) await this.executeNode(instance, nextNodeId);
                }
              } catch (err) {
                logger.error(\`[RuntimeEngine] Intermediate timer resume failed: \${err.message}\`);
              }
            }, safeDelay);
            return { status: 'waiting', data: { ...context.data, _timerResumeAt: resumeAt.toISOString() } };
          }
        }

        return {
          status: 'completed',
          data: {
            ...context.data,
            _intermediateEvent: { type: eventType, completedAt: new Date().toISOString() }
          }
        };
      },

      // Start event aliases for specialized start types
      startProcess: async (node, context) => {
        logger.info(\`Start process: \${node.id}\`);
        return { status: 'completed', data: context.input || {} };
      },

      timerStartEvent: async (node, context) => {
        logger.info(\`Timer start event: \${node.id} (schedule: \${node.data?.schedule || 'none'})\`);
        return { status: 'completed', data: context.input || {} };
      },

      messageStartEvent: async (node, context) => {
        logger.info(\`Message start event: \${node.id} (channel: \${node.data?.channel || 'none'})\`);
        return { status: 'completed', data: context.input || {} };
      },

      signalStartEvent: async (node, context) => {
        logger.info(\`Signal start event: \${node.id} (signal: \${node.data?.signalName || 'none'})\`);
        return { status: 'completed', data: context.input || {} };
      },

      conditionalStartEvent: async (node, context) => {
        logger.info(\`Conditional start event: \${node.id}\`);
        return { status: 'completed', data: context.input || {} };
      },

      // Inclusive gateway (OR) - activates all branches with matching conditions
      inclusiveGateway: async (node, context) => {
        logger.info(\`Inclusive gateway: \${node.id}\`);
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      // Aliases for backward compatibility
      sendTask: async (node, context) => {
        return this.nodeExecutors.notification(node, context);
      },

      businessRuleTask: async (node, context) => {
        return this.nodeExecutors.validation(node, context);
      }
    };
  }

  // Helper: Parse field mapping string (field: value per line) into object
  parseFieldMapping(mappingStr, data) {
    if (!mappingStr || typeof mappingStr !== 'string') return {};
    const result = {};
    const lines = mappingStr.split('\\n').filter(Boolean);
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        result[key] = this.interpolateString(value, data);
      }
    }
    return result;
  }

  async executeServiceTask(node, context) {
    const taskData = node.data || {};
    const serviceType = taskData.serviceType;

    logger.info(\`[RuntimeEngine] Executing service task: \${serviceType}\`);

    switch (serviceType) {
      case 'http':
        return await this.executeHttpService(taskData, context);
      case 'database':
        return await this.executeDatabaseService(taskData, context);
      case 'email':
        return await this.executeEmailService(taskData, context);
      case 'transform':
        return await this.executeTransformService(taskData, context);
      default:
        logger.warn(\`[RuntimeEngine] Unknown service type: \${serviceType}\`);
        return context.data;
    }
  }

  async executeHttpService(config, context) {
    const axios = require('axios');

    const { url, method = 'GET', headers = {}, body, outputVariable } = config;

    // Interpolate variables in URL and body
    const interpolatedUrl = this.interpolateString(url, context.data);
    const interpolatedBody = body ? this.interpolateObject(body, context.data) : undefined;
    const interpolatedHeaders = this.interpolateObject(headers, context.data);

    try {
      logger.info(\`[RuntimeEngine] HTTP \${method} \${interpolatedUrl}\`);

      const response = await axios({
        method: method.toUpperCase(),
        url: interpolatedUrl,
        headers: interpolatedHeaders,
        data: interpolatedBody,
        timeout: config.timeout || 30000
      });

      // Store response in context
      const result = { ...context.data };
      if (outputVariable) {
        result[outputVariable] = response.data;
      }
      result._lastHttpResponse = {
        status: response.status,
        headers: response.headers,
        data: response.data
      };

      return result;
    } catch (error) {
      logger.error(\`[RuntimeEngine] HTTP request failed: \${error.message}\`);

      if (config.onError === 'continue') {
        return {
          ...context.data,
          _httpError: { message: error.message, code: error.code }
        };
      }
      throw error;
    }
  }

  async executeDatabaseService(config, context) {
    const database = require('../database');

    const { operation, table, query, data: recordData, outputVariable } = config;

    try {
      let result;

      switch (operation) {
        case 'select':
          const selectQuery = this.interpolateString(query || \`SELECT * FROM \${table}\`, context.data);
          result = await database.query(selectQuery);
          break;

        case 'insert':
          const insertData = this.interpolateObject(recordData, context.data);
          const columns = Object.keys(insertData);
          const values = Object.values(insertData);
          const placeholders = values.map((_, i) => \`$\${i + 1}\`).join(', ');
          result = await database.query(
            \`INSERT INTO \${table} (\${columns.join(', ')}) VALUES (\${placeholders}) RETURNING *\`,
            values
          );
          break;

        case 'update':
          const updateData = this.interpolateObject(recordData, context.data);
          const whereClause = this.interpolateString(config.where, context.data);
          const setClause = Object.keys(updateData).map((k, i) => \`\${k} = $\${i + 1}\`).join(', ');
          result = await database.query(
            \`UPDATE \${table} SET \${setClause} WHERE \${whereClause} RETURNING *\`,
            Object.values(updateData)
          );
          break;

        case 'delete':
          const deleteWhere = this.interpolateString(config.where, context.data);
          result = await database.query(\`DELETE FROM \${table} WHERE \${deleteWhere}\`);
          break;

        default:
          const customQuery = this.interpolateString(query, context.data);
          result = await database.query(customQuery);
      }

      const updatedData = { ...context.data };
      if (outputVariable) {
        updatedData[outputVariable] = result.rows;
      }
      updatedData._lastDbResult = result.rows;

      return updatedData;
    } catch (error) {
      logger.error(\`[RuntimeEngine] Database operation failed: \${error.message}\`);
      throw error;
    }
  }

  async executeEmailService(config, context) {
    const emailService = require('../services/EmailService');
    const { to, subject, body, template, variables } = config;

    // Interpolate email fields
    const emailData = {
      to: this.interpolateString(to, context.data),
      subject: this.interpolateString(subject, context.data),
      body: this.interpolateString(body, context.data),
      template,
      variables: { ...context.data, ...(variables || {}) }
    };

    logger.info(\`[RuntimeEngine] Sending email to: \${emailData.to}\`);

    // Use EmailService for actual delivery
    const result = await emailService.send(emailData);

    return {
      ...context.data,
      _lastEmail: {
        ...emailData,
        sentAt: new Date().toISOString(),
        success: result.success,
        emailId: result.emailId,
        provider: result.provider
      }
    };
  }

  async executeTransformService(config, context) {
    const { transformations } = config;

    let result = { ...context.data };

    if (Array.isArray(transformations)) {
      for (const transform of transformations) {
        const { type, source, target, expression } = transform;

        switch (type) {
          case 'copy':
            result[target] = this.getNestedValue(result, source);
            break;

          case 'calculate':
            result[target] = this.evaluateExpression(expression, result);
            break;

          case 'format':
            result[target] = this.interpolateString(expression, result);
            break;

          case 'map':
            const sourceArray = this.getNestedValue(result, source) || [];
            result[target] = sourceArray.map(item =>
              this.interpolateObject(transform.mapTemplate, { ...result, _item: item })
            );
            break;

          default:
            logger.warn(\`[RuntimeEngine] Unknown transform type: \${type}\`);
        }
      }
    }

    return result;
  }

  async evaluateGateway(node, context) {
    const workflow = context.workflow || this.workflows.find(w => w.id === context.workflowId) || {};
    const allEdges = workflow.edges || workflow.connections || [];

    // Find outgoing edges from this gateway
    const outgoing = allEdges.filter(e => e.source === node.id);

    if (outgoing.length === 0) {
      logger.warn(\`[RuntimeEngine] Gateway \${node.id} has no outgoing edges\`);
      return null;
    }

    const gatewayType = node.data?.gatewayType || 'exclusive';
    const isExclusive = node.type === 'exclusiveGateway' || node.type === 'decision' || gatewayType === 'exclusive';
    const isParallel = node.type === 'parallelGateway' || gatewayType === 'parallel';

    // For exclusive/decision gateway, evaluate conditions in order
    if (isExclusive) {
      for (const edge of outgoing) {
        const condition = edge.condition || edge.data?.condition;
        const isDefault = edge.isDefault || edge.data?.isDefault;

        // Skip default path and edges without conditions
        if (isDefault || !condition) {
          continue;
        }

        if (this.evaluateCondition(condition, context.data)) {
          logger.info(\`[RuntimeEngine] Gateway condition matched: \${condition}\`);
          return edge.target;
        }
      }

      // If no conditions matched, use default path
      const defaultEdge = outgoing.find(e => e.isDefault || e.data?.isDefault);

      if (defaultEdge) {
        logger.info(\`[RuntimeEngine] Using default gateway path\`);
        return defaultEdge.target;
      }

      // Fallback to first edge without a condition (implicit default)
      const implicitDefault = outgoing.find(e => !(e.condition || e.data?.condition));
      if (implicitDefault) {
        return implicitDefault.target;
      }

      // Last resort: first edge
      return outgoing[0]?.target;
    }

    // For parallel gateway, return all targets (execute all branches)
    if (isParallel) {
      return outgoing.map(e => e.target);
    }

    // For inclusive gateway, evaluate ALL conditions and activate all matching branches
    const isInclusive = node.type === 'inclusiveGateway' || gatewayType === 'inclusive';
    if (isInclusive) {
      const matchedTargets = [];
      for (const edge of outgoing) {
        const condition = edge.condition || edge.data?.condition;
        const isDefault = edge.isDefault || edge.data?.isDefault;
        if (isDefault) continue;
        if (!condition || this.evaluateCondition(condition, context.data)) {
          matchedTargets.push(edge.target);
        }
      }
      // If no conditions matched, use default path
      if (matchedTargets.length === 0) {
        const defaultEdge = outgoing.find(e => e.isDefault || e.data?.isDefault);
        if (defaultEdge) return defaultEdge.target;
        return outgoing[0]?.target;
      }
      // If only one matched, return single target; if multiple, return array for parallel execution
      return matchedTargets.length === 1 ? matchedTargets[0] : matchedTargets;
    }

    return outgoing[0]?.target;
  }

  evaluateCondition(condition, data) {
    try {
      // Replace {{var}} and \${var} with actual values
      let expr = condition
        .replace(/\\{\\{([^}]+)\\}\\}/g, (match, varName) => {
          const value = this.getNestedValue(data, varName.trim());
          return JSON.stringify(value);
        })
        .replace(/\\$\\{([^}]+)\\}/g, (match, varName) => {
          const value = this.getNestedValue(data, varName.trim());
          return JSON.stringify(value);
        });

      // Evaluate with data as context
      // Supports both "data.field" format (from platform UI) and direct "field" format
      const fn = new Function('data', \`
        try { return \${expr}; } catch(e) {
          try { with(data) { return \${expr}; } } catch(e2) { return false; }
        }
      \`);
      return fn(data || {});
    } catch (error) {
      logger.error(\`[RuntimeEngine] Condition evaluation failed: \${error.message}\`);
      return false;
    }
  }

  // Helper: Interpolate string with {{var}} syntax
  interpolateString(str, data) {
    if (typeof str !== 'string') return str;
    return str.replace(/\\{\\{([^}]+)\\}\\}/g, (match, varName) => {
      const value = this.getNestedValue(data, varName.trim());
      return value !== undefined ? value : match;
    });
  }

  // Helper: Interpolate object values
  interpolateObject(obj, data) {
    if (!obj || typeof obj !== 'object') return obj;

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateString(value, data);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value, data);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // Helper: Get nested value from object
  getNestedValue(obj, path) {
    if (!path || !obj) return undefined;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    return value;
  }

  // Helper: Evaluate simple expression
  evaluateExpression(expr, data) {
    try {
      const interpolated = this.interpolateString(expr, data);
      return new Function('data', \`with(data) { return \${interpolated}; }\`)(data);
    } catch (error) {
      logger.error(\`[RuntimeEngine] Expression evaluation failed: \${error.message}\`);
      return null;
    }
  }

  parseDurationMs(duration) {
    if (!duration) return 3600000;
    const match = duration.match(/^(\\d+)(ms|s|m|h|d)?$/);
    if (!match) return 3600000;
    const val = parseInt(match[1]);
    const unit = match[2] || 'h';
    const multipliers = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return val * (multipliers[unit] || 3600000);
  }

  async startWorkflow(workflowId, input = {}) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(\`Workflow not found: \${workflowId}\`);
    }

    const instance = new WorkflowInstance({
      workflowId,
      workflow,
      input
    });

    // Store in memory for quick access during execution
    this.instances.set(instance.id, instance);

    // Persist to database
    await this.persistInstance(instance);

    logger.info(\`Started workflow instance: \${instance.id}\`);

    // Execute workflow
    await this.executeWorkflow(instance);

    // Build navigation info for the initial page
    let navigation = {
      initialPageId: null,
      currentTaskId: null,
      workflowComplete: instance.status === 'completed'
    };

    // Get the current node to extract navigation info
    if (instance.currentNodeId) {
      const currentNode = workflow.nodes.find(n => n.id === instance.currentNodeId);
      if (currentNode) {
        navigation.initialPageId = currentNode.data?.pageId || currentNode.data?.displayPageId || null;
        navigation.currentTaskId = instance.status === 'waiting' ? instance.currentNodeId : null;
      }
    }

    // Attach navigation to instance for the API response
    instance.navigation = navigation;

    return instance;
  }

  async persistInstance(instance) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return; // Skip if database is disabled
      }

      await database.query(\`
        INSERT INTO workflow_instances (id, workflow_id, status, input, data, current_node_id, created_at, updated_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          data = EXCLUDED.data,
          current_node_id = EXCLUDED.current_node_id,
          updated_at = NOW(),
          completed_at = EXCLUDED.completed_at
      \`, [
        instance.id,
        instance.workflowId,
        instance.status,
        JSON.stringify(instance.input),
        JSON.stringify(instance.data),
        instance.currentNodeId,
        instance.createdAt,
        new Date(),
        instance.completedAt
      ]);
    } catch (error) {
      logger.error(\`Failed to persist instance \${instance.id}:\`, error.message);
      // Don't throw - allow workflow to continue even if persistence fails
    }
  }

  async loadInstanceFromDB(instanceId) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return null;
      }

      const result = await database.query(
        'SELECT * FROM workflow_instances WHERE id = $1',
        [instanceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const workflow = this.workflows.find(w => w.id === row.workflow_id);

      return new WorkflowInstance({
        id: row.id,
        workflowId: row.workflow_id,
        workflow: workflow,
        status: row.status,
        input: row.input,
        data: row.data,
        currentNodeId: row.current_node_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at
      });
    } catch (error) {
      logger.error(\`Failed to load instance \${instanceId}:\`, error.message);
      return null;
    }
  }

  async recordWorkflowHistory(instance, nodeId, action, data) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return;
      }

      await database.query(\`
        INSERT INTO workflow_history (instance_id, node_id, action, data, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      \`, [instance.id, nodeId, action, JSON.stringify(data)]);
    } catch (error) {
      logger.error(\`Failed to record history for \${instance.id}:\`, error.message);
    }
  }

  async executeWorkflow(instance) {
    const startTypes = ['startEvent', 'startProcess', 'timerStartEvent', 'messageStartEvent', 'signalStartEvent', 'conditionalStartEvent'];
    const startNode = instance.workflow.nodes.find(n => startTypes.includes(n.type));
    if (!startNode) {
      throw new Error('No start event found');
    }

    instance.status = 'running';
    await this.executeNode(instance, startNode.id);
  }

  async executeNode(instance, nodeId) {
    const node = instance.workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      logger.error(\`Node not found: \${nodeId}\`);
      return;
    }

    instance.currentNodeId = nodeId;
    instance.updatedAt = new Date();

    const executor = this.nodeExecutors[node.type];
    if (!executor) {
      logger.error(\`No executor for node type: \${node.type}\`);
      return;
    }

    // Add workflow and instance IDs to context for logging
    const context = {
      data: instance.data,
      input: instance.input,
      workflowId: instance.workflowId,
      instanceId: instance.id,
      workflow: instance.workflow
    };

    // Record node entry in history
    await this.recordWorkflowHistory(instance, nodeId, 'enter', { nodeType: node.type });

    try {
      const result = await executor(node, context);

      // Record node completion in history
      await this.recordWorkflowHistory(instance, nodeId, result.status, { data: result.data });

      if (result.status === 'completed') {
        instance.data = result.data;

        // Persist state after node completion
        await this.persistInstance(instance);

        // Find next node(s) - may be array for parallel/inclusive gateways
        const nextNodeId = result.nextNode || this.getNextNode(instance, nodeId);

        if (nextNodeId) {
          // Handle parallel execution (array of next nodes from parallel/inclusive gateways)
          if (Array.isArray(nextNodeId)) {
            logger.info(\`[RuntimeEngine] Parallel execution: \${nextNodeId.length} branches from \${nodeId}\`);
            // Execute all branches concurrently
            const branchResults = await Promise.allSettled(
              nextNodeId.map(branchNodeId => this.executeNode(instance, branchNodeId))
            );
            // Log any failed branches
            branchResults.forEach((result, i) => {
              if (result.status === 'rejected') {
                logger.error(\`[RuntimeEngine] Branch \${nextNodeId[i]} failed: \${result.reason?.message}\`);
              }
            });
          } else {
            await this.executeNode(instance, nextNodeId);
          }
        } else {
          // Workflow complete
          instance.status = 'completed';
          instance.completedAt = new Date();
          await this.persistInstance(instance);
          logger.info(\`Workflow instance completed: \${instance.id}\`);
        }
      } else if (result.status === 'waiting') {
        instance.status = 'waiting';
        await this.persistInstance(instance);
        logger.info(\`Workflow instance waiting: \${instance.id}\`);
      }
    } catch (error) {
      // Record error in history
      await this.recordWorkflowHistory(instance, nodeId, 'error', { error: error.message });

      instance.status = 'failed';
      instance.data = { ...instance.data, _error: error.message };
      await this.persistInstance(instance);

      logger.error(\`Workflow instance \${instance.id} failed at node \${nodeId}: \${error.message}\`);
      throw error;
    }
  }

  getNextNode(instance, currentNodeId) {
    const connections = instance.workflow.connections || instance.workflow.edges || [];
    const outgoing = connections.filter(c => c.source === currentNodeId);

    // Single outgoing edge: straightforward
    if (outgoing.length <= 1) {
      return outgoing[0]?.target;
    }

    // Multiple outgoing edges from a non-gateway node: take first
    // (Gateway nodes handle their own routing via evaluateGateway)
    return outgoing[0]?.target;
  }

  async resumeWorkflow(instanceId, data) {
    let instance = this.instances.get(instanceId);

    // Try to load from database if not in memory
    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    if (!instance) {
      throw new Error(\`Instance not found: \${instanceId}\`);
    }

    instance.data = { ...instance.data, ...data };
    instance.updatedAt = new Date();

    // Persist updated state
    await this.persistInstance(instance);

    await this.executeNode(instance, instance.currentNodeId);
  }

  async completeTask(instanceId, taskData) {
    let instance = this.instances.get(instanceId);

    // Try to load from database if not in memory
    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    if (!instance) {
      throw new Error(\`Instance not found: \${instanceId}\`);
    }

    // Merge task data into instance data
    const { taskId, ...formData } = taskData;
    instance.data = { ...instance.data, ...formData };
    instance.updatedAt = new Date();

    // Record task completion
    await this.recordWorkflowHistory(instance, instance.currentNodeId, 'task_completed', { taskId, formData });

    // Persist updated state
    await this.persistInstance(instance);

    // Find the next node to execute
    const nextNodeId = this.getNextNode(instance, instance.currentNodeId);

    // Navigation info for the response
    let navigation = {
      workflowComplete: false,
      nextPageId: null,
      nextTaskId: null,
      currentNodeId: instance.currentNodeId
    };

    if (nextNodeId) {
      // Execute the next node
      await this.executeNode(instance, nextNodeId);

      // Get the current node after execution to determine navigation
      const currentNode = instance.workflow.nodes.find(n => n.id === instance.currentNodeId);
      if (currentNode) {
        // Extract navigation from node data
        navigation.nextPageId = currentNode.data?.pageId || currentNode.data?.displayPageId || null;
        navigation.nextTaskId = instance.status === 'waiting' ? instance.currentNodeId : null;
      }
    } else {
      // Workflow complete
      instance.status = 'completed';
      instance.completedAt = new Date();
      await this.persistInstance(instance);
      navigation.workflowComplete = true;
    }

    return {
      instance: instance,
      navigation: navigation
    };
  }

  async claimTask(instanceId, taskId, userId) {
    let instance = this.instances.get(instanceId);

    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    if (!instance) {
      throw new Error(\`Instance not found: \${instanceId}\`);
    }

    // Record task claim
    instance.data = { ...instance.data, _claimedBy: userId, _claimedAt: new Date() };
    instance.updatedAt = new Date();

    await this.recordWorkflowHistory(instance, taskId, 'task_claimed', { userId });
    await this.persistInstance(instance);

    return instance;
  }

  async getInstance(instanceId) {
    // Check memory first
    let instance = this.instances.get(instanceId);

    // Fallback to database
    if (!instance) {
      instance = await this.loadInstanceFromDB(instanceId);
      if (instance) {
        this.instances.set(instanceId, instance);
      }
    }

    return instance;
  }

  async getAllInstances(filters = {}) {
    try {
      const database = require('../database');
      const config = require('../config');

      if (!config.database.enabled) {
        return Array.from(this.instances.values());
      }

      let query = 'SELECT * FROM workflow_instances';
      const params = [];
      const conditions = [];

      if (filters.status) {
        params.push(filters.status);
        conditions.push(\`status = $\${params.length}\`);
      }

      if (filters.workflowId) {
        params.push(filters.workflowId);
        conditions.push(\`workflow_id = $\${params.length}\`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        params.push(filters.limit);
        query += \` LIMIT $\${params.length}\`;
      }

      const result = await database.query(query, params);

      return result.rows.map(row => {
        const workflow = this.workflows.find(w => w.id === row.workflow_id);
        return new WorkflowInstance({
          id: row.id,
          workflowId: row.workflow_id,
          workflow: workflow,
          status: row.status,
          input: row.input,
          data: row.data,
          currentNodeId: row.current_node_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          completedAt: row.completed_at
        });
      });
    } catch (error) {
      logger.error('Failed to get all instances:', error.message);
      return Array.from(this.instances.values());
    }
  }

  async getInstancesByStatus(status) {
    return this.getAllInstances({ status });
  }

  async getInstancesByWorkflow(workflowId) {
    return this.getAllInstances({ workflowId });
  }
}

module.exports = new RuntimeEngine();
`;

    const filePath = path.join(this.outputPath, 'src/runtime/engine.js');
    await fs.writeFile(filePath, runtimeEngine);
    return 'runtime/engine.js';
  }

  async generateAPIRoutes() {
    const appName = this.application.name || 'App';
    const apiRoutes = `/**
 * API Routes for Workflow Management
 * Includes: RBAC, Auth, File Management, PDF Export, Aggregation
 */

const express = require('express');
const router = express.Router();
const runtimeEngine = require('../runtime/engine');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'app-secret-change-in-production';

// ===========================================================================
// AUTH MIDDLEWARE (RBAC)
// ===========================================================================

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (roles.length === 0) return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

// ===========================================================================
// AUTH ROUTES
// ===========================================================================

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const database = require('../database');
    // Check if user exists
    const existing = await database.query('SELECT id FROM users WHERE email = $1', [email]).catch(() => ({ rows: [] }));
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'User already exists' });
    }
    const userId = uuidv4();
    await database.query(
      'INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [userId, email, hashedPassword, name || email.split('@')[0], role || 'user']
    );
    const token = jwt.sign({ id: userId, email, name: name || email.split('@')[0], role: role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: userId, email, name: name || email.split('@')[0], role: role || 'user' } });
  } catch (error) {
    logger.error('Registration failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const database = require('../database');
    const result = await database.query('SELECT * FROM users WHERE email = $1', [email]).catch(() => ({ rows: [] }));
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/auth/profile', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

router.post('/auth/forgot-password', async (req, res) => {
  // In production, send email with reset token
  res.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
});

router.post('/auth/refresh', authMiddleware, (req, res) => {
  const token = jwt.sign({ id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

// ===========================================================================
// OAUTH ROUTES (Google, GitHub)
// ===========================================================================

let passport;
try {
  passport = require('passport');
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  const GitHubStrategy = require('passport-github2').Strategy;

  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const database = require('../database');
        const email = profile.emails?.[0]?.value;
        let result = await database.query('SELECT * FROM users WHERE email = $1', [email]).catch(() => ({ rows: [] }));
        if (result.rows.length === 0) {
          const userId = uuidv4();
          await database.query(
            'INSERT INTO users (id, email, name, role, oauth_provider, oauth_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [userId, email, profile.displayName, 'user', 'google', profile.id]
          );
          result = await database.query('SELECT * FROM users WHERE id = $1', [userId]);
        }
        done(null, result.rows[0]);
      } catch (err) { done(err); }
    }));
  }

  if (process.env.GITHUB_CLIENT_ID) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const database = require('../database');
        const email = profile.emails?.[0]?.value || profile.username + '@github.local';
        let result = await database.query('SELECT * FROM users WHERE email = $1', [email]).catch(() => ({ rows: [] }));
        if (result.rows.length === 0) {
          const userId = uuidv4();
          await database.query(
            'INSERT INTO users (id, email, name, role, oauth_provider, oauth_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [userId, email, profile.displayName || profile.username, 'user', 'github', profile.id]
          );
          result = await database.query('SELECT * FROM users WHERE id = $1', [userId]);
        }
        done(null, result.rows[0]);
      } catch (err) { done(err); }
    }));
  }

  // OAuth callback handler
  const oauthCallback = (provider) => (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.redirect(\`/?token=\${token}\`);
  };

  if (process.env.GOOGLE_CLIENT_ID) {
    router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
    router.get('/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), oauthCallback('google'));
  }

  if (process.env.GITHUB_CLIENT_ID) {
    router.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
    router.get('/auth/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login' }), oauthCallback('github'));
  }
} catch (e) {
  logger.info('OAuth dependencies not available, OAuth routes disabled');
}

// ===========================================================================
// FILE MANAGEMENT ROUTES
// ===========================================================================

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const database = require('../database');
    const fileId = uuidv4();
    await database.query(
      'INSERT INTO files (id, original_name, stored_name, mime_type, size, uploaded_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [fileId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user?.id || 'anonymous']
    ).catch(() => {});
    res.json({
      success: true,
      file: { id: fileId, name: req.file.originalname, storedName: req.file.filename, mimeType: req.file.mimetype, size: req.file.size, url: \`/api/files/\${fileId}\` }
    });
  } catch (error) {
    logger.error('File upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/files/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    const files = (req.files || []).map(f => ({
      id: uuidv4(), name: f.originalname, storedName: f.filename, mimeType: f.mimetype, size: f.size, url: \`/api/files/\${f.filename}\`
    }));
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/files/:id', async (req, res) => {
  try {
    const database = require('../database');
    const result = await database.query('SELECT * FROM files WHERE id = $1', [req.params.id]).catch(() => ({ rows: [] }));
    if (result.rows.length === 0) {
      // Try direct file lookup
      const filePath = path.join(uploadDir, req.params.id);
      if (fs.existsSync(filePath)) return res.sendFile(filePath);
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const file = result.rows[0];
    res.sendFile(path.join(uploadDir, file.stored_name));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/files', async (req, res) => {
  try {
    const database = require('../database');
    const result = await database.query('SELECT * FROM files ORDER BY created_at DESC').catch(() => ({ rows: [] }));
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/files/:id', async (req, res) => {
  try {
    const database = require('../database');
    const result = await database.query('SELECT * FROM files WHERE id = $1', [req.params.id]).catch(() => ({ rows: [] }));
    if (result.rows.length > 0) {
      const filePath = path.join(uploadDir, result.rows[0].stored_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await database.query('DELETE FROM files WHERE id = $1', [req.params.id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================================================
// PDF EXPORT ROUTES
// ===========================================================================

router.get('/export/:model/pdf', async (req, res) => {
  try {
    const database = require('../database');
    const tableName = toSnakeCase(req.params.model);
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    const result = await database.query(\`SELECT * FROM \${tableName} ORDER BY created_at DESC LIMIT \${limit}\`);

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename=\${req.params.model}-export.pdf\`);
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const modelTitle = req.params.model.charAt(0).toUpperCase() + req.params.model.slice(1);
    let pageNum = 1;

    // --- Header bar ---
    const drawHeader = () => {
      doc.save();
      doc.rect(0, 0, pageWidth, 70).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('${appName}', 50, 18);
      doc.fontSize(10).font('Helvetica').text(\`\${modelTitle} Report\`, 50, 42);
      doc.restore();
      doc.fillColor('#000000');
      doc.y = 85;
    };

    // --- Footer ---
    const drawFooter = (pg) => {
      doc.save();
      doc.moveTo(50, doc.page.height - 45).lineTo(pageWidth - 50, doc.page.height - 45).stroke('#e2e8f0');
      doc.fontSize(7).fillColor('#94a3b8')
        .text(\`Generated: \${new Date().toLocaleString()}\`, 50, doc.page.height - 35)
        .text(\`Page \${pg}\`, pageWidth - 100, doc.page.height - 35, { width: 50, align: 'right' });
      doc.restore();
      doc.fillColor('#000000');
    };

    drawHeader();

    // Summary line
    doc.fontSize(10).fillColor('#475569').text(\`\${result.rows.length} record(s) exported on \${new Date().toLocaleDateString()}\`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    if (result.rows.length > 0) {
      const columns = Object.keys(result.rows[0]).filter(c => c !== 'password_hash' && c !== 'password');
      const displayCols = columns.slice(0, 6);
      const colWidth = contentWidth / displayCols.length;
      const rowHeight = 18;

      // --- Table header row ---
      const drawTableHeader = () => {
        const y = doc.y;
        doc.save();
        doc.rect(50, y, contentWidth, rowHeight + 4).fill('#f1f5f9');
        doc.fillColor('#334155').fontSize(7).font('Helvetica-Bold');
        displayCols.forEach((col, i) => {
          doc.text(col.replace(/_/g, ' ').toUpperCase(), 54 + i * colWidth, y + 4, { width: colWidth - 8, lineBreak: false });
        });
        doc.restore();
        doc.fillColor('#000000');
        doc.y = y + rowHeight + 4;
        // Separator line
        doc.moveTo(50, doc.y).lineTo(50 + contentWidth, doc.y).stroke('#cbd5e1');
        doc.y += 2;
      };

      drawTableHeader();

      // --- Table rows ---
      result.rows.forEach((row, rowIndex) => {
        // Page break check
        if (doc.y > doc.page.height - 70) {
          drawFooter(pageNum);
          doc.addPage();
          pageNum++;
          drawHeader();
          drawTableHeader();
        }

        const y = doc.y;
        // Alternating row background
        if (rowIndex % 2 === 0) {
          doc.save();
          doc.rect(50, y - 1, contentWidth, rowHeight).fill('#fafafa');
          doc.restore();
          doc.fillColor('#000000');
        }

        doc.font('Helvetica').fontSize(7).fillColor('#1e293b');
        displayCols.forEach((col, i) => {
          let val = row[col];
          if (val === null || val === undefined) val = '-';
          else if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
          else if (typeof val === 'object') val = JSON.stringify(val).substring(0, 35);
          else val = String(val).substring(0, 35);
          doc.text(val, 54 + i * colWidth, y + 3, { width: colWidth - 8, lineBreak: false });
        });
        doc.y = y + rowHeight;
      });

      // Summary bar at bottom of table
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(50 + contentWidth, doc.y).stroke('#cbd5e1');
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#475569').font('Helvetica-Bold')
        .text(\`Total: \${result.rows.length} record(s)\`, 50)
        .text(columns.length > 6 ? \`Showing \${displayCols.length} of \${columns.length} columns\` : '', { align: 'right' });
      doc.fillColor('#000000');
    } else {
      doc.moveDown(4);
      doc.fontSize(14).fillColor('#94a3b8').text('No records found.', { align: 'center' });
      doc.fillColor('#000000');
    }

    drawFooter(pageNum);
    doc.end();
  } catch (error) {
    logger.error('PDF export failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single-record PDF export with formatted layout
router.get('/export/:model/:id/pdf', async (req, res) => {
  try {
    const database = require('../database');
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(\`SELECT * FROM \${tableName} WHERE id = $1\`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const record = result.rows[0];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename=\${req.params.model}-\${req.params.id}.pdf\`);
    doc.pipe(res);

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(22).text('${appName}', 50, 25, { align: 'left' });
    doc.fontSize(10).text(\`\${req.params.model.charAt(0).toUpperCase() + req.params.model.slice(1)} Record\`, 50, 52, { align: 'left' });
    doc.fillColor('#000000');

    doc.moveDown(3);

    // Record title
    const displayTitle = record.name || record.title || record.subject || \`\${req.params.model} #\${record.id}\`;
    doc.fontSize(18).font('Helvetica-Bold').text(displayTitle);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(\`Generated: \${new Date().toLocaleString()}  |  ID: \${record.id}\`);
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    // Draw separator
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#e2e8f0');
    doc.moveDown(1);

    // Field-value pairs in two-column layout
    const fields = Object.keys(record).filter(k => k !== 'password_hash' && k !== 'password');
    const labelWidth = 150;
    const valueWidth = doc.page.width - 100 - labelWidth;

    fields.forEach((field, i) => {
      if (doc.y > doc.page.height - 80) { doc.addPage(); }
      const y = doc.y;
      const label = field.replace(/_/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase());
      let value = record[field];
      if (value === null || value === undefined) value = '-';
      else if (typeof value === 'object') value = JSON.stringify(value, null, 2);
      else if (typeof value === 'boolean') value = value ? 'Yes' : 'No';
      else value = String(value);

      // Alternating row background
      if (i % 2 === 0) {
        doc.rect(45, y - 3, doc.page.width - 90, 20).fill('#f8fafc');
        doc.fillColor('#000000');
      }

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text(label, 50, y, { width: labelWidth });
      doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(value.substring(0, 200), 50 + labelWidth, y, { width: valueWidth });
      doc.moveDown(0.8);
    });

    // Footer
    doc.fontSize(7).fillColor('#94a3b8').text('${appName}', 50, doc.page.height - 40, { align: 'center' });
    doc.end();
  } catch (error) {
    logger.error('Single-record PDF export failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================================================
// DATA AGGREGATION ROUTES
// ===========================================================================

router.get('/data/:model/aggregate', async (req, res) => {
  try {
    const database = require('../database');
    const tableName = toSnakeCase(req.params.model);
    const { groupBy, sum, count, avg, min, max } = req.query;

    let selectParts = [];
    let groupByClause = '';

    if (groupBy) {
      const groupCol = toSnakeCase(groupBy);
      selectParts.push(\`\${groupCol} as group_key\`);
      groupByClause = \`GROUP BY \${groupCol}\`;
    }

    if (count) selectParts.push(\`COUNT(*) as count\`);
    else selectParts.push('COUNT(*) as count');
    if (sum) selectParts.push(\`SUM(\${toSnakeCase(sum)}) as sum\`);
    if (avg) selectParts.push(\`AVG(\${toSnakeCase(avg)}) as average\`);
    if (min) selectParts.push(\`MIN(\${toSnakeCase(min)}) as minimum\`);
    if (max) selectParts.push(\`MAX(\${toSnakeCase(max)}) as maximum\`);

    const sql = \`SELECT \${selectParts.join(', ')} FROM \${tableName} \${groupByClause} ORDER BY count DESC LIMIT 100\`;
    const result = await database.query(sql);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Aggregation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================================================
// PAYMENT ROUTES (Stripe)
// ===========================================================================

let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    router.post('/payments/create-checkout', authMiddleware, async (req, res) => {
      try {
        const { items, successUrl, cancelUrl } = req.body;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: items.map(item => ({
            price_data: {
              currency: item.currency || 'usd',
              product_data: { name: item.name },
              unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity || 1
          })),
          mode: 'payment',
          success_url: successUrl || \`\${req.protocol}://\${req.get('host')}/payment-success\`,
          cancel_url: cancelUrl || \`\${req.protocol}://\${req.get('host')}/payment-cancel\`
        });
        res.json({ success: true, sessionId: session.id, url: session.url });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    router.post('/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
      const sig = req.headers['stripe-signature'];
      try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        if (event.type === 'checkout.session.completed') {
          logger.info('Payment completed:', event.data.object.id);
        }
        res.json({ received: true });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });
  }
} catch (e) {
  logger.info('Stripe not configured, payment routes disabled');
}

// ===========================================================================
// MULTI-TENANCY MANAGEMENT ROUTES
// ===========================================================================

// Create a new tenant (authenticated users)
router.post('/tenants', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    const { name, domain, settings } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Tenant name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const tenantId = uuidv4();

    // Check slug uniqueness
    const existing = await database.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Tenant with this name already exists' });
    }

    await database.query(
      'INSERT INTO tenants (id, name, slug, domain, owner_id, settings, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [tenantId, name, slug, domain || null, req.user?.id || 'system', JSON.stringify(settings || {})]
    );

    // Add creator as admin member
    if (req.user?.id) {
      await database.query(
        'INSERT INTO tenant_members (id, tenant_id, user_id, role) VALUES ($1, $2, $3, $4)',
        [uuidv4(), tenantId, req.user.id, 'admin']
      );
      // Update user's tenant_id
      await database.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [tenantId, req.user.id]);
    }

    res.status(201).json({ success: true, tenant: { id: tenantId, name, slug, domain } });
  } catch (error) {
    logger.error('Create tenant failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List tenants (admin: all, regular user: their memberships)
router.get('/tenants', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    let result;
    if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
      result = await database.query('SELECT id, name, slug, domain, plan, is_active, created_at FROM tenants ORDER BY created_at DESC');
    } else {
      result = await database.query(
        \`SELECT t.id, t.name, t.slug, t.domain, t.plan, t.is_active, tm.role as member_role, t.created_at
         FROM tenants t
         JOIN tenant_members tm ON tm.tenant_id = t.id
         WHERE tm.user_id = $1
         ORDER BY t.created_at DESC\`,
        [req.user?.id]
      );
    }
    res.json({ success: true, tenants: result.rows });
  } catch (error) {
    logger.error('List tenants failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single tenant
router.get('/tenants/:tenantId', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    const result = await database.query(
      'SELECT id, name, slug, domain, plan, settings, is_active, created_at FROM tenants WHERE id = $1',
      [req.params.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

    // Get member count
    const members = await database.query(
      'SELECT COUNT(*) as count FROM tenant_members WHERE tenant_id = $1',
      [req.params.tenantId]
    );
    const tenant = result.rows[0];
    tenant.memberCount = parseInt(members.rows[0].count);

    res.json({ success: true, tenant });
  } catch (error) {
    logger.error('Get tenant failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update tenant (owner/admin only)
router.put('/tenants/:tenantId', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    const { name, domain, settings, plan, is_active } = req.body;

    // Verify ownership or admin role
    const tenant = await database.query('SELECT owner_id FROM tenants WHERE id = $1', [req.params.tenantId]);
    if (tenant.rows.length === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const isOwner = tenant.rows[0].owner_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Only tenant owner or admin can update' });
    }

    const updates = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { updates.push(\`name = $\${idx++}\`); values.push(name); }
    if (domain !== undefined) { updates.push(\`domain = $\${idx++}\`); values.push(domain); }
    if (settings !== undefined) { updates.push(\`settings = $\${idx++}\`); values.push(JSON.stringify(settings)); }
    if (plan !== undefined && isAdmin) { updates.push(\`plan = $\${idx++}\`); values.push(plan); }
    if (is_active !== undefined && isAdmin) { updates.push(\`is_active = $\${idx++}\`); values.push(is_active); }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    updates.push(\`updated_at = NOW()\`);
    values.push(req.params.tenantId);
    await database.query(\`UPDATE tenants SET \${updates.join(', ')} WHERE id = $\${idx}\`, values);

    res.json({ success: true, message: 'Tenant updated' });
  } catch (error) {
    logger.error('Update tenant failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete tenant (owner or superadmin only)
router.delete('/tenants/:tenantId', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    const tenant = await database.query('SELECT owner_id FROM tenants WHERE id = $1', [req.params.tenantId]);
    if (tenant.rows.length === 0) return res.status(404).json({ success: false, error: 'Tenant not found' });

    const isOwner = tenant.rows[0].owner_id === req.user?.id;
    const isSuperAdmin = req.user?.role === 'superadmin';
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Only tenant owner or superadmin can delete' });
    }

    // Soft delete: deactivate instead of hard delete
    await database.query('UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.tenantId]);
    res.json({ success: true, message: 'Tenant deactivated' });
  } catch (error) {
    logger.error('Delete tenant failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add member to tenant
router.post('/tenants/:tenantId/members', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    // Verify caller has admin role in this tenant
    const membership = await database.query(
      'SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
      [req.params.tenantId, req.user?.id]
    );
    if (membership.rows.length === 0 || membership.rows[0].role !== 'admin') {
      const tenant = await database.query('SELECT owner_id FROM tenants WHERE id = $1', [req.params.tenantId]);
      if (tenant.rows.length === 0 || tenant.rows[0].owner_id !== req.user?.id) {
        return res.status(403).json({ success: false, error: 'Only tenant admins can add members' });
      }
    }

    await database.query(
      'INSERT INTO tenant_members (id, tenant_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $4',
      [uuidv4(), req.params.tenantId, userId, role || 'member']
    );
    await database.query('UPDATE users SET tenant_id = $1 WHERE id = $2', [req.params.tenantId, userId]);

    res.json({ success: true, message: 'Member added' });
  } catch (error) {
    logger.error('Add tenant member failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List tenant members
router.get('/tenants/:tenantId/members', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    const result = await database.query(
      \`SELECT u.id, u.email, u.name, u.avatar_url, tm.role, tm.joined_at
       FROM tenant_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.tenant_id = $1
       ORDER BY tm.joined_at ASC\`,
      [req.params.tenantId]
    );
    res.json({ success: true, members: result.rows });
  } catch (error) {
    logger.error('List tenant members failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove member from tenant
router.delete('/tenants/:tenantId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    // Verify caller has admin role
    const membership = await database.query(
      'SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
      [req.params.tenantId, req.user?.id]
    );
    if (membership.rows.length === 0 || membership.rows[0].role !== 'admin') {
      const tenant = await database.query('SELECT owner_id FROM tenants WHERE id = $1', [req.params.tenantId]);
      if (tenant.rows.length === 0 || tenant.rows[0].owner_id !== req.user?.id) {
        return res.status(403).json({ success: false, error: 'Only tenant admins can remove members' });
      }
    }

    await database.query('DELETE FROM tenant_members WHERE tenant_id = $1 AND user_id = $2', [req.params.tenantId, req.params.userId]);
    await database.query('UPDATE users SET tenant_id = $1 WHERE id = $2', ['default', req.params.userId]);

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    logger.error('Remove tenant member failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Switch tenant context
router.post('/tenants/:tenantId/switch', authMiddleware, async (req, res) => {
  try {
    const database = require('../database');
    // Verify user is member of target tenant
    const membership = await database.query(
      'SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2',
      [req.params.tenantId, req.user?.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not a member of this tenant' });
    }

    // Update user's active tenant
    await database.query('UPDATE users SET tenant_id = $1, updated_at = NOW() WHERE id = $2', [req.params.tenantId, req.user.id]);

    // Issue new JWT with tenant context
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, tenant_id: req.params.tenantId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, token, tenantId: req.params.tenantId });
  } catch (error) {
    logger.error('Switch tenant failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================================================
// I18N / LOCALIZATION ROUTES
// ===========================================================================

// Get available locales
router.get('/locales', (req, res) => {
  res.json({
    success: true,
    locales: ['en'],
    defaultLocale: 'en'
  });
});

// Get translations for a locale
router.get('/locales/:lng', (req, res) => {
  const translations = {
    en: {
      common: {
        save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
        create: 'Create', search: 'Search', loading: 'Loading...',
        noData: 'No data available', confirm: 'Confirm', back: 'Back',
        next: 'Next', submit: 'Submit', actions: 'Actions', status: 'Status',
        yes: 'Yes', no: 'No'
      },
      auth: {
        signIn: 'Sign In', signUp: 'Sign Up', signOut: 'Sign Out',
        email: 'Email', password: 'Password', forgotPassword: 'Forgot password?',
        noAccount: "Don't have an account?", hasAccount: 'Already have an account?'
      },
      nav: {
        home: 'Home', dashboard: 'Dashboard', settings: 'Settings', profile: 'Profile'
      },
      pages: {
        notFound: 'Page Not Found', goToDashboard: 'Go to Dashboard',
        underConstruction: 'Page under construction.', noPages: 'No pages configured.',
        accessDenied: 'Access Denied', welcome: 'Welcome to {{appName}}'
      }
    }
  };
  const lng = req.params.lng || 'en';
  res.json({ success: true, locale: lng, translations: translations[lng] || translations.en });
});

// ===========================================================================
// WORKFLOW ROUTES
// ===========================================================================

// Get all workflows
router.get('/workflows', (req, res) => {
  try {
    res.json({
      success: true,
      workflows: runtimeEngine.workflows
    });
  } catch (error) {
    logger.error('Failed to get workflows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow by ID
router.get('/workflows/:id', (req, res) => {
  try {
    const workflow = runtimeEngine.workflows.find(w => w.id === req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.json({ success: true, workflow });
  } catch (error) {
    logger.error('Failed to get workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start workflow instance
router.post('/workflows/:id/start', async (req, res) => {
  try {
    const instance = await runtimeEngine.startWorkflow(req.params.id, req.body);
    res.json({
      success: true,
      instance: {
        id: instance.id,
        workflowId: instance.workflowId,
        status: instance.status,
        data: instance.data
      },
      navigation: instance.navigation || {
        initialPageId: null,
        currentTaskId: null,
        workflowComplete: instance.status === 'completed'
      }
    });
  } catch (error) {
    logger.error('Failed to start workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow instance
router.get('/instances/:id', (req, res) => {
  try {
    const instance = runtimeEngine.getInstance(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    res.json({ success: true, instance });
  } catch (error) {
    logger.error('Failed to get instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resume workflow instance
router.post('/instances/:id/resume', async (req, res) => {
  try {
    await runtimeEngine.resumeWorkflow(req.params.id, req.body);
    const instance = runtimeEngine.getInstance(req.params.id);
    res.json({ success: true, instance });
  } catch (error) {
    logger.error('Failed to resume workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete task and continue workflow with navigation
router.post('/instances/:id/complete', async (req, res) => {
  try {
    const { taskId, ...formData } = req.body;
    const result = await runtimeEngine.completeTask(req.params.id, { taskId, ...formData });
    res.json({
      success: true,
      instance: result.instance,
      navigation: result.navigation || {
        workflowComplete: result.instance?.status === 'completed',
        nextPageId: null,
        nextTaskId: null
      }
    });
  } catch (error) {
    logger.error('Failed to complete task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim a task for the current user
router.post('/instances/:id/tasks/:taskId/claim', async (req, res) => {
  try {
    const { userId } = req.body;
    await runtimeEngine.claimTask(req.params.id, req.params.taskId, userId);
    const instance = runtimeEngine.getInstance(req.params.id);
    res.json({ success: true, instance });
  } catch (error) {
    logger.error('Failed to claim task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current task for an instance
router.get('/instances/:id/task', (req, res) => {
  try {
    const instance = runtimeEngine.getInstance(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    const currentTask = instance.currentTask || instance.pendingTask || null;
    res.json({ success: true, task: currentTask });
  } catch (error) {
    logger.error('Failed to get current task:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get execution history for an instance
router.get('/instances/:id/history', (req, res) => {
  try {
    const instance = runtimeEngine.getInstance(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    const history = instance.history || instance.executionHistory || [];
    res.json({ success: true, history });
  } catch (error) {
    logger.error('Failed to get instance history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel a running workflow instance
router.post('/instances/:id/cancel', async (req, res) => {
  try {
    const instance = runtimeEngine.getInstance(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }
    instance.status = 'cancelled';
    instance.cancelledAt = new Date().toISOString();
    instance.cancelReason = req.body.reason || 'Cancelled by user';
    res.json({ success: true, instance: { id: instance.id, status: instance.status, cancelledAt: instance.cancelledAt } });
  } catch (error) {
    logger.error('Failed to cancel instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all instances
router.get('/instances', (req, res) => {
  try {
    const instances = runtimeEngine.getAllInstances();
    res.json({ success: true, instances });
  } catch (error) {
    logger.error('Failed to get instances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get resources (forms, pages, data models)
router.get('/resources/:type', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const filePath = path.join(__dirname, \`../resources/\${req.params.type}.json\`);
    const data = await fs.readFile(filePath, 'utf8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (error) {
    logger.error('Failed to get resources:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DATA MODEL CRUD ROUTES
// ============================================================================

const database = require('../database');

// Helper to convert model name to table name
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// List all records for a model (with optional tenant filtering)
router.get('/data/:model', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    // Check if table has tenant_id column for multi-tenancy filtering
    let result;
    if (req.tenantId && req.tenantId !== 'default') {
      try {
        result = await database.query(\`SELECT * FROM \${tableName} WHERE tenant_id = $1 ORDER BY created_at DESC\`, [req.tenantId]);
      } catch (e) {
        // Table may not have tenant_id column, fall back to unfiltered
        result = await database.query(\`SELECT * FROM \${tableName} ORDER BY created_at DESC\`);
      }
    } else {
      result = await database.query(\`SELECT * FROM \${tableName} ORDER BY created_at DESC\`);
    }
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error(\`Failed to list \${req.params.model}:\`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single record by ID
router.get('/data/:model/:id', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(\`SELECT * FROM \${tableName} WHERE id = $1\`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(\`Failed to get \${req.params.model}:\`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new record (auto-injects tenant_id when multi-tenancy active)
router.post('/data/:model', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const data = { ...req.body };

    // Inject tenant_id if multi-tenancy is active
    if (req.tenantId && req.tenantId !== 'default') {
      data.tenant_id = req.tenantId;
    }

    // Convert field names to snake_case
    const columns = Object.keys(data).map(toSnakeCase);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => \`$\${i + 1}\`);

    const sql = \`INSERT INTO \${tableName} (\${columns.join(', ')}) VALUES (\${placeholders.join(', ')}) RETURNING *\`;
    const result = await database.query(sql, values);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(\`Failed to create \${req.params.model}:\`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update record
router.put('/data/:model/:id', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const data = req.body;

    // Build SET clause
    const columns = Object.keys(data).map(toSnakeCase);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => \`\${col} = $\${i + 1}\`).join(', ');

    const sql = \`UPDATE \${tableName} SET \${setClause}, updated_at = NOW() WHERE id = $\${values.length + 1} RETURNING *\`;
    const result = await database.query(sql, [...values, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(\`Failed to update \${req.params.model}:\`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete record
router.delete('/data/:model/:id', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(\`DELETE FROM \${tableName} WHERE id = $1 RETURNING *\`, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error(\`Failed to delete \${req.params.model}:\`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
`;

    const filePath = path.join(this.outputPath, 'src/routes/api.js');
    await fs.writeFile(filePath, apiRoutes);
    return 'routes/api.js';
  }

  async generateServer() {
    const server = `/**
 * Application Server
 * Main entry point for the generated application
 * Supports SSR, WebSockets, OAuth, and file serving
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const config = require('./config');
const runtimeEngine = require('./runtime/engine');
const apiRoutes = require('./routes/api');
const executionLogsRoutes = require('./routes/execution-logs');
const database = require('./database');
const logger = require('./utils/logger');

// SSR modules
const pageDataService = require('./ssr/PageDataService');
const htmlRenderer = require('./ssr/HtmlRenderer');

const app = express();
const server = http.createServer(app);

// ===========================================================================
// SOCKET.IO REAL-TIME SETUP
// ===========================================================================

let io;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    logger.info('Client connected:', socket.id);

    socket.on('join-room', (room) => {
      socket.join(room);
      logger.info(\`Socket \${socket.id} joined room: \${room}\`);
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);
    });
  });

  // Make io available globally for route handlers
  app.set('io', io);
  logger.info('Socket.IO initialized');
} catch (e) {
  logger.info('Socket.IO not available, real-time features disabled');
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  logger.info(\`\${req.method} \${req.path}\`);
  next();
});

// Passport initialization for OAuth
try {
  const passport = require('passport');
  app.use(passport.initialize());
} catch (e) {}

// Multi-tenancy middleware - extracts and validates tenant context
app.use(async (req, res, next) => {
  // Priority: X-Tenant-ID header > subdomain > JWT tenant_id > 'default'
  let tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    const host = req.hostname || '';
    const parts = host.split('.');
    if (parts.length > 2) tenantId = parts[0];
  }
  if (!tenantId && req.user?.tenant_id) tenantId = req.user.tenant_id;
  req.tenantId = tenantId || 'default';

  // Validate tenant exists and is active (skip for default tenant and auth routes)
  if (req.tenantId !== 'default' && !req.path.startsWith('/api/auth')) {
    try {
      const database = require('./database');
      const result = await database.query(
        'SELECT id, is_active FROM tenants WHERE id = $1 OR slug = $1',
        [req.tenantId]
      );
      if (result.rows.length > 0) {
        if (!result.rows[0].is_active) {
          return res.status(403).json({ success: false, error: 'Tenant is deactivated' });
        }
        req.tenantId = result.rows[0].id; // Normalize to ID
      }
    } catch (e) {
      // Database not ready yet or table doesn't exist -- allow through
    }
  }
  next();
});

// Emit data change events via Socket.IO
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (io && data && data.success && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const modelMatch = req.path.match(/\\/api\\/data\\/([^/]+)/);
      if (modelMatch) {
        io.emit('data-change', {
          model: modelMatch[1],
          action: req.method === 'POST' ? 'create' : req.method === 'PUT' ? 'update' : 'delete',
          data: data.data,
          timestamp: new Date().toISOString()
        });
      }
      // Emit workflow state changes
      const workflowMatch = req.path.match(/\\/api\\/(workflows|instances)/);
      if (workflowMatch) {
        io.emit('workflow-change', {
          type: workflowMatch[1],
          action: req.method,
          data: data.instance || data.data,
          timestamp: new Date().toISOString()
        });
      }
    }
    return originalJson(data);
  };
  next();
});

// API Routes (must come before static/SSR routes)
app.use('/api', apiRoutes);
app.use('/api/execution-logs', executionLogsRoutes);

// Serve static files from frontend build
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath, {
  index: false
}));

// SSR middleware for page routes
const ssrHandler = async (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.match(/\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) return next();

  try {
    logger.info(\`SSR rendering: \${req.path}\`);
    const db = config.database.enabled ? database : null;
    const initialState = await pageDataService.getInitialState(req.path, db);
    const html = htmlRenderer.render(initialState);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('SSR Error:', error);
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) res.status(500).send('Error loading application');
    });
  }
};

app.get('*', ssrHandler);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Initialize and start server
async function start() {
  try {
    logger.info('Starting application...');

    if (config.database.enabled) {
      await database.initialize();
      logger.info('Database initialized');
    }

    await runtimeEngine.initialize();
    logger.info('Runtime engine initialized');

    const PORT = config.server.port;
    server.listen(PORT, () => {
      logger.info(\`Server running on port \${PORT}\`);
      logger.info(\`Health check: http://localhost:\${PORT}/api/health\`);
      if (io) logger.info(\`WebSocket: ws://localhost:\${PORT}\`);
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { logger.info('SIGTERM received'); process.exit(0); });
process.on('SIGINT', async () => { logger.info('SIGINT received'); process.exit(0); });

start();
`;

    const filePath = path.join(this.outputPath, 'src/server.js');
    await fs.writeFile(filePath, server);
    return 'server.js';
  }

  async generateEnvFile() {
    const envContent = `# Application Configuration
NODE_ENV=development
PORT=${this.application.runtime?.port || 4000}

# Database Configuration
DB_ENABLED=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${this.application.name.toLowerCase().replace(/\s+/g, '_')}
DB_USER=admin
DB_PASSWORD=admin123

# Redis Configuration (optional - required for Bull queues)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration (optional)
KAFKA_ENABLED=false
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=${this.application.name.toLowerCase().replace(/\s+/g, '_')}

# Email Configuration (choose one provider)
# SendGrid
# SENDGRID_API_KEY=your_sendgrid_api_key
# EMAIL_FROM=noreply@yourapp.com

# SMTP (alternative to SendGrid)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_smtp_user
# SMTP_PASS=your_smtp_password
# EMAIL_FROM=noreply@yourapp.com

# Push Notifications - Firebase (optional)
# FIREBASE_PROJECT_ID=your_firebase_project_id
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Push Notifications - Pusher (optional)
# PUSHER_APP_ID=your_pusher_app_id
# PUSHER_KEY=your_pusher_key
# PUSHER_SECRET=your_pusher_secret
# PUSHER_CLUSTER=us2

# JWT Secret (change in production)
JWT_SECRET=change-this-to-a-secure-random-string

# OAuth - Google (optional)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# OAuth - GitHub (optional)
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
# GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# Stripe Payments (optional)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# For frontend (create frontend/.env):
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Multi-Tenancy
# MULTI_TENANT_MODE=true
# DEFAULT_TENANT_PLAN=free

# File Storage
FILE_STORAGE=local
# FILE_STORAGE=s3
# AWS_S3_BUCKET=your-bucket
# AWS_S3_REGION=us-east-1

# AI Self-Healing Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Application Metadata
APP_NAME=${this.application.name}
APP_VERSION=${this.application.version || '1.0.0'}
`;

    const filePath = path.join(this.outputPath, '.env');
    await fs.writeFile(filePath, envContent);
    return '.env';
  }

  async generateConfigFile() {
    const configContent = `/**
 * Application Configuration
 */

module.exports = {
  server: {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || 'development'
  },

  database: {
    enabled: process.env.DB_ENABLED === 'true',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },

  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },

  kafka: {
    enabled: process.env.KAFKA_ENABLED === 'true',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },

  app: {
    name: process.env.APP_NAME || '${this.application.name}',
    version: process.env.APP_VERSION || '${this.application.version || '1.0.0'}'
  }
};
`;

    const filePath = path.join(this.outputPath, 'src/config/index.js');
    await fs.writeFile(filePath, configContent);
    return 'config/index.js';
  }

  async generateDatabaseInit() {
    const dbInit = `/**
 * Database Initialization
 * Creates tables and schema on first run
 * Automatically generates tables from dataModels.json
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async initialize(clientId = 'default_client') {
    if (!config.database.enabled) {
      logger.info('Database disabled, skipping initialization');
      return;
    }

    try {
      // Store client ID for multi-tenancy support
      this.currentClientId = clientId;
      this.currentSchema = clientId;

      // First, create the database if it doesn't exist
      await this.createDatabaseIfNotExists();

      // Then connect to the app-specific database
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database || config.app.name.replace(/-/g, '_'),
        user: config.database.user,
        password: config.database.password
      });

      // Test connection
      await this.pool.query('SELECT NOW()');
      logger.info(\`Database connection established to \${config.database.database || config.app.name}\`);

      // Create client schema (for multi-tenancy)
      await this.createClientSchema(clientId);

      // Create schema if needed (tables within the client schema)
      await this.createSchema();

    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createDatabaseIfNotExists() {
    const dbName = config.database.database || config.app.name.replace(/-/g, '_');

    // Connect to postgres database to create app database
    const adminPool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: 'postgres',
      user: config.database.user,
      password: config.database.password
    });

    try {
      // Check if database exists
      const result = await adminPool.query(
        \`SELECT 1 FROM pg_database WHERE datname = $1\`,
        [dbName]
      );

      if (result.rows.length === 0) {
        // Database doesn't exist, create it
        await adminPool.query(\`CREATE DATABASE \${dbName}\`);
        logger.info(\`Created database: \${dbName}\`);
      } else {
        logger.info(\`Database \${dbName} already exists\`);
      }
    } catch (error) {
      logger.error(\`Error creating database \${dbName}:\`, error);
      // Don't throw - database might already exist
    } finally {
      await adminPool.end();
    }
  }

  async createClientSchema(clientId) {
    const schemaName = clientId.replace(/-/g, '_');

    try {
      // Check if schema exists
      const result = await this.pool.query(\`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = $1
      \`, [schemaName]);

      if (result.rows.length === 0) {
        // Schema doesn't exist, create it
        await this.pool.query(\`CREATE SCHEMA IF NOT EXISTS \${schemaName}\`);
        logger.info(\`Created schema: \${schemaName} for client: \${clientId}\`);
      } else {
        logger.info(\`Schema \${schemaName} already exists for client: \${clientId}\`);
      }

      // Set search path to use this schema by default
      await this.pool.query(\`SET search_path TO \${schemaName}, public\`);
      logger.info(\`Set search path to schema: \${schemaName}\`);
    } catch (error) {
      logger.error(\`Error creating schema \${schemaName}:\`, error);
      // Don't throw - schema might already exist
    }
  }

  async createSchema() {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Set search path to use the client schema
      const schemaName = this.currentSchema.replace(/-/g, '_');
      await client.query(\`SET search_path TO \${schemaName}, public\`);

      // Create workflow_instances table
      await client.query(\`
        CREATE TABLE IF NOT EXISTS workflow_instances (
          id VARCHAR(255) PRIMARY KEY,
          workflow_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          input JSONB,
          data JSONB,
          current_node_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP
        )
      \`);

      // Create workflow_history table
      await client.query(\`
        CREATE TABLE IF NOT EXISTS workflow_history (
          id SERIAL PRIMARY KEY,
          instance_id VARCHAR(255) REFERENCES workflow_instances(id),
          node_id VARCHAR(255),
          action VARCHAR(100),
          data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      \`);

      // Create users table (for RBAC and OAuth)
      await client.query(\`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          oauth_provider VARCHAR(50),
          oauth_id VARCHAR(255),
          avatar_url VARCHAR(500),
          tenant_id VARCHAR(255) DEFAULT 'default',
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      \`);

      // Create files table (for file management)
      await client.query(\`
        CREATE TABLE IF NOT EXISTS files (
          id VARCHAR(255) PRIMARY KEY,
          original_name VARCHAR(500) NOT NULL,
          stored_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100),
          size BIGINT,
          uploaded_by VARCHAR(255),
          entity_type VARCHAR(100),
          entity_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      \`);

      // Create notifications table (for real-time)
      await client.query(\`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          title VARCHAR(255),
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          link VARCHAR(500),
          created_at TIMESTAMP DEFAULT NOW()
        )
      \`);

      // Create tenants table (for multi-tenancy management)
      await client.query(\`
        CREATE TABLE IF NOT EXISTS tenants (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          domain VARCHAR(255),
          owner_id VARCHAR(255) REFERENCES users(id),
          plan VARCHAR(50) DEFAULT 'free',
          settings JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      \`);

      // Create tenant_members table (user-tenant associations)
      await client.query(\`
        CREATE TABLE IF NOT EXISTS tenant_members (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, user_id)
        )
      \`);

      // Create indexes
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON workflow_instances(workflow_id)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id)\`);
      await client.query(\`CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id)\`);

      // Load and create tables from data models
      await this.createDataModelTables(client);

      await client.query('COMMIT');
      logger.info('Database schema created successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Schema creation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createDataModelTables(client) {
    try {
      const dataModelsPath = path.join(__dirname, '../resources/dataModels.json');
      const dataModelsData = await fs.readFile(dataModelsPath, 'utf8');
      const dataModels = JSON.parse(dataModelsData);

      // Deduplicate models by name (keep first occurrence)
      const seenModels = new Set();
      const uniqueModels = dataModels.filter(model => {
        const name = model.name?.toLowerCase();
        if (!name || seenModels.has(name)) return false;
        seenModels.add(name);
        return true;
      });

      logger.info(\`Creating tables for \${uniqueModels.length} unique data models (\${dataModels.length} total, \${dataModels.length - uniqueModels.length} duplicates removed)\`);

      for (const model of uniqueModels) {
        try {
          await this.createTableFromModel(client, model);
        } catch (modelError) {
          const errMsg = modelError?.message || modelError?.toString() || 'Unknown error';
          const errStack = modelError?.stack || '';
          logger.error(\`Failed to create table for model \${model.name}: \${errMsg}\`);
          if (errStack) logger.error(\`Error stack: \${errStack}\`);
          // Continue with other models
        }
      }

      logger.info('All data model tables created successfully');
    } catch (error) {
      logger.error('Failed to create data model tables:', error.message);
      logger.error('Error stack:', error.stack);
      // Don't throw - allow app to continue even if data models fail
    }
  }

  async createTableFromModel(client, model) {
    const tableName = this.toSnakeCase(model.name);
    const fields = model.fields || [];

    if (fields.length === 0) {
      logger.warn(\`Model \${model.name} has no fields, skipping\`);
      return;
    }

    // Check if table exists
    const tableExists = await this.checkTableExists(client, tableName);

    if (!tableExists) {
      // Create new table
      await this.createTable(client, tableName, fields);
    } else {
      // Alter existing table - add missing columns
      await this.alterTable(client, tableName, fields);
    }

    // Create indexes for fields marked as indexed
    for (const field of fields) {
      if (field.indexed) {
        const columnName = this.toSnakeCase(field.name);
        const indexName = \`idx_\${tableName}_\${columnName}\`;
        await client.query(\`
          CREATE INDEX IF NOT EXISTS \${indexName}
          ON \${tableName}(\${columnName})
        \`);
        logger.info(\`Created index: \${indexName}\`);
      }
    }

    // Handle relationships (foreign keys)
    for (const field of fields) {
      if (field.relationship && field.relationship.type === 'belongsTo') {
        const columnName = this.toSnakeCase(field.name);
        const refTable = this.toSnakeCase(field.relationship.model);
        const refColumn = field.relationship.foreignKey || 'id';

        // Add foreign key constraint
        const constraintName = \`fk_\${tableName}_\${columnName}\`;

        try {
          await client.query(\`
            ALTER TABLE \${tableName}
            ADD CONSTRAINT \${constraintName}
            FOREIGN KEY (\${columnName})
            REFERENCES \${refTable}(\${refColumn})
            ON DELETE \${field.relationship.onDelete || 'CASCADE'}
          \`);
          logger.info(\`Created foreign key: \${constraintName}\`);
        } catch (error) {
          // Constraint might already exist, log warning but continue
          logger.warn(\`Foreign key \${constraintName} might already exist\`);
        }
      }
    }
  }

  async checkTableExists(client, tableName) {
    const schemaName = this.currentSchema.replace(/-/g, '_');
    const result = await client.query(\`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = $1
        AND table_name = $2
      )
    \`, [schemaName, tableName]);

    return result.rows[0].exists;
  }

  async createTable(client, tableName, fields) {
    // Build CREATE TABLE statement
    const columns = fields.map((field, index) => {
      const columnName = this.toSnakeCase(field.name);
      // Use sqlType if available (from AI-generated models), otherwise fallback to type mapping
      let columnType = field.sqlType || this.mapFieldTypeToSQL(field.type);

      // Convert MySQL types to PostgreSQL
      columnType = this.convertMySQLTypeToPostgreSQL(columnType);

      const constraints = [];

      // Skip adding constraints for primary key fields - handle them separately
      if (field.primaryKey) {
        // For auto-increment primary keys
        if (columnType.includes('BIGINT') || columnType.includes('INT')) {
          return \`  \${columnName} BIGSERIAL PRIMARY KEY\`;
        }
        return \`  \${columnName} \${columnType} PRIMARY KEY\`;
      }

      if (field.required && columnName !== 'created_at' && columnName !== 'updated_at') {
        constraints.push('NOT NULL');
      }

      if (field.unique) {
        constraints.push('UNIQUE');
      }

      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        const defaultValue = this.convertDefaultValueToPostgreSQL(field.defaultValue);
        if (defaultValue) {
          constraints.push(\`DEFAULT \${defaultValue}\`);
        }
      }

      return \`  \${columnName} \${columnType} \${constraints.join(' ')}\`;
    });

    // Filter out primary key columns as they're already handled
    const nonPKFields = fields.filter(f => !f.primaryKey && f.name !== 'created_at' && f.name !== 'updated_at');

    // Check if we need to add standard timestamp fields
    const hasCreatedAt = fields.some(f => f.name === 'created_at');
    const hasUpdatedAt = fields.some(f => f.name === 'updated_at');

    if (!hasCreatedAt) {
      columns.push('  created_at TIMESTAMP DEFAULT NOW()');
    }
    if (!hasUpdatedAt) {
      columns.push('  updated_at TIMESTAMP DEFAULT NOW()');
    }

    const createTableSQL = \`
      CREATE TABLE IF NOT EXISTS \${tableName} (
\${columns.join(',\\n')}
      )
    \`;

    await client.query(createTableSQL);
    logger.info(\`Created table: \${tableName}\`);
  }

  convertMySQLTypeToPostgreSQL(sqlType) {
    if (!sqlType) return 'TEXT';

    const typeStr = sqlType.toUpperCase();

    // Handle ENUM types
    if (typeStr.startsWith('ENUM')) {
      // Extract enum values
      const match = typeStr.match(/ENUM\\((.+)\\)/);
      if (match) {
        // For now, use VARCHAR as PostgreSQL ENUMs require CREATE TYPE
        return 'VARCHAR(50)';
      }
    }

    // Convert MySQL types to PostgreSQL
    if (typeStr.includes('DATETIME')) return 'TIMESTAMP';
    if (typeStr === 'INT') return 'INTEGER';
    if (typeStr.includes('BIGINT')) return 'BIGINT';
    if (typeStr.includes('TINYINT(1)')) return 'BOOLEAN';
    if (typeStr.includes('DOUBLE')) return 'DOUBLE PRECISION';

    return sqlType;
  }

  convertDefaultValueToPostgreSQL(defaultValue) {
    if (defaultValue === null || defaultValue === undefined) return null;

    const valueStr = String(defaultValue);

    // MySQL function conversions
    if (valueStr === 'CURRENT_TIMESTAMP') return 'NOW()';
    if (valueStr.includes('ON UPDATE CURRENT_TIMESTAMP')) return 'NOW()';  // PostgreSQL doesn't support ON UPDATE
    if (valueStr === 'CURRENT_DATE') return 'CURRENT_DATE';
    if (valueStr.includes('CURDATE()')) return 'CURRENT_DATE';
    if (valueStr.includes('NOW()')) return 'NOW()';
    if (valueStr.includes('YEAR(CURDATE())')) return 'EXTRACT(YEAR FROM CURRENT_DATE)';

    // If it's a number, return as-is
    if (!isNaN(valueStr) && valueStr.trim() !== '') return valueStr;

    // If it's a boolean
    if (valueStr === 'true' || valueStr === 'false') return valueStr;

    // If it's already a SQL function (contains parentheses), return as-is
    if (valueStr.includes('(') && valueStr.includes(')')) return valueStr;

    // Otherwise, it's a string literal - wrap in quotes
    return \`'\${valueStr}'\`;
  }

  async alterTable(client, tableName, fields) {
    logger.info(\`Checking table \${tableName} for schema changes...\`);

    // Get existing columns
    const schemaName = this.currentSchema.replace(/-/g, '_');
    const result = await client.query(\`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
    \`, [schemaName, tableName]);

    const existingColumns = new Set(result.rows.map(r => r.column_name));

    // Add missing columns
    for (const field of fields) {
      const columnName = this.toSnakeCase(field.name);

      if (!existingColumns.has(columnName)) {
        const columnType = this.mapFieldTypeToSQL(field.type);
        const constraints = [];

        if (field.defaultValue !== undefined) {
          const defaultVal = typeof field.defaultValue === 'string' ? \`'\${field.defaultValue}'\` : field.defaultValue;
          constraints.push(\`DEFAULT \${defaultVal}\`);
        }

        // Don't add NOT NULL to existing tables without default
        if (field.required && field.defaultValue !== undefined) {
          constraints.push('NOT NULL');
        }

        const alterSQL = \`
          ALTER TABLE \${tableName}
          ADD COLUMN \${columnName} \${columnType} \${constraints.join(' ')}
        \`;

        try {
          await client.query(alterSQL);
          logger.info(\`Added column \${columnName} to table \${tableName}\`);
        } catch (error) {
          logger.warn(\`Failed to add column \${columnName}:\`, error.message);
        }
      }
    }

    // Ensure standard columns exist
    if (!existingColumns.has('created_at')) {
      await client.query(\`ALTER TABLE \${tableName} ADD COLUMN created_at TIMESTAMP DEFAULT NOW()\`);
      logger.info(\`Added created_at to table \${tableName}\`);
    }

    if (!existingColumns.has('updated_at')) {
      await client.query(\`ALTER TABLE \${tableName} ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()\`);
      logger.info(\`Added updated_at to table \${tableName}\`);
    }
  }

  mapFieldTypeToSQL(fieldType) {
    const typeMap = {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'number': 'NUMERIC',
      'integer': 'INTEGER',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'timestamp': 'TIMESTAMP',
      'json': 'JSONB',
      'array': 'JSONB',
      'uuid': 'UUID',
      'email': 'VARCHAR(255)',
      'url': 'VARCHAR(500)',
      'phone': 'VARCHAR(20)',
      'decimal': 'DECIMAL(10,2)',
      'float': 'FLOAT',
      'double': 'DOUBLE PRECISION'
    };

    return typeMap[fieldType.toLowerCase()] || 'TEXT';
  }

  toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      // Set search path to current client schema
      const schemaName = this.currentSchema.replace(/-/g, '_');
      await client.query(\`SET search_path TO "\${schemaName}", public\`);

      // Execute the query
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getClient() {
    const client = await this.pool.connect();

    // Set search path to current client schema
    const schemaName = this.currentSchema.replace(/-/g, '_');
    await client.query(\`SET search_path TO "\${schemaName}", public\`);

    return client;
  }

  async switchClient(clientId) {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    this.currentClientId = clientId;
    this.currentSchema = clientId;

    // Create the schema if it doesn't exist
    await this.createClientSchema(clientId);

    logger.info(\`Switched to client: \${clientId}, schema: \${clientId.replace(/-/g, '_')}\`);
  }

  getCurrentClientId() {
    return this.currentClientId;
  }

  getCurrentSchema() {
    return this.currentSchema.replace(/-/g, '_');
  }
}

module.exports = new Database();
`;

    const filePath = path.join(this.outputPath, 'src/database/index.js');
    await fs.writeFile(filePath, dbInit);
    return 'database/index.js';
  }

  async generateModels() {
    const workflowInstance = `/**
 * Workflow Instance Model
 */

const { v4: uuidv4 } = require('uuid');

class WorkflowInstance {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.workflowId = data.workflowId;
    this.workflow = data.workflow;
    this.status = data.status || 'pending';
    this.input = data.input || {};
    this.data = data.data || {};
    this.currentNodeId = data.currentNodeId || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.completedAt = data.completedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      workflowId: this.workflowId,
      status: this.status,
      input: this.input,
      data: this.data,
      currentNodeId: this.currentNodeId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }
}

module.exports = WorkflowInstance;
`;

    const filePath = path.join(this.outputPath, 'src/models/WorkflowInstance.js');
    await fs.writeFile(filePath, workflowInstance);
    return 'models/WorkflowInstance.js';
  }

  async generateExecutionLogDatabase() {
    const executionLogDatabase = `/**
 * Execution Log Database
 * Stores workflow execution failures and AI-generated fixes for learning
 */

const fs = require('fs');
const path = require('path');

const EXECUTION_LOGS_FILE = path.join(__dirname, '../../data/execution-logs.json');

class ExecutionLogDatabase {
  constructor() {
    this.ensureDataFile();
  }

  ensureDataFile() {
    if (!fs.existsSync(EXECUTION_LOGS_FILE)) {
      const initialData = {
        logs: [],
        fixes: [],
        patterns: []
      };
      fs.writeFileSync(EXECUTION_LOGS_FILE, JSON.stringify(initialData, null, 2));
    }
  }

  loadData() {
    try {
      const data = fs.readFileSync(EXECUTION_LOGS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[ExecutionLogDB] Error loading data:', error);
      return { logs: [], fixes: [], patterns: [] };
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(EXECUTION_LOGS_FILE, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('[ExecutionLogDB] Error saving data:', error);
      return false;
    }
  }

  /**
   * Log a workflow execution attempt
   */
  logExecution(log) {
    const data = this.loadData();

    const executionLog = {
      id: \`log_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
      timestamp: new Date().toISOString(),
      workflowId: log.workflowId,
      instanceId: log.instanceId,
      nodeId: log.nodeId,
      nodeType: log.nodeType,
      taskLabel: log.taskLabel,
      status: log.status, // 'success', 'failed', 'fixed'
      error: log.error,
      originalScript: log.originalScript,
      fixedScript: log.fixedScript,
      fixMethod: log.fixMethod, // 'ai', 'cached', 'manual'
      executionTime: log.executionTime,
      retryCount: log.retryCount || 0
    };

    data.logs.push(executionLog);

    // Keep only last 1000 logs to prevent file bloat
    if (data.logs.length > 1000) {
      data.logs = data.logs.slice(-1000);
    }

    this.saveData(data);
    return executionLog;
  }

  /**
   * Store a successful AI fix for future reference
   */
  storeFix(fix) {
    const data = this.loadData();

    const fixRecord = {
      id: \`fix_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
      timestamp: new Date().toISOString(),
      errorType: fix.errorType,
      errorMessage: fix.errorMessage,
      errorPattern: this.extractErrorPattern(fix.errorMessage),
      originalScript: fix.originalScript,
      fixedScript: fix.fixedScript,
      taskContext: fix.taskContext,
      successCount: 1,
      lastUsed: new Date().toISOString()
    };

    // Check if similar fix already exists
    const existingFix = data.fixes.find(f =>
      f.errorPattern === fixRecord.errorPattern &&
      f.originalScript === fixRecord.originalScript
    );

    if (existingFix) {
      existingFix.successCount++;
      existingFix.lastUsed = new Date().toISOString();
    } else {
      data.fixes.push(fixRecord);
    }

    this.saveData(data);
    return fixRecord;
  }

  /**
   * Extract error pattern for matching similar errors
   */
  extractErrorPattern(errorMessage) {
    // Extract the core error pattern, removing specific variable names
    let pattern = errorMessage
      .replace(/['"\`][^'"\`]+['"\`]/g, 'VAR') // Replace quoted strings
      .replace(/\\b\\d+\\b/g, 'NUM') // Replace numbers
      .replace(/\\w+Error:/g, 'ERROR:') // Normalize error types
      .trim();

    return pattern;
  }

  /**
   * Find similar fixes from history
   */
  findSimilarFixes(errorMessage, originalScript, limit = 5) {
    const data = this.loadData();
    const errorPattern = this.extractErrorPattern(errorMessage);

    // Find fixes with matching error patterns
    const matches = data.fixes
      .filter(fix => {
        // Exact pattern match
        if (fix.errorPattern === errorPattern) return true;

        // Fuzzy match - check if error messages are similar
        const similarity = this.calculateSimilarity(errorMessage, fix.errorMessage);
        return similarity > 0.7; // 70% similarity threshold
      })
      .sort((a, b) => {
        // Sort by success count and recency
        if (b.successCount !== a.successCount) {
          return b.successCount - a.successCount;
        }
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      })
      .slice(0, limit);

    return matches;
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(/\\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Get execution statistics
   */
  getStatistics(workflowId = null) {
    const data = this.loadData();
    let logs = data.logs;

    if (workflowId) {
      logs = logs.filter(log => log.workflowId === workflowId);
    }

    const total = logs.length;
    const successful = logs.filter(log => log.status === 'success').length;
    const failed = logs.filter(log => log.status === 'failed').length;
    const fixed = logs.filter(log => log.status === 'fixed').length;

    const errorTypes = {};
    logs.filter(log => log.error).forEach(log => {
      const errorType = this.extractErrorPattern(log.error);
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    return {
      total,
      successful,
      failed,
      fixed,
      successRate: total > 0 ? ((successful + fixed) / total * 100).toFixed(2) : 0,
      fixRate: failed > 0 ? (fixed / (failed + fixed) * 100).toFixed(2) : 0,
      errorTypes,
      totalFixes: data.fixes.length,
      mostCommonErrors: Object.entries(errorTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))
    };
  }

  /**
   * Get recent execution history
   */
  getRecentExecutions(limit = 50, workflowId = null) {
    const data = this.loadData();
    let logs = data.logs;

    if (workflowId) {
      logs = logs.filter(log => log.workflowId === workflowId);
    }

    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get all stored fixes
   */
  getAllFixes() {
    const data = this.loadData();
    return data.fixes.sort((a, b) => b.successCount - a.successCount);
  }

  /**
   * Clear old logs (older than specified days)
   */
  clearOldLogs(daysToKeep = 30) {
    const data = this.loadData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalCount = data.logs.length;
    data.logs = data.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    const removed = originalCount - data.logs.length;

    this.saveData(data);
    return { removed, remaining: data.logs.length };
  }
}

module.exports = new ExecutionLogDatabase();
`;

    const filePath = path.join(this.outputPath, 'src/database/ExecutionLogDatabase.js');
    await fs.writeFile(filePath, executionLogDatabase);
    return 'database/ExecutionLogDatabase.js';
  }

  async generateExecutionLogsRoutes() {
    const executionLogsRoutes = `/**
 * Execution Logs Routes
 * API endpoints for viewing workflow execution history and learned fixes
 */

const express = require('express');
const router = express.Router();
const executionLogDB = require('../database/ExecutionLogDatabase');

/**
 * GET /api/execution-logs/statistics
 * Get overall execution statistics
 */
router.get('/statistics', (req, res) => {
  try {
    const { workflowId } = req.query;
    const stats = executionLogDB.getStatistics(workflowId);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/execution-logs/history
 * Get recent execution history
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 50, workflowId } = req.query;
    const history = executionLogDB.getRecentExecutions(parseInt(limit), workflowId);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/execution-logs/fixes
 * Get all learned fixes
 */
router.get('/fixes', (req, res) => {
  try {
    const fixes = executionLogDB.getAllFixes();

    res.json({
      success: true,
      fixes,
      count: fixes.length
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error getting fixes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/execution-logs/similar-fixes
 * Find similar fixes for a given error
 */
router.get('/similar-fixes', (req, res) => {
  try {
    const { errorMessage, script, limit = 5 } = req.query;

    if (!errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'errorMessage parameter is required'
      });
    }

    const similarFixes = executionLogDB.findSimilarFixes(
      errorMessage,
      script || '',
      parseInt(limit)
    );

    res.json({
      success: true,
      fixes: similarFixes,
      count: similarFixes.length
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error finding similar fixes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/execution-logs/clear-old
 * Clear old logs
 */
router.post('/clear-old', (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    const result = executionLogDB.clearOldLogs(parseInt(daysToKeep));

    res.json({
      success: true,
      removed: result.removed,
      remaining: result.remaining
    });
  } catch (error) {
    console.error('[ExecutionLogs] Error clearing old logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
`;

    const filePath = path.join(this.outputPath, 'src/routes/execution-logs.js');
    await fs.writeFile(filePath, executionLogsRoutes);
    return 'routes/execution-logs.js';
  }

  async generateUtils() {
    const logger = `/**
 * Logger utility
 */

const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: config.logging.file
    })
  ]
});

module.exports = logger;
`;

    const filePath = path.join(this.outputPath, 'src/utils/logger.js');
    await fs.writeFile(filePath, logger);
    return 'utils/logger.js';
  }

  async generateReadme() {
    // Calculate stats from resources
    const resources = this.application.resources || {};
    const stats = {
      workflowCount: (resources.workflows || []).length,
      modelCount: (resources.dataModels || []).length,
      formCount: (resources.forms || []).length,
      pageCount: (resources.pages || []).length
    };

    const readme = `# ${this.application.name}

${this.application.description || 'Generated workflow application'}

## Generated Application

This is a complete, standalone application generated by Tentoro AI Designer.

### Features

- **Runtime Engine**: Executes workflows and manages workflow state
- **REST API**: Full API for managing and triggering workflows
- **Database Support**: PostgreSQL integration with auto-migration
- **Configuration**: Environment-based configuration with .env support
- **Logging**: Winston-based logging system
- **Optional Services**: Redis and Kafka support

### Resources

- **Workflows**: ${stats.workflowCount}
- **Data Models**: ${stats.modelCount}
- **Forms**: ${stats.formCount}
- **Pages**: ${stats.pageCount}

## Getting Started

### Prerequisites

- Node.js >= 14.x
- PostgreSQL (if database is enabled)
- Redis (optional)
- Kafka (optional)

### Installation

\`\`\`bash
npm install
\`\`\`

### Configuration

1. Copy \`.env.example\` to \`.env\` (or use the generated \`.env\` file)
2. Update database credentials and other settings
3. Enable/disable optional services (Redis, Kafka) as needed

### Running the Application

\`\`\`bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
\`\`\`

The application will start on port \`${this.application.runtime?.port || 4000}\`.

### Database Setup

The application will automatically create the required database schema on first run. If you need to manually initialize:

\`\`\`bash
npm run db:init
\`\`\`

## API Endpoints

### Workflows

- \`GET /api/workflows\` - List all workflows
- \`GET /api/workflows/:id\` - Get workflow by ID
- \`POST /api/workflows/:id/start\` - Start workflow instance
- \`GET /api/instances\` - List all workflow instances
- \`GET /api/instances/:id\` - Get instance by ID
- \`POST /api/instances/:id/resume\` - Resume paused instance

### Resources

- \`GET /api/resources/forms\` - Get all forms
- \`GET /api/resources/pages\` - Get all pages
- \`GET /api/resources/dataModels\` - Get all data models

### Health

- \`GET /api/health\` - Health check endpoint

## Example Usage

### Start a Workflow

\`\`\`bash
curl -X POST http://localhost:${this.application.runtime?.port || 4000}/api/workflows/{workflow-id}/start \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"key": "value"}}'
\`\`\`

### Check Instance Status

\`\`\`bash
curl http://localhost:${this.application.runtime?.port || 4000}/api/instances/{instance-id}
\`\`\`

## Directory Structure

\`\`\`
.
├── src/
│   ├── config/           # Configuration files
│   ├── database/         # Database initialization and queries
│   ├── models/           # Data models
│   ├── resources/        # Workflow definitions, forms, pages, etc.
│   ├── routes/           # API routes
│   ├── runtime/          # Workflow runtime engine
│   ├── utils/            # Utility functions
│   └── server.js         # Main server file
├── data/                 # Application data
├── logs/                 # Log files
├── .env                  # Environment configuration
├── package.json
└── README.md
\`\`\`

## Configuration Options

See \`.env\` file for all available configuration options:

- **Server**: Port, environment
- **Database**: Connection details, enable/disable
- **Redis**: Connection details (optional)
- **Kafka**: Broker configuration (optional)
- **Logging**: Log level and file location

## Development

### Adding Custom Node Types

Add custom node executors in \`src/runtime/engine.js\`:

\`\`\`javascript
nodeExecutors: {
  customTask: async (node, context) => {
    // Your custom logic here
    return { status: 'completed', data: context.data };
  }
}
\`\`\`

### Extending the API

Add new routes in \`src/routes/api.js\` or create new route files.

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check credentials in \`.env\`
- Ensure database exists

### Port Already in Use

Change the \`PORT\` in \`.env\` file

## Support

For issues or questions, refer to the Tentoro AI Designer documentation.

---

**Generated**: ${new Date().toISOString()}
**Platform Version**: 1.0.0
**Application Version**: ${this.application.version || '1.0.0'}
`;

    const filePath = path.join(this.outputPath, 'README.md');
    await fs.writeFile(filePath, readme);
    return 'README.md';
  }

  async generateGitignore() {
    const gitignore = `# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Data
data/*.json
!data/.gitkeep

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
`;

    const filePath = path.join(this.outputPath, '.gitignore');
    await fs.writeFile(filePath, gitignore);
    return '.gitignore';
  }

  async generateServices() {
    const files = [];
    const servicesDir = path.join(this.outputPath, 'src/services');

    // Generate EmailService
    const emailService = `/**
 * EmailService
 * Multi-provider email service with SendGrid, SES, SMTP support
 */

const Queue = require('bull');

class EmailService {
  constructor() {
    this.provider = null;
    this.providerName = 'none';
    this.queue = null;

    this.initialize();
  }

  initialize() {
    // Try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.provider = sgMail;
        this.providerName = 'sendgrid';
        console.log('[EmailService] SendGrid initialized');
      } catch (e) {
        console.warn('[EmailService] SendGrid not available');
      }
    }
    // Try SMTP
    else if (process.env.SMTP_HOST) {
      try {
        const nodemailer = require('nodemailer');
        this.provider = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        this.providerName = 'smtp';
        console.log('[EmailService] SMTP initialized');
      } catch (e) {
        console.warn('[EmailService] SMTP not available');
      }
    }
    else {
      console.warn('[EmailService] No email provider configured (mock mode)');
      this.providerName = 'mock';
    }

    // Initialize Bull queue if Redis available
    try {
      this.queue = new Queue('email-service', {
        redis: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') }
      });
      this.queue.process(async (job) => this.processJob(job.data));
      console.log('[EmailService] Queue initialized');
    } catch (e) {
      console.warn('[EmailService] Queue not available');
    }
  }

  async send(options) {
    const emailId = \`email_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    const emailData = {
      id: emailId,
      to: options.to,
      from: options.from || process.env.EMAIL_FROM || 'noreply@app.local',
      subject: this.interpolate(options.subject, options.variables),
      html: options.template ? this.renderTemplate(options.template, options.variables) : this.interpolate(options.body, options.variables),
      text: options.text,
      createdAt: new Date().toISOString()
    };

    if (this.queue) {
      try {
        const job = await this.queue.add(emailData, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        return { success: true, queued: true, jobId: job.id, emailId };
      } catch (e) { /* Fall through to direct send */ }
    }

    return await this.processJob(emailData);
  }

  async processJob(emailData) {
    try {
      if (this.providerName === 'sendgrid') {
        await this.provider.send({ to: emailData.to, from: emailData.from, subject: emailData.subject, html: emailData.html });
      } else if (this.providerName === 'smtp') {
        await this.provider.sendMail({ from: emailData.from, to: emailData.to, subject: emailData.subject, html: emailData.html });
      } else {
        console.log('[EmailService] Mock email:', { to: emailData.to, subject: emailData.subject });
      }
      return { success: true, emailId: emailData.id, provider: this.providerName };
    } catch (error) {
      console.error('[EmailService] Send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  interpolate(str, vars = {}) {
    if (!str) return str;
    return str.replace(/\\{\\{([^}]+)\\}\\}/g, (m, k) => vars[k.trim()] !== undefined ? vars[k.trim()] : m);
  }

  renderTemplate(name, vars = {}) {
    const templates = {
      'notification': '<h1>{{title}}</h1><p>{{message}}</p>',
      'welcome': '<h1>Welcome, {{name}}!</h1><p>Your account has been created.</p>',
      'workflow-completed': '<h1>Workflow Completed</h1><p>{{workflowName}} completed at {{completedAt}}</p>'
    };
    return this.interpolate(templates[name] || vars.body || '<p>No content</p>', vars);
  }
}

module.exports = new EmailService();
`;

    await fs.writeFile(path.join(servicesDir, 'EmailService.js'), emailService);
    files.push('src/services/EmailService.js');

    // Generate NotificationService
    const notificationService = `/**
 * NotificationService
 * Multi-channel notification service with FCM, Pusher, Socket.IO support
 */

const Queue = require('bull');

class NotificationService {
  constructor() {
    this.fcmProvider = null;
    this.pusherProvider = null;
    this.socketIO = null;
    this.queue = null;
    this.deviceTokens = new Map();

    this.initialize();
  }

  initialize() {
    // Try Firebase
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        const admin = require('firebase-admin');
        if (admin.apps.length === 0) {
          admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
        }
        this.fcmProvider = admin.messaging();
        console.log('[NotificationService] Firebase initialized');
      } catch (e) {
        console.warn('[NotificationService] Firebase not available');
      }
    }

    // Try Pusher
    if (process.env.PUSHER_APP_ID) {
      try {
        const Pusher = require('pusher');
        this.pusherProvider = new Pusher({
          appId: process.env.PUSHER_APP_ID,
          key: process.env.PUSHER_KEY,
          secret: process.env.PUSHER_SECRET,
          cluster: process.env.PUSHER_CLUSTER || 'us2',
          useTLS: true
        });
        console.log('[NotificationService] Pusher initialized');
      } catch (e) {
        console.warn('[NotificationService] Pusher not available');
      }
    }

    // Initialize Bull queue if Redis available
    try {
      this.queue = new Queue('notification-service', {
        redis: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') }
      });
      this.queue.process(async (job) => this.processJob(job.data));
      console.log('[NotificationService] Queue initialized');
    } catch (e) {
      console.warn('[NotificationService] Queue not available');
    }
  }

  setSocketIO(io) {
    this.socketIO = io;
    console.log('[NotificationService] Socket.IO connected');
  }

  registerDevice(userId, token, platform = 'unknown') {
    if (!this.deviceTokens.has(userId)) this.deviceTokens.set(userId, []);
    const devices = this.deviceTokens.get(userId);
    if (!devices.find(d => d.token === token)) {
      devices.push({ token, platform, registeredAt: new Date() });
    }
    return { success: true };
  }

  async send(options) {
    const notificationId = \`notif_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    const data = {
      id: notificationId,
      userId: options.userId,
      title: options.title,
      message: options.message,
      channel: options.channel || 'all',
      data: options.data || {},
      createdAt: new Date().toISOString()
    };

    if (this.queue) {
      try {
        const job = await this.queue.add(data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
        return { success: true, queued: true, jobId: job.id, notificationId };
      } catch (e) { /* Fall through */ }
    }

    return await this.processJob(data);
  }

  async processJob(data) {
    const userIds = Array.isArray(data.userId) ? data.userId : [data.userId];
    const results = { push: 0, inApp: 0, pusher: 0 };

    for (const userId of userIds) {
      // FCM push
      if (this.fcmProvider && (data.channel === 'all' || data.channel === 'push')) {
        const devices = this.deviceTokens.get(userId) || [];
        for (const device of devices) {
          try {
            await this.fcmProvider.send({
              token: device.token,
              notification: { title: data.title, body: data.message },
              data: data.data
            });
            results.push++;
          } catch (e) { console.warn('[NotificationService] FCM failed:', e.message); }
        }
      }

      // Socket.IO
      if (this.socketIO && (data.channel === 'all' || data.channel === 'in-app')) {
        try {
          this.socketIO.to(\`user:\${userId}\`).emit('notification', data);
          results.inApp++;
        } catch (e) { console.warn('[NotificationService] Socket emit failed'); }
      }

      // Pusher
      if (this.pusherProvider && (data.channel === 'all' || data.channel === 'pusher')) {
        try {
          await this.pusherProvider.trigger(\`user-\${userId}\`, 'notification', data);
          results.pusher++;
        } catch (e) { console.warn('[NotificationService] Pusher failed'); }
      }
    }

    // Mock fallback
    if (!this.fcmProvider && !this.socketIO && !this.pusherProvider) {
      console.log('[NotificationService] Mock notification:', { userId: data.userId, title: data.title });
    }

    return { success: true, notificationId: data.id, results };
  }
}

module.exports = new NotificationService();
`;

    await fs.writeFile(path.join(servicesDir, 'NotificationService.js'), notificationService);
    files.push('src/services/NotificationService.js');

    return files;
  }

  // ============================================================================
  // FRONTEND GENERATION
  // ============================================================================

  async generateFrontend() {
    const files = [];
    const frontendDir = path.join(this.outputPath, 'frontend');

    // 1. Generate frontend package.json
    files.push(await this.generateFrontendPackageJson(frontendDir));

    // 2. Generate theme and layout using LLM - it will detect industry and app type
    const preferredMode = this.application.designPreset === 'darkElegance' ||
                          this.application.theme?.mode === 'dark' ||
                          this.application.theme === 'dark' ? 'dark' : 'light';
    const appContext = this.getApplicationContext();

    console.log(`[ApplicationGenerator] Generating LLM theme for: ${appContext.name} (${preferredMode} mode)`);

    // Use DesignExpert to generate fully LLM-powered theme (including industry/type detection)
    let generatedTheme = null;
    try {
      const designExpert = new DesignExpert();
      generatedTheme = await designExpert.generateIndustryTheme({
        appContext, // Full context for LLM to analyze
        preferredMode
      });
      console.log(`[ApplicationGenerator] Theme generated: ${generatedTheme.theme?.name} (${generatedTheme.detectedIndustry} / ${generatedTheme.detectedApplicationType})`);
    } catch (error) {
      console.error('[ApplicationGenerator] LLM theme generation failed, using defaults:', error.message);
    }

    // Store generated theme for use in other generation methods
    this.generatedTheme = generatedTheme;

    // 3. Generate public/index.html (after theme so it can use theme colors)
    files.push(await this.generateIndexHtml(frontendDir));

    // 4. Generate Shadcn/ui infrastructure with the generated theme
    const designPreset = this.application.designPreset || 'minimal';
    // Extract Figma colors for the ShadCN CSS variable bridge
    const figmaDesignColors = this.application.metadata?.preciseDesignSystem?.colors ||
                              this.application.designAnalysis?.designSystem?.colors ||
                              null;

    const shadcnGenerator = new ShadcnComponentGenerator(this.outputPath, {
      preset: designPreset,
      includeDarkMode: this.application.includeDarkMode !== false,
      applicationName: this.application.name || 'App',
      generatedTheme, // Pass the fully LLM-generated theme (includes industry, type, layout)
      figmaColors: figmaDesignColors // Bridge Figma hex colors into ShadCN HSL vars
    });
    await shadcnGenerator.generate();
    files.push('frontend/tailwind.config.js');
    files.push('frontend/postcss.config.js');
    files.push('frontend/src/lib/utils.js');
    files.push('frontend/src/index.css');
    files.push('frontend/src/ThemeContext.js');
    files.push('frontend/src/theme.json');
    files.push('frontend/src/components/ui/*');

    // 4b. Write precise Figma components if available
    if (this.application.metadata?.preciseComponents) {
      const preciseFiles = await this.writePreciseComponents(
        frontendDir,
        this.application.metadata.preciseComponents
      );
      files.push(...preciseFiles);
    }
    if (this.application.metadata?.preciseAssets) {
      await this.downloadPreciseAssets(
        frontendDir,
        this.application.metadata.preciseAssets
      );
    }

    // 5. Generate src/index.js
    files.push(await this.generateFrontendIndex(frontendDir));

    // 6. Generate src/App.js with layout from generated theme
    files.push(await this.generateAppJs(frontendDir));

    // 6. Generate src/App.css (supplementary styles)
    files.push(await this.generateAppCss(frontendDir));

    // 7. Generate API client
    files.push(await this.generateApiClient(frontendDir));

    // 8. Generate components
    files.push(...await this.generateFrontendComponents(frontendDir));

    // 8b. Generate ChartWrapper component
    files.push(await this.generateChartWrapper(frontendDir));

    // 9. Generate pages
    files.push(...await this.generateFrontendPages(frontendDir));

    // 10. LLM-powered UI code generation: convert pages.json into actual React components
    const uiGeneratedPages = await this.generateUICodePages(frontendDir);
    if (uiGeneratedPages.length > 0) {
      files.push(...uiGeneratedPages);
    }

    return files;
  }

  async generateFrontendPackageJson(frontendDir) {
    const packageName = (this.application.name || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const packageJson = {
      name: `${packageName}-frontend`,
      version: '1.0.0',
      private: true,
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0',
        'react-scripts': '5.0.1',
        'axios': '^1.6.0',
        // Shadcn/Radix UI dependencies
        '@radix-ui/react-accordion': '^1.1.2',
        '@radix-ui/react-alert-dialog': '^1.0.5',
        '@radix-ui/react-aspect-ratio': '^1.0.3',
        '@radix-ui/react-avatar': '^1.0.4',
        '@radix-ui/react-checkbox': '^1.0.4',
        '@radix-ui/react-dialog': '^1.0.5',
        '@radix-ui/react-dropdown-menu': '^2.0.6',
        '@radix-ui/react-label': '^2.0.2',
        '@radix-ui/react-navigation-menu': '^1.1.4',
        '@radix-ui/react-popover': '^1.0.7',
        '@radix-ui/react-progress': '^1.0.3',
        '@radix-ui/react-radio-group': '^1.1.3',
        '@radix-ui/react-scroll-area': '^1.0.5',
        '@radix-ui/react-select': '^2.0.0',
        '@radix-ui/react-separator': '^1.0.3',
        '@radix-ui/react-slider': '^1.1.2',
        '@radix-ui/react-slot': '^1.0.2',
        '@radix-ui/react-switch': '^1.0.3',
        '@radix-ui/react-tabs': '^1.0.4',
        '@radix-ui/react-toast': '^1.1.5',
        '@radix-ui/react-tooltip': '^1.0.7',
        'class-variance-authority': '^0.7.0',
        'clsx': '^2.0.0',
        'tailwind-merge': '^2.1.0',
        'tailwindcss-animate': '^1.0.7',
        'lucide-react': '^0.294.0',
        'recharts': '^2.10.3',
        'react-day-picker': '^8.9.1',
        'date-fns': '^2.30.0',
        // Rich text editor
        '@tiptap/react': '^2.1.0',
        '@tiptap/starter-kit': '^2.1.0',
        '@tiptap/extension-placeholder': '^2.1.0',
        '@tiptap/extension-image': '^2.1.0',
        '@tiptap/extension-table': '^2.1.0',
        '@tiptap/extension-table-row': '^2.1.0',
        '@tiptap/extension-table-cell': '^2.1.0',
        '@tiptap/extension-table-header': '^2.1.0',
        // Real-time
        'socket.io-client': '^4.7.4',
        // Drag and drop
        '@dnd-kit/core': '^6.1.0',
        '@dnd-kit/sortable': '^8.0.0',
        '@dnd-kit/utilities': '^3.2.2',
        // Maps
        'react-leaflet': '^4.2.1',
        'leaflet': '^1.9.4',
        // i18n
        'react-i18next': '^13.5.0',
        'i18next': '^23.7.0',
        'i18next-browser-languagedetector': '^7.2.0',
        // Payments
        '@stripe/stripe-js': '^2.4.0',
        '@stripe/react-stripe-js': '^2.4.0'
      },
      devDependencies: {
        'tailwindcss': '^3.3.6',
        'postcss': '^8.4.32',
        'autoprefixer': '^10.4.16'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject'
      },
      proxy: 'http://localhost:4000',
      browserslist: {
        production: ['>0.2%', 'not dead', 'not op_mini all'],
        development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
      }
    };

    await fs.writeFile(
      path.join(frontendDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    return 'frontend/package.json';
  }

  async generateIndexHtml(frontendDir) {
    const appName = this.application.name || 'Application';
    const themeColor = this.generatedTheme?.theme?.colors?.primary || '#3b82f6';
    const fontFamily = this.generatedTheme?.theme?.typography?.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const googleFontsUrl = this.application.metadata?.googleFontsUrl;
    const fontLinks = googleFontsUrl ? `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${googleFontsUrl}" rel="stylesheet" />` : '';
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="${themeColor}" />
    <meta name="description" content="${this.application.description || 'Generated Application'}" />${fontLinks}
    <title>${appName}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: ${fontFamily}; }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;

    await fs.writeFile(path.join(frontendDir, 'public/index.html'), html);
    return 'frontend/public/index.html';
  }

  async generateFrontendIndex(frontendDir) {
    const indexJs = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import App from './App';
import './index.css';

// i18n setup
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            create: 'Create',
            search: 'Search',
            loading: 'Loading...',
            noData: 'No data available',
            confirm: 'Confirm',
            back: 'Back',
            next: 'Next',
            submit: 'Submit',
            actions: 'Actions',
            status: 'Status',
            yes: 'Yes',
            no: 'No'
          },
          auth: {
            signIn: 'Sign In',
            signUp: 'Sign Up',
            signOut: 'Sign Out',
            email: 'Email',
            password: 'Password',
            forgotPassword: 'Forgot password?',
            noAccount: "Don't have an account?",
            hasAccount: 'Already have an account?'
          },
          nav: {
            home: 'Home',
            dashboard: 'Dashboard',
            settings: 'Settings',
            profile: 'Profile'
          },
          pages: {
            notFound: 'Page Not Found',
            goToDashboard: 'Go to Dashboard',
            underConstruction: 'Page under construction.',
            noPages: 'No pages configured.',
            accessDenied: 'Access Denied',
            accessDeniedMsg: 'You need the "{{role}}" role to view this page.',
            welcome: 'Welcome to {{appName}}'
          }
        }
      }
    },
      es: {
        translation: {
          common: {
            save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
            create: 'Crear', search: 'Buscar', loading: 'Cargando...', noData: 'Sin datos',
            confirm: 'Confirmar', back: 'Volver', next: 'Siguiente', submit: 'Enviar',
            actions: 'Acciones', status: 'Estado', yes: 'Si', no: 'No'
          },
          auth: {
            signIn: 'Iniciar sesion', signUp: 'Registrarse', signOut: 'Cerrar sesion',
            email: 'Correo', password: 'Contrasena', forgotPassword: 'Olvidaste tu contrasena?',
            noAccount: 'No tienes cuenta?', hasAccount: 'Ya tienes cuenta?'
          },
          nav: { home: 'Inicio', dashboard: 'Panel', settings: 'Configuracion', profile: 'Perfil' },
          pages: {
            notFound: 'Pagina no encontrada', goToDashboard: 'Ir al panel',
            underConstruction: 'Pagina en construccion.', noPages: 'Sin paginas configuradas.',
            accessDenied: 'Acceso denegado', accessDeniedMsg: 'Necesitas el rol "{{role}}" para ver esta pagina.',
            welcome: 'Bienvenido a {{appName}}'
          }
        }
      },
      fr: {
        translation: {
          common: {
            save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
            create: 'Creer', search: 'Rechercher', loading: 'Chargement...', noData: 'Aucune donnee',
            confirm: 'Confirmer', back: 'Retour', next: 'Suivant', submit: 'Soumettre',
            actions: 'Actions', status: 'Statut', yes: 'Oui', no: 'Non'
          },
          auth: {
            signIn: 'Se connecter', signUp: "S'inscrire", signOut: 'Se deconnecter',
            email: 'Email', password: 'Mot de passe', forgotPassword: 'Mot de passe oublie?',
            noAccount: "Pas de compte?", hasAccount: 'Deja un compte?'
          },
          nav: { home: 'Accueil', dashboard: 'Tableau de bord', settings: 'Parametres', profile: 'Profil' },
          pages: {
            notFound: 'Page non trouvee', goToDashboard: 'Aller au tableau de bord',
            underConstruction: 'Page en construction.', noPages: 'Aucune page configuree.',
            accessDenied: 'Acces refuse', accessDeniedMsg: 'Vous avez besoin du role "{{role}}" pour voir cette page.',
            welcome: 'Bienvenue sur {{appName}}'
          }
        }
      }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);`;

    await fs.writeFile(path.join(frontendDir, 'src/index.js'), indexJs);
    return 'frontend/src/index.js';
  }

  async generateAppJs(frontendDir) {
    const appName = this.application.name || 'App';

    // Get layout values from LLM-generated theme, with sensible defaults
    const layout = this.generatedTheme?.layout || {};
    const layoutType = layout.type || 'sidebar'; // 'sidebar' | 'topnav' | 'hybrid'
    const sidebarWidth = layout.sidebarWidth || '256px';
    const headerHeight = layout.headerHeight || '64px';
    const containerMaxWidth = layout.containerMaxWidth || '1280px';
    const contentPadding = layout.contentPadding || '24px';

    // Compute layout-specific app shell based on DesignExpert layout type
    let appShellReturn;
    if (layoutType === 'topnav') {
      appShellReturn = `  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50" style={{ height: '${headerHeight}' }}>
        <div className="flex items-center justify-between h-full px-6" style={{ maxWidth: '${containerMaxWidth}', margin: '0 auto' }}>
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-bold tracking-tight">${appName}</h2>
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavigation.filter(n => n.type !== 'section').map((item, index) => (
                <Link key={index} to={item.route} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap", isActiveRoute(item.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <Icon name={item.icon} /><span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationCenter notifications={notifications} unreadCount={unreadCount} onMarkRead={() => setUnreadCount(0)} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden lg:block">{user?.name || user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto" style={{ padding: '${contentPadding}' }}>
        <div style={{ maxWidth: '${containerMaxWidth}', margin: '0 auto' }}>
        <Breadcrumb items={buildBreadcrumbs()} />
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="flex flex-col items-center justify-center h-full"><h2 className="text-2xl font-semibold">{t('pages.welcome', { appName: '${appName}' })}</h2><p className="text-muted-foreground mt-2">{t('pages.noPages')}</p></div>} />
          {pages.map(page => <Route key={page.id} path={page.route} element={<ErrorBoundary><PageRenderer page={page} forms={forms} user={user} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} socket={socket} /></ErrorBoundary>} />)}
          {filteredNavigation.filter(n => !n.pageExists && n.type !== 'section').map((item, i) => <Route key={\`fb-\${i}\`} path={item.route} element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{item.label}</h2><p className="text-muted-foreground mt-2">{t('pages.underConstruction')}</p></div>} />)}
${figmaRoutes}
          <Route path="*" element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{t('pages.notFound')}</h2><Link to="/" className="text-primary hover:underline mt-2">{t('pages.goToDashboard')}</Link></div>} />
        </Routes>
        </ErrorBoundary>
        </div>
      </main>
    </div>
  );`;
    } else if (layoutType === 'hybrid') {
      appShellReturn = `  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50" style={{ height: '${headerHeight}' }}>
        <div className="flex items-center justify-between h-full px-6">
          <h2 className="text-xl font-bold tracking-tight">${appName}</h2>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationCenter notifications={notifications} unreadCount={unreadCount} onMarkRead={() => setUnreadCount(0)} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden lg:block">{user?.name || user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="border-r bg-card flex flex-col shrink-0" style={{ width: '${sidebarWidth}' }}>
          <div className="flex-1 py-4 px-3 space-y-1 overflow-auto">
            {filteredNavigation.map((item, index) => {
              if (item.type === 'section') {
                const sectionEnd = filteredNavigation.findIndex((n, i) => i > index && n.type === 'section');
                const children = filteredNavigation.slice(index + 1, sectionEnd === -1 ? undefined : sectionEnd).filter(n => n.type !== 'section');
                if (children.length === 0) return null;
                return (
                  <NavGroup key={index} label={item.label} defaultOpen={children.some(c => isActiveRoute(c.route))}>
                    {children.map((child, ci) => (
                      <Link key={ci} to={child.route} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActiveRoute(child.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                        <Icon name={child.icon} /><span>{child.label}</span>
                      </Link>
                    ))}
                  </NavGroup>
                );
              }
              const prevSection = filteredNavigation.slice(0, index).reverse().find(n => n.type === 'section');
              if (prevSection) return null;
              return (
                <Link key={index} to={item.route} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActiveRoute(item.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <Icon name={item.icon} /><span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <main className="flex-1 overflow-auto" style={{ padding: '${contentPadding}' }}>
          <div style={{ maxWidth: '${containerMaxWidth}', margin: '0 auto' }}>
          <Breadcrumb items={buildBreadcrumbs()} />
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="flex flex-col items-center justify-center h-full"><h2 className="text-2xl font-semibold">{t('pages.welcome', { appName: '${appName}' })}</h2><p className="text-muted-foreground mt-2">{t('pages.noPages')}</p></div>} />
            {pages.map(page => <Route key={page.id} path={page.route} element={<ErrorBoundary><PageRenderer page={page} forms={forms} user={user} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} socket={socket} /></ErrorBoundary>} />)}
            {filteredNavigation.filter(n => !n.pageExists && n.type !== 'section').map((item, i) => <Route key={\`fb-\${i}\`} path={item.route} element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{item.label}</h2><p className="text-muted-foreground mt-2">{t('pages.underConstruction')}</p></div>} />)}
${figmaRoutes}
            <Route path="*" element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{t('pages.notFound')}</h2><Link to="/" className="text-primary hover:underline mt-2">{t('pages.goToDashboard')}</Link></div>} />
          </Routes>
          </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );`;
    } else {
      // Default: sidebar layout with mobile drawer support
      appShellReturn = `  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Mobile hamburger */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card border shadow-sm">
        <List className="w-5 h-5" />
      </button>
      <nav className={\`border-r bg-card flex flex-col fixed md:relative z-40 h-full transition-transform duration-200 \${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}\`} style={{ width: '${sidebarWidth}' }}>
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">${appName}</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-accent"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 py-4 px-3 space-y-1 overflow-auto">
          {filteredNavigation.map((item, index) => {
            if (item.type === 'section') {
              const sectionEnd = filteredNavigation.findIndex((n, i) => i > index && n.type === 'section');
              const children = filteredNavigation.slice(index + 1, sectionEnd === -1 ? undefined : sectionEnd).filter(n => n.type !== 'section');
              if (children.length === 0) return null;
              return (
                <NavGroup key={index} label={item.label} defaultOpen={children.some(c => isActiveRoute(c.route))}>
                  {children.map((child, ci) => (
                    <Link key={ci} to={child.route} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActiveRoute(child.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                      <Icon name={child.icon} /><span>{child.label}</span>
                    </Link>
                  ))}
                </NavGroup>
              );
            }
            const prevSection = filteredNavigation.slice(0, index).reverse().find(n => n.type === 'section');
            if (prevSection) return null;
            return (
              <Link key={index} to={item.route} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActiveRoute(item.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.name || user?.email || 'User'}</p>
              {user?.role && <p className="text-xs text-muted-foreground capitalize">{user.role}</p>}
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <NotificationCenter notifications={notifications} unreadCount={unreadCount} onMarkRead={() => setUnreadCount(0)} />
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />{t('auth.signOut')}
          </Button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto" style={{ padding: '${contentPadding}' }}>
        <div style={{ maxWidth: '${containerMaxWidth}', margin: '0 auto' }}>
        <Breadcrumb items={buildBreadcrumbs()} />
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="flex flex-col items-center justify-center h-full"><h2 className="text-2xl font-semibold">{t('pages.welcome', { appName: '${appName}' })}</h2><p className="text-muted-foreground mt-2">{t('pages.noPages')}</p></div>} />
          {pages.map(page => <Route key={page.id} path={page.route} element={<ErrorBoundary><PageRenderer page={page} forms={forms} user={user} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} socket={socket} /></ErrorBoundary>} />)}
          {filteredNavigation.filter(n => !n.pageExists && n.type !== 'section').map((item, i) => <Route key={\`fb-\${i}\`} path={item.route} element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{item.label}</h2><p className="text-muted-foreground mt-2">{t('pages.underConstruction')}</p></div>} />)}
${figmaRoutes}
          <Route path="*" element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{t('pages.notFound')}</h2><Link to="/" className="text-primary hover:underline mt-2">{t('pages.goToDashboard')}</Link></div>} />
        </Routes>
        </ErrorBoundary>
        </div>
      </main>
    </div>
  );`;
    }

    // Build Figma page imports and routes if precise components are available
    // Use precisePageConfigs for routes (matches navigationGraph routes baked into components)
    let figmaImports = '';
    let figmaRoutes = '';
    let figmaNavItems = '';
    const preciseComps = this.application.metadata?.preciseComponents;
    const pageConfigs = this.application.metadata?.precisePageConfigs;
    if (preciseComps && preciseComps.length > 0) {
      // Build a lookup from componentName -> pageConfig for route/name info
      const configByComponent = {};
      if (pageConfigs) {
        for (const pc of pageConfigs) {
          if (pc.component) configByComponent[pc.component] = pc;
        }
      }

      const figmaPages = preciseComps.filter(c => c.filePath && c.componentName);
      figmaImports = figmaPages.map(c => {
        const importPath = './' + c.filePath.replace(/^src\//, '').replace(/\.jsx?$/, '');
        return `import ${c.componentName} from '${importPath}';`;
      }).join('\n');

      figmaRoutes = figmaPages.map(c => {
        // Use pageConfig route (matches navigationGraph) or fallback to derived route
        const pc = configByComponent[c.componentName];
        const route = pc?.route || ('/' + (c.componentName || 'page').replace(/^FigmaPage_/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        return `          <Route path="${route}" element={<ErrorBoundary><${c.componentName} /></ErrorBoundary>} />`;
      }).join('\n');

      figmaNavItems = figmaPages.map(c => {
        const pc = configByComponent[c.componentName];
        const route = pc?.route || ('/' + (c.componentName || 'page').replace(/^FigmaPage_/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        const label = pc?.name || (c.componentName || 'Page').replace(/^FigmaPage_/, '').replace(/([A-Z])/g, ' $1').trim();
        return `{ label: '${label}', route: '${route}', icon: 'file', pageExists: true }`;
      }).join(',\n          ');
    }

    const appJs = `import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageRenderer from './components/PageRenderer';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationCenter from './components/NotificationCenter';
import LanguageSwitcher from './components/LanguageSwitcher';
import { formsApi, setAuthToken, workflowApi, notificationsApi } from './api/client';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import './App.css';
import { LayoutDashboard, Home, PlusCircle, List, BarChart3, HelpCircle, ShoppingCart, BookOpen, User, Users, Settings, Search, Bell, Calendar, FolderOpen, FileText, DollarSign, AlertTriangle, Package, CheckSquare, Ticket, Circle, ChevronDown, ChevronRight, LogOut, Globe } from 'lucide-react';
${figmaImports}

// Socket.IO for real-time
let socket = null;
try {
  const io = require('socket.io-client');
  socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
} catch (e) {}

// Icon component for navigation using Lucide React
const iconMap = {
  home: Home, dashboard: LayoutDashboard, book: BookOpen, books: BookOpen,
  users: Users, user: User, settings: Settings, list: List,
  cart: ShoppingCart, calendar: Calendar, bell: Bell, search: Search,
  plus: PlusCircle, chart: BarChart3, folder: FolderOpen, file: FileText,
  money: DollarSign, alert: AlertTriangle, warning: AlertTriangle, package: Package,
  inventory: Package, checkout: CheckSquare, help: HelpCircle, ticket: Ticket,
  globe: Globe, default: Circle
};
const Icon = ({ name }) => {
  const LucideIcon = iconMap[name] || iconMap.default;
  return <LucideIcon className="nav-icon w-4 h-4" />;
};

// Breadcrumb component
const Breadcrumb = ({ items }) => (
  <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span>/</span>}
        {item.route ? (
          <Link to={item.route} className="hover:text-foreground transition-colors">{item.label}</Link>
        ) : (
          <span className="text-foreground font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

// Collapsible nav group for multi-level navigation
const NavGroup = ({ label, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-accent/50 rounded-lg transition-colors">
        <span>{label}</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {isOpen && <div className="ml-2 space-y-0.5">{children}</div>}
    </div>
  );
};

// Protected Route wrapper with RBAC
const ProtectedRoute = ({ children, isAuthenticated, requiredRole, userRole }) => {
  const { t } = useTranslation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
    return <div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{t('pages.accessDenied')}</h2><p className="text-muted-foreground mt-2">{t('pages.accessDeniedMsg', { role: requiredRole })}</p></div>;
  }
  return children;
};

function App() {
  const { t } = useTranslation();
  const [pages, setPages] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigation, setNavigation] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Workflow state for navigation control
  const [workflowInstance, setWorkflowInstance] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [workflowNavigation, setWorkflowNavigation] = useState(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check for existing auth on mount (including OAuth redirect tokens)
  useEffect(() => {
    // Check for OAuth token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('token');
    if (oauthToken) {
      setAuthToken(oauthToken);
      // Decode user from token
      try {
        const payload = JSON.parse(atob(oauthToken.split('.')[1]));
        setUser(payload);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(payload));
      } catch (e) {}
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const token = localStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user');
      if (token && savedUser) {
        setIsAuthenticated(true);
        setUser(JSON.parse(savedUser));
        setAuthToken(token);
      }
    }
    setAuthChecked(true);
  }, []);

  // Real-time notifications via Socket.IO
  useEffect(() => {
    if (!socket) return;
    socket.on('data-change', (event) => {
      // Refresh page data when relevant data changes
      setNotifications(prev => [{
        id: Date.now(),
        title: \`\${event.model} \${event.action}d\`,
        message: \`A record was \${event.action}d in \${event.model}\`,
        type: 'info',
        isRead: false,
        createdAt: event.timestamp
      }, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    });
    socket.on('workflow-change', (event) => {
      setNotifications(prev => [{
        id: Date.now(),
        title: 'Workflow Update',
        message: \`Workflow instance \${event.action === 'POST' ? 'started' : 'updated'}\`,
        type: 'info',
        isRead: false,
        createdAt: event.timestamp
      }, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    });
    return () => { socket.off('data-change'); socket.off('workflow-change'); };
  }, []);

  // Always load pages first to determine if there are auth pages to show
  useEffect(() => { loadAppData(); }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const getIconForRoute = (route) => {
    if (route.includes('dashboard')) return 'dashboard';
    if (route.includes('submit') || route.includes('new') || route.includes('create')) return 'plus';
    if (route.includes('ticket') || route.includes('list')) return 'list';
    if (route.includes('report') || route.includes('analytics')) return 'chart';
    if (route.includes('help') || route.includes('faq')) return 'help';
    if (route.includes('checkout')) return 'checkout';
    if (route.includes('cart')) return 'cart';
    if (route.includes('book') || route.includes('catalog')) return 'book';
    if (route.includes('user') || route.includes('profile')) return 'user';
    if (route.includes('setting')) return 'settings';
    return 'default';
  };

  // Workflow navigation handler - navigates based on workflow response
  const handleWorkflowNavigation = useCallback((navInfo) => {
    if (!navInfo) return;

    setWorkflowNavigation(navInfo);

    // If workflow specifies a page to navigate to
    if (navInfo.nextPageId) {
      const targetPage = pages.find(p => p.id === navInfo.nextPageId || p.name === navInfo.nextPageId);
      if (targetPage) {
        navigate(targetPage.route);
        return;
      }
    }

    // If workflow completed, navigate to completion page or dashboard
    if (navInfo.workflowComplete) {
      if (navInfo.completionPageId) {
        const completionPage = pages.find(p => p.id === navInfo.completionPageId);
        if (completionPage) {
          navigate(completionPage.route);
          return;
        }
      }
      // Clear workflow state and go to dashboard
      setWorkflowInstance(null);
      setCurrentTask(null);
      navigate('/dashboard');
    }

    // If there's a next task, update current task
    if (navInfo.nextTask) {
      setCurrentTask(navInfo.nextTask);
    }
  }, [pages, navigate]);

  // Start a workflow and handle navigation
  const startWorkflow = useCallback(async (workflowId, inputData = {}) => {
    try {
      const response = await workflowApi.start(workflowId, inputData);
      const { instance, navigation: navInfo } = response.data || response;

      setWorkflowInstance(instance);

      // Navigate to initial page if specified
      if (navInfo?.initialPageId) {
        const initialPage = pages.find(p => p.id === navInfo.initialPageId);
        if (initialPage) {
          navigate(initialPage.route);
        }
      }

      return { instance, navigation: navInfo };
    } catch (error) {
      console.error('Failed to start workflow:', error);
      throw error;
    }
  }, [pages, navigate]);

  // Complete a task and handle navigation
  const completeTask = useCallback(async (taskId, formData) => {
    if (!workflowInstance) {
      console.error('No active workflow instance');
      return;
    }

    try {
      const response = await workflowApi.completeTask(workflowInstance.id, taskId, formData);
      const { instance, navigation: navInfo } = response.data || response;

      setWorkflowInstance(instance);
      handleWorkflowNavigation(navInfo);

      return { instance, navigation: navInfo };
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  }, [workflowInstance, handleWorkflowNavigation]);

  // Form submission handler that integrates with workflow
  const handleFormSubmit = useCallback(async (formId, formData, options = {}) => {
    // If in workflow context with a current task, complete the task
    if (workflowInstance && currentTask) {
      return completeTask(currentTask.taskId, formData);
    }

    // If workflow should be started on form submit
    if (options.startWorkflow && options.workflowId) {
      return startWorkflow(options.workflowId, formData);
    }

    // Otherwise, just submit the form normally
    try {
      const response = await formsApi.submit(formId, formData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit form:', error);
      throw error;
    }
  }, [workflowInstance, currentTask, completeTask, startWorkflow]);

  const loadAppData = async () => {
    try {
      const [pagesRes, formsRes] = await Promise.all([
        fetch('/api/resources/pages').then(r => r.json()),
        formsApi.list().catch(() => ({ data: [] }))
      ]);
      const pagesData = pagesRes.data || pagesRes || [];
      const formsData = formsRes.data || [];
      setPages(pagesData);
      setForms(formsData);

      // Build navigation from ALL pages, grouped by role/section
      const mainPages = pagesData.filter(p => !p.route.includes(':'));

      // Detect role-based sections from route prefixes
      const rolePatterns = [
        { key: 'customer', patterns: ['/submit', '/my-', '/customer'], label: 'Customer' },
        { key: 'agent', patterns: ['/agent'], label: 'Agent' },
        { key: 'manager', patterns: ['/manager', '/reports', '/admin'], label: 'Manager' },
        { key: 'staff', patterns: ['/staff'], label: 'Staff' }
      ];

      // Check if app has role-based pages
      const hasRoleBasedNav = rolePatterns.some(role =>
        mainPages.some(p => role.patterns.some(pat => p.route.includes(pat)))
      );

      let navItems = [];

      if (hasRoleBasedNav) {
        // Group by role
        rolePatterns.forEach(role => {
          const rolePages = mainPages.filter(p =>
            role.patterns.some(pat => p.route.includes(pat))
          );
          if (rolePages.length > 0) {
            navItems.push({ type: 'section', label: role.label });
            rolePages.forEach(page => {
              navItems.push({
                label: page.title || page.name.replace(/Page$/, ''),
                route: page.route,
                icon: getIconForRoute(page.route),
                pageExists: true
              });
            });
          }
        });
        // Add uncategorized pages
        const categorizedRoutes = new Set(navItems.filter(n => n.route).map(n => n.route));
        const uncategorized = mainPages.filter(p => !categorizedRoutes.has(p.route));
        if (uncategorized.length > 0) {
          uncategorized.forEach(page => {
            navItems.push({
              label: page.title || page.name.replace(/Page$/, ''),
              route: page.route,
              icon: getIconForRoute(page.route),
              pageExists: true
            });
          });
        }
      } else {
        // Flat navigation for simpler apps
        navItems = mainPages.map(p => ({
          label: p.title || p.name.replace(/Page$/, ''),
          route: p.route,
          icon: getIconForRoute(p.route),
          pageExists: true
        }));
      }

      // Add Figma page navigation entries if present
      const figmaNav = [${figmaNavItems}];
      if (figmaNav.length > 0) {
        navItems.push({ type: 'section', label: 'Figma Pages' });
        navItems.push(...figmaNav);
      }

      setNavigation(navItems);
    } catch (error) {
      console.error('Error loading app data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isActiveRoute = (navRoute) => {
    if (location.pathname === navRoute) return true;
    if (location.pathname === '/' && navRoute === '/dashboard') return true;
    if (navRoute !== '/' && location.pathname.startsWith(navRoute)) return true;
    return false;
  };

  // Show loading while checking auth
  if (!authChecked) {
    return <div className="flex items-center justify-center h-screen bg-background"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-muted-foreground">{t('common.loading')}</p></div></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-muted-foreground">Loading ${appName}...</p></div></div>;
  }

  // Separate auth pages from protected pages based on MoE-generated metadata
  // Include pages with 'login', 'register', 'forgot-password', 'reset-password' in route as auth pages
  // This allows /admin/login and similar routes to work for unauthenticated users
  const isAuthPage = (p) => {
    if (p.type === 'auth' || p.pageAssociation?.requiresAuth === false) return true;
    const route = (p.route || '').toLowerCase();
    const authRoutePatterns = ['/login', '/register', '/signup', '/forgot-password', '/reset-password', '/auth'];
    return authRoutePatterns.some(pattern => route.includes(pattern) || route.endsWith(pattern));
  };
  const authPages = pages.filter(isAuthPage);
  const protectedPages = pages.filter(p => !isAuthPage(p));

  // Find entry point - prioritize isEntryPoint flag, then auth login, then dashboard
  const entryPointPage = pages.find(p => p.pageAssociation?.isEntryPoint === true);
  const loginPage = authPages.find(p => p.name?.toLowerCase().includes('login') || p.route?.includes('login'));
  const dashboardPage = protectedPages.find(p => p.route === '/dashboard') ||
    protectedPages.find(p => p.name?.toLowerCase().includes('dashboard')) ||
    protectedPages.find(p => !p.route?.includes(':')) ||
    protectedPages[0];

  // If not authenticated, show auth pages
  if (!isAuthenticated && authPages.length > 0) {
    const authEntryPoint = entryPointPage || loginPage || authPages[0];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ErrorBoundary>
        <Routes>
          {authPages.map(page => (
            <Route
              key={page.id}
              path={page.route}
              element={<ErrorBoundary><PageRenderer page={page} forms={forms} onAuthSuccess={handleLogin} /></ErrorBoundary>}
            />
          ))}
          <Route path="*" element={<Navigate to={authEntryPoint?.route || '/login'} replace />} />
        </Routes>
        </ErrorBoundary>
      </div>
    );
  }

  const defaultPage = dashboardPage || pages[0];

  // Build breadcrumbs from current route
  const buildBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', route: '/' }];
    let path = '';
    parts.forEach((part, i) => {
      path += '/' + part;
      const page = pages.find(p => p.route === path);
      crumbs.push({
        label: page?.title || part.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
        route: i < parts.length - 1 ? path : null
      });
    });
    return crumbs;
  };

  // Filter navigation by user role (RBAC)
  const filteredNavigation = navigation.filter(item => {
    if (item.type === 'section') return true;
    if (!item.requiredRole) return true;
    if (user?.role === 'admin') return true;
    return user?.role === item.requiredRole;
  });

${appShellReturn}
}

export default App;`;

    await fs.writeFile(path.join(frontendDir, 'src/App.js'), appJs);
    return 'frontend/src/App.js';
  }

  async generateAppCss(frontendDir) {
    // Use generated CSS from DesignExpert if available
    // Check metadata (primary), resources, and direct property for designAnalysis
    console.log('[ApplicationGenerator] Checking for designAnalysis in:', {
      hasMetadata: !!this.application.metadata,
      hasMetadataDesign: !!this.application.metadata?.designAnalysis,
      hasDirectDesign: !!this.application.designAnalysis,
      hasResourcesDesign: !!this.application.resources?.designAnalysis,
      hasTheme: !!this.application.theme
    });

    const designAnalysis = this.application.metadata?.designAnalysis ||
                           this.application.designAnalysis ||
                           this.application.resources?.designAnalysis ||
                           {};
    if (designAnalysis.generatedCSS) {
      const currentLayoutType = this.generatedTheme?.layout?.type || 'sidebar';
      // If we have the design system and layout type differs from default sidebar,
      // regenerate CSS with correct layout config so nav CSS matches the app shell
      if (currentLayoutType !== 'sidebar' && designAnalysis.designSystem) {
        console.log(`[ApplicationGenerator] Regenerating DesignExpert CSS for layout type: ${currentLayoutType}`);
        const DesignExpert = require('../services/moe/experts/DesignExpert');
        const designExpert = new DesignExpert();
        const layoutAwareCSS = designExpert.generateCSSFromDesignSystem(designAnalysis.designSystem, {
          type: currentLayoutType,
          sidebarWidth: this.generatedTheme?.layout?.sidebarWidth,
          headerHeight: this.generatedTheme?.layout?.headerHeight
        });
        await fs.writeFile(path.join(frontendDir, 'src/App.css'), layoutAwareCSS);
        return 'frontend/src/App.css';
      }
      console.log('[ApplicationGenerator] Using DesignExpert generated CSS from:', {
        source: designAnalysis.source || 'unknown',
        theme: designAnalysis.themeName || 'default',
        cssLength: designAnalysis.generatedCSS.length
      });
      await fs.writeFile(path.join(frontendDir, 'src/App.css'), designAnalysis.generatedCSS);
      return 'frontend/src/App.css';
    }

    // Fallback to default CSS if no generated CSS available
    console.log('[ApplicationGenerator] Using default CSS (no DesignExpert CSS available)');
    const t = mergeWithTheme(this.generatedTheme);
    const c = t.colors;
    const fallbackLayoutType = t.layout.type;
    const fallbackSidebarWidth = t.layout.sidebarWidth;
    const fallbackHeaderHeight = t.layout.headerHeight;
    const sc = t.statusColors;
    const css = `/* Global Styles */
* {
  box-sizing: border-box;
}

body {
  font-family: ${t.typography.fontFamily};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
  background: ${c.background};
  color: ${c.foreground};
}

/* App Styles */
.app {
  display: flex;
  ${fallbackLayoutType === 'topnav' || fallbackLayoutType === 'hybrid' ? 'flex-direction: column;' : ''}
  min-height: 100vh;
}

${fallbackLayoutType === 'topnav' || fallbackLayoutType === 'hybrid' ? `
.app-header {
  height: ${fallbackHeaderHeight};
  background: ${c.card};
  color: ${c.cardForeground};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${t.spacing.xl};
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid ${c.border};
}

.app-header .logo h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.app-header nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-header .nav-link {
  display: flex;
  align-items: center;
  gap: ${t.spacing.sm};
  padding: ${t.spacing.sm} ${t.spacing.md};
  color: ${c.mutedForeground};
  text-decoration: none;
  border-radius: ${t.borderRadius.base};
  font-size: ${t.typography.fontSize.base};
  white-space: nowrap;
  transition: all ${t.transition.base};
}

.app-header .nav-link:hover {
  background: ${c.muted};
  color: ${c.foreground};
}

.app-header .nav-link.active {
  background: ${c.primary};
  color: ${c.primaryForeground};
}
` : ''}

${fallbackLayoutType !== 'topnav' ? `
.sidebar {
  width: ${fallbackSidebarWidth};
  background: ${c.card};
  color: ${c.cardForeground};
  padding: ${t.spacing.lg} 0;
  ${fallbackLayoutType === 'sidebar' ? 'position: fixed; height: 100vh;' : ''}
  overflow-y: auto;
  border-right: 1px solid ${c.border};
}

.logo {
  padding: 0 ${t.spacing.lg} ${t.spacing.lg};
  border-bottom: 1px solid ${c.border};
}

.logo h2 {
  font-size: ${t.typography.fontSize.xl};
  font-weight: ${t.typography.fontWeight.semibold};
}

.nav-links {
  padding: ${t.spacing.lg} 0;
}

.nav-link {
  display: block;
  padding: ${t.spacing.md} ${t.spacing.lg};
  color: ${c.mutedForeground};
  text-decoration: none;
  transition: all ${t.transition.base};
}

.nav-link:hover {
  background: ${c.muted};
  color: ${c.foreground};
}

.nav-section {
  padding: ${t.spacing.lg} ${t.spacing.lg} ${t.spacing.sm};
  font-size: ${t.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${c.mutedForeground};
}
` : ''}

.main-content {
  flex: 1;
  ${fallbackLayoutType === 'sidebar' ? `margin-left: ${fallbackSidebarWidth};` : 'margin-left: 0;'}
  padding: ${t.spacing.xl};
  background: ${c.background};
  min-height: ${fallbackLayoutType === 'sidebar' ? '100vh' : '0'};
}

/* Page Header */
.page-header {
  margin-bottom: ${t.spacing.xl};
}

.page-header h1 {
  font-size: ${t.typography.fontSize['3xl']};
  color: ${c.foreground};
  margin-bottom: ${t.spacing.sm};
}

.page-header p {
  color: ${c.mutedForeground};
}

/* Cards */
.card {
  background: ${c.card};
  border-radius: ${t.borderRadius.card};
  box-shadow: ${t.shadows.sm};
  padding: ${t.spacing.lg};
  margin-bottom: ${t.spacing.base};
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${t.spacing.base};
}

.card-title {
  font-size: ${t.typography.fontSize.lg};
  font-weight: ${t.typography.fontWeight.semibold};
  color: ${c.foreground};
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${t.spacing.base};
  margin-bottom: ${t.spacing.xl};
}

.stat-card {
  background: ${c.card};
  border-radius: ${t.borderRadius.card};
  padding: ${t.spacing.lg};
  box-shadow: ${t.shadows.sm};
}

.stat-value {
  font-size: ${t.typography.fontSize['4xl']};
  font-weight: ${t.typography.fontWeight.bold};
  color: ${c.primary};
}

.stat-label {
  color: ${c.mutedForeground};
  font-size: ${t.typography.fontSize.base};
  margin-top: ${t.spacing.xs};
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: ${t.spacing.md};
  text-align: left;
  border-bottom: 1px solid ${c.border};
}

.data-table th {
  background: ${c.background};
  font-weight: ${t.typography.fontWeight.semibold};
  color: ${c.mutedForeground};
  font-size: ${t.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tr:hover {
  background: ${c.background};
}

/* Buttons */
.btn {
  padding: ${t.spacing.sm} ${t.spacing.base};
  border-radius: ${t.borderRadius.button};
  font-size: ${t.typography.fontSize.base};
  font-weight: ${t.typography.fontWeight.medium};
  cursor: pointer;
  border: none;
  transition: all ${t.transition.base};
}

.btn-primary {
  background: ${c.primary};
  color: ${c.primaryForeground};
}

.btn-primary:hover {
  background: ${c.primaryHover};
}

.btn-secondary {
  background: ${c.muted};
  color: ${c.mutedForeground};
}

.btn-success {
  background: ${c.success};
  color: ${c.primaryForeground};
}

.btn-danger {
  background: ${c.destructive};
  color: ${c.destructiveForeground};
}

/* Forms */
.form-group {
  margin-bottom: ${t.spacing.base};
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: ${t.typography.fontWeight.medium};
  color: ${c.labelText};
  font-size: ${t.typography.fontSize.base};
}

.form-input {
  width: 100%;
  padding: ${t.spacing.inputPadding};
  border: 1px solid ${c.inputBorder};
  border-radius: ${t.borderRadius.input};
  font-size: ${t.typography.fontSize.base};
  transition: border-color ${t.transition.base};
}

.form-input:focus {
  outline: none;
  border-color: ${c.focus};
  box-shadow: 0 0 0 3px ${c.focus}1a;
}

.form-select {
  width: 100%;
  padding: ${t.spacing.inputPadding};
  border: 1px solid ${c.inputBorder};
  border-radius: ${t.borderRadius.input};
  font-size: ${t.typography.fontSize.base};
  background: ${c.card};
}

.form-textarea {
  width: 100%;
  padding: ${t.spacing.inputPadding};
  border: 1px solid ${c.inputBorder};
  border-radius: ${t.borderRadius.input};
  font-size: ${t.typography.fontSize.base};
  min-height: 100px;
  resize: vertical;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: ${c.card};
  border-radius: ${t.borderRadius.modal};
  padding: ${t.spacing.xl};
  max-width: ${t.layout.modalMaxWidth};
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${t.spacing.lg};
}

.modal-title {
  font-size: ${t.typography.fontSize.xl};
  font-weight: ${t.typography.fontWeight.semibold};
}

.modal-close {
  background: none;
  border: none;
  font-size: ${t.typography.fontSize['3xl']};
  cursor: pointer;
  color: ${c.mutedForeground};
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: ${t.spacing.buttonGap};
  margin-top: ${t.spacing.xl};
}

/* Workflow Status */
.status-badge {
  display: inline-block;
  padding: ${t.components.badge.padding};
  border-radius: ${t.borderRadius.badge};
  font-size: ${t.components.badge.fontSize};
  font-weight: ${t.typography.fontWeight.medium};
}

.status-running { background: ${sc.running.bg}; color: ${sc.running.text}; }
.status-completed { background: ${sc.completed.bg}; color: ${sc.completed.text}; }
.status-failed { background: ${sc.failed.bg}; color: ${sc.failed.text}; }
.status-pending { background: ${sc.pending.bg}; color: ${sc.pending.text}; }

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
}

/* Loading */
.loading {
  text-align: center;
  padding: 40px;
  color: ${c.mutedForeground};
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: ${c.mutedForeground};
}

.empty-state h3 {
  margin-bottom: ${t.spacing.sm};
  color: ${c.labelText};
}

/* App Loading */
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: ${c.background};
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid ${c.border};
  border-top-color: ${c.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: ${t.spacing.base};
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Navigation Icons */
.nav-icon {
  margin-right: ${t.spacing.md};
  font-size: ${t.typography.fontSize.lg};
}

.nav-link.active {
  background: color-mix(in srgb, ${c.foreground} 20%, transparent);
  color: ${c.primaryForeground};
  border-left: 3px solid ${c.primary};
}

/* Page Container */
.page-container {
  max-width: ${this.generatedTheme?.layout?.containerMaxWidth || '1280px'};
}

.page-description {
  color: ${c.mutedForeground};
  margin-top: ${t.spacing.sm};
}

/* Page Sections */
.page-header-section {
  margin-bottom: ${t.spacing.xl};
}

.page-main-section {
  display: grid;
  gap: ${t.spacing.xl};
}

.page-sidebar-section {
  background: ${c.muted};
  padding: ${t.spacing.lg};
  border-radius: ${t.borderRadius.card};
}

/* Page Cards */
.page-card {
  background: ${c.card};
  border-radius: ${t.borderRadius.lg};
  padding: ${t.spacing.xl};
  box-shadow: ${t.shadows.sm};
  border: 1px solid ${c.border};
  margin-bottom: ${t.spacing.base};
}

.page-card .card-title {
  font-size: ${t.typography.fontSize.xl};
  font-weight: ${t.typography.fontWeight.semibold};
  color: ${c.foreground};
  margin-bottom: ${t.spacing.sm};
}

.page-card .card-description {
  color: ${c.helperText};
  font-size: ${t.typography.fontSize.base};
  margin-bottom: ${t.spacing.base};
}

/* Page Tables */
.page-table {
  background: ${c.card};
  border-radius: ${t.borderRadius.lg};
  padding: ${t.spacing.xl};
  box-shadow: ${t.shadows.sm};
  border: 1px solid ${c.border};
}

.table-title {
  font-size: ${t.typography.fontSize.lg};
  font-weight: ${t.typography.fontWeight.semibold};
  margin-bottom: ${t.spacing.base};
}

/* Metric Cards */
.metric-card {
  background: ${c.card};
  border-radius: ${t.borderRadius.lg};
  padding: ${t.spacing.lg};
  box-shadow: ${t.shadows.sm};
  border: 1px solid ${c.border};
  text-align: center;
}

.metric-value {
  font-size: ${t.typography.fontSize['5xl']};
  font-weight: ${t.typography.fontWeight.bold};
  color: ${c.primary};
  margin-bottom: ${t.spacing.xs};
}

.metric-label {
  color: ${c.mutedForeground};
  font-size: ${t.typography.fontSize.base};
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.badge-default { background: ${c.muted}; color: ${c.secondaryHover}; }
.badge-primary { background: ${sc.info.bg}; color: ${sc.info.text}; }
.badge-success { background: ${sc.success.bg}; color: ${sc.success.text}; }
.badge-warning { background: ${sc.warning.bg}; color: ${sc.warning.text}; }
.badge-danger { background: ${sc.error.bg}; color: ${sc.error.text}; }

/* Modern Form Input Focus States */
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: ${c.ring} !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, ${c.ring} 10%, transparent);
}

/* Button Hover/Active States */
button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: ${t.shadows.cardHover};
}

button:not(:disabled):active {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Card Hover Effect */
.page-card:hover {
  box-shadow: ${t.shadows.cardHover};
  transition: box-shadow ${t.transition.base};
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: ${c.muted};
  border-radius: ${t.borderRadius.xs};
}

::-webkit-scrollbar-thumb {
  background: ${c.input};
  border-radius: ${t.borderRadius.xs};
}

::-webkit-scrollbar-thumb:hover {
  background: ${c.mutedForeground};
}

/* Table Row Hover */
.data-table tbody tr {
  transition: background-color ${t.transition.fast};
}

/* Responsive adjustments */
@media (max-width: 768px) {
  ${fallbackLayoutType !== 'topnav' ? `
  .sidebar {
    width: 60px;
    padding: 10px 0;
  }
  .logo h2, .nav-section, .nav-link span {
    display: none;
  }
  .main-content {
    ${fallbackLayoutType === 'sidebar' ? 'margin-left: 60px;' : ''}
  }
  ` : ''}
  ${fallbackLayoutType === 'topnav' || fallbackLayoutType === 'hybrid' ? `
  .app-header nav {
    display: none;
  }
  ` : ''}
}

/* Authentication Styles */
.auth-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${c.primary} 0%, color-mix(in srgb, ${c.primary} 60%, ${c.accent}) 100%);
  padding: ${t.spacing.lg};
}

.auth-container {
  width: 100%;
  max-width: 420px;
}

.auth-card {
  background: ${c.card};
  border-radius: ${t.borderRadius.xl};
  padding: ${t.spacing['3xl']};
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.auth-header {
  text-align: center;
  margin-bottom: ${t.spacing['2xl']};
}

.auth-header h1 {
  font-size: ${t.typography.fontSize['4xl']};
  font-weight: ${t.typography.fontWeight.bold};
  color: ${c.foreground};
  margin-bottom: ${t.spacing.sm};
}

.auth-header p {
  color: ${c.mutedForeground};
  font-size: ${t.typography.fontSize.md};
}

.auth-error {
  background: ${sc.error.bg};
  color: ${c.destructive};
  padding: ${t.spacing.md} ${t.spacing.base};
  border-radius: ${t.borderRadius.card};
  margin-bottom: ${t.spacing.lg};
  font-size: ${t.typography.fontSize.base};
  border: 1px solid color-mix(in srgb, ${c.destructive} 30%, transparent);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: ${t.spacing.lg};
}

.auth-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form label {
  font-size: ${t.typography.fontSize.base};
  font-weight: ${t.typography.fontWeight.medium};
  color: ${c.labelText};
}

.auth-form input {
  padding: ${t.spacing.md} ${t.spacing.base};
  border: 1px solid ${c.inputBorder};
  border-radius: ${t.borderRadius.card};
  font-size: ${t.typography.fontSize.md};
  transition: all ${t.transition.base};
}

.auth-form input:focus {
  outline: none;
  border-color: ${c.primary};
  box-shadow: 0 0 0 3px color-mix(in srgb, ${c.primary} 10%, transparent);
}

.auth-links {
  display: flex;
  justify-content: flex-end;
}

.auth-links a {
  color: ${c.primary};
  font-size: ${t.typography.fontSize.base};
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}

.auth-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, ${c.primary} 0%, color-mix(in srgb, ${c.primary} 60%, ${c.accent}) 100%);
  color: ${c.primaryForeground};
  border: none;
  border-radius: ${t.borderRadius.card};
  font-size: ${t.typography.fontSize.lg};
  font-weight: ${t.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${t.transition.base};
  margin-top: ${t.spacing.sm};
}

.auth-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, ${c.primary} 40%, transparent);
}

.auth-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.auth-footer {
  text-align: center;
  margin-top: ${t.spacing.xl};
  padding-top: ${t.spacing.xl};
  border-top: 1px solid ${c.border};
}

.auth-footer p {
  color: ${c.mutedForeground};
  font-size: ${t.typography.fontSize.base};
}

.auth-footer a {
  color: ${c.primary};
  font-weight: ${t.typography.fontWeight.medium};
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.auth-divider {
  position: relative;
  text-align: center;
  margin: ${t.spacing.xl} 0;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: ${c.border};
}

.auth-divider span {
  position: relative;
  background: ${c.card};
  padding: 0 ${t.spacing.base};
  color: ${c.mutedForeground};
  font-size: ${t.typography.fontSize.sm};
}

.auth-social {
  display: flex;
  gap: ${t.spacing.md};
  margin-bottom: ${t.spacing.sm};
}

.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${t.spacing.sm};
  padding: ${t.spacing.md} ${t.spacing.base};
  border: 1px solid ${c.border};
  border-radius: ${t.borderRadius.card};
  background: ${c.card};
  color: ${c.labelText};
  font-size: ${t.typography.fontSize.base};
  font-weight: ${t.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${t.transition.base};
}

.social-btn:hover {
  background: ${c.muted};
  border-color: ${c.inputBorder};
}

.google-btn:hover {
  border-color: ${c.info};
}

.github-btn:hover {
  border-color: ${c.foreground};
}

/* Sidebar Footer (Logout) */
.nav-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${t.spacing.base} ${t.spacing.lg};
  border-top: 1px solid ${c.border};
  background: color-mix(in srgb, ${c.card} 95%, ${c.foreground});
}

.user-info {
  margin-bottom: ${t.spacing.md};
}

.user-name {
  color: ${c.cardForeground};
  font-size: ${t.typography.fontSize.base};
  font-weight: ${t.typography.fontWeight.medium};
}

.logout-btn {
  width: 100%;
  padding: ${t.spacing.md};
  background: transparent;
  border: 1px solid ${c.border};
  color: ${c.mutedForeground};
  border-radius: ${t.borderRadius.base};
  cursor: pointer;
  font-size: ${t.typography.fontSize.base};
  transition: all ${t.transition.base};
}

.logout-btn:hover {
  background: ${c.muted};
  color: ${c.foreground};
  border-color: ${c.mutedForeground};
}`;

    await fs.writeFile(path.join(frontendDir, 'src/App.css'), css);
    return 'frontend/src/App.css';
  }

  async generateApiClient(frontendDir) {
    const apiClient = `import axios from 'axios';

// Use environment variable for API URL, fallback to relative /api path (for proxy)
const API_BASE_URL = process.env.REACT_APP_API_URL
  ? \`\${process.env.REACT_APP_API_URL}/api\`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to unwrap API responses
api.interceptors.response.use(
  response => {
    // API returns { success: true, workflows/forms/instances/data: [...] }
    // Unwrap the response for convenience
    const data = response.data;
    if (data && data.success) {
      // Return the actual data, not the wrapper
      if (data.workflows) return { data: data.workflows };
      if (data.forms) return { data: data.forms };
      if (data.instances) return { data: data.instances };
      if (data.instance) return { data: data.instance };
      if (data.workflow) return { data: data.workflow };
      if (data.data) return { data: data.data };
      if (data.statistics) return { data: { statistics: data.statistics } };
    }
    return response;
  },
  error => Promise.reject(error)
);

// Workflows API
export const workflowsApi = {
  list: () => api.get('/workflows'),
  get: (id) => api.get(\`/workflows/\${id}\`),
  start: (id, data) => api.post(\`/workflows/\${id}/start\`, data),
  getInstances: () => api.get('/instances'),
  getInstance: (instanceId) => api.get(\`/instances/\${instanceId}\`)
};

// Forms API
export const formsApi = {
  list: () => api.get('/resources/forms'),
  get: (id) => api.get('/resources/forms').then(res => ({
    data: (res.data || []).find(f => f.id === id)
  })),
  submit: (id, data) => api.post(\`/forms/\${id}/submit\`, data)
};

// Data API (generic CRUD for all data models)
export const dataApi = {
  list: (model) => api.get(\`/data/\${model}\`),
  get: (model, id) => api.get(\`/data/\${model}/\${id}\`),
  create: (model, data) => api.post(\`/data/\${model}\`, data),
  update: (model, id, data) => api.put(\`/data/\${model}/\${id}\`, data),
  delete: (model, id) => api.delete(\`/data/\${model}/\${id}\`)
};

// Execution Logs API
export const logsApi = {
  getStatistics: () => api.get('/execution-logs/statistics'),
  getHistory: (limit = 50) => api.get(\`/execution-logs/history?limit=\${limit}\`)
};

// Authentication API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, userData) => api.post('/auth/register', { email, password, ...userData }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/auth/profile'),
  refresh: () => api.post('/auth/refresh'),
  googleLogin: () => window.location.href = API_BASE_URL + '/auth/google',
  githubLogin: () => window.location.href = API_BASE_URL + '/auth/github'
};

// Files API
export const filesApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadMultiple: (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.post('/files/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  list: () => api.get('/files'),
  get: (id) => api.get(\`/files/\${id}\`),
  delete: (id) => api.delete(\`/files/\${id}\`),
  getUrl: (id) => \`\${API_BASE_URL}/files/\${id}\`
};

// PDF Export API
export const exportApi = {
  pdf: (model) => api.get(\`/export/\${model}/pdf\`, { responseType: 'blob' }),
  pdfRecord: (model, id) => api.get(\`/export/\${model}/\${id}/pdf\`, { responseType: 'blob' })
};

// Aggregation API
export const aggregateApi = {
  query: (model, params) => api.get(\`/data/\${model}/aggregate\`, { params })
};

// Notifications API
export const notificationsApi = {
  list: () => api.get('/data/notifications'),
  markRead: (id) => api.put(\`/data/notifications/\${id}\`, { is_read: true }),
  markAllRead: () => api.post('/notifications/mark-all-read')
};

// Payments API
export const paymentsApi = {
  createCheckout: (items) => api.post('/payments/create-checkout', { items })
};

// Workflow Navigation API - handles workflow execution with page navigation
export const workflowApi = {
  // Start a workflow and get initial navigation
  start: (workflowId, inputData = {}) => api.post(\`/workflows/\${workflowId}/start\`, inputData),

  // Get current instance state with navigation info
  getInstance: (instanceId) => api.get(\`/instances/\${instanceId}\`),

  // Complete a task and get next navigation
  completeTask: (instanceId, taskId, formData) =>
    api.post(\`/instances/\${instanceId}/complete\`, { taskId, ...formData }),

  // Get current task for an instance
  getCurrentTask: (instanceId) => api.get(\`/instances/\${instanceId}/task\`),

  // Claim a group task
  claimTask: (instanceId, taskId) => api.post(\`/instances/\${instanceId}/tasks/\${taskId}/claim\`),

  // Get workflow execution history
  getHistory: (instanceId) => api.get(\`/instances/\${instanceId}/history\`),

  // Resume a paused workflow instance
  resume: (instanceId, inputData = {}) => api.post(\`/instances/\${instanceId}/resume\`, inputData),

  // List all workflow instances (optionally filtered by status)
  listInstances: (status) => api.get(\`/instances\${status ? '?status=' + status : ''}\`),

  // List available workflows
  listWorkflows: () => api.get('/workflows'),

  // Cancel a workflow instance
  cancel: (instanceId, reason) => api.post(\`/instances/\${instanceId}/cancel\`, { reason })
};

export const tenantApi = {
  create: (data) => api.post('/tenants', data),
  list: () => api.get('/tenants'),
  get: (tenantId) => api.get(\`/tenants/\${tenantId}\`),
  update: (tenantId, data) => api.put(\`/tenants/\${tenantId}\`, data),
  remove: (tenantId) => api.delete(\`/tenants/\${tenantId}\`),
  addMember: (tenantId, userId, role) => api.post(\`/tenants/\${tenantId}/members\`, { userId, role }),
  listMembers: (tenantId) => api.get(\`/tenants/\${tenantId}/members\`),
  removeMember: (tenantId, userId) => api.delete(\`/tenants/\${tenantId}/members/\${userId}\`),
  switchTenant: (tenantId) => api.post(\`/tenants/\${tenantId}/switch\`)
};

// Add auth token to requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
    localStorage.setItem('authToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }
};

// Initialize token from localStorage
const savedToken = localStorage.getItem('authToken');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = \`Bearer \${savedToken}\`;
}

export default api;`;

    await fs.writeFile(path.join(frontendDir, 'src/api/client.js'), apiClient);
    return 'frontend/src/api/client.js';
  }

  async generateFrontendComponents(frontendDir) {
    const files = [];
    const componentsDir = path.join(frontendDir, 'src/components');

    // 1. FormRenderer component - with Shadcn inputs, validation, conditional fields
    const formRenderer = `import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function FormRenderer({ form, onSubmit, onCancel, initialData = {}, loading: externalLoading = false }) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
    }
  }, []);

  const fields = form?.fields || [];
  const steps = form?.steps || [];
  const hasSteps = steps.length > 0;

  const currentFields = hasSteps
    ? fields.filter(f => f.step === steps[currentStep]?.id || f.step === currentStep)
    : fields;

  const visibleFields = currentFields.filter(field => {
    if (!field.condition) return true;
    const { field: depField, operator, value: depValue } = field.condition;
    const current = formData[depField];
    switch (operator) {
      case 'equals': return current === depValue;
      case 'not_equals': return current !== depValue;
      case 'contains': return String(current || '').includes(depValue);
      case 'not_empty': return current != null && current !== '';
      default: return true;
    }
  });

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    if (errors[fieldName]) {
      setErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
    }
  };

  const validate = (fieldsToValidate) => {
    const newErrors = {};
    for (const field of fieldsToValidate) {
      const val = formData[field.name];
      if (field.required && (val === undefined || val === null || val === '')) {
        newErrors[field.name] = \`\${field.label || field.name} is required\`;
      }
      if (field.type === 'email' && val && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val)) {
        newErrors[field.name] = 'Please enter a valid email address';
      }
      if (field.minLength && val && String(val).length < field.minLength) {
        newErrors[field.name] = \`Must be at least \${field.minLength} characters\`;
      }
      if (field.maxLength && val && String(val).length > field.maxLength) {
        newErrors[field.name] = \`Must be at most \${field.maxLength} characters\`;
      }
      if (field.min != null && val != null && Number(val) < field.min) {
        newErrors[field.name] = \`Must be at least \${field.min}\`;
      }
      if (field.max != null && val != null && Number(val) > field.max) {
        newErrors[field.name] = \`Must be at most \${field.max}\`;
      }
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate(fields);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.fromEntries(Object.keys(newErrors).map(k => [k, true])));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const stepErrors = validate(visibleFields);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setTouched(Object.fromEntries(Object.keys(stepErrors).map(k => [k, true])));
      return;
    }
    setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  const renderField = (field) => {
    const value = formData[field.name];
    const error = touched[field.name] ? errors[field.name] : null;
    const fieldId = \`field-\${field.name}\`;

    const wrapper = (children) => (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={fieldId} className={cn("text-sm font-medium", error && "text-destructive")}>
          {field.label || field.name}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {children}
        {field.helperText && !error && (
          <p className="text-xs text-muted-foreground">{field.helperText}</p>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-destructive text-xs animate-slide-up">
            <AlertTriangle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );

    switch (field.type) {
      case 'textarea':
        return wrapper(
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        );

      case 'select':
      case 'dropdown':
        return wrapper(
          <Select value={value || ''} onValueChange={(v) => handleChange(field.name, v)}>
            <SelectTrigger id={fieldId} className={cn("w-full", error && "border-destructive")}>
              <SelectValue placeholder={\`Select \${field.label || field.name}...\`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt, i) => (
                <SelectItem key={i} value={String(opt.value || opt)}>
                  {opt.label || opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center gap-3 py-1">
            <Checkbox
              id={fieldId}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
            />
            <Label htmlFor={fieldId} className="text-sm font-normal cursor-pointer">
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
          </div>
        );

      case 'number':
        return wrapper(
          <Input
            id={fieldId}
            type="number"
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        );

      case 'date':
        return wrapper(
          <Input
            id={fieldId}
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        );

      case 'email':
        return wrapper(
          <Input
            id={fieldId}
            type="email"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || 'email@example.com'}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        );

      case 'password':
        return wrapper(
          <Input
            id={fieldId}
            type="password"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        );

      default:
        return wrapper(
          <Input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        );
    }
  };

  const isLoading = submitting || externalLoading;
  const isLastStep = !hasSteps || currentStep === steps.length - 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {hasSteps && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  i < currentStep ? "bg-primary text-primary-foreground" :
                  i === currentStep ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                  "bg-muted text-muted-foreground"
                )}>
                  {i < currentStep ? '\\u2713' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("flex-1 h-0.5 transition-colors", i < currentStep ? "bg-primary" : "bg-muted")} />
                )}
              </React.Fragment>
            ))}
          </div>
          {steps[currentStep]?.title && (
            <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
          )}
        </div>
      )}

      <div className="space-y-4">
        {visibleFields.map(field => {
          if (field.type === 'section') {
            return (
              <div key={field.name} className="pt-2">
                <h4 className="text-sm font-semibold text-foreground mb-1">{field.label}</h4>
                {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                <Separator className="mt-2" />
              </div>
            );
          }
          return renderField(field);
        })}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {hasSteps && currentStep > 0 && (
          <Button type="button" variant="outline" onClick={handleBack}>Back</Button>
        )}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        {hasSteps && !isLastStep ? (
          <Button type="button" onClick={handleNext}>Next</Button>
        ) : (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              form?.submitLabel || 'Submit'
            )}
          </Button>
        )}
      </div>
    </form>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'FormRenderer.js'), formRenderer);
    files.push('frontend/src/components/FormRenderer.js');

    // 2. DataTable component - with search, sort, pagination, row actions
    const dataTable = `import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';

export default function DataTable({ columns, data, onEdit, onDelete, onView, loading = false, searchable = true, sortable = true, paginated = true, pageSize: initialPageSize = 10 }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.name || col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = paginated ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const paginatedData = paginated ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;

  // Reset to page 1 when search changes
  React.useEffect(() => { setCurrentPage(1); }, [search]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="border rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3 border-b last:border-0">
              {columns.map((_, ci) => <Skeleton key={ci} className="h-5 flex-1 rounded" />)}
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">{sorted.length} record{sorted.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((col, i) => {
                const key = col.name || col.key;
                const isActive = sortKey === key;
                return (
                  <th
                    key={i}
                    className={\`text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 \${sortable ? 'cursor-pointer select-none hover:text-foreground transition-colors' : ''}\`}
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label || col.name || col.key}</span>
                      {sortable && (
                        <span className="text-muted-foreground/50">
                          {isActive ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : <ChevronsUpDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {(onView || onEdit || onDelete) && (
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-16"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.length > 0 ? paginatedData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-muted/30 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 text-sm">
                    {formatValue(row[col.name || col.key], col.type)}
                  </td>
                ))}
                {(onView || onEdit || onDelete) && (
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        {onView && <DropdownMenuItem onClick={() => onView(row)}><Eye className="w-4 h-4 mr-2" />View</DropdownMenuItem>}
                        {onEdit && <DropdownMenuItem onClick={() => onEdit(row)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(row)}>
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + (onView || onEdit || onDelete ? 1 : 0)} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">{search ? 'No matching records found.' : 'No records yet.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginated && sorted.length > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <Button key={page} variant={page === currentPage ? 'default' : 'outline'} size="sm" className="w-9" onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value, type) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;

  switch (type) {
    case 'date':
    case 'datetime':
      try { return new Date(value).toLocaleDateString(); } catch { return String(value); }
    case 'boolean':
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
    case 'status':
      const statusColors = { active: 'default', completed: 'default', pending: 'secondary', failed: 'destructive', cancelled: 'outline' };
      return <Badge variant={statusColors[String(value).toLowerCase()] || 'secondary'}>{String(value)}</Badge>;
    case 'json':
      return <span className="font-mono text-xs">{JSON.stringify(value).substring(0, 50)}...</span>;
    case 'number':
    case 'integer':
    case 'decimal':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    default:
      const str = String(value);
      return str.length > 80 ? str.substring(0, 80) + '...' : str;
  }
}`;

    await fs.writeFile(path.join(componentsDir, 'DataTable.js'), dataTable);
    files.push('frontend/src/components/DataTable.js');

    // 3. Modal component
    const modal = `import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'Modal.js'), modal);
    files.push('frontend/src/components/Modal.js');

    // 3.5. NotificationCenter component
    const notificationCenter = `import React, { useState } from 'react';
import { Bell } from 'lucide-react';

export default function NotificationCenter({ notifications = [], unreadCount = 0, onMarkRead }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (onMarkRead) onMarkRead(); }}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 bg-card border rounded-xl shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b font-semibold text-sm">Notifications</div>
          <div className="overflow-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
            ) : notifications.map((n, i) => (
              <div key={n.id || i} className="p-3 border-b last:border-0 hover:bg-accent/50 transition-colors">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'NotificationCenter.js'), notificationCenter);
    files.push('frontend/src/components/NotificationCenter.js');

    // 3.5b. LanguageSwitcher component
    const languageSwitcher = `import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Espanol', flag: 'ES' },
  { code: 'fr', label: 'Francais', flag: 'FR' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" title="Change language">
        <Globe className="w-4 h-4" />
        <span className="text-xs font-medium">{current.flag}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[140px] z-50">
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => changeLanguage(lang.code)} className={\`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors \${lang.code === i18n.language ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent'}\`}>
              <span className="text-xs font-mono w-5">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}`;
    await fs.writeFile(path.join(componentsDir, 'LanguageSwitcher.js'), languageSwitcher);
    files.push('frontend/src/components/LanguageSwitcher.js');

    // 3.6. RichTextEditor component (TipTap)
    const richTextEditor = `import React, { useCallback } from 'react';
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Undo, Redo, Image as ImageIcon, Table as TableIcon } from 'lucide-react';

let EditorContent, useEditor, StarterKit, Placeholder, ImageExt, TableExt, TableRow, TableCell, TableHeader;
try {
  const tiptapReact = require('@tiptap/react');
  EditorContent = tiptapReact.EditorContent;
  useEditor = tiptapReact.useEditor;
  StarterKit = require('@tiptap/starter-kit').default;
  try { Placeholder = require('@tiptap/extension-placeholder').default; } catch(e) {}
  try { ImageExt = require('@tiptap/extension-image').default; } catch(e) {}
  try {
    TableExt = require('@tiptap/extension-table').default;
    TableRow = require('@tiptap/extension-table-row').default;
    TableCell = require('@tiptap/extension-table-cell').default;
    TableHeader = require('@tiptap/extension-table-header').default;
  } catch(e) {}
} catch (e) {}

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={"p-1.5 rounded transition-colors " + (active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground") + (disabled ? " opacity-40 cursor-not-allowed" : "")}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export default function RichTextEditor({ value, onChange, placeholder }) {
  if (!useEditor) {
    return <textarea className="w-full min-h-[200px] p-3 border rounded-lg" value={value || ''} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder} />;
  }

  const extensions = [StarterKit];
  if (Placeholder) extensions.push(Placeholder.configure({ placeholder: placeholder || 'Start typing...' }));
  if (ImageExt) extensions.push(ImageExt.configure({ inline: true }));
  if (TableExt && TableRow && TableCell && TableHeader) {
    extensions.push(TableExt.configure({ resizable: true }));
    extensions.push(TableRow);
    extensions.push(TableCell);
    extensions.push(TableHeader);
  }

  const editor = useEditor({
    extensions,
    content: value || '',
    onUpdate: ({ editor }) => {
      if (onChange) onChange(editor.getHTML());
    }
  });

  const addImage = useCallback(() => {
    if (!editor || !ImageExt) return;
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor || !TableExt) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const iconSize = 16;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
          <Strikethrough size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Inline Code">
          <Code size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet List">
          <List size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Ordered List">
          <ListOrdered size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Blockquote">
          <Quote size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        {ImageExt && (
          <ToolbarButton onClick={addImage} title="Insert Image">
            <ImageIcon size={iconSize} />
          </ToolbarButton>
        )}
        {TableExt && (
          <ToolbarButton onClick={addTable} title="Insert Table">
            <TableIcon size={iconSize} />
          </ToolbarButton>
        )}

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo">
          <Undo size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo">
          <Redo size={iconSize} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 min-h-[150px] focus:outline-none [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:outline-none" />
    </div>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'RichTextEditor.js'), richTextEditor);
    files.push('frontend/src/components/RichTextEditor.js');

    // 3.7. FileUpload component
    const fileUpload = `import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { filesApi } from '../api/client';

export default function FileUpload({ value, onChange, multiple = false, accept }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(value ? (Array.isArray(value) ? value : [value]) : []);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = [];
      for (const file of files) {
        const res = await filesApi.upload(file);
        const uploaded = res.data?.file || res.file || res.data;
        if (uploaded) results.push(uploaded);
      }
      const newFiles = [...uploadedFiles, ...results];
      setUploadedFiles(newFiles);
      if (onChange) onChange(multiple ? newFiles : newFiles[newFiles.length - 1]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (onChange) onChange(multiple ? newFiles : newFiles[0] || null);
  };

  const getIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Click or drag files here'}</p>
        <input ref={inputRef} type="file" className="hidden" multiple={multiple} accept={accept} onChange={handleUpload} />
      </div>
      {uploadedFiles.length > 0 && (
        <div className="space-y-1">
          {uploadedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
              {getIcon(file.mimeType)}
              <span className="flex-1 truncate">{file.name || file.original_name || 'File'}</span>
              <button onClick={() => removeFile(i)} className="p-1 hover:bg-destructive/10 rounded"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'FileUpload.js'), fileUpload);
    files.push('frontend/src/components/FileUpload.js');

    // Compute theme-aware colors for components that need them
    const themeColors = this.generatedTheme?.theme?.colors || {};

    // 3.8. KanbanBoard component
    const kanbanBoard = `import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export default function KanbanBoard({ columns = [], items = [], onItemMove, statusField = 'status' }) {
  const [draggingItem, setDraggingItem] = useState(null);

  const getItemsForColumn = (columnId) => items.filter(item => item[statusField] === columnId);

  const handleDragStart = (e, item) => { setDraggingItem(item); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (draggingItem && onItemMove) onItemMove(draggingItem, columnId);
    setDraggingItem(null);
  };

  const defaultColumns = columns.length > 0 ? columns : [
    { id: 'todo', label: 'To Do', color: '${themeColors.secondary || '#6b7280'}' },
    { id: 'in_progress', label: 'In Progress', color: '${themeColors.primary || '#3b82f6'}' },
    { id: 'done', label: 'Done', color: '${themeColors.success || '#10b981'}' }
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {defaultColumns.map(col => (
        <div key={col.id} className="flex-shrink-0 w-72" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
            <h3 className="font-semibold text-sm">{col.label}</h3>
            <span className="text-xs text-muted-foreground ml-auto">{getItemsForColumn(col.id).length}</span>
          </div>
          <div className="space-y-2 min-h-[100px] bg-muted/30 rounded-lg p-2">
            {getItemsForColumn(col.id).map((item, i) => (
              <Card key={item.id || i} draggable onDragStart={(e) => handleDragStart(e, item)} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{item.title || item.name || JSON.stringify(item).substring(0, 50)}</p>
                  {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'KanbanBoard.js'), kanbanBoard);
    files.push('frontend/src/components/KanbanBoard.js');

    // 3.9. MapView component (Leaflet)
    const mapView = `import React from 'react';

let MapContainer, TileLayer, Marker, Popup;
try {
  const rl = require('react-leaflet');
  MapContainer = rl.MapContainer;
  TileLayer = rl.TileLayer;
  Marker = rl.Marker;
  Popup = rl.Popup;
  require('leaflet/dist/leaflet.css');
} catch (e) {}

export default function MapView({ center = [51.505, -0.09], zoom = 13, markers = [], height = '400px' }) {
  if (!MapContainer) {
    return <div className="border rounded-lg p-8 text-center text-muted-foreground" style={{ height }}>Map requires leaflet. Install react-leaflet and leaflet.</div>;
  }

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'MapView.js'), mapView);
    files.push('frontend/src/components/MapView.js');

    // 3.10. PaymentForm component (Stripe)
    const paymentForm = `import React, { useState } from 'react';
import { paymentsApi } from '../api/client';

let loadStripe, Elements, CardElement, useStripe, useElements;
try {
  loadStripe = require('@stripe/stripe-js').loadStripe;
  const stripeReact = require('@stripe/react-stripe-js');
  Elements = stripeReact.Elements;
  CardElement = stripeReact.CardElement;
  useStripe = stripeReact.useStripe;
  useElements = stripeReact.useElements;
} catch (e) {}

const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = loadStripe && STRIPE_PK ? loadStripe(STRIPE_PK) : null;

function CheckoutForm({ items, amount, currency = 'usd', onSuccess, onError, buttonLabel }) {
  const [processing, setProcessing] = useState(false);

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      const response = await paymentsApi.createCheckout(items || [{ name: 'Payment', amount, quantity: 1 }]);
      const { url } = response.data;
      if (url) {
        window.location.href = url;
      } else if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      if (onError) onError(err);
      else alert('Payment failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {amount && (
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{currency.toUpperCase()} {(amount / 100).toFixed(2)}</p>
        </div>
      )}
      <button
        onClick={handleCheckout}
        disabled={processing}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {processing ? 'Processing...' : buttonLabel || 'Pay Now'}
      </button>
    </div>
  );
}

export default function PaymentForm(props) {
  if (!stripePromise) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        <p className="mb-2 font-medium">Payments not configured</p>
        <p className="text-sm">Set REACT_APP_STRIPE_PUBLISHABLE_KEY to enable payments.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'PaymentForm.js'), paymentForm);
    files.push('frontend/src/components/PaymentForm.js');

    // Compute theme-aware chart palette from DesignExpert colors
    const chartColorPalette = [
      themeColors.primary || '#3b82f6',
      themeColors.success || '#10b981',
      themeColors.accent || '#f59e0b',
      themeColors.error || '#ef4444',
      themeColors.info || '#8b5cf6',
      themeColors.warning || '#ec4899',
      themeColors.secondary || '#06b6d4',
      themeColors.focus || '#84cc16'
    ];

    // 4. PageRenderer component - renders pages dynamically with Shadcn UI components
    const pageRenderer = `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import KanbanBoard from './KanbanBoard';
import MapView from './MapView';
import PaymentForm from './PaymentForm';
import { dataApi, filesApi, exportApi, aggregateApi } from '../api/client';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadialBarChart, RadialBar, ComposedChart } from 'recharts';

// Shadcn UI Components
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from './ui/dialog';
import { BadgeOverlay } from './ui/badge-overlay';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { useToast } from './ui/use-toast';
import { Toaster } from './ui/toaster';
import { cn } from '../lib/utils';
import { ClipboardList, Clock, CheckCircle, Circle, Plus, X, Check, Users, BarChart3, DollarSign, Package, ShoppingCart, FileText, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2, Eye, Download, Upload, Search, Filter, RefreshCw, Settings, Mail, Phone, MapPin, Calendar, Star, Heart, Bookmark, Share2, ArrowRight, ArrowLeft } from 'lucide-react';

// Lucide icon helper for dynamic icon rendering
const lucideIconMap = {
  'clipboard-list': ClipboardList, 'clock': Clock, 'check-circle': CheckCircle,
  'plus': Plus, 'x': X, 'check': Check, 'users': Users, 'bar-chart': BarChart3,
  'dollar-sign': DollarSign, 'package': Package, 'cart': ShoppingCart,
  'file-text': FileText, 'alert-triangle': AlertTriangle, 'trending-up': TrendingUp,
  'trending-down': TrendingDown, 'edit': Edit, 'trash': Trash2, 'eye': Eye,
  'download': Download, 'upload': Upload, 'search': Search, 'filter': Filter,
  'refresh': RefreshCw, 'settings': Settings, 'mail': Mail, 'phone': Phone,
  'map-pin': MapPin, 'calendar': Calendar, 'star': Star, 'heart': Heart,
  'bookmark': Bookmark, 'share': Share2, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft,
  'circle': Circle
};
const LucideIcon = ({ name, className = 'w-5 h-5' }) => {
  const IconComponent = lucideIconMap[name] || Circle;
  return <IconComponent className={className} />;
};

export default function PageRenderer({ page, forms, workflowContext = {}, onAuthSuccess, user, socket }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submittingForm, setSubmittingForm] = useState(null);
  const navigate = useNavigate();

  // Destructure workflow context for easy access
  const { instance: workflowInstance, currentTask, onFormSubmit: workflowFormSubmit } = workflowContext;
  const { toast } = useToast();

  useEffect(() => {
    if (page) loadPageData();
  }, [page?.id]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const bindings = findDataBindings(page.sections || []);
      const dataPromises = {};
      for (const binding of bindings) {
        const [model] = binding.split('.');
        if (model && !dataPromises[model]) {
          dataPromises[model] = dataApi.list(model.toLowerCase()).then(res => res.data || []).catch(() => []);
        }
      }
      const results = await Promise.all(Object.entries(dataPromises).map(async ([model, promise]) => [model, await promise]));
      const dataMap = {};
      results.forEach(([model, modelData]) => { dataMap[model] = modelData; });
      setData(dataMap);
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const findDataBindings = (sections) => {
    const bindings = new Set();
    const extractTemplateModels = (str) => {
      if (!str || typeof str !== 'string') return;
      const matches = str.match(/\\{\\{(\\w+)\\./g);
      if (matches) matches.forEach(m => bindings.add(m.replace('{{', '').replace('.', '')));
    };
    const traverse = (items) => {
      if (!items) return;
      for (const item of items) {
        if (item.dataBinding) bindings.add(item.dataBinding);
        // Scan config values for {{Model.xxx}} template patterns
        if (item.config) {
          Object.values(item.config).forEach(v => {
            if (typeof v === 'string') extractTemplateModels(v);
          });
        }
        if (item.components) traverse(item.components);
        if (item.children) traverse(item.children);
        if (item.config?.children) traverse(item.config.children);
      }
    };
    traverse(sections);
    return Array.from(bindings);
  };

  // Resolve {{Model.field}} or {{Model.count}} or {{Model.count(filter)}} templates
  const resolveTemplate = (template, data) => {
    if (!template || typeof template !== 'string') return template;
    const templateMatch = template.match(/^\\{\\{(\\w+)\\.(\\w+)(?:\\((.*)\\))?\\}\\}$/);
    if (!templateMatch) return template;
    const [, model, method, filterStr] = templateMatch;
    const modelData = data[model] || [];
    if (method === 'count') {
      if (filterStr) {
        // Parse simple filter like status='completed' or active=true
        const filterMatch = filterStr.match(/(\\w+)=['\"]?(\\w+)['\"]?/);
        if (filterMatch) {
          const [, field, value] = filterMatch;
          const boolVal = value === 'true' ? true : value === 'false' ? false : null;
          return modelData.filter(r => boolVal !== null ? r[field] === boolVal : String(r[field]).toLowerCase() === value.toLowerCase()).length;
        }
      }
      return modelData.length;
    }
    if (method === 'sum') return modelData.reduce((s, r) => s + (Number(r[method]) || 0), 0);
    return template;
  };

  // Resolve {{style:condition?trueValue:falseValue}} patterns for conditional styling
  const resolveStyleBinding = (template, data) => {
    if (!template || typeof template !== 'string') return undefined;
    const styleMatch = template.match(/^\\{\\{style:(.+)\\}\\}$/);
    if (!styleMatch) return undefined;
    const expr = styleMatch[1];
    // Parse chained ternaries: field>N?val1:field>M?val2:val3
    const segments = expr.split(/(?<=^|:)([^?:]+(?:[><=!]+[^?:]+)?)\\?([^:]+)/g);
    // Simplified evaluator: walk condition?value pairs
    const parts = expr.split(':');
    for (const part of parts) {
      const condMatch = part.match(/^(.+?)\\?(.+)$/);
      if (condMatch) {
        const [, condition, value] = condMatch;
        if (evaluateStyleCondition(condition, data)) return value.trim();
      } else {
        // Final fallback value (no condition)
        return part.trim();
      }
    }
    return undefined;
  };

  const evaluateStyleCondition = (condition, data) => {
    // Supports: field>N, field<N, field>=N, field<=N, field==value, field!=value
    const opMatch = condition.match(/^([\\w.\\[\\]]+)\\s*(>=|<=|>|<|==|!=)\\s*(.+)$/);
    if (!opMatch) return false;
    const [, path, op, rawRight] = opMatch;
    // Resolve left side from data: e.g. intentScore or Orders[0].intentScore
    const pathParts = path.split('.');
    let leftVal = data;
    for (const p of pathParts) {
      const arrMatch = p.match(/(\\w+)\\[(\\d+)\\]/);
      if (arrMatch) {
        leftVal = (leftVal || {})[arrMatch[1]];
        leftVal = Array.isArray(leftVal) ? leftVal[Number(arrMatch[2])] : undefined;
      } else {
        leftVal = (leftVal || {})[p];
        if (Array.isArray(leftVal)) leftVal = leftVal[0];
      }
    }
    const right = isNaN(rawRight) ? rawRight.replace(/['"]/g, '') : Number(rawRight);
    const left = typeof right === 'number' ? Number(leftVal) || 0 : String(leftVal || '');
    switch (op) {
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '==': return left == right;
      case '!=': return left != right;
      default: return false;
    }
  };

  // Resolve {{item.field}} templates in a component tree for data-cards repeater
  const resolveItemTemplate = (template, item) => {
    if (!template) return template;
    if (typeof template === 'string') {
      // Handle {{style:item.field...}} conditional style bindings
      if (template.startsWith('{{style:item.')) {
        const resolved = template.replace(/item\\.(\\w+)/g, (_, field) => {
          const val = item[field];
          return val !== undefined ? val : '';
        });
        return resolveStyleBinding(resolved, data);
      }
      // Exact single-field reference -> return raw value (preserves arrays, numbers, objects)
      const exactMatch = template.match(/^\\{\\{item\\.(\\w+)\\}\\}$/);
      if (exactMatch) {
        const val = item[exactMatch[1]];
        return val !== undefined ? val : '';
      }
      return template.replace(/\\{\\{item\\.(\\w+)\\}\\}/g, (_, field) => {
        const val = item[field];
        return val !== undefined ? val : '';
      });
    }
    if (Array.isArray(template)) {
      return template.map(t => resolveItemTemplate(t, item));
    }
    if (typeof template === 'object' && template !== null) {
      const result = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = resolveItemTemplate(value, item);
      }
      return result;
    }
    return template;
  };

  const handleFormChange = (formId, fieldName, value) => {
    setFormData(prev => ({ ...prev, [formId]: { ...prev[formId], [fieldName]: value } }));
    if (formErrors[formId]?.[fieldName]) {
      setFormErrors(prev => ({ ...prev, [formId]: { ...prev[formId], [fieldName]: null } }));
    }
  };

  const handleFormSubmit = async (form) => {
    const formValues = formData[form.id] || {};
    const errors = {};
    const currentRole = user?.role || 'user';
    (form.fields || []).forEach(field => {
      // Skip validation for RBAC-hidden fields
      if (field.roleAccess) {
        const access = field.roleAccess[currentRole] || field.roleAccess['*'] || 'visible';
        if (access === 'hidden' || access === 'readonly') return;
      }
      if (field.required && !formValues[field.name]) errors[field.name] = field.label + ' is required';
    });
    if (Object.keys(errors).length > 0) { setFormErrors(prev => ({ ...prev, [form.id]: errors })); return; }
    setSubmittingForm(form.id);
    try {
      // If workflow context has a form submit handler and we're in a workflow, use it
      if (workflowFormSubmit && (workflowInstance || form.workflowId)) {
        const result = await workflowFormSubmit(form.id, formValues, {
          startWorkflow: !workflowInstance,
          workflowId: form.workflowId || form.formAssociation?.workflowId
        });
        setFormData(prev => ({ ...prev, [form.id]: {} }));
        return;
      }

      // Check if form is linked to a workflow (fallback if no workflow context)
      const workflowId = form.workflowId || form.formAssociation?.workflowId;
      const nodeType = form.linkedNodeType || form.formAssociation?.nodeType;
      const instanceId = form.instanceId || formValues._instanceId || workflowInstance?.id;

      if (workflowId) {
        let response, result;

        if ((nodeType === 'userTask' && instanceId) || (workflowInstance && currentTask)) {
          // Resume existing workflow instance (for human/user task forms)
          const activeInstanceId = instanceId || workflowInstance?.id;
          const taskId = currentTask?.taskId;
          response = await fetch(\`/api/instances/\${activeInstanceId}/complete\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, ...formValues })
          });
          result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to complete task');
          // Navigation is handled by workflow context
        } else {
          // Start new workflow instance (for start node forms)
          response = await fetch(\`/api/workflows/\${workflowId}/start\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
          });
          result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to start workflow');
        }
      } else {
        // Fallback: save directly to data model if no workflow
        let model = form.dataModelId || form.dataModelName || form.dataModel;
        if (!model) {
          const nameMatch = (form.name || form.title || '').match(/(?:create|edit|new|update|add)\\s+(\\w+)/i);
          if (nameMatch) model = nameMatch[1];
        }
        if (!model) {
          const idMatch = (form.id || '').match(/(?:create|edit|new|add)-(\\w+)-form/i);
          if (idMatch) model = idMatch[1];
        }
        if (model) {
          await dataApi.create(model.toLowerCase(), formValues);
        }
      }
      setFormData(prev => ({ ...prev, [form.id]: {} }));
      setFormErrors(prev => ({ ...prev, [form.id]: {} }));
      loadPageData();
    } catch (error) {
      alert('Error submitting form: ' + error.message);
    } finally {
      setSubmittingForm(null);
    }
  };

  const handleAction = (action) => {
    if (!action) return;
    if (action.type === 'navigate') navigate(action.target);
    if (action.type === 'toast') toast({ title: action.title, description: action.description, variant: action.variant });
  };

  // Render a form field with Shadcn UI components
  const renderFormField = (field, form) => {
    // Field-level RBAC: check roleAccess for visibility/editability
    const userRole = user?.role || 'user';
    if (field.roleAccess) {
      const access = field.roleAccess[userRole] || field.roleAccess['*'] || 'visible';
      if (access === 'hidden') return null;
      if (access === 'readonly') {
        const formValues = formData[form.id] || {};
        return <div key={field.id} className="mb-4 space-y-2 opacity-75"><Label>{field.label}</Label><div className="px-3 py-2 border rounded-md bg-muted text-sm">{formValues[field.name] || '-'}</div></div>;
      }
    }
    const formValues = formData[form.id] || {};
    const errors = formErrors[form.id] || {};
    const hasError = !!errors[field.name];
    const renderInput = () => {
      switch (field.type) {
        case 'textarea': return <Textarea placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn("min-h-[100px]", hasError && "border-destructive")} />;
        case 'select': case 'dropdown': return <Select value={formValues[field.name] || ''} onValueChange={(value) => handleFormChange(form.id, field.name, value)}><SelectTrigger className={cn(hasError && "border-destructive")}><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger><SelectContent>{(field.options || []).map((opt, i) => <SelectItem key={i} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</SelectItem>)}</SelectContent></Select>;
        case 'checkbox': return <div className="flex items-center space-x-2"><Checkbox id={\`\${form.id}-\${field.name}\`} checked={formValues[field.name] || false} onCheckedChange={(checked) => handleFormChange(form.id, field.name, checked)} /><Label htmlFor={\`\${form.id}-\${field.name}\`} className="cursor-pointer">{field.label}</Label></div>;
        case 'date': return <Input type="date" value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'number': return <Input type="number" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'email': return <Input type="email" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'richtext': return <RichTextEditor value={formValues[field.name] || ''} onChange={(val) => handleFormChange(form.id, field.name, val)} placeholder={field.placeholder} />;
        case 'file': return <FileUpload value={formValues[field.name]} onChange={(val) => handleFormChange(form.id, field.name, val)} multiple={field.multiple} accept={field.accept} />;
        case 'switch': return <div className="flex items-center space-x-2"><input type="checkbox" role="switch" checked={formValues[field.name] || false} onChange={(e) => handleFormChange(form.id, field.name, e.target.checked)} className="w-10 h-5 rounded-full appearance-none bg-muted checked:bg-primary transition cursor-pointer" /><Label>{field.label}</Label></div>;
        case 'color': return <Input type="color" value={formValues[field.name] || '#000000'} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className="w-16 h-10 p-1" />;
        case 'url': return <Input type="url" placeholder={field.placeholder || 'https://'} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'datetime-local': return <Input type="datetime-local" value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'tel': return <Input type="tel" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'search': return <Input type="search" placeholder={field.placeholder || 'Search...'} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'radio': return <div className="space-y-2">{(field.options || []).map((opt, i) => <label key={i} className="flex items-center gap-2 cursor-pointer"><input type="radio" name={field.name} value={typeof opt === 'object' ? opt.value : opt} checked={formValues[field.name] === (typeof opt === 'object' ? opt.value : opt)} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} /><span className="text-sm">{typeof opt === 'object' ? opt.label : opt}</span></label>)}</div>;
        default: return <Input type="text" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
      }
    };
    if (field.type === 'checkbox') return <div key={field.id} className="mb-4">{renderInput()}{errors[field.name] && <p className="text-destructive text-sm mt-1">{errors[field.name]}</p>}</div>;
    return <div key={field.id} className="mb-4 space-y-2"><Label>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>{renderInput()}{errors[field.name] && <p className="text-destructive text-sm">{errors[field.name]}</p>}</div>;
  };

  // Render inline form within a card
  const renderInlineForm = (formId) => {
    // Try exact ID match first
    let form = forms.find(f => f.id === formId);
    // If not found, try by name (case-insensitive)
    if (!form && formId) {
      const normalizedRef = formId.toLowerCase().replace(/[^a-z0-9]/g, '');
      form = forms.find(f => {
        const normalizedName = (f.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedId = (f.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedName === normalizedRef || normalizedId.includes(normalizedRef) || normalizedRef.includes(normalizedName);
      });
    }
    // If still not found, try fuzzy match by extracting meaningful words
    if (!form && formId) {
      const refWords = formId.toLowerCase().replace(/[-_]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['form', 'page'].includes(w));
      form = forms.find(f => {
        const nameWords = (f.name || '').toLowerCase().replace(/[-_]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        return refWords.some(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
      });
    }
    if (!form) return <p className="text-muted-foreground">Form not found: {formId}</p>;
    const layout = form.layout;
    const renderFields = () => {
      if (layout?.sections && layout.sections.length > 0) {
        return layout.sections.map((section, sIdx) => {
          const sectionFields = section.fieldIds.map(fid => form.fields.find(f => f.id === fid || f.name === fid)).filter(Boolean);
          return <div key={sIdx} className="mb-6">{section.title && <h4 className="text-sm font-semibold mb-4 pb-2 border-b">{section.title}</h4>}<div className={cn("grid gap-4", layout.type === 'two-column' ? 'grid-cols-2' : 'grid-cols-1')}>{sectionFields.map(field => <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : ''}>{renderFormField(field, form)}</div>)}</div></div>;
        });
      }
      return <div className="grid grid-cols-2 gap-4">{(form.fields || []).map(field => <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : ''}>{renderFormField(field, form)}</div>)}</div>;
    };
    return <div className="mt-4">{renderFields()}<div className={cn("mt-5 pt-4 border-t flex", form.submitButton?.position === 'right' ? 'justify-end' : 'justify-start')}><Button onClick={() => handleFormSubmit(form)} disabled={submittingForm === form.id}>{submittingForm === form.id ? 'Submitting...' : (form.submitButton?.label || 'Submit')}</Button></div></div>;
  };

  // Helper to convert Figma styling to React inline styles
  const figmaStyleToReact = (styling) => {
    if (!styling) return {};
    const style = {};
    if (styling.background) style.backgroundColor = styling.background;
    if (styling.color) style.color = styling.color;
    if (styling.padding) style.padding = styling.padding;
    if (styling.margin) style.margin = styling.margin;
    if (styling.borderRadius) style.borderRadius = styling.borderRadius;
    if (styling.border) style.border = styling.border;
    if (styling.shadow) style.boxShadow = styling.shadow;
    if (styling.width) style.width = styling.width;
    if (styling.maxWidth) style.maxWidth = styling.maxWidth;
    if (styling.minHeight) style.minHeight = styling.minHeight;
    if (styling.gap) style.gap = styling.gap;
    if (styling.display) style.display = styling.display;
    if (styling.flexDirection) style.flexDirection = styling.flexDirection;
    if (styling.alignItems) style.alignItems = styling.alignItems;
    if (styling.justifyContent) style.justifyContent = styling.justifyContent;
    if (styling.fontSize) style.fontSize = styling.fontSize;
    if (styling.fontWeight) style.fontWeight = styling.fontWeight;
    return style;
  };

  const renderComponent = (component, index) => {
    if (!component) return null;
    const { type, config, formRef, dataBinding, children, styling } = component;
    const figmaStyle = figmaStyleToReact(styling || config?.styling);
    // Component 5: Conditional style bindings
    if (config?.conditionalStyles) {
      Object.entries(config.conditionalStyles).forEach(([prop, template]) => {
        const resolved = resolveStyleBinding(template, data);
        if (resolved !== undefined) figmaStyle[prop] = resolved;
      });
    }
    switch (type) {
      case 'container':
        return <div key={index} className={cn("w-full", config?.maxWidth && "mx-auto")} style={{ maxWidth: config?.maxWidth || '100%', padding: config?.padding || '0', ...figmaStyle }}>{(config?.children || children || component.components || []).map((c, i) => renderComponent(c, i))}</div>;
      case 'heading':
        const headingClasses = { h1: 'text-3xl font-bold tracking-tight', h2: 'text-2xl font-semibold tracking-tight', h3: 'text-xl font-semibold' };
        const HeadingTag = config?.variant === 'h1' ? 'h1' : config?.variant === 'h2' ? 'h2' : config?.variant === 'h3' ? 'h3' : 'h2';
        return <HeadingTag key={index} className={cn(headingClasses[config?.variant] || headingClasses.h2, "mb-2")}>{config?.text}</HeadingTag>;
      case 'text':
        const textClasses = { h1: 'text-3xl font-bold', h2: 'text-2xl font-semibold', h3: 'text-xl font-semibold', subtitle: 'text-base text-muted-foreground', caption: 'text-xs text-muted-foreground', body: 'text-sm' };
        return <p key={index} className={cn(textClasses[config?.variant] || textClasses.body, "leading-relaxed")}>{config?.text}</p>;
      case 'spacer':
        return <div key={index} style={{ height: config?.height || '16px' }} />;
      case 'divider':
        return <Separator key={index} className="my-4" />;
      case 'stat-card': {
        const rawValue = config?.value;
        const isTemplate = typeof rawValue === 'string' && rawValue.startsWith('{{');
        const resolvedValue = isTemplate ? resolveTemplate(rawValue, data) : rawValue;
        const displayValue = (resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== rawValue) ? resolvedValue : (isTemplate ? 0 : (resolvedValue || 0));
        const hasData = !isTemplate || (resolvedValue !== rawValue);
        return <Card key={index} className="hover:shadow-lg transition-shadow"><CardContent className="pt-6"><div className="flex justify-between items-start"><div><p className="text-sm font-medium text-muted-foreground">{config?.title}</p><p className="text-3xl font-bold mt-1">{displayValue}</p>{config?.trend && <span className={cn("text-sm mt-1 inline-block", config?.trendDirection === 'up' ? 'text-green-600' : 'text-red-600')}>{config?.trendDirection === 'up' ? '+' : ''}{config?.trend}</span>}</div>{config?.icon && <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><LucideIcon name={config.icon} /></div>}</div></CardContent></Card>;
      }
      case 'buttonGroup':
        return <div key={index} className="flex gap-3 flex-wrap">{(config?.buttons || []).map((btn, i) => <Button key={i} variant={btn.variant === 'primary' ? 'default' : btn.variant === 'destructive' ? 'destructive' : 'outline'}>{btn.icon && <span className="mr-2"><LucideIcon name={btn.icon} className="w-4 h-4 inline" /></span>}{btn.label}</Button>)}</div>;
      case 'breadcrumb':
        return <nav key={index} className="flex items-center space-x-2 text-sm text-muted-foreground">{(config?.items || []).map((item, i, arr) => <React.Fragment key={i}>{i > 0 && <span>/</span>}<a href={item.route} className={cn("hover:text-foreground transition-colors", i === arr.length - 1 ? 'text-foreground font-medium' : 'text-primary')}>{item.label}</a></React.Fragment>)}</nav>;
      case 'accordion':
        return <Accordion key={index} type="single" collapsible className="w-full">{(config?.items || []).map((item, i) => <AccordionItem key={i} value={\`item-\${i}\`}><AccordionTrigger>{item.title}</AccordionTrigger><AccordionContent>{item.content}</AccordionContent></AccordionItem>)}</Accordion>;
      case 'alert':
        const alertVariant = config?.variant === 'error' || config?.variant === 'destructive' ? 'destructive' : 'default';
        return <Alert key={index} variant={alertVariant}>{config?.title && <AlertTitle>{config.title}</AlertTitle>}<AlertDescription>{config?.message}</AlertDescription></Alert>;
      case 'spinner':
        return <div key={index} className="flex flex-col items-center justify-center py-8"><Skeleton className={cn("rounded-full", config?.size === 'large' ? 'w-12 h-12' : 'w-10 h-10')} />{config?.label && <p className="mt-2 text-muted-foreground">{config.label}</p>}</div>;
      case 'select':
        return <div key={index} className="min-w-[150px] space-y-2">{config?.label && <Label>{config.label}</Label>}<Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{(config?.options || []).map((opt, i) => <SelectItem key={i} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</SelectItem>)}</SelectContent></Select></div>;
      case 'card':
        return <Card key={index} className="hover:shadow-md transition-shadow">{(config?.title || config?.description) && <CardHeader>{config?.title && <CardTitle>{config.title}</CardTitle>}{config?.description && <CardDescription>{config.description}</CardDescription>}</CardHeader>}<CardContent>{formRef && renderInlineForm(formRef)}{(config?.children || component.components || children || []).map((c, i) => renderComponent(c, i))}</CardContent></Card>;
      case 'button':
        const buttonVariant = config?.variant === 'secondary' ? 'secondary' : config?.variant === 'outline' ? 'outline' : config?.variant === 'destructive' ? 'destructive' : config?.variant === 'ghost' ? 'ghost' : 'default';
        return <Button key={index} variant={buttonVariant} onClick={() => handleAction(component.action)}>{config?.icon && <span className="mr-2"><LucideIcon name={config.icon} className="w-4 h-4 inline" /></span>}{config?.text || config?.label}</Button>;
      case 'table':
        const [tableModel] = (dataBinding || '').split('.');
        const tableData = data[tableModel] || [];
        const columns = (config?.columns || []).map(col => ({ name: col.key, label: col.label, type: col.type || 'text' }));
        return <Card key={index}>{config?.title && <CardHeader><CardTitle>{config.title}</CardTitle></CardHeader>}<CardContent><DataTable columns={columns} data={tableData} /></CardContent></Card>;
      case 'metric': {
        const metricRaw = config?.value;
        const isMetricTemplate = typeof metricRaw === 'string' && metricRaw.startsWith('{{');
        let metricValue;
        if (isMetricTemplate) {
          metricValue = resolveTemplate(metricRaw, data);
          if (metricValue === metricRaw) metricValue = 0;
        } else {
          const [metricModel] = (dataBinding || '').split('.');
          const metricData = data[metricModel] || [];
          metricValue = metricData.length > 0 ? (config?.aggregation === 'count' ? metricData.length : config?.aggregation === 'sum' ? metricData.reduce((sum, r) => sum + (r[config.field] || 0), 0) : metricData.length) : 0;
        }
        return <Card key={index} className="text-center hover:shadow-md transition-shadow"><CardContent className="pt-6"><p className="text-4xl font-bold">{metricValue}</p><p className="text-sm text-muted-foreground mt-1">{config?.label || config?.title}</p></CardContent></Card>;
      }
      case 'badge':
        const badgeVariantMap = { success: 'default', warning: 'secondary', error: 'destructive', info: 'outline', green: 'default', red: 'destructive', blue: 'outline' };
        const badgeVar = badgeVariantMap[config?.color] || badgeVariantMap[config?.variant] || 'default';
        return <Badge key={index} variant={badgeVar}>{config?.text}</Badge>;
      case 'form':
        if (formRef || config?.formId) return <div key={index}>{renderInlineForm(formRef || config?.formId)}</div>;
        return null;
      case 'search':
        return <Input key={index} type="search" placeholder={config?.placeholder || 'Search...'} className="max-w-sm" />;
      case 'filter':
        return <div key={index} className="flex gap-3 flex-wrap">{(config?.filters || []).map((filter, fIdx) => <div key={fIdx} className="min-w-[150px] space-y-2"><Label>{filter.label}</Label><Select><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{(filter.options || []).map((opt, oIdx) => <SelectItem key={oIdx} value={opt.value || opt}>{opt.label || opt}</SelectItem>)}</SelectContent></Select></div>)}</div>;
      case 'chart': {
        const chartModel = (dataBinding || '').split('.')[0];
        const chartData = data[chartModel] || config?.data || [];
        const chartType = config?.chartType || 'bar';
        const chartColors = ${JSON.stringify(chartColorPalette)};
        const xKey = config?.xAxis || config?.xKey || (chartData[0] ? Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'string') : 'name');
        const yKey = config?.yAxis || config?.yKey || (chartData[0] ? Object.keys(chartData[0]).find(k => typeof chartData[0][k] === 'number') : 'value');
        const yKeys = config?.yKeys || (yKey ? [yKey] : []);

        const renderChart = () => {
          if (chartData.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for chart</div>;
          switch (chartType) {
            case 'line':
              return <ResponsiveContainer width="100%" height={config?.height || 300}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />{yKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={chartColors[i % chartColors.length]} strokeWidth={2} />)}</LineChart></ResponsiveContainer>;
            case 'area':
              return <ResponsiveContainer width="100%" height={config?.height || 300}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />{yKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} fill={chartColors[i % chartColors.length]} stroke={chartColors[i % chartColors.length]} fillOpacity={0.3} />)}</AreaChart></ResponsiveContainer>;
            case 'pie':
              return <ResponsiveContainer width="100%" height={config?.height || 300}><PieChart><Pie data={chartData} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label>{chartData.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>;
            case 'scatter':
              return <ResponsiveContainer width="100%" height={config?.height || 300}><ScatterChart><CartesianGrid /><XAxis dataKey={xKey} name={xKey} /><YAxis dataKey={yKey} name={yKey} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter data={chartData} fill={chartColors[0]} /></ScatterChart></ResponsiveContainer>;
            case 'composed':
              return <ResponsiveContainer width="100%" height={config?.height || 300}><ComposedChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} /><YAxis /><Tooltip /><Legend />{yKeys.length > 0 && <Bar dataKey={yKeys[0]} fill={chartColors[0]} />}{yKeys.length > 1 && <Line type="monotone" dataKey={yKeys[1]} stroke={chartColors[1]} />}</ComposedChart></ResponsiveContainer>;
            default: // bar
              return <ResponsiveContainer width="100%" height={config?.height || 300}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />{yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={chartColors[i % chartColors.length]} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer>;
          }
        };
        return <Card key={index}>{config?.title && <CardHeader><CardTitle>{config.title}</CardTitle>{config?.description && <CardDescription>{config.description}</CardDescription>}</CardHeader>}<CardContent className="pt-2">{renderChart()}</CardContent></Card>;
      }
      case 'kanban': {
        const kanbanModel = (dataBinding || '').split('.')[0];
        const kanbanItems = data[kanbanModel] || [];
        return <div key={index}>{config?.title && <h3 className="text-lg font-semibold mb-4">{config.title}</h3>}<KanbanBoard columns={config?.columns} items={kanbanItems} statusField={config?.statusField || 'status'} onItemMove={(item, newStatus) => { const model = kanbanModel.toLowerCase(); dataApi.update(model, item.id, { [config?.statusField || 'status']: newStatus }).then(() => loadPageData()); }} /></div>;
      }
      case 'map': {
        let mapMarkers = config?.markers || [];
        if (dataBinding) {
          const mapModel = dataBinding.split('.')[0];
          const mapItems = data[mapModel] || [];
          const latField = config?.latField || 'latitude';
          const lngField = config?.lngField || 'longitude';
          const labelField = config?.labelField || 'name';
          mapMarkers = mapItems.filter(item => item[latField] && item[lngField]).map(item => ({ lat: Number(item[latField]), lng: Number(item[lngField]), label: item[labelField] || '' }));
        }
        return <div key={index}>{config?.title && <h3 className="text-lg font-semibold mb-4">{config.title}</h3>}<MapView center={config?.center} zoom={config?.zoom} markers={mapMarkers} height={config?.height || '400px'} /></div>;
      }
      case 'file-upload':
        return <Card key={index}><CardHeader><CardTitle>{config?.title || 'Upload Files'}</CardTitle></CardHeader><CardContent><FileUpload multiple={config?.multiple !== false} accept={config?.accept} onChange={(files) => { console.log('Files uploaded:', files); }} /></CardContent></Card>;
      case 'pdf-export': {
        const exportModel = config?.model || (dataBinding || '').split('.')[0];
        return <Button key={index} variant="outline" onClick={async () => { try { const res = await exportApi.pdf(exportModel); const url = URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = \`\${exportModel}-export.pdf\`; a.click(); URL.revokeObjectURL(url); } catch (e) { alert('Export failed: ' + e.message); } }}>{config?.label || 'Export PDF'}</Button>;
      }
      case 'payment': case 'payment-button': case 'checkout':
        return <Card key={index}><CardHeader><CardTitle>{config?.title || 'Payment'}</CardTitle>{config?.description && <CardDescription>{config.description}</CardDescription>}</CardHeader><CardContent><PaymentForm amount={config?.amount} currency={config?.currency} items={config?.items} buttonLabel={config?.buttonLabel} /></CardContent></Card>;
      case 'grid': {
        const gridResponsiveMap = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' };
        const gridCols = config?.columns || 3;
        const gapMap = { '8px': 'gap-2', '12px': 'gap-3', '16px': 'gap-4', '20px': 'gap-5', '24px': 'gap-6', '32px': 'gap-8' };
        const gridGap = (config?.gap && gapMap[config.gap]) || 'gap-4';
        return <div key={index} className={cn("grid", gridGap, gridResponsiveMap[gridCols] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>{(config?.children || component.components || children || []).map((c, i) => renderComponent(c, i))}</div>;
      }
      case 'slider': {
        const sliderId = \`slider-\${index}\`;
        const sliderMin = config?.min || 0;
        const sliderMax = config?.max || 100;
        const sliderStep = config?.step || 1;
        const sliderDefault = config?.defaultValue || [Math.round((sliderMax - sliderMin) / 2)];
        const [sliderVal, setSliderVal] = React.useState(Array.isArray(sliderDefault) ? sliderDefault : [sliderDefault]);
        return <div key={index} className="space-y-2" style={figmaStyle}>{config?.label && <div className="flex justify-between items-center"><Label htmlFor={sliderId}>{config.label}</Label>{config?.showValue !== false && <span className="text-sm text-muted-foreground">{sliderVal[0]}</span>}</div>}<Slider id={sliderId} min={sliderMin} max={sliderMax} step={sliderStep} value={sliderVal} onValueChange={setSliderVal} /></div>;
      }
      case 'popover':
        return <Popover key={index}><PopoverTrigger asChild><Button variant={config?.triggerVariant || 'outline'}>{config?.trigger || 'Open'}</Button></PopoverTrigger><PopoverContent align={config?.align || 'center'} side={config?.side || 'bottom'} className="w-80">{(config?.children || children || []).map((c, i) => renderComponent(c, i))}{config?.content && <div className="text-sm">{config.content}</div>}</PopoverContent></Popover>;
      case 'dropdown-menu':
        return <DropdownMenu key={index}><DropdownMenuTrigger asChild><Button variant={config?.triggerVariant || 'outline'}>{config?.trigger || 'Menu'}</Button></DropdownMenuTrigger><DropdownMenuContent>{config?.label && <DropdownMenuLabel>{config.label}</DropdownMenuLabel>}{config?.label && <DropdownMenuSeparator />}{(config?.items || []).map((item, i) => item.separator ? <DropdownMenuSeparator key={i} /> : <DropdownMenuItem key={i} onClick={() => handleAction(item.action)}>{item.icon && <span className="mr-2"><LucideIcon name={item.icon} className="w-4 h-4 inline" /></span>}{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
      case 'modal':
        return <Dialog key={index}><DialogTrigger asChild><Button variant={config?.triggerVariant || 'default'}>{config?.trigger || 'Open'}</Button></DialogTrigger><DialogContent>{(config?.title || config?.description) && <DialogHeader>{config?.title && <DialogTitle>{config.title}</DialogTitle>}{config?.description && <DialogDescription>{config.description}</DialogDescription>}</DialogHeader>}<div>{(config?.children || children || []).map((c, i) => renderComponent(c, i))}</div>{config?.footer && <DialogFooter>{(config.footer || []).map((btn, i) => <Button key={i} variant={btn.variant || 'default'} onClick={() => handleAction(btn.action)}>{btn.label}</Button>)}</DialogFooter>}</DialogContent></Dialog>;
      case 'badge-overlay': {
        const badgeCount = typeof config?.count === 'string' && config.count.startsWith('{{') ? resolveTemplate(config.count, data) : (config?.count || 0);
        return <BadgeOverlay key={index} count={Number(badgeCount) || 0} variant={config?.variant || 'default'} max={config?.max || 99}>{config?.icon ? <LucideIcon name={config.icon} className={config?.iconClass || 'w-6 h-6'} /> : (config?.children || children || []).map((c, i) => renderComponent(c, i))}</BadgeOverlay>;
      }
      case 'tabs': {
        const tabItems = config?.tabs || [];
        const defaultTab = tabItems[0]?.id || 'tab-0';
        const tabVariantClass = config?.variant === 'pills' ? 'bg-muted rounded-lg p-1' : '';
        return <Tabs key={index} defaultValue={defaultTab} orientation={config?.orientation || 'horizontal'} className="w-full"><TabsList className={tabVariantClass}>{tabItems.map((tab, i) => <TabsTrigger key={tab.id || \`tab-\${i}\`} value={tab.id || \`tab-\${i}\`}>{tab.icon && <span className="mr-2"><LucideIcon name={tab.icon} className="w-4 h-4 inline" /></span>}{tab.label}</TabsTrigger>)}</TabsList>{tabItems.map((tab, i) => <TabsContent key={tab.id || \`tab-\${i}\`} value={tab.id || \`tab-\${i}\`}>{(tab.content || []).map((c, ci) => renderComponent(c, ci))}</TabsContent>)}</Tabs>;
      }
      case 'avatar': {
        const avatarSizeMap = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };
        const avatarSize = avatarSizeMap[config?.size] || avatarSizeMap.md;
        return <Avatar key={index} className={avatarSize}>{config?.src && <AvatarImage src={config.src} alt={config?.alt || config?.initials || ''} />}<AvatarFallback>{config?.initials || '?'}</AvatarFallback></Avatar>;
      }
      case 'progress': {
        if (config?.variant === 'steps') {
          const steps = config?.steps || [];
          const currentStep = config?.currentStep || 0;
          return <div key={index} className="space-y-2">{config?.label && <p className="text-sm font-medium">{config.label}</p>}<div className="flex items-center gap-2">{steps.map((step, i) => <React.Fragment key={i}><div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2", i <= currentStep ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-muted')}>{i + 1}</div>{i < steps.length - 1 && <div className={cn("flex-1 h-0.5", i < currentStep ? 'bg-primary' : 'bg-muted')} />}</React.Fragment>)}</div>{steps.length > 0 && <div className="flex justify-between">{steps.map((step, i) => <span key={i} className={cn("text-xs", i <= currentStep ? 'text-foreground' : 'text-muted-foreground')}>{step.label || step}</span>)}</div>}</div>;
        }
        const progressValue = typeof config?.value === 'string' && config.value.startsWith('{{') ? Number(resolveTemplate(config.value, data)) || 0 : (config?.value || 0);
        return <div key={index} className="space-y-2">{(config?.label || config?.showPercent) && <div className="flex justify-between items-center">{config?.label && <p className="text-sm font-medium">{config.label}</p>}{config?.showPercent && <span className="text-sm text-muted-foreground">{progressValue}%</span>}</div>}<Progress value={progressValue} /></div>;
      }
      case 'tooltip': {
        const tooltipChildren = config?.children || children || [];
        const trigger = tooltipChildren.length > 0 ? tooltipChildren.map((c, i) => renderComponent(c, i)) : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs cursor-help">?</span>;
        return <TooltipProvider key={index}><Tooltip><TooltipTrigger asChild><span>{trigger}</span></TooltipTrigger><TooltipContent><p>{config?.content || config?.text || ''}</p></TooltipContent></Tooltip></TooltipProvider>;
      }
      case 'data-cards': {
        const cardsModel = (dataBinding || '').split('.')[0];
        const cardsData = data[cardsModel] || [];
        const gridCols = config?.columns || 1;
        const cardsGridMap = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' };
        const cardsGapMap = { '8px': 'gap-2', '12px': 'gap-3', '16px': 'gap-4', '20px': 'gap-5', '24px': 'gap-6', '32px': 'gap-8' };
        const cardsGap = (config?.gap && cardsGapMap[config.gap]) || 'gap-4';
        if (cardsData.length === 0) return <div key={index} className="text-center py-8 text-muted-foreground">{config?.emptyMessage || 'No items found'}</div>;
        return <div key={index} className={cn("grid", cardsGap, cardsGridMap[gridCols] || 'grid-cols-1')}>{cardsData.map((item, itemIdx) => { const resolved = resolveItemTemplate(config?.template, item); return <div key={item.id || itemIdx}>{renderComponent(resolved, itemIdx)}</div>; })}</div>;
      }
      case 'badge-list': {
        const blItems = Array.isArray(config?.items) ? config.items : [];
        const blVariantMap = { success: 'default', warning: 'secondary', error: 'destructive', info: 'outline', green: 'default', red: 'destructive', blue: 'outline', outline: 'outline' };
        const blVariant = blVariantMap[config?.variant] || 'default';
        return <div key={index} className="flex flex-wrap gap-1.5">{blItems.map((tag, i) => {
          const label = typeof tag === 'string' ? tag : (tag?.label || tag?.value || '');
          const itemVariant = (typeof tag === 'object' && tag?.variant) ? (blVariantMap[tag.variant] || blVariant) : blVariant;
          return <Badge key={i} variant={itemVariant}>{label}</Badge>;
        })}</div>;
      }
      case 'key-value-list': {
        const kvItems = Array.isArray(config?.items) ? config.items : [];
        const kvLayout = config?.layout || 'horizontal';
        return <div key={index} className="divide-y">{kvItems.map((kvItem, i) => {
          const valContent = (typeof kvItem.value === 'object' && kvItem.value !== null && kvItem.value.type) ? renderComponent(kvItem.value, i) : <span className="text-sm">{kvItem.value}</span>;
          if (kvLayout === 'stacked') {
            return <div key={i} className="py-2"><p className="text-sm text-muted-foreground">{kvItem.label}</p><div className="mt-0.5">{valContent}</div></div>;
          }
          return <div key={i} className="flex justify-between items-center py-2"><span className="text-sm text-muted-foreground">{kvItem.label}</span><div>{valContent}</div></div>;
        })}</div>;
      }
      case 'list': {
        const listItems = Array.isArray(config?.items) ? config.items : [];
        const listVariant = config?.variant || 'bullet';
        const Tag = listVariant === 'numbered' ? 'ol' : 'ul';
        const listClass = listVariant === 'bullet' ? 'list-disc list-inside space-y-1' : listVariant === 'numbered' ? 'list-decimal list-inside space-y-1' : 'space-y-1';
        return <Tag key={index} className={listClass}>{listItems.map((li, i) => {
          if (typeof li === 'string') return <li key={i}>{li}</li>;
          if (typeof li === 'object' && li !== null && li.type) return <li key={i}>{renderComponent(li, i)}</li>;
          return <li key={i}>{String(li)}</li>;
        })}</Tag>;
      }
      case 'callout':
      case 'blockquote': {
        const calloutVariantClasses = {
          info: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
          warning: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
          success: 'border-green-500 bg-green-50 dark:bg-green-950/30',
          error: 'border-red-500 bg-red-50 dark:bg-red-950/30',
          quote: 'border-gray-400 bg-gray-50 dark:bg-gray-800/30',
          neutral: 'border-muted-foreground/30 bg-muted/40',
        };
        const calloutVariant = config?.variant || 'neutral';
        const calloutCls = calloutVariantClasses[calloutVariant] || calloutVariantClasses.neutral;
        const calloutChildren = config?.children || children || [];
        return <div key={index} className={cn("rounded-lg p-4 border-l-4", calloutCls)}>
          {config?.title && <p className="font-semibold mb-2">{config.title}</p>}
          {config?.content && <p className="text-sm">{config.content}</p>}
          {calloutChildren.length > 0 && <div className="mt-2">{calloutChildren.map((c, i) => renderComponent(c, i))}</div>}
        </div>;
      }
      case 'video': case 'audio': case 'media': case 'media-player': {
        const mediaSrc = config?.src || config?.url || '';
        const mediaType = (type === 'audio') ? 'audio' : 'video';
        const poster = config?.poster || config?.thumbnail || '';
        if (mediaType === 'audio') {
          return <div key={index} className="space-y-2">{config?.title && <p className="text-sm font-medium">{config.title}</p>}<audio controls className="w-full" src={mediaSrc} preload={config?.preload || 'metadata'}>{config?.tracks?.map((t, i) => <track key={i} kind={t.kind || 'subtitles'} src={t.src} label={t.label} />)}</audio>{config?.caption && <p className="text-xs text-muted-foreground">{config.caption}</p>}</div>;
        }
        return <div key={index} className="space-y-2">{config?.title && <p className="text-sm font-medium">{config.title}</p>}<div className="relative rounded-lg overflow-hidden bg-black"><video controls className="w-full" src={mediaSrc} poster={poster} preload={config?.preload || 'metadata'} playsInline={config?.playsInline !== false} loop={config?.loop || false} muted={config?.muted || false}>{config?.tracks?.map((t, i) => <track key={i} kind={t.kind || 'subtitles'} src={t.src} label={t.label} />)}</video></div>{config?.caption && <p className="text-xs text-muted-foreground">{config.caption}</p>}</div>;
      }
      case 'rich-text': case 'rich-text-editor': {
        const rtId = config?.id || ('rt-' + index);
        const rtValue = config?.value || config?.content || config?.defaultValue || '';
        const rtReadonly = config?.readonly || config?.disabled || false;
        return <div key={index} className="space-y-2">{config?.label && <Label>{config.label}</Label>}<RichTextEditor value={rtValue} onChange={(val) => { setFormData(prev => ({ ...prev, [rtId]: { ...prev[rtId], content: val } })); }} />{rtReadonly && <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: rtValue }} />}</div>;
      }
      case 'data-grid': {
        const dgModel = (dataBinding || '').split('.')[0];
        const dgData = data[dgModel] || config?.data || [];
        const dgCols = config?.columns || (dgData[0] ? Object.keys(dgData[0]).filter(k => k !== 'id').map(k => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), editable: config?.editable || false, sortable: true })) : []);
        const [dgSort, setDgSort] = useState({ key: null, dir: 'asc' });
        const [dgEditing, setDgEditing] = useState(null);
        const [dgEditVal, setDgEditVal] = useState('');
        const [dgPage, setDgPage] = useState(0);
        const dgPageSize = config?.pageSize || 10;
        const sortedData = [...dgData].sort((a, b) => {
          if (!dgSort.key) return 0;
          const av = a[dgSort.key], bv = b[dgSort.key];
          const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
          return dgSort.dir === 'asc' ? cmp : -cmp;
        });
        const pagedData = sortedData.slice(dgPage * dgPageSize, (dgPage + 1) * dgPageSize);
        const totalPages = Math.ceil(sortedData.length / dgPageSize);
        return <Card key={index}>{config?.title && <CardHeader><CardTitle>{config.title}</CardTitle>{config?.description && <CardDescription>{config.description}</CardDescription>}</CardHeader>}<CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50">{dgCols.map(col => <th key={col.key} className={cn("px-4 py-3 text-left font-medium text-muted-foreground", col.sortable !== false && "cursor-pointer select-none hover:text-foreground")} onClick={() => col.sortable !== false && setDgSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === 'asc' ? 'desc' : 'asc' }))}>{col.label}{dgSort.key === col.key && <span className="ml-1">{dgSort.dir === 'asc' ? '\u2191' : '\u2193'}</span>}</th>)}</tr></thead><tbody>{pagedData.map((row, ri) => <tr key={row.id || ri} className="border-b hover:bg-muted/30 transition-colors">{dgCols.map(col => <td key={col.key} className="px-4 py-3" onDoubleClick={() => { if (col.editable) { setDgEditing({ row: ri, col: col.key }); setDgEditVal(row[col.key] ?? ''); } }}>{dgEditing?.row === ri && dgEditing?.col === col.key ? <Input className="h-8 text-sm" value={dgEditVal} onChange={e => setDgEditVal(e.target.value)} onBlur={() => { if (dgModel && row.id) dataApi.update(dgModel.toLowerCase(), row.id, { [col.key]: dgEditVal }).then(() => loadPageData()); setDgEditing(null); }} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setDgEditing(null); }} autoFocus /> : <span>{row[col.key] ?? ''}</span>}</td>)}</tr>)}{pagedData.length === 0 && <tr><td colSpan={dgCols.length} className="px-4 py-8 text-center text-muted-foreground">No data</td></tr>}</tbody></table></div>{totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t"><span className="text-sm text-muted-foreground">{sortedData.length} rows</span><div className="flex gap-1"><Button variant="outline" size="sm" disabled={dgPage === 0} onClick={() => setDgPage(p => p - 1)}>Prev</Button><span className="flex items-center px-3 text-sm">{dgPage + 1} / {totalPages}</span><Button variant="outline" size="sm" disabled={dgPage >= totalPages - 1} onClick={() => setDgPage(p => p + 1)}>Next</Button></div></div>}</CardContent></Card>;
      }
      case 'calendar': case 'scheduler': {
        const calModel = (dataBinding || '').split('.')[0];
        const calEvents = (data[calModel] || config?.events || []).map(ev => ({ ...ev, date: new Date(ev.date || ev.start || ev.startDate) }));
        const [calMonth, setCalMonth] = useState(new Date());
        const calYear = calMonth.getFullYear();
        const calMo = calMonth.getMonth();
        const firstDay = new Date(calYear, calMo, 1).getDay();
        const daysInMonth = new Date(calYear, calMo + 1, 0).getDate();
        const calDays = [];
        for (let i = 0; i < firstDay; i++) calDays.push(null);
        for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
        const today = new Date();
        const isToday = (d) => d && today.getFullYear() === calYear && today.getMonth() === calMo && today.getDate() === d;
        const getEventsForDay = (d) => calEvents.filter(ev => ev.date.getFullYear() === calYear && ev.date.getMonth() === calMo && ev.date.getDate() === d);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const colorMap = { blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' };
        return <Card key={index}><CardHeader className="flex-row items-center justify-between space-y-0 pb-4"><CardTitle>{config?.title || (monthNames[calMo] + ' ' + calYear)}</CardTitle><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => setCalMonth(new Date(calYear, calMo - 1, 1))}>&lt;</Button><Button variant="outline" size="sm" onClick={() => setCalMonth(new Date())}>{config?.todayLabel || 'Today'}</Button><Button variant="outline" size="sm" onClick={() => setCalMonth(new Date(calYear, calMo + 1, 1))}>&gt;</Button></div></CardHeader><CardContent><div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}</div><div className="grid grid-cols-7">{calDays.map((d, i) => { const dayEvents = d ? getEventsForDay(d) : []; return <div key={i} className={cn("min-h-[80px] border border-muted/50 p-1", d ? 'bg-background' : 'bg-muted/20', isToday(d) && 'ring-2 ring-primary ring-inset')}>{d && <><span className={cn("inline-flex items-center justify-center w-6 h-6 text-xs rounded-full", isToday(d) ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground')}>{d}</span>{dayEvents.slice(0, 3).map((ev, ei) => <div key={ei} className={cn("text-xs px-1 py-0.5 rounded truncate mt-0.5", colorMap[ev.color] || colorMap.blue)}>{ev.title || ev.name}</div>)}{dayEvents.length > 3 && <div className="text-xs text-muted-foreground mt-0.5">+{dayEvents.length - 3} more</div>}</>}</div>; })}</div></CardContent></Card>;
      }
      case 'stepper': case 'wizard': case 'step-indicator': {
        const stpSteps = config?.steps || [];
        const stpCurrent = config?.currentStep || 0;
        const stpVariant = config?.variant || 'horizontal';
        const stpClickable = config?.clickable || false;
        if (stpVariant === 'vertical') {
          return <div key={index} className="space-y-0">{stpSteps.map((step, i) => { const label = typeof step === 'string' ? step : (step.label || step.title); const desc = typeof step === 'object' ? (step.description || '') : ''; const isActive = i === stpCurrent; const isDone = i < stpCurrent; return <div key={i} className="flex gap-4">{/* Indicator column */}<div className="flex flex-col items-center"><div className={cn("flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium shrink-0", isDone ? 'bg-primary text-primary-foreground border-primary' : isActive ? 'border-primary text-primary bg-primary/10' : 'border-muted text-muted-foreground')}>{isDone ? '\u2713' : i + 1}</div>{i < stpSteps.length - 1 && <div className={cn("w-0.5 flex-1 min-h-[24px]", isDone ? 'bg-primary' : 'bg-muted')} />}</div><div className={cn("pb-8", i === stpSteps.length - 1 && 'pb-0')}><p className={cn("text-sm font-medium", isActive ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground')}>{label}</p>{desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}{isActive && step.children && <div className="mt-3">{(Array.isArray(step.children) ? step.children : [step.children]).map((c, ci) => renderComponent(c, ci))}</div>}</div></div>; })}</div>;
        }
        return <div key={index} className="space-y-4"><div className="flex items-center">{stpSteps.map((step, i) => { const label = typeof step === 'string' ? step : (step.label || step.title); const isActive = i === stpCurrent; const isDone = i < stpCurrent; return <React.Fragment key={i}><div className={cn("flex flex-col items-center gap-1.5", stpClickable && 'cursor-pointer')} onClick={() => stpClickable && config?.onStepClick?.(i)}><div className={cn("flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium transition-colors", isDone ? 'bg-primary text-primary-foreground border-primary' : isActive ? 'border-primary text-primary bg-primary/10' : 'border-muted text-muted-foreground')}>{isDone ? '\u2713' : i + 1}</div><span className={cn("text-xs font-medium text-center max-w-[80px]", isActive ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground')}>{label}</span></div>{i < stpSteps.length - 1 && <div className={cn("flex-1 h-0.5 mx-2 mt-[-18px]", isDone ? 'bg-primary' : 'bg-muted')} />}</React.Fragment>; })}</div>{stpSteps[stpCurrent]?.children && <div>{(Array.isArray(stpSteps[stpCurrent].children) ? stpSteps[stpCurrent].children : [stpSteps[stpCurrent].children]).map((c, ci) => renderComponent(c, ci))}</div>}</div>;
      }
      case 'carousel': case 'gallery': case 'image-gallery': {
        const galItems = config?.items || config?.images || [];
        const [galIdx, setGalIdx] = useState(0);
        const galAutoPlay = config?.autoPlay || false;
        const galInterval = config?.interval || 5000;
        useEffect(() => { if (galAutoPlay && galItems.length > 1) { const t = setInterval(() => setGalIdx(i => (i + 1) % galItems.length), galInterval); return () => clearInterval(t); } }, [galAutoPlay, galItems.length]);
        if (galItems.length === 0) return <div key={index} className="text-center py-8 text-muted-foreground">No items</div>;
        const currentItem = galItems[galIdx];
        const imgSrc = typeof currentItem === 'string' ? currentItem : (currentItem?.src || currentItem?.url || currentItem?.image || '');
        const imgAlt = typeof currentItem === 'object' ? (currentItem?.alt || currentItem?.title || '') : '';
        const imgCaption = typeof currentItem === 'object' ? (currentItem?.caption || currentItem?.description || '') : '';
        return <div key={index} className="space-y-3">{config?.title && <h3 className="text-lg font-semibold">{config.title}</h3>}<div className="relative group rounded-lg overflow-hidden bg-muted"><img src={imgSrc} alt={imgAlt} className="w-full object-cover" style={{ height: config?.height || '400px' }} />{galItems.length > 1 && <><button className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setGalIdx(i => i === 0 ? galItems.length - 1 : i - 1)}>&lt;</button><button className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setGalIdx(i => (i + 1) % galItems.length)}>&gt;</button><div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{galItems.map((_, i) => <button key={i} className={cn("w-2 h-2 rounded-full transition-colors", i === galIdx ? 'bg-primary' : 'bg-background/60')} onClick={() => setGalIdx(i)} />)}</div></>}{imgCaption && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8"><p className="text-white text-sm">{imgCaption}</p></div>}</div>{config?.showThumbnails && <div className="flex gap-2 overflow-x-auto pb-1">{galItems.map((item, i) => { const thumbSrc = typeof item === 'string' ? item : (item?.src || item?.url || item?.image || ''); return <button key={i} className={cn("shrink-0 rounded-md overflow-hidden border-2 transition-colors", i === galIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100')} onClick={() => setGalIdx(i)}><img src={thumbSrc} alt="" className="w-16 h-16 object-cover" /></button>; })}</div>}</div>;
      }
      case 'tree': case 'tree-view': {
        const TreeNode = ({ node, level = 0 }) => {
          const [expanded, setExpanded] = useState(node.expanded !== false);
          const hasChildren = node.children && node.children.length > 0;
          const iconMap = { folder: '\uD83D\uDCC1', file: '\uD83D\uDCC4', page: '\uD83D\uDCC4', settings: '\u2699\uFE0F' };
          return <div><div className={cn("flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-muted/60 cursor-pointer select-none transition-colors", node.active && 'bg-primary/10 text-primary')} style={{ paddingLeft: (level * 20 + 8) + 'px' }} onClick={() => { if (hasChildren) setExpanded(!expanded); node.onClick?.(); }}>{hasChildren ? <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground">{expanded ? '\u25BE' : '\u25B8'}</span> : <span className="w-4" />}{node.icon ? <span className="text-sm">{iconMap[node.icon] || node.icon}</span> : null}<span className="text-sm truncate">{node.label || node.name || node.title}</span>{node.badge && <Badge variant="secondary" className="ml-auto text-xs scale-90">{node.badge}</Badge>}</div>{hasChildren && expanded && <div>{node.children.map((child, i) => <TreeNode key={child.id || i} node={child} level={level + 1} />)}</div>}</div>;
        };
        const treeData = config?.items || config?.nodes || config?.data || [];
        return <div key={index} className="space-y-1">{config?.title && <h3 className="text-sm font-semibold mb-2">{config.title}</h3>}{treeData.map((node, i) => <TreeNode key={node.id || i} node={node} level={0} />)}</div>;
      }
      case 'timeline': {
        const tlItems = config?.items || config?.events || [];
        const tlVariant = config?.variant || 'vertical';
        if (tlVariant === 'horizontal') {
          return <div key={index} className="space-y-2">{config?.title && <h3 className="text-lg font-semibold">{config.title}</h3>}<div className="flex items-start overflow-x-auto pb-4">{tlItems.map((item, i) => <div key={i} className="flex flex-col items-center min-w-[140px] px-3"><div className={cn("w-3 h-3 rounded-full shrink-0", item.color ? ('bg-' + item.color + '-500') : (i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'))} />{i < tlItems.length - 1 && <div className="w-full h-0.5 bg-muted mt-1.5" />}<p className="text-sm font-medium mt-2 text-center">{item.title || item.label}</p>{item.date && <p className="text-xs text-muted-foreground">{item.date}</p>}{item.description && <p className="text-xs text-muted-foreground mt-1 text-center">{item.description}</p>}</div>)}</div></div>;
        }
        const tlColorMap = { blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500', amber: 'bg-amber-500', purple: 'bg-purple-500', gray: 'bg-muted-foreground/40' };
        return <div key={index} className="space-y-2">{config?.title && <h3 className="text-lg font-semibold">{config.title}</h3>}<div className="relative">{tlItems.map((item, i) => { const dotColor = tlColorMap[item.color] || (i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'); return <div key={i} className="flex gap-4 pb-8 last:pb-0"><div className="flex flex-col items-center"><div className={cn("w-3 h-3 rounded-full shrink-0 mt-1.5", dotColor)} />{i < tlItems.length - 1 && <div className="w-0.5 flex-1 bg-muted" />}</div><div className="flex-1 pb-1"><div className="flex items-baseline gap-2"><p className="text-sm font-medium">{item.title || item.label}</p>{item.date && <span className="text-xs text-muted-foreground">{item.date}</span>}</div>{item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}{item.children && <div className="mt-2">{(Array.isArray(item.children) ? item.children : [item.children]).map((c, ci) => renderComponent(c, ci))}</div>}</div></div>; })}</div></div>;
      }
      default:
        const childComponents = config?.children || component.components || children || [];
        if (childComponents.length > 0) return <div key={index}>{childComponents.map((c, i) => renderComponent(c, i))}</div>;
        return null;
    }
  };

  const renderSection = (section, index) => {
    if (!section) return null;
    const sectionClasses = { header: 'mb-8', main: '', 'stats-row': 'mb-6', filters: 'mb-6', sidebar: 'bg-card p-5 rounded-lg border', 'quick-actions': 'mb-6', 'data-section': 'mb-6', hero: 'py-16 px-6', content: 'py-8', footer: 'py-8 border-t', navigation: 'py-4', cards: 'py-8', form: 'py-8' };
    const sectionStyle = figmaStyleToReact(section.styling);

    // Auto-grid: if section is stats-row and has multiple direct stat-card children, wrap in grid
    if (section.type === 'stats-row') {
      const components = section.components || [];
      const directStatCards = components.filter(c => c.type === 'stat-card');
      const emptyGrid = components.find(c => c.type === 'grid' && !(c.config?.children?.length > 0));
      if (directStatCards.length > 1 || (emptyGrid && directStatCards.length > 0)) {
        const nonStatCards = components.filter(c => c.type !== 'stat-card' && c.type !== 'grid');
        const cols = directStatCards.length <= 2 ? 2 : directStatCards.length <= 3 ? 3 : 4;
        const gridColsMap = { 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' };
        return <div key={index} className="mb-6" style={sectionStyle}>{nonStatCards.map((c, i) => renderComponent(c, i))}<div className={cn("grid gap-4", gridColsMap[cols] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>{directStatCards.map((c, i) => renderComponent(c, i))}</div></div>;
      }
    }

    // Handle grid layout from Figma
    if (section.layout?.type === 'grid' || section.styling?.display === 'grid') {
      const gridCols = section.layout?.columns || section.styling?.gridColumns || 1;
      const gridClass = gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-3' : gridCols === 4 ? 'grid-cols-4' : 'grid-cols-1';
      return <div key={index} className={cn("grid gap-4", gridClass, sectionClasses[section.type] || '')} style={sectionStyle}>{section.title && <h3 className="col-span-full text-lg font-semibold mb-2">{section.title}</h3>}{(section.components || []).map((component, i) => renderComponent(component, i))}</div>;
    }

    // Handle flex layout from Figma
    if (section.layout?.type === 'flex' || section.styling?.display === 'flex') {
      return <div key={index} className={cn("flex", section.layout?.direction === 'column' ? 'flex-col' : 'flex-row', section.layout?.wrap ? 'flex-wrap' : '', sectionClasses[section.type] || '')} style={{ gap: section.layout?.gap || '16px', ...sectionStyle }}>{section.title && <h3 className="text-lg font-semibold mb-2 w-full">{section.title}</h3>}{(section.components || []).map((component, i) => renderComponent(component, i))}</div>;
    }

    return <div key={index} className={sectionClasses[section.type] || ''} style={sectionStyle}>{section.title && <h3 className="text-lg font-semibold mb-4">{section.title}</h3>}{(section.components || []).map((component, i) => renderComponent(component, i))}</div>;
  };

  if (loading) return <div className="p-6 max-w-7xl mx-auto animate-pulse"><div className="mb-8"><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>)}</div><Card><CardContent className="pt-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</CardContent></Card></div>;
  if (!page) return <div className="flex flex-col items-center justify-center py-16 text-center"><h3 className="text-xl font-semibold">Page Not Found</h3><p className="text-muted-foreground mt-2">The requested page could not be found.</p></div>;
  const hasStyledHeader = page.sections?.some(s => s.type === 'header' && s.components?.length > 0);
  // Apply Figma layout settings
  const pageLayout = page.layout || {};
  const layoutClasses = {
    'full-width': 'w-full',
    'contained': 'max-w-7xl mx-auto',
    'narrow': 'max-w-3xl mx-auto',
    'sidebar': 'max-w-7xl mx-auto grid grid-cols-[${this.generatedTheme?.layout?.sidebarWidth || '256px'}_1fr] gap-6'
  };
  const layoutClass = layoutClasses[pageLayout.type] || 'max-w-7xl mx-auto';
  const pageStyle = figmaStyleToReact(pageLayout.styling || page.styling);
  return <><div className={cn("p-6", layoutClass)} style={{ maxWidth: pageLayout.maxWidth, padding: pageLayout.padding, ...pageStyle }}>{!hasStyledHeader && <div className="mb-8"><h1 className="text-3xl font-bold tracking-tight">{page.title || page.name}</h1>{page.description && <p className="text-muted-foreground mt-2">{page.description}</p>}</div>}<div className="space-y-6">{(page.sections || []).map((section, index) => renderSection(section, index))}</div></div><Toaster /></>;
}`;

    await fs.writeFile(path.join(componentsDir, 'PageRenderer.js'), pageRenderer);
    files.push('frontend/src/components/PageRenderer.js');

    // Error Boundary component -- catches render errors per-page with friendly UI and retry
    const errorBoundary = `import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
            This page encountered an error while rendering. You can try again or navigate to a different page.
          </p>
          <div className="flex gap-3">
            <button onClick={this.handleRetry} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Try Again
            </button>
            <button onClick={() => window.location.href = '/'} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">
              Go to Dashboard
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-lg">
              <summary className="text-xs text-muted-foreground cursor-pointer">Error details</summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;`;

    await fs.writeFile(path.join(componentsDir, 'ErrorBoundary.js'), errorBoundary);
    files.push('frontend/src/components/ErrorBoundary.js');

    return files;
  }

  async generateFrontendPages(frontendDir) {
    const files = [];
    const pagesDir = path.join(frontendDir, 'src/pages');
    const resources = this.application.resources || {};
    // Support both nested (resources.X) and direct (this.application.X) properties
    const dataModels = resources.dataModels || this.application.dataModels || [];
    const workflows = resources.workflows || this.application.workflows || [];
    const forms = resources.forms || this.application.forms || [];

    // 1. Dashboard page -- upgraded with Shadcn components, responsive grid, skeletons, and trend indicators
    const appName = this.application.name || 'Your Application';
    const dashboard = `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logsApi, workflowsApi, formsApi, dataApi } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { LayoutDashboard, FileText, Database, Activity, ArrowUpRight, ArrowDownRight, Clock, Plus } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, workflowsRes, formsRes] = await Promise.all([
        logsApi.getStatistics().catch(() => ({ data: {} })),
        workflowsApi.list().catch(() => ({ data: [] })),
        formsApi.list().catch(() => ({ data: [] }))
      ]);

      const wfCount = workflowsRes.data?.length || ${workflows.length};
      const formCount = formsRes.data?.length || ${forms.length};
      const execCount = statsRes.data?.statistics?.totalExecutions || 0;

      setStats({
        workflows: { value: wfCount, trend: wfCount > 0 ? 'up' : 'neutral', label: 'Workflows' },
        forms: { value: formCount, trend: formCount > 0 ? 'up' : 'neutral', label: 'Forms' },
        dataModels: { value: ${dataModels.length}, trend: 'neutral', label: 'Data Models' },
        executions: { value: execCount, trend: execCount > 0 ? 'up' : 'neutral', label: 'Executions' }
      });

      // Build recent activity from available data
      const activity = [];
      if (workflowsRes.data && Array.isArray(workflowsRes.data)) {
        workflowsRes.data.slice(0, 5).forEach(wf => {
          activity.push({ type: 'workflow', name: wf.name || 'Workflow', time: wf.updatedAt || wf.createdAt || 'Recently' });
        });
      }
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: IconComp, label, value, trend }) => (
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconComp className="w-5 h-5 text-primary" />
          </div>
          {trend === 'up' && <span className="flex items-center text-xs font-medium text-green-600"><ArrowUpRight className="w-3 h-3 mr-0.5" />Active</span>}
          {trend === 'down' && <span className="flex items-center text-xs font-medium text-red-500"><ArrowDownRight className="w-3 h-3 mr-0.5" />Down</span>}
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );

  const SkeletonCard = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-12 h-4 rounded" />
        </div>
        <Skeleton className="w-16 h-7 rounded mb-2" />
        <Skeleton className="w-24 h-4 rounded" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to ${appName.replace(/'/g, "\\'")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard icon={Activity} label={stats?.workflows?.label} value={stats?.workflows?.value} trend={stats?.workflows?.trend} />
            <StatCard icon={FileText} label={stats?.forms?.label} value={stats?.forms?.value} trend={stats?.forms?.trend} />
            <StatCard icon={Database} label={stats?.dataModels?.label} value={stats?.dataModels?.value} trend={stats?.dataModels?.trend} />
            <StatCard icon={LayoutDashboard} label={stats?.executions?.label} value={stats?.executions?.value} trend={stats?.executions?.trend} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest workflow and form activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {typeof item.time === 'string' ? item.time : 'Recently'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/workflows')}>
              <Activity className="w-4 h-4 mr-2" />View Workflows
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/forms')}>
              <FileText className="w-4 h-4 mr-2" />Browse Forms
            </Button>
            <Button className="w-full justify-start" onClick={() => navigate('/workflows')}>
              <Plus className="w-4 h-4 mr-2" />Start New Process
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'Dashboard.js'), dashboard);
    files.push('frontend/src/pages/Dashboard.js');

    // 2. Workflows page
    const workflowsPage = `import React, { useState, useEffect } from 'react';
import { workflowsApi } from '../api/client';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const [wfRes, instRes] = await Promise.all([
        workflowsApi.list(),
        workflowsApi.getInstances().catch(() => ({ data: [] }))
      ]);
      setWorkflows(wfRes.data || []);
      setInstances(instRes.data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkflow = async (data) => {
    try {
      await workflowsApi.start(selectedWorkflow.id, data);
      setShowStartModal(false);
      setSelectedWorkflow(null);
      loadWorkflows();
      alert('Workflow started successfully!');
    } catch (error) {
      alert('Error starting workflow: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading workflows...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Workflows</h1>
        <p>Manage and execute your workflows</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Workflows ({workflows.length})</h3>
        </div>
        {workflows.length === 0 ? (
          <div className="empty-state">
            <h3>No Workflows</h3>
            <p>No workflows have been defined yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Nodes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.id}>
                  <td><strong>{wf.name}</strong></td>
                  <td>{wf.description || '-'}</td>
                  <td>{wf.nodes?.length || 0}</td>
                  <td>
                    <button
                      className="btn btn-success action-btn"
                      onClick={() => {
                        setSelectedWorkflow(wf);
                        setShowStartModal(true);
                      }}
                    >
                      Start
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Instances</h3>
        </div>
        {instances.length === 0 ? (
          <div className="empty-state">
            <p>No workflow instances yet. Start a workflow to see it here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Instance ID</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {instances.slice(0, 10).map((inst) => (
                <tr key={inst.id}>
                  <td>{inst.id.substring(0, 8)}...</td>
                  <td>{inst.workflow_id}</td>
                  <td>
                    <span className={\`status-badge status-\${inst.status?.toLowerCase()}\`}>
                      {inst.status}
                    </span>
                  </td>
                  <td>{new Date(inst.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title={\`Start: \${selectedWorkflow?.name || 'Workflow'}\`}
      >
        <p className="mb-4 text-muted-foreground">
          Enter input data for this workflow (optional):
        </p>
        <FormRenderer
          form={{ fields: [
            { name: 'input', label: 'Input Data (JSON)', type: 'textarea', placeholder: '{"key": "value"}' }
          ]}}
          onSubmit={(data) => {
            const input = data.input ? JSON.parse(data.input) : {};
            handleStartWorkflow(input);
          }}
          onCancel={() => setShowStartModal(false)}
        />
      </Modal>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'WorkflowsPage.js'), workflowsPage);
    files.push('frontend/src/pages/WorkflowsPage.js');

    // 3. Forms page
    const formsPage = `import React, { useState, useEffect } from 'react';
import { formsApi } from '../api/client';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

export default function FormsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const res = await formsApi.list();
      setForms(res.data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (data) => {
    try {
      await formsApi.submit(selectedForm.id, data);
      setShowFormModal(false);
      setSelectedForm(null);
      alert('Form submitted successfully!');
    } catch (error) {
      alert('Error submitting form: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading forms...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Forms</h1>
        <p>View and fill out available forms</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Forms ({forms.length})</h3>
        </div>
        {forms.length === 0 ? (
          <div className="empty-state">
            <h3>No Forms</h3>
            <p>No forms have been defined yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {forms.map((form) => (
              <div key={form.id} className="card" style={{ margin: 0 }}>
                <h4 style={{ marginBottom: '8px' }}>{form.name || form.title}</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  {form.description || \`\${form.fields?.length || 0} fields\`}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedForm(form);
                    setShowFormModal(true);
                  }}
                >
                  Open Form
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={selectedForm?.name || selectedForm?.title || 'Form'}
      >
        {selectedForm && (
          <FormRenderer
            form={selectedForm}
            onSubmit={handleSubmitForm}
            onCancel={() => setShowFormModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'FormsPage.js'), formsPage);
    files.push('frontend/src/pages/FormsPage.js');

    // 4. Generate a page for each data model
    for (const model of dataModels) {
      const modelPage = this.generateDataModelPage(model);
      await fs.writeFile(path.join(pagesDir, `${model.name}Page.js`), modelPage);
      files.push(`frontend/src/pages/${model.name}Page.js`);
    }

    // 5. Generate Authentication Pages (only if no auth pages in pages.json)
    const pagesJson = resources.pages || this.application.pages || [];
    const hasAuthPagesInJson = pagesJson.some(p => {
      const route = (p.route || '').toLowerCase();
      return p.type === 'auth' || ['/login', '/register', '/signup', '/forgot-password', '/reset-password'].some(r => route.includes(r));
    });
    if (!hasAuthPagesInJson) {
      files.push(...await this.generateAuthPages(pagesDir));
    }

    // 6. Generate pages from pages.json
    const pages = pagesJson;
    if (pages.length > 0) {
      console.log(`[ApplicationGenerator] Generating ${pages.length} dynamic pages from pages.json...`);
      for (const pageSpec of pages) {
        try {
          const pageComponent = this.generatePageFromSpec(pageSpec, dataModels);
          const pageName = this.getPageComponentName(pageSpec);
          await fs.writeFile(path.join(pagesDir, `${pageName}.js`), pageComponent);
          files.push(`frontend/src/pages/${pageName}.js`);
          console.log(`[ApplicationGenerator] Generated page: ${pageName} for route ${pageSpec.route}`);
        } catch (error) {
          console.error(`[ApplicationGenerator] Error generating page ${pageSpec.name}:`, error.message);
        }
      }
    }

    return files;
  }

  getPageComponentName(pageSpec) {
    // Convert page name to PascalCase component name
    // "Task List Page" -> "TaskListPage"
    return pageSpec.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  generatePageFromSpec(pageSpec, dataModels) {
    const componentName = this.getPageComponentName(pageSpec);
    const dataBindings = this.extractDataBindings(pageSpec);

    // Generate imports
    const imports = `import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';`;

    // Generate data loading logic
    const dataLoadingCode = this.generateDataLoadingCode(dataBindings, dataModels);

    // Generate component render
    const renderCode = this.generatePageRenderCode(pageSpec);

    return `${imports}

export default function ${componentName}() {
  const navigate = useNavigate();
  const params = useParams();
  ${dataLoadingCode}

  return (
    <div className="page-container">
      ${renderCode}
    </div>
  );
}`;
  }

  extractDataBindings(pageSpec) {
    // Extract all {{placeholder}} references from the page spec
    const bindings = new Set();
    const jsonStr = JSON.stringify(pageSpec);
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(jsonStr)) !== null) {
      const binding = match[1].trim();
      // Extract the data source (e.g., "tasks" from "tasks.totalCount")
      const source = binding.split('.')[0];
      bindings.add(source);
    }

    return Array.from(bindings);
  }

  generateDataLoadingCode(dataBindings, dataModels) {
    if (dataBindings.length === 0) return '';

    const stateVars = dataBindings.map(binding => {
      const modelName = binding.charAt(0).toUpperCase() + binding.slice(1);
      return `  const [${binding}, set${modelName}] = useState({ totalCount: 0, pendingCount: 0, inProgressCount: 0, completedCount: 0, all: [], pending: [], inProgress: [], completed: [] });`;
    }).join('\n');

    const dataFetching = dataBindings.map(binding => {
      const modelName = binding.charAt(0).toUpperCase() + binding.slice(1);
      return `      try {
        const ${binding}Res = await fetch('/api/data/${binding}');
        const ${binding}Json = await ${binding}Res.json();
        const ${binding}All = ${binding}Json.data || [];
        set${modelName}({
          totalCount: ${binding}All.length,
          pendingCount: ${binding}All.filter(r => r.status === 'pending' || r.status === 'Pending').length,
          inProgressCount: ${binding}All.filter(r => r.status === 'in_progress' || r.status === 'In Progress' || r.status === 'active').length,
          completedCount: ${binding}All.filter(r => r.status === 'completed' || r.status === 'Completed' || r.status === 'done').length,
          all: ${binding}All,
          pending: ${binding}All.filter(r => r.status === 'pending' || r.status === 'Pending'),
          inProgress: ${binding}All.filter(r => r.status === 'in_progress' || r.status === 'In Progress' || r.status === 'active'),
          completed: ${binding}All.filter(r => r.status === 'completed' || r.status === 'Completed' || r.status === 'done')
        });
      } catch (e) { console.warn('Failed to load ${binding}:', e); }`;
    }).join('\n');

    return `  const [loading, setLoading] = useState(true);
${stateVars}

  useEffect(() => {
    const loadData = async () => {
      try {
${dataFetching}
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }`;
  }

  generatePageRenderCode(pageSpec) {
    let html = '';

    // Generate page header
    if (pageSpec.title) {
      html += `
      <div className="page-header">
        <h1>${pageSpec.title}</h1>
        ${pageSpec.description ? `<p className="page-description">${pageSpec.description}</p>` : ''}
      </div>`;
    }

    // Generate sections
    if (pageSpec.sections && pageSpec.sections.length > 0) {
      for (const section of pageSpec.sections) {
        html += this.generateSectionCode(section);
      }
    }

    return html;
  }

  generateSectionCode(section) {
    let html = `\n      <div className="page-section ${section.type}">`;

    if (section.components && section.components.length > 0) {
      for (const component of section.components) {
        html += this.generateComponentCode(component);
      }
    }

    html += '\n      </div>';
    return html;
  }

  generateComponentCode(component) {
    const type = component.type;

    switch (type) {
      case 'stat-card':
        return this.generateStatCardCode(component);
      case 'table':
        return this.generateTableCode(component);
      case 'card':
        return this.generateCardCode(component);
      case 'form':
        return this.generateFormRefCode(component);
      case 'container':
        return this.generateContainerCode(component);
      case 'heading':
        return this.generateHeadingCode(component);
      case 'text':
        return this.generateTextCode(component);
      case 'button':
        return this.generateButtonCode(component);
      default:
        return `\n        {/* Unsupported component type: ${type} */}`;
    }
  }

  generateStatCardCode(component) {
    const config = component.config || {};
    // Replace placeholders with actual data references
    const value = this.replacePlaceholders(config.value || '0');

    return `
        <div className="stat-card">
          <div className="stat-value">{${value}}</div>
          <div className="stat-label">${config.title || ''}</div>
        </div>`;
  }

  generateTableCode(component) {
    const config = component.config || {};
    const columns = config.columns || [];
    const dataSource = config.dataSource || config.dataBinding || 'data';
    // Extract base data source name (e.g., "tickets" from "tickets.all")
    const baseName = dataSource.split('.')[0];
    const dataPath = dataSource.includes('.') ? dataSource : `${dataSource}.all`;

    return `
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label || col.key}</th>`).join('\n                ')}
              </tr>
            </thead>
            <tbody>
              {(${this.replacePlaceholders(dataPath)} || []).map((row, idx) => (
                <tr key={row.id || idx}>
                  ${columns.map(col => `<td>{row.${col.key} || '-'}</td>`).join('\n                  ')}
                </tr>
              ))}
              {(!${this.replacePlaceholders(dataPath)} || ${this.replacePlaceholders(dataPath)}.length === 0) && (
                <tr><td colSpan={${columns.length}} className="text-center text-muted-foreground p-5">No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>`;
  }

  generateCardCode(component) {
    const config = component.config || {};
    let html = `\n        <div className="page-card">`;

    if (config.title) {
      html += `\n          <h3 className="card-title">${this.replacePlaceholders(config.title)}</h3>`;
    }

    if (config.description) {
      html += `\n          <p className="card-description">${this.replacePlaceholders(config.description)}</p>`;
    }

    if (config.children && config.children.length > 0) {
      for (const child of config.children) {
        html += this.generateComponentCode(child);
      }
    }

    html += '\n        </div>';
    return html;
  }

  generateFormRefCode(component) {
    const formRef = component.formRef || component.config?.formRef;
    return `\n        {/* Form reference: ${formRef} */}\n        <div className="form-container">Form placeholder</div>`;
  }

  generateContainerCode(component) {
    const config = component.config || {};
    let html = '\n        <div className="container">';

    if (config.children && config.children.length > 0) {
      for (const child of config.children) {
        html += this.generateComponentCode(child);
      }
    }

    html += '\n        </div>';
    return html;
  }

  generateHeadingCode(component) {
    const config = component.config || {};
    const variant = config.variant || 'h2';
    const text = this.replacePlaceholders(config.text || '');
    return `\n        <${variant}>${text}</${variant}>`;
  }

  generateTextCode(component) {
    const config = component.config || {};
    const text = this.replacePlaceholders(config.text || '');
    return `\n        <p className="text-${config.variant || 'body'}">${text}</p>`;
  }

  generateButtonCode(component) {
    const config = component.config || {};
    const label = config.label || 'Button';
    const variant = config.variant || 'primary';
    return `\n        <button className="btn btn-${variant}">${label}</button>`;
  }

  replacePlaceholders(text) {
    // Convert {{placeholder}} to {jsExpression}
    if (typeof text !== 'string') return text;

    // Replace {{variable.property}} with {variable.property}
    return text.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
      return `{${content.trim()}}`;
    });
  }

  /**
   * Generate a ChartWrapper component for the frontend.
   */
  async generateChartWrapper(frontendDir) {
    const themeColors = this.generatedTheme?.theme?.colors || {};
    const chartColors = [
      themeColors.primary || '#3b82f6',
      themeColors.success || '#10b981',
      themeColors.accent || '#f59e0b',
      themeColors.error || '#ef4444',
      themeColors.info || '#8b5cf6',
      themeColors.warning || '#ec4899',
      themeColors.secondary || '#06b6d4',
      themeColors.focus || '#84cc16'
    ];
    const code = UICodeGenerator.getChartWrapperTemplate(chartColors);
    await fs.writeFile(path.join(frontendDir, 'src/components/ChartWrapper.js'), code);
    return 'frontend/src/components/ChartWrapper.js';
  }

  /**
   * LLM-powered UI code generation: convert pages.json definitions
   * into actual React components using UICodeGenerator.
   *
   * Falls back to existing PageRenderer approach if generation fails.
   */
  async generateUICodePages(frontendDir) {
    const files = [];
    const resources = this.application.resources || {};
    const pages = resources.pages || this.application.pages || [];

    if (pages.length === 0) {
      console.log('[ApplicationGenerator] No pages to generate UI code for.');
      return files;
    }

    // Skip if ANTHROPIC_API_KEY is not set
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[ApplicationGenerator] ANTHROPIC_API_KEY not set, skipping UI code generation.');
      return files;
    }

    const forms = resources.forms || this.application.forms || [];
    const dataModels = resources.dataModels || this.application.dataModels || [];
    const workflows = resources.workflows || this.application.workflows || [];
    const designSystem = this.generatedTheme?.theme || null;

    const uiCodeGenerator = new UICodeGenerator();
    const pagesDir = path.join(frontendDir, 'src/pages');
    const generatedPageNames = [];
    const fallbackPages = [];

    console.log(`[ApplicationGenerator] Starting UI code generation for ${pages.length} pages...`);

    for (const page of pages) {
      try {
        const associatedForms = forms.filter(f =>
          (page.forms || []).includes(f.id) || (page.forms || []).includes(f.name)
        );

        const result = await uiCodeGenerator.generatePageComponent(
          page, associatedForms, dataModels, workflows, designSystem
        );

        if (result.fallback) {
          fallbackPages.push(page.name);
          console.log(`[ApplicationGenerator] Page "${page.name}" using PageRenderer fallback.`);
          continue;
        }

        const pageName = this.getPageComponentName(page);
        const filePath = path.join(pagesDir, `${pageName}.jsx`);
        await fs.writeFile(filePath, result.code);
        files.push(`frontend/src/pages/${pageName}.jsx`);
        generatedPageNames.push({ name: pageName, route: page.route });
        console.log(`[ApplicationGenerator] UI code generated: ${pageName}.jsx`);
      } catch (error) {
        fallbackPages.push(page.name);
        console.error(`[ApplicationGenerator] UI code generation failed for "${page.name}":`, error.message);
      }
    }

    console.log(`[ApplicationGenerator] UI code generation complete: ${generatedPageNames.length} generated, ${fallbackPages.length} using fallback.`);

    // Update App.js to import generated page components instead of using PageRenderer
    if (generatedPageNames.length > 0) {
      await this.patchAppJsWithGeneratedPages(frontendDir, generatedPageNames, pages);
      files.push('frontend/src/App.js'); // overwritten
    }

    // Write generation report to README
    try {
      const readmePath = path.join(this.outputPath, 'README.md');
      let readme = '';
      try { readme = await fs.readFile(readmePath, 'utf-8'); } catch (e) { /* new file */ }

      const reportLines = [
        '',
        '## Generation Report',
        '',
        '| Page | Method | Notes |',
        '|------|--------|-------|'
      ];
      for (const p of generatedPageNames) {
        reportLines.push(`| ${p.name}.jsx | UICodeGenerator | Generated |`);
      }
      for (const name of fallbackPages) {
        reportLines.push(`| ${name} | PageRenderer (fallback) | Code generation failed |`);
      }
      reportLines.push('');

      if (readme.includes('## Generation Report')) {
        readme = readme.replace(/## Generation Report[\s\S]*?(?=\n## |\n$|$)/, reportLines.join('\n'));
      } else {
        readme += reportLines.join('\n');
      }
      await fs.writeFile(readmePath, readme);
    } catch (e) {
      // Non-critical, don't fail generation
    }

    return files;
  }

  /**
   * Replace App.js routes section with template-based generation.
   * Uses direct component imports for UICodeGenerator pages and
   * PageRenderer as explicit fallback for pages that weren't generated.
   */
  async patchAppJsWithGeneratedPages(frontendDir, generatedPages, allPages) {
    const appJsPath = path.join(frontendDir, 'src/App.js');

    try {
      let appJs = await fs.readFile(appJsPath, 'utf-8');

      // Build import statements for generated pages
      const imports = generatedPages.map(p =>
        `import ${p.name} from './pages/${p.name}';`
      ).join('\n');

      // Insert imports after the existing PageRenderer import
      const pageRendererImport = "import PageRenderer from './components/PageRenderer';";
      if (appJs.includes(pageRendererImport)) {
        appJs = appJs.replace(
          pageRendererImport,
          `${pageRendererImport}\n${imports}`
        );
      }

      // Build complete route list from the page definitions
      const generatedNames = new Set(generatedPages.map(p => p.name));
      const routeLines = [];

      for (const page of allPages) {
        const componentName = this.getPageComponentName(page);
        const route = page.route || `/${(page.name || '').toLowerCase().replace(/\s+/g, '-')}`;

        if (generatedNames.has(componentName)) {
          // UICodeGenerator produced a .jsx file for this page -- use it directly
          routeLines.push(`<Route path="${route}" element={<${componentName} />} />`);
        } else {
          // Fallback: use PageRenderer for this page
          routeLines.push(`<Route key="${page.id}" path="${route}" element={<PageRenderer page={pages.find(p => p.id === '${page.id}')} forms={forms} user={user} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} socket={socket} />} />`);
        }

        // Auto-generate nested detail route for list/table pages
        const pageType = (page.type || '').toLowerCase();
        const hasDataModel = page.dataModelId || page.data_model_id || (page.sections || []).some(s => s.type === 'table' || s.type === 'list');
        if ((pageType === 'list' || pageType === 'table' || hasDataModel) && !route.includes(':id')) {
          const detailRoute = `${route}/:id`;
          routeLines.push(`<Route path="${detailRoute}" element={<PageRenderer page={pages.find(p => p.id === '${page.id}')} forms={forms} user={user} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} socket={socket} detailMode={true} />} />`);
        }
      }

      const allRoutes = routeLines.join('\n          ');

      // Replace the pages.map() pattern with the explicit route list
      const pagesMapPattern = /\{pages\.map\(page => <Route key=\{page\.id\} path=\{page\.route\} element=\{<PageRenderer[^}]*\}\s*\/>\}\s*\/>\)\}/;

      if (pagesMapPattern.test(appJs)) {
        appJs = appJs.replace(pagesMapPattern, allRoutes);
      }

      await fs.writeFile(appJsPath, appJs);
      console.log(`[ApplicationGenerator] Rebuilt App.js routes: ${generatedPages.length} generated, ${allPages.length - generatedPages.length} fallback (PageRenderer).`);
    } catch (error) {
      console.error('[ApplicationGenerator] Failed to rebuild App.js routes:', error.message);
    }
  }

  async generateAuthPages(pagesDir) {
    const files = [];

    // Login Page
    const loginPage = `import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, setAuthToken } from '../api/client';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { accessToken, user } = response.data;
      setAuthToken(accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user, accessToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="auth-links">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="auth-social">
          <button type="button" className="social-btn google-btn" onClick={() => window.location.href = '/api/auth/google'}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          <button type="button" className="social-btn github-btn" onClick={() => window.location.href = '/api/auth/github'}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
            GitHub
          </button>
        </div>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'LoginPage.js'), loginPage);
    files.push('frontend/src/pages/LoginPage.js');

    // Register Page
    const registerPage = `import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, setAuthToken } from '../api/client';

export default function RegisterPage({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register(formData.email, formData.password, { name: formData.name });
      const { accessToken, user } = response.data;
      setAuthToken(accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user, accessToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Sign up to get started</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or sign up with</span>
        </div>

        <div className="auth-social">
          <button type="button" className="social-btn google-btn" onClick={() => window.location.href = '/api/auth/google'}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          <button type="button" className="social-btn github-btn" onClick={() => window.location.href = '/api/auth/github'}>
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
            GitHub
          </button>
        </div>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'RegisterPage.js'), registerPage);
    files.push('frontend/src/pages/RegisterPage.js');

    // Forgot Password Page
    const forgotPasswordPage = `import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Check Your Email</h1>
            <p>We've sent password reset instructions to {email}</p>
          </div>
          <div className="auth-footer">
            <p><Link to="/login">Back to Sign In</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p>Enter your email to reset your password</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Remember your password? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'ForgotPasswordPage.js'), forgotPasswordPage);
    files.push('frontend/src/pages/ForgotPasswordPage.js');

    // Reset Password Page
    const resetPasswordPage = `import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, formData.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Invalid Link</h1>
            <p>This password reset link is invalid or has expired.</p>
          </div>
          <div className="auth-footer">
            <p><Link to="/forgot-password">Request a new link</Link></p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Password Reset</h1>
            <p>Your password has been successfully reset. Redirecting to login...</p>
          </div>
          <div className="auth-footer">
            <p><Link to="/login">Go to Sign In</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Set New Password</h1>
          <p>Enter your new password</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter new password"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Remember your password? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}`;

    await fs.writeFile(path.join(pagesDir, 'ResetPasswordPage.js'), resetPasswordPage);
    files.push('frontend/src/pages/ResetPasswordPage.js');

    return files;
  }

  generateDataModelPage(model) {
    const fields = model.fields || [];
    const columns = fields.slice(0, 6).map(f => ({
      name: f.name,
      label: f.label || f.name,
      type: f.type
    }));

    const columnsJson = JSON.stringify(columns);
    const formFieldsJson = JSON.stringify(fields.map(f => ({
      name: f.name,
      label: f.label || f.name,
      type: this.mapFieldTypeToFormType(f.type),
      required: f.required || false,
      placeholder: `Enter ${f.label || f.name}`
    })));

    return `import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = ${columnsJson};
const formFields = ${formFieldsJson};

export default function ${model.name}Page() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('${model.name.toLowerCase()}');
      setData(res.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await dataApi.delete('${model.name.toLowerCase()}', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('${model.name.toLowerCase()}', editItem.id, formData);
      } else {
        await dataApi.create('${model.name.toLowerCase()}', formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      alert('Error saving: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>${model.name}</h1>
        <p>${model.description || `Manage ${model.name} records`}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">${model.name} Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add ${model.name}
          </button>
        </div>
        <DataTable
          columns={columns}
          data={data}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit ${model.name}' : 'Add ${model.name}'}
      >
        <FormRenderer
          form={{ fields: formFields }}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}`;
  }

  /**
   * Generate SSR (Server-Side Rendering) modules
   */
  async generateSSR() {
    console.log('[ApplicationGenerator] Generating SSR modules...');
    const files = [];

    // Create SSR directory
    const ssrDir = path.join(this.outputPath, 'src/ssr');
    await fs.mkdir(ssrDir, { recursive: true });

    // Generate SSR files
    files.push(await this.generateSSRPageDataService());
    files.push(await this.generateSSRHtmlRenderer());
    files.push(await this.generateSSRIndex());

    console.log('[ApplicationGenerator] SSR modules generated');
    return files;
  }

  /**
   * Generate SSR PageDataService
   */
  async generateSSRPageDataService() {
    const appName = this.application.name || 'app';

    const content = `/**
 * Page Data Service
 * Pre-fetches page data for server-side rendering
 */

const fs = require('fs');
const path = require('path');
const database = require('../database');

class PageDataService {
  constructor() {
    this.pagesPath = path.join(__dirname, '../resources/pages.json');
    this.formsPath = path.join(__dirname, '../resources/forms.json');
    this.dataModelsPath = path.join(__dirname, '../resources/dataModels.json');
    this.themePath = path.join(__dirname, '../../frontend/src/theme.json');
  }

  /**
   * Load all pages
   */
  getPages() {
    try {
      const data = fs.readFileSync(this.pagesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading pages:', error);
      return [];
    }
  }

  /**
   * Load all forms
   */
  getForms() {
    try {
      const data = fs.readFileSync(this.formsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading forms:', error);
      return [];
    }
  }

  /**
   * Load theme configuration
   */
  getTheme() {
    try {
      const data = fs.readFileSync(this.themePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading theme:', error);
      return null;
    }
  }

  /**
   * Find page by route
   */
  getPageByRoute(route) {
    const pages = this.getPages();
    // Normalize route - default to first page if '/'
    if (route === '/') {
      return pages[0] || null;
    }
    return pages.find(p => p.route === route);
  }

  /**
   * Extract template variables from page sections
   */
  extractTemplateVariables(sections) {
    const variables = new Set();

    const traverse = (obj) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        const matches = obj.match(/\\{\\{([^}]+)\\}\\}/g);
        if (matches) {
          matches.forEach(match => {
            const varName = match.replace(/\\{\\{|\\}\\}/g, '').trim();
            variables.add(varName);
          });
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (typeof obj === 'object') {
        if (obj.dataBinding) {
          variables.add(obj.dataBinding);
        }
        Object.values(obj).forEach(traverse);
      }
    };

    traverse(sections);
    return Array.from(variables);
  }

  /**
   * Fetch data from database for a model
   */
  async fetchModelData(modelName) {
    try {
      const singularName = modelName.replace(/s$/, '');
      const result = await database.query(\`SELECT * FROM \${singularName} ORDER BY created_at DESC LIMIT 100\`);
      return result.rows || [];
    } catch (error) {
      try {
        const result = await database.query(\`SELECT * FROM \${modelName} ORDER BY created_at DESC LIMIT 100\`);
        return result.rows || [];
      } catch (e) {
        console.error(\`Error fetching \${modelName}:\`, e.message);
        return [];
      }
    }
  }

  /**
   * Fetch initial data for a page based on its template variables
   */
  async fetchPageData(page) {
    const variables = this.extractTemplateVariables(page.sections || []);
    const data = {};

    // Determine which models to fetch based on page data bindings
    for (const variable of variables) {
      // Skip computed variables
      if (variable.includes('total') || variable.includes('Rate') || variable.includes('count')) {
        continue;
      }

      try {
        const modelData = await this.fetchModelData(variable);
        data[variable] = modelData;

        // Also set singular form
        const singular = variable.replace(/s$/, '');
        if (singular !== variable) {
          data[singular] = modelData;
        }

        // Compute derived stats
        if (modelData.length > 0) {
          data[\`total\${variable.charAt(0).toUpperCase() + variable.slice(1)}\`] = modelData.length;
        }
      } catch (error) {
        console.error(\`Error fetching data for \${variable}:\`, error);
      }
    }

    return data;
  }

  /**
   * Build navigation from pages
   */
  buildNavigation(pages) {
    const menuMap = new Map();
    const routeToPage = new Map(pages.map(p => [p.route, p]));

    pages.forEach(page => {
      if (page.navigation?.menu) {
        page.navigation.menu.forEach(item => {
          if (!menuMap.has(item.route)) {
            menuMap.set(item.route, {
              label: item.label,
              route: item.route,
              icon: item.icon || 'default',
              pageExists: routeToPage.has(item.route)
            });
          }
        });
      }
    });

    if (menuMap.size > 0) {
      return Array.from(menuMap.values());
    }

    // Fallback: generate navigation from pages
    return pages.filter(p => !p.route.includes(':')).map(p => ({
      label: p.title || p.name,
      route: p.route,
      icon: 'default',
      pageExists: true
    }));
  }

  /**
   * Get complete initial state for SSR
   */
  async getInitialState(route, db) {
    const pages = this.getPages();
    const forms = this.getForms();
    const theme = this.getTheme();
    const page = this.getPageByRoute(route);
    const navigation = this.buildNavigation(pages);

    let pageData = {};

    if (page && db) {
      try {
        pageData = await this.fetchPageData(page);
      } catch (error) {
        console.error('Error fetching page data:', error);
      }
    }

    return {
      pages,
      forms,
      theme,
      navigation,
      currentPage: page,
      pageData,
      route
    };
  }
}

module.exports = new PageDataService();
`;

    const filePath = path.join(this.outputPath, 'src/ssr/PageDataService.js');
    await fs.writeFile(filePath, content);
    console.log('[ApplicationGenerator] Generated PageDataService.js');
    return 'ssr/PageDataService.js';
  }

  /**
   * Generate SSR HtmlRenderer
   */
  async generateSSRHtmlRenderer() {
    const appName = this.application.name || 'app';
    const ssrLayout = this.generatedTheme?.layout || {};
    const ssrLayoutType = ssrLayout.type || 'sidebar';
    const ssrSidebarWidth = ssrLayout.sidebarWidth || '256px';
    const ssrHeaderHeight = ssrLayout.headerHeight || '64px';
    const ssrContainerMaxWidth = ssrLayout.containerMaxWidth || '1280px';
    const ssrFontFamily = this.generatedTheme?.theme?.typography?.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    let content = `/**
 * HTML Renderer
 * Generates HTML with embedded initial state for SSR hydration
 */

const fs = require('fs');
const path = require('path');

class HtmlRenderer {
  constructor() {
    this.buildPath = path.join(__dirname, '../../frontend/build');
    this.indexPath = path.join(this.buildPath, 'index.html');
    this.cachedTemplate = null;
  }

  loadTemplate() {
    if (this.cachedTemplate && process.env.NODE_ENV === 'production') {
      return this.cachedTemplate;
    }

    try {
      if (fs.existsSync(this.indexPath)) {
        this.cachedTemplate = fs.readFileSync(this.indexPath, 'utf8');
        return this.cachedTemplate;
      }
    } catch (error) {
      console.error('Error loading HTML template:', error);
    }

    return this.getDevTemplate();
  }

  getDevTemplate() {
    return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName}</title>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --border: 214.3 31.8% 91.4%;
      --radius: 0.5rem;
      ${ssrLayoutType !== 'topnav' ? `--sidebar-width: ${ssrSidebarWidth};` : ''}
      ${ssrLayoutType === 'topnav' || ssrLayoutType === 'hybrid' ? `--header-height: ${ssrHeaderHeight};` : ''}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${ssrFontFamily}; background: hsl(var(--background)); color: hsl(var(--foreground)); }
    ${ssrLayoutType === 'topnav' ? `
    .app-layout { display: flex; flex-direction: column; min-height: 100vh; }
    .app-header { height: var(--header-height); background: hsl(var(--card)); border-bottom: 1px solid hsl(var(--border)); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; position: sticky; top: 0; z-index: 50; }
    .app-header h2 { font-size: 1.125rem; font-weight: 700; }
    .app-header nav { display: flex; align-items: center; gap: 0.25rem; }
    .app-header nav a { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; color: hsl(var(--muted-foreground)); text-decoration: none; font-size: 0.875rem; border-radius: var(--radius); transition: background 0.15s, color 0.15s; white-space: nowrap; }
    .app-header nav a:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
    .app-header nav a.active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
    .main-content { flex: 1; padding: 2rem; max-width: ${ssrContainerMaxWidth}; margin: 0 auto; }
    ` : ssrLayoutType === 'hybrid' ? `
    .app-layout { display: flex; flex-direction: column; min-height: 100vh; }
    .app-header { height: var(--header-height); background: hsl(var(--card)); border-bottom: 1px solid hsl(var(--border)); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; position: sticky; top: 0; z-index: 50; }
    .app-header h2 { font-size: 1.125rem; font-weight: 700; }
    .app-body { display: flex; flex: 1; overflow: hidden; }
    .sidebar { width: var(--sidebar-width); background: hsl(var(--card)); border-right: 1px solid hsl(var(--border)); padding: 1rem 0; display: flex; flex-direction: column; flex-shrink: 0; }
    .sidebar-header { padding: 0.75rem 1.25rem; font-size: 1.125rem; font-weight: 700; border-bottom: 1px solid hsl(var(--border)); margin-bottom: 0.5rem; }
    .sidebar nav a { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1.25rem; color: hsl(var(--muted-foreground)); text-decoration: none; font-size: 0.875rem; transition: background 0.15s, color 0.15s; }
    .sidebar nav a:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
    .sidebar nav a.active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-radius: var(--radius); margin: 0 0.5rem; }
    .main-content { flex: 1; padding: 2rem; max-width: ${ssrContainerMaxWidth}; overflow: auto; }
    ` : `
    .app-layout { display: flex; min-height: 100vh; }
    .sidebar { width: var(--sidebar-width); background: hsl(var(--card)); border-right: 1px solid hsl(var(--border)); padding: 1rem 0; display: flex; flex-direction: column; }
    .sidebar-header { padding: 0.75rem 1.25rem; font-size: 1.125rem; font-weight: 700; border-bottom: 1px solid hsl(var(--border)); margin-bottom: 0.5rem; }
    .sidebar nav a { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1.25rem; color: hsl(var(--muted-foreground)); text-decoration: none; font-size: 0.875rem; transition: background 0.15s, color 0.15s; }
    .sidebar nav a:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
    .sidebar nav a.active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-radius: var(--radius); margin: 0 0.5rem; }
    .main-content { flex: 1; padding: 2rem; max-width: ${ssrContainerMaxWidth}; }
    `}
    .main-content h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
    .main-content .subtitle { color: hsl(var(--muted-foreground)); margin-bottom: 1.5rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 1.25rem; }
    .stat-card .stat-label { font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-bottom: 0.25rem; }
    .stat-card .stat-value { font-size: 1.875rem; font-weight: 700; }
    .data-table { width: 100%; border-collapse: collapse; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); overflow: hidden; }
    .data-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 500; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid hsl(var(--border)); background: hsl(var(--secondary)); }
    .data-table td { padding: 0.75rem 1rem; font-size: 0.875rem; border-bottom: 1px solid hsl(var(--border)); }
    .data-table tr:last-child td { border-bottom: none; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; border-radius: var(--radius); border: 1px solid hsl(var(--border)); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); cursor: pointer; transition: opacity 0.15s; }
    .btn:hover { opacity: 0.9; }
    .btn-outline { background: transparent; color: hsl(var(--foreground)); }
    .loading { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 1rem; color: hsl(var(--muted-foreground)); }
  </style>
</head>
<body>
  <div id="root"><!-- SSR_CONTENT_PLACEHOLDER --></div>
  <!-- SSR_STATE_PLACEHOLDER -->
</body>
</html>\`;
  }

  render(initialState) {
    let html = this.loadTemplate();

    const stateScript = \`
      <script>
        window.__INITIAL_STATE__ = \${JSON.stringify(initialState)};
        window.__SSR__ = true;
      </script>
    \`;

    if (html.includes('<!-- SSR_STATE_PLACEHOLDER -->')) {
      html = html.replace('<!-- SSR_STATE_PLACEHOLDER -->', stateScript);
    } else {
      html = html.replace('</body>', \`\${stateScript}\\n</body>\`);
    }

    return html;
  }
}

module.exports = new HtmlRenderer();
`;

    const filePath = path.join(this.outputPath, 'src/ssr/HtmlRenderer.js');
    await fs.writeFile(filePath, content);
    console.log('[ApplicationGenerator] Generated HtmlRenderer.js');
    return 'ssr/HtmlRenderer.js';
  }

  /**
   * Generate SSR index file
   */
  async generateSSRIndex() {
    const content = `/**
 * SSR Module Exports
 * Server-side rendering utilities for hybrid SSR/hydration
 */

const pageDataService = require('./PageDataService');
const htmlRenderer = require('./HtmlRenderer');

module.exports = {
  pageDataService,
  htmlRenderer
};
`;

    const filePath = path.join(this.outputPath, 'src/ssr/index.js');
    await fs.writeFile(filePath, content);
    console.log('[ApplicationGenerator] Generated ssr/index.js');
    return 'ssr/index.js';
  }

  mapFieldTypeToFormType(dbType) {
    const typeMap = {
      'string': 'text',
      'text': 'textarea',
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'boolean': 'checkbox',
      'date': 'date',
      'datetime': 'datetime-local',
      'email': 'email',
      'uuid': 'text'
    };
    return typeMap[dbType?.toLowerCase()] || 'text';
  }

  /**
   * Write precise Figma components to the frontend directory.
   */
  async writePreciseComponents(frontendDir, components) {
    const files = [];
    const figmaDir = path.join(frontendDir, 'src', 'components', 'figma');
    await fs.mkdir(figmaDir, { recursive: true });

    for (const comp of components) {
      const filePath = path.join(frontendDir, comp.filePath);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, comp.content);
      files.push(path.join('frontend', comp.filePath));
    }

    return files;
  }

  /**
   * Download precise Figma assets (images, vectors) to the frontend public directory.
   */
  async downloadPreciseAssets(frontendDir, assets) {
    const assetsDir = path.join(frontendDir, 'public', 'assets', 'figma');
    await fs.mkdir(assetsDir, { recursive: true });

    const downloads = [];

    // Download images
    if (assets.images) {
      for (const img of assets.images) {
        if (img.url) {
          downloads.push(
            this.downloadFile(img.url, path.join(assetsDir, `${img.ref}.png`))
              .catch(err => console.warn(`[ApplicationGenerator] Failed to download image ${img.ref}:`, err.message))
          );
        }
      }
    }

    // Download vectors
    if (assets.vectors) {
      for (const vec of assets.vectors) {
        if (vec.url) {
          downloads.push(
            this.downloadFile(vec.url, path.join(assetsDir, `${vec.nodeId}.svg`))
              .catch(err => console.warn(`[ApplicationGenerator] Failed to download vector ${vec.nodeId}:`, err.message))
          );
        }
      }
    }

    await Promise.all(downloads);
  }

  /**
   * Download a file from URL to local path.
   */
  async downloadFile(url, destPath) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
  }
}

module.exports = ApplicationGenerator;
