/**
 * Version Manager
 * Manages workflow versioning, including version creation, publishing, and lifecycle
 */

const { v4: uuidv4 } = require('uuid');

class VersionManager {
  constructor() {
    // Version storage: workflowId -> versions[]
    this.versions = new Map();

    // Default version tracking: workflowId -> versionNumber
    this.defaultVersions = new Map();

    // Published versions: workflowId -> versionNumber[]
    this.publishedVersions = new Map();

    // Version metadata: versionId -> metadata
    this.versionMetadata = new Map();

    // Instance-version bindings: instanceId -> { workflowId, version }
    this.instanceVersions = new Map();

    // Statistics
    this.stats = {
      totalVersions: 0,
      publishedVersions: 0,
      draftVersions: 0,
      activeInstances: new Map() // version -> instance count
    };
  }

  /**
   * Create a new version of a workflow
   */
  createVersion(workflowId, workflowData, options = {}) {
    const {
      author = 'system',
      changeDescription = '',
      tags = [],
      fromVersion = null
    } = options;

    // Get existing versions for this workflow
    if (!this.versions.has(workflowId)) {
      this.versions.set(workflowId, []);
    }

    const versions = this.versions.get(workflowId);

    // Calculate next version number
    const versionNumber = versions.length > 0
      ? Math.max(...versions.map(v => v.version)) + 1
      : 1;

    // Create version object
    const version = {
      id: uuidv4(),
      workflowId,
      version: versionNumber,
      status: 'DRAFT', // DRAFT, PUBLISHED, DEPRECATED, ARCHIVED
      workflow: this.deepClone(workflowData),
      metadata: {
        author,
        changeDescription,
        tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        deprecatedAt: null,
        fromVersion,
        isDefault: false
      },
      stats: {
        instanceCount: 0,
        activeInstances: 0,
        completedInstances: 0,
        failedInstances: 0
      }
    };

    // Add to versions
    versions.push(version);

    // Store metadata
    this.versionMetadata.set(version.id, version.metadata);

    // Update statistics
    this.stats.totalVersions++;
    this.stats.draftVersions++;

    // If this is the first version, set it as default
    if (versionNumber === 1) {
      this.setDefaultVersion(workflowId, versionNumber);
    }

    console.log(`[VersionManager] Created version ${versionNumber} for workflow ${workflowId}`);

    return version;
  }

