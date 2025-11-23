/**
 * Form Database
 * Manages form definitions for workflow tasks
 */

const fs = require('fs').promises;
const path = require('path');

class FormDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.formsFile = path.join(this.dataDir, 'forms.json');
    this.initialized = false;
  }

  /**
   * Initialize database (create data directory and files)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      // Create forms file if it doesn't exist
      try {
        await fs.access(this.formsFile);
      } catch {
        await fs.writeFile(this.formsFile, JSON.stringify([], null, 2));
      }

      this.initialized = true;
      console.log('[FormDatabase] Initialized successfully');
    } catch (error) {
      console.error('[FormDatabase] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Save a form definition
   */
  async saveForm(form) {
    await this.initialize();

    const forms = await this.loadForms();
    const existingIndex = forms.findIndex(f => f.id === form.id);

    if (existingIndex >= 0) {
      forms[existingIndex] = {
        ...form,
        updatedAt: new Date().toISOString()
      };
    } else {
      forms.push({
        ...form,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    await fs.writeFile(this.formsFile, JSON.stringify(forms, null, 2));
    console.log(`[FormDatabase] Form saved: ${form.id}`);

    return forms[existingIndex >= 0 ? existingIndex : forms.length - 1];
  }

  /**
   * Save multiple forms
   */
  async saveForms(formsArray) {
    await this.initialize();

    const existingForms = await this.loadForms();
    const formMap = new Map(existingForms.map(f => [f.id, f]));

    formsArray.forEach(form => {
      formMap.set(form.id, {
        ...form,
        createdAt: formMap.get(form.id)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    const updatedForms = Array.from(formMap.values());
    await fs.writeFile(this.formsFile, JSON.stringify(updatedForms, null, 2));

    console.log(`[FormDatabase] Saved ${formsArray.length} forms`);
    return updatedForms;
  }

  /**
   * Get form by ID
   */
  async getForm(formId) {
    await this.initialize();

    const forms = await this.loadForms();
    return forms.find(f => f.id === formId);
  }

  /**
   * Get form by name
   */
  async getFormByName(formName) {
    await this.initialize();

    const forms = await this.loadForms();
    return forms.find(f => f.name === formName);
  }

  /**
   * Get all forms
   */
  async loadForms() {
    await this.initialize();

    try {
      const data = await fs.readFile(this.formsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[FormDatabase] Error loading forms:', error);
      return [];
    }
  }

  /**
   * Get forms by workflow ID
   */
  async getFormsByWorkflow(workflowId) {
    await this.initialize();

    const forms = await this.loadForms();
    return forms.filter(f => f.workflowId === workflowId);
  }

  /**
   * Delete a form
   */
  async deleteForm(formId) {
    await this.initialize();

    const forms = await this.loadForms();
    const filteredForms = forms.filter(f => f.id !== formId);

    await fs.writeFile(this.formsFile, JSON.stringify(filteredForms, null, 2));
    console.log(`[FormDatabase] Form deleted: ${formId}`);

    return { deleted: forms.length !== filteredForms.length };
  }

  /**
   * Delete forms by workflow ID
   */
  async deleteFormsByWorkflow(workflowId) {
    await this.initialize();

    const forms = await this.loadForms();
    const filteredForms = forms.filter(f => f.workflowId !== workflowId);

    await fs.writeFile(this.formsFile, JSON.stringify(filteredForms, null, 2));
    console.log(`[FormDatabase] Forms deleted for workflow: ${workflowId}`);

    return { deletedCount: forms.length - filteredForms.length };
  }
}

module.exports = new FormDatabase();
