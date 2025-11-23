/**
 * Workflow Database Service
 * Simple file-based database for workflow instances
 * Can be replaced with PostgreSQL/MongoDB later
 */

const fs = require('fs').promises;
const path = require('path');
const WorkflowInstance = require('../models/WorkflowInstance');
const versionManager = require('../runtime/VersionManager');

class WorkflowDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data');
    this.instancesFile = path.join(this.dbPath, 'instances.json');
    this.workflowsFile = path.join(this.dbPath, 'workflows.json');
    this.ensureDatabase();
  }

  /**
   * Ensure database directory and files exist
   */
  async ensureDatabase() {
    try {
      await fs.mkdir(this.dbPath, { recursive: true });

      try {
        await fs.access(this.instancesFile);
      } catch {
        await fs.writeFile(this.instancesFile, JSON.stringify([], null, 2));
      }

      try {
        await fs.access(this.workflowsFile);
      } catch {
        await fs.writeFile(this.workflowsFile, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('[Database] Error ensuring database:', error);
    }
  }

  /**
   * Save workflow definition
   */
  async saveWorkflow(workflow) {
    try {
      const workflows = await this.loadWorkflows();
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);

      if (existingIndex >= 0) {
        workflows[existingIndex] = workflow;
      } else {
        workflows.push(workflow);
      }

      await fs.writeFile(this.workflowsFile, JSON.stringify(workflows, null, 2));
      console.log(`[Database] Workflow saved: ${workflow.id}`);
      return workflow;
    } catch (error) {
      console.error('[Database] Error saving workflow:', error);
      throw error;
    }
  }

  /**
   * Load all workflows
   */
  async loadWorkflows() {
    try {
      const data = await fs.readFile(this.workflowsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[Database] Error loading workflows:', error);
      return [];
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId) {
    const workflows = await this.loadWorkflows();
    return workflows.find(w => w.id === workflowId);
  }

  /**
   * Save workflow instance
   */
  async saveInstance(instance) {
    try {
      const instances = await this.loadInstances();
      const existingIndex = instances.findIndex(i => i.id === instance.id);

      const instanceData = instance instanceof WorkflowInstance ? instance.toJSON() : instance;

      if (existingIndex >= 0) {
        instances[existingIndex] = instanceData;
      } else {
        instances.push(instanceData);
      }

      await fs.writeFile(this.instancesFile, JSON.stringify(instances, null, 2));
      console.log(`[Database] Instance saved: ${instance.id} - Status: ${instance.status}`);
      return instanceData;
    } catch (error) {
      console.error('[Database] Error saving instance:', error);
      throw error;
    }
  }

  /**
   * Load all instances
   */
  async loadInstances() {
    try {
      const data = await fs.readFile(this.instancesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[Database] Error loading instances:', error);
      return [];
    }
  }

  /**
   * Get instance by ID
   */
  async getInstance(instanceId) {
    const instances = await this.loadInstances();
    const instanceData = instances.find(i => i.id === instanceId);
    return instanceData ? new WorkflowInstance(instanceData) : null;
  }

  /**
   * Get instances by status
   */
  async getInstancesByStatus(status) {
    const instances = await this.loadInstances();
    return instances.filter(i => i.status === status);
  }

  /**
   * Get instances by workflow ID
   */
  async getInstancesByWorkflow(workflowId) {
    const instances = await this.loadInstances();
    return instances.filter(i => i.workflowId === workflowId);
  }

  /**
   * Delete instance
   */
  async deleteInstance(instanceId) {
    try {
      const instances = await this.loadInstances();
      const filtered = instances.filter(i => i.id !== instanceId);
      await fs.writeFile(this.instancesFile, JSON.stringify(filtered, null, 2));
      console.log(`[Database] Instance deleted: ${instanceId}`);
      return true;
    } catch (error) {
      console.error('[Database] Error deleting instance:', error);
      throw error;
    }
  }

  /**
   * Get failed instances for recovery
   */
  async getFailedInstances() {
    return await this.getInstancesByStatus('FAILED');
  }

  /**
   * Get running instances
   */
  async getRunningInstances() {
    return await this.getInstancesByStatus('RUNNING');
  }

  // ============================================
  // VERSIONING METHODS
  // ============================================

  /**
   * Save workflow and create version
   */
  async saveWorkflowWithVersion(workflow, versionOptions = {}) {
    try {
      // Save workflow definition
      await this.saveWorkflow(workflow);

      // Create version
      const version = versionManager.createVersion(workflow.id, workflow, versionOptions);

      console.log(`[Database] Created version ${version.version} for workflow ${workflow.id}`);

      return { workflow, version };
    } catch (error) {
      console.error('[Database] Error saving workflow with version:', error);
      throw error;
    }
  }

  /**
   * Get workflow with specific version
   */
  async getWorkflowVersion(workflowId, versionNumber) {
    const version = versionManager.getVersion(workflowId, versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} not found for workflow ${workflowId}`);
    }
    return version.workflow;
  }

  /**
   * Get workflow (default version)
   */
  async getWorkflowLatest(workflowId) {
    // Try to get default version from versionManager
    const defaultVersion = versionManager.getDefaultVersion(workflowId);
    if (defaultVersion) {
      return defaultVersion.workflow;
    }

    // Fall back to file-based workflow
    return await this.getWorkflow(workflowId);
  }

  /**
   * Get all versions for a workflow
   */
  getWorkflowVersions(workflowId, options = {}) {
    return versionManager.getAllVersions(workflowId, options);
  }

  /**
   * Publish a workflow version
   */
  publishWorkflowVersion(workflowId, versionNumber, options = {}) {
    return versionManager.publishVersion(workflowId, versionNumber, options);
  }

  /**
   * Set default workflow version
   */
  setDefaultWorkflowVersion(workflowId, versionNumber) {
    return versionManager.setDefaultVersion(workflowId, versionNumber);
  }

  /**
   * Compare two workflow versions
   */
  compareWorkflowVersions(workflowId, version1, version2) {
    return versionManager.compareVersions(workflowId, version1, version2);
  }

  /**
   * Clone a workflow version
   */
  cloneWorkflowVersion(workflowId, versionNumber, options = {}) {
    return versionManager.cloneVersion(workflowId, versionNumber, options);
  }

  /**
   * Deprecate a workflow version
   */
  deprecateWorkflowVersion(workflowId, versionNumber, reason = '') {
    return versionManager.deprecateVersion(workflowId, versionNumber, reason);
  }

  /**
   * Archive a workflow version
   */
  archiveWorkflowVersion(workflowId, versionNumber) {
    return versionManager.archiveVersion(workflowId, versionNumber);
  }

  /**
   * Delete a workflow version
   */
  deleteWorkflowVersion(workflowId, versionNumber) {
    return versionManager.deleteVersion(workflowId, versionNumber);
  }

  /**
   * Get version statistics
   */
  getVersionStats(workflowId, versionNumber) {
    return versionManager.getVersionStats(workflowId, versionNumber);
  }

  /**
   * Get all versioning statistics
   */
  getAllVersionStats() {
    return versionManager.getAllStats();
  }
}

// Export singleton instance
module.exports = new WorkflowDatabase();
