/**
 * SemanticLayerService
 *
 * Manages business definitions, calculated fields, metrics, and lookup configurations.
 * Provides a user-friendly abstraction over raw data models.
 *
 * Features:
 * - Business term definitions (Revenue, Profit, etc.)
 * - Calculated fields (full_name, age, etc.)
 * - Metric library with aggregations
 * - Lookup definitions for cascading dropdowns
 */

const ApplicationDatabase = require('../../database/ApplicationDatabase');

class SemanticLayerService {
  constructor() {
    this.db = new ApplicationDatabase();

    // In-memory storage for semantic definitions (would be persisted in production)
    this.businessTerms = new Map();
    this.calculatedFields = new Map();
    this.metrics = new Map();
    this.lookups = new Map();

    // Initialize default lookups and metrics
    this.initializeDefaults();
  }

  /**
   * Initialize default semantic definitions
   */
  initializeDefaults() {
    // Default calculated fields that are commonly useful
    this.addCalculatedField('default', {
      id: 'full_name',
      name: 'Full Name',
      description: 'Combines first and last name',
      expression: "CONCAT(first_name, ' ', last_name)",
      inputFields: ['first_name', 'last_name'],
      outputType: 'string'
    });

    this.addCalculatedField('default', {
      id: 'age',
      name: 'Age',
      description: 'Calculates age from date of birth',
      expression: 'FLOOR((NOW() - date_of_birth) / 365)',
      inputFields: ['date_of_birth'],
      outputType: 'number'
    });

    // Default business terms
    this.addBusinessTerm('default', {
      id: 'revenue',
      name: 'Revenue',
      description: 'Total income from sales',
      formula: '(unit_price * quantity) - discount',
      inputFields: ['unit_price', 'quantity', 'discount'],
      outputType: 'currency'
    });

    this.addBusinessTerm('default', {
      id: 'profit',
      name: 'Profit',
      description: 'Revenue minus cost',
      formula: 'revenue - cost',
      inputFields: ['revenue', 'cost'],
      outputType: 'currency'
    });

    this.addBusinessTerm('default', {
      id: 'margin',
      name: 'Margin',
      description: 'Profit as percentage of revenue',
      formula: '(profit / revenue) * 100',
      inputFields: ['profit', 'revenue'],
      outputType: 'percentage'
    });
  }

  // ==================== BUSINESS TERMS ====================

