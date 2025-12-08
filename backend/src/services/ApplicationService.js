/**
 * ApplicationService
 *
 * Manages application lifecycle: create, read, update, delete, deploy
 * Now using PostgreSQL k1 schema instead of file-based storage
 */

const ApplicationDatabase = require('../database/ApplicationDatabase');
const fs = require('fs').promises;
const path = require('path');

// Lazy-load AIResourceGenerator to avoid circular dependency
let aiResourceGenerator = null;
const getAIResourceGenerator = () => {
  if (!aiResourceGenerator) {
    aiResourceGenerator = require('./AIResourceGenerator');
  }
  return aiResourceGenerator;
};

class ApplicationService {
  constructor() {
    this.db = new ApplicationDatabase();
  }

  /**
   * Common field templates based on domain keywords
   */
  getFieldTemplates() {
    return {
      employee: [
        { type: 'text', label: 'First Name', name: 'firstName', required: true },
        { type: 'text', label: 'Last Name', name: 'lastName', required: true },
        { type: 'email', label: 'Email', name: 'email', required: true },
        { type: 'text', label: 'Department', name: 'department', required: false },
        { type: 'text', label: 'Position', name: 'position', required: false },
        { type: 'date', label: 'Start Date', name: 'startDate', required: false }
      ],
      leave: [
        { type: 'select', label: 'Leave Type', name: 'leaveType', required: true, options: ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Other'] },
        { type: 'date', label: 'Start Date', name: 'startDate', required: true },
        { type: 'date', label: 'End Date', name: 'endDate', required: true },
        { type: 'textarea', label: 'Reason', name: 'reason', required: true },
        { type: 'text', label: 'Contact Number', name: 'contactNumber', required: false }
      ],
      request: [
        { type: 'text', label: 'Request Title', name: 'title', required: true },
        { type: 'textarea', label: 'Description', name: 'description', required: true },
        { type: 'select', label: 'Priority', name: 'priority', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
        { type: 'date', label: 'Requested Date', name: 'requestedDate', required: false }
      ],
      approval: [
        { type: 'select', label: 'Decision', name: 'decision', required: true, options: ['Approve', 'Reject', 'Request More Info'] },
        { type: 'textarea', label: 'Comments', name: 'comments', required: false },
        { type: 'text', label: 'Approver Name', name: 'approverName', required: false }
      ],
      document: [
        { type: 'text', label: 'Document Title', name: 'documentTitle', required: true },
        { type: 'select', label: 'Document Type', name: 'documentType', required: true, options: ['Contract', 'Report', 'Certificate', 'ID', 'Other'] },
        { type: 'file', label: 'Upload Document', name: 'documentFile', required: true },
        { type: 'textarea', label: 'Notes', name: 'notes', required: false }
      ],
      training: [
        { type: 'text', label: 'Training Program', name: 'programName', required: true },
        { type: 'date', label: 'Training Date', name: 'trainingDate', required: true },
        { type: 'text', label: 'Trainer', name: 'trainer', required: false },
        { type: 'select', label: 'Status', name: 'status', required: true, options: ['Not Started', 'In Progress', 'Completed'] },
        { type: 'textarea', label: 'Notes', name: 'notes', required: false }
      ],
      equipment: [
        { type: 'text', label: 'Equipment Name', name: 'equipmentName', required: true },
        { type: 'select', label: 'Equipment Type', name: 'equipmentType', required: true, options: ['Laptop', 'Monitor', 'Phone', 'Accessories', 'Other'] },
        { type: 'textarea', label: 'Specifications', name: 'specifications', required: false },
        { type: 'text', label: 'Quantity', name: 'quantity', required: true }
      ],
      default: [
        { type: 'text', label: 'Title', name: 'title', required: true },
        { type: 'textarea', label: 'Description', name: 'description', required: false },
        { type: 'text', label: 'Reference', name: 'reference', required: false }
      ]
    };
  }

  /**
   * Detect form domain from formId and node context
   * @param {string} formId - The form ID
   * @param {string} nodeLabel - The node label
   * @returns {string} Detected domain key
   */
  detectFormDomain(formId, nodeLabel) {
    const searchText = `${formId} ${nodeLabel}`.toLowerCase();

    const domainKeywords = {
      employee: ['employee', 'staff', 'personnel', 'hire', 'onboard'],
      leave: ['leave', 'vacation', 'absence', 'time off', 'pto'],
      request: ['request', 'requisition', 'order'],
      approval: ['approval', 'approve', 'review', 'decision', 'authorize'],
      document: ['document', 'upload', 'file', 'attachment'],
      training: ['training', 'course', 'learning', 'certification'],
      equipment: ['equipment', 'it', 'hardware', 'device', 'laptop', 'computer']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => searchText.includes(keyword))) {
        return domain;
      }
    }

    return 'default';
  }

