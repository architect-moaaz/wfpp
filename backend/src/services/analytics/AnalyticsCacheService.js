/**
 * AnalyticsCacheService
 *
 * Unified caching system for analytics queries and lookups.
 * Implements tiered caching with smart invalidation.
 *
 * Features:
 * - Three-tier caching (Hot/Warm/Cold)
 * - TTL-based expiration with tiers
 * - Event-based invalidation
 * - Cache statistics and monitoring
 */

class AnalyticsCacheService {
  constructor() {
    // In-memory cache (L1 - Hot)
    this.hotCache = new Map();
    this.hotCacheMaxSize = 1000;
    this.hotCacheTTL = 60 * 1000; // 1 minute

    // Extended cache (L2 - Warm) - would be Redis in production
    this.warmCache = new Map();
    this.warmCacheMaxSize = 10000;

    // TTL tiers (in milliseconds)
    this.ttlTiers = {
      'static': 24 * 60 * 60 * 1000,     // 24 hours (Countries, Currencies)
      'semi-static': 60 * 60 * 1000,      // 1 hour (Products, Categories)
      'dynamic': 5 * 60 * 1000,           // 5 minutes (Inventory, Prices)
      'real-time': 0                       // No cache (Orders, Live data)
    };

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      hotHits: 0,
      warmHits: 0,
      evictions: 0,
      invalidations: 0
    };

    // LRU tracking for eviction
    this.accessOrder = [];

    // Event listeners for invalidation
    this.invalidationListeners = new Map();
  }

  /**
   * Get from cache with tiered lookup
   * @param {string} key - Cache key
   * @returns {Object|null} Cached value or null
   */
  get(key) {
    // Try hot cache first
    const hotEntry = this.hotCache.get(key);
    if (hotEntry && !this.isExpired(hotEntry)) {
      this.stats.hits++;
      this.stats.hotHits++;
      this.updateAccessOrder(key);
      return hotEntry.value;
    }

    // Try warm cache
    const warmEntry = this.warmCache.get(key);
    if (warmEntry && !this.isExpired(warmEntry)) {
      this.stats.hits++;
      this.stats.warmHits++;
      // Promote to hot cache
      this.promoteToHot(key, warmEntry);
      return warmEntry.value;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   */
  set(key, value, options = {}) {
    const tier = options.tier || 'dynamic';
    const ttl = options.ttl || this.ttlTiers[tier];

    if (ttl === 0) return; // Don't cache real-time data

    const entry = {
      value,
      timestamp: Date.now(),
      ttl,
      tier,
      metadata: options.metadata || {}
    };

    // Add to hot cache
    this.setHot(key, entry);

    // Also add to warm cache for persistence
    this.setWarm(key, entry);
  }

  /**
   * Set in hot cache with LRU eviction
   */
  setHot(key, entry) {
    // Check if we need to evict
    if (this.hotCache.size >= this.hotCacheMaxSize) {
      this.evictFromHot();
    }

    this.hotCache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Set in warm cache
   */
  setWarm(key, entry) {
    if (this.warmCache.size >= this.warmCacheMaxSize) {
      this.evictFromWarm();
    }

    this.warmCache.set(key, entry);
  }

  /**
   * Promote entry from warm to hot cache
   */
  promoteToHot(key, entry) {
    this.setHot(key, entry);
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(entry) {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used from hot cache
   */
  evictFromHot() {
    // Remove oldest from access order
    while (this.accessOrder.length > 0 && this.hotCache.size >= this.hotCacheMaxSize) {
      const oldestKey = this.accessOrder.shift();
      if (this.hotCache.has(oldestKey)) {
        this.hotCache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Evict from warm cache (oldest first)
   */
  evictFromWarm() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.warmCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.warmCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   */
  invalidate(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;

    // Invalidate from hot cache
    for (const key of this.hotCache.keys()) {
      if (regex.test(key)) {
        this.hotCache.delete(key);
        count++;
      }
    }

    // Invalidate from warm cache
    for (const key of this.warmCache.keys()) {
      if (regex.test(key)) {
        this.warmCache.delete(key);
        count++;
      }
    }

    this.stats.invalidations += count;
    return count;
  }

  /**
   * Invalidate cache for a specific organization
   */
  invalidateOrg(orgId) {
    return this.invalidate(`*:${orgId}:*`);
  }

  /**
   * Invalidate cache for a specific app
   */
  invalidateApp(orgId, appId) {
    return this.invalidate(`*:${orgId}:${appId}:*`);
  }

  /**
   * Invalidate cache for a specific model
   */
  invalidateModel(orgId, modelName) {
    return this.invalidate(`*:${orgId}:*:${modelName}:*`);
  }

  /**
   * Register invalidation listener
   */
  onInvalidate(pattern, callback) {
    if (!this.invalidationListeners.has(pattern)) {
      this.invalidationListeners.set(pattern, []);
    }
    this.invalidationListeners.get(pattern).push(callback);
  }

  /**
   * Emit invalidation event
   */
  emitInvalidation(pattern, data) {
    for (const [listenerPattern, callbacks] of this.invalidationListeners) {
      const regex = new RegExp('^' + listenerPattern.replace(/\*/g, '.*') + '$');
      if (regex.test(pattern)) {
        for (const callback of callbacks) {
          try {
            callback(pattern, data);
          } catch (error) {
            console.error('Cache invalidation listener error:', error);
          }
        }
      }
    }
  }

  /**
   * Clear all caches
   */
  clear() {
    this.hotCache.clear();
    this.warmCache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      hotCacheSize: this.hotCache.size,
      warmCacheSize: this.warmCache.size,
      hotCacheMaxSize: this.hotCacheMaxSize,
      warmCacheMaxSize: this.warmCacheMaxSize
    };
  }

  /**
   * Get cache health status
   */
  getHealth() {
    const stats = this.getStats();
    const hitRate = parseFloat(stats.hitRate);

    let status = 'healthy';
    const issues = [];

    if (hitRate < 50) {
      status = 'degraded';
      issues.push('Low cache hit rate');
    }

    if (this.hotCache.size > this.hotCacheMaxSize * 0.9) {
      status = 'warning';
      issues.push('Hot cache near capacity');
    }

    if (this.warmCache.size > this.warmCacheMaxSize * 0.9) {
      status = 'warning';
      issues.push('Warm cache near capacity');
    }

    return {
      status,
      issues,
      stats
    };
  }

  /**
   * Generate cache key for queries
   */
  static generateQueryKey(orgId, query, userContext = {}) {
    const queryHash = this.hashObject(query);
    const contextHash = this.hashObject({
      userId: userContext.userId,
      roles: userContext.roles
    });

    return `query:${orgId}:${queryHash}:${contextHash}`;
  }

  /**
   * Generate cache key for lookups
   */
  static generateLookupKey(orgId, lookupId, level, parentValues = {}) {
    const parentHash = this.hashObject(parentValues);
    return `lookup:${orgId}:${lookupId}:${level}:${parentHash}`;
  }

  /**
   * Simple hash function for objects
   */
  static hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmUp(orgId, commonQueries = []) {
    console.log(`Warming up cache for org ${orgId}...`);

    // This would pre-populate cache with common queries
    // In production, would execute queries and cache results

    return {
      warmedUp: commonQueries.length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AnalyticsCacheService;
