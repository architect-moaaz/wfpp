/**
 * Page Data Service
 * Pre-fetches page data for server-side rendering
 */

const fs = require('fs');
const path = require('path');
const database = require('../database');

class PageDataService {
  constructor() {
    this.pagesPath = path.join(__dirname, '../resources/pages.json');
    this.formsPath = path.join(__dirname, '../resources/forms.json');
    this.dataModelsPath = path.join(__dirname, '../resources/dataModels.json');
    this.themePath = path.join(__dirname, '../../frontend/src/theme.json');
  }

  /**
   * Load all pages
   */
  getPages() {
    try {
      const data = fs.readFileSync(this.pagesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading pages:', error);
      return [];
    }
  }

  /**
   * Load all forms
   */
  getForms() {
    try {
      const data = fs.readFileSync(this.formsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading forms:', error);
      return [];
    }
  }

  /**
   * Load theme configuration
   */
  getTheme() {
    try {
      const data = fs.readFileSync(this.themePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading theme:', error);
      return null;
    }
  }

  /**
   * Find page by route
   */
  getPageByRoute(route) {
    const pages = this.getPages();
    // Normalize route - default to first page if '/'
    if (route === '/') {
      return pages[0] || null;
    }
    return pages.find(p => p.route === route);
  }

  /**
   * Extract template variables from page sections
   */
  extractTemplateVariables(sections) {
    const variables = new Set();

    const traverse = (obj) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        const matches = obj.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach(match => {
            const varName = match.replace(/\{\{|\}\}/g, '').trim();
            variables.add(varName);
          });
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (typeof obj === 'object') {
        if (obj.dataBinding) {
          variables.add(obj.dataBinding);
        }
        Object.values(obj).forEach(traverse);
      }
    };

    traverse(sections);
    return Array.from(variables);
  }

  /**
   * Fetch data from database for a model
   */
  async fetchModelData(modelName) {
    try {
      const singularName = modelName.replace(/s$/, '');
      const result = await database.query(`SELECT * FROM ${singularName} ORDER BY created_at DESC LIMIT 100`);
      return result.rows || [];
    } catch (error) {
      try {
        const result = await database.query(`SELECT * FROM ${modelName} ORDER BY created_at DESC LIMIT 100`);
        return result.rows || [];
      } catch (e) {
        console.error(`Error fetching ${modelName}:`, e.message);
        return [];
      }
    }
  }

  /**
   * Fetch initial data for a page based on its template variables
   */
  async fetchPageData(page) {
    const variables = this.extractTemplateVariables(page.sections || []);
    const data = {};

    // Determine which models to fetch based on page data bindings
    for (const variable of variables) {
      // Skip computed variables
      if (variable.includes('total') || variable.includes('Rate') || variable.includes('count')) {
        continue;
      }

      try {
        const modelData = await this.fetchModelData(variable);
        data[variable] = modelData;

        // Also set singular form
        const singular = variable.replace(/s$/, '');
        if (singular !== variable) {
          data[singular] = modelData;
        }

        // Compute derived stats
        if (modelData.length > 0) {
          data[`total${variable.charAt(0).toUpperCase() + variable.slice(1)}`] = modelData.length;
        }
      } catch (error) {
        console.error(`Error fetching data for ${variable}:`, error);
      }
    }

    return data;
  }

  /**
   * Build navigation from pages
   */
  buildNavigation(pages) {
    const menuMap = new Map();
    const routeToPage = new Map(pages.map(p => [p.route, p]));

    pages.forEach(page => {
      if (page.navigation?.menu) {
        page.navigation.menu.forEach(item => {
          if (!menuMap.has(item.route)) {
            menuMap.set(item.route, {
              label: item.label,
              route: item.route,
              icon: item.icon || 'default',
              pageExists: routeToPage.has(item.route)
            });
          }
        });
      }
    });

    if (menuMap.size > 0) {
      return Array.from(menuMap.values());
    }

    // Fallback: generate navigation from pages
    return pages.filter(p => !p.route.includes(':')).map(p => ({
      label: p.title || p.name,
      route: p.route,
      icon: 'default',
      pageExists: true
    }));
  }

  /**
   * Get complete initial state for SSR
   */
  async getInitialState(route, db) {
    const pages = this.getPages();
    const forms = this.getForms();
    const theme = this.getTheme();
    const page = this.getPageByRoute(route);
    const navigation = this.buildNavigation(pages);

    let pageData = {};

    if (page && db) {
      try {
        pageData = await this.fetchPageData(page);
      } catch (error) {
        console.error('Error fetching page data:', error);
      }
    }

    return {
      pages,
      forms,
      theme,
      navigation,
      currentPage: page,
      pageData,
      route
    };
  }
}

module.exports = new PageDataService();
