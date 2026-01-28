/**
 * Analytics Services Index
 *
 * Exports all analytics-related services for the Unified Analytics Platform.
 */

const DataCatalogService = require('./DataCatalogService');
const SemanticLayerService = require('./SemanticLayerService');
const UnifiedQueryEngine = require('./UnifiedQueryEngine');
const LookupService = require('./LookupService');
const AnalyticsCacheService = require('./AnalyticsCacheService');
const AnalyticsSecurityService = require('./AnalyticsSecurityService');

// Create singleton instances
const dataCatalog = new DataCatalogService();
const semanticLayer = new SemanticLayerService();
const queryEngine = new UnifiedQueryEngine();
const lookupService = new LookupService();
const cacheService = new AnalyticsCacheService();
const securityService = new AnalyticsSecurityService();

module.exports = {
  // Service classes
  DataCatalogService,
  SemanticLayerService,
  UnifiedQueryEngine,
  LookupService,
  AnalyticsCacheService,
  AnalyticsSecurityService,

  // Singleton instances
  dataCatalog,
  semanticLayer,
  queryEngine,
  lookupService,
  cacheService,
  securityService
};
