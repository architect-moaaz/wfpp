/**
 * UnifiedQueryEngine
 *
 * Core query engine that handles parsing, planning, and execution of queries
 * across multiple databases and applications.
 *
 * Features:
 * - Natural language query parsing
 * - Query validation and optimization
 * - Cross-app query execution
 * - Result composition and transformation
 * - Query governor (limits, timeouts, cycle detection)
 */

const DataCatalogService = require('./DataCatalogService');
const SemanticLayerService = require('./SemanticLayerService');

class UnifiedQueryEngine {
  constructor() {
    this.catalog = new DataCatalogService();
    this.semantic = new SemanticLayerService();

    // Query governor limits
    this.limits = {
      maxJoinDepth: 5,
      maxAppsInQuery: 10,
      maxRowsReturn: 10000,
      maxExecutionTime: 30000, // 30 seconds
      maxConcurrentQueries: 100
    };

    // Track active queries for governor
    this.activeQueries = new Map();
  }

  /**
   * Execute a query from natural language
   * @param {string} orgId - Organization ID
   * @param {string} naturalLanguage - Natural language query
   * @param {Object} context - User context for security
   * @returns {Promise<Object>} Query results
   */
  async queryFromNL(orgId, naturalLanguage, context = {}) {
    const startTime = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Parse natural language to structured query
      const parsedQuery = await this.parseNaturalLanguage(orgId, naturalLanguage);

      // Step 2: Execute the structured query
      const result = await this.executeQuery(orgId, parsedQuery, context);

      // Add metadata
      result.meta = {
        ...result.meta,
        queryId,
        naturalLanguage,
        parsedQuery,
        executionTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        meta: {
          queryId,
          naturalLanguage,
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Parse natural language to structured query
   */
  async parseNaturalLanguage(orgId, text) {
    const catalog = await this.catalog.discoverModels(orgId);
    const lowerText = text.toLowerCase();

    // Extract components from natural language
    const parsed = {
      intent: this.detectIntent(lowerText),
      measure: this.extractMeasure(lowerText),
      model: this.extractModel(lowerText, catalog),
      groupBy: this.extractGroupBy(lowerText),
      filters: this.extractFilters(lowerText),
      timePeriod: this.semantic.parseTimePeriod(text),
      orderBy: this.extractOrderBy(lowerText),
      limit: this.extractLimit(lowerText)
    };

    // Convert to unified query format
    return this.buildUnifiedQuery(parsed, catalog);
  }

  /**
   * Detect query intent
   */
  detectIntent(text) {
    if (/show|list|display|get|find/.test(text)) return 'select';
    if (/count|how many|number of/.test(text)) return 'count';
    if (/total|sum/.test(text)) return 'sum';
    if (/average|avg|mean/.test(text)) return 'average';
    if (/compare|vs|versus/.test(text)) return 'compare';
    if (/trend|over time|by month|by day/.test(text)) return 'trend';
    if (/top|best|highest/.test(text)) return 'top';
    if (/bottom|worst|lowest/.test(text)) return 'bottom';
    return 'select';
  }

  /**
   * Extract measure/metric from text
   */
  extractMeasure(text) {
    const measurePatterns = [
      { pattern: /total\s+(?:of\s+)?(\w+)/i, aggregation: 'SUM' },
      { pattern: /sum\s+(?:of\s+)?(\w+)/i, aggregation: 'SUM' },
      { pattern: /average\s+(?:of\s+)?(\w+)/i, aggregation: 'AVG' },
      { pattern: /avg\s+(?:of\s+)?(\w+)/i, aggregation: 'AVG' },
      { pattern: /count\s+(?:of\s+)?(\w+)/i, aggregation: 'COUNT' },
      { pattern: /(?:how many|number of)\s+(\w+)/i, aggregation: 'COUNT' },
      { pattern: /maximum\s+(?:of\s+)?(\w+)/i, aggregation: 'MAX' },
      { pattern: /max\s+(?:of\s+)?(\w+)/i, aggregation: 'MAX' },
      { pattern: /minimum\s+(?:of\s+)?(\w+)/i, aggregation: 'MIN' },
      { pattern: /min\s+(?:of\s+)?(\w+)/i, aggregation: 'MIN' }
    ];

    for (const { pattern, aggregation } of measurePatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          aggregation,
          field: this.normalizeFieldName(match[1]),
          raw: match[0]
        };
      }
    }

    // Check for common business terms
    if (/revenue|sales|income/.test(text)) {
      return { aggregation: 'SUM', field: 'amount', alias: 'revenue' };
    }
    if (/orders|purchases/.test(text)) {
      return { aggregation: 'COUNT', field: '*', alias: 'order_count' };
    }
    if (/customers|clients/.test(text)) {
      return { aggregation: 'COUNT', field: 'DISTINCT customer_id', alias: 'customer_count' };
    }

    return null;
  }

  /**
   * Extract model/table from text
   */
  extractModel(text, catalog) {
    // Try to find model name in text
    for (const model of catalog.models) {
      const modelName = model.name.toLowerCase();
      const displayName = model.displayName.toLowerCase();

      if (text.includes(modelName) || text.includes(displayName)) {
        return model;
      }

      // Check plural forms
      if (text.includes(modelName + 's') || text.includes(displayName + 's')) {
        return model;
      }
    }

    // Infer from common terms
    const modelInferences = {
      'orders': 'Order',
      'sales': 'Order',
      'customers': 'Customer',
      'clients': 'Customer',
      'products': 'Product',
      'items': 'Product',
      'employees': 'Employee',
      'staff': 'Employee',
      'users': 'User'
    };

    for (const [term, modelName] of Object.entries(modelInferences)) {
      if (text.includes(term)) {
        const model = catalog.models.find(m =>
          m.name.toLowerCase() === modelName.toLowerCase()
        );
        if (model) return model;
      }
    }

    return null;
  }

  /**
   * Extract group by clause from text
   */
  extractGroupBy(text) {
    const grouping = this.semantic.parseGrouping(text);
    if (grouping) {
      return [grouping];
    }

    // Check for multiple groupings
    const groupPatterns = [
      /by\s+(\w+)\s+and\s+(\w+)/i,
      /group(?:ed)?\s+by\s+(\w+)/i,
      /per\s+(\w+)/i
    ];

    for (const pattern of groupPatterns) {
      const match = text.match(pattern);
      if (match) {
        const groups = [];
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            groups.push({ field: this.normalizeFieldName(match[i]) });
          }
        }
        return groups;
      }
    }

