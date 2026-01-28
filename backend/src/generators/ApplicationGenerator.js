/**
 * ApplicationGenerator
 *
 * Generates complete standalone application from application definition
 * Includes: Runtime engine, APIs, DB initialization, configuration, resources
 */

const fs = require('fs').promises;
const path = require('path');
const ShadcnComponentGenerator = require('./ShadcnComponentGenerator');
const DesignExpert = require('../services/moe/experts/DesignExpert');

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
        '@anthropic-ai/sdk': '^0.71.0'
      },
      optionalDependencies: {
        '@sendgrid/mail': '^8.1.0',
        '@aws-sdk/client-ses': '^3.400.0',
        'firebase-admin': '^12.0.0',
        'pusher': '^5.2.0'
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
    } catch (error) {
      logger.error('Failed to load workflows:', error);
      throw error;
    }
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
        // Evaluate conditions and choose path
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      parallelGateway: async (node, context) => {
        logger.info(\`Parallel gateway: \${node.id}\`);
        return { status: 'completed', data: context.data };
      }
    };
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
    const { edges = [], nodes = [] } = context.workflow || this.workflows.find(w => w.id === context.workflowId) || {};

    // Find outgoing edges from this gateway
    const outgoing = edges.filter(e => e.source === node.id);

    if (outgoing.length === 0) {
      logger.warn(\`[RuntimeEngine] Gateway \${node.id} has no outgoing edges\`);
      return null;
    }

    // For exclusive gateway, evaluate conditions in order
    if (node.type === 'exclusiveGateway') {
      for (const edge of outgoing) {
        const condition = edge.data?.condition || edge.label;

        if (!condition || condition === 'default') {
          continue; // Skip default path for now
        }

        if (this.evaluateCondition(condition, context.data)) {
          logger.info(\`[RuntimeEngine] Gateway condition matched: \${condition}\`);
          return edge.target;
        }
      }

      // If no conditions matched, use default path
      const defaultEdge = outgoing.find(e =>
        !e.data?.condition || e.data?.condition === 'default' || e.label === 'default'
      );

      if (defaultEdge) {
        logger.info(\`[RuntimeEngine] Using default gateway path\`);
        return defaultEdge.target;
      }

      // Fallback to first edge
      return outgoing[0]?.target;
    }

    // For parallel gateway, return all targets (handled by workflow engine)
    if (node.type === 'parallelGateway') {
      return outgoing.map(e => e.target);
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

      // Safe evaluation with data context
      const fn = new Function('data', \`with(data) { return \${expr}; }\`);
      return fn(data);
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
    const startNode = instance.workflow.nodes.find(n => n.type === 'startEvent');
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

        // Find next node
        const nextNodeId = result.nextNode || this.getNextNode(instance, nodeId);

        if (nextNodeId) {
          await this.executeNode(instance, nextNodeId);
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
    const nextConnection = connections.find(c => c.source === currentNodeId);
    return nextConnection?.target;
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
    const apiRoutes = `/**
 * API Routes for Workflow Management
 */

const express = require('express');
const router = express.Router();
const runtimeEngine = require('../runtime/engine');
const logger = require('../utils/logger');

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

// List all records for a model
router.get('/data/:model', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const result = await database.query(\`SELECT * FROM \${tableName} ORDER BY created_at DESC\`);
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

// Create new record
router.post('/data/:model', async (req, res) => {
  try {
    const tableName = toSnakeCase(req.params.model);
    const data = req.body;

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
 * Supports SSR hybrid rendering for optimal initial load
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(\`\${req.method} \${req.path}\`);
  next();
});

// API Routes (must come before static/SSR routes)
app.use('/api', apiRoutes);
app.use('/api/execution-logs', executionLogsRoutes);

// Serve static files from frontend build
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath, {
  // Don't serve index.html for static - we'll handle it with SSR
  index: false
}));

// SSR middleware for page routes
const ssrHandler = async (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Skip static assets
  if (req.path.match(/\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
    return next();
  }

  try {
    logger.info(\`SSR rendering: \${req.path}\`);

    // Get initial state for this route
    const db = config.database.enabled ? database : null;
    const initialState = await pageDataService.getInitialState(req.path, db);

    // Render HTML with initial state
    const html = htmlRenderer.render(initialState);

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('SSR Error:', error);
    // Fall back to serving static index.html
    res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
      if (err) {
        res.status(500).send('Error loading application');
      }
    });
  }
};

// Apply SSR to all page routes
app.get('*', ssrHandler);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Initialize and start server
async function start() {
  try {
    logger.info('Starting application...');

    // Initialize database
    if (config.database.enabled) {
      await database.initialize();
      logger.info('Database initialized');
    }

    // Initialize runtime engine
    await runtimeEngine.initialize();
    logger.info('Runtime engine initialized');

    // Start server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(\`Server running on port \${PORT}\`);
      logger.info(\`Health check: http://localhost:\${PORT}/api/health\`);
      logger.info(\`API docs: http://localhost:\${PORT}/api/workflows\`);
      logger.info(\`Execution logs: http://localhost:\${PORT}/api/execution-logs/statistics\`);
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the application
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

      // Create indexes for workflow tables
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id
        ON workflow_instances(workflow_id)
      \`);

      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_workflow_instances_status
        ON workflow_instances(status)
      \`);

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

This is a complete, standalone application generated by the Workflow Platform.

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

For issues or questions, refer to the main Workflow Platform documentation.

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

    // 2. Generate public/index.html
    files.push(await this.generateIndexHtml(frontendDir));

    // 3. Generate theme and layout using LLM - it will detect industry and app type
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

    // 4. Generate Shadcn/ui infrastructure with the generated theme
    const designPreset = this.application.designPreset || 'minimal';
    const shadcnGenerator = new ShadcnComponentGenerator(this.outputPath, {
      preset: designPreset,
      includeDarkMode: this.application.includeDarkMode !== false,
      applicationName: this.application.name || 'App',
      generatedTheme // Pass the fully LLM-generated theme (includes industry, type, layout)
    });
    await shadcnGenerator.generate();
    files.push('frontend/tailwind.config.js');
    files.push('frontend/postcss.config.js');
    files.push('frontend/src/lib/utils.js');
    files.push('frontend/src/index.css');
    files.push('frontend/src/ThemeContext.js');
    files.push('frontend/src/theme.json');
    files.push('frontend/src/components/ui/*');

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

    // 9. Generate pages
    files.push(...await this.generateFrontendPages(frontendDir));

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
        'date-fns': '^2.30.0'
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
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#3b82f6" />
    <meta name="description" content="${this.application.description || 'Generated Application'}" />
    <title>${appName}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
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
    const sidebarWidth = layout.sidebarWidth || '256px';
    const containerMaxWidth = layout.containerMaxWidth || '1280px';
    const contentPadding = layout.contentPadding || '24px';

    const appJs = `import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import PageRenderer from './components/PageRenderer';
import { formsApi, setAuthToken, workflowApi } from './api/client';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import './App.css';

// Icon component for navigation
const Icon = ({ name }) => {
  const icons = {
    home: '\u2302', dashboard: '\u25A6', book: '\u2610', books: '\u2610',
    users: '\u263B\u263B', user: '\u263B', settings: '\u2699', list: '\u2630',
    cart: '\u26D2', calendar: '\u2637', bell: '\u266A', search: '\u2315',
    plus: '\u271A', chart: '\u2261', folder: '\u2610', file: '\u2610',
    money: '\u2211', alert: '\u26A0', warning: '\u26A0', package: '\u25A1',
    inventory: '\u25A1', checkout: '\u2713', help: '\u2753', ticket: '\u2630',
    default: '\u25CF'
  };
  return <span className="nav-icon">{icons[name] || icons.default}</span>;
};

// Protected Route wrapper
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
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

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
      setAuthToken(token);
    }
    setAuthChecked(true);
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
    return <div className="flex items-center justify-center h-screen bg-background"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-muted-foreground">Loading...</p></div></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-muted-foreground">Loading ${appName}...</p></div></div>;
  }

  // Separate auth pages from protected pages based on MoE-generated metadata
  const authPages = pages.filter(p => p.type === 'auth' || p.pageAssociation?.requiresAuth === false);
  const protectedPages = pages.filter(p => p.type !== 'auth' && p.pageAssociation?.requiresAuth !== false);

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
        <Routes>
          {authPages.map(page => (
            <Route
              key={page.id}
              path={page.route}
              element={<PageRenderer page={page} forms={forms} onAuthSuccess={handleLogin} />}
            />
          ))}
          <Route path="*" element={<Navigate to={authEntryPoint?.route || '/login'} replace />} />
        </Routes>
      </div>
    );
  }

  const defaultPage = dashboardPage || pages[0];

  return (
    <div className="flex min-h-screen bg-background">
      <nav className="border-r bg-card flex flex-col" style={{ width: '${sidebarWidth}' }}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold tracking-tight">${appName}</h2>
        </div>
        <div className="flex-1 py-4 px-3 space-y-1 overflow-auto">
          {navigation.map((item, index) => (
            item.type === 'section' ? (
              <div key={index} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</div>
            ) : (
              <Link key={index} to={item.route} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActiveRoute(item.route) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </Link>
            )
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="mb-3">
            <span className="text-sm font-medium">{user?.name || user?.email || 'User'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>Sign Out</Button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto" style={{ padding: '${contentPadding}' }}>
        <div style={{ maxWidth: '${containerMaxWidth}', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={defaultPage ? <Navigate to={defaultPage.route} replace /> : <div className="flex flex-col items-center justify-center h-full"><h2 className="text-2xl font-semibold">Welcome to ${appName}</h2><p className="text-muted-foreground mt-2">No pages configured.</p></div>} />
          {pages.map(page => <Route key={page.id} path={page.route} element={<PageRenderer page={page} forms={forms} workflowContext={{ instance: workflowInstance, currentTask, startWorkflow, completeTask, onFormSubmit: handleFormSubmit }} />} />)}
          {navigation.filter(n => !n.pageExists).map((item, i) => <Route key={\`fb-\${i}\`} path={item.route} element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">{item.label}</h2><p className="text-muted-foreground mt-2">Page under construction.</p></div>} />)}
          <Route path="*" element={<div className="flex flex-col items-center justify-center h-full py-16"><h2 className="text-2xl font-semibold">Page Not Found</h2><Link to="/" className="text-primary hover:underline mt-2">Go to Dashboard</Link></div>} />
        </Routes>
        </div>
      </main>
    </div>
  );
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
    const css = `/* Global Styles */
* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
  background: #f8fafc;
  color: #1e293b;
}

/* App Styles */
.app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: #1e293b;
  color: white;
  padding: 20px 0;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
}

.logo {
  padding: 0 20px 20px;
  border-bottom: 1px solid #334155;
}

.logo h2 {
  font-size: 18px;
  font-weight: 600;
}

.nav-links {
  padding: 20px 0;
}

.nav-link {
  display: block;
  padding: 12px 20px;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #334155;
  color: white;
}

.nav-section {
  padding: 20px 20px 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
}

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Page Header */
.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  color: #1e293b;
  margin-bottom: 8px;
}

.page-header p {
  color: #64748b;
}

/* Cards */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tr:hover {
  background: #f8fafc;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #e2e8f0;
  color: #475569;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

/* Forms */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
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
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Workflow Status */
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-running { background: #dbeafe; color: #1d4ed8; }
.status-completed { background: #d1fae5; color: #065f46; }
.status-failed { background: #fee2e2; color: #991b1b; }
.status-pending { background: #fef3c7; color: #92400e; }

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
  color: #64748b;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-state h3 {
  margin-bottom: 8px;
  color: #374151;
}

/* App Loading */
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f8fafc;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Navigation Icons */
.nav-icon {
  margin-right: 10px;
  font-size: 16px;
}

.nav-link.active {
  background: #334155;
  color: white;
  border-left: 3px solid #3b82f6;
}

/* Page Container */
.page-container {
  max-width: 1200px;
}

.page-description {
  color: #64748b;
  margin-top: 8px;
}

/* Page Sections */
.page-header-section {
  margin-bottom: 24px;
}

.page-main-section {
  display: grid;
  gap: 24px;
}

.page-sidebar-section {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
}

/* Page Cards */
.page-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.page-card .card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.page-card .card-description {
  color: #666666;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Page Tables */
.page-table {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e5e5;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

/* Metric Cards */
.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e5e5;
  text-align: center;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 4px;
}

.metric-label {
  color: #64748b;
  font-size: 14px;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.badge-default { background: #e2e8f0; color: #475569; }
.badge-primary { background: #dbeafe; color: #1d4ed8; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger { background: #fee2e2; color: #991b1b; }

/* Modern Form Input Focus States */
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Button Hover/Active States */
button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Table Row Hover */
.data-table tbody tr {
  transition: background-color 0.15s ease;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
    padding: 10px 0;
  }

  .logo h2, .nav-section, .nav-link span {
    display: none;
  }

  .main-content {
    margin-left: 60px;
  }
}

/* Authentication Styles */
.auth-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 420px;
}

.auth-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.auth-header p {
  color: #64748b;
  font-size: 15px;
}

.auth-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  border: 1px solid #fecaca;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.auth-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.auth-form input {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s;
}

.auth-form input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.auth-links {
  display: flex;
  justify-content: flex-end;
}

.auth-links a {
  color: #667eea;
  font-size: 14px;
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}

.auth-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.auth-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.auth-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.auth-footer p {
  color: #64748b;
  font-size: 14px;
}

.auth-footer a {
  color: #667eea;
  font-weight: 500;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Sidebar Footer (Logout) */
.nav-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  border-top: 1px solid #334155;
  background: #1e293b;
}

.user-info {
  margin-bottom: 12px;
}

.user-name {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #334155;
  color: white;
  border-color: #64748b;
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
  refresh: () => api.post('/auth/refresh')
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
  claimTask: (instanceId, taskId) => api.post(\`/instances/\${instanceId}/claim\`, { taskId }),

  // Get workflow execution history
  getHistory: (instanceId) => api.get(\`/instances/\${instanceId}/history\`)
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

    // 1. FormRenderer component
    const formRenderer = `import React, { useState } from 'react';

export default function FormRenderer({ form, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};
    (form.fields || []).forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = \`\${field.label || field.name} is required\`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className="form-textarea"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
      case 'dropdown':
        return (
          <select
            className="form-select"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
          >
            <option value="">Select {field.label}...</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleChange(field.name, e.target.checked)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <input
            type="text"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {(form.fields || []).map((field, index) => (
        <div key={index} className="form-group">
          <label className="form-label">
            {field.label || field.name}
            {field.required && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
          {renderField(field)}
          {errors[field.name] && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors[field.name]}
            </div>
          )}
        </div>
      ))}
      <div className="modal-footer">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </div>
    </form>
  );
}`;

    await fs.writeFile(path.join(componentsDir, 'FormRenderer.js'), formRenderer);
    files.push('frontend/src/components/FormRenderer.js');

    // 2. DataTable component
    const dataTable = `import React from 'react';

export default function DataTable({ columns, data, onEdit, onDelete, onView }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Data</h3>
        <p>No records found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i}>{col.label || col.name}</th>
          ))}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={row.id || rowIndex}>
            {columns.map((col, colIndex) => (
              <td key={colIndex}>
                {formatValue(row[col.name], col.type)}
              </td>
            ))}
            <td>
              <div className="action-buttons">
                {onView && (
                  <button className="btn btn-secondary action-btn" onClick={() => onView(row)}>
                    View
                  </button>
                )}
                {onEdit && (
                  <button className="btn btn-primary action-btn" onClick={() => onEdit(row)}>
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-danger action-btn" onClick={() => onDelete(row)}>
                    Delete
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatValue(value, type) {
  if (value === null || value === undefined) return '-';

  switch (type) {
    case 'date':
    case 'datetime':
      return new Date(value).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'json':
      return JSON.stringify(value).substring(0, 50) + '...';
    default:
      return String(value);
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

    // 4. PageRenderer component - renders pages dynamically with Shadcn UI components
    const pageRenderer = `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';
import { dataApi } from '../api/client';

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
import { cn } from '../lib/utils';

export default function PageRenderer({ page, forms, workflowContext = {}, onAuthSuccess }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submittingForm, setSubmittingForm] = useState(null);
  const navigate = useNavigate();

  // Destructure workflow context for easy access
  const { instance: workflowInstance, currentTask, onFormSubmit: workflowFormSubmit } = workflowContext;

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
    const traverse = (items) => {
      if (!items) return;
      for (const item of items) {
        if (item.dataBinding) bindings.add(item.dataBinding);
        if (item.components) traverse(item.components);
        if (item.children) traverse(item.children);
      }
    };
    traverse(sections);
    return Array.from(bindings);
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
    (form.fields || []).forEach(field => {
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
  };

  // Render a form field with Shadcn UI components
  const renderFormField = (field, form) => {
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
        default: return <Input type="text" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
      }
    };
    if (field.type === 'checkbox') return <div key={field.id} className="mb-4">{renderInput()}{errors[field.name] && <p className="text-destructive text-sm mt-1">{errors[field.name]}</p>}</div>;
    return <div key={field.id} className="mb-4 space-y-2"><Label>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>{renderInput()}{errors[field.name] && <p className="text-destructive text-sm">{errors[field.name]}</p>}</div>;
  };

  // Render inline form within a card
  const renderInlineForm = (formId) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return <p className="text-muted-foreground">Form not found</p>;
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

  const renderComponent = (component, index) => {
    if (!component) return null;
    const { type, config, formRef, dataBinding, children } = component;
    switch (type) {
      case 'container':
        return <div key={index} className={cn("w-full", config?.maxWidth && "mx-auto")} style={{ maxWidth: config?.maxWidth || '100%', padding: config?.padding || '0' }}>{(config?.children || children || component.components || []).map((c, i) => renderComponent(c, i))}</div>;
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
      case 'stat-card':
        return <Card key={index} className="hover:shadow-lg transition-shadow"><CardContent className="pt-6"><div className="flex justify-between items-start"><div><p className="text-sm font-medium text-muted-foreground">{config?.title}</p><p className="text-3xl font-bold mt-1">{config?.value || '0'}</p>{config?.trend && <span className={cn("text-sm mt-1 inline-block", config?.trendDirection === 'up' ? 'text-green-600' : 'text-red-600')}>{config?.trendDirection === 'up' ? '+' : ''}{config?.trend}</span>}</div>{config?.icon && <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{config.icon === 'clipboard-list' ? '☐' : config.icon === 'clock' ? '⏱' : config.icon === 'check-circle' ? '✓' : '●'}</div>}</div></CardContent></Card>;
      case 'buttonGroup':
        return <div key={index} className="flex gap-3 flex-wrap">{(config?.buttons || []).map((btn, i) => <Button key={i} variant={btn.variant === 'primary' ? 'default' : btn.variant === 'destructive' ? 'destructive' : 'outline'}>{btn.icon && <span className="mr-2">{btn.icon === 'plus' ? '+' : btn.icon === 'x' ? '×' : btn.icon === 'check' ? '✓' : '●'}</span>}{btn.label}</Button>)}</div>;
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
        return <Button key={index} variant={buttonVariant} onClick={() => handleAction(component.action)}>{config?.icon && <span className="mr-2">{config.icon === 'plus' ? '+' : config.icon === 'check' ? '✓' : '●'}</span>}{config?.text || config?.label}</Button>;
      case 'table':
        const [tableModel] = (dataBinding || '').split('.');
        const tableData = data[tableModel] || [];
        const columns = (config?.columns || []).map(col => ({ name: col.key, label: col.label, type: col.type || 'text' }));
        return <Card key={index}>{config?.title && <CardHeader><CardTitle>{config.title}</CardTitle></CardHeader>}<CardContent><DataTable columns={columns} data={tableData} /></CardContent></Card>;
      case 'metric':
        const [metricModel] = (dataBinding || '').split('.');
        const metricData = data[metricModel] || [];
        const metricValue = config?.aggregation === 'count' ? metricData.length : config?.aggregation === 'sum' ? metricData.reduce((sum, r) => sum + (r[config.field] || 0), 0) : metricData.length;
        return <Card key={index} className="text-center hover:shadow-md transition-shadow"><CardContent className="pt-6"><p className="text-4xl font-bold">{metricValue}</p><p className="text-sm text-muted-foreground mt-1">{config?.label || config?.title}</p></CardContent></Card>;
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
      case 'chart':
        return <Card key={index} className="min-h-[200px]"><CardContent className="flex items-center justify-center h-full pt-6"><div className="text-center text-muted-foreground">{config?.title && <h4 className="font-semibold mb-2">{config.title}</h4>}<p className="text-sm">Chart: {config?.chartType || 'bar'}</p></div></CardContent></Card>;
      case 'grid':
        const gridColsMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
        const gridCols = config?.columns || 3;
        return <div key={index} className={cn("grid gap-4", gridColsMap[gridCols] || 'grid-cols-3')}>{(config?.children || component.components || children || []).map((c, i) => renderComponent(c, i))}</div>;
      default:
        const childComponents = config?.children || component.components || children || [];
        if (childComponents.length > 0) return <div key={index}>{childComponents.map((c, i) => renderComponent(c, i))}</div>;
        return null;
    }
  };

  const renderSection = (section, index) => {
    if (!section) return null;
    const sectionClasses = { header: 'mb-8', main: '', 'stats-row': 'mb-6', filters: 'mb-6', sidebar: 'bg-card p-5 rounded-lg border' };
    return <div key={index} className={sectionClasses[section.type] || ''}>{(section.components || []).map((component, i) => renderComponent(component, i))}</div>;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Loading...</p></div></div>;
  if (!page) return <div className="flex flex-col items-center justify-center py-16 text-center"><h3 className="text-xl font-semibold">Page Not Found</h3><p className="text-muted-foreground mt-2">The requested page could not be found.</p></div>;
  const hasStyledHeader = page.sections?.some(s => s.type === 'header' && s.components?.length > 0);
  return <div className="p-6 max-w-7xl mx-auto">{!hasStyledHeader && <div className="mb-8"><h1 className="text-3xl font-bold tracking-tight">{page.title || page.name}</h1>{page.description && <p className="text-muted-foreground mt-2">{page.description}</p>}</div>}<div className="space-y-6">{(page.sections || []).map((section, index) => renderSection(section, index))}</div></div>;
}`;

    await fs.writeFile(path.join(componentsDir, 'PageRenderer.js'), pageRenderer);
    files.push('frontend/src/components/PageRenderer.js');

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

    // 1. Dashboard page
    const dashboard = `import React, { useState, useEffect } from 'react';
import { logsApi, workflowsApi, formsApi } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentWorkflows, setRecentWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

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

      setStats({
        workflows: workflowsRes.data?.length || ${workflows.length},
        forms: formsRes.data?.length || ${forms.length},
        dataModels: ${dataModels.length},
        executions: statsRes.data?.statistics?.totalExecutions || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to ${this.application.name || 'your application'}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.workflows || 0}</div>
          <div className="stat-label">Workflows</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.forms || 0}</div>
          <div className="stat-label">Forms</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.dataModels || 0}</div>
          <div className="stat-label">Data Models</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.executions || 0}</div>
          <div className="stat-label">Total Executions</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/workflows" className="btn btn-primary">View Workflows</a>
          <a href="/forms" className="btn btn-secondary">Browse Forms</a>
        </div>
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
        <p style={{ marginBottom: '16px', color: '#64748b' }}>
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
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
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

    // 5. Generate Authentication Pages
    files.push(...await this.generateAuthPages(pagesDir));

    // 6. Generate pages from pages.json
    const pages = resources.pages || this.application.pages || [];
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
      return `    // TODO: Fetch ${binding} data from API
    // Example: const ${binding}Data = await fetch('/api/${binding}').then(r => r.json());
    // set${binding.charAt(0).toUpperCase() + binding.slice(1)}(${binding}Data);`;
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

    return `
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label || col.key}</th>`).join('\n                ')}
              </tr>
            </thead>
            <tbody>
              {/* TODO: Map data here */}
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

    // Read the full HtmlRenderer from the file system
    const sourceFile = '/Users/m/Work/code/workflowpp/backend/generated-apps/eager-tiger/src/ssr/HtmlRenderer.js';
    let content;

    try {
      content = await fs.readFile(sourceFile, 'utf8');
      // Replace app-specific name in template
      content = content.replace(/eager_tiger/g, appName.toLowerCase().replace(/\\s+/g, '_'));
    } catch (error) {
      console.error('[ApplicationGenerator] Could not read HtmlRenderer template, using minimal version');
      content = `/**
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
    }

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
}

module.exports = ApplicationGenerator;
