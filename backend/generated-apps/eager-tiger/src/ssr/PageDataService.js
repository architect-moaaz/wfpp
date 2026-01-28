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
    // Normalize route
    const normalizedRoute = route === '/' ? '/tasks' : route;
    return pages.find(p => p.route === normalizedRoute);
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
      // Try singular form (data model convention)
      const singularName = modelName.replace(/s$/, '');
      const result = await database.query(`SELECT * FROM ${singularName} ORDER BY created_at DESC LIMIT 100`);
      return result.rows || [];
    } catch (error) {
      // Try original name
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

    // Determine which models to fetch
    const needsTasks = variables.some(v =>
      v.includes('task') || v.includes('Task') ||
      v === 'totalTasks' || v === 'inProgressTasks' ||
      v === 'completedTasks' || v === 'completionRate'
    );

    // Fetch tasks if needed
    if (needsTasks) {
      const tasks = await this.fetchModelData('task');
      data.tasks = tasks;
      data.task = tasks;

      // Compute derived stats
      data.totalTasks = tasks.length;
      data.inProgressTasks = tasks.filter(t =>
        t.status === 'In Progress' || t.status === 'in_progress' || t.status === 'in-progress'
      ).length;
      data.completedTasks = tasks.filter(t =>
        t.status === 'Completed' || t.status === 'completed'
      ).length;
      data.pendingTasks = tasks.filter(t =>
        t.status === 'Pending' || t.status === 'pending'
      ).length;
      data.completionRate = tasks.length > 0
        ? Math.round((data.completedTasks / tasks.length) * 100)
        : 0;
    }

    return data;
  }

  /**
   * Interpolate template variables in a string
   */
  interpolate(text, data) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          return match; // Keep placeholder if not found
        }
      }
      return value !== undefined && value !== null ? String(value) : match;
    });
  }

  /**
   * Interpolate all template variables in page sections
   */
  interpolatePage(page, data) {
    if (!page) return page;

    const interpolateObj = (obj) => {
      if (!obj) return obj;
      if (typeof obj === 'string') {
        return this.interpolate(obj, data);
      }
      if (Array.isArray(obj)) {
        return obj.map(item => interpolateObj(item));
      }
      if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = interpolateObj(value);
        }
        return result;
      }
      return obj;
    };

    return {
      ...page,
      sections: interpolateObj(page.sections)
    };
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
      return Array.from(menuMap.values()).sort((a, b) => {
        if (a.route === '/dashboard' || a.route === '/') return -1;
        if (b.route === '/dashboard' || b.route === '/') return 1;
        if (a.route.includes('create') || a.route.includes('new')) return 1;
        if (b.route.includes('create') || b.route.includes('new')) return -1;
        return a.label.localeCompare(b.label);
      });
    }

    // Fallback
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
  async getInitialState(route) {
    const pages = this.getPages();
    const forms = this.getForms();
    const theme = this.getTheme();
    const page = this.getPageByRoute(route);
    const navigation = this.buildNavigation(pages);

    let pageData = {};
    let interpolatedPage = page;

    if (page) {
      // Fetch data from database
      pageData = await this.fetchPageData(page);
      // Interpolate template variables in page
      interpolatedPage = this.interpolatePage(page, pageData);
    }

    return {
      pages,
      forms,
      theme,
      navigation,
      currentPage: interpolatedPage,
      pageData,
      route
    };
  }
}

module.exports = new PageDataService();