  /**
   * Generate fields with proper IDs and bindings
   * @param {array} templateFields - Template field definitions
   * @param {object} dataModel - Optional data model to bind to
   * @returns {array} Generated fields with IDs
   */
  generateFieldsFromTemplate(templateFields, dataModel = null) {
    const timestamp = Date.now();

    return templateFields.map((template, index) => {
      const field = {
        id: `field_${timestamp}_${index + 1}`,
        type: template.type,
        label: template.label,
        name: template.name,
        required: template.required || false,
        placeholder: `Enter ${template.label.toLowerCase()}`
      };

      // Add options for select fields
      if (template.options) {
        field.options = template.options.map(opt => ({
          label: opt,
          value: opt.toLowerCase().replace(/\s+/g, '_')
        }));
      }

      // Add data model binding if available
      if (dataModel) {
        const matchingField = dataModel.fields?.find(
          f => f.name?.toLowerCase() === template.name.toLowerCase()
        );
        if (matchingField) {
          field.binding = {
            dataModelId: dataModel.id,
            fieldName: matchingField.name
          };
        }
      }

      return field;
    });
  }

  /**
   * Generate a stub form for an orphan formId
   * @param {string} formId - The orphan form ID
   * @param {object} workflow - The workflow containing the form reference
   * @param {array} dataModels - Available data models for binding
   * @returns {object} Stub form object
   */
  generateStubForm(formId, workflow, dataModels = []) {
    // Find the node that references this form to get context
    const referencingNode = workflow.nodes?.find(n => n.data?.formId === formId);
    const nodeLabel = referencingNode?.data?.label || 'Form';
    const nodeDataModelId = referencingNode?.data?.dataModelId;

    // Detect form domain from context
    const domain = this.detectFormDomain(formId, nodeLabel);
    const fieldTemplates = this.getFieldTemplates();
    const templateFields = fieldTemplates[domain] || fieldTemplates.default;

    // Find matching data model for bindings
    let bindingDataModel = null;
    if (nodeDataModelId) {
      bindingDataModel = dataModels.find(dm => dm.id === nodeDataModelId);
    }
    if (!bindingDataModel && workflow.dataModels) {
      bindingDataModel = workflow.dataModels.find(dm =>
        dm.name?.toLowerCase().includes(domain) ||
        domain !== 'default' && dm.id?.toLowerCase().includes(domain)
      );
    }

    // Generate fields with bindings
    const fields = this.generateFieldsFromTemplate(templateFields, bindingDataModel);

    return {
      id: formId,
      name: nodeLabel.replace(/\s+/g, ' ').trim(),
      title: nodeLabel,
      description: `Auto-generated ${domain !== 'default' ? domain + ' ' : ''}form for ${nodeLabel}`,
      workflowId: workflow.id,
      type: domain === 'approval' ? 'simple' : (fields.length > 5 ? 'wizard' : 'simple'),
      dataModelId: bindingDataModel?.id || null,
      fields: fields,
      createdAt: new Date().toISOString(),
      autoGenerated: true,
      detectedDomain: domain
    };
  }

