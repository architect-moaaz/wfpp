/**
 * DataModelEnforcer
 *
 * Enforces data model constraints at runtime:
 * - Field Constraints (#29): Validates required, min, max, pattern, unique, etc.
 * - Type Coercion (#30): Casts data to correct types
 * - Referential Integrity (#31): Validates foreign key references
 * - Cascade Delete (#32): Handles cascade operations on delete
 */

const dataModelDatabase = require('../database/DataModelDatabase');
const db = require('../config/database');

class DataModelEnforcer {
  constructor() {
    // Cache for data models to avoid repeated reads
    this.modelCache = new Map();
    this.cacheExpiry = 60000; // 1 minute cache
    this.lastCacheRefresh = 0;

    // Track records for referential integrity (in-memory cache)
    // Falls back to database queries when cache misses
    this.recordStore = new Map(); // modelName -> Map(id -> record)

    // Application context for database queries
    this.applicationId = null;
  }

  /**
   * Set the application context for database queries
   */
  setApplicationContext(appId) {
    this.applicationId = appId;
  }

  /**
   * Get table name for a data model
   */
  getTableName(modelName) {
    if (!this.applicationId) {
      console.warn('[DataModelEnforcer] No application context set, using default schema');
      return `app_data.default_${modelName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_')}`;
    }
    const sanitizedApp = this.applicationId.replace(/[^a-zA-Z0-9_]/g, '_');
    const sanitizedModel = modelName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
    return `app_data.${sanitizedApp}_${sanitizedModel}`;
  }

  // ============================================
  // FIELD CONSTRAINTS VALIDATION (#29)
  // ============================================

  /**
   * Validate a record against its data model constraints
   * Returns validation result with errors and warnings
   */
  async validateRecord(modelNameOrId, record, options = {}) {
    const { isUpdate = false, existingRecord = null } = options;

    const model = await this.getDataModel(modelNameOrId);
    if (!model) {
      return {
        valid: false,
        errors: [`Data model '${modelNameOrId}' not found`],
        warnings: []
      };
    }

    const errors = [];
    const warnings = [];
    const validatedRecord = {};

    // Validate each field
    for (const field of model.fields || []) {
      const fieldName = field.name;
      let value = record[fieldName];

      // Check required fields
      if (field.required && !isUpdate) {
        if (value === undefined || value === null || value === '') {
          errors.push(`Field '${fieldName}' is required`);
          continue;
        }
      }

      // Skip validation if field not provided in update
      if (isUpdate && value === undefined) {
        continue;
      }

      // Apply type coercion (#30)
      if (value !== undefined && value !== null) {
        const coercionResult = this.coerceType(value, field.type, field);
        if (coercionResult.error) {
          errors.push(`Field '${fieldName}': ${coercionResult.error}`);
          continue;
        }
        value = coercionResult.value;
      }

      // Apply default value if not provided
      if ((value === undefined || value === null) && field.defaultValue !== undefined) {
        value = this.resolveDefaultValue(field.defaultValue, field.type);
      }

      // Validate constraints
      const constraintResult = this.validateFieldConstraints(fieldName, value, field, model);
      errors.push(...constraintResult.errors);
      warnings.push(...constraintResult.warnings);

      // Store validated value
      if (value !== undefined) {
        validatedRecord[fieldName] = value;
      }
    }

    // Check for unique constraints
    if (!isUpdate || existingRecord) {
      const uniqueResult = await this.validateUniqueConstraints(
        model,
        validatedRecord,
        isUpdate ? existingRecord?.id : null
      );
      errors.push(...uniqueResult.errors);
    }

    // Check model-level constraints
    const modelConstraintResult = this.validateModelConstraints(model, validatedRecord);
    errors.push(...modelConstraintResult.errors);
    warnings.push(...modelConstraintResult.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      coercedRecord: validatedRecord
    };
  }

