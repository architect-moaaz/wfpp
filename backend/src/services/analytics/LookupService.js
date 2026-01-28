/**
 * LookupService
 *
 * Provides cascading dropdown functionality and lookup data retrieval
 * for forms across applications.
 *
 * Features:
 * - Cascading dropdowns (Country -> State -> City)
 * - Cross-app data lookups
 * - Smart caching with TTL tiers
 * - Search/autocomplete for large datasets
 * - UI component recommendations
 */

const DataCatalogService = require('./DataCatalogService');
const SemanticLayerService = require('./SemanticLayerService');

class LookupService {
  constructor() {
    this.catalog = new DataCatalogService();
    this.semantic = new SemanticLayerService();

    // Cache for lookup data
    this.cache = new Map();

    // Cache TTL tiers (in milliseconds)
    this.cacheTiers = {
      'static': 24 * 60 * 60 * 1000,     // 24 hours
      'semi-static': 60 * 60 * 1000,      // 1 hour
      'dynamic': 5 * 60 * 1000,           // 5 minutes
      'real-time': 0                       // No cache
    };

    // Initialize with sample reference data
    this.initializeSampleData();
  }

  /**
   * Initialize sample reference data for demonstration
   */
  initializeSampleData() {
    // Countries
    this.sampleData = {
      countries: [
        { id: 'US', name: 'United States', code: 'US', active: true },
        { id: 'CA', name: 'Canada', code: 'CA', active: true },
        { id: 'UK', name: 'United Kingdom', code: 'UK', active: true },
        { id: 'DE', name: 'Germany', code: 'DE', active: true },
        { id: 'FR', name: 'France', code: 'FR', active: true },
        { id: 'AU', name: 'Australia', code: 'AU', active: true },
        { id: 'JP', name: 'Japan', code: 'JP', active: true },
        { id: 'IN', name: 'India', code: 'IN', active: true }
      ],

      // States by country
      states: {
        'US': [
          { id: 'CA', name: 'California', country_id: 'US' },
          { id: 'NY', name: 'New York', country_id: 'US' },
          { id: 'TX', name: 'Texas', country_id: 'US' },
          { id: 'FL', name: 'Florida', country_id: 'US' },
          { id: 'WA', name: 'Washington', country_id: 'US' },
          { id: 'IL', name: 'Illinois', country_id: 'US' },
          { id: 'PA', name: 'Pennsylvania', country_id: 'US' },
          { id: 'OH', name: 'Ohio', country_id: 'US' }
        ],
        'CA': [
          { id: 'ON', name: 'Ontario', country_id: 'CA' },
          { id: 'QC', name: 'Quebec', country_id: 'CA' },
          { id: 'BC', name: 'British Columbia', country_id: 'CA' },
          { id: 'AB', name: 'Alberta', country_id: 'CA' }
        ],
        'UK': [
          { id: 'ENG', name: 'England', country_id: 'UK' },
          { id: 'SCT', name: 'Scotland', country_id: 'UK' },
          { id: 'WLS', name: 'Wales', country_id: 'UK' },
          { id: 'NIR', name: 'Northern Ireland', country_id: 'UK' }
        ],
        'DE': [
          { id: 'BY', name: 'Bavaria', country_id: 'DE' },
          { id: 'BE', name: 'Berlin', country_id: 'DE' },
          { id: 'HH', name: 'Hamburg', country_id: 'DE' },
          { id: 'NW', name: 'North Rhine-Westphalia', country_id: 'DE' }
        ],
        'AU': [
          { id: 'NSW', name: 'New South Wales', country_id: 'AU' },
          { id: 'VIC', name: 'Victoria', country_id: 'AU' },
          { id: 'QLD', name: 'Queensland', country_id: 'AU' },
          { id: 'WA', name: 'Western Australia', country_id: 'AU' }
        ]
      },

      // Cities by state
      cities: {
        'CA': [
          { id: 'LA', name: 'Los Angeles', state_id: 'CA' },
          { id: 'SF', name: 'San Francisco', state_id: 'CA' },
          { id: 'SD', name: 'San Diego', state_id: 'CA' },
          { id: 'SJ', name: 'San Jose', state_id: 'CA' },
          { id: 'SAC', name: 'Sacramento', state_id: 'CA' },
          { id: 'OAK', name: 'Oakland', state_id: 'CA' }
        ],
        'NY': [
          { id: 'NYC', name: 'New York City', state_id: 'NY' },
          { id: 'BUF', name: 'Buffalo', state_id: 'NY' },
          { id: 'ROC', name: 'Rochester', state_id: 'NY' },
          { id: 'ALB', name: 'Albany', state_id: 'NY' }
        ],
        'TX': [
          { id: 'HOU', name: 'Houston', state_id: 'TX' },
          { id: 'DAL', name: 'Dallas', state_id: 'TX' },
          { id: 'AUS', name: 'Austin', state_id: 'TX' },
          { id: 'SAT', name: 'San Antonio', state_id: 'TX' }
        ],
        'ON': [
          { id: 'TOR', name: 'Toronto', state_id: 'ON' },
          { id: 'OTT', name: 'Ottawa', state_id: 'ON' },
          { id: 'HAM', name: 'Hamilton', state_id: 'ON' }
        ],
        'ENG': [
          { id: 'LON', name: 'London', state_id: 'ENG' },
          { id: 'MAN', name: 'Manchester', state_id: 'ENG' },
          { id: 'BIR', name: 'Birmingham', state_id: 'ENG' },
          { id: 'LIV', name: 'Liverpool', state_id: 'ENG' }
        ]
      },

      // Categories and subcategories
      categories: [
        { id: 'ELEC', name: 'Electronics', active: true },
        { id: 'CLOTH', name: 'Clothing', active: true },
        { id: 'HOME', name: 'Home & Garden', active: true },
        { id: 'SPORTS', name: 'Sports & Outdoors', active: true }
      ],

      subcategories: {
        'ELEC': [
          { id: 'PHONES', name: 'Phones & Tablets', category_id: 'ELEC' },
          { id: 'COMP', name: 'Computers', category_id: 'ELEC' },
          { id: 'TV', name: 'TVs & Home Theater', category_id: 'ELEC' },
          { id: 'AUDIO', name: 'Audio', category_id: 'ELEC' }
        ],
        'CLOTH': [
          { id: 'MENS', name: "Men's Clothing", category_id: 'CLOTH' },
          { id: 'WOMENS', name: "Women's Clothing", category_id: 'CLOTH' },
          { id: 'KIDS', name: "Kids' Clothing", category_id: 'CLOTH' },
          { id: 'SHOES', name: 'Shoes', category_id: 'CLOTH' }
        ],
        'HOME': [
          { id: 'FURN', name: 'Furniture', category_id: 'HOME' },
          { id: 'DECOR', name: 'Home Decor', category_id: 'HOME' },
          { id: 'GARDEN', name: 'Garden & Outdoor', category_id: 'HOME' },
          { id: 'KITCHEN', name: 'Kitchen', category_id: 'HOME' }
        ]
      },

      // Departments and teams
      departments: [
        { id: 'ENG', name: 'Engineering', active: true },
        { id: 'SALES', name: 'Sales', active: true },
        { id: 'MKT', name: 'Marketing', active: true },
        { id: 'HR', name: 'Human Resources', active: true },
        { id: 'FIN', name: 'Finance', active: true }
      ],

      teams: {
        'ENG': [
          { id: 'FE', name: 'Frontend', department_id: 'ENG' },
          { id: 'BE', name: 'Backend', department_id: 'ENG' },
          { id: 'DEVOPS', name: 'DevOps', department_id: 'ENG' },
          { id: 'QA', name: 'QA', department_id: 'ENG' }
        ],
        'SALES': [
          { id: 'INSIDE', name: 'Inside Sales', department_id: 'SALES' },
          { id: 'FIELD', name: 'Field Sales', department_id: 'SALES' },
          { id: 'ENT', name: 'Enterprise', department_id: 'SALES' }
        ],
        'MKT': [
          { id: 'CONTENT', name: 'Content', department_id: 'MKT' },
          { id: 'DEMAND', name: 'Demand Gen', department_id: 'MKT' },
          { id: 'BRAND', name: 'Brand', department_id: 'MKT' }
        ]
      }
    };

    // Create default lookup definitions
    this.createDefaultLookups();
  }