  /**
   * Add a business term definition
   */
  addBusinessTerm(orgId, term) {
    const key = `${orgId}:${term.id}`;
    const termDef = {
      ...term,
      orgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.businessTerms.set(key, termDef);
    return termDef;
  }

  /**
   * Get business terms for an organization
   */
  getBusinessTerms(orgId) {
    const terms = [];

    // Add default terms
    for (const [key, term] of this.businessTerms) {
      if (key.startsWith('default:') || key.startsWith(`${orgId}:`)) {
        terms.push(term);
      }
    }

    return terms;
  }

  /**
   * Get a specific business term
   */
  getBusinessTerm(orgId, termId) {
    return this.businessTerms.get(`${orgId}:${termId}`) ||
           this.businessTerms.get(`default:${termId}`);
  }

  // ==================== CALCULATED FIELDS ====================

  /**
   * Add a calculated field definition
   */
  addCalculatedField(orgId, field) {
    const key = `${orgId}:${field.id}`;
    const fieldDef = {
      ...field,
      orgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.calculatedFields.set(key, fieldDef);
    return fieldDef;
  }

  /**
   * Get calculated fields for an organization
   */
  getCalculatedFields(orgId) {
    const fields = [];

    for (const [key, field] of this.calculatedFields) {
      if (key.startsWith('default:') || key.startsWith(`${orgId}:`)) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Apply calculated field to data
   */
  applyCalculatedField(fieldId, data, orgId) {
    const field = this.calculatedFields.get(`${orgId}:${fieldId}`) ||
                  this.calculatedFields.get(`default:${fieldId}`);

    if (!field) {
      throw new Error(`Calculated field not found: ${fieldId}`);
    }

    // Simple expression evaluation (in production, use a safe evaluator)
    return this.evaluateExpression(field.expression, data);
  }

  // ==================== METRICS ====================

  /**
   * Add a metric definition
   */
  addMetric(orgId, metric) {
    const key = `${orgId}:${metric.id}`;
    const metricDef = {
      ...metric,
      orgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.metrics.set(key, metricDef);
    return metricDef;
  }

  /**
   * Get metrics for an organization
   */
  getMetrics(orgId) {
    const metrics = [];

    for (const [key, metric] of this.metrics) {
      if (key.startsWith('default:') || key.startsWith(`${orgId}:`)) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Get metric by ID
   */
  getMetric(orgId, metricId) {
    return this.metrics.get(`${orgId}:${metricId}`) ||
           this.metrics.get(`default:${metricId}`);
  }

  /**
   * Create a metric from natural language description
   */
  createMetricFromNL(orgId, description) {
    // Parse common patterns
    const patterns = [
      {
        regex: /total\s+(?:of\s+)?(\w+)/i,
        aggregation: 'SUM',
        extract: (match) => match[1]
      },
      {
        regex: /average\s+(?:of\s+)?(\w+)/i,
        aggregation: 'AVG',
        extract: (match) => match[1]
      },
      {
        regex: /count\s+(?:of\s+)?(\w+)/i,
        aggregation: 'COUNT',
        extract: (match) => match[1]
      },
      {
        regex: /(?:number|how many)\s+(?:of\s+)?(\w+)/i,
        aggregation: 'COUNT',
        extract: (match) => match[1]
      },
      {
        regex: /maximum\s+(?:of\s+)?(\w+)/i,
        aggregation: 'MAX',
        extract: (match) => match[1]
      },
      {
        regex: /minimum\s+(?:of\s+)?(\w+)/i,
        aggregation: 'MIN',
        extract: (match) => match[1]
      }
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern.regex);
      if (match) {
        const field = pattern.extract(match);
        return {
          aggregation: pattern.aggregation,
          field: field,
          expression: `${pattern.aggregation}(${field})`
        };
      }
    }

    return null;
  }

  // ==================== LOOKUPS ====================

  /**
   * Create a lookup definition for cascading dropdowns
   */
  createLookup(orgId, config) {
    const lookup = {
      id: config.id || `lookup_${Date.now()}`,
      orgId,
      name: config.name,
      description: config.description,
      type: config.type || 'cascading', // cascading | simple | search
      levels: config.levels.map((level, index) => ({
        ...level,
        order: index,
        cache: level.cache || this.getDefaultCacheConfig(level)
      })),
      ui: {
        autoSelectSingle: config.ui?.autoSelectSingle !== false,
        showSearch: config.ui?.showSearch !== false,
        placeholder: config.ui?.placeholder || 'Select...'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const key = `${orgId}:${lookup.id}`;
    this.lookups.set(key, lookup);

    return lookup;
  }

  /**
   * Get lookup by ID
   */
  getLookup(orgId, lookupId) {
    return this.lookups.get(`${orgId}:${lookupId}`);
  }

  /**
   * Get all lookups for an organization
   */
  getLookups(orgId) {
    const lookups = [];

    for (const [key, lookup] of this.lookups) {
      if (key.startsWith(`${orgId}:`)) {
        lookups.push(lookup);
      }
    }

    return lookups;
  }

  /**
   * Update a lookup definition
   */
  updateLookup(orgId, lookupId, updates) {
    const key = `${orgId}:${lookupId}`;
    const existing = this.lookups.get(key);

    if (!existing) {
      throw new Error(`Lookup not found: ${lookupId}`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.lookups.set(key, updated);
    return updated;
  }

  /**
   * Delete a lookup definition
   */
  deleteLookup(orgId, lookupId) {
    const key = `${orgId}:${lookupId}`;
    return this.lookups.delete(key);
  }

  /**
   * Get default cache configuration based on data characteristics
   */
  getDefaultCacheConfig(level) {
    const name = (level.name || '').toLowerCase();

    // Static reference data - cache for 24 hours
    if (['country', 'currency', 'language', 'timezone'].some(n => name.includes(n))) {
      return { tier: 'static', ttl: 86400 };
    }

    // Semi-static data - cache for 1 hour
    if (['state', 'city', 'category', 'department'].some(n => name.includes(n))) {
      return { tier: 'semi-static', ttl: 3600 };
    }

    // Dynamic data - cache for 5 minutes
    return { tier: 'dynamic', ttl: 300 };
  }

  /**
   * Create a geographic lookup (Country -> State -> City)
   */
  createGeographicLookup(orgId, appId) {
    return this.createLookup(orgId, {
      id: 'geographic-hierarchy',
      name: 'Geographic Hierarchy',
      description: 'Country, State, and City selection',
      type: 'cascading',
      levels: [
        {
          name: 'Country',
          source: {
            appId,
            model: 'Country',
            valueField: 'id',
            labelField: 'name',
            sortField: 'name',
            sortOrder: 'asc'
          },
          filters: [{ field: 'active', operator: 'eq', value: true }]
        },
        {
          name: 'State',
          source: {
            appId,
            model: 'State',
            valueField: 'id',
            labelField: 'name',
            parentField: 'country_id'
          },
          dependsOn: 'Country'
        },
        {
          name: 'City',
          source: {
            appId,
            model: 'City',
            valueField: 'id',
            labelField: 'name',
            parentField: 'state_id'
          },
          dependsOn: 'State'
        }
      ]
    });
  }

  /**
   * Create an organizational lookup (Company -> Department -> Team)
   */
  createOrganizationalLookup(orgId, appId) {
    return this.createLookup(orgId, {
      id: 'organizational-hierarchy',
      name: 'Organizational Hierarchy',
      description: 'Company, Department, and Team selection',
      type: 'cascading',
      levels: [
        {
          name: 'Company',
          source: {
            appId,
            model: 'Company',
            valueField: 'id',
            labelField: 'name'
          }
        },
        {
          name: 'Department',
          source: {
            appId,
            model: 'Department',
            valueField: 'id',
            labelField: 'name',
            parentField: 'company_id'
          },
          dependsOn: 'Company'
        },
        {
          name: 'Team',
          source: {
            appId,
            model: 'Team',
            valueField: 'id',
            labelField: 'name',
            parentField: 'department_id'
          },
          dependsOn: 'Department'
        }
      ]
    });
  }

  /**
   * Create a category lookup (Category -> Subcategory -> Product)
   */
  createCategoryLookup(orgId, appId) {
    return this.createLookup(orgId, {
      id: 'category-hierarchy',
      name: 'Category Hierarchy',
      description: 'Category, Subcategory, and Product selection',
      type: 'cascading',
      levels: [
        {
          name: 'Category',
          source: {
            appId,
            model: 'Category',
            valueField: 'id',
            labelField: 'name'
          }
        },
        {
          name: 'Subcategory',
          source: {
            appId,
            model: 'Subcategory',
            valueField: 'id',
            labelField: 'name',
            parentField: 'category_id'
          },
          dependsOn: 'Category'
        },
        {
          name: 'Product',
          source: {
            appId,
            model: 'Product',
            valueField: 'id',
            labelField: 'name',
            parentField: 'subcategory_id'
          },
          dependsOn: 'Subcategory'
        }
      ]
    });
  }

  // ==================== HELPERS ====================

  /**
   * Simple expression evaluator (for calculated fields)
   * In production, use a safe sandbox
   */
  evaluateExpression(expression, data) {
    // Replace field names with actual values
    let expr = expression;
    for (const [key, value] of Object.entries(data)) {
      expr = expr.replace(new RegExp(key, 'g'), JSON.stringify(value));
    }

    // Handle CONCAT function
    const concatMatch = expr.match(/CONCAT\((.*)\)/);
    if (concatMatch) {
      const args = concatMatch[1].split(',').map(a => {
        const trimmed = a.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          return trimmed.slice(1, -1);
        }
        return data[trimmed] || '';
      });
      return args.join('');
    }

    // For simple arithmetic, we can use eval safely here
    // In production, use math.js or similar safe library
    try {
      // Only allow numbers and basic operators
      if (/^[\d\s+\-*/().]+$/.test(expr)) {
        return eval(expr);
      }
    } catch (e) {
      // Ignore eval errors
    }

    return expr;
  }

  /**
   * Parse time period from natural language
   */
  parseTimePeriod(text) {
    const periods = {
      'today': { start: 'today', end: 'today' },
      'yesterday': { start: 'yesterday', end: 'yesterday' },
      'this week': { start: 'startOfWeek', end: 'today' },
      'last week': { start: 'startOfLastWeek', end: 'endOfLastWeek' },
      'this month': { start: 'startOfMonth', end: 'today' },
      'last month': { start: 'startOfLastMonth', end: 'endOfLastMonth' },
      'this quarter': { start: 'startOfQuarter', end: 'today' },
      'last quarter': { start: 'startOfLastQuarter', end: 'endOfLastQuarter' },
      'this year': { start: 'startOfYear', end: 'today' },
      'last year': { start: 'startOfLastYear', end: 'endOfLastYear' },
      'last 7 days': { start: '-7days', end: 'today' },
      'last 30 days': { start: '-30days', end: 'today' },
      'last 90 days': { start: '-90days', end: 'today' }
    };

    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(periods)) {
      if (lowerText.includes(key)) {
        return { ...value, label: key };
      }
    }

    return null;
  }

  /**
   * Parse grouping from natural language
   */
  parseGrouping(text) {
    const groupings = {
      'by region': { field: 'region', type: 'dimension' },
      'by country': { field: 'country', type: 'dimension' },
      'by state': { field: 'state', type: 'dimension' },
      'by city': { field: 'city', type: 'dimension' },
      'by customer': { field: 'customer', type: 'dimension' },
      'by product': { field: 'product', type: 'dimension' },
      'by category': { field: 'category', type: 'dimension' },
      'by department': { field: 'department', type: 'dimension' },
      'by team': { field: 'team', type: 'dimension' },
      'by month': { field: 'created_at', type: 'time', granularity: 'month' },
      'by week': { field: 'created_at', type: 'time', granularity: 'week' },
      'by day': { field: 'created_at', type: 'time', granularity: 'day' },
      'by year': { field: 'created_at', type: 'time', granularity: 'year' },
      'by quarter': { field: 'created_at', type: 'time', granularity: 'quarter' },
      'over time': { field: 'created_at', type: 'time', granularity: 'auto' }
    };

    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(groupings)) {
      if (lowerText.includes(key)) {
        return { ...value, label: key };
      }
    }

    return null;
  }
}

module.exports = SemanticLayerService;