  /**
   * Find orphan formIds in a workflow that don't exist in the application's forms
   * @param {object} workflow - The workflow to check
   * @param {array} existingForms - Array of existing forms
   * @returns {Set} Set of orphan formIds
   */
  findOrphanFormIds(workflow, existingForms) {
    const existingFormIds = new Set((existingForms || []).map(f => f.id));
    const orphanFormIds = new Set();

    (workflow.nodes || []).forEach(node => {
      if (node.data && node.data.formId && !existingFormIds.has(node.data.formId)) {
        orphanFormIds.add(node.data.formId);
      }
    });

    return orphanFormIds;
  }

  /**
   * Get application folder path from application name
   */
  getAppFolderPath(appName) {
    const sanitizedName = (appName || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return path.join(__dirname, '../../generated-apps', sanitizedName);
  }

  /**
   * Save resource to application folder
   */
  async saveResourceToFolder(appName, resourceType, resources) {
    try {
      const appPath = this.getAppFolderPath(appName);
      const resourcesPath = path.join(appPath, 'src/resources');

      // Ensure resources directory exists
      await fs.mkdir(resourcesPath, { recursive: true });

      // Map resourceType to file name
      const fileMap = {
        workflows: 'workflows.json',
        dataModels: 'dataModels.json',
        forms: 'forms.json',
        pages: 'pages.json',
        rules: 'rules.json'
      };

      const fileName = fileMap[resourceType];
      if (!fileName) {
        console.warn(`[ApplicationService] Unknown resource type: ${resourceType}`);
        return;
      }

      const filePath = path.join(resourcesPath, fileName);
      await fs.writeFile(filePath, JSON.stringify(resources, null, 2), 'utf8');

      console.log(`[ApplicationService] Saved ${resourceType} to ${filePath}`);
    } catch (error) {
      console.error(`[ApplicationService] Failed to save ${resourceType} to folder:`, error);
      throw error;
    }
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
   * Delete an application and its generated folder
   */
  async deleteApplication(id) {
    try {
      // Get application details before deleting
      const app = await this.db.findById(id);

      // Delete from database
      await this.db.delete(id);
      console.log(`[ApplicationService] Deleted application from database: ${id}`);

      // Delete generated folder if it exists
      if (app && app.name) {
        try {
          const appFolderPath = this.getAppFolderPath(app.name);
          const folderExists = await fs.access(appFolderPath).then(() => true).catch(() => false);

          if (folderExists) {
            await fs.rm(appFolderPath, { recursive: true, force: true });
            console.log(`[ApplicationService] Deleted generated folder: ${appFolderPath}`);
          }
        } catch (folderError) {
          console.error('[ApplicationService] Failed to delete generated folder:', folderError);
          // Don't fail the whole operation if folder deletion fails
        }
      }

      return { success: true, message: 'Application and generated files deleted' };
    } catch (error) {
      console.error('[ApplicationService] Failed to delete application:', error);
      throw error;
    }
  }

  /**
   * Add a workflow to an application
   */
  async addWorkflow(appId, workflow) {
    // First get the app to check existing forms
    let app = await this.db.getById(appId);
    const existingForms = app?.resources?.forms || [];
    const existingFormIds = new Set((existingForms || []).map(f => f.id));

    // Auto-assign formId to startProcess and userTask nodes that don't have one
    // This ensures forms are always generated for these node types
    const workflowId = workflow.id || `workflow_${Date.now()}`;
    let formsNeedGeneration = false;

    (workflow.nodes || []).forEach(node => {
      if ((node.type === 'startProcess' || node.type === 'userTask') && node.data) {
        // Only assign if no formId exists
        if (!node.data.formId) {
          const generatedFormId = `form_${workflowId}_${node.id}`;
          node.data.formId = generatedFormId;
          formsNeedGeneration = true;
          console.log(`[ApplicationService] Auto-assigned formId ${generatedFormId} to ${node.type} node: ${node.id}`);
        }
      }
    });

    // Check for orphan formIds and auto-generate forms using AI
    const orphanFormIds = this.findOrphanFormIds(workflow, existingForms);
    if (orphanFormIds.size > 0) {
      console.log(`[ApplicationService] Found ${orphanFormIds.size} orphan formIds in workflow ${workflow.id}, generating AI forms...`);

      const dataModels = app?.resources?.dataModels || [];

      // Prepare orphan form data with node context
      const orphanFormData = [];
      orphanFormIds.forEach(formId => {
        const node = workflow.nodes?.find(n => n.data?.formId === formId);
        orphanFormData.push({ formId, node });
      });

      try {
        // Use AI Resource Generator to generate forms
        const resourceGenerator = getAIResourceGenerator();
        const generatedForms = await resourceGenerator.generateForms(orphanFormData, {
          workflows: [workflow],
          dataModels
        });

        for (const form of generatedForms) {
          app = await this.db.addResource(appId, 'forms', form);
          console.log(`[ApplicationService] Created AI form: ${form.id} (${form.aiGenerated ? 'AI' : 'fallback'})`);
        }
      } catch (aiError) {
        console.error('[ApplicationService] AI form generation failed, using fallback:', aiError);
        // Fallback to template-based generation
        for (const formId of orphanFormIds) {
          const stubForm = this.generateStubForm(formId, workflow, dataModels);
          app = await this.db.addResource(appId, 'forms', stubForm);
          console.log(`[ApplicationService] Created fallback form: ${formId}`);
        }
      }

      // Save forms to file system
      try {
        await this.saveResourceToFolder(app.name, 'forms', app.resources.forms || []);
        console.log(`[ApplicationService] Forms saved to ${app.name} folder`);
      } catch (error) {
        console.error('[ApplicationService] Failed to save forms to folder:', error);
      }
    }

    // Now add the workflow
    app = await this.db.addResource(appId, 'workflows', workflow);

    // Save to file system
    try {
      await this.saveResourceToFolder(app.name, 'workflows', app.resources.workflows || []);
      console.log(`[ApplicationService] Workflow saved to ${app.name} folder`);
    } catch (error) {
      console.error('[ApplicationService] Failed to save workflow to folder:', error);
    }

    return app;
  }

  /**
   * Add a data model to an application
   */
  async addDataModel(appId, model) {
    const app = await this.db.addResource(appId, 'dataModels', model);

    // Save to file system
    try {
      await this.saveResourceToFolder(app.name, 'dataModels', app.resources.dataModels || []);
      console.log(`[ApplicationService] Data model saved to ${app.name} folder`);
    } catch (error) {
      console.error('[ApplicationService] Failed to save data model to folder:', error);
    }

    return app;
  }

  /**
   * Add a form to an application
   */
  async addForm(appId, form) {
    const app = await this.db.addResource(appId, 'forms', form);

    // Save to file system
    try {
      await this.saveResourceToFolder(app.name, 'forms', app.resources.forms || []);
      console.log(`[ApplicationService] Form saved to ${app.name} folder`);
    } catch (error) {
      console.error('[ApplicationService] Failed to save form to folder:', error);
    }

    return app;
  }

  /**
   * Add a page to an application
   */
  async addPage(appId, page) {
    const app = await this.db.addResource(appId, 'pages', page);

    // Save to file system
    try {
      await this.saveResourceToFolder(app.name, 'pages', app.resources.pages || []);
      console.log(`[ApplicationService] Page saved to ${app.name} folder`);
    } catch (error) {
      console.error('[ApplicationService] Failed to save page to folder:', error);
    }

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
   * Add a rule to an application
   */
  async addRule(appId, rule) {
    const app = await this.db.addResource(appId, 'rules', rule);

    // Save to file system
    try {
      await this.saveResourceToFolder(app.name, 'rules', app.resources.rules || []);
      console.log(`[ApplicationService] Rule saved to ${app.name} folder`);
    } catch (error) {
      console.error('[ApplicationService] Failed to save rule to folder:', error);
    }

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