  /**
   * Publish a version (make it available for execution)
   */
  publishVersion(workflowId, versionNumber, options = {}) {
    const { setAsDefault = false } = options;

    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for workflow ${workflowId}`);
    }

    if (version.status === 'PUBLISHED') {
      console.log(`[VersionManager] Version ${versionNumber} already published`);
      return version;
    }

    // Update version status
    version.status = 'PUBLISHED';
    version.metadata.publishedAt = new Date();
    version.metadata.updatedAt = new Date();

    // Track published versions
    if (!this.publishedVersions.has(workflowId)) {
      this.publishedVersions.set(workflowId, []);
    }
    this.publishedVersions.get(workflowId).push(versionNumber);

    // Update statistics
    this.stats.publishedVersions++;
    this.stats.draftVersions--;

    // Set as default if requested
    if (setAsDefault) {
      this.setDefaultVersion(workflowId, versionNumber);
    }

    console.log(`[VersionManager] Published version ${versionNumber} for workflow ${workflowId}`);

    return version;
  }

  /**
   * Set a version as the default version
   */
  setDefaultVersion(workflowId, versionNumber) {
    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for workflow ${workflowId}`);
    }

    // Unset previous default
    const currentDefault = this.defaultVersions.get(workflowId);
    if (currentDefault) {
      const oldDefault = this.getVersion(workflowId, currentDefault);
      if (oldDefault) {
        oldDefault.metadata.isDefault = false;
      }
    }

    // Set new default
    this.defaultVersions.set(workflowId, versionNumber);
    version.metadata.isDefault = true;
    version.metadata.updatedAt = new Date();

    console.log(`[VersionManager] Set version ${versionNumber} as default for workflow ${workflowId}`);

    return version;
  }

  /**
   * Deprecate a version (mark as no longer recommended)
   */
  deprecateVersion(workflowId, versionNumber, reason = '') {
    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for workflow ${workflowId}`);
    }

    if (version.metadata.isDefault) {
      throw new Error(`Cannot deprecate default version. Set a new default version first.`);
    }

    version.status = 'DEPRECATED';
    version.metadata.deprecatedAt = new Date();
    version.metadata.deprecationReason = reason;
    version.metadata.updatedAt = new Date();

    console.log(`[VersionManager] Deprecated version ${versionNumber} for workflow ${workflowId}: ${reason}`);

    return version;
  }

  /**
   * Archive a version (soft delete)
   */
  archiveVersion(workflowId, versionNumber) {
    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for workflow ${workflowId}`);
    }

    if (version.stats.activeInstances > 0) {
      throw new Error(`Cannot archive version with ${version.stats.activeInstances} active instances`);
    }

    if (version.metadata.isDefault) {
      throw new Error(`Cannot archive default version. Set a new default version first.`);
    }

    version.status = 'ARCHIVED';
    version.metadata.archivedAt = new Date();
    version.metadata.updatedAt = new Date();

    console.log(`[VersionManager] Archived version ${versionNumber} for workflow ${workflowId}`);

    return version;
  }

  /**
   * Delete a version (hard delete)
   */
  deleteVersion(workflowId, versionNumber) {
    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found for workflow ${workflowId}`);
    }

    if (version.stats.instanceCount > 0) {
      throw new Error(`Cannot delete version with ${version.stats.instanceCount} instances (active or completed)`);
    }

    if (version.metadata.isDefault) {
      throw new Error(`Cannot delete default version. Set a new default version first.`);
    }

    const versions = this.versions.get(workflowId);
    const index = versions.findIndex(v => v.version === versionNumber);

    if (index !== -1) {
      versions.splice(index, 1);
      this.versionMetadata.delete(version.id);

      // Update statistics
      this.stats.totalVersions--;
      if (version.status === 'DRAFT') {
        this.stats.draftVersions--;
      } else if (version.status === 'PUBLISHED') {
        this.stats.publishedVersions--;
      }

      console.log(`[VersionManager] Deleted version ${versionNumber} for workflow ${workflowId}`);
    }

    return { success: true, deleted: version };
  }

  /**
   * Get a specific version
   */
  getVersion(workflowId, versionNumber) {
    const versions = this.versions.get(workflowId);
    if (!versions) {
      return null;
    }

    return versions.find(v => v.version === versionNumber);
  }

  /**
   * Get default version
   */
  getDefaultVersion(workflowId) {
    const defaultVersionNumber = this.defaultVersions.get(workflowId);
    if (!defaultVersionNumber) {
      return null;
    }

    return this.getVersion(workflowId, defaultVersionNumber);
  }

  /**
   * Get all versions for a workflow
   */
  getAllVersions(workflowId, options = {}) {
    const {
      includeArchived = false,
      status = null,
      limit = null,
      offset = 0
    } = options;

    let versions = this.versions.get(workflowId) || [];

    // Filter by status
    if (status) {
      versions = versions.filter(v => v.status === status);
    }

    // Filter archived
    if (!includeArchived) {
      versions = versions.filter(v => v.status !== 'ARCHIVED');
    }

    // Sort by version number (descending)
    versions = [...versions].sort((a, b) => b.version - a.version);

    // Pagination
    if (limit) {
      versions = versions.slice(offset, offset + limit);
    }

    return versions;
  }

  /**
   * Get published versions
   */
  getPublishedVersions(workflowId) {
    return this.getAllVersions(workflowId, { status: 'PUBLISHED' });
  }

  /**
   * Get latest published version
   */
  getLatestPublishedVersion(workflowId) {
    const published = this.getPublishedVersions(workflowId);
    return published.length > 0 ? published[0] : null;
  }

  /**
   * Compare two versions
   */
  compareVersions(workflowId, version1Number, version2Number) {
    const v1 = this.getVersion(workflowId, version1Number);
    const v2 = this.getVersion(workflowId, version2Number);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const diff = {
      workflowId,
      versions: {
        from: version1Number,
        to: version2Number
      },
      changes: {
        nodes: this.compareNodes(v1.workflow.nodes, v2.workflow.nodes),
        connections: this.compareConnections(v1.workflow.connections, v2.workflow.connections),
        metadata: this.compareMetadata(v1.workflow, v2.workflow)
      },
      summary: {
        nodesAdded: 0,
        nodesRemoved: 0,
        nodesModified: 0,
        connectionsAdded: 0,
        connectionsRemoved: 0
      }
    };

    // Calculate summary
    diff.summary.nodesAdded = diff.changes.nodes.added.length;
    diff.summary.nodesRemoved = diff.changes.nodes.removed.length;
    diff.summary.nodesModified = diff.changes.nodes.modified.length;
    diff.summary.connectionsAdded = diff.changes.connections.added.length;
    diff.summary.connectionsRemoved = diff.changes.connections.removed.length;

    return diff;
  }

  /**
   * Compare nodes between two workflow versions
   */
  compareNodes(nodes1, nodes2) {
    const map1 = new Map(nodes1.map(n => [n.id, n]));
    const map2 = new Map(nodes2.map(n => [n.id, n]));

    const added = nodes2.filter(n => !map1.has(n.id));
    const removed = nodes1.filter(n => !map2.has(n.id));
    const modified = [];

    // Find modified nodes
    for (const [id, node1] of map1) {
      if (map2.has(id)) {
        const node2 = map2.get(id);
        if (JSON.stringify(node1) !== JSON.stringify(node2)) {
          modified.push({
            id,
            before: node1,
            after: node2,
            changes: this.detectNodeChanges(node1, node2)
          });
        }
      }
    }

    return { added, removed, modified };
  }

  /**
   * Compare connections between two workflow versions
   */
  compareConnections(connections1, connections2) {
    const map1 = new Map(connections1.map(c => [c.id, c]));
    const map2 = new Map(connections2.map(c => [c.id, c]));

    const added = connections2.filter(c => !map1.has(c.id));
    const removed = connections1.filter(c => !map2.has(c.id));

    return { added, removed };
  }

  /**
   * Compare workflow metadata
   */
  compareMetadata(workflow1, workflow2) {
    const changes = [];

    if (workflow1.name !== workflow2.name) {
      changes.push({ field: 'name', from: workflow1.name, to: workflow2.name });
    }

    if (workflow1.description !== workflow2.description) {
      changes.push({ field: 'description', from: workflow1.description, to: workflow2.description });
    }

    return changes;
  }

  /**
   * Detect specific changes in a node
   */
  detectNodeChanges(node1, node2) {
    const changes = [];

    if (node1.type !== node2.type) {
      changes.push({ field: 'type', from: node1.type, to: node2.type });
    }

    if (JSON.stringify(node1.data) !== JSON.stringify(node2.data)) {
      changes.push({ field: 'data', from: node1.data, to: node2.data });
    }

    return changes;
  }

  /**
   * Bind an instance to a specific version
   */
  bindInstanceToVersion(instanceId, workflowId, versionNumber) {
    this.instanceVersions.set(instanceId, {
      workflowId,
      version: versionNumber,
      boundAt: new Date()
    });

    // Update version statistics
    const version = this.getVersion(workflowId, versionNumber);
    if (version) {
      version.stats.instanceCount++;
      version.stats.activeInstances++;

      // Update global stats
      if (!this.stats.activeInstances.has(version.id)) {
        this.stats.activeInstances.set(version.id, 0);
      }
      this.stats.activeInstances.set(version.id, this.stats.activeInstances.get(version.id) + 1);
    }

    console.log(`[VersionManager] Bound instance ${instanceId} to version ${versionNumber}`);
  }

  /**
   * Unbind an instance (on completion/failure)
   */
  unbindInstance(instanceId, status = 'COMPLETED') {
    const binding = this.instanceVersions.get(instanceId);

    if (!binding) {
      return;
    }

    const { workflowId, version: versionNumber } = binding;
    const version = this.getVersion(workflowId, versionNumber);

    if (version) {
      version.stats.activeInstances--;

      if (status === 'COMPLETED') {
        version.stats.completedInstances++;
      } else if (status === 'FAILED') {
        version.stats.failedInstances++;
      }

      // Update global stats
      const currentCount = this.stats.activeInstances.get(version.id) || 0;
      this.stats.activeInstances.set(version.id, Math.max(0, currentCount - 1));
    }

    this.instanceVersions.delete(instanceId);

    console.log(`[VersionManager] Unbound instance ${instanceId} (${status})`);
  }

  /**
   * Get version for an instance
   */
  getInstanceVersion(instanceId) {
    return this.instanceVersions.get(instanceId);
  }

  /**
   * Get all instances for a version
   */
  getVersionInstances(workflowId, versionNumber) {
    const instances = [];

    for (const [instanceId, binding] of this.instanceVersions) {
      if (binding.workflowId === workflowId && binding.version === versionNumber) {
        instances.push(instanceId);
      }
    }

    return instances;
  }

  /**
   * Clone a version to create a new draft
   */
  cloneVersion(workflowId, versionNumber, options = {}) {
    const sourceVersion = this.getVersion(workflowId, versionNumber);

    if (!sourceVersion) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    return this.createVersion(workflowId, sourceVersion.workflow, {
      ...options,
      fromVersion: versionNumber,
      changeDescription: options.changeDescription || `Cloned from version ${versionNumber}`
    });
  }

  /**
   * Export version for migration
   */
  exportVersion(workflowId, versionNumber) {
    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    return {
      version: this.deepClone(version),
      exportedAt: new Date(),
      exportedBy: 'system'
    };
  }

  /**
   * Import version from export
   */
  importVersion(workflowId, versionData, options = {}) {
    return this.createVersion(workflowId, versionData.workflow, {
      ...options,
      author: versionData.metadata.author || 'imported',
      changeDescription: `Imported from external source`,
      tags: [...(versionData.metadata.tags || []), 'imported']
    });
  }

  /**
   * Get version statistics
   */
  getVersionStats(workflowId, versionNumber) {
    const version = this.getVersion(workflowId, versionNumber);

    if (!version) {
      return null;
    }

    return {
      ...version.stats,
      version: versionNumber,
      status: version.status,
      isDefault: version.metadata.isDefault,
      age: Date.now() - new Date(version.metadata.createdAt).getTime()
    };
  }

  /**
   * Get all version statistics
   */
  getAllStats() {
    return {
      ...this.stats,
      activeInstances: Object.fromEntries(this.stats.activeInstances),
      workflowCount: this.versions.size,
      versionsByWorkflow: Array.from(this.versions.entries()).map(([workflowId, versions]) => ({
        workflowId,
        totalVersions: versions.length,
        publishedVersions: versions.filter(v => v.status === 'PUBLISHED').length,
        draftVersions: versions.filter(v => v.status === 'DRAFT').length,
        defaultVersion: this.defaultVersions.get(workflowId)
      }))
    };
  }

  /**
   * Deep clone utility
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear all versions for a workflow
   */
  clearWorkflowVersions(workflowId) {
    this.versions.delete(workflowId);
    this.defaultVersions.delete(workflowId);
    this.publishedVersions.delete(workflowId);

    console.log(`[VersionManager] Cleared all versions for workflow ${workflowId}`);
  }

  /**
   * Reset all version data
   */
  reset() {
    this.versions.clear();
    this.defaultVersions.clear();
    this.publishedVersions.clear();
    this.versionMetadata.clear();
    this.instanceVersions.clear();

    this.stats = {
      totalVersions: 0,
      publishedVersions: 0,
      draftVersions: 0,
      activeInstances: new Map()
    };

    console.log('[VersionManager] All version data reset');
  }
}

module.exports = new VersionManager();
