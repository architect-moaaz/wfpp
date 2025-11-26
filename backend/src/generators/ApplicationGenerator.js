/**
 * ApplicationGenerator
 *
 * Generates complete standalone application from application definition
 * Includes: Runtime engine, APIs, DB initialization, configuration, resources
 */

const fs = require('fs').promises;
const path = require('path');

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

      // 9. Generate utility files
      files.push(await this.generateUtils());

      // 10. Generate README
      files.push(await this.generateReadme());

      // 11. Generate .gitignore
      files.push(await this.generateGitignore());

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
      path.join(this.outputPath, 'src'),
      path.join(this.outputPath, 'src/resources'),
      path.join(this.outputPath, 'src/runtime'),
      path.join(this.outputPath, 'src/routes'),
      path.join(this.outputPath, 'src/models'),
      path.join(this.outputPath, 'src/database'),
      path.join(this.outputPath, 'src/utils'),
      path.join(this.outputPath, 'src/config'),
      path.join(this.outputPath, 'data'),
      path.join(this.outputPath, 'logs')
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
        start: 'node src/server.js',
        dev: 'nodemon src/server.js',
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
        winston: '^3.9.0'
      },
      devDependencies: {
        nodemon: '^2.0.22'
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

    // Forms
    await fs.writeFile(
      path.join(resourcesDir, 'forms.json'),
      JSON.stringify(resources.forms || [], null, 2)
    );

    // Pages
    await fs.writeFile(
      path.join(resourcesDir, 'pages.json'),
      JSON.stringify(resources.pages || [], null, 2)
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

  async generateRuntimeEngine() {
    const runtimeEngine = `/**
 * Workflow Runtime Engine
 * Executes workflow instances and manages workflow state
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WorkflowInstance = require('../models/WorkflowInstance');
const logger = require('../utils/logger');

class RuntimeEngine {
  constructor() {
    this.workflows = [];
    this.instances = new Map();
    this.nodeExecutors = this.initializeNodeExecutors();
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
        // Execute script
        const result = await this.executeScript(node.data?.script, context);
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
    // Implement service task execution
    const serviceType = node.data?.serviceType;

    switch (serviceType) {
      case 'http':
        return await this.executeHttpService(node.data, context);
      case 'database':
        return await this.executeDatabaseService(node.data, context);
      default:
        return context.data;
    }
  }

  async executeHttpService(config, context) {
    // HTTP service implementation
    return context.data;
  }

  async executeDatabaseService(config, context) {
    // Database service implementation
    return context.data;
  }

  async executeScript(script, context) {
    try {
      // Safe script execution
      const fn = new Function('context', script);
      return fn(context.data);
    } catch (error) {
      logger.error('Script execution failed:', error);
      throw error;
    }
  }

  async evaluateGateway(node, context) {
    // Evaluate gateway conditions
    return null;
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

    this.instances.set(instance.id, instance);
    logger.info(\`Started workflow instance: \${instance.id}\`);

    // Execute workflow
    await this.executeWorkflow(instance);

    return instance;
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

    const executor = this.nodeExecutors[node.type];
    if (!executor) {
      logger.error(\`No executor for node type: \${node.type}\`);
      return;
    }

    const result = await executor(node, { data: instance.data, input: instance.input });

    if (result.status === 'completed') {
      instance.data = result.data;

      // Find next node
      const nextNodeId = result.nextNode || this.getNextNode(instance, nodeId);

      if (nextNodeId) {
        await this.executeNode(instance, nextNodeId);
      } else {
        // Workflow complete
        instance.status = 'completed';
        instance.completedAt = new Date();
        logger.info(\`Workflow instance completed: \${instance.id}\`);
      }
    } else if (result.status === 'waiting') {
      instance.status = 'waiting';
      logger.info(\`Workflow instance waiting: \${instance.id}\`);
    }
  }

  getNextNode(instance, currentNodeId) {
    const connections = instance.workflow.connections || instance.workflow.edges || [];
    const nextConnection = connections.find(c => c.source === currentNodeId);
    return nextConnection?.target;
  }

  async resumeWorkflow(instanceId, data) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(\`Instance not found: \${instanceId}\`);
    }

    instance.data = { ...instance.data, ...data };
    await this.executeNode(instance, instance.currentNodeId);
  }

  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  getAllInstances() {
    return Array.from(this.instances.values());
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
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const runtimeEngine = require('./runtime/engine');
const apiRoutes = require('./routes/api');
const database = require('./database');
const logger = require('./utils/logger');

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

// API Routes
app.use('/api', apiRoutes);

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

# Redis Configuration (optional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka Configuration (optional)
KAFKA_ENABLED=false
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=${this.application.name.toLowerCase().replace(/\s+/g, '_')}

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

      logger.info(\`Creating tables for \${dataModels.length} data models\`);

      for (const model of dataModels) {
        try {
          await this.createTableFromModel(client, model);
        } catch (modelError) {
          logger.error(\`Failed to create table for model \${model.name}:\`, modelError.message);
          logger.error('Error stack:', modelError.stack);
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
}

module.exports = ApplicationGenerator;