  /**
   * Create default lookup definitions
   */
  createDefaultLookups() {
    // Geographic lookup
    this.semantic.createLookup('default', {
      id: 'geographic',
      name: 'Geographic Hierarchy',
      description: 'Country, State, and City selection',
      type: 'cascading',
      levels: [
        {
          name: 'Country',
          source: { model: 'countries' },
          cache: { tier: 'static', ttl: 86400 }
        },
        {
          name: 'State',
          source: { model: 'states', parentField: 'country_id' },
          dependsOn: 'Country',
          cache: { tier: 'static', ttl: 86400 }
        },
        {
          name: 'City',
          source: { model: 'cities', parentField: 'state_id' },
          dependsOn: 'State',
          cache: { tier: 'semi-static', ttl: 3600 }
        }
      ]
    });

    // Category lookup
    this.semantic.createLookup('default', {
      id: 'category',
      name: 'Category Hierarchy',
      description: 'Category and Subcategory selection',
      type: 'cascading',
      levels: [
        {
          name: 'Category',
          source: { model: 'categories' },
          cache: { tier: 'semi-static', ttl: 3600 }
        },
        {
          name: 'Subcategory',
          source: { model: 'subcategories', parentField: 'category_id' },
          dependsOn: 'Category',
          cache: { tier: 'semi-static', ttl: 3600 }
        }
      ]
    });

    // Organizational lookup
    this.semantic.createLookup('default', {
      id: 'organizational',
      name: 'Organizational Hierarchy',
      description: 'Department and Team selection',
      type: 'cascading',
      levels: [
        {
          name: 'Department',
          source: { model: 'departments' },
          cache: { tier: 'semi-static', ttl: 3600 }
        },
        {
          name: 'Team',
          source: { model: 'teams', parentField: 'department_id' },
          dependsOn: 'Department',
          cache: { tier: 'semi-static', ttl: 3600 }
        }
      ]
    });
  }

