/**
 * DataCatalogService
 *
 * Manages schema discovery, version control, and metadata for all data models
 * across applications within an organization.
 *
 * Features:
 * - Auto-discovery of data models from all apps
 * - Schema versioning with backward compatibility
 * - Relationship detection (explicit FK and inferred)
 * - Cardinality tracking for UI recommendations
 */

const ApplicationDatabase = require('../../database/ApplicationDatabase');

class DataCatalogService {
  constructor() {
    this.db = new ApplicationDatabase();
    this.catalogCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Discover all data models across apps in an organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Catalog of all discovered models
   */
  async discoverModels(orgId) {
    const cacheKey = `catalog:${orgId}`;
    const cached = this.catalogCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Get all applications for the organization
      const apps = await this.db.getApplicationsByOrganization(orgId);
      const catalog = {
        orgId,
        discoveredAt: new Date().toISOString(),
        apps: [],
        models: [],
        relationships: [],
        statistics: {
          totalApps: 0,
          totalModels: 0,
          totalFields: 0,
          totalRelationships: 0
        }
      };

      for (const app of apps) {
        const appModels = await this.discoverAppModels(app);
        catalog.apps.push({
          id: app.id,
          name: app.name,
          modelCount: appModels.length
        });
        catalog.models.push(...appModels);
      }

      // Detect relationships across all models
      catalog.relationships = this.detectRelationships(catalog.models);

      // Calculate statistics
      catalog.statistics.totalApps = catalog.apps.length;
      catalog.statistics.totalModels = catalog.models.length;
      catalog.statistics.totalFields = catalog.models.reduce((sum, m) => sum + m.fields.length, 0);
      catalog.statistics.totalRelationships = catalog.relationships.length;

      // Cache the result
      this.catalogCache.set(cacheKey, {
        timestamp: Date.now(),
        data: catalog
      });

      return catalog;
    } catch (error) {
      console.error('Error discovering models:', error);
      throw error;
    }
  }

  /**
   * Discover data models for a specific application
   * @param {Object} app - Application object
   * @returns {Promise<Array>} Array of model definitions
   */
  async discoverAppModels(app) {
    const models = [];

    try {
      // Get data models from the application
      const dataModels = app.dataModels || app.resources?.dataModels || [];

      for (const model of dataModels) {
        const catalogEntry = {
          id: `${app.id}:${model.name || model.id}`,
          appId: app.id,
          appName: app.name,
          name: model.name || model.id,
          displayName: this.toDisplayName(model.name || model.id),
          tableName: model.tableName || this.toTableName(model.name || model.id),
          version: model.version || '1.0.0',
          status: 'active',
          fields: this.normalizeFields(model.fields || model.attributes || []),
          primaryKey: this.detectPrimaryKey(model),
          indexes: model.indexes || [],
          timestamps: {
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
          },
          statistics: await this.getModelStatistics(app.id, model),
          metadata: {
            description: model.description,
            category: this.categorizeModel(model),
            icon: this.getModelIcon(model)
          }
        };

        models.push(catalogEntry);
      }

      return models;
    } catch (error) {
      console.error(`Error discovering models for app ${app.id}:`, error);
      return models;
    }
  }

  /**
   * Normalize field definitions to a standard format
   * @param {Array} fields - Raw field definitions
   * @returns {Array} Normalized fields
   */
  normalizeFields(fields) {
    return fields.map((field, index) => ({
      id: field.id || field.name || `field_${index}`,
      name: field.name || field.id,
      displayName: this.toDisplayName(field.name || field.label || field.id),
      type: this.normalizeFieldType(field.type),
      originalType: field.type,
      nullable: field.nullable !== false && !field.required,
      required: field.required || false,
      unique: field.unique || false,
      primaryKey: field.primaryKey || false,
      foreignKey: field.foreignKey || field.references || null,
      defaultValue: field.default || field.defaultValue,
      validation: field.validation || {},
      metadata: {
        searchable: field.searchable !== false,
        sortable: field.sortable !== false,
        filterable: field.filterable !== false,
        pii: this.isPiiField(field),
        sensitive: field.sensitive || false
      }
    }));
  }

