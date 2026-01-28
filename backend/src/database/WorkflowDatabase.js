/**
 * Workflow Database Service
 * Simple file-based database for workflow instances
 * With file locking for concurrent access safety
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
    this.locks = new Map(); // In-memory locks for this process
    this.lockTimeout = 5000; // 5 second lock timeout
    this.maxRetries = 3;
    this.retryDelay = 100; // ms between retries
    this.ensureDatabase();
  }

  /**
   * Acquire a lock for a file
   */
  async acquireLock(filePath, retries = this.maxRetries) {
    const lockKey = filePath;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const existingLock = this.locks.get(lockKey);

      // Check if lock exists and hasn't expired
      if (existingLock) {
        if (Date.now() - existingLock.timestamp < this.lockTimeout) {
          // Lock is held, wait and retry
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
            continue;
          }
          throw new Error(`Could not acquire lock for ${filePath} after ${retries} retries`);
        }
        // Lock expired, we can take it
      }

      // Acquire lock
      this.locks.set(lockKey, { timestamp: Date.now() });
      return () => this.releaseLock(lockKey);
    }
  }

  /**
   * Release a lock
   */
  releaseLock(lockKey) {
    this.locks.delete(lockKey);
  }

  /**
   * Atomic write with temp file + rename
   */
  async atomicWrite(filePath, data) {
    const tempFile = `${filePath}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
      await fs.rename(tempFile, filePath);
    } catch (error) {
      // Cleanup temp file on failure
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
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
   * Save workflow definition with file locking
   */
  async saveWorkflow(workflow) {
    const release = await this.acquireLock(this.workflowsFile);
    try {
      const workflows = await this.loadWorkflows();
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);

      if (existingIndex >= 0) {
        workflows[existingIndex] = workflow;
      } else {
        workflows.push(workflow);
      }

      await this.atomicWrite(this.workflowsFile, workflows);
      console.log(`[Database] Workflow saved: ${workflow.id}`);
      return workflow;
    } catch (error) {
      console.error('[Database] Error saving workflow:', error);
      throw error;
    } finally {
      release();
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
   * Save workflow instance with file locking
   */
  async saveInstance(instance) {
    const release = await this.acquireLock(this.instancesFile);
    try {
      const instances = await this.loadInstances();
      const existingIndex = instances.findIndex(i => i.id === instance.id);

      const instanceData = instance instanceof WorkflowInstance ? instance.toJSON() : instance;

      if (existingIndex >= 0) {
        instances[existingIndex] = instanceData;
      } else {
        instances.push(instanceData);
      }

      await this.atomicWrite(this.instancesFile, instances);
      console.log(`[Database] Instance saved: ${instance.id} - Status: ${instance.status}`);
      return instanceData;
    } catch (error) {
      console.error('[Database] Error saving instance:', error);
      throw error;
    } finally {
      release();
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
   * Delete instance with file locking
   */
  async deleteInstance(instanceId) {
    const release = await this.acquireLock(this.instancesFile);
    try {
      const instances = await this.loadInstances();
      const filtered = instances.filter(i => i.id !== instanceId);
      await this.atomicWrite(this.instancesFile, filtered);
      console.log(`[Database] Instance deleted: ${instanceId}`);
      return true;
    } catch (error) {
      console.error('[Database] Error deleting instance:', error);
      throw error;
    } finally {
      release();
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
