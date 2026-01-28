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
 * Get form by ID (also tries to match by name if ID lookup fails)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First try to get form by ID
    let form = await formDatabase.getForm(id);

    // If not found by ID, try to find by matching form name or ID pattern
    if (!form) {
      const allForms = await formDatabase.loadForms();

      // Try to find form where the stored ID contains the requested ID
      // This handles cases where ID was modified with prefixes (app_xxx_workflow_xxx_formId)
      form = allForms.find(f =>
        f.id.includes(id) || // ID contains the search term
        f.name.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase() // Name matches (normalized)
      );
    }

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

    // Accept either 'fields' or 'components' for flexibility
    const hasFields = formData.fields && formData.fields.length > 0;
    const hasComponents = formData.components && formData.components.length > 0;

    if (!formData.name || (!hasFields && !hasComponents)) {
      return res.status(400).json({
        success: false,
        error: 'Form name and fields/components are required'
      });
    }

    // If only components provided, convert to fields
    if (!hasFields && hasComponents) {
      formData.fields = formData.components.map(comp => ({
        id: comp.id,
        type: comp.type,
        fieldName: comp.fieldName,
        name: comp.fieldName,
        label: comp.properties?.label || comp.fieldName,
        processVariable: comp.processVariable,
        required: comp.required || false,
        placeholder: comp.properties?.placeholder,
        options: comp.properties?.options,
        properties: comp.properties
      }));
    }

    // Save to file-based storage
    const form = await formDatabase.saveForm(formData);

    // Also save to PostgreSQL if applicationId is provided
    if (formData.applicationId) {
      try {
        await db.query(`
          UPDATE k1.forms SET
            name = $1,
            description = $2,
            fields = $3,
            layout = $4,
            grid_layout = $5,
            title = $6,
            updated_at = NOW()
          WHERE id = $7 AND application_id = $8
        `, [
          formData.name,
          formData.description || '',
          JSON.stringify(formData.fields || []),
          JSON.stringify(formData.layout || {}),
          JSON.stringify(formData.gridLayout || formData.layout || []),
          formData.title || formData.name,
          formData.id,
          formData.applicationId
        ]);
        console.log(`[Form API] Updated form in PostgreSQL: ${formData.id}`);
      } catch (pgError) {
        console.error('[Form API] PostgreSQL update failed:', pgError);
        // Don't fail the request - file-based save succeeded
      }
    }

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