  /**
   * Normalize field type to standard types
   * @param {string} type - Original field type
   * @returns {string} Normalized type
   */
  normalizeFieldType(type) {
    const typeMap = {
      'string': 'string',
      'text': 'string',
      'varchar': 'string',
      'char': 'string',
      'number': 'number',
      'integer': 'number',
      'int': 'number',
      'float': 'number',
      'decimal': 'number',
      'double': 'number',
      'boolean': 'boolean',
      'bool': 'boolean',
      'date': 'date',
      'datetime': 'datetime',
      'timestamp': 'datetime',
      'time': 'time',
      'uuid': 'uuid',
      'id': 'uuid',
      'email': 'email',
      'url': 'url',
      'phone': 'phone',
      'json': 'json',
      'object': 'json',
      'array': 'array',
      'file': 'file',
      'image': 'file',
      'select': 'enum',
      'enum': 'enum',
      'reference': 'reference',
      'relation': 'reference'
    };

    return typeMap[(type || 'string').toLowerCase()] || 'string';
  }

  /**
   * Detect relationships between models
   * @param {Array} models - All catalog models
   * @returns {Array} Detected relationships
   */
  detectRelationships(models) {
    const relationships = [];
    const modelMap = new Map(models.map(m => [m.id, m]));
    const modelNameMap = new Map(models.map(m => [m.name.toLowerCase(), m]));

    for (const model of models) {
      for (const field of model.fields) {
        // Check explicit foreign keys
        if (field.foreignKey) {
          const targetModel = this.findTargetModel(field.foreignKey, modelMap, modelNameMap);
          if (targetModel) {
            relationships.push({
              id: `${model.id}:${field.name}:${targetModel.id}`,
              type: 'belongsTo',
              sourceModel: model.id,
              sourceModelName: model.name,
              sourceAppId: model.appId,
              sourceField: field.name,
              targetModel: targetModel.id,
              targetModelName: targetModel.name,
              targetAppId: targetModel.appId,
              targetField: field.foreignKey.field || 'id',
              crossApp: model.appId !== targetModel.appId
            });
          }
        }

        // Infer relationships from naming conventions
        const inferredTarget = this.inferRelationship(field, modelNameMap);
        if (inferredTarget && !field.foreignKey) {
          relationships.push({
            id: `${model.id}:${field.name}:${inferredTarget.id}:inferred`,
            type: 'belongsTo',
            sourceModel: model.id,
            sourceModelName: model.name,
            sourceAppId: model.appId,
            sourceField: field.name,
            targetModel: inferredTarget.id,
            targetModelName: inferredTarget.name,
            targetAppId: inferredTarget.appId,
            targetField: 'id',
            crossApp: model.appId !== inferredTarget.appId,
            inferred: true
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Find target model from foreign key reference
   */
  findTargetModel(foreignKey, modelMap, modelNameMap) {
    if (typeof foreignKey === 'string') {
      return modelNameMap.get(foreignKey.toLowerCase());
    }
    if (foreignKey.model) {
      return modelNameMap.get(foreignKey.model.toLowerCase());
    }
    if (foreignKey.table) {
      return modelNameMap.get(foreignKey.table.toLowerCase());
    }
    return null;
  }

  /**
   * Infer relationship from field naming conventions
   */
  inferRelationship(field, modelNameMap) {
    const name = (field.name || '').toLowerCase();

    // Pattern: fieldName_id or fieldNameId -> FieldName
    const patterns = [
      /^(.+)_id$/,      // user_id -> user
      /^(.+)Id$/,       // userId -> user
      /^(.+)_ref$/,     // order_ref -> order
      /^(.+)Ref$/       // orderRef -> order
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        const targetName = match[1].toLowerCase();
        const target = modelNameMap.get(targetName) ||
                       modelNameMap.get(targetName + 's') || // plural
                       modelNameMap.get(targetName.slice(0, -1)); // singular
        if (target) {
          return target;
        }
      }
    }

    return null;
  }

  /**
   * Get model statistics for UI recommendations
   */
  async getModelStatistics(appId, model) {
    // In a real implementation, this would query the actual database
    // For now, return estimated values
    const estimatedRowCount = model.rowCount || 100;

    return {
      rowCount: estimatedRowCount,
      avgRowSize: 256,
      lastAnalyzed: new Date().toISOString(),
      recommendedUI: this.getRecommendedUI(estimatedRowCount)
    };
  }

  /**
   * Get recommended UI component based on row count
   */
  getRecommendedUI(rowCount) {
    if (rowCount < 20) return 'radio';
    if (rowCount < 200) return 'dropdown';
    if (rowCount < 5000) return 'searchable-dropdown';
    return 'autocomplete';
  }

  /**
   * Detect primary key for a model
   */
  detectPrimaryKey(model) {
    const fields = model.fields || model.attributes || [];

    // Look for explicit primary key
    const pkField = fields.find(f => f.primaryKey);
    if (pkField) return pkField.name || pkField.id;

    // Look for 'id' field
    const idField = fields.find(f => (f.name || f.id || '').toLowerCase() === 'id');
    if (idField) return idField.name || idField.id;

    // Default to first field
    return fields[0]?.name || fields[0]?.id || 'id';
  }

  /**
   * Categorize model for grouping in UI
   */
  categorizeModel(model) {
    const name = (model.name || '').toLowerCase();

    const categories = {
      'Sales': ['order', 'invoice', 'sale', 'payment', 'cart', 'checkout'],
      'Customers': ['customer', 'client', 'contact', 'lead', 'account'],
      'Products': ['product', 'item', 'inventory', 'stock', 'catalog', 'category'],
      'HR & People': ['employee', 'user', 'staff', 'team', 'department', 'role'],
      'Finance': ['budget', 'expense', 'revenue', 'transaction', 'ledger'],
      'Locations': ['country', 'state', 'city', 'region', 'location', 'address'],
      'Reference Data': ['status', 'type', 'category', 'config', 'setting']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => name.includes(kw))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Get icon for model based on category
   */
  getModelIcon(model) {
    const category = this.categorizeModel(model);
    const icons = {
      'Sales': 'shopping-cart',
      'Customers': 'users',
      'Products': 'package',
      'HR & People': 'briefcase',
      'Finance': 'dollar-sign',
      'Locations': 'map-pin',
      'Reference Data': 'database',
      'Other': 'file'
    };
    return icons[category] || 'file';
  }

  /**
   * Check if field contains PII
   */
  isPiiField(field) {
    const piiPatterns = ['ssn', 'social', 'passport', 'license', 'credit', 'bank', 'account'];
    const name = (field.name || '').toLowerCase();
    const type = (field.type || '').toLowerCase();

    return type === 'email' ||
           type === 'phone' ||
           piiPatterns.some(p => name.includes(p)) ||
           field.pii === true;
  }

  /**
   * Convert name to display name
   */
  toDisplayName(name) {
    if (!name) return '';
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Convert name to table name
   */
  toTableName(name) {
    if (!name) return '';
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/\s+/g, '_');
  }

  /**
   * Get a specific model by ID
   */
  async getModel(orgId, modelId) {
    const catalog = await this.discoverModels(orgId);
    return catalog.models.find(m => m.id === modelId);
  }

  /**
   * Get models for a specific category
   */
  async getModelsByCategory(orgId, category) {
    const catalog = await this.discoverModels(orgId);
    return catalog.models.filter(m => m.metadata.category === category);
  }

  /**
   * Get relationships for a model
   */
  async getModelRelationships(orgId, modelId) {
    const catalog = await this.discoverModels(orgId);
    return catalog.relationships.filter(
      r => r.sourceModel === modelId || r.targetModel === modelId
    );
  }

  /**
   * Refresh catalog cache for an organization
   */
  async refreshCatalog(orgId) {
    const cacheKey = `catalog:${orgId}`;
    this.catalogCache.delete(cacheKey);
    return this.discoverModels(orgId);
  }

  /**
   * Get catalog summary for UI display
   */
  async getCatalogSummary(orgId) {
    const catalog = await this.discoverModels(orgId);

    // Group models by category
    const byCategory = {};
    for (const model of catalog.models) {
      const category = model.metadata.category;
      if (!byCategory[category]) {
        byCategory[category] = {
          name: category,
          icon: model.metadata.icon,
          models: [],
          modelCount: 0
        };
      }
      byCategory[category].models.push({
        id: model.id,
        name: model.displayName,
        appName: model.appName,
        rowCount: model.statistics.rowCount,
        fieldCount: model.fields.length
      });
      byCategory[category].modelCount++;
    }

    return {
      orgId,
      lastDiscovered: catalog.discoveredAt,
      statistics: catalog.statistics,
      categories: Object.values(byCategory)
    };
  }
}

module.exports = DataCatalogService;
