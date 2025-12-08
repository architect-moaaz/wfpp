/**
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
      logger.info(`Database connection established to ${config.database.database || config.app.name}`);

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
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );

      if (result.rows.length === 0) {
        // Database doesn't exist, create it
        await adminPool.query(`CREATE DATABASE ${dbName}`);
        logger.info(`Created database: ${dbName}`);
      } else {
        logger.info(`Database ${dbName} already exists`);
      }
    } catch (error) {
      logger.error(`Error creating database ${dbName}:`, error);
      // Don't throw - database might already exist
    } finally {
      await adminPool.end();
    }
  }

  async createClientSchema(clientId) {
    const schemaName = clientId.replace(/-/g, '_');

    try {
      // Check if schema exists
      const result = await this.pool.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = $1
      `, [schemaName]);

      if (result.rows.length === 0) {
        // Schema doesn't exist, create it (use quoted identifier for reserved words)
        await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        logger.info(`Created schema: ${schemaName} for client: ${clientId}`);
      } else {
        logger.info(`Schema ${schemaName} already exists for client: ${clientId}`);
      }

      // Set search path to use this schema by default (use quoted identifier)
      await this.pool.query(`SET search_path TO "${schemaName}", public`);
      logger.info(`Set search path to schema: ${schemaName}`);
    } catch (error) {
      logger.error(`Error creating schema ${schemaName}:`, error);
      // Don't throw - schema might already exist
    }
  }

  async createSchema() {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Set search path to use the client schema
      const schemaName = this.currentSchema.replace(/-/g, '_');
      await client.query(`SET search_path TO "${schemaName}", public`);

      // Create workflow_instances table
      await client.query(`
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
      `);

      // Create workflow_history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_history (
          id SERIAL PRIMARY KEY,
          instance_id VARCHAR(255) REFERENCES workflow_instances(id),
          node_id VARCHAR(255),
          action VARCHAR(100),
          data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes for workflow tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id
        ON workflow_instances(workflow_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_workflow_instances_status
        ON workflow_instances(status)
      `);

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

      logger.info(`Creating tables for ${dataModels.length} data models`);

      for (const model of dataModels) {
        await this.createTableFromModel(client, model);
      }

      logger.info('All data model tables created successfully');
    } catch (error) {
      logger.warn('Failed to create data model tables:', error.message);
      // Don't throw - allow app to continue even if data models fail
    }
  }

  async createTableFromModel(client, model) {
    const tableName = this.toSnakeCase(model.name);
    const fields = model.fields || [];

    if (fields.length === 0) {
      logger.warn(`Model ${model.name} has no fields, skipping`);
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
        const indexName = `idx_${tableName}_${columnName}`;
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON ${tableName}(${columnName})
        `);
        logger.info(`Created index: ${indexName}`);
      }
    }

    // Handle relationships (foreign keys)
    for (const field of fields) {
      if (field.relationship && field.relationship.type === 'belongsTo') {
        const columnName = this.toSnakeCase(field.name);
        const refTable = this.toSnakeCase(field.relationship.model);
        const refColumn = field.relationship.foreignKey || 'id';

        // Add foreign key constraint
        const constraintName = `fk_${tableName}_${columnName}`;

        try {
          await client.query(`
            ALTER TABLE ${tableName}
            ADD CONSTRAINT ${constraintName}
            FOREIGN KEY (${columnName})
            REFERENCES ${refTable}(${refColumn})
            ON DELETE ${field.relationship.onDelete || 'CASCADE'}
          `);
          logger.info(`Created foreign key: ${constraintName}`);
        } catch (error) {
          // Constraint might already exist, log warning but continue
          logger.warn(`Foreign key ${constraintName} might already exist`);
        }
      }
    }
  }

  async checkTableExists(client, tableName) {
    const schemaName = this.currentSchema.replace(/-/g, '_');
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = $1
        AND table_name = $2
      )
    `, [schemaName, tableName]);

    return result.rows[0].exists;
  }

  async createTable(client, tableName, fields) {
    // Build CREATE TABLE statement
    const columns = fields.map(field => {
      const columnName = this.toSnakeCase(field.name);
      const columnType = this.mapFieldTypeToSQL(field.type);
      const constraints = [];

      if (field.required) {
        constraints.push('NOT NULL');
      }

      if (field.unique) {
        constraints.push('UNIQUE');
      }

      if (field.defaultValue !== undefined) {
        const defaultVal = typeof field.defaultValue === 'string' ? `'${field.defaultValue}'` : field.defaultValue;
        constraints.push(`DEFAULT ${defaultVal}`);
      }

      return `  ${columnName} ${columnType} ${constraints.join(' ')}`;
    });

    // Add standard fields
    columns.push('  created_at TIMESTAMP DEFAULT NOW()');
    columns.push('  updated_at TIMESTAMP DEFAULT NOW()');

    // Add primary key (use id field or first field)
    const idField = fields.find(f => f.name === 'id' || f.name === 'ID');
    const primaryKey = idField ? this.toSnakeCase(idField.name) : 'id';

    // If no id field exists, add one
    if (!idField) {
      columns.unshift('  id SERIAL PRIMARY KEY');
    } else {
      columns[0] = `  ${primaryKey} SERIAL PRIMARY KEY`;
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
${columns.join(',\n')}
      )
    `;

    await client.query(createTableSQL);
    logger.info(`Created table: ${tableName}`);
  }

  async alterTable(client, tableName, fields) {
    logger.info(`Checking table ${tableName} for schema changes...`);

    // Get existing columns
    const schemaName = this.currentSchema.replace(/-/g, '_');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
    `, [schemaName, tableName]);

    const existingColumns = new Set(result.rows.map(r => r.column_name));

    // Add missing columns
    for (const field of fields) {
      const columnName = this.toSnakeCase(field.name);

      if (!existingColumns.has(columnName)) {
        const columnType = this.mapFieldTypeToSQL(field.type);
        const constraints = [];

        if (field.defaultValue !== undefined) {
          const defaultVal = typeof field.defaultValue === 'string' ? `'${field.defaultValue}'` : field.defaultValue;
          constraints.push(`DEFAULT ${defaultVal}`);
        }

        // Don't add NOT NULL to existing tables without default
        if (field.required && field.defaultValue !== undefined) {
          constraints.push('NOT NULL');
        }

        const alterSQL = `
          ALTER TABLE ${tableName}
          ADD COLUMN ${columnName} ${columnType} ${constraints.join(' ')}
        `;

        try {
          await client.query(alterSQL);
          logger.info(`Added column ${columnName} to table ${tableName}`);
        } catch (error) {
          logger.warn(`Failed to add column ${columnName}:`, error.message);
        }
      }
    }

    // Ensure standard columns exist
    if (!existingColumns.has('created_at')) {
      await client.query(`ALTER TABLE ${tableName} ADD COLUMN created_at TIMESTAMP DEFAULT NOW()`);
      logger.info(`Added created_at to table ${tableName}`);
    }

    if (!existingColumns.has('updated_at')) {
      await client.query(`ALTER TABLE ${tableName} ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`);
      logger.info(`Added updated_at to table ${tableName}`);
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
      await client.query(`SET search_path TO "${schemaName}", public`);

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
    await client.query(`SET search_path TO "${schemaName}", public`);

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

    logger.info(`Switched to client: ${clientId}, schema: ${clientId.replace(/-/g, '_')}`);
  }

  getCurrentClientId() {
    return this.currentClientId;
  }

  getCurrentSchema() {
    return this.currentSchema.replace(/-/g, '_');
  }
}

module.exports = new Database();
