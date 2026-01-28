/**
 * Analytics API Routes
 *
 * RESTful API endpoints for the Unified Analytics Platform.
 * Provides endpoints for:
 * - Natural language queries
 * - Data catalog browsing
 * - Lookup/cascading dropdowns
 * - Dashboard management
 * - Report management
 * - Admin/monitoring
 */

const express = require('express');
const router = express.Router();

const {
  dataCatalog,
  semanticLayer,
  queryEngine,
  lookupService,
  cacheService,
  securityService
} = require('../services/analytics');

// ==================== QUERY API ====================

/**
 * POST /api/analytics/query
 * Execute a natural language query
 */
router.post('/query', async (req, res) => {
  try {
    const { query, naturalLanguage } = req.body;
    const orgId = req.headers['x-org-id'] || 'default';
    const userContext = {
      userId: req.headers['x-user-id'] || 'anonymous',
      roles: (req.headers['x-user-roles'] || 'default').split(','),
      orgId
    };

    let result;

    if (naturalLanguage) {
      // Natural language query
      result = await queryEngine.queryFromNL(orgId, naturalLanguage, userContext);
    } else if (query) {
      // Structured query
      result = await queryEngine.executeQuery(orgId, query, userContext);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either "query" or "naturalLanguage" is required'
      });
    }

    // Log query for audit
    securityService.logQuery({
      orgId,
      userId: userContext.userId,
      query: query || naturalLanguage,
      queryType: naturalLanguage ? 'natural_language' : 'structured',
      status: result.success ? 'success' : 'error',
      rowsReturned: result.data?.length || 0,
      executionMs: result.meta?.executionTime || 0,
      cacheHit: result.meta?.cached || false
    });

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      error: {
        title: 'Query Failed',
        description: error.message
      }
    });
  }
});

/**
 * POST /api/analytics/query/explain
 * Get explanation of a natural language query
 */
