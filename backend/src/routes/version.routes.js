/**
 * Workflow Version Management Routes
 * API endpoints for managing workflow versions
 */

const express = require('express');
const router = express.Router();
const workflowDatabase = require('../database/WorkflowDatabase');
const versionManager = require('../runtime/VersionManager');

// ============================================
// VERSION CRUD OPERATIONS
// ============================================

/**
 * POST /api/versions/:workflowId/create
 * Create a new version of a workflow
 */
router.post('/:workflowId/create', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { workflow, author, changeDescription, tags } = req.body;

    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow data is required'
      });
    }

    const result = await workflowDatabase.saveWorkflowWithVersion(
      { ...workflow, id: workflowId },
      {
        author: author || 'system',
        changeDescription: changeDescription || '',
        tags: tags || []
      }
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId
 * Get all versions for a workflow
 */
router.get('/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const {
      includeArchived,
      status,
      limit,
      offset
    } = req.query;

    const options = {
      includeArchived: includeArchived === 'true',
      status,
      limit: limit ? parseInt(limit) : null,
      offset: offset ? parseInt(offset) : 0
    };

    const versions = workflowDatabase.getWorkflowVersions(workflowId, options);

    res.json({
      success: true,
      data: versions,
      total: versions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId/:version
 * Get a specific version
 */
router.get('/:workflowId/:version', async (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const versionData = versionManager.getVersion(workflowId, versionNumber);

    if (!versionData) {
      return res.status(404).json({
        success: false,
        error: `Version ${versionNumber} not found`
      });
    }

    res.json({
      success: true,
      data: versionData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId/default
 * Get the default version
 */
router.get('/:workflowId/default', (req, res) => {
  try {
    const { workflowId } = req.params;

    const version = versionManager.getDefaultVersion(workflowId);

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'No default version found'
      });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId/published
 * Get all published versions
 */
router.get('/:workflowId/published', (req, res) => {
  try {
    const { workflowId } = req.params;

    const versions = versionManager.getPublishedVersions(workflowId);

    res.json({
      success: true,
      data: versions,
      total: versions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId/latest-published
 * Get the latest published version
 */
router.get('/:workflowId/latest-published', (req, res) => {
  try {
    const { workflowId } = req.params;

    const version = versionManager.getLatestPublishedVersion(workflowId);

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'No published versions found'
      });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// VERSION STATE MANAGEMENT
// ============================================

/**
 * POST /api/versions/:workflowId/:version/publish
 * Publish a version
 */
router.post('/:workflowId/:version/publish', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const { setAsDefault } = req.body;

    const versionNumber = parseInt(version);

    const publishedVersion = workflowDatabase.publishWorkflowVersion(
      workflowId,
      versionNumber,
      { setAsDefault: setAsDefault || false }
    );

    res.json({
      success: true,
      data: publishedVersion,
      message: `Version ${versionNumber} published successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/versions/:workflowId/:version/set-default
 * Set a version as the default
 */
router.put('/:workflowId/:version/set-default', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const updatedVersion = workflowDatabase.setDefaultWorkflowVersion(
      workflowId,
      versionNumber
    );

    res.json({
      success: true,
      data: updatedVersion,
      message: `Version ${versionNumber} set as default`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/versions/:workflowId/:version/deprecate
 * Deprecate a version
 */
router.post('/:workflowId/:version/deprecate', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const { reason } = req.body;

    const versionNumber = parseInt(version);

    const deprecatedVersion = workflowDatabase.deprecateWorkflowVersion(
      workflowId,
      versionNumber,
      reason || ''
    );

    res.json({
      success: true,
      data: deprecatedVersion,
      message: `Version ${versionNumber} deprecated`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/versions/:workflowId/:version/archive
 * Archive a version
 */
router.post('/:workflowId/:version/archive', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const archivedVersion = workflowDatabase.archiveWorkflowVersion(
      workflowId,
      versionNumber
    );

    res.json({
      success: true,
      data: archivedVersion,
      message: `Version ${versionNumber} archived`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/versions/:workflowId/:version
 * Delete a version
 */
router.delete('/:workflowId/:version', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const result = workflowDatabase.deleteWorkflowVersion(
      workflowId,
      versionNumber
    );

    res.json({
      success: true,
      data: result,
      message: `Version ${versionNumber} deleted`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// VERSION OPERATIONS
// ============================================

/**
 * POST /api/versions/:workflowId/:version/clone
 * Clone a version to create a new draft
 */
router.post('/:workflowId/:version/clone', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const { author, changeDescription, tags } = req.body;

    const versionNumber = parseInt(version);

    const newVersion = workflowDatabase.cloneWorkflowVersion(
      workflowId,
      versionNumber,
      {
        author: author || 'system',
        changeDescription: changeDescription || `Cloned from version ${versionNumber}`,
        tags: tags || []
      }
    );

    res.status(201).json({
      success: true,
      data: newVersion,
      message: `Version ${versionNumber} cloned successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId/compare/:version1/:version2
 * Compare two versions
 */
router.get('/:workflowId/compare/:version1/:version2', (req, res) => {
  try {
    const { workflowId, version1, version2 } = req.params;

    const v1 = parseInt(version1);
    const v2 = parseInt(version2);

    const comparison = workflowDatabase.compareWorkflowVersions(
      workflowId,
      v1,
      v2
    );

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/versions/:workflowId/:version/export
 * Export a version
 */
router.post('/:workflowId/:version/export', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const exportData = versionManager.exportVersion(workflowId, versionNumber);

    res.json({
      success: true,
      data: exportData,
      message: `Version ${versionNumber} exported successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/versions/:workflowId/import
 * Import a version
 */
router.post('/:workflowId/import', (req, res) => {
  try {
    const { workflowId } = req.params;
    const { versionData, author, tags } = req.body;

    if (!versionData) {
      return res.status(400).json({
        success: false,
        error: 'Version data is required'
      });
    }

    const importedVersion = versionManager.importVersion(
      workflowId,
      versionData,
      {
        author: author || 'imported',
        tags: tags || []
      }
    );

    res.status(201).json({
      success: true,
      data: importedVersion,
      message: 'Version imported successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// VERSION STATISTICS
// ============================================

/**
 * GET /api/versions/:workflowId/:version/stats
 * Get statistics for a specific version
 */
router.get('/:workflowId/:version/stats', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const stats = workflowDatabase.getVersionStats(workflowId, versionNumber);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: `Version ${versionNumber} not found`
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/stats
 * Get all versioning statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = workflowDatabase.getAllVersionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/versions/:workflowId/:version/instances
 * Get all instances using a specific version
 */
router.get('/:workflowId/:version/instances', (req, res) => {
  try {
    const { workflowId, version } = req.params;
    const versionNumber = parseInt(version);

    const instances = versionManager.getVersionInstances(workflowId, versionNumber);

    res.json({
      success: true,
      data: instances,
      total: instances.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
