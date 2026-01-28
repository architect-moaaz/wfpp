/**
 * Page API Routes
 * Endpoints for managing workflow pages
 */

const express = require('express');
const router = express.Router();
const pageDatabase = require('../database/PageDatabase');
const db = require('../config/database');

/**
 * GET /api/pages
 * Get all pages
 */
router.get('/', async (req, res) => {
  try {
    const pages = pageDatabase.getAllPages();

    res.status(200).json({
      success: true,
      pages,
      count: pages.length
    });

  } catch (error) {
    console.error('[Page API] Get pages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pages/:id
 * Get page by ID - checks PostgreSQL first, then file-based storage
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First try PostgreSQL database
    const result = await db.query('SELECT * FROM k1.pages WHERE id = $1', [id]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const metadata = row.metadata || {};

      // Sections can be stored in row.sections OR inside metadata.sections
      // Check if row.sections has content, otherwise use metadata.sections
      const rowSections = row.sections && row.sections.length > 0 ? row.sections : null;
      const sections = rowSections || metadata.sections || [];

      const page = {
        id: row.id,
        name: row.name,
        type: row.type || metadata.pageType,
        route: row.route,
        platform: row.platform || metadata.platform,
        layout: row.layout,
        sections: sections,
        components: row.components || [], // Include components for PageBuilderPro
        navigation: row.navigation || metadata.navigation,
        dataBindings: row.data_bindings,
        forms: row.forms,
        metadata: row.metadata,
        workflowId: row.workflow_id,
        applicationId: row.application_id,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      return res.status(200).json({
        success: true,
        page
      });
    }

    // Fall back to file-based storage
    const page = pageDatabase.getPageById(id);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      page
    });

  } catch (error) {
    console.error('[Page API] Get page error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pages/workflow/:workflowId
 * Get pages by workflow ID
 */
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const pages = pageDatabase.getPagesByWorkflow(workflowId);

    res.status(200).json({
      success: true,
      pages,
      count: pages.length
    });

  } catch (error) {
    console.error('[Page API] Get workflow pages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pages/type/:type
 * Get pages by type (list, detail, form, dashboard, etc.)
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;

    const pages = pageDatabase.getPagesByType(type);

    res.status(200).json({
      success: true,
      pages,
      count: pages.length
    });

  } catch (error) {
    console.error('[Page API] Get pages by type error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pages/platform/:platform
 * Get pages by platform (web, mobile, both)
 */
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;

    const pages = pageDatabase.getPagesByPlatform(platform);

    res.status(200).json({
      success: true,
      pages,
      count: pages.length
    });

  } catch (error) {
    console.error('[Page API] Get pages by platform error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pages/entity/:entityName
 * Get pages by entity name
 */
router.get('/entity/:entityName', async (req, res) => {
  try {
    const { entityName } = req.params;

    const pages = pageDatabase.getPagesByEntity(entityName);

    res.status(200).json({
      success: true,
      pages,
      count: pages.length
    });

  } catch (error) {
    console.error('[Page API] Get pages by entity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pages/stats
 * Get page statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = pageDatabase.getStats();

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[Page API] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/pages
 * Create or update pages
 */
router.post('/', async (req, res) => {
  try {
    const pagesData = req.body;

    // Accept both single page object or array
    const pagesToSave = Array.isArray(pagesData) ? pagesData : [pagesData];

    if (pagesToSave.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pages provided'
      });
    }

    const savedPages = pageDatabase.savePages(pagesToSave);

    res.status(200).json({
      success: true,
      pages: savedPages,
      count: savedPages.length
    });

  } catch (error) {
    console.error('[Page API] Save pages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/pages/:id
 * Delete a page from both PostgreSQL and file-based storage
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from PostgreSQL
    const dbResult = await db.query('DELETE FROM k1.pages WHERE id = $1 RETURNING id', [id]);

    // Also delete from file-based storage (for legacy data)
    const fileResult = pageDatabase.deletePage(id);

    if (dbResult.rows.length === 0 && !fileResult) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Page deleted successfully'
    });

  } catch (error) {
    console.error('[Page API] Delete page error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/pages
 * Clear all pages
 */
router.delete('/', async (req, res) => {
  try {
    pageDatabase.clearAll();

    res.status(200).json({
      success: true,
      message: 'All pages deleted successfully'
    });

  } catch (error) {
    console.error('[Page API] Clear all pages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