  /**
   * Get lookup options for a specific level
   * @param {string} orgId - Organization ID
   * @param {string} lookupId - Lookup definition ID
   * @param {string} level - Level name (e.g., 'Country', 'State')
   * @param {Object} parentValues - Parent level values
   * @returns {Promise<Object>} Lookup options
   */
  async getLookupOptions(orgId, lookupId, level, parentValues = {}) {
    // Get lookup definition
    const lookup = this.semantic.getLookup(orgId, lookupId) ||
                   this.semantic.getLookup('default', lookupId);

    if (!lookup) {
      throw new Error(`Lookup not found: ${lookupId}`);
    }

    // Find the level configuration
    const levelConfig = lookup.levels.find(l => l.name === level);
    if (!levelConfig) {
      throw new Error(`Level not found: ${level}`);
    }

    // Check if parent value is required
    if (levelConfig.dependsOn) {
      const parentLevel = lookup.levels.find(l => l.name === levelConfig.dependsOn);
      const parentValue = parentValues[levelConfig.dependsOn];

      if (!parentValue) {
        return {
          lookupId,
          level,
          options: [],
          meta: {
            message: `Please select a ${levelConfig.dependsOn} first`,
            requiresParent: levelConfig.dependsOn
          }
        };
      }
    }

    // Check cache
    const cacheKey = this.getCacheKey(orgId, lookupId, level, parentValues);
    const cached = this.getFromCache(cacheKey, levelConfig.cache);
    if (cached) {
      return cached;
    }

    // Get options from data source
    const options = await this.fetchLookupData(levelConfig, parentValues);

    // Build response
    const response = {
      lookupId,
      level,
      parentValue: parentValues[levelConfig.dependsOn] || null,
      options: options.map(opt => ({
        value: opt.id,
        label: opt.name,
        extra: this.getExtraFields(opt, levelConfig)
      })),
      meta: {
        totalCount: options.length,
        cached: false,
        recommendedUI: this.getRecommendedUI(options.length)
      }
    };

    // Cache the result
    this.setCache(cacheKey, response, levelConfig.cache);

    return response;
  }

