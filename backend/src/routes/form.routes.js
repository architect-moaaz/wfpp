/**
 * Form API Routes
 * Endpoints for managing workflow forms
 */

const express = require('express');
const router = express.Router();
const formDatabase = require('../database/FormDatabase');

/**
 * GET /api/forms
 * Get all forms
 */
router.get('/', async (req, res) => {
  try {
    const forms = await formDatabase.loadForms();

    res.status(200).json({
      success: true,
      forms,
      count: forms.length
    });

  } catch (error) {
    console.error('[Form API] Get forms error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forms/:id
 * Get form by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const form = await formDatabase.getForm(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    res.status(200).json({
      success: true,
      form
    });

  } catch (error) {
    console.error('[Form API] Get form error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forms/workflow/:workflowId
 * Get forms by workflow ID
 */
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const forms = await formDatabase.getFormsByWorkflow(workflowId);

    res.status(200).json({
      success: true,
      forms,
      count: forms.length
    });

  } catch (error) {
    console.error('[Form API] Get workflow forms error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forms/name/:formName
 * Get form by name
 */
router.get('/name/:formName', async (req, res) => {
  try {
    const { formName } = req.params;

    const form = await formDatabase.getFormByName(formName);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    res.status(200).json({
      success: true,
      form
    });

  } catch (error) {
    console.error('[Form API] Get form by name error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forms
 * Create or update a form
 */
router.post('/', async (req, res) => {
  try {
    const formData = req.body;

    if (!formData.name || !formData.fields) {
      return res.status(400).json({
        success: false,
        error: 'Form name and fields are required'
      });
    }

    const form = await formDatabase.saveForm(formData);

    res.status(200).json({
      success: true,
      form
    });

  } catch (error) {
    console.error('[Form API] Save form error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/forms/:id
 * Delete a form
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await formDatabase.deleteForm(id);

    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Form deleted successfully'
    });

  } catch (error) {
    console.error('[Form API] Delete form error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/forms/workflow/:workflowId
 * Delete all forms for a workflow
 */
router.delete('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const result = await formDatabase.deleteFormsByWorkflow(workflowId);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} form(s)`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('[Form API] Delete workflow forms error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
