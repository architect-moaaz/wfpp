/**
 * Version Management API Service
 * Handles all API calls for workflow versioning
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class VersionAPI {
  /**
   * Create a new version of a workflow
   */
  async createVersion(workflowId, workflow, options = {}) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow,
        author: options.author || 'system',
        changeDescription: options.changeDescription || '',
        tags: options.tags || []
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all versions for a workflow
   */
  async getVersions(workflowId, options = {}) {
    const params = new URLSearchParams();

    if (options.includeArchived) params.append('includeArchived', 'true');
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    const url = `${API_BASE_URL}/versions/${workflowId}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch versions: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get a specific version
   */
  async getVersion(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get the default version
   */
  async getDefaultVersion(workflowId) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/default`);

    if (!response.ok) {
      throw new Error(`Failed to fetch default version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all published versions
   */
  async getPublishedVersions(workflowId) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/published`);

    if (!response.ok) {
      throw new Error(`Failed to fetch published versions: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get the latest published version
   */
  async getLatestPublishedVersion(workflowId) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/latest-published`);

    if (!response.ok) {
      throw new Error(`Failed to fetch latest published version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Publish a version
   */
  async publishVersion(workflowId, versionNumber, setAsDefault = false) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setAsDefault })
    });

    if (!response.ok) {
      throw new Error(`Failed to publish version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Set a version as default
   */
  async setDefaultVersion(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/set-default`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to set default version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Deprecate a version
   */
  async deprecateVersion(workflowId, versionNumber, reason = '') {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/deprecate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error(`Failed to deprecate version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Archive a version
   */
  async archiveVersion(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to archive version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a version
   */
  async deleteVersion(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Clone a version
   */
  async cloneVersion(workflowId, versionNumber, options = {}) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: options.author || 'system',
        changeDescription: options.changeDescription || `Cloned from version ${versionNumber}`,
        tags: options.tags || []
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to clone version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Compare two versions
   */
  async compareVersions(workflowId, version1, version2) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/compare/${version1}/${version2}`);

    if (!response.ok) {
      throw new Error(`Failed to compare versions: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Export a version
   */
  async exportVersion(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to export version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Import a version
   */
  async importVersion(workflowId, versionData, options = {}) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        versionData,
        author: options.author || 'imported',
        tags: options.tags || []
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to import version: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get version statistics
   */
  async getVersionStats(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/stats`);

    if (!response.ok) {
      throw new Error(`Failed to fetch version stats: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get all versioning statistics
   */
  async getAllVersionStats() {
    const response = await fetch(`${API_BASE_URL}/versions/stats`);

    if (!response.ok) {
      throw new Error(`Failed to fetch all version stats: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get instances using a specific version
   */
  async getVersionInstances(workflowId, versionNumber) {
    const response = await fetch(`${API_BASE_URL}/versions/${workflowId}/${versionNumber}/instances`);

    if (!response.ok) {
      throw new Error(`Failed to fetch version instances: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Restore a specific version to the current workflow
   * This creates a new version with the data from the specified version
   */
  async restoreVersion(workflowId, versionNumber, options = {}) {
    // Get the version data
    const versionResponse = await this.getVersion(workflowId, versionNumber);
    const versionData = versionResponse.data;

    // Create a new version with the restored data
    return await this.createVersion(workflowId, versionData.workflow, {
      author: options.author || 'system',
      changeDescription: options.changeDescription || `Restored from version ${versionNumber}`,
      tags: [...(options.tags || []), 'restored', `from-v${versionNumber}`]
    });
  }
}

export default new VersionAPI();