  /**
   * Fetch lookup data from source
   */
  async fetchLookupData(levelConfig, parentValues) {
    const model = levelConfig.source.model;
    const parentField = levelConfig.source.parentField;
    const parentValue = levelConfig.dependsOn ? parentValues[levelConfig.dependsOn] : null;

    // Use sample data for demonstration
    // In production, this would query the actual database
    let data = [];

    switch (model) {
      case 'countries':
        data = this.sampleData.countries.filter(c => c.active);
        break;

      case 'states':
        if (parentValue && this.sampleData.states[parentValue]) {
          data = this.sampleData.states[parentValue];
        }
        break;

      case 'cities':
        if (parentValue && this.sampleData.cities[parentValue]) {
          data = this.sampleData.cities[parentValue];
        }
        break;

      case 'categories':
        data = this.sampleData.categories.filter(c => c.active);
        break;

      case 'subcategories':
        if (parentValue && this.sampleData.subcategories[parentValue]) {
          data = this.sampleData.subcategories[parentValue];
        }
        break;

      case 'departments':
        data = this.sampleData.departments.filter(d => d.active);
        break;

      case 'teams':
        if (parentValue && this.sampleData.teams[parentValue]) {
          data = this.sampleData.teams[parentValue];
        }
        break;

      default:
        data = [];
    }

    // Sort by name
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Search lookup options
   * @param {string} orgId - Organization ID
   * @param {string} lookupId - Lookup definition ID
   * @param {string} level - Level name
   * @param {string} searchTerm - Search term
   * @param {Object} parentValues - Parent level values
   * @returns {Promise<Object>} Search results
   */
  async searchLookup(orgId, lookupId, level, searchTerm, parentValues = {}) {
    // Get all options first
    const allOptions = await this.getLookupOptions(orgId, lookupId, level, parentValues);

    // Filter by search term
    const term = searchTerm.toLowerCase();
    const filtered = allOptions.options.filter(opt =>
      opt.label.toLowerCase().includes(term)
    );

    return {
      lookupId,
      level,
      searchTerm,
      options: filtered.slice(0, 20), // Limit to 20 results
      meta: {
        totalMatches: filtered.length,
        returned: Math.min(filtered.length, 20),
        hasMore: filtered.length > 20
      }
    };
  }

  /**
   * Get all levels for a lookup (for wizard UI)
   */
  async getLookupLevels(orgId, lookupId) {
    const lookup = this.semantic.getLookup(orgId, lookupId) ||
                   this.semantic.getLookup('default', lookupId);

    if (!lookup) {
      throw new Error(`Lookup not found: ${lookupId}`);
    }

    return {
      lookupId,
      name: lookup.name,
      description: lookup.description,
      type: lookup.type,
      levels: lookup.levels.map(level => ({
        name: level.name,
        dependsOn: level.dependsOn || null,
        cache: level.cache
      })),
      ui: lookup.ui
    };
  }

  /**
   * Get cascade values - useful for pre-populating form with existing data
   */
  async getCascadeValues(orgId, lookupId, leafValue) {
    const lookup = this.semantic.getLookup(orgId, lookupId) ||
                   this.semantic.getLookup('default', lookupId);

    if (!lookup) {
      throw new Error(`Lookup not found: ${lookupId}`);
    }

    // This would trace back from leaf to root
    // For now, return empty - in production, would query relationships
    const values = {};

    return {
      lookupId,
      leafValue,
      values
    };
  }

  /**
   * Get available lookups for an organization
   */
  async getAvailableLookups(orgId) {
    const orgLookups = this.semantic.getLookups(orgId);
    const defaultLookups = this.semantic.getLookups('default');

    const all = [...defaultLookups, ...orgLookups];

    return all.map(lookup => ({
      id: lookup.id,
      name: lookup.name,
      description: lookup.description,
      type: lookup.type,
      levelCount: lookup.levels.length,
      levels: lookup.levels.map(l => l.name)
    }));
  }

  /**
   * Create a custom lookup
   */
  async createLookup(orgId, config) {
    return this.semantic.createLookup(orgId, config);
  }

  /**
   * Get lookup templates for wizard
   */
  getLookupTemplates() {
    return [
      {
        id: 'geographic',
        name: 'Location',
        description: 'Country, State, and City selection',
        icon: 'map-pin',
        levels: ['Country', 'State', 'City']
      },
      {
        id: 'category',
        name: 'Category',
        description: 'Category and Subcategory selection',
        icon: 'folder',
        levels: ['Category', 'Subcategory']
      },
      {
        id: 'organizational',
        name: 'Organization',
        description: 'Department and Team selection',
        icon: 'building',
        levels: ['Department', 'Team']
      },
      {
        id: 'custom',
        name: 'Custom',
        description: 'Build your own connected dropdown',
        icon: 'plus',
        levels: []
      }
    ];
  }

  // ==================== CACHING ====================

  /**
   * Generate cache key
   */
  getCacheKey(orgId, lookupId, level, parentValues) {
    const parentKey = Object.entries(parentValues)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');

    return `lookup:${orgId}:${lookupId}:${level}:${parentKey}`;
  }

  /**
   * Get from cache if valid
   */
  getFromCache(key, cacheConfig) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const tier = cacheConfig?.tier || 'dynamic';
    const ttl = this.cacheTiers[tier];

    if (ttl === 0) return null; // Real-time, no cache

    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return { ...cached.data, meta: { ...cached.data.meta, cached: true } };
  }

  /**
   * Set cache
   */
  setCache(key, data, cacheConfig) {
    const tier = cacheConfig?.tier || 'dynamic';
    if (this.cacheTiers[tier] === 0) return; // Don't cache real-time

    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Clear cache for a lookup
   */
  clearCache(orgId, lookupId) {
    const prefix = `lookup:${orgId}:${lookupId}`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  // ==================== HELPERS ====================

  /**
   * Get recommended UI component based on option count
   */
  getRecommendedUI(count) {
    if (count < 5) return 'radio';
    if (count < 20) return 'dropdown';
    if (count < 200) return 'searchable-dropdown';
    return 'autocomplete';
  }

  /**
   * Get extra fields to include in response
   */
  getExtraFields(item, levelConfig) {
    const extra = {};
    const extraFields = levelConfig.source?.extraFields || [];

    for (const field of extraFields) {
      if (item[field] !== undefined) {
        extra[field] = item[field];
      }
    }

    return Object.keys(extra).length > 0 ? extra : undefined;
  }
}

module.exports = LookupService;
