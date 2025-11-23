/**
 * ApplicationService
 *
 * Manages application lifecycle: create, read, update, delete, deploy
 * Now using PostgreSQL k1 schema instead of file-based storage
 */

const ApplicationDatabase = require('../database/ApplicationDatabase');

class ApplicationService {
  constructor() {
    this.db = new ApplicationDatabase();
  }

  async init() {
    try {
      await this.db.initialize();
      console.log('[ApplicationService] Initialized with PostgreSQL database');
    } catch (error) {
      console.error('[ApplicationService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create a new application
   */
  async createApplication(data) {
    try {
      const app = await this.db.create({
        name: data.name,
        description: data.description,
        domain: data.domain,
        industry: data.industry,
        resources: data.resources || {},
        theme: data.theme,
        type: data.type,
        version: data.version,
        status: data.status,
        icon: data.icon,
        metadata: data.metadata
      });

      console.log(`[ApplicationService] Created application: ${app.name} (${app.id})`);
      return app;
    } catch (error) {
      console.error('[ApplicationService] Failed to create application:', error);
      throw error;
    }
  }

  /**
   * Get all applications
   */
  async getApplications() {
    return await this.db.getAll();
  }

  /**
   * Get a single application by ID
   */
  async getApplication(id) {
    const app = await this.db.findById(id);
    if (!app) {
      throw new Error(`Application not found: ${id}`);
    }
    return app;
  }

  /**
   * Update an application
   */
  async updateApplication(id, updates) {
    try {
      const app = await this.db.update(id, updates);
      console.log(`[ApplicationService] Updated application: ${app.name} (${app.id})`);
      return app;
    } catch (error) {
      console.error('[ApplicationService] Failed to update application:', error);
      throw error;
    }
  }

  /**
   * Delete an application
   */
  async deleteApplication(id) {
    try {
      await this.db.delete(id);
      console.log(`[ApplicationService] Deleted application: ${id}`);
      return { success: true, message: 'Application deleted' };
    } catch (error) {
      console.error('[ApplicationService] Failed to delete application:', error);
      throw error;
    }
  }

  /**
   * Add a workflow to an application
   */
  async addWorkflow(appId, workflow) {
    const app = await this.db.addResource(appId, 'workflows', workflow);
    return app;
  }

  /**
   * Add a data model to an application
   */
  async addDataModel(appId, model) {
    const app = await this.db.addResource(appId, 'dataModels', model);
    return app;
  }

  /**
   * Add a form to an application
   */
  async addForm(appId, form) {
    const app = await this.db.addResource(appId, 'forms', form);
    return app;
  }

  /**
   * Add a page to an application
   */
  async addPage(appId, page) {
    const app = await this.db.addResource(appId, 'pages', page);
    return app;
  }

  /**
   * Add mobile UI to an application
   */
  async addMobileUI(appId, mobileUI) {
    const app = await this.db.addResource(appId, 'mobileUI', mobileUI);
    return app;
  }

  /**
   * Update application status
   */
  async updateStatus(appId, status) {
    const app = await this.db.update(appId, { status });
    return app;
  }

  /**
   * Create application from MOE generation results
   */
  async createFromMOE(userRequirements, moeResult) {
    try {
      // Extract name from user requirements or use default
      const name = this.extractAppName(userRequirements) || 'Generated Application';

      const app = await this.db.create({
        name,
        description: userRequirements,
        domain: moeResult.metadata?.domain || 'general',
        industry: moeResult.metadata?.industry || '',
        resources: {
          workflows: moeResult.workflows || [],
          dataModels: moeResult.dataModels || [],
          forms: moeResult.forms || [],
          pages: moeResult.pages || [],
          mobileUI: moeResult.mobileUI || null,
          rules: moeResult.rules || [],
          apis: moeResult.apis || []
        }
      });

      console.log(`[ApplicationService] Created application from MOE: ${app.name}`);
      return app;
    } catch (error) {
      console.error('[ApplicationService] Failed to create from MOE:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract application name from user requirements
   */
  extractAppName(requirements) {
    // Simple heuristic: look for "system", "platform", "app", etc.
    const match = requirements.match(/(\w+(?:\s+\w+){0,2})\s+(system|platform|application|app|manager|tool)/i);
    if (match) {
      return match[0].charAt(0).toUpperCase() + match[0].slice(1);
    }
    return null;
  }
}

// Singleton instance
const applicationService = new ApplicationService();

module.exports = applicationService;
