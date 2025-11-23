const express = require('express');
const router = express.Router();
const dataModelDatabase = require('../database/DataModelDatabase');

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

module.exports = router;
