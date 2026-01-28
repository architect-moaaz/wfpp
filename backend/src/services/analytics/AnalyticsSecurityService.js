/**
 * AnalyticsSecurityService
 *
 * Handles security for analytics queries including:
 * - Row-Level Security (RLS)
 * - Column Masking
 * - Audit Logging
 * - Cross-app permissions
 */

class AnalyticsSecurityService {
  constructor() {
    // RLS policies storage
    this.rlsPolicies = new Map();

    // Column masking policies
    this.maskingPolicies = new Map();

    // Audit log (in production, would write to database)
    this.auditLog = [];

    // Initialize default policies
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default security policies
   */
  initializeDefaultPolicies() {
    // Default RLS policy for regional access
    this.addRLSPolicy('default', {
      id: 'regional-access',
      name: 'Regional Access',
      description: 'Users can only see data from their assigned regions',
      model: '*',
      condition: {
        field: 'region_id',
        operator: 'in',
        valueSource: 'user.assignedRegions'
      },
      exceptions: [
        { roles: ['admin', 'super_admin'], access: 'all' }
      ],
      aggregateRule: 'strict',
      enabled: true
    });

    // Default masking policy for PII
    this.addMaskingPolicy('default', {
      id: 'pii-masking',
      name: 'PII Protection',
      model: '*',
      fields: [
        {
          pattern: 'ssn',
          maskType: 'partial',
          maskPattern: '***-**-{last4}',
          roles: { full: ['hr_admin'], masked: ['manager'], hidden: ['default'] }
        },
        {
          pattern: 'email',
          maskType: 'email',
          maskPattern: '{first2}***@{domain}',
          roles: { full: ['admin'], masked: ['default'] }
        },
        {
          pattern: 'phone',
          maskType: 'partial',
          maskPattern: '***-***-{last4}',
          roles: { full: ['admin'], masked: ['default'] }
        },
        {
          pattern: 'salary',
          maskType: 'range',
          ranges: [
            { min: 0, max: 50000, label: '$0-50K' },
            { min: 50001, max: 100000, label: '$50K-100K' },
            { min: 100001, max: null, label: '$100K+' }
          ],
          roles: { full: ['hr_admin', 'cfo'], range: ['manager'], hidden: ['default'] }
        },
        {
          pattern: 'credit_card',
          maskType: 'partial',
          maskPattern: '****-****-****-{last4}',
          roles: { full: ['finance_admin'], masked: ['default'] }
        }
      ]
    });
  }

  // ==================== ROW-LEVEL SECURITY ====================

  /**
   * Add RLS policy
   */
  addRLSPolicy(orgId, policy) {
    const key = `${orgId}:${policy.id}`;
    this.rlsPolicies.set(key, {
      ...policy,
      orgId,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Get RLS policies for a model
   */
  getRLSPolicies(orgId, model) {
    const policies = [];

    for (const [key, policy] of this.rlsPolicies) {
      if (key.startsWith(`${orgId}:`) || key.startsWith('default:')) {
        if (policy.model === '*' || policy.model === model) {
          if (policy.enabled) {
            policies.push(policy);
          }
        }
      }
    }

    return policies;
  }

  /**
   * Apply RLS filters to a query
   */
  applyRLS(query, userContext, orgId) {
    const model = query.from?.modelName || query.from?.model;
    const policies = this.getRLSPolicies(orgId, model);

    for (const policy of policies) {
      // Check if user is exempt
      if (this.isExemptFromRLS(userContext, policy)) {
        continue;
      }

      // Build RLS filter
      const filter = this.buildRLSFilter(policy, userContext);
      if (filter) {
        if (!query.where) query.where = [];
        query.where.push(filter);
      }
    }

    return query;
  }

  /**
   * Check if user is exempt from RLS policy
   */
  isExemptFromRLS(userContext, policy) {
    if (!policy.exceptions) return false;

    const userRoles = userContext.roles || [];
    for (const exception of policy.exceptions) {
      if (exception.access === 'all') {
        const exemptRoles = exception.roles || [];
        if (exemptRoles.some(role => userRoles.includes(role))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Build RLS filter from policy
   */
  buildRLSFilter(policy, userContext) {
    const condition = policy.condition;
    let value;

    // Get value from user context
    if (condition.valueSource) {
      const path = condition.valueSource.split('.');
      value = path.reduce((obj, key) => obj?.[key], userContext);
    } else {
      value = condition.value;
    }

    if (value === undefined || value === null) {
      // If no value, deny all access by default
      return { field: condition.field, operator: 'eq', value: '__DENY_ALL__' };
    }

    return {
      field: condition.field,
      operator: condition.operator,
      value
    };
  }

  /**
   * Check if aggregation is allowed under RLS
   */
  checkAggregateAccess(query, userContext, orgId) {
    const model = query.from?.modelName || query.from?.model;
    const policies = this.getRLSPolicies(orgId, model);

    for (const policy of policies) {
      if (policy.aggregateRule === 'strict') {
        // Strict mode: aggregates only on visible data
        return { allowed: true, mode: 'strict' };
      }

      if (policy.aggregateRule === 'aggregate-allowed') {
        // Check if user has aggregate permission
        const userRoles = userContext.roles || [];
        const aggregateRoles = policy.aggregateAccess || [];

        if (aggregateRoles.some(role => userRoles.includes(role))) {
          return { allowed: true, mode: 'full' };
        }
      }
    }

    return { allowed: true, mode: 'strict' };
  }

  // ==================== COLUMN MASKING ====================

  /**
   * Add masking policy
   */
  addMaskingPolicy(orgId, policy) {
    const key = `${orgId}:${policy.id}`;
    this.maskingPolicies.set(key, {
      ...policy,
      orgId,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Get masking policies for a model
   */
  getMaskingPolicies(orgId, model) {
    const policies = [];

    for (const [key, policy] of this.maskingPolicies) {
      if (key.startsWith(`${orgId}:`) || key.startsWith('default:')) {
        if (policy.model === '*' || policy.model === model) {
          policies.push(policy);
        }
      }
    }

    return policies;
  }

  /**
   * Apply column masking to query results
   */
  applyMasking(data, model, userContext, orgId) {
    const policies = this.getMaskingPolicies(orgId, model);
    const userRoles = userContext.roles || ['default'];

    return data.map(row => {
      const maskedRow = { ...row };

      for (const policy of policies) {
        for (const fieldConfig of policy.fields) {
          // Find matching fields in the row
          const matchingFields = Object.keys(row).filter(key =>
            key.toLowerCase().includes(fieldConfig.pattern.toLowerCase())
          );

          for (const field of matchingFields) {
            const maskLevel = this.getMaskLevel(userRoles, fieldConfig.roles);
            maskedRow[field] = this.maskValue(row[field], fieldConfig, maskLevel);
          }
        }
      }

      return maskedRow;
    });
  }

  /**
   * Determine mask level based on user roles
   */
  getMaskLevel(userRoles, roleConfig) {
    // Check for full access
    if (roleConfig.full?.some(role => userRoles.includes(role))) {
      return 'full';
    }

    // Check for masked access
    if (roleConfig.masked?.some(role => userRoles.includes(role))) {
      return 'masked';
    }

    // Check for range access
    if (roleConfig.range?.some(role => userRoles.includes(role))) {
      return 'range';
    }

    // Default to hidden
    return 'hidden';
  }

  /**
   * Mask a value based on configuration
   */
  maskValue(value, fieldConfig, maskLevel) {
    if (value === null || value === undefined) return value;

    switch (maskLevel) {
      case 'full':
        return value;

      case 'hidden':
        return '***HIDDEN***';

      case 'masked':
        return this.applyMaskPattern(value, fieldConfig);

      case 'range':
        return this.applyRangeMask(value, fieldConfig);

      default:
        return '***HIDDEN***';
    }
  }

  /**
   * Apply mask pattern to value
   */
  applyMaskPattern(value, fieldConfig) {
    const strValue = String(value);

    switch (fieldConfig.maskType) {
      case 'partial':
        // Extract last N characters
        const last4Match = fieldConfig.maskPattern.match(/\{last(\d+)\}/);
        if (last4Match) {
          const n = parseInt(last4Match[1]);
          const lastN = strValue.slice(-n);
          return fieldConfig.maskPattern.replace(/\{last\d+\}/, lastN);
        }
        return fieldConfig.maskPattern;

      case 'email':
        const atIndex = strValue.indexOf('@');
        if (atIndex > 0) {
          const first2 = strValue.slice(0, 2);
          const domain = strValue.slice(atIndex + 1);
          return `${first2}***@${domain}`;
        }
        return '***@***.***';

      default:
        return '****';
    }
  }

  /**
   * Apply range mask to numeric value
   */
  applyRangeMask(value, fieldConfig) {
    const numValue = Number(value);
    if (isNaN(numValue)) return value;

    for (const range of fieldConfig.ranges || []) {
      const min = range.min ?? -Infinity;
      const max = range.max ?? Infinity;

      if (numValue >= min && numValue <= max) {
        return range.label;
      }
    }

    return 'Unknown range';
  }

  // ==================== AUDIT LOGGING ====================

  /**
   * Log a query execution
   */
  logQuery(queryContext) {
    const logEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      orgId: queryContext.orgId,
      userId: queryContext.userId,
      userEmail: queryContext.userEmail,
      sessionId: queryContext.sessionId,
      ipAddress: queryContext.ipAddress,

      action: 'QUERY_EXECUTE',
      queryType: queryContext.crossApp ? 'cross-app' : 'single-app',

      sourceApp: queryContext.sourceApp,
      targetApps: queryContext.targetApps || [],
      modelsAccessed: queryContext.modelsAccessed || [],
      fieldsAccessed: queryContext.fieldsAccessed || [],

      query: {
        hash: this.hashQuery(queryContext.query),
        type: queryContext.queryType,
        hasAggregation: queryContext.hasAggregation
      },

      result: {
        status: queryContext.status,
        rowsReturned: queryContext.rowsReturned,
        rowsFiltered: queryContext.rowsFiltered,
        executionMs: queryContext.executionMs,
        cacheHit: queryContext.cacheHit
      },

      security: {
        rlsApplied: queryContext.rlsApplied,
        rlsPolicies: queryContext.rlsPolicies || [],
        columnsMasked: queryContext.columnsMasked || [],
        aggregateMode: queryContext.aggregateMode
      }
    };

    this.auditLog.push(logEntry);

    // Keep only last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    return logEntry;
  }

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(filters = {}) {
    let logs = [...this.auditLog];

    if (filters.orgId) {
      logs = logs.filter(l => l.orgId === filters.orgId);
    }

    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      logs = logs.filter(l => new Date(l.timestamp) >= fromDate);
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      logs = logs.filter(l => new Date(l.timestamp) <= toDate);
    }

    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }

    if (filters.status) {
      logs = logs.filter(l => l.result.status === filters.status);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const start = (page - 1) * limit;

    return {
      logs: logs.slice(start, start + limit),
      total: logs.length,
      page,
      limit,
      totalPages: Math.ceil(logs.length / limit)
    };
  }

  /**
   * Get audit summary for dashboard
   */
  getAuditSummary(orgId, days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = this.auditLog.filter(l =>
      l.orgId === orgId && new Date(l.timestamp) >= cutoff
    );

    return {
      totalQueries: logs.length,
      successfulQueries: logs.filter(l => l.result.status === 'success').length,
      failedQueries: logs.filter(l => l.result.status === 'error').length,
      crossAppQueries: logs.filter(l => l.queryType === 'cross-app').length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      avgExecutionMs: logs.length > 0
        ? Math.round(logs.reduce((sum, l) => sum + l.result.executionMs, 0) / logs.length)
        : 0,
      cacheHitRate: logs.length > 0
        ? Math.round(logs.filter(l => l.result.cacheHit).length / logs.length * 100)
        : 0,
      topModels: this.getTopItems(logs, l => l.modelsAccessed, 5),
      topUsers: this.getTopItems(logs, l => [l.userId], 5)
    };
  }

  /**
   * Get top items from logs
   */
  getTopItems(logs, extractor, limit) {
    const counts = {};

    for (const log of logs) {
      const items = extractor(log);
      for (const item of items) {
        counts[item] = (counts[item] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }));
  }

  /**
   * Export audit logs for compliance
   */
  exportAuditLogs(orgId, from, to, format = 'json') {
    const logs = this.getAuditLogs({ orgId, from, to, limit: 100000 });

    if (format === 'json') {
      return JSON.stringify(logs.logs, null, 2);
    }

    // CSV format
    if (format === 'csv') {
      const headers = [
        'timestamp', 'userId', 'action', 'queryType',
        'modelsAccessed', 'status', 'rowsReturned', 'executionMs'
      ];

      const rows = logs.logs.map(l => [
        l.timestamp,
        l.userId,
        l.action,
        l.queryType,
        l.modelsAccessed.join(';'),
        l.result.status,
        l.result.rowsReturned,
        l.result.executionMs
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return logs;
  }

  /**
   * Hash query for audit log
   */
  hashQuery(query) {
    const str = JSON.stringify(query);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'q_' + Math.abs(hash).toString(36);
  }

  // ==================== CROSS-APP PERMISSIONS ====================

  /**
   * Check if user can access data from another app
   */
  canAccessCrossApp(userContext, sourceAppId, targetAppId, orgId) {
    // Within same organization, allow by default
    if (userContext.orgId === orgId) {
      return { allowed: true, reason: 'same_organization' };
    }

    // Check explicit cross-app permissions
    const permissions = userContext.crossAppPermissions || [];
    if (permissions.includes(targetAppId) || permissions.includes('*')) {
      return { allowed: true, reason: 'explicit_permission' };
    }

    return { allowed: false, reason: 'no_cross_app_access' };
  }

  /**
   * Validate query security before execution
   */
  validateQuerySecurity(query, userContext, orgId) {
    const issues = [];

    // Check cross-app access
    if (query.joins) {
      const apps = new Set([query.from?.appId]);
      for (const join of query.joins) {
        if (join.targetAppId) {
          apps.add(join.targetAppId);
        }
      }

      for (const appId of apps) {
        if (appId && appId !== query.from?.appId) {
          const access = this.canAccessCrossApp(
            userContext,
            query.from?.appId,
            appId,
            orgId
          );
          if (!access.allowed) {
            issues.push({
              type: 'cross_app_denied',
              app: appId,
              reason: access.reason
            });
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = AnalyticsSecurityService;
