const express = require('express');
const router = express.Router();
const dataModelDatabase = require('../database/DataModelDatabase');
const dataModelEnforcer = require('../runtime/DataModelEnforcer');

// Get all data models
router.get('/', async (req, res) => {
  try {
    const dataModels = await dataModelDatabase.loadDataModels();
    res.status(200).json({
      success: true,
      dataModels,
      count: dataModels.length
    });
  } catch (error) {
    console.error('[DataModel API] Get data models error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data model by ID
router.get('/:id', async (req, res) => {
  try {
    const dataModel = await dataModelDatabase.getDataModel(req.params.id);

    if (!dataModel) {
      return res.status(404).json({
        success: false,
        error: 'Data model not found'
      });
    }

    res.status(200).json({
      success: true,
      dataModel
    });
  } catch (error) {
    console.error('[DataModel API] Get data model error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data models by workflow ID
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const dataModels = await dataModelDatabase.getDataModelsByWorkflow(req.params.workflowId);
    res.status(200).json({
      success: true,
      dataModels,
      count: dataModels.length
    });
  } catch (error) {
    console.error('[DataModel API] Get data models by workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data model by name
router.get('/name/:name', async (req, res) => {
  try {
    const dataModel = await dataModelDatabase.getDataModelByName(req.params.name);

    if (!dataModel) {
      return res.status(404).json({
        success: false,
        error: 'Data model not found'
      });
    }

    res.status(200).json({
      success: true,
      dataModel
    });
  } catch (error) {
    console.error('[DataModel API] Get data model by name error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create or update data model
router.post('/', async (req, res) => {
  try {
    const dataModelData = req.body;

    if (!dataModelData.name || !dataModelData.fields) {
      return res.status(400).json({
        success: false,
        error: 'Data model name and fields are required'
      });
    }

    const dataModel = await dataModelDatabase.saveDataModel(dataModelData);

    res.status(200).json({
      success: true,
      dataModel
    });
  } catch (error) {
    console.error('[DataModel API] Save data model error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete data model
router.delete('/:id', async (req, res) => {
  try {
    const result = await dataModelDatabase.deleteDataModel(req.params.id);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[DataModel API] Delete data model error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// DATA MODEL ENFORCEMENT ENDPOINTS (Features #29-#32)
// ============================================================

/**
 * POST /api/datamodels/:id/validate
 * Validate a record against field constraints (#29)
 * Applies type coercion (#30)
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { record, options } = req.body;

    if (!record || typeof record !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Record object is required'
      });
    }

    const result = await dataModelEnforcer.validateAndCoerce(id, record, options || {});

    res.status(result.valid ? 200 : 400).json({
      success: result.valid,
      ...result
    });
  } catch (error) {
    console.error('[DataModel API] Validate record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/datamodels/:id/validate-references
 * Validate referential integrity for a record (#31)
 */
router.post('/:id/validate-references', async (req, res) => {
  try {
    const { id } = req.params;
    const { record, options } = req.body;

    if (!record || typeof record !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Record object is required'
      });
    }

    const result = await dataModelEnforcer.validateReferences(id, record, options || {});

    res.status(result.valid ? 200 : 400).json({
      success: result.valid,
      ...result
    });
  } catch (error) {
    console.error('[DataModel API] Validate references error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/datamodels/:id/cascade-delete/:recordId
 * Execute or preview cascade delete (#32)
 */
router.post('/:id/cascade-delete/:recordId', async (req, res) => {
  try {
    const { id, recordId } = req.params;
    const { dryRun = true, ...options } = req.body || {};

    const result = await dataModelEnforcer.executeCascadeDelete(id, recordId, {
      dryRun,
      ...options
    });

    res.status(result.success ? 200 : 400).json({
      success: result.success,
      ...result
    });
  } catch (error) {
    console.error('[DataModel API] Cascade delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/datamodels/:id/coerce
 * Type coerce a value to match field type (#30)
 */
router.post('/:id/coerce', async (req, res) => {
  try {
    const { id } = req.params;
    const { fieldName, value } = req.body;

    if (!fieldName) {
      return res.status(400).json({
        success: false,
        error: 'Field name is required'
      });
    }

    // Get the data model to find field type
    const dataModel = await dataModelDatabase.getDataModel(id);
    if (!dataModel) {
      return res.status(404).json({
        success: false,
        error: 'Data model not found'
      });
    }

    const field = dataModel.fields.find(f => f.name === fieldName);
    if (!field) {
      return res.status(404).json({
        success: false,
        error: `Field '${fieldName}' not found in data model`
      });
    }

    const coercedValue = dataModelEnforcer.coerceType(value, field.type, field);

    res.status(200).json({
      success: true,
      originalValue: value,
      coercedValue,
      fieldType: field.type,
      coerced: value !== coercedValue
    });
  } catch (error) {
    console.error('[DataModel API] Coerce value error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/datamodels/:id/relationships
 * Get all relationships for a data model (useful for #31, #32)
 */
router.get('/:id/relationships', async (req, res) => {
  try {
    const { id } = req.params;

    const dataModel = await dataModelDatabase.getDataModel(id);
    if (!dataModel) {
      return res.status(404).json({
        success: false,
        error: 'Data model not found'
      });
    }

    // Find reference fields in this model (outgoing relationships)
    const outgoingRefs = (dataModel.fields || [])
      .filter(f => f.type === 'reference' || f.referenceModel)
      .map(f => ({
        fieldName: f.name,
        targetModel: f.referenceModel || f.referenceTo,
        onDelete: f.onDelete || 'RESTRICT'
      }));

    // Find all models that reference this one (incoming relationships)
    const allModels = await dataModelDatabase.loadDataModels();
    const incomingRefs = [];

    for (const model of allModels) {
      if (model.id === id) continue;

      for (const field of (model.fields || [])) {
        if (field.type === 'reference' || field.referenceModel) {
          const targetModel = field.referenceModel || field.referenceTo;
          if (targetModel === id || targetModel === dataModel.name) {
            incomingRefs.push({
              sourceModel: model.id,
              sourceModelName: model.name,
              fieldName: field.name,
              onDelete: field.onDelete || 'RESTRICT'
            });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      dataModelId: id,
      dataModelName: dataModel.name,
      outgoingRelationships: outgoingRefs,
      incomingRelationships: incomingRefs
    });
  } catch (error) {
    console.error('[DataModel API] Get relationships error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