    return [];
  }

  /**
   * Extract filters from text
   */
  extractFilters(text) {
    const filters = [];

    // Status filters
    const statusMatch = text.match(/(?:where|with)\s+status\s+(?:is\s+|=\s*)?['"]?(\w+)['"]?/i);
    if (statusMatch) {
      filters.push({
        field: 'status',
        operator: 'eq',
        value: statusMatch[1]
      });
    }

    // Comparison filters
    const comparisonPatterns = [
      { pattern: /(\w+)\s+(?:greater than|>|more than)\s+(\d+)/i, operator: 'gt' },
      { pattern: /(\w+)\s+(?:less than|<|fewer than)\s+(\d+)/i, operator: 'lt' },
      { pattern: /(\w+)\s+(?:equals?|=|is)\s+['"]?(\w+)['"]?/i, operator: 'eq' },
      { pattern: /(\w+)\s+(?:>=|at least)\s+(\d+)/i, operator: 'gte' },
      { pattern: /(\w+)\s+(?:<=|at most)\s+(\d+)/i, operator: 'lte' }
    ];

    for (const { pattern, operator } of comparisonPatterns) {
      const match = text.match(pattern);
      if (match) {
        filters.push({
          field: this.normalizeFieldName(match[1]),
          operator,
          value: isNaN(match[2]) ? match[2] : Number(match[2])
        });
      }
    }

    return filters;
  }

  /**
   * Extract order by clause from text
   */
  extractOrderBy(text) {
    if (/top|best|highest|most/.test(text)) {
      return [{ field: 'value', direction: 'DESC' }];
    }
    if (/bottom|worst|lowest|least/.test(text)) {
      return [{ field: 'value', direction: 'ASC' }];
    }

    const orderMatch = text.match(/(?:order|sort)(?:ed)?\s+by\s+(\w+)\s*(asc|desc)?/i);
    if (orderMatch) {
      return [{
        field: this.normalizeFieldName(orderMatch[1]),
        direction: (orderMatch[2] || 'ASC').toUpperCase()
      }];
    }

    return [];
  }

  /**
   * Extract limit from text
   */
  extractLimit(text) {
    const topMatch = text.match(/top\s+(\d+)/i);
    if (topMatch) return parseInt(topMatch[1]);

    const limitMatch = text.match(/(?:limit|first|show)\s+(\d+)/i);
    if (limitMatch) return parseInt(limitMatch[1]);

    // Default limits based on intent
    if (/top|best|highest|bottom|worst|lowest/.test(text)) return 10;

    return null;
  }

  /**
   * Normalize field name
   */
  normalizeFieldName(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Build unified query from parsed components
   */
  buildUnifiedQuery(parsed, catalog) {
    const query = {
      select: [],
      from: null,
      joins: [],
      where: [],
      groupBy: [],
      orderBy: [],
      limit: parsed.limit || 100
    };

    // Set FROM clause
    if (parsed.model) {
      query.from = {
        model: parsed.model.id,
        modelName: parsed.model.name,
        appId: parsed.model.appId
      };
    }

    // Set SELECT clause
    if (parsed.measure) {
      query.select.push({
        expression: parsed.measure.aggregation === 'COUNT' && parsed.measure.field === '*'
          ? 'COUNT(*)'
          : `${parsed.measure.aggregation}(${parsed.measure.field})`,
        alias: parsed.measure.alias || 'value'
      });
    }

    // Add group by fields to select
    for (const group of parsed.groupBy) {
      query.select.push({
        field: group.field,
        alias: group.field
      });
      query.groupBy.push(group);
    }

    // Set WHERE clause
    query.where = parsed.filters;

    // Add time period filter
    if (parsed.timePeriod) {
      query.where.push({
        field: 'created_at',
        operator: 'between',
        value: parsed.timePeriod
      });
    }

    // Set ORDER BY
    query.orderBy = parsed.orderBy.length > 0
      ? parsed.orderBy
      : [{ field: 'value', direction: 'DESC' }];

    return query;
  }

  /**
   * Execute a unified query
   */
  async executeQuery(orgId, query, context = {}) {
    const startTime = Date.now();
    const queryId = `exec_${Date.now()}`;

    try {
      // Validate query against governor limits
      this.validateQuery(query);

      // Check for cross-app queries
      const isCrossApp = this.isCrossAppQuery(query);

      // For now, generate mock data
      // In production, this would:
      // 1. Route to appropriate database adapter
      // 2. Execute query
      // 3. Join results if cross-app
      const results = await this.generateMockResults(query, orgId);

      return {
        success: true,
        data: results.data,
        meta: {
          queryId,
          rowCount: results.data.length,
          executionTime: Date.now() - startTime,
          cached: false,
          crossApp: isCrossApp
        },
        visualization: this.suggestVisualization(query, results)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate query against governor limits
   */
  validateQuery(query) {
    // Check join depth
    if (query.joins && query.joins.length > this.limits.maxJoinDepth) {
      throw new Error(`Query exceeds maximum join depth of ${this.limits.maxJoinDepth}`);
    }

    // Check for circular dependencies
    if (this.detectCircularDependency(query)) {
      throw new Error('Circular dependency detected in query');
    }

    // Check row limit
    if (query.limit > this.limits.maxRowsReturn) {
      query.limit = this.limits.maxRowsReturn;
    }

    return true;
  }

  /**
   * Detect circular dependencies in joins
   */
  detectCircularDependency(query) {
    if (!query.joins || query.joins.length === 0) return false;

    const visited = new Set();
    const path = [];

    const checkCycle = (model) => {
      if (path.includes(model)) return true;
      if (visited.has(model)) return false;

      visited.add(model);
      path.push(model);

      const relatedJoins = query.joins.filter(j =>
        j.sourceModel === model || j.targetModel === model
      );

      for (const join of relatedJoins) {
        const nextModel = join.sourceModel === model ? join.targetModel : join.sourceModel;
        if (checkCycle(nextModel)) return true;
      }

      path.pop();
      return false;
    };

    return query.from ? checkCycle(query.from.model) : false;
  }

  /**
   * Check if query involves multiple apps
   */
  isCrossAppQuery(query) {
    if (!query.joins || query.joins.length === 0) return false;

    const apps = new Set([query.from?.appId]);
    for (const join of query.joins) {
      if (join.targetAppId) apps.add(join.targetAppId);
    }

    return apps.size > 1;
  }

  /**
   * Generate mock results for demonstration
   * In production, this would execute against real databases
   */
  async generateMockResults(query, orgId) {
    const data = [];

    // Generate appropriate mock data based on query
    if (query.groupBy && query.groupBy.length > 0) {
      // Grouped data
      const groupField = query.groupBy[0].field;
      const groups = this.getMockGroups(groupField);

      for (const group of groups) {
        data.push({
          [groupField]: group.label,
          value: group.value
        });
      }
    } else {
      // List data
      const count = query.limit || 10;
      for (let i = 0; i < count; i++) {
        data.push(this.generateMockRow(query, i));
      }
    }

    return { data };
  }

  /**
   * Get mock groups for demonstration
   */
  getMockGroups(field) {
    const mockGroups = {
      region: [
        { label: 'West', value: 2400000 },
        { label: 'East', value: 1900000 },
        { label: 'Central', value: 1200000 },
        { label: 'South', value: 890000 }
      ],
      country: [
        { label: 'United States', value: 3500000 },
        { label: 'Canada', value: 1200000 },
        { label: 'United Kingdom', value: 980000 },
        { label: 'Germany', value: 750000 }
      ],
      category: [
        { label: 'Electronics', value: 1800000 },
        { label: 'Clothing', value: 1200000 },
        { label: 'Home & Garden', value: 850000 },
        { label: 'Sports', value: 620000 }
      ],
      month: [
        { label: 'January', value: 520000 },
        { label: 'February', value: 480000 },
        { label: 'March', value: 610000 },
        { label: 'April', value: 590000 }
      ],
      status: [
        { label: 'Completed', value: 4500 },
        { label: 'Pending', value: 1200 },
        { label: 'Cancelled', value: 300 }
      ]
    };

    return mockGroups[field] || [
      { label: 'Group A', value: 1500000 },
      { label: 'Group B', value: 1200000 },
      { label: 'Group C', value: 900000 },
      { label: 'Group D', value: 600000 }
    ];
  }

  /**
   * Generate a mock data row
   */
  generateMockRow(query, index) {
    return {
      id: `row_${index + 1}`,
      name: `Item ${index + 1}`,
      value: Math.floor(Math.random() * 10000) + 1000,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Suggest visualization type based on query
   */
  suggestVisualization(query, results) {
    const dataLength = results.data.length;
    const hasGrouping = query.groupBy && query.groupBy.length > 0;
    const isTimeGrouped = query.groupBy?.some(g =>
      ['month', 'week', 'day', 'year', 'quarter', 'date', 'time'].includes(g.field)
    );

    if (isTimeGrouped) {
      return { type: 'line', title: 'Trend Over Time' };
    }

    if (hasGrouping && dataLength <= 6) {
      return { type: 'pie', title: 'Distribution' };
    }

    if (hasGrouping) {
      return { type: 'bar', title: 'Comparison' };
    }

    if (dataLength === 1) {
      return { type: 'kpi', title: 'Key Metric' };
    }

    return { type: 'table', title: 'Data' };
  }

  /**
   * Format error for user-friendly display
   */
  formatError(error) {
    const errorMessages = {
      'Query exceeds maximum join depth': {
        title: 'Query Too Complex',
        description: 'This question connects too many data sources. Try breaking it into smaller questions.',
        suggestions: [
          'Start with a simpler question',
          'Ask about one data source at a time',
          'Contact support if you need this specific analysis'
        ]
      },
      'Circular dependency detected': {
        title: 'Data Loop Detected',
        description: 'The data sources reference each other in a loop, which cannot be processed.',
        suggestions: [
          'Try asking about specific data without connecting back',
          'Remove one of the connections in your question'
        ]
      }
    };

    const key = Object.keys(errorMessages).find(k => error.message?.includes(k));
    if (key) {
      return errorMessages[key];
    }

    return {
      title: 'Something went wrong',
      description: error.message || 'An unexpected error occurred.',
      suggestions: [
        'Try rephrasing your question',
        'Refresh the page and try again'
      ]
    };
  }

  /**
   * Get query explanation for user
   */
  explainQuery(parsedQuery) {
    const parts = [];

    if (parsedQuery.measure) {
      parts.push(`Calculate the ${parsedQuery.measure.aggregation.toLowerCase()} of ${parsedQuery.measure.field}`);
    }

    if (parsedQuery.model) {
      parts.push(`from ${parsedQuery.model.displayName}`);
    }

    if (parsedQuery.groupBy && parsedQuery.groupBy.length > 0) {
      parts.push(`grouped by ${parsedQuery.groupBy.map(g => g.field).join(', ')}`);
    }

    if (parsedQuery.timePeriod) {
      parts.push(`for ${parsedQuery.timePeriod.label}`);
    }

    if (parsedQuery.filters && parsedQuery.filters.length > 0) {
      const filterDescs = parsedQuery.filters.map(f =>
        `${f.field} ${f.operator} ${f.value}`
      );
      parts.push(`where ${filterDescs.join(' and ')}`);
    }

    return {
      summary: parts.join(' '),
      parts: parsedQuery
    };
  }
}

module.exports = UnifiedQueryEngine;
