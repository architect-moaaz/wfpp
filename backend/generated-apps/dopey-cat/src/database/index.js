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

  async initialize() {
    if (!config.database.enabled) {
      logger.info('Database disabled, skipping initialization');
      return;
    }

    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password
      });

      // Test connection
      await this.pool.query('SELECT NOW()');
      logger.info('Database connection established');

      // Create schema if needed
      await this.createSchema();

    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createSchema() {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

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
        constraints.push(`DEFAULT '${field.defaultValue}'`);
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
    return await this.pool.query(text, params);
  }

  async getClient() {
    return await this.pool.connect();
  }
}

module.exports = new Database();