router.post('/query/explain', async (req, res) => {
  try {
    const { naturalLanguage } = req.body;
    const orgId = req.headers['x-org-id'] || 'default';

    if (!naturalLanguage) {
      return res.status(400).json({
        success: false,
        error: '"naturalLanguage" is required'
      });
    }

    const parsedQuery = await queryEngine.parseNaturalLanguage(orgId, naturalLanguage);
    const explanation = queryEngine.explainQuery(parsedQuery);

    res.json({
      success: true,
      explanation,
      parsedQuery
    });
  } catch (error) {
    console.error('Explain error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CATALOG API ====================

/**
 * GET /api/analytics/catalog
 * Get catalog summary
 */
router.get('/catalog', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const summary = await dataCatalog.getCatalogSummary(orgId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/catalog/models
 * Get all models in catalog
 */
router.get('/catalog/models', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const catalog = await dataCatalog.discoverModels(orgId);

    res.json({
      success: true,
      data: {
        models: catalog.models,
        relationships: catalog.relationships,
        statistics: catalog.statistics
      }
    });
  } catch (error) {
    console.error('Catalog models error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/catalog/models/:modelId
 * Get specific model details
 */
router.get('/catalog/models/:modelId', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { modelId } = req.params;

    const model = await dataCatalog.getModel(orgId, modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    const relationships = await dataCatalog.getModelRelationships(orgId, modelId);

    res.json({
      success: true,
      data: {
        model,
        relationships
      }
    });
  } catch (error) {
    console.error('Model details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/catalog/refresh
 * Refresh catalog cache
 */
router.post('/catalog/refresh', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const catalog = await dataCatalog.refreshCatalog(orgId);

    res.json({
      success: true,
      message: 'Catalog refreshed',
      statistics: catalog.statistics
    });
  } catch (error) {
    console.error('Catalog refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== LOOKUP API ====================

/**
 * GET /api/analytics/lookups
 * Get available lookup definitions
 */
router.get('/lookups', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const lookups = await lookupService.getAvailableLookups(orgId);

    res.json({
      success: true,
      data: lookups
    });
  } catch (error) {
    console.error('Lookups error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/lookups/templates
 * Get lookup templates for wizard
 */
router.get('/lookups/templates', (req, res) => {
  try {
    const templates = lookupService.getLookupTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/lookups/:lookupId
 * Get lookup definition
 */
router.get('/lookups/:lookupId', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { lookupId } = req.params;

    const lookup = await lookupService.getLookupLevels(orgId, lookupId);

    res.json({
      success: true,
      data: lookup
    });
  } catch (error) {
    console.error('Lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/lookups/:lookupId/options
 * Get lookup options for a level
 */
router.get('/lookups/:lookupId/options', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { lookupId } = req.params;
    const { level, ...parentValues } = req.query;

    if (!level) {
      return res.status(400).json({
        success: false,
        error: '"level" query parameter is required'
      });
    }

    const options = await lookupService.getLookupOptions(orgId, lookupId, level, parentValues);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Lookup options error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/lookups/:lookupId/search
 * Search lookup options
 */
router.get('/lookups/:lookupId/search', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { lookupId } = req.params;
    const { level, q, ...parentValues } = req.query;

    if (!level || !q) {
      return res.status(400).json({
        success: false,
        error: '"level" and "q" query parameters are required'
      });
    }

    const results = await lookupService.searchLookup(orgId, lookupId, level, q, parentValues);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Lookup search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/lookups
 * Create a new lookup definition
 */
router.post('/lookups', async (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const config = req.body;

    const lookup = await lookupService.createLookup(orgId, config);

    res.json({
      success: true,
      data: lookup
    });
  } catch (error) {
    console.error('Create lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SEMANTIC LAYER API ====================

/**
 * GET /api/analytics/semantic/terms
 * Get business terms
 */
router.get('/semantic/terms', (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const terms = semanticLayer.getBusinessTerms(orgId);

    res.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Terms error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/semantic/metrics
 * Get metrics library
 */
router.get('/semantic/metrics', (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const metrics = semanticLayer.getMetrics(orgId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/semantic/calculated-fields
 * Get calculated fields
 */
router.get('/semantic/calculated-fields', (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const fields = semanticLayer.getCalculatedFields(orgId);

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Calculated fields error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ADMIN API ====================

/**
 * GET /api/analytics/admin/health
 * Get system health
 */
router.get('/admin/health', (req, res) => {
  try {
    const cacheHealth = cacheService.getHealth();

    res.json({
      success: true,
      data: {
        status: cacheHealth.status,
        cache: cacheHealth,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/admin/stats
 * Get cache statistics
 */
router.get('/admin/stats', (req, res) => {
  try {
    const stats = cacheService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/admin/cache/invalidate
 * Invalidate cache
 */
router.post('/admin/cache/invalidate', (req, res) => {
  try {
    const { pattern, orgId, appId, model } = req.body;

    let count = 0;

    if (pattern) {
      count = cacheService.invalidate(pattern);
    } else if (orgId && appId) {
      cacheService.invalidateApp(orgId, appId);
      lookupService.clearCache(orgId, '*');
    } else if (orgId && model) {
      cacheService.invalidateModel(orgId, model);
    } else if (orgId) {
      cacheService.invalidateOrg(orgId);
      lookupService.clearCache(orgId, '*');
    } else {
      cacheService.clear();
      lookupService.clearAllCache();
    }

    res.json({
      success: true,
      message: 'Cache invalidated',
      entriesInvalidated: count
    });
  } catch (error) {
    console.error('Cache invalidate error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/admin/audit
 * Get audit logs
 */
router.get('/admin/audit', (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { from, to, userId, action, page, limit } = req.query;

    const logs = securityService.getAuditLogs({
      orgId,
      from,
      to,
      userId,
      action,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/admin/audit/summary
 * Get audit summary
 */
router.get('/admin/audit/summary', (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { days } = req.query;

    const summary = securityService.getAuditSummary(orgId, parseInt(days) || 7);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Audit summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/admin/audit/export
 * Export audit logs
 */
router.get('/admin/audit/export', (req, res) => {
  try {
    const orgId = req.headers['x-org-id'] || 'default';
    const { from, to, format } = req.query;

    const data = securityService.exportAuditLogs(orgId, from, to, format || 'json');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
    }

    res.send(data);
  } catch (error) {
    console.error('Audit export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
