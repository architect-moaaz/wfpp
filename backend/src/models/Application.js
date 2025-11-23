/**
 * Application Model
 *
 * Represents a complete generated application with all its resources
 */

class Application {
  constructor(data = {}) {
    this.id = data.id || `app_${Date.now()}`;
    this.name = data.name || 'New Application';
    this.description = data.description || '';
    this.version = data.version || '1.0.0';
    this.status = data.status || 'draft'; // draft, development, production
    this.icon = data.icon || 'app';
    this.theme = data.theme || {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      mode: 'light'
    };

    // Application metadata
    this.metadata = {
      domain: data.domain || 'general',
      industry: data.industry || '',
      complexity: data.complexity || 'medium',
      createdBy: data.createdBy || 'user',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      deployedAt: data.deployedAt || null,
      ...data.metadata
    };

    // Application resources
    this.resources = {
      workflows: data.workflows || [],
      dataModels: data.dataModels || [],
      forms: data.forms || [],
      pages: data.pages || [],
      mobileScreens: data.mobileScreens || [],
      rules: data.rules || [],
      apis: data.apis || [],
      ...data.resources
    };

    // Runtime configuration
    this.runtime = {
      engine: 'agentic-v1',
      database: data.runtime?.database || 'sqlite',
      authentication: data.runtime?.authentication || 'local',
      port: data.runtime?.port || 3000,
      env: data.runtime?.env || 'development',
      ...data.runtime
    };

    // Deployment configuration
    this.deployment = {
      type: data.deployment?.type || 'standalone', // standalone, docker, cloud
      path: data.deployment?.path || null,
      url: data.deployment?.url || null,
      ...data.deployment
    };

    // Statistics
    this.stats = {
      workflowCount: data.resources?.workflows?.length || 0,
      modelCount: data.resources?.dataModels?.length || 0,
      formCount: data.resources?.forms?.length || 0,
      pageCount: data.resources?.pages?.length || 0,
      ruleCount: data.resources?.rules?.length || 0,
      ...data.stats
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      status: this.status,
      icon: this.icon,
      theme: this.theme,
      metadata: this.metadata,
      resources: this.resources,
      runtime: this.runtime,
      deployment: this.deployment,
      stats: this.stats
    };
  }

  static fromJSON(data) {
    return new Application(data);
  }

  // Helper methods
  addWorkflow(workflow) {
    this.resources.workflows.push(workflow);
    this.stats.workflowCount = this.resources.workflows.length;
    this.metadata.updatedAt = new Date().toISOString();
  }

  addDataModel(model) {
    this.resources.dataModels.push(model);
    this.stats.modelCount = this.resources.dataModels.length;
    this.metadata.updatedAt = new Date().toISOString();
  }

  addForm(form) {
    this.resources.forms.push(form);
    this.stats.formCount = this.resources.forms.length;
    this.metadata.updatedAt = new Date().toISOString();
  }

  addPage(page) {
    this.resources.pages.push(page);
    this.stats.pageCount = this.resources.pages.length;
    this.metadata.updatedAt = new Date().toISOString();
  }

  updateStatus(status) {
    this.status = status;
    this.metadata.updatedAt = new Date().toISOString();
    if (status === 'production') {
      this.metadata.deployedAt = new Date().toISOString();
    }
  }
}

module.exports = Application;