  /**
   * Validate field-level constraints
   */
  validateFieldConstraints(fieldName, value, field, model) {
    const errors = [];
    const warnings = [];
    const validation = field.validation || {};

    // Skip null/undefined values (already handled by required check)
    if (value === null || value === undefined) {
      return { errors, warnings };
    }

    // String length constraints
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push(`Field '${fieldName}' must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push(`Field '${fieldName}' must be at most ${validation.maxLength} characters`);
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        errors.push(`Field '${fieldName}' exceeds maximum length of ${field.maxLength}`);
      }
    }

    // Numeric range constraints
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`Field '${fieldName}' must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push(`Field '${fieldName}' must be at most ${validation.max}`);
      }
      if (field.min !== undefined && value < field.min) {
        errors.push(`Field '${fieldName}' must be at least ${field.min}`);
      }
      if (field.max !== undefined && value > field.max) {
        errors.push(`Field '${fieldName}' must be at most ${field.max}`);
      }
    }

    // Pattern/regex validation
    if (validation.pattern && typeof value === 'string') {
      try {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push(`Field '${fieldName}' does not match required pattern`);
        }
      } catch (e) {
        warnings.push(`Invalid pattern for field '${fieldName}': ${validation.pattern}`);
      }
    }

    // Enum validation
    if (field.type === 'enum' && field.enumValues) {
      const validValues = Array.isArray(field.enumValues)
        ? field.enumValues
        : field.enumValues.split(',').map(v => v.trim());
      if (!validValues.includes(value)) {
        errors.push(`Field '${fieldName}' must be one of: ${validValues.join(', ')}`);
      }
    }

    // Email format validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid email address`);
      }
    }

    // URL format validation
    if (field.type === 'url' && value) {
      try {
        new URL(value);
      } catch {
        errors.push(`Field '${fieldName}' must be a valid URL`);
      }
    }

    // Phone format validation
    if (field.type === 'phone' && value) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(value)) {
        errors.push(`Field '${fieldName}' must be a valid phone number`);
      }
    }

    // Array constraints
    if (Array.isArray(value)) {
      if (validation.minItems !== undefined && value.length < validation.minItems) {
        errors.push(`Field '${fieldName}' must have at least ${validation.minItems} items`);
      }
      if (validation.maxItems !== undefined && value.length > validation.maxItems) {
        errors.push(`Field '${fieldName}' must have at most ${validation.maxItems} items`);
      }
    }

    // Date range validation
    if (field.type === 'date' || field.type === 'datetime') {
      const dateValue = new Date(value);
      if (validation.minDate) {
        const minDate = new Date(validation.minDate);
        if (dateValue < minDate) {
          errors.push(`Field '${fieldName}' must be after ${validation.minDate}`);
        }
      }
      if (validation.maxDate) {
        const maxDate = new Date(validation.maxDate);
        if (dateValue > maxDate) {
          errors.push(`Field '${fieldName}' must be before ${validation.maxDate}`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate unique constraints
   */
  async validateUniqueConstraints(model, record, excludeId = null) {
    const errors = [];

    // Check field-level unique constraints
    for (const field of model.fields || []) {
      if (field.unique && record[field.name] !== undefined) {
        const isDuplicate = await this.checkDuplicate(
          model.name,
          field.name,
          record[field.name],
          excludeId
        );
        if (isDuplicate) {
          errors.push(`Field '${field.name}' value '${record[field.name]}' already exists`);
        }
      }
    }

    // Check model-level unique constraints
    for (const constraint of model.constraints || []) {
      if (constraint.type === 'unique' && constraint.fields) {
        const values = constraint.fields.map(f => record[f]);
        if (values.every(v => v !== undefined)) {
          const isDuplicate = await this.checkCompositeDuplicate(
            model.name,
            constraint.fields,
            values,
            excludeId
          );
          if (isDuplicate) {
            errors.push(`Unique constraint violated for fields: ${constraint.fields.join(', ')}`);
          }
        }
      }
    }

    return { errors };
  }

  /**
   * Validate model-level constraints (check expressions)
   */
  validateModelConstraints(model, record) {
    const errors = [];
    const warnings = [];

    for (const constraint of model.constraints || []) {
      if (constraint.type === 'check' && constraint.expression) {
        try {
          const result = this.evaluateCheckExpression(constraint.expression, record);
          if (!result) {
            errors.push(constraint.message || `Check constraint failed: ${constraint.expression}`);
          }
        } catch (e) {
          warnings.push(`Could not evaluate constraint: ${constraint.expression}`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Evaluate a check constraint expression
   */
  evaluateCheckExpression(expression, record) {
    try {
      // Replace field references with actual values
      let evaluatable = expression;

      for (const [key, value] of Object.entries(record)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (typeof value === 'string') {
          evaluatable = evaluatable.replace(regex, `"${value}"`);
        } else if (value === null) {
          evaluatable = evaluatable.replace(regex, 'null');
        } else {
          evaluatable = evaluatable.replace(regex, String(value));
        }
      }

      // Safe evaluation
      const func = new Function('record', `with(record) { return ${evaluatable}; }`);
      return func(record);
    } catch {
      return true; // Default to passing if expression can't be evaluated
    }
  }

  // ============================================
  // TYPE COERCION (#30)
  // ============================================

  /**
   * Coerce a value to the specified type
   */
  coerceType(value, type, field = {}) {
    if (value === null || value === undefined) {
      return { value };
    }

    try {
      switch (type) {
        case 'string':
        case 'text':
        case 'varchar':
          return { value: String(value) };

        case 'number':
        case 'int':
        case 'integer':
        case 'bigint':
          const intValue = parseInt(value, 10);
          if (isNaN(intValue)) {
            return { error: `Cannot convert '${value}' to integer` };
          }
          return { value: intValue };

        case 'decimal':
        case 'float':
        case 'double':
          const floatValue = parseFloat(value);
          if (isNaN(floatValue)) {
            return { error: `Cannot convert '${value}' to decimal` };
          }
          // Apply precision if specified
          if (field.precision !== undefined) {
            return { value: parseFloat(floatValue.toFixed(field.precision)) };
          }
          return { value: floatValue };

        case 'boolean':
        case 'bool':
          if (typeof value === 'boolean') return { value };
          if (value === 'true' || value === '1' || value === 1) return { value: true };
          if (value === 'false' || value === '0' || value === 0) return { value: false };
          return { error: `Cannot convert '${value}' to boolean` };

        case 'date':
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            return { error: `Cannot convert '${value}' to date` };
          }
          return { value: dateValue.toISOString().split('T')[0] };

        case 'datetime':
        case 'timestamp':
          const datetimeValue = new Date(value);
          if (isNaN(datetimeValue.getTime())) {
            return { error: `Cannot convert '${value}' to datetime` };
          }
          return { value: datetimeValue.toISOString() };

        case 'array':
          if (Array.isArray(value)) return { value };
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) return { value: parsed };
            } catch {
              // Try comma-separated
              return { value: value.split(',').map(v => v.trim()) };
            }
          }
          return { value: [value] };

        case 'object':
        case 'json':
          if (typeof value === 'object') return { value };
          if (typeof value === 'string') {
            try {
              return { value: JSON.parse(value) };
            } catch {
              return { error: `Cannot parse '${value}' as JSON` };
            }
          }
          return { error: `Cannot convert '${typeof value}' to object` };

        case 'email':
          const emailStr = String(value).toLowerCase().trim();
          return { value: emailStr };

        case 'phone':
          // Normalize phone number (remove formatting)
          const phoneStr = String(value).replace(/[\s\-\(\)]/g, '');
          return { value: phoneStr };

        case 'url':
          const urlStr = String(value).trim();
          return { value: urlStr };

        case 'enum':
          return { value: String(value) };

        case 'uuid':
          const uuidStr = String(value).toLowerCase().trim();
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
          if (!uuidRegex.test(uuidStr)) {
            return { error: `'${value}' is not a valid UUID` };
          }
          return { value: uuidStr };

        default:
          // Unknown type, return as-is
          return { value };
      }
    } catch (error) {
      return { error: `Type coercion failed: ${error.message}` };
    }
  }

  /**
   * Resolve default value with type awareness
   */
  resolveDefaultValue(defaultValue, type) {
    // Handle special default values
    if (defaultValue === 'NOW()' || defaultValue === 'CURRENT_TIMESTAMP') {
      return new Date().toISOString();
    }
    if (defaultValue === 'UUID()') {
      return this.generateUUID();
    }
    if (defaultValue === 'AUTO_INCREMENT') {
      return null; // Handled by database
    }

    // Coerce default value to correct type
    const coerced = this.coerceType(defaultValue, type);
    return coerced.error ? defaultValue : coerced.value;
  }

  /**
   * Generate a UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ============================================
  // REFERENTIAL INTEGRITY (#31)
  // ============================================

  /**
   * Validate referential integrity for a record
   */
  async validateReferences(modelNameOrId, record, options = {}) {
    const { isUpdate = false } = options;

    const model = await this.getDataModel(modelNameOrId);
    if (!model) {
      return {
        valid: false,
        errors: [`Data model '${modelNameOrId}' not found`]
      };
    }

    const errors = [];
    const warnings = [];

    // Check foreign key fields
    for (const field of model.fields || []) {
      if (field.foreignKey && record[field.name] !== undefined && record[field.name] !== null) {
        const refResult = await this.validateForeignKeyReference(field, record[field.name], model);
        errors.push(...refResult.errors);
        warnings.push(...refResult.warnings);
      }
    }

    // Check relationships
    for (const relationship of model.relationships || []) {
      if (relationship.type === 'belongsTo') {
        const fkField = relationship.foreignKey;
        if (record[fkField] !== undefined && record[fkField] !== null) {
          const refExists = await this.checkReferenceExists(
            relationship.target || relationship.targetModel,
            record[fkField]
          );
          if (!refExists) {
            errors.push(`Referenced ${relationship.target} with id '${record[fkField]}' does not exist`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a foreign key reference
   */
  async validateForeignKeyReference(field, value, model) {
    const errors = [];
    const warnings = [];

    // Find the referenced model from field metadata or relationships
    let targetModel = field.references?.model || field.referencedModel;

    if (!targetModel) {
      // Try to find from relationships
      const relationship = (model.relationships || []).find(r =>
        r.foreignKey === field.name
      );
      if (relationship) {
        targetModel = relationship.target || relationship.targetModel;
      }
    }

    if (!targetModel) {
      warnings.push(`Cannot validate reference for '${field.name}': target model unknown`);
      return { errors, warnings };
    }

    const exists = await this.checkReferenceExists(targetModel, value);
    if (!exists) {
      errors.push(`Foreign key '${field.name}': referenced record '${value}' in '${targetModel}' does not exist`);
    }

    return { errors, warnings };
  }

  /**
   * Check if a reference exists
   */
  async checkReferenceExists(modelName, id) {
    // Check in-memory store first (cache)
    const modelRecords = this.recordStore.get(modelName);
    if (modelRecords && modelRecords.has(String(id))) {
      return true;
    }

    // Query actual database
    try {
      const tableName = this.getTableName(modelName);

      // Check if table exists first
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'app_data'
          AND table_name = $1
        )
      `, [tableName.split('.')[1]]);

      if (!tableCheck.rows[0].exists) {
        console.log(`[DataModelEnforcer] Table ${tableName} does not exist, assuming reference valid`);
        return true; // Table doesn't exist yet, assume valid
      }

      // Check if record exists
      const result = await db.query(
        `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE id = $1)`,
        [id]
      );

      const exists = result.rows[0].exists;

      // Cache the result if found
      if (exists && !modelRecords) {
        this.recordStore.set(modelName, new Map([[String(id), { id }]]));
      }

      return exists;
    } catch (error) {
      console.warn(`[DataModelEnforcer] Database check failed for ${modelName}.${id}:`, error.message);
      // Fall back to assuming valid if database query fails
      return true;
    }
  }

  /**
   * Check if deleting a record would violate referential integrity
   */
  async checkDeleteRestrictions(modelNameOrId, recordId) {
    const model = await this.getDataModel(modelNameOrId);
    if (!model) {
      return { canDelete: false, errors: [`Model '${modelNameOrId}' not found`] };
    }

    const errors = [];
    const dependentRecords = [];

    // Find all models that reference this model
    const allModels = await this.getAllDataModels();

    for (const otherModel of allModels) {
      if (otherModel.name === model.name) continue;

      // Check relationships
      for (const relationship of otherModel.relationships || []) {
        if ((relationship.target === model.name || relationship.targetModel === model.name) &&
            relationship.type === 'belongsTo') {
          const onDelete = relationship.onDelete || 'RESTRICT';

          if (onDelete === 'RESTRICT' || onDelete === 'NO ACTION') {
            // Check if any records reference this one
            const referencing = await this.findReferencingRecords(
              otherModel.name,
              relationship.foreignKey,
              recordId
            );

            if (referencing.length > 0) {
              errors.push(`Cannot delete: ${referencing.length} record(s) in '${otherModel.name}' reference this record`);
              dependentRecords.push({
                model: otherModel.name,
                field: relationship.foreignKey,
                count: referencing.length,
                action: onDelete
              });
            }
          }
        }
      }

      // Check foreign key fields
      for (const field of otherModel.fields || []) {
        if (field.foreignKey) {
          const refModel = field.references?.model || field.referencedModel;
          if (refModel === model.name) {
            const onDelete = field.onDelete || 'RESTRICT';

            if (onDelete === 'RESTRICT' || onDelete === 'NO ACTION') {
              const referencing = await this.findReferencingRecords(
                otherModel.name,
                field.name,
                recordId
              );

              if (referencing.length > 0) {
                errors.push(`Cannot delete: ${referencing.length} record(s) in '${otherModel.name}' reference this record via '${field.name}'`);
                dependentRecords.push({
                  model: otherModel.name,
                  field: field.name,
                  count: referencing.length,
                  action: onDelete
                });
              }
            }
          }
        }
      }
    }

    return {
      canDelete: errors.length === 0,
      errors,
      dependentRecords
    };
  }

  // ============================================
  // CASCADE DELETE (#32)
  // ============================================

  /**
   * Perform cascade delete for a record
   * Returns the list of records that would be deleted/updated
   */
  async getCascadeDeletePlan(modelNameOrId, recordId) {
    const model = await this.getDataModel(modelNameOrId);
    if (!model) {
      return { success: false, error: `Model '${modelNameOrId}' not found` };
    }

    const plan = {
      delete: [],
      setNull: [],
      restrict: []
    };

    const allModels = await this.getAllDataModels();

    for (const otherModel of allModels) {
      if (otherModel.name === model.name) continue;

      // Check relationships
      for (const relationship of otherModel.relationships || []) {
        if ((relationship.target === model.name || relationship.targetModel === model.name) &&
            relationship.type === 'belongsTo') {
          const onDelete = relationship.onDelete || 'RESTRICT';
          const fkField = relationship.foreignKey;

          const referencing = await this.findReferencingRecords(
            otherModel.name,
            fkField,
            recordId
          );

          if (referencing.length > 0) {
            switch (onDelete) {
              case 'CASCADE':
                plan.delete.push({
                  model: otherModel.name,
                  field: fkField,
                  records: referencing,
                  count: referencing.length
                });
                break;

              case 'SET NULL':
                plan.setNull.push({
                  model: otherModel.name,
                  field: fkField,
                  records: referencing,
                  count: referencing.length
                });
                break;

              case 'RESTRICT':
              case 'NO ACTION':
              default:
                plan.restrict.push({
                  model: otherModel.name,
                  field: fkField,
                  records: referencing,
                  count: referencing.length
                });
            }
          }
        }
      }

      // Check foreign key fields with onDelete
      for (const field of otherModel.fields || []) {
        if (field.foreignKey) {
          const refModel = field.references?.model || field.referencedModel;
          if (refModel === model.name) {
            const onDelete = field.onDelete || 'RESTRICT';

            const referencing = await this.findReferencingRecords(
              otherModel.name,
              field.name,
              recordId
            );

            if (referencing.length > 0) {
              switch (onDelete) {
                case 'CASCADE':
                  plan.delete.push({
                    model: otherModel.name,
                    field: field.name,
                    records: referencing,
                    count: referencing.length
                  });
                  break;

                case 'SET NULL':
                  plan.setNull.push({
                    model: otherModel.name,
                    field: field.name,
                    records: referencing,
                    count: referencing.length
                  });
                  break;

                case 'RESTRICT':
                case 'NO ACTION':
                default:
                  plan.restrict.push({
                    model: otherModel.name,
                    field: field.name,
                    records: referencing,
                    count: referencing.length
                  });
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      canDelete: plan.restrict.length === 0,
      plan
    };
  }

  /**
   * Execute cascade delete
   */
  async executeCascadeDelete(modelNameOrId, recordId, options = {}) {
    const { dryRun = false, force = false } = options;

    const plan = await this.getCascadeDeletePlan(modelNameOrId, recordId);

    if (!plan.success) {
      return plan;
    }

    if (!plan.canDelete && !force) {
      return {
        success: false,
        error: 'Delete restricted by referential integrity constraints',
        plan: plan.plan
      };
    }

    const executed = {
      deleted: [],
      setNull: [],
      errors: []
    };

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        wouldDelete: plan.plan.delete,
        wouldSetNull: plan.plan.setNull,
        restricted: plan.plan.restrict
      };
    }

    // Execute SET NULL operations first
    for (const item of plan.plan.setNull) {
      try {
        await this.setNullReferences(item.model, item.field, recordId);
        executed.setNull.push({
          model: item.model,
          field: item.field,
          count: item.count
        });
      } catch (error) {
        executed.errors.push(`Failed to set null in ${item.model}.${item.field}: ${error.message}`);
      }
    }

    // Execute CASCADE deletes (recursively)
    for (const item of plan.plan.delete) {
      for (const refRecord of item.records) {
        try {
          // Recursive cascade delete
          await this.executeCascadeDelete(item.model, refRecord.id, { dryRun, force: true });
          executed.deleted.push({
            model: item.model,
            id: refRecord.id
          });
        } catch (error) {
          executed.errors.push(`Failed to delete ${item.model}.${refRecord.id}: ${error.message}`);
        }
      }
    }

    // Delete the main record
    try {
      await this.deleteFromStore(modelNameOrId, recordId);
      executed.deleted.push({
        model: modelNameOrId,
        id: recordId,
        isMain: true
      });
    } catch (error) {
      executed.errors.push(`Failed to delete main record: ${error.message}`);
    }

    return {
      success: executed.errors.length === 0,
      executed,
      errors: executed.errors
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get data model by name or ID
   */
  async getDataModel(nameOrId) {
    await this.refreshCacheIfNeeded();

    // Check cache first
    if (this.modelCache.has(nameOrId)) {
      return this.modelCache.get(nameOrId);
    }

    // Search by ID then name
    const models = await dataModelDatabase.loadDataModels();
    let model = models.find(m => m.id === nameOrId);
    if (!model) {
      model = models.find(m => m.name === nameOrId);
    }

    if (model) {
      this.modelCache.set(model.id, model);
      this.modelCache.set(model.name, model);
    }

    return model;
  }

  /**
   * Get all data models
   */
  async getAllDataModels() {
    await this.refreshCacheIfNeeded();
    return dataModelDatabase.loadDataModels();
  }

  /**
   * Refresh cache if expired
   */
  async refreshCacheIfNeeded() {
    const now = Date.now();
    if (now - this.lastCacheRefresh > this.cacheExpiry) {
      this.modelCache.clear();
      this.lastCacheRefresh = now;
    }
  }

  /**
   * Check for duplicate value
   */
  async checkDuplicate(modelName, fieldName, value, excludeId = null) {
    const records = this.recordStore.get(modelName);
    if (!records) return false;

    for (const [id, record] of records) {
      if (excludeId && id === excludeId) continue;
      if (record[fieldName] === value) return true;
    }
    return false;
  }

  /**
   * Check for composite duplicate
   */
  async checkCompositeDuplicate(modelName, fields, values, excludeId = null) {
    const records = this.recordStore.get(modelName);
    if (!records) return false;

    for (const [id, record] of records) {
      if (excludeId && id === excludeId) continue;
      const matches = fields.every((field, i) => record[field] === values[i]);
      if (matches) return true;
    }
    return false;
  }

  /**
   * Find records that reference a given ID
   */
  async findReferencingRecords(modelName, foreignKeyField, targetId) {
    // Check in-memory store first (cache)
    const records = this.recordStore.get(modelName);
    if (records && records.size > 0) {
      const referencing = [];
      for (const [id, record] of records) {
        if (record[foreignKeyField] === targetId || record[foreignKeyField] === String(targetId)) {
          referencing.push({ id, ...record });
        }
      }
      if (referencing.length > 0) {
        return referencing;
      }
    }

    // Query database
    try {
      const tableName = this.getTableName(modelName);
      const sanitizedField = foreignKeyField.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');

      // Check if table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'app_data'
          AND table_name = $1
        )
      `, [tableName.split('.')[1]]);

      if (!tableCheck.rows[0].exists) {
        return []; // Table doesn't exist
      }

      // Check if column exists
      const columnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'app_data'
          AND table_name = $1
          AND column_name = $2
        )
      `, [tableName.split('.')[1], sanitizedField]);

      if (!columnCheck.rows[0].exists) {
        return []; // Column doesn't exist
      }

      // Find referencing records
      const result = await db.query(
        `SELECT * FROM ${tableName} WHERE ${sanitizedField} = $1`,
        [targetId]
      );

      return result.rows;
    } catch (error) {
      console.warn(`[DataModelEnforcer] Database query failed for ${modelName}.${foreignKeyField}:`, error.message);
      return [];
    }
  }

  /**
   * Set null for references
   */
  async setNullReferences(modelName, field, targetId) {
    // Update in-memory store
    const records = this.recordStore.get(modelName);
    if (records) {
      for (const [id, record] of records) {
        if (record[field] === targetId || record[field] === String(targetId)) {
          record[field] = null;
          records.set(id, record);
        }
      }
    }

    // Update database
    try {
      const tableName = this.getTableName(modelName);
      const sanitizedField = field.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');

      // Check if table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'app_data'
          AND table_name = $1
        )
      `, [tableName.split('.')[1]]);

      if (tableCheck.rows[0].exists) {
        await db.query(
          `UPDATE ${tableName} SET ${sanitizedField} = NULL WHERE ${sanitizedField} = $1`,
          [targetId]
        );
        console.log(`[DataModelEnforcer] Set null for ${modelName}.${field} where value = ${targetId}`);
      }
    } catch (error) {
      console.error(`[DataModelEnforcer] Failed to set null references in ${modelName}.${field}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete from store and database
   */
  async deleteFromStore(modelName, recordId) {
    // Delete from in-memory store
    const records = this.recordStore.get(modelName);
    if (records) {
      records.delete(String(recordId));
    }

    // Delete from database
    try {
      const tableName = this.getTableName(modelName);

      // Check if table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'app_data'
          AND table_name = $1
        )
      `, [tableName.split('.')[1]]);

      if (tableCheck.rows[0].exists) {
        await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [recordId]);
        console.log(`[DataModelEnforcer] Deleted record ${recordId} from ${modelName}`);
      }
    } catch (error) {
      console.error(`[DataModelEnforcer] Failed to delete record ${recordId} from ${modelName}:`, error.message);
      throw error;
    }
  }

  // ============================================
  // RECORD STORE OPERATIONS (for validation)
  // ============================================

  /**
   * Register a record in the store (for reference validation)
   */
  registerRecord(modelName, record) {
    if (!this.recordStore.has(modelName)) {
      this.recordStore.set(modelName, new Map());
    }
    const id = record.id || record._id;
    if (id) {
      this.recordStore.get(modelName).set(String(id), record);
    }
  }

  /**
   * Unregister a record from the store
   */
  unregisterRecord(modelName, recordId) {
    const records = this.recordStore.get(modelName);
    if (records) {
      records.delete(String(recordId));
    }
  }

  /**
   * Clear all records for a model
   */
  clearModelRecords(modelName) {
    this.recordStore.delete(modelName);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.modelCache.clear();
    this.recordStore.clear();
    this.lastCacheRefresh = 0;
  }

  // ============================================
  // FULL VALIDATION PIPELINE
  // ============================================

  /**
   * Full validation: constraints + type coercion + referential integrity
   */
  async validateAndCoerce(modelNameOrId, record, options = {}) {
    const { isUpdate = false, existingRecord = null, validateReferences = true } = options;

    // Step 1: Field constraints and type coercion
    const constraintResult = await this.validateRecord(modelNameOrId, record, {
      isUpdate,
      existingRecord
    });

    if (!constraintResult.valid) {
      return constraintResult;
    }

    // Step 2: Referential integrity (if enabled)
    if (validateReferences) {
      const refResult = await this.validateReferences(
        modelNameOrId,
        constraintResult.coercedRecord,
        { isUpdate }
      );

      if (!refResult.valid) {
        return {
          valid: false,
          errors: [...constraintResult.errors, ...refResult.errors],
          warnings: [...constraintResult.warnings, ...refResult.warnings],
          coercedRecord: constraintResult.coercedRecord
        };
      }

      constraintResult.warnings.push(...refResult.warnings);
    }

    return constraintResult;
  }

  /**
   * Validate before delete (check restrictions)
   */
  async validateDelete(modelNameOrId, recordId) {
    return this.checkDeleteRestrictions(modelNameOrId, recordId);
  }
}

// Singleton instance
const dataModelEnforcer = new DataModelEnforcer();

module.exports = dataModelEnforcer;
module.exports.DataModelEnforcer = DataModelEnforcer;
