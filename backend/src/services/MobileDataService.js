/**
 * MobileDataService - Data persistence service for mobile API
 * Handles CRUD operations for application data models with validation
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class MobileDataService {
  constructor() {
    this.tableCache = new Map();
  }

  /**
   * Get table name for a data model
   */
  getTableName(appId, modelName) {
    const sanitizedApp = appId.replace(/[^a-zA-Z0-9_]/g, '_');
    const sanitizedModel = modelName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
    return `app_data.${sanitizedApp}_${sanitizedModel}`;
  }

  /**
   * Ensure the app_data schema exists
   */
  async ensureSchema() {
    try {
      await db.query('CREATE SCHEMA IF NOT EXISTS app_data');
    } catch (error) {
      // Schema might already exist
      console.log('[MobileDataService] Schema app_data ready');
    }
  }

  /**
   * Ensure a table exists for the data model
   * Creates the table dynamically based on data model fields
   */
  async ensureDataTable(appId, dataModel) {
    const tableName = this.getTableName(appId, dataModel.name);
    const cacheKey = tableName;

    // Check cache first
    if (this.tableCache.has(cacheKey)) {
      return tableName;
    }

    // Ensure schema exists
    await this.ensureSchema();

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'app_data'
        AND table_name = $1
      )
    `, [tableName.split('.')[1]]);

    if (tableCheck.rows[0].exists) {
      this.tableCache.set(cacheKey, true);
      return tableName;
    }

    // Build CREATE TABLE statement from data model fields
    const columns = this.buildColumnDefinitions(dataModel.fields || []);

    const createSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id VARCHAR(255) PRIMARY KEY,
        ${columns}
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    try {
      await db.query(createSQL);
      console.log(`[MobileDataService] Created table: ${tableName}`);
      this.tableCache.set(cacheKey, true);
    } catch (error) {
      console.error(`[MobileDataService] Failed to create table: ${tableName}`, error.message);
      throw error;
    }

    return tableName;
  }

  /**
   * Build column definitions from data model fields
   */
  buildColumnDefinitions(fields) {
    if (!fields || fields.length === 0) {
      return 'data JSONB DEFAULT \'{}\'::jsonb,';
    }

    const columnDefs = fields.map(field => {
      const columnName = this.sanitizeColumnName(field.name || field.id);
      const columnType = this.mapFieldTypeToSQL(field.type);
      const nullable = field.required ? 'NOT NULL' : '';
      const defaultVal = this.getDefaultValue(field);

      return `${columnName} ${columnType} ${nullable} ${defaultVal}`.trim();
    });

    // Always add a data column for extra fields
    columnDefs.push('_extra_data JSONB DEFAULT \'{}\'::jsonb');

    return columnDefs.join(',\n        ') + ',';
  }

  /**
   * Map field type to PostgreSQL type
   */
  mapFieldTypeToSQL(fieldType) {
    const typeMap = {
      'string': 'TEXT',
      'text': 'TEXT',
      'varchar': 'VARCHAR(255)',
      'char': 'CHAR(1)',
      'number': 'NUMERIC',
      'integer': 'INTEGER',
      'int': 'INTEGER',
      'bigint': 'BIGINT',
      'decimal': 'DECIMAL(18,2)',
      'float': 'REAL',
      'double': 'DOUBLE PRECISION',
      'boolean': 'BOOLEAN',
      'bool': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP WITH TIME ZONE',
      'timestamp': 'TIMESTAMP WITH TIME ZONE',
      'time': 'TIME',
      'json': 'JSONB',
      'jsonb': 'JSONB',
      'array': 'JSONB',
      'uuid': 'UUID',
      'email': 'VARCHAR(255)',
      'url': 'TEXT',
      'phone': 'VARCHAR(50)'
    };

    return typeMap[fieldType?.toLowerCase()] || 'TEXT';
  }

  /**
   * Get default value for a field
   */
  getDefaultValue(field) {
    if (field.default === undefined || field.default === null) {
      return '';
    }

    const val = field.default;
    if (val === 'NOW()' || val === 'CURRENT_TIMESTAMP') {
      return 'DEFAULT NOW()';
    }
    if (val === 'UUID()') {
      return 'DEFAULT gen_random_uuid()';
    }
    if (typeof val === 'boolean') {
      return `DEFAULT ${val}`;
    }
    if (typeof val === 'number') {
      return `DEFAULT ${val}`;
    }
    if (typeof val === 'string') {
      return `DEFAULT '${val.replace(/'/g, "''")}'`;
    }
    return '';
  }

  /**
   * Sanitize column name for SQL
   */
  sanitizeColumnName(name) {
    return name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Create a new record
   */
  async createRecord(appId, dataModel, data, userId = null) {
    const tableName = await this.ensureDataTable(appId, dataModel);
    const recordId = data.id || uuidv4();

    // Separate known fields from extra data
    const { knownFields, extraData } = this.separateFields(dataModel.fields || [], data);

    // Build INSERT statement
    const columns = ['id', ...Object.keys(knownFields), '_extra_data', 'created_by'];
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    const values = [
      recordId,
      ...Object.values(knownFields),
      JSON.stringify(extraData),
      userId
    ];

    const insertSQL = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    try {
      const result = await db.query(insertSQL, values);
      return this.formatRecord(result.rows[0], dataModel.fields);
    } catch (error) {
      console.error('[MobileDataService] Create record error:', error.message);
      throw error;
    }
  }

  /**
   * Get records with filtering and pagination
   */
  async getRecords(appId, dataModel, filters = {}, pagination = {}) {
    const tableName = await this.ensureDataTable(appId, dataModel);
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
    const offset = (page - 1) * limit;

    // Build WHERE clause from filters
    const { whereClause, values } = this.buildWhereClause(filters, dataModel.fields);

    // Count total records
    const countSQL = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`;
    const countResult = await db.query(countSQL, values);
    const total = parseInt(countResult.rows[0].count);

    // Fetch records with pagination
    const selectSQL = `
      SELECT * FROM ${tableName}
      ${whereClause}
      ORDER BY ${this.sanitizeColumnName(sortBy)} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const result = await db.query(selectSQL, [...values, limit, offset]);

    return {
      data: result.rows.map(row => this.formatRecord(row, dataModel.fields)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single record by ID
   */
  async getRecordById(appId, dataModel, recordId) {
    const tableName = await this.ensureDataTable(appId, dataModel);

    const result = await db.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [recordId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatRecord(result.rows[0], dataModel.fields);
  }

  /**
   * Update a record
   */
  async updateRecord(appId, dataModel, recordId, data, userId = null) {
    const tableName = await this.ensureDataTable(appId, dataModel);

    // Check if record exists
    const existing = await this.getRecordById(appId, dataModel, recordId);
    if (!existing) {
      throw new Error('Record not found');
    }

    // Separate known fields from extra data
    const { knownFields, extraData } = this.separateFields(dataModel.fields || [], data);

    // Build UPDATE statement
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(knownFields)) {
      setClauses.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    setClauses.push(`_extra_data = $${paramIndex++}`);
    values.push(JSON.stringify(extraData));

    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(userId);

    setClauses.push('updated_at = NOW()');

    values.push(recordId);

    const updateSQL = `
      UPDATE ${tableName}
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(updateSQL, values);
    return this.formatRecord(result.rows[0], dataModel.fields);
  }

  /**
   * Delete a record
   */
  async deleteRecord(appId, dataModel, recordId) {
    const tableName = await this.ensureDataTable(appId, dataModel);

    // Check if record exists
    const existing = await this.getRecordById(appId, dataModel, recordId);
    if (!existing) {
      throw new Error('Record not found');
    }

    await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [recordId]);

    return { success: true, deletedId: recordId };
  }

  /**
   * Separate known fields from extra/unknown fields
   */
  separateFields(fields, data) {
    const knownFieldNames = new Set(
      fields.map(f => this.sanitizeColumnName(f.name || f.id))
    );

    const knownFields = {};
    const extraData = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip internal fields
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

      const sanitizedKey = this.sanitizeColumnName(key);
      if (knownFieldNames.has(sanitizedKey)) {
        knownFields[sanitizedKey] = value;
      } else {
        extraData[key] = value;
      }
    }

    return { knownFields, extraData };
  }

  /**
   * Build WHERE clause from filters
   */
  buildWhereClause(filters, fields) {
    if (!filters || Object.keys(filters).length === 0) {
      return { whereClause: '', values: [] };
    }

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filters)) {
      const sanitizedKey = this.sanitizeColumnName(key);

      if (value === null) {
        conditions.push(`${sanitizedKey} IS NULL`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle operators: { gt: 5, lt: 10, like: '%abc%' }
        for (const [op, val] of Object.entries(value)) {
          switch (op) {
            case 'gt':
              conditions.push(`${sanitizedKey} > $${paramIndex++}`);
              values.push(val);
              break;
            case 'gte':
              conditions.push(`${sanitizedKey} >= $${paramIndex++}`);
              values.push(val);
              break;
            case 'lt':
              conditions.push(`${sanitizedKey} < $${paramIndex++}`);
              values.push(val);
              break;
            case 'lte':
              conditions.push(`${sanitizedKey} <= $${paramIndex++}`);
              values.push(val);
              break;
            case 'like':
              conditions.push(`${sanitizedKey} ILIKE $${paramIndex++}`);
              values.push(val);
              break;
            case 'in':
              if (Array.isArray(val) && val.length > 0) {
                const placeholders = val.map(() => `$${paramIndex++}`);
                conditions.push(`${sanitizedKey} IN (${placeholders.join(', ')})`);
                values.push(...val);
              }
              break;
            case 'ne':
              conditions.push(`${sanitizedKey} != $${paramIndex++}`);
              values.push(val);
              break;
          }
        }
      } else if (Array.isArray(value)) {
        // Array as IN clause
        const placeholders = value.map(() => `$${paramIndex++}`);
        conditions.push(`${sanitizedKey} IN (${placeholders.join(', ')})`);
        values.push(...value);
      } else {
        // Exact match
        conditions.push(`${sanitizedKey} = $${paramIndex++}`);
        values.push(value);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  /**
   * Format database row to API response
   */
  formatRecord(row, fields) {
    if (!row) return null;

    const record = {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };

    // Add known fields
    if (fields && fields.length > 0) {
      for (const field of fields) {
        const columnName = this.sanitizeColumnName(field.name || field.id);
        if (row[columnName] !== undefined) {
          record[field.name || field.id] = row[columnName];
        }
      }
    }

    // Merge extra data
    const extraData = row._extra_data || row.data || {};
    Object.assign(record, extraData);

    return record;
  }

  /**
   * Validate data against data model
   */
  validateData(dataModel, data) {
    const errors = [];
    const fields = dataModel.fields || [];

    for (const field of fields) {
      const fieldName = field.name || field.id;
      const value = data[fieldName];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: fieldName,
          message: `${field.label || fieldName} is required`
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type validation
      const typeError = this.validateFieldType(field, value);
      if (typeError) {
        errors.push({ field: fieldName, message: typeError });
      }

      // Constraints validation
      if (field.constraints) {
        const constraintErrors = this.validateConstraints(field, value);
        errors.push(...constraintErrors.map(e => ({ field: fieldName, message: e })));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field type
   */
  validateFieldType(field, value) {
    const type = (field.type || 'string').toLowerCase();

    switch (type) {
      case 'number':
      case 'integer':
      case 'int':
      case 'decimal':
      case 'float':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return `${field.label || field.name} must be a number`;
        }
        break;
      case 'boolean':
      case 'bool':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `${field.label || field.name} must be a boolean`;
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `${field.label || field.name} must be a valid email`;
        }
        break;
      case 'date':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          return `${field.label || field.name} must be a valid date`;
        }
        break;
    }

    return null;
  }

  /**
   * Validate field constraints
   */
  validateConstraints(field, value) {
    const errors = [];
    const constraints = field.constraints || {};

    if (constraints.minLength && typeof value === 'string' && value.length < constraints.minLength) {
      errors.push(`${field.label || field.name} must be at least ${constraints.minLength} characters`);
    }

    if (constraints.maxLength && typeof value === 'string' && value.length > constraints.maxLength) {
      errors.push(`${field.label || field.name} must be at most ${constraints.maxLength} characters`);
    }

    if (constraints.min !== undefined && Number(value) < constraints.min) {
      errors.push(`${field.label || field.name} must be at least ${constraints.min}`);
    }

    if (constraints.max !== undefined && Number(value) > constraints.max) {
      errors.push(`${field.label || field.name} must be at most ${constraints.max}`);
    }

    if (constraints.pattern && typeof value === 'string') {
      const regex = new RegExp(constraints.pattern);
      if (!regex.test(value)) {
        errors.push(constraints.patternMessage || `${field.label || field.name} has invalid format`);
      }
    }

    if (constraints.enum && !constraints.enum.includes(value)) {
      errors.push(`${field.label || field.name} must be one of: ${constraints.enum.join(', ')}`);
    }

    return errors;
  }
}

// Export singleton instance
module.exports = new MobileDataService();
