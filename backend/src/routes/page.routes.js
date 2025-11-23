/**
 * Page API Routes
 * Endpoints for managing workflow pages
 */

const express = require('express');
const router = express.Router();
const pageDatabase = require('../database/PageDatabase');

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
 * Get page by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
 * Delete a page
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = pageDatabase.deletePage(id);

    if (!result) {
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
